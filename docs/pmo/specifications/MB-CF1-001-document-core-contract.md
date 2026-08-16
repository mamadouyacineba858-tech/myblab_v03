# Formalisation du contrat Document Core et cartographie de frontière — MB-CF1-001 v3.1/final

**Nature de ce document :** livrable documentaire du Ticket `MB-CF1-001 v3.1/final` (§5.1.A « Contrat Document », §6, §8.3, AC-012). Ce document **formalise** le contrat `getDocument()` / `applyDocument()` déjà consommé par le Core, et **identifie** les points de branchement où `useCircuitState` pourra, dans un ticket ultérieur (CF3), être connecté au Document Core. Il n'invente aucune API, ne propose aucune implémentation, et ne modifie aucun mécanisme de mutation.

**Rôle exercé :** Claude — agent d'implémentation, sur mandat CSA (MB-CF1-001 v3.1/final, GATE 1 et GATE 3).
**Baseline :** `739d2011bfa6e740b86d36895659f6133d2cd1b9`.
**Méthode :** inspection directe du code source du dépôt (lecture de fichiers), aucune inférence non vérifiée.

**Légende des statuts** : `[FAIT OBSERVÉ]` = comportement lu directement dans le code ; `[ÉCART SIGNALÉ]` = incohérence factuelle constatée entre deux parties du code, signalée conformément à GATE 1 (« signaler tout écart ou ambiguïté au CSA »), non corrigée dans ce ticket.

---

## 1. Objet

Ce document répond à trois exigences du Ticket :

1. §6 — Cartographier et formaliser le contrat Document effectivement consommé par le Core (`HistoryService.js`, `HistoryCommandAdapter.js`, `HistoryManager.js`, `ReactCoreBridge.js`, `ReactDocumentMapper.js`, `CommandBus.js`, `Handlers`).
2. §6.3 — Vérifier que ce contrat n'est pas inventé pour ce ticket (D6 / INV-CF1-005).
3. §8.3 / AC-012 — Identifier les points de branchement où `useCircuitState` pourra être connecté au Document Core (travail réservé à CF3, non réalisé ici).

---

## 2. Contrat `getDocument()` / `applyDocument()` — forme réelle

### 2.1 Existence antérieure au ticket

`[FAIT OBSERVÉ]` Le contrat `getDocument()` / `applyDocument()` existe déjà dans le dépôt, avant toute intervention de ce ticket. Il n'est donc pas inventé par MB-CF1-001 — conformément à D6 et à INV-CF1-005, ce document se limite à le **documenter**.

Définisseurs actuels :

| Fichier | Rôle |
|---|---|
| `frontend/src/core/handlers/__tests__/fixtures/testHistoryContext.js` (`MockDocumentApi`) | Seule implémentation actuellement instanciée du contrat, utilisée exclusivement en test. |

Aucune implémentation de production de `getDocument()` / `applyDocument()` n'existe dans le dépôt à la baseline. Le `documentApi` réellement construit par `useCircuitState.js` (voir §4) n'implémente ni l'une ni l'autre de ces méthodes.

### 2.2 Signature formalisée

```text
documentApi.getDocument() : Document
documentApi.applyDocument(document: Document) : void
```

- `getDocument()` retourne le Document courant. Dans `MockDocumentApi`, l'implémentation retourne une copie profonde (`JSON.parse(JSON.stringify(...))`), garantissant qu'aucune mutation externe du retour n'affecte l'état interne.
- `applyDocument(document)` remplace intégralement le Document interne par la valeur fournie (copie profonde également dans `MockDocumentApi`).

`[FAIT OBSERVÉ]` Aucun consommateur réel (`HistoryService`, `HistoryCommandAdapter`, `ReactCoreBridge`) n'appelle de méthode autre que `getDocument()` et `applyDocument()` sur `documentApi` pour la lecture/écriture du Document complet. Aucune méthode partielle (`patchDocument`, `mergeDocument`, etc.) n'existe.

### 2.3 Consommateurs identifiés (exhaustif à la baseline)

| Fichier | Usage |
|---|---|
| `core/history/HistoryService.js` | `getCurrentDocument()` → `documentApi.getDocument()` (ligne 38). `execute()`/`undo()`/`redo()` appellent `documentApi.applyDocument(result.document)` après une mutation réussie (lignes 60, 90, 116). |
| `core/history/HistoryCommandAdapter.js` (classe interne `AdaptedHistoryCommand`) | `_getCurrentDocument()` → `documentApi.getDocument()` (ligne 84), utilisé par `apply()` et `undo()`. |
| `bridge/ReactCoreBridge.js` | `dispatch()`, `undo()`, `redo()` appellent tous `this._documentApi.getDocument()` (lignes 60, 112, 152) pour obtenir le document React avant conversion `toCore()`. `ReactCoreBridge` n'appelle jamais `applyDocument()` — il applique les changements via `DiffEngine` + `DocumentAdapter` (voir §5). |
| `history/HistoryCommand.js` (classe de base) | Stocke `documentApi` reçu au constructeur (`this.documentApi = documentApi`) mais n'appelle directement ni `getDocument()` ni `applyDocument()` — ce sont les sous-classes concrètes qui le font. |

