# MB-BREADBOARD-006 — Delivery Report
## Breadboard objet Canvas gouverné (MOVE / DELETE, translation solidaire — Option B)

Statut : **IMPLÉMENTATION TERMINÉE — STOP AVANT COMMIT/PUSH, EN ATTENTE DE VALIDATION CSA FINALE**.
Aucun `git commit`, aucun `git push` n'a été exécuté par l'agent. Rappel gouvernance (standing instruction de session) : le dépôt miroir cloud utilisé pour produire cette livraison a un object store git incomplet/périmé (`git status`/`git diff` peuvent y afficher des faux positifs sur des fichiers déjà poussés, ou lister des fichiers non liés à ce ticket) — toute vérification de scope ou de diff doit être faite par le CSA/l'utilisateur sur son checkout local, jamais sur ce miroir. La liste des fichiers livrés (§8) provient du suivi de session, pas de `git status`.

---

## 1. Rappel du mandat (CSA Ruling — Option B)

Le Breadboard (`document.breadboard`) n'était pas un objet Canvas gouverné : `Breadboard.jsx` était une Presentation pure (aucun handler pointer), `SimulationCanvas.jsx` ne l'exposait à aucune interactivité, et le Core ne connaissait que `ADD_BREADBOARD`. Le CSA Ruling a tranché explicitement **Option B — translation solidaire** : déplacer le breadboard doit translater, dans **une seule mutation/une seule entrée d'historique**, tous les composants **actuellement insérés sur ses trous**, sans jamais toucher `buildNets()`/`breadboardConnectivity.js`/`breadboardGeometry.js`/le solveur, ni créer de second système de sélection ou d'historique.

## 2. Architecture livrée

### 2.1 Nouveau module partagé — `frontend/src/core/handlers/breadboard/breadboardSolidarity.js`

`resolveSolidaryComponentIds(breadboard, components)` — seule source de vérité pour « quels composants suivent le breadboard », réutilisant strictement `holeAt()` (non modifié) comme oracle. Un composant est solidaire s'il a **au moins une pin** résolue sur un trou de ce breadboard (sur-ensemble sûr du cas nominal — deux pins pour tout composant compatible déjà correctement inséré). Consommée à l'identique par la Presentation (aperçu de drag, `useCircuitState.js`) et par le Handler (mutation réelle, `MoveBreadboardHandler.js`) — jamais recalculée différemment aux deux endroits (INV-06).

### 2.2 Deux nouvelles commandes gouvernées

- **`MOVE_BREADBOARD`** (`MoveBreadboardHandler.js`) — payload `{breadboardId, fromPosition, toPosition}`. Détermine la solidarité **avant** mutation (contre `fromPosition`, vérifiée égale à `document.breadboard.position` — sinon `BREADBOARD_POSITION_MISMATCH`), translate breadboard + composants solidaires du même delta, en une seule construction immuable du Document. `_applyRedo` rejoue `lastResult.componentMoves`/`newBreadboardPosition` **sans recalculer** la solidarité (même patron défensif que `MoveComponentHandler._applyRedo`).
- **`DELETE_BREADBOARD`** (`DeleteBreadboardHandler.js`) — payload `{breadboardId}`. Supprime **uniquement** `document.breadboard` ; ne touche jamais `document.components`/`document.wires` (aucune suppression silencieuse — Ruling §7). N'étend ni ne réutilise `RemoveComponentHandler`/`MoveComponentHandler` (Ruling §8, classes dédiées).

Les deux sont enregistrées dans le CommandBus (`useCircuitState.js`), aux côtés des 5 commandes déjà gouvernées — le verrou `cf1DocumentArchitecture.test.js` (qui bornait explicitement le canal à 5 types) a été amendé pour en attester 7, exactement comme à chaque extension précédente (MB-CF3-002/003, MB-VIS-005, MB-BREADBOARD-002).

### 2.3 Intégration Presentation — sélection/drag/suppression

