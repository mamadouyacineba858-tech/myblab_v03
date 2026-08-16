# Cartographie factuelle du canal de mutation et vérification du contrat — MB-CF3-001 (GATE 0 / GATE 1 / GATE 2)

**Nature de ce document :** livrable GATE 0 (baseline), GATE 1 (cartographie) et GATE 2 (contrat Document) du Ticket `MB-CF3-001 — CANAL DE MUTATION UNIQUE`. Conformément au §35 du ticket (« ne pas reconstruire le contrat »), ce document **observe et documente** l'état réel du dépôt à la baseline `68ea25853af5ede4c692d0ff310b1f228952d1aa` ; il ne présuppose aucune API et ne tranche aucune décision architecturale non arbitrée. Là où une décision est nécessaire pour permettre GATE 3, elle est identifiée explicitement comme telle, avec sa justification factuelle, et non silencieusement actée.

**Rôle exercé :** Claude — agent d'implémentation, sur GO CSA (MB-CF3-001, GATE 0-6), audit Qwen "PRÊT POUR IMPLÉMENTATION" reçu par le CSA.
**Baseline :** `68ea25853af5ede4c692d0ff310b1f228952d1aa` (= `origin/main` au moment de l'ouverture du ticket — vérifié par `git fetch` + `git rev-parse`).

**Légende** : `[FAIT OBSERVÉ]` = constaté directement (code source ou `git grep`/`git log` réellement exécutés). `[CORRECTION FACTUELLE]` = corrige une prémisse du ticket ou d'un document antérieur devenue inexacte au regard de l'état réel du dépôt. `[DÉCISION REQUISE]` = point où une décision d'implémentation est nécessaire et documentée avant exécution, conformément au §35.

---

## 1. GATE 0 — Baseline (§10 du ticket)

`[FAIT OBSERVÉ]`
- `git rev-parse HEAD` = `git rev-parse origin/main` = `68ea25853af5ede4c692d0ff310b1f228952d1aa` (match exact avec la baseline attendue du ticket).
- `git status --short` : vide (arbre de travail propre).
- `npm ci` + `npx vitest run` (suite complète, aucun filtre) : **55 fichiers / 463 tests, 0 échec.**

---

## 2. GATE 1 — Cartographie factuelle (§11 du ticket)

### 2.1 `frontend/src/hooks/useCircuitState.js` — hub central de mutation

`[FAIT OBSERVÉ]` C'est l'unique point d'entrée de toutes les mutations persistantes actuelles. Trois catégories distinctes, confirmées par lecture directe du code (pas par déduction) :

**A. Mutations historisées via `HistoryManager` (legacy, canal actuel réellement utilisé) :**

| Mutation UI | Commande | Ligne construction | Ligne exécution |
|---|---|---|---|
| `deleteSelection()` (suppression multi-sélection) | `DeleteCommand` | 415 | 420 (`historyManagerRef.current.execute(command)`) |
| fin de drag (déplacement) | `MoveCommand` | 672 | 677 |
| `toggleLatchingButton(uid)` | `ToggleLatchingButtonCommand` | 784 | 790 |

Ces trois commandes sont construites avec le **même objet `documentApi`** défini à la ligne 153 (voir §2.4). `deleteSelectedWire()` (ligne 725) délègue à `deleteSelection()` — ce n'est pas un quatrième chemin.

**B. Mutations persistantes NON historisées (raw `setComponents`/`setWires`) :**

- `addComponent(type, x, y)` (ligne ~120) — `setComponents((prev) => [...prev, normalized])`.
- `addWire(fromUid, fromPin, toUid, toPin)` (ligne 194) — `setWires((prev) => [...prev, wire])`.
- `removeWire(wireId)`, `removeComponent(uid)`, `removeConnectedWires(uid)` (lignes 330-341) — callbacks bruts exportés individuellement.
- `deleteComponent(uid)` (ligne 348) — compose `removeConnectedWires` + `removeComponent`.
- `clearCircuit()` (ligne 727) et `importCircuit(data)` (ligne 742) — remplacent l'état complet et appellent `historyManagerRef.current.clear()` (vident l'historique, ne l'alimentent pas).

`[FAIT OBSERVÉ]` **`deleteComponent` est exporté par le hook (retourné dans l'objet API, ligne ~849) mais n'a strictement aucun appelant en dehors de `useCircuitState.js` lui-même** (`grep` sur `deleteComponent(` dans tout `frontend/src/**/*.jsx` hors `useCircuitState.js` et hors tests : zéro résultat). Le seul chemin de suppression réellement exercé par l'UI est le multi-sélection historisé `deleteSelection`. `deleteComponent` est donc du code mort du point de vue de l'UI actuelle — ce n'est **pas** un mécanisme concurrent à migrer ou à supprimer dans le cadre de CF3 (§26 exclut toute réécriture non justifiée ; ce fait est documenté, pas corrigé).

**C. Mutation d'état transitoire, explicitement hors historique (confirmé, résout le §3/D2 du ticket) :**

- `setButtonState(uid, state)` (ligne ~760) — porte son propre commentaire source : « A1.6 : mutation d'état transitoire, hors historique. » Confirmé par lecture directe : ne construit aucune commande, appelle `setComponents` directement, avec garde d'idempotence. **Conclusion factuelle : `setButtonState` reste hors périmètre CF3**, conformément au D2 du ticket.

### 2.2 `CommandBus.js` / `CommandRegistry.js` (`frontend/src/core/command/`)

`[FAIT OBSERVÉ]` Les deux classes sont complètes, testées (tests unitaires dédiés, non listés ici car hors périmètre de lecture de ce GATE), et **strictement inutilisées en production** : `grep -rln "new CommandBus"` et `grep -rln "new CommandRegistry"` sur `frontend/src` hors `__tests__`/`tests` retournent zéro résultat. `CommandBus.dispatch(command, document)` route vers `registry.getHandler(command.type).execute(command, document)`, avec prise en charge de middlewares.

### 2.3 `core/handlers/` — 4 Handlers, tous construits, tous inutilisés en production

`[FAIT OBSERVÉ]` `AddComponentHandler`, `RemoveComponentHandler`, `MoveComponentHandler`, `UpdateComponentHandler` existent, héritent de `BaseCommandHandler`, et implémentent chacun `_applyMutation`/`_applyRedo`/`_applyInverse` opérant sur un Document au sens Core (`{id, position:{x,y}, parameters}` pour les composants). **Chaque `execute()` appelle systématiquement `this._executeWithHistory(command, document)`**, qui lève une `HandlerError` si `this._historyService` n'est pas configuré (`BaseCommandHandler.js` lignes 37-40). Il n'existe **aucun chemin d'exécution sans historisation** dans ces handlers tels qu'écrits : un Handler ne peut être utilisé qu'avec un `HistoryService` réel.

Zéro instanciation de ces 4 Handlers en dehors de `core/handlers/__tests__/`.

### 2.4 `documentApi` — déjà implémenté dans `useCircuitState.js` (fait central pour GATE 2)

`[FAIT OBSERVÉ]` `useCircuitState.js` définit, ligne 153, un objet `documentApi` (commentaire source : « MB-004.5 : Document API pour les commandes ») :

```js
const documentApi = useMemo(() => ({
  updateComponentPositions,
  updateComponentState: (uid, state) => { ... },
  removeComponents: (componentIds) => { ... },
  removeWires: (wireIds) => { ... },
  restoreComponents: (componentsToRestore) => { ... },
  restoreWires: (wiresToRestore) => { ... }
}), [updateComponentPositions])
```

Ces six méthodes sont exactement — nom pour nom — les six méthodes requises par `DocumentAdapter.REQUIRED_API_METHODS` (`frontend/src/bridge/DocumentAdapter.js`, lignes 26-32). **Cette moitié du contrat documentApi existe déjà, a été construite pour les commandes legacy (MB-004.5), et n'a besoin d'aucune modification.**

Il **manque** exactement deux méthodes pour satisfaire le contrat attendu par `HistoryService`/`HistoryCommandAdapter` (`getCurrentDocument()`/`getDocument()` et `applyDocument(document)`) : `grep` sur `getDocument\|applyDocument` dans `useCircuitState.js` : zéro résultat.

### 2.5 `HistoryService.js` (`core/history/`) — façade, pas un moteur concurrent

`[FAIT OBSERVÉ]` `HistoryService` **n'est pas un second moteur d'historique** : son constructeur `(historyManager, documentApi)` **enveloppe** un `HistoryManager` réel et lui délègue tout le travail d'exécution/undo/redo (`this._historyManager.execute(...)`, `.undo()`, `.redo()`). Il n'implémente aucune pile propre. Son rôle réel : (a) adapter les commandes Core au format attendu par le vrai `HistoryManager` (via `HistoryCommandAdapter`), (b) pousser automatiquement le document résultant vers `documentApi.applyDocument()`.

**`[CORRECTION FACTUELLE]`** Le ticket (§5, D1) présente `HistoryManager` et `HistoryService` comme deux systèmes distincts dont l'un serait « la cible » et l'autre « legacy maintenu ». Factuellement, à ce baseline, `HistoryService` **est un adaptateur autour de `HistoryManager`**, pas un remplacement. La distinction cible/legacy porte donc, en réalité, sur le **point d'accès** (les nouvelles mutations doivent passer par `CommandBus → Handler → HistoryService`, pas instancier/appeler `HistoryManager` directement), et non sur le moteur d'historisation sous-jacent, qui reste le même dans les deux cas. Ceci ne contredit pas le verdict du ticket (INV-CF3-009 reste valide et atteignable) mais en précise le mécanisme réel.

Zéro instanciation de `HistoryService` en production. La seule instanciation existante (`new HistoryService(historyManager, documentApi)`) se trouve dans `core/handlers/__tests__/fixtures/testHistoryContext.js`, avec un **`historyManager` dédié au test** (`new HistoryManager()`, distinct de `historyManagerRef.current`) et un `MockDocumentApi` implémentant `getDocument()`/`setDocument()`/`applyDocument()` avec deep-clone défensif.

### 2.6 `ReactDocumentMapper.js` (`frontend/src/bridge/`) — projection bidirectionnelle, déjà construite (CF1)

`[FAIT OBSERVÉ]` Expose `static toCore(reactDocument)` **et** `static toReact(coreDocument)` (304 lignes, mapping de champs bidirectionnel avec tables `_COMPONENT_MAPPING_RC`/`_CR`, `_WIRE_MAPPING_RC`/`_CR`, validation de forme des deux côtés). `toCore` est déjà utilisé en production dans `useCircuitState.js` (mémo `pinSignals`, ligne ~95, pour la simulation). `toReact` existe mais n'est actuellement appelé nulle part en dehors de `bridge/tests/`.

Ce mapper est **la frontière React/Core établie par CF1** (§8 du ticket) : il n'a pas à être recréé, et son usage existant pour `toCore` n'est pas à modifier.

### 2.7 `ReactCoreBridge.js` / `DocumentAdapter.js` / `DiffEngine.js` (`frontend/src/bridge/`) — chemin alternatif, non composable avec `HistoryService`

`[FAIT OBSERVÉ]` `ReactCoreBridge` assemble `commandBus` + `documentApi` + `historyManager` + `DocumentAdapter` (diff-based) pour orchestrer dispatch/undo/redo avec application par diff. Zéro instanciation en production (uniquement `bridge/tests/`).

`[FAIT OBSERVÉ — incompatibilité de forme]` En traçant le chemin de retour d'un dispatch où le Handler est configuré avec un `historyService` (le seul mode d'exécution que les 4 Handlers actuels supportent, §2.3) :
`AdaptedHistoryCommand.apply()` → retourne le résultat brut du handler (`{success, document, ...}`), stocké comme `_lastResult`. `HistoryService.execute()` retourne `{success, commandId, result: <ce _lastResult>}` (donc `.document` est à `result.result.document`, pas à la racine). `BaseCommandHandler._executeWithHistory` retourne tel quel ce retour de `HistoryService.execute()`. `CommandBus.dispatch()` l'enveloppe une fois de plus dans `{success, commandId, commandType, result: <retour du handler>}`.

`ReactCoreBridge.dispatch()` teste ensuite `result.result.document` sur le retour de `CommandBus.dispatch()` — or à ce niveau, `result.result` est l'objet retourné par `HistoryService.execute()`, qui n'a **pas** de champ `.document` à sa racine (il est encore un niveau plus bas, dans `result.result.result.document`). **La condition échoue systématiquement** : `ReactCoreBridge.dispatch()` retournerait `{success:false, ...}` même quand la mutation a réellement réussi et a déjà été appliquée par `HistoryService` via `documentApi.applyDocument()`.

**Conclusion factuelle :** `ReactCoreBridge` et les Handlers configurés avec `HistoryService` n'ont jamais été conçus ni testés ensemble — ce sont deux stratégies d'intégration indépendantes, construites à des moments différents, dont la composition produit un contrat de retour incohérent. Aucun test existant n'exerce cette composition (recherché : aucun fichier n'importe à la fois `ReactCoreBridge` et un Handler avec `historyService` configuré). Le diagramme cible du ticket (§4 : `CommandBus → Handlers → Document Core → HistoryService`) **ne mentionne pas `ReactCoreBridge`** — cette classe n'est donc pas un passage obligé pour CF3. **Décision : `ReactCoreBridge`/`DocumentAdapter`/`DiffEngine` restent hors périmètre de CF3, non modifiés, non utilisés.** Ceci est conforme au §27 (principe de conservation : ne pas réparer ce que le ticket ne demande pas d'utiliser).