`[FAIT OBSERVÉ]` `history/HistoryManager.js` (le vrai gestionnaire d'historique, distinct de `core/history/HistoryService.js`) ne référence **aucune** des deux méthodes, ni `documentApi` : il opère uniquement sur des objets `HistoryCommand` (`execute`, `undo`, `redo`, piles `undoStack`/`redoStack`). Il est agnostique du Document.

### 2.4 Non-consommation en production

`[FAIT OBSERVÉ]` À la baseline, aucun des trois consommateurs ci-dessus (`HistoryService`, `HistoryCommandAdapter`, `ReactCoreBridge`) n'est instancié en dehors des suites de tests. Le `documentApi` réel construit par `useCircuitState.js` (§4) ne satisfait pas leur contrat (absence de `getDocument`/`applyDocument`) et ne pourrait donc pas leur être passé sans adaptation — cette adaptation est un travail de migration explicitement reporté à CF3 (Ticket §5.3).

---

## 3. Modèle Core canonique — structure réelle

`[FAIT OBSERVÉ]` Aucun fichier nommé `Document.js` ou équivalent n'existe dans le dépôt. Le modèle Core canonique n'est pas porté par une classe ou un schéma déclaré : il est défini **implicitement** par les contrats de mapping déclaratifs de `ReactDocumentMapper.js` (`_COMPONENT_MAPPING_CR`, `_WIRE_MAPPING_CR`, `_COMPONENT_MAPPING_RC`, `_WIRE_MAPPING_RC`) et par les validations `_validateCoreDocument()` / `_validateReactDocument()`.

Forme du modèle Core canonique telle qu'observée :

```text
CoreDocument = {
  components: Array<{
    id: string,           // requis
    type: string,         // requis
    position: { x: number, y: number },  // requis
    ...autres propriétés préservées telles quelles (parameters, state, etc.)
  }>,
  wires: Array<{
    pinA: { componentId: string, pinId?: string },  // componentId requis
    pinB: { componentId: string, pinId?: string },  // componentId requis
    ...autres propriétés préservées telles quelles (uid, metadata, etc.)
  }>,
  ...propriétés inconnues du document source copiées telles quelles (ex: metadata)
}
```

Ceci correspond exactement à la structure `{id, type, position:{x,y}, parameters}` / `{id, pinA/pinB}` déjà documentée dans `docs/tickets/MB-HOOK-001-BLOCKED.md` comme modèle Core, confirmant qu'il s'agit d'un contrat stable, non modifié par ce ticket.

---

## 4. `documentApi` réel de production (`useCircuitState.js`)

`[FAIT OBSERVÉ]` `frontend/src/hooks/useCircuitState.js`, lignes 153-186, construit un objet `documentApi` via `useMemo`, avec exactement six méthodes :

```text
documentApi = {
  updateComponentPositions(positionsMap: Map<uid, {x, y}>),
  updateComponentState(uid: string, state: any),
  removeComponents(componentIds: string[]),
  removeWires(wireIds: string[]),
  restoreComponents(components: Array),
  restoreWires(wires: Array),
}
```

Ni `getDocument()` ni `applyDocument()` n'y figurent. Cette liste correspond exactement à `DocumentAdapter.REQUIRED_API_METHODS` (`bridge/DocumentAdapter.js`, lignes 27-34).

`ReactDocumentMapper.toCore()` est déjà utilisé en production par `useCircuitState.js` (ligne 87), exclusivement pour alimenter `runSimulation()` via `engineAdapter.js` — jamais pour construire un Document persistant. `ReactDocumentMapper.toReact()` n'a, à la baseline, aucun appelant en dehors des tests (`bridge/tests/ReactDocumentMapper.test.js`).

---

## 5. Écart factuel signalé (hors périmètre CF1)

`[ÉCART SIGNALÉ]` `bridge/DocumentAdapter.apply()` (`bridge/DocumentAdapter.js`, lignes 107-137) appelle :

- `api.updateComponentState(stateUpdates)` avec `stateUpdates` = tableau `[{id, state}, ...]` — **un seul argument, un tableau**.
- `api.updateComponentPositions(positionUpdates)` avec `positionUpdates` = tableau `[{id, position}, ...]` — **un seul argument, un tableau**.

Le `documentApi` réel de `useCircuitState.js` (§4) attend :

- `updateComponentState(uid, state)` — **deux arguments positionnels**.
- `updateComponentPositions(positionsMap)` — **un seul argument, mais un `Map`, pas un tableau** (`positionsMap.get(c.uid)`, `positionsMap.size`).

Si `DocumentAdapter` était connecté tel quel au `documentApi` réel de `useCircuitState.js`, l'appel à `updateComponentPositions` échouerait immédiatement (`positionsMap.get is not a function`, un tableau JavaScript n'ayant pas de méthode `.get()`), et l'appel à `updateComponentState` échouerait silencieusement (le tableau serait comparé à `c.uid`, qui ne correspond jamais, donc aucune mise à jour n'aurait lieu).