- **Sélection** : `Breadboard.jsx` consulte désormais `useCircuit()` (même convention que `CircuitComponent.jsx`) — `onMouseDown` déclenche `selectOnly({type:'breadboard', id})`, exclusive par construction (`selectOnly` remplace tout le Set). Aucune modification de `selection.js` (déjà générique).
- **Drag** : nouvelle fonction `startBreadboardDrag()` dans `useCircuitState.js`, réutilisant **le même** `dragSessionRef`/`dragPreview` que le drag de composant (discriminant `isBreadboardDrag`, aucune seconde machine à états). Pendant `pointermove`, le breadboard ET ses composants solidaires (déterminés une seule fois au pointerdown) sont insérés dans le **même** Map d'aperçu ; `componentsForRender` (inchangé) reflète donc déjà les composants solidaires sans modification. Au `pointerup`, une seule commande `MOVE_BREADBOARD` est dispatchée.
- **Suppression** : `deleteSelection()` reçoit une branche amont — si la sélection est exactement `{breadboard}`, dispatch `DELETE_BREADBOARD` via CommandBus ; sinon, comportement legacy inchangé (composants/wires, via `DeleteCommand`/`historyManagerRef`).

### 2.4 Pourquoi Undo/Redo restent unifiés malgré deux canaux différents

Investigation confirmée par lecture du code (disclosed, pas déduite) : `HistoryService` (canal CommandBus) enveloppe **la même instance** de `HistoryManager` que le canal legacy (`DeleteCommand`, `ToggleLatchingButtonCommand`) — une seule pile Undo/Redo, quel que soit le canal d'origine de la commande. `MOVE_BREADBOARD`/`DELETE_BREADBOARD` s'intègrent donc nativement, sans code additionnel, dans le même flux Ctrl+Z/Ctrl+Y que tout le reste (INV-02/INV-03, AC-09/AC-10/AC-13/AC-14).

## 3. Défauts découverts PENDANT l'implémentation, corrigés avant livraison

Deux défauts ont été révélés par la preuve Chromium obligatoire — ni l'un ni l'autre n'était détectable par la seule suite de tests automatisés (jsdom ne fait pas de hit-testing CSS réel), confirmant une nouvelle fois le principe déjà établi (MB-BREADBOARD-005 §3) : « les tests automatisés seuls ne suffisent pas ».

### 3.1 `svg.wires-layer` interceptait tous les clics sur le breadboard (`frontend/src/wires/WiresLayer.css`)

`.wires-layer` (plein canvas, `inset:0`, `z-index:3`, `pointer-events:auto`) est visuellement **au-dessus** de `.breadboard` (`z-index:1`, inchangé — nécessaire pour que les fils explicites restent visibles par-dessus le corps opaque du breadboard). Avec `pointer-events:auto` sur tout le conteneur, l'élément `<svg>` racine intercepte le hit-test **même sur ses zones vides** (aucun fil réellement dessiné à ce point) — un clic sur le corps du breadboard atteignait donc `svg.wires-layer`, jamais `Breadboard.jsx`. Aucune régression n'était visible avant ce ticket car les composants (z-index 5) occultent déjà visuellement wires-layer là où ils se superposent ; le breadboard (z-index 1, sous wires-layer) est le premier élément à en pâtir.

**Correction** : `.wires-layer` repassé à `pointer-events:none` (conteneur), avec `pointer-events:auto` ajouté explicitement à `.wires-layer__waypoint-handle` (seul élément qui reposait implicitement sur l'héritage du conteneur — la hitzone de clic d'un fil déclare déjà son propre `pointerEvents:'stroke'` inline, inchangé). Même patron déjà en usage ailleurs dans ce dépôt pour cette raison exacte (`.simulation-canvas__components` : conteneur `none`, enfants `auto`). Vérifié : `WiresLayer.test.jsx` (22 tests, jsdom, ne teste pas le hit-testing CSS réel) reste vert à l'identique ; la preuve Chromium (Scénario B) confirme visuellement que les fils explicites restent bien dessinés PAR-DESSUS le corps du breadboard (capture d'écran jointe) — aucune régression de l'ordre de peinture, uniquement du hit-testing.