### 2.8 Document Core — représentation confirmée

`[FAIT OBSERVÉ]`, par lecture directe des 4 Handlers : composant = `{id, type, position:{x,y}, parameters:{...}}` ; wire = `{id, pinA:{componentId, pinId}, pinB:{componentId, pinId}}` (déduit de `_removeWiresForComponent`, `pinA?.componentId`/`pinB?.componentId`). Document = `{components:[...], wires:[...]}`. Ceci correspond exactement à la table du §9 du ticket — pas de divergence constatée.

---

## 3. GATE 2 — Contrat Document (§12 du ticket)

| Question GATE 2 | Réponse factuelle |
|---|---|
| Représentation Core réelle | `{components:[{id, type, position:{x,y}, parameters}], wires:[{id, pinA:{componentId,pinId}, pinB:{componentId,pinId}}]}` — confirmée §2.8 |
| Représentation React réelle | `{components:[{uid, type, x, y, ...}], wires:[{id, fromUid, fromPin, toUid, toPin}]}` — inchangée depuis CF1 |
| Mécanisme de projection existant | `ReactDocumentMapper.toCore()` (déjà utilisé en production) et `.toReact()` (construit, testé, pas encore utilisé en production) — bidirectionnel, **déjà là, à réutiliser tel quel** |
| Mécanisme d'application de mutation | Deux candidats identifiés : (a) `ReactCoreBridge`+`DocumentAdapter` (diff-based) — **écarté**, non composable avec `HistoryService` (§2.7) ; (b) `documentApi.applyDocument(coreDocument)` consommé directement par `HistoryService` — **retenu**, c'est le seul chemin réellement testé de bout en bout (`testHistoryContext.js`) |
| Mécanisme d'historisation réel | `HistoryService` enveloppe un `HistoryManager` — voir `[DÉCISION REQUISE]` ci-dessous pour l'instance à utiliser |
| Compatibilité réelle | Le `documentApi` existant (§2.4) satisfait déjà 6/8 méthodes du contrat combiné. Les 2 manquantes (`getDocument`, `applyDocument`) sont **directement dérivables** de `ReactDocumentMapper.toCore`/`.toReact`, déjà en production pour `toCore`. Aucune invention d'API : `getDocument()` = `ReactDocumentMapper.toCore({components: safeComponents, wires: safeWires})` (motif déjà utilisé ligne ~95 pour `pinSignals`) ; `applyDocument(coreDoc)` = `ReactDocumentMapper.toReact(coreDoc)` suivi de `setComponents`/`setWires`. |

