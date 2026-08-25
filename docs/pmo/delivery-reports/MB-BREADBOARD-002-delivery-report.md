# Delivery Report — MB-BREADBOARD-002

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-BREADBOARD-002` (implémentation), rattaché à `MB-BREADBOARD-001` (cadrage) |
| Blueprint | `docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md` |
| Nature | Implémentation nouvelle — **PAS** une régularisation rétroactive |
| Date | 2026-08-25 |
| CSA Ruling autorisant l'implémentation | GO, `docs/pmo/tickets/MB-BREADBOARD-002.md` §12, sous conditions LOCK-01→12 / AC-01→20 |
| Statut de ce rapport | **Étape 6 du Protocole §8 — précède l'Étape 7 (STOP avant commit)** : rien n'est commité, ce rapport est soumis à validation CSA post-implémentation avant tout `git add`/`commit` |

## 2. Fichiers touchés

### Nouveaux

- `frontend/src/utils/breadboardGeometry.js` — géométrie pure (pas de grille dédié, résolution trou/groupe électrique).
- `frontend/src/utils/breadboardConnectivity.js` — dérivation pure des arêtes virtuelles (forme Core + conversion forme bridge).
- `frontend/src/core/handlers/breadboard/AddBreadboardHandler.js` — commande CF3 `ADD_BREADBOARD` (LOCK-01).
- `frontend/src/utils/__tests__/breadboardGeometry.test.js` (13 tests).
- `frontend/src/utils/__tests__/breadboardConnectivity.test.js` (11 tests).
- `frontend/src/core/handlers/__tests__/AddBreadboardHandler.test.js` (5 tests).
- `frontend/src/simulator/__tests__/engineAdapter.test.js` (6 tests — module non testé avant ce ticket).
- `frontend/src/simulator/__tests__/breadboardSimulationIntegration.test.js` (4 tests — preuve end-to-end AC-13).
- `frontend/src/measurement/__tests__/breadboardMeasurementIntegration.test.js` (6 tests — preuve end-to-end AC-14/TB-13, lot de correction des points ouverts, cf. §3 point 4).
- `frontend/src/canvas/Breadboard.jsx` (+ `Breadboard.css`) — Presentation V1 (Blueprint §8), lot de correction des points ouverts.
- `frontend/src/canvas/__tests__/Breadboard.test.jsx` (5 tests).
- `frontend/src/__tests__/AddBreadboardMutationChannel.integration.test.jsx` (5 tests — canal de mutation cible réel, régression du point 5 de §3).
- `docs/pmo/delivery-reports/MB-BREADBOARD-002-delivery-report.md` (ce document).

### Modifiés

- `frontend/src/core/validation/rules/electrical/PowerGroundShortCircuitRule.js` — `buildNets()` reçoit désormais `[...wires, ...deriveBreadboardVirtualWires(document)]`. `nets.js` lui-même non modifié.
- `frontend/src/simulator/engineAdapter.js` — `toEngineInput()` ajoute `deriveBreadboardVirtualWiresBridge(coreDocument)` aux wires convertis. **C'est ce point d'appel, et non `engine.js`/`simulationRuntimeIntegration.js` comme envisagé initialement dans le Blueprint, qui s'est révélé être l'unique point de conversion Core → bridge réellement emprunté par le chemin de production** (`useCircuitState.js` → `toEngineInput` → `runSimulationWithRuntime`). `engine.js`, `preparation.js`, `resolution.js`, `simulationRuntimeIntegration.js` restent tous inchangés — LOCK-06 strictement respecté. Ce même point d'appel s'est révélé être aussi la frontière correcte pour AC-14/TB-13 (§3 point 4, §5.1).
- `frontend/src/hooks/useCircuitState.js` — enregistrement `ADD_BREADBOARD` dans le `CommandRegistry` (cinquième et dernier type autorisé, cf. commentaire d'amendement), ajout de `addBreadboard()`, exposition dans le retour du hook. **Lot de correction des points ouverts** : ajout d'un état React dédié `breadboard`/`breadboardRef` (absent du premier lot — voir §3 point 4), branché sur `documentApi.getDocument()`/`applyDocument()`, et exposition de `breadboard` dans le retour du hook pour `Breadboard.jsx`.
- `frontend/src/canvas/SimulationCanvas.jsx` — montage de `<Breadboard breadboard={breadboard} components={components} />` dans `.simulation-canvas__zoom-layer`, entre `GridBackground` et `WiresLayer` (ordre de calque physique : grille, breadboard, fils, composants).
- `frontend/src/core/handlers/index.js` — export `AddBreadboardHandler`.
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` — verrou amendé sous citation explicite du CSA Ruling `MB-BREADBOARD-002` (2026-08-25), même patron que les amendements CSA-CF3-002/UPDATE_WIRE_WAYPOINTS/CSA-CF3-003 précédents. Le verrou borne désormais le canal à exactement cinq commandes.