### 3.2 `Breadboard.jsx` requiert désormais `CircuitProvider` — régression du test de rendu isolé existant

`Breadboard.test.jsx` (14 tests, MB-BREADBOARD-002/003) rendait `<Breadboard>` seul, sans aucun contexte — cohérent avec l'ancien contrat "Presentation pure". L'ajout de `useCircuit()` (sélection/drag, §2.3 ci-dessus) casse ce contrat : les 14 tests échouaient avec `useCircuit doit être utilisé dans CircuitProvider`.

**Correction** (fichier de test uniquement, aucune logique applicative changée) : un wrapper `CircuitContext.Provider` **minimal** (fakes `selectOnly`/`isSelected`/`startBreadboardDrag`, PAS un `CircuitProvider` complet) a été introduit — ces tests ne portent que sur le rendu géométrique (grille de trous, feedback, enrichissements visuels), jamais sur la sélection/le drag eux-mêmes (couverts par `BreadboardMovementDeletion.integration.test.jsx`, via le vrai pipeline). Les 14 assertions originales sont strictement inchangées.

Aucun des deux défauts ne touche `buildNets()`/`breadboardConnectivity.js`/`breadboardGeometry.js`/le solveur (scope out respecté).

## 4. Tests ajoutés

- `breadboardSolidarity.test.js` (8 tests) — solidarité géométrique pure (0/1/2 pins sur trou, hors empreinte, breadboard null, formes Presentation/Core, type inconnu).
- `MoveBreadboardHandler.test.js` (10 tests) — translation solidaire, composant non solidaire jamais touché, aucun composant solidaire (cas dégénéré), Undo/Redo atomiques, une seule entrée d'historique, rejets (`BREADBOARD_NOT_FOUND`, `BREADBOARD_POSITION_MISMATCH`, payload invalide), câblage réel CommandBus → ValidationEngine → Handler.
- `DeleteBreadboardHandler.test.js` (7 tests) — suppression minimale, `components`/`wires` strictement intacts (avant/après ET après Undo), Undo/Redo, rejets.
- `BreadboardMovementDeletion.integration.test.jsx` (5 tests, pipeline réel CircuitProvider/CommandBus) — Scénario A (breadboard seul, sélection/drag/Undo/Redo) ; Scénario B (POWER+RESISTOR+LED montés, translation solidaire, simulation identique avant/après) ; Scénario B bis (composant non inséré jamais déplacé) ; Scénario C (sélection+suppression, Undo/Redo) ; une seule entrée d'historique pour un drag solidaire à 3 éléments.
- `cf1DocumentArchitecture.test.js` — verrou amendé (7 commandes) + assertions d'existence des deux nouveaux Handlers.
- `Breadboard.test.jsx` — 14 tests existants réparés (aucune assertion modifiée), voir §3.2.

Total : **30 tests neufs**, tous verts.

## 5. Résultats

- **Suite complète** (`npx vitest run --config vitest.config.js`) : **1176/1177 verts**. Le seul échec (`RealisticRenderers.test.jsx`, assertion BUTTON pressed/released) est le même flake d'isolation **pré-existant et sans rapport**, déjà disclosed dans le rapport MB-BREADBOARD-005 §6 — reconfirmé indépendant : passe systématiquement en isolation (`-t`), échoue de façon identique sur le fichier complet, avant et après ce ticket.
- **Build production** (`npm run build` = `tsc -b && vite build`) : **vert**, aucun warning.
- **Preuve Chromium réelle** (Playwright, Chromium headless, dev server réel) : les trois scénarios obligatoires du Ruling §10 exécutés de bout en bout, zéro erreur console —
  - **Scénario A** : Breadboard posé (position par défaut 120,180) → sélectionné (clic réel, classe `breadboard--selected` confirmée) → glissé (delta réel) → position (180,240) confirmée → Ctrl+Z → (120,180) restauré → Ctrl+Y → (180,240) réappliqué.
  - **Scénario B** : POWER inséré sur le rail bas, RESISTOR et LED sur la bande haute (même géométrie prouvée que MB-BREADBOARD-005), câblage réel par clic sur les pins, simulation → LED allumée (6 trous occupés) → **Breadboard glissé de (48,48)** → les 3 composants ont suivi **exactement** ce delta (`followed_exactly: true` pour les trois) → 6 trous toujours occupés (topologie relative inchangée) → nouvelle simulation → **LED toujours allumée**. Capture d'écran jointe : les fils explicites restent visibles au-dessus du corps du breadboard (non-régression §3.1 confirmée visuellement).
  - **Scénario C** : Breadboard sélectionné → `Delete` → disparition (`svg.breadboard` absent), les 3 composants et les 4 tracés de fils (2 fils × hitzone+visuel) restent présents à l'identique → Ctrl+Z → breadboard restauré (même position) → Ctrl+Y → suppression réappliquée.
  - **Critère absolu (§11 du Ruling)** : topologie relative inchangée + composants solidaires + simulation identique — **démontré**.