### `[DÉCISION REQUISE]` Instance de `HistoryManager` à utiliser pour `HistoryService`

Le ticket (§5.1) exige que `HistoryManager` reste « maintenu temporairement pour l'existant » et (§5.2) que les nouvelles mutations passent par `HistoryService`, sans préciser explicitement si `HistoryService` doit envelopper l'instance `historyManagerRef.current` déjà utilisée par les 3 commandes legacy, ou une instance séparée (comme le fait `testHistoryContext.js`, à des fins de test isolé).

**Constat factuel déterminant :** l'UI n'expose qu'**un seul** bouton Undo/Redo, câblé sur `historyManagerRef.current.undo()/redo()/canUndo()/canRedo()` (lignes 51-70). Si `HistoryService` enveloppait une **seconde** instance de `HistoryManager`, les mutations dispatchées via `CommandBus` alimenteraient une pile d'historique invisible pour ce bouton — Undo/Redo cesserait de fonctionner correctement pour ces mutations du point de vue de l'utilisateur, ce qui constituerait une régression fonctionnelle silencieuse.

**Conclusion :** pour respecter INV-CF3-007 (cohérence Undo/Redo) sans modifier le point d'accès Undo/Redo existant (hors périmètre CF3, §26), `HistoryService` doit envelopper **la même instance `historyManagerRef.current`**, pas une instance séparée. Ce n'est pas une invention architecturale nouvelle — c'est la seule lecture cohérente avec le §5.1 (« HistoryManager maintenu ») combiné à l'absence de tout second point d'accès Undo/Redo dans le périmètre INCLUS (§25). Ce point est documenté ici avant toute exécution de GATE 3, conformément au §35.