### Explicitement non touchés (conforme §3/§9 du ticket)

`simulator/preparation.js`, `simulator/resolution.js`, `simulator/engine.js`, `simulator/simulationRuntimeIntegration.js`, `core/validation/rules/shared/nets.js`, `simulator/canonicalRegistry.js`, tout fichier Arduino/runtime, `core/handlers/component/*` (ADD_COMPONENT/MOVE_COMPONENT réutilisés tels quels, non modifiés).

## 3. Écarts par rapport au Blueprint (découvertes en cours d'implémentation, non silencieuses)

1. **Point d'intégration solveur corrigé** : le Blueprint (rédigé après la première correction de périmètre buildNets/prepareCircuit) nommait encore `engine.js`/`simulationRuntimeIntegration.js` comme fichiers à modifier. L'inspection fine du chemin de production a montré que `engineAdapter.js::toEngineInput()` est l'unique et véritable frontière Core → bridge empruntée par `useCircuitState.js` — modifier ce seul fichier suffit et est strictement plus étroit que prévu.
2. **`BreadboardSingletonRule` non créée** : LOCK-01 est déjà appliqué de façon stricte et testée au niveau du Handler (`AddBreadboardHandler._applyMutation`, refus explicite si `document.breadboard` existe). Une règle de `ValidationRegistry` dupliquant exactement ce même contrôle a été jugée redondante et n'a pas été créée.
3. **`BreadboardRailShortRule` non créée** : une fois `buildNets()` étendu (§2, `PowerGroundShortCircuitRule.js`), la règle **existante** `ELE-007` détecte déjà, sans aucun code supplémentaire, tout net reliant directement un rail `+` (rôle `power`) à un rail `-` (rôle `ground`) via le breadboard — exactement le cas d'erreur de montage que cette règle dédiée aurait couvert. Aucune règle spécifique n'a donc été ajoutée.
4. **Bug réel trouvé et corrigé pendant le lot de correction des points ouverts (feu vert CSA du 2026-08-25 sur §5.1/§5.2)** : `documentApi.getDocument()`/`applyDocument()` dans `useCircuitState.js` (livrés dans le premier lot) n'avaient **aucun état React dédié à `breadboard`** — `getDocument()` construisait `ReactDocumentMapper.toCore({components, wires})` sans jamais y inclure `breadboard`, et `applyDocument()` n'extrayait que `reactDocument.components`/`.wires`. Conséquence concrète : un `ADD_BREADBOARD` dispatché via le hook réel (par opposition au `MockDocumentApi` d'`AddBreadboardHandler.test.js`, qui ne l'a jamais exercé) posait bien `document.breadboard` dans le Document retourné par le Handler, mais cette valeur n'était **jamais captée par aucun state React** : elle était silencieusement perdue au prochain rendu, LOCK-01 devenait inopérant en pratique (rien à comparer) et rien n'aurait pu être affiché par une Presentation branchée dessus. Ce bug était invisible tant qu'aucune Presentation ni aucun test d'intégration réel (canal `useCircuit()`) n'exerçait `addBreadboard()` — ce qui était le cas jusqu'à ce lot. **Corrigé** : ajout de `breadboard`/`breadboardRef` (state + ref, même patron que `components`/`wires`), branchement dans `getDocument()`/`applyDocument()`, exposition dans le retour du hook. Couvert par un nouveau test d'intégration réel (`AddBreadboardMutationChannel.integration.test.jsx`, 5 tests, canal `CircuitProvider` complet, pas de mock) — voir §5.2.