Ceci est un écart de signature entre deux couches actuellement isolées l'une de l'autre (`ReactCoreBridge`/`DocumentAdapter` d'un côté, `useCircuitState.js` de l'autre) — aucune des deux n'appelle l'autre à la baseline, donc **aucune régression actuelle n'existe**. Cet écart est **signalé pour le CSA**, conformément à GATE 1, et n'est **pas corrigé** dans MB-CF1-001 v3.1 : le brancher/corriger nécessiterait de modifier soit `DocumentAdapter.js` soit `useCircuitState.js`, ce qui relève du branchement CommandBus↔UI explicitement exclu (§5.2, §5.3) et reporté à CF3.

---

## 6. Points de branchement identifiés dans `useCircuitState` (AC-012)

`[FAIT OBSERVÉ]` Sans modifier `useCircuitState.js`, les points suivants sont identifiés comme futurs points de branchement pour CF3 (migration des mutations React → Core) :

1. **Déclaration d'état** (`useCircuitState.js`, lignes 31-32) : `const [components, setComponents] = useState([])` et `const [wires, setWires] = useState([])`. C'est ici que réside, à la baseline, le seul état métier persistant de l'application (INV-CF1-001, état transitoire).
2. **Bloc `documentApi`** (lignes 153-186) : c'est la frontière actuelle entre les mutations UI et l'état React. En CF3, ce bloc serait le point naturel de substitution — remplacer les fermetures `setComponents`/`setWires` directes par des appels au CommandBus via `ReactCoreBridge`, sans changer la forme externe des six méthodes exposées (pour ne pas casser `DocumentAdapter`, sous réserve de résoudre l'écart signalé en §5).
3. **Lecture pour simulation** (ligne 87, `ReactDocumentMapper.toCore({components: safeComponents, wires: safeWires})`) : montre le patron déjà existant de conversion React → Core à la demande, réutilisable comme modèle pour une future lecture Core → React.
4. **États purement UI, à ne jamais migrer** (§8.5 du Ticket) : `selection`, `activeItem`, `pendingPin`, `simulationActive`, `zoom`, `showGrid`, `theme`, `marqueeRect` (toutes déclarées lignes 33-45) — ces états restent hors du périmètre de toute migration Document, y compris en CF3.

Aucune modification n'a été apportée à ces emplacements dans le cadre de MB-CF1-001 v3.1 : ils sont identifiés, non touchés, conformément à l'exclusion explicite « Remplacer le stockage React existant de `useCircuitState` » (§5.2) et à la Règle de prudence (§15).

---

## 7. Conformité aux invariants et à CSA-CF1-003

| Exigence | Statut | Justification |
|---|---|---|
| D6 — contrat formalisé, non inventé | ✅ | §2.1 : le contrat préexiste au ticket, dans `MockDocumentApi` + consommateurs Core. |
| INV-CF1-005 — pas d'API ad hoc | ✅ | Aucune nouvelle méthode Document n'a été ajoutée nulle part dans ce ticket. |
| INV-CF1-006 — modèle Core canonique préservé | ✅ | §3 : structure inchangée, non modifiée par ce ticket. |
| AC-005 — contrat documenté et testé | ✅ | Ce document (formalisation) + `frontend/src/bridge/tests/documentCoreProjection.test.js` (tests). |
| AC-012 — points de branchement identifiés | ✅ | §6. |
| CF1-003-C — pas de Document Core dérivé persistant indépendant | ✅ | §4 confirme qu'aucun état Document Core n'est stocké nulle part ; `toCore()`/`toReact()` restent des fonctions pures sans état. |

---

**Fin du document. Aucun fichier de production modifié pour produire cette formalisation — seule la présente spécification est un fichier nouveau.**