---

## 4. Évaluation des conditions STOP (§28 du ticket)

`[FAIT OBSERVÉ]` Aucune des 11 conditions STOP listées au §28 n'est déclenchée par la cartographie ci-dessus :
- `HistoryService`/`CommandBus` existent bien et correspondent au diagramme cible (§4 du ticket) — modulo la précision apportée en §2.5 (façade, pas moteur concurrent), qui ne contredit aucun invariant.
- Les Handlers existent et sont structurellement compatibles avec le contrat Document confirmé en §2.8 (pas de divergence de modèle).
- Aucune migration massive n'est nécessaire : le `documentApi` existant satisfait déjà 6/8 méthodes requises, et les 2 manquantes se dérivent d'un mapper déjà en production.
- Aucune API supposée inexistante n'est requise : `getDocument`/`applyDocument` sont des dérivations directes de `ReactDocumentMapper`, pas des inventions.
- `ReactCoreBridge` (chemin non composable identifié en §2.7) n'est simplement pas utilisé — ce n'est pas un blocage, c'est un écartement justifié d'un chemin hors périmètre.
- La décision sur l'instance `HistoryManager` (ci-dessus) découle directement des contraintes déjà fixées par le ticket et par l'absence d'un second point Undo/Redo — ce n'est pas une décision architecturale nouvelle et non arbitrée au sens du §28.

**Verdict GATE 1/2 : PASS. Aucun STOP. GATE 3 (canal de mutation) peut être engagé**, dans le périmètre strictement décrit ci-dessous.

---

## 5. Portée envisagée pour GATE 3 (à titre indicatif, exécution séparée)