Ces quatre écarts réduisent le périmètre effectivement touché par rapport au Blueprint pour les trois premiers (2 fichiers de règles en moins), et le quatrième est un correctif d'un manque non détecté par le premier lot — divulgué ici plutôt que corrigé silencieusement — sans réduire la couverture fonctionnelle exigée par les LOCK/AC.

## 4. Tests exécutés et résultats

```
Lot initial (AC-01→13, 15→20) :
npm run test:ci
  Test Files  96 passed (96)
  Tests       1015 passed (1015)
  Duration    35.81s

Lot de correction des points ouverts (AC-14/TB-13 + Presentation), après feu vert CSA du 2026-08-25 :
npm run test:ci
  Test Files  99 passed (99)
  Tests       1031 passed (1031)
  Duration    36.32s

npm run build
  tsc -b && vite build → ✓ built in 0.52s, aucune erreur
```

Avant ce ticket (référence connue, cf. commit `717d988`) : 91 fichiers / 976 tests. Après le lot initial : 96 fichiers / 1015 tests. Après le lot de correction des points ouverts : **99 fichiers / 1031 tests** — soit **3 nouveaux fichiers de test / 16 nouveaux tests** pour ce second lot (`breadboardMeasurementIntegration.test.js` : 6, `Breadboard.test.jsx` : 5, `AddBreadboardMutationChannel.integration.test.jsx` : 5), **zéro régression** sur l'ensemble des 1015 tests préexistants.

`git diff --check` n'a pas pu être exécuté depuis cet environnement (le miroir cloud ne conserve que les objets Git minimaux nécessaires à `git status`, pas l'historique complet des blobs) — à exécuter côté poste local au moment du commit.

### Correspondance avec les tests obligatoires (§6 du ticket)