## 6. Invariants / AC

Tous les invariants INV-01→07 et critères AC-01→20 du ticket (`docs/pmo/tickets/MB-BREADBOARD-006.md`, Partie II) sont couverts par les tests unitaires/intégration (§4) et/ou la preuve Chromium (§5). AC-17 (build) et AC-18 (`git diff --check`) : voir note de gouvernance en tête de rapport — `git diff --check` doit être exécuté par l'utilisateur sur son checkout local (miroir cloud non fiable pour cette vérification).

## 7. Non-régression du scope out (vérifié)

`breadboardGeometry.js`, `breadboardConnectivity.js`, `buildNets()`, le solveur, `selection.js`, `MoveComponentHandler.js`, `RemoveComponentHandler.js` : **zéro modification** (consultés en lecture seule comme patron/oracle, jamais édités). `REMOVE_COMPONENT`/`UPDATE_COMPONENT` restent non enregistrés dans le CommandBus (vérifié par `cf1DocumentArchitecture.test.js`, toujours vert).

## 8. Fichiers livrés

Nouveaux :
- `docs/pmo/tickets/MB-BREADBOARD-006.md` (Blueprint + Ticket + CSA GO Final)
- `frontend/src/core/handlers/breadboard/breadboardSolidarity.js`
- `frontend/src/core/handlers/breadboard/MoveBreadboardHandler.js`
- `frontend/src/core/handlers/breadboard/DeleteBreadboardHandler.js`
- `frontend/src/core/handlers/breadboard/__tests__/breadboardSolidarity.test.js`
- `frontend/src/core/handlers/__tests__/MoveBreadboardHandler.test.js`
- `frontend/src/core/handlers/__tests__/DeleteBreadboardHandler.test.js`
- `frontend/src/__tests__/BreadboardMovementDeletion.integration.test.jsx`
- `docs/pmo/delivery-reports/MB-BREADBOARD-006-delivery-report.md` (ce rapport)

Modifiés :
- `frontend/src/hooks/useCircuitState.js` (enregistrement CommandBus, `startBreadboardDrag`, extension pointermove/pointerup, extension `deleteSelection`, `breadboardForRender`)
- `frontend/src/canvas/Breadboard.jsx` (sélection/drag)
- `frontend/src/canvas/Breadboard.css` (`pointer-events:auto`, classe `--selected`)
- `frontend/src/canvas/SimulationCanvas.jsx` (garde marquee sur clic breadboard)
- `frontend/src/wires/WiresLayer.css` (défaut §3.1, disclosed)
- `frontend/src/canvas/__tests__/Breadboard.test.jsx` (régression §3.2, disclosed — aucune assertion changée)
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` (verrou amendé, 7 commandes)

## 9. STOP

Conformément au Ruling (Partie III, CSA-05/CSA-06 du triptyque) : **aucun commit, aucun push**. En attente de validation CSA finale (INV-01→07, AC-01→20, scénarios A/B/C + critère absolu — tous vérifiés ci-dessus) avant que l'utilisateur exécute lui-même les commandes de vérification/commit/push sur son checkout local.