Conformément au §13 (ordre suggéré, non contraignant) et au constat de §2.1, la mutation la plus simple et la moins risquée à faire transiter par le nouveau canal semblait a priori être `addComponent` (aucune donnée d'historique préexistante à concilier, contrairement à `deleteSelection`/déplacement/`toggleLatchingButton` qui restent sur le canal legacy conformément au §5.3). **Ce choix a été invalidé empiriquement — voir §6.**

---

## 6. GATE 3 — Constat empirique bloquant et déclenchement de la clause STOP (§28 du ticket)

`[FAIT OBSERVÉ — reproduit empiriquement, pas déduit]` Avant toute modification de `useCircuitState.js`, une vérification empirique du round-trip complet a été exécutée dans un script Node isolé (aucun fichier de production modifié), reproduisant exactement le chemin GATE 3 prévu : `ReactDocumentMapper.toCore(reactDoc)` → `AddComponentHandler.execute()` (avec un `HistoryService`/`HistoryManager`/`documentApi` réels, conformes au contrat de `testHistoryContext.js`) → `ReactDocumentMapper.toReact(nouveauCoreDoc)`.

**Résultat constaté :** le composant React existant (`{uid, type, x, y, pins:[...]}`) traverse le round-trip sans perte (`pins` est préservé — porté comme propriété inconnue par `_copyUnknownProperties` dans les deux sens). **Le nouveau composant créé par `AddComponentHandler._applyMutation`, en revanche, ressort avec `{uid, type, x, y, parameters:{}}` — sans aucun champ `pins`.**

`AddComponentHandler` ne connaît pas — et n'a aucune raison de connaître — `componentDefinitions.js` (Presentation, hors périmètre Core). Il ne peut donc pas produire un composant Core dont la projection React soit un composant valide au sens de `normalizeComponent()`/du reste de l'application.

**Impact réel confirmé par lecture de code (pas une hypothèse) :** `frontend/src/simulator/engineAdapter.js` ligne 54 lit `component.pins` **directement depuis l'objet composant stocké en state React** (`pins: clone(component.pins)`), pas depuis `componentDefinitions.js`. Un composant sans `pins` produit `clone(undefined)`, puis `frontend/src/simulator/resolution.js` ligne 69 (`for (const pin of entry.pins)`) lèverait une exception à l'exécution de la simulation dès qu'un tel composant serait présent dans le circuit. **Ce n'est pas un problème cosmétique : c'est un crash de la simulation pour tout circuit contenant un composant créé via ce canal.**

(Note : ce problème est spécifique à la **création** de composant. `RemoveComponentHandler`, `MoveComponentHandler` et `UpdateComponentHandler` n'opèrent que sur des composants déjà existants — clonés depuis le document obtenu via `getDocument()`, donc porteurs de leur `pins` d'origine comme propriété inconnue — et ne présentent pas cette incompatibilité empirique-là. Ceci n'a toutefois pas été vérifié aussi loin que pour `AddComponentHandler`, faute de Handler équivalent pour les wires — voir ci-dessous.)

`[FAIT OBSERVÉ]` Par ailleurs, `addWire` (l'autre mutation de création, non historisée, réellement utilisée par l'UI) n'a **aucun Handler Core correspondant** : `frontend/src/core/handlers/` ne contient qu'un sous-dossier `component/` (`AddComponentHandler`, `RemoveComponentHandler`, `MoveComponentHandler`, `UpdateComponentHandler`) — aucun `AddWireHandler`/`RemoveWireHandler`. Router `addWire` par le canal cible nécessiterait donc de **créer** un nouveau Handler ex nihilo, ce qui dépasse le cadre de « connecter progressivement les mutations persistantes » à une infrastructure déjà existante et testée (§1/§38 du ticket), et constitue une extension d'architecture non explicitement couverte par ce ticket.

**Conclusion :** les deux seules mutations de création réellement actives dans l'UI (`addComponent`, `addWire`) — qui sont aussi les deux seules mutations candidates naturelles pour un premier branchement GATE 3 selon l'ordre suggéré au §13 — sont chacune bloquées par une condition STOP distincte du §28 :
- `addComponent` → **« le contrat Document Core s'avère incompatible avec le fonctionnement React réel »** (démontré empiriquement ci-dessus : perte du champ `pins`, crash de simulation reproductible).
- `addWire` → **« une architecture non prévue par le ticket devient nécessaire »** au sens large (aucun Handler Core n'existe pour les wires ; en créer un dépasse la « connexion progressive » d'infrastructure existante).

Les mutations sans risque identifié (`removeComponent`/`moveComponent`/`updateComponent` via Handlers existants, sur des composants déjà présents) ne correspondent à aucun point d'entrée UI réellement actif et non historisé (voir §2.1.B : `removeComponent`/`removeWire`/`removeConnectedWires`/`deleteComponent` sont du code mort côté UI ; la suppression réelle passe déjà par `deleteSelection`, historisée via `DeleteCommand`/legacy). Les router par CommandBus reviendrait à câbler un chemin qu'aucun bouton de l'application n'emprunte — ce ne serait pas un branchement réel du canal de mutation, seulement une démonstration synthétique, contraire à l'esprit du ticket (§1 : « sécuriser le canal de mutation réellement utilisé »).

**Décision : GATE 3 est arrêté ici. Conformément au §28 et au §35 du ticket, ce constat factuel est rapporté au CSA pour nouvel arbitrage plutôt que résolu unilatéralement** (les résolutions possibles — enrichir `AddComponentHandler`/`ReactDocumentMapper` pour transporter `pins`, créer un `AddWireHandler`, ou choisir une mutation cible différente de celles suggérées au §13 — impliquent chacune une décision architecturale que ce ticket ne tranche pas explicitement).

**Aucun fichier de production n'a été modifié pour produire ce constat** (script de vérification exécuté hors dépôt, non committé, supprimé après usage). L'arbre de travail reste strictement identique à la baseline `68ea258`, à l'exception de l'ajout de ce document de spécification.

---

## 7. `[CORRECTION FACTUELLE]` — Analyse ciblée de la provenance de `pins`, sur arbitrage CSA

Le CSA a demandé une vérification empirique ciblée de la provenance de `pins`, plutôt qu'une résolution unilatérale. Cette vérification **invalide une partie du constat du §6** : le §6 avait tracé `engineAdapter.js` (`pins: clone(component.pins)`) jusqu'à `resolution.js:69 (for (const pin of entry.pins))` en présumant que `entry` provenait du champ `component.pins` propagé par `engineAdapter.js`. **C'est factuellement inexact** — vérifié en lisant `resolution.js` en entier :

```js
function buildPinSignalMap(comp, uf, pinSignals) {
  const entry = getCanonicalEntry(comp.type)   // ← dérivé du TYPE, pas de comp.pins
  ...
  for (const pin of entry.pins) { ... }
}
```

`entry` provient de `getCanonicalEntry(comp.type)` (`canonicalRegistry.js`), **indépendamment de tout champ `pins` porté par l'instance**. Le même schéma s'observe dans `preparation.js` (`const def = getCanonicalEntry(comp.type); for (const pin of def.pins)`, ligne 44-47) et dans le rendu (`CircuitComponent.jsx` ligne 134 : `def.pins` où `def = getComponentDef(type)`, et `circuitSelectors.js` lignes 57-58 : `fromDef.pins`/`toDef.pins`, `fromDef = getComponentDef(fromComp.type)`).

**Inventaire complet et exhaustif des consommateurs de `pins`** (`grep` intégral, reproduit ci-dessous) :

| Fichier | Provenance de `pins` utilisée | Dépend de `component.pins` (instance) ? |
|---|---|---|
| `canvas/CircuitComponent.jsx:134` (rendu) | `getComponentDef(type).pins` | Non |
| `utils/circuitSelectors.js:57-58` (tracé des fils) | `getComponentDef(type).pins` | Non |
| `simulator/preparation.js:47` (topologie électrique) | `getCanonicalEntry(type).pins` | Non |
| `simulator/resolution.js:69` (signaux par broche) | `getCanonicalEntry(type).pins` | Non |
| `simulator/dcContributionRegistry.js` (contribution DC) | reçoit la map construite par `resolution.js` (donc indirectement `getCanonicalEntry`) | Non |
| `simulator/engineAdapter.js:54` | `clone(component.pins)` | **Oui — mais la valeur produite (`result.components[].pins`) n'est ensuite lue par aucun code** (confirmé : ni `preparation.js`, ni `resolution.js` ne lisent `.pins` sur les objets qu'ils reçoivent — ils le redérivent systématiquement via `getCanonicalEntry(comp.type)`) |
| `utils/circuitModel.js:16` (`normalizeComponent`) | `component.pins` s'il existe, sinon `[]` | Oui, mais uniquement pour le stocker tel quel — aucune lecture logique en aval |

**Conclusion empirique : le champ `component.pins` porté par l'instance React n'est consommé par aucun mécanisme de décision réel** (ni le rendu, ni la simulation, ni le tracé des fils). Tous les vrais consommateurs redérivent `pins` depuis `canonicalRegistry.js`/`componentDefinitions.js` **par `type`**, indépendamment de ce que porte l'instance. C'est cohérent avec le commentaire source de `componentDefinitions.js:123` (« `pins[]` réservé pour état futur ») : ce champ sur l'instance n'a jamais été branché à un usage réel.

**Preuve corroborante historique, sans script :** `importCircuit()` (`useCircuitState.js`) accepte déjà, depuis avant ce ticket, des données de composants arbitraires (potentiellement sans `pins`) via `normalizeComponent()`, qui retombe sur `pins: []` sans erreur. L'application tolère donc déjà, en production, des composants sans `pins` significatif porté par l'instance — ce n'est pas un cas hypothétique nouveau introduit par CF3.

### Réponses aux 5 questions du CSA

1. **`pins` appartient-il au Document Core persistant ?** Non. Aucun des 4 Handlers (`AddComponentHandler`/`RemoveComponentHandler`/`MoveComponentHandler`/`UpdateComponentHandler`) ne mentionne `pins`. Aucune des tables de mapping de `ReactDocumentMapper` (`_COMPONENT_MAPPING_RC`/`_CR`) ne le déclare — il ne transite que par le mécanisme générique `_copyUnknownProperties` (passthrough non contractuel), pas comme un champ du contrat Document Core.

2. **`pins` doit-il être dérivé de `canonicalRegistry` ?** Oui — c'est déjà, factuellement, la seule source utilisée par tout consommateur réel (`getCanonicalEntry`/`getComponentDef`, tous deux remontant à `DECLARED_TYPES_PINS` de `canonicalRegistry.js`), par `type`, jamais par l'instance.

3. **`AddComponentHandler` doit-il transporter `pins` ?** Non. Aucun consommateur réel n'en a besoin (tableau ci-dessus). Lui faire porter `pins` ajouterait une responsabilité que le Handler Core n'a pas à avoir, pour une donnée qui ne sert à rien en aval.

4. **Un mécanisme existant fournit-il déjà `pins` ?** Oui — `componentDefinitions.js` (`getComponentDef(type)`/`buildPins(type)`), déjà utilisé par tous les consommateurs réels, fonctionne par `type` et ne dépend d'aucune donnée portée par l'instance.

5. **Une modification d'`AddComponentHandler` serait-elle compatible avec CF2/ADR-012 ?** Une modification qui ferait importer `componentDefinitions.js` (Presentation, cf. cartographie MB-CF2-001 §1.4) depuis un Handler Core **violerait le sens de dépendance établi par CF2/ADR-012** (Core ne doit rien savoir de Presentation). Et comme le point 3 l'établit, ce ne serait de toute façon pas nécessaire.

**Correction du verdict du §6 pour `addComponent` :** le blocage identifié au §6 pour `addComponent` reposait sur une erreur de traçage (confusion entre `entry.pins` dérivé du Registry par type, et `component.pins` porté par l'instance). Une fois corrigée, **aucune incompatibilité de contrat Document Core n'est confirmée pour `addComponent`** — `AddComponentHandler`, tel qu'il existe aujourd'hui, sans modification, produit un composant Core qui, projeté vers React, reste valide pour le rendu et la simulation (les deux ignorant `component.pins`). Ce point est soumis à l'arbitrage du CSA plutôt que ré-exploité unilatéralement pour reprendre GATE 3, conformément à l'instruction reçue.

### `addWire` — dépendance à un contrat architectural ultérieur

`[FAIT OBSERVÉ]` Contrairement aux composants, le modèle de wire ne porte aucun champ Presentation-only analogue à `pins` (`_WIRE_MAPPING_RC`/`_CR` couvrent `fromUid/toUid/fromPin/toPin` intégralement, sans reste). La seule limite réelle est l'**absence de tout Handler Core pour les wires** : `core/handlers/` ne contient que le sous-dossier `component/` (4 handlers), aucun équivalent `AddWireHandler`/`RemoveWireHandler`. Sans création de Handler (explicitement exclue par le CSA pour cet arbitrage), `addWire` n'a **aucun point d'entrée Core à rejoindre** — ce n'est pas une question de compatibilité de contrat (comme pour `addComponent`), mais une question d'**infrastructure manquante**. `addWire` relève donc d'un contrat architectural ultérieur (un ticket qui autoriserait explicitement la création d'un Handler Wire, sur le modèle exact des 4 Handlers Component existants) et non du périmètre directement actionnable de MB-CF3-001 tel qu'outillé aujourd'hui.

---

## 8. `[STOP — GATE 3]` Conflit direct entre un verrou architectural CF1 (testé) et l'architecture cible de MB-CF3-001

Sur arbitrage CSA-CF3-001 (Q1 validée option a, Q2 validée option a, STOP GATE 3 levé pour `addComponent`), l'implémentation a été tentée : extension de `documentApi` (`getDocument`/`applyDocument`, dérivés de `ReactDocumentMapper`, sans toucher `AddComponentHandler`), câblage `CommandRegistry`+`CommandBus`+`AddComponentHandler`+`HistoryService` (enveloppant `historyManagerRef.current`), et modification d'`addComponent` pour dispatcher via ce canal — exactement le plan validé, sans invention.

`npx vitest run` (suite complète) a immédiatement révélé **3 échecs dans un fichier de test architectural préexistant de CF1**, non modifié, non lu lors de la cartographie GATE 1/2 (qui avait inspecté le code de production du bridge layer mais pas sa suite de tests architecturaux dédiée) : `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js`.

`[FAIT OBSERVÉ]` Ce fichier, produit et intégré par le ticket **MB-CF1-001 v3.1/final** (déjà livré, `origin/main`), verrouille explicitement, par des assertions de source (`expect(source).not.toMatch(...)`), sous des libellés citant des décisions CSA nommées :

| Test (libellé exact) | Invariant verrouillé | Résultat avec mon implémentation GATE 3 |
|---|---|---|
| « AC-011 : périmètre respecté, aucun branchement CommandBus ↔ UI » | `useCircuitState.js` **ne doit importer ni `core/command/CommandBus.js` ni `core/history/HistoryService.js`** | ÉCHEC — mon implémentation importe les deux |
| « CSA-CF1-003-B / [CORRECTION CSA v3.1 — AC-006] » | `documentApi` doit exposer **exactement** les 6 méthodes granulaires existantes, **ni `getDocument` ni `applyDocument`** | ÉCHEC — mon implémentation ajoute les deux |
| « CF1-003-E / GATE 3 : la projection Core → React est établie et testée, mais PAS activée en production » | `useCircuitState.js` **ne doit pas appeler `ReactDocumentMapper.toReact()`** (seule la direction `toCore()` est utilisée) | ÉCHEC — `applyDocument` appelle `toReact()` |

Le commentaire d'en-tête du fichier (ligne 17-24) précise le sens de ce verrou : « Ces tests n'interdisent PAS l'état React historique... Ils interdisent uniquement : un second Document Core dérivé persistant, une source métier parallèle indépendante, une synchronisation parallèle permanente, **une API Document ad hoc**, un contournement de la frontière Core. » Le libellé du test CF1-003-E (« établie et testée, mais **PAS activée en production** ») indique explicitement que l'activation du canal Core→React vers l'UI était **prévue comme une étape ultérieure**, mais qu'elle n'était **pas encore autorisée** au moment de la livraison de CF1 — sans que rien dans le dépôt (ticket CF1, ADR, commit) n'indique, à ma lecture, la condition exacte de levée de ce verrou.

**Ce que cela signifie factuellement :** l'architecture cible décrite par le ticket MB-CF3-001 lui-même (§4 : « UI → Mutation → CommandBus → Handlers → Document Core → HistoryService ») **contredit directement et explicitement un verrou architectural déjà testé et intégré par CF1**, un ticket antérieur, audité et arbitré par le CSA. Ce n'est pas une incompatibilité que j'ai le pouvoir de trancher : soit le verrou CF1 doit être explicitement levé/révisé par le CSA (ce qui suppose une décision consciente, pas une simple modification de test en passant), soit l'architecture cible de CF3 doit être revue pour respecter ce verrou (auquel cas le canal CommandBus→Handler→HistoryService ne peut pas être branché à `useCircuitState.js` du tout, et CF3 devrait se limiter à un périmètre différent — par exemple : renforcer/étendre les Handlers et leur couverture de tests en isolation, sans branchement UI, en attendant un CF4 ou un ticket dédié d'« activation »).

**Action prise :** toutes les modifications de `useCircuitState.js` ont été intégralement annulées (`git checkout --`), confirmé par ré-exécution de la suite complète : **55 fichiers / 463 tests, 0 échec** — retour exact à l'état baseline `68ea258`. Aucune modification de production ne subsiste. `git status --short` : seul ce document non tracké.

**GATE 3 est de nouveau arrêté**, sur un motif différent et plus fondamental que le précédent (qui portait sur `pins`, résolu) : un conflit direct entre une décision CSA déjà actée et testée (CF1) et l'architecture cible explicitement écrite dans le ticket CF3 lui-même. Ceci relève clairement du §28 du ticket (« une décision architecturale non arbitrée apparaît ») et du §35 (ne pas trancher unilatéralement un arbitrage CSA antérieur).

---

## 9. Amendement CSA-CF3-001-A — évolution explicite de trois verrous CF1

Le CSA a rendu l'arbitrage suivant sur le conflit du §8. Cet amendement est **additif** : il documente une évolution architecturale explicite et assumée, pas une invalidation rétroactive de CF1 ni une correction d'erreur.

1. **AC-011 (« aucun branchement CommandBus ↔ UI ») — LEVÉ pour CF3.** CF1 avait délibérément laissé le canal Core débranché de l'UI (cf. libellé du test CF1-003-E : « établie et testée, mais pas activée en production »). CF3 est précisément le ticket chargé de cette activation. `useCircuitState.js` peut désormais importer `core/command/CommandBus.js` et `core/history/HistoryService.js`.

2. **AC-006 (« documentApi expose exactement les 6 méthodes granulaires, ni getDocument ni applyDocument ») — LEVÉ/ÉVOLUTIF pour CF3.** `documentApi` peut gagner des méthodes au-delà des 6 méthodes granulaires de CF1, à la stricte condition que chaque méthode ajoutée soit un **contrat démontré à partir d'API Core déjà existantes** (ici : `getDocument`/`applyDocument` dérivés de `ReactDocumentMapper.toCore`/`.toReact`, déjà en production et déjà testés par CF1) — **aucune API ad hoc ne doit être inventée**.

3. **CF1-003-E (« pas d'appel à ReactDocumentMapper.toReact() en production ») — LEVÉ pour CF3.** La projection Core → React peut être activée via `ReactDocumentMapper.toReact()` dans le cadre de CF3, **sans faire de React une source de vérité** (React reste porteur de l'état transitoire/legacy ; le Document Core n'est pas dupliqué en un second état persistant — les invariants INV-CF1-011/012 du fichier `cf1DocumentArchitecture.test.js`, non concernés par cet amendement, restent pleinement en vigueur).

**Portée de l'amendement :** strictement les trois points ci-dessus, strictement pour MB-CF3-001, strictement pour `addComponent` (le seul mutation autorisée en GATE 3 par l'arbitrage CSA-CF3-001). N'autorise ni la création d'un `AddWireHandler`, ni le transport de `pins` par `AddComponentHandler`, ni aucune autre extension.

**Traitement du fichier de test `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` :** conformément à l'instruction CSA (« ne supprime ni ne falsifie les tests CF1 »), les 3 assertions qui encodaient littéralement les verrous ci-dessus sont **mises à jour pour refléter le contrat CF3 amendé**, avec un commentaire explicite citant `CSA-CF3-001-A` et la portée de l'évolution, conservant leur rôle de preuve architecturale (elles continueront à échouer si un usage non autorisé — `ReactCoreBridge`, une méthode `documentApi` non dérivée d'une API Core existante, un `AddWireHandler`, etc. — apparaissait). Les invariants INV-CF1-007/011/012 et le test « état transitoire CF1 » (§ useState components/wires) ne sont pas modifiés.