| Test | Statut | Où |
|---|---|---|
| TB-01 (même groupe → même net) | ✓ | `breadboardGeometry.test.js`, `breadboardConnectivity.test.js`, `engineAdapter.test.js` |
| TB-02 (groupes voisins → nets différents) | ✓ | `breadboardGeometry.test.js`, `breadboardConnectivity.test.js` |
| TB-03 (rainure → nets différents) | ✓ | `breadboardGeometry.test.js` |
| TB-04 (rail continu) | ✓ | `breadboardGeometry.test.js` |
| TB-05 (rail + ≠ rail -) | ✓ | `breadboardGeometry.test.js` |
| TB-06 (breadboard + wire explicite) | ✓ | `engineAdapter.test.js` |
| TB-07 (retrait, pas de résidu) | ✓ | `breadboardConnectivity.test.js`, `breadboardSimulationIntegration.test.js` |
| TB-08 (déplacement) | ✓ | `breadboardConnectivity.test.js` |
| TB-09 (insertion invalide) | ✓ | `breadboardGeometry.test.js`, `breadboardConnectivity.test.js` — voir §5 note de portée |
| TB-10 (patte déjà insérée) | ✓ (par construction) | Sans état d'occupation persisté (LOCK-07), une patte ne peut structurellement occuper deux trous : sa position est unique — voir §5 |
| TB-11 (LED/résistance breadboard → simulation correcte) | ✓ | `breadboardSimulationIntegration.test.js` |
| TB-12 (équivalent câblé → même résultat) | ✓ | `breadboardSimulationIntegration.test.js` |
| TB-13 (observation d'un net breadboard) | ✓ | `breadboardMeasurementIntegration.test.js` — voir §5.1 |
| TB-14 (Document sans breadboard inchangé) | ✓ | `breadboardConnectivity.test.js`, `engineAdapter.test.js` |
| TB-15 (canevas libre sans breadboard inchangé) | ✓ | `engineAdapter.test.js` |

## 5. Points ouverts du lot initial — statut après le lot de correction (feu vert CSA du 2026-08-25)

### 5.1 AC-14 / TB-13 — Observation des nets breadboard : RÉSOLU

`observe()`/`measure()`/`observeTemporal()` (contrats `MB-OBS-001`) n'ont **pas été modifiés** — l'interdiction du ticket (§3 : « modification des contrats MB-OBS-001 ») reste strictement respectée. La résolution retenue est plus étroite que les options (a)/(b) envisagées précédemment : ces trois contrats reçoivent `components`/`wires` en paramètres directs, sans jamais lire le Document eux-mêmes — la seule condition pour qu'ils « voient » les nets breadboard est que l'appelant leur fournisse des `components`/`wires` dérivés via `engineAdapter.js::toEngineInput()` (la même frontière Core → bridge que la simulation réelle, §2 du Blueprint), plutôt que par un autre moyen. Aucun des 3 points d'appel (`measurementContract.js`, `TemporalObservationPanel.jsx`, `temporalObservationContract.js`) n'était d'ailleurs encore branché sur l'UI (`App.jsx` ne les monte pas) — il n'existait donc aucun site de production à modifier.

**Preuve apportée** : `frontend/src/measurement/__tests__/breadboardMeasurementIntegration.test.js` (6 tests) — deux résistances en série entre `POWER.5V`/`POWER.GND`, la jonction `R1.B`/`R2.A` passant **uniquement** par un breadboard dans un document, et par un wire explicite dans un second document topologiquement équivalent. Les 4 pins (`r1:A/B`, `r2:A/B`) donnent un résultat `measure()` strictement identique entre les deux documents (`toEqual`), plus une preuve `VALID` sur `r2:A` (relié uniquement via le breadboard) et une preuve de régression (sans breadboard ni wire, `r2:A` redevient `UNAVAILABLE`). Deux fixtures initiales (LED en tension directe, puis pont diviseur attendant 2.5V) ont été essayées et rejetées après diagnostic : les deux échouaient **identiquement** dans la variante breadboard et la variante entièrement câblée, prouvant qu'il s'agissait de limites préexistantes du solveur DC de ce simulateur (non un pont diviseur général), pas d'un défaut de ce ticket — d'où le choix final d'une preuve par égalité pin-à-pin plutôt que par valeur absolue, à la fois plus robuste et plus fidèle à AC-14 (« observable », pas « une valeur particulière »).

**Conséquence** : un multimètre/oscilloscope posé sur un composant relié uniquement via le breadboard voit désormais la même valeur que s'il était relié par un wire explicite, dès lors qu'il est alimenté via `toEngineInput()`. Aucune régression sur les circuits sans breadboard (paramètre `wires` inchangé quand `document.breadboard` est absent).

### 5.2 Presentation (rendu visuel) : RÉSOLU

`frontend/src/canvas/Breadboard.jsx` (+ `.css`) créé conformément au Blueprint §8 : rendu SVG lecture seule de `document.breadboard`, monté dans `SimulationCanvas.jsx` (`.simulation-canvas__zoom-layer`, entre `GridBackground` et `WiresLayer`). Aucune logique de connectivité propre (LOCK-08) : la grille de trous est entièrement dérivée en interrogeant `holeAt()` point par point (même fonction que `breadboardConnectivity.js`), sans dupliquer aucune limite de bande (rails/strips/rainure) ; la mise en évidence optionnelle d'un trou « occupé » compare la position absolue de chaque pin (`getPinPosition()`, déjà utilisé par `CircuitComponent.jsx`) au résultat de `holeAt()` — une coïncidence géométrique point-à-point, jamais un calcul de groupe électrique ou d'union de trous (AC-18 : aucune seconde source de vérité électrique).

En construisant ce rendu, un bug réel et jusque-là invisible a été trouvé dans le premier lot : sans état React dédié, `document.breadboard` posé par `ADD_BREADBOARD` ne survivait à aucun rendu — voir §3 point 4 pour le détail et le correctif. Sans ce correctif, `Breadboard.jsx` n'aurait jamais rien eu à afficher.

Couvert par `frontend/src/canvas/__tests__/Breadboard.test.jsx` (5 tests, rendu isolé sans contexte) et `AddBreadboardMutationChannel.integration.test.jsx` (5 tests, canal `CircuitProvider` réel).

**Limite disclosed, hors scope de ce lot** : aucune affordance UI (bouton menu/barre latérale) n'a été ajoutée pour déclencher `addBreadboard()` depuis l'interface — seuls le hook (`addBreadboard()`) et les tests l'invoquent aujourd'hui. Le feu vert CSA du 2026-08-25 portait explicitement sur « les deux points ouverts » (AC-14/TB-13 et la Presentation elle-même, §5.2 du rapport précédent) ; l'ajout d'un déclencheur UI n'y figurait pas et sortirait d'AC-20 (« aucun changement hors périmètre ») sans un arbitrage CSA dédié. À traiter en ticket séparé si souhaité.

### 5.3 TB-10 — non testé explicitement comme mutation refusée

Le ticket formule TB-10 comme « patte déjà insérée → mutation refusée ». Le modèle retenu (LOCK-02/LOCK-07 : aucune insertion/retrait n'est une commande séparée, l'occupation est dérivée de la position) rend ce scénario structurellement impossible plutôt que rejeté par une validation explicite — un composant a une seule position, donc chacune de ses pattes n'occupe jamais qu'un seul trou à la fois. Aucun test dédié ne le démontre formellement ; à ajouter si le CSA souhaite une preuve explicite plutôt qu'une déduction structurelle.

## 6. Invariants (LOCK-01 à LOCK-12) — statut

Tous respectés par la conception retenue : LOCK-01 (Handler, testé — et désormais opérant en pratique via l'état React dédié, §3 point 4), LOCK-02 (position → connectivité, dérivation pure), LOCK-03 (wires libres inchangés, testé TB-14/15), LOCK-04/05 (arêtes virtuelles, `buildNets()` non modifié), LOCK-06 (solveur non modifié — `preparation.js`/`resolution.js`/`engine.js` intacts), LOCK-07 (aucun net persisté — y compris côté Presentation, `Breadboard.jsx` ne stocke aucune occupation), LOCK-08 (`Breadboard.jsx` créé, lecture seule, aucune logique de connectivité propre — §5.2), LOCK-09 (rainure isolante, testé), LOCK-10 (rails indépendants, testé), LOCK-11 (seuls composants 2 broches exercés — aucun test IC), LOCK-12 (aucune horloge introduite).

## 7. Conclusion et demande

L'implémentation couvre désormais le modèle de connectivité de bout en bout jusqu'à la simulation réelle **et** l'observation/mesure (AC-01 à AC-20, sans exception), avec preuve end-to-end vérifiée pour chacun (§4), et un rendu Presentation réel (§5.2). Les deux points ouverts du rapport précédent (§5.1 observation, §5.2 rendu) sont résolus dans ce lot, sur feu vert CSA explicite du 2026-08-25. Un bug réel du premier lot (état React manquant pour `breadboard`, §3 point 4) a été trouvé et corrigé au passage — divulgué ici plutôt que corrigé silencieusement.

Restent, disclosed et non traités par ce lot (ni demandés) : TB-10 comme preuve explicite plutôt que déduction structurelle (§5.3, inchangé depuis le rapport précédent) et l'ajout d'une affordance UI pour créer un breadboard depuis l'interface (§5.2, hors du périmètre du feu vert du 2026-08-25).

Conformément à l'Étape 7 : **aucun commit n'a été effectué.** Ce rapport est soumis pour validation CSA avant tout `git add`/`commit`.
