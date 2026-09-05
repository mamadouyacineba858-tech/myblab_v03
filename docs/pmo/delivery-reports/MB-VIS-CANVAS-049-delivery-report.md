# MB-VIS-CANVAS-049 — Delivery Report
## Coordinate & Interaction Foundation

Statut : **CSA GO POST-IMPLÉMENTATION REÇU — commit local produit, push en cours d'exécution sous cette même autorisation.**

---

## 1. Rappel du mandat

Le rapport d'audit `EXP3-RECALAGE-002 — Canvas, Zoom & Bibliothèque de composants` avait établi que `clientToCanvas()` (`frontend/src/utils/geometry.js`) convertissait une position pointeur écran en coordonnées Document/Canvas en soustrayant uniquement l'origine du conteneur (`canvasRect.left/top`), **sans jamais diviser par le zoom courant** — alors que le contenu du Canvas (grille, composants, fils, breadboard, marquee) est mis à l'échelle par un unique `transform: scale(zoom)` sur `.simulation-canvas__zoom-layer`. Un pixel écran ne valait donc plus un pixel Document dès que `zoom !== 1`.

Le Blueprint (`docs/pmo/blueprints/MB-VIS-CANVAS-049-blueprint.md`) a tranché la Décision CSA de coordonnées : *« Le repère de vérité pour les interactions est le repère Document/Canvas. Toute entrée de coordonnées provenant du viewport doit être convertie vers ce repère avant d'alimenter les opérations de sélection, drag, waypoint ou snapping. Le zoom est un facteur de projection entre Document et écran ; il ne modifie jamais les coordonnées du Document. »* — sans imposer de mécanisme concret au-delà de cette exigence fonctionnelle et des invariants du Ticket.

Périmètre inclus (Ticket §C) : drag composant, marquee, drag/insertion de waypoint, drag Breadboard, Sidebar drop/preview — un seul modèle de coordonnées, sans nouveau chemin concurrent. Périmètre exclu, non touché : pan, focus composant, zoom local, rotation/miroir, Inspector/Toolbar/Library, solveur/nets/connectivité, agrandissement des assets.

## 2. Architecture livrée

### 2.1 Point de conversion unique — `clientToCanvas(event, canvasRect, zoom = 1)`

`frontend/src/utils/geometry.js` — la fonction divise désormais la coordonnée (après soustraction de l'origine du conteneur) par `zoom`, avec un repli défensif sur `1` pour toute valeur non finie ou nulle (`Number.isFinite(zoom) && zoom !== 0`). Le paramètre `zoom` est optionnel avec une valeur par défaut de `1`, préservant strictement le comportement historique de tout appelant qui ne le fournirait pas encore. Signature volontairement tolérante à un objet `{clientX, clientY}` minimal, pas seulement un `MouseEvent` réel (nécessaire pour `updateSidebarComponentDragPosition`, qui reçoit des nombres bruts).

### 2.2 Huit sites d'appel harmonisés (`frontend/src/hooks/useCircuitState.js`)

Chacun des chemins suivants passait auparavant par `clientToCanvas(event, rect)` (2 arguments, zoom ignoré) ; chacun passe désormais `zoom` en 3ᵉ argument, et la fonction `useCallback` correspondante liste `zoom` dans son tableau de dépendances :

- `startWaypointDrag` (pointerdown initial d'un drag de waypoint existant) ;
- `startDrag` (pointerdown initial d'un drag de composant) ;
- `startBreadboardDrag` (pointerdown initial d'un drag de Breadboard) ;
- `startMarquee` / `updateMarquee` (début et mise à jour du rectangle de sélection) ;
- les deux continuations `pointermove` (drag de waypoint et drag de composant/Breadboard) à l'intérieur de l'unique `useEffect` global `pointermove`/`pointerup`/`pointercancel`/`blur`.

Ce dernier `useEffect` (fenêtre `window`, posé une fois par montage) liste désormais `zoom` dans son tableau de dépendances — sans cette dépendance, sa fermeture aurait capturé une valeur de zoom figée au montage plutôt que la valeur courante à chaque interaction.

`frontend/src/wires/WiresLayer.jsx::handleHitzoneDoubleClick` (insertion d'un waypoint par double-clic sur le tracé d'un fil sélectionné) reçoit désormais `zoom` depuis `useCircuit()` et le transmet à `clientToCanvas()`.

### 2.3 Élimination du second modèle de coordonnées (Sidebar)

Avant ce ticket, deux formules **inline**, indépendantes de `clientToCanvas()` mais arithmétiquement identiques par coïncidence, calculaient `(clientX - rect.left) / zoom` :

- `SimulationCanvas.jsx::handleDrop` (dépôt réel d'un composant depuis la Sidebar) ;
- `useCircuitState.js::updateSidebarComponentDragPosition` (aperçu de placement pendant le survol du Canvas).

Les deux ont été refactorées pour appeler `clientToCanvas(event, rect, zoom)` — plus aucune division par `zoom` n'est écrite en dehors de cette fonction unique dans l'ensemble des trois fichiers concernés (`SimulationCanvas.jsx`, `useCircuitState.js`, `WiresLayer.jsx`), verrouillé par un garde-fou dédié (§4).

### 2.4 Ce qui n'a pas changé (invariants)

- `getPinPosition()` (`geometry.js`) et `componentDefinitions.js` : non modifiés — la géométrie électrique canonique ignore toujours le zoom, par construction.
- Aucun `PartRenderer` ne lit `zoom` : le contrat `visualContract.js` (*« Aucune correction par zoom n'est autorisée dans le renderer »*, `zoomBehaviour: 'invariant en unites canvas'*) reste intact — ce ticket corrige la conversion **pointeur → Document**, un sujet strictement distinct du rendu visuel des assets, jamais touché ici.
- Aucun nouveau `if (type === "…")` dans une couche de rendu centrale.
- Snapping (`snapToGrid`, `snapToBreadboardPitch`), sélection, `dragPreview`/`breadboardFeedback`/`waypointPreview`, et la sémantique d'historique (une seule commande `MOVE_COMPONENT`/`MOVE_BREADBOARD`/`UPDATE_WIRE_WAYPOINTS` par interaction, I-H10) sont strictement inchangés dans leur forme — ils reçoivent désormais une entrée corrigée, mais aucune de leurs propres règles n'a été modifiée.

## 3. Tests ajoutés — 24 tests neufs

- **`frontend/src/utils/__tests__/clientToCanvasZoom.test.js`** (7 tests) — unitaires sur `clientToCanvas()` elle-même : zoom implicite/explicite = 1, zoom = 2 (division), zoom = 0.5 (multiplication), non-interférence entre soustraction d'origine et division par zoom, repli défensif sur des valeurs de zoom invalides (0/NaN/undefined/Infinity), tolérance à un objet `{clientX, clientY}` minimal.
- **`frontend/src/utils/__tests__/coordinateConversionSingleModelGuard.test.js`** (5 tests) — garde-fou architectural (même patron que `geometryPinCanonicalGuard.test.js`) : aucune division brute par `zoom` en dehors de `clientToCanvas()` dans `SimulationCanvas.jsx`/`useCircuitState.js`/`WiresLayer.jsx` ; les trois fichiers importent bien `clientToCanvas` depuis `utils/geometry.js` ; la fonction accepte et applique effectivement un 3ᵉ paramètre `zoom`.
- **`frontend/src/__tests__/CoordinateZoomInteraction.integration.test.jsx`** (12 tests, pipeline réel `CircuitProvider`/`useCircuit`, même patron que `MoveComponentMutationChannel.integration.test.jsx`) — drag composant à zoom 2.0/0.5/1 (snapping et History inclus), marquee à zoom 2.0/0.5/1 (sélection par recouvrement visuel réel), drag de waypoint de fil à zoom 2.0/1, drag de Breadboard à zoom 2.0 (pas `BREADBOARD_PITCH` préservé), Sidebar drag/preview opérationnel à zoom 2.0.

**Preuve que les tests détectent réellement l'écart (critère d'acceptation #11 du Ticket)** : les 4 fichiers source modifiés ont été mis de côté (`git stash` ciblé, tests neufs conservés) et la suite ré-exécutée contre le code pré-correctif — **14 des 24 nouvelles assertions échouent** contre l'ancien comportement, confirmant qu'elles ne sont pas vacuously vraies. Le stash a ensuite été restauré et la suite reconfirmée verte à 24/24.

## 4. Résultats

- **Tests ciblés** (9 fichiers directement concernés par la conversion de coordonnées — les 3 nouveaux + `WiresLayer.test.jsx`, `MoveComponentMutationChannel.integration.test.jsx`, `DeleteCommand.integration.test.jsx`, `geometryPinCanonical(Guard).test.js`, `visualContract.test.js`) : **108/108 verts**.
- **Suite complète** (`npx vitest run --config src/simulator/vitest.config.ts`) : **1828/1847 verts (19 échecs / 11 fichiers)** — exactement la baseline pré-existante documentée par `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` (géométrie breadboard / projection de pin LED héritée, sans rapport avec ce ticket). Confirmé identique avant/après ce ticket par exécution différentielle (`git stash` des 4 fichiers source, suite ré-exécutée, mêmes 19 échecs/11 fichiers). **0 régression nouvelle.** Les 1847 tests = 1823 (baseline post-COMP-037) + 24 tests neufs de ce ticket.
- **`tsc --noEmit`** : exit 0.
- **`npm run build`** (`tsc -b && vite build`) : vert, `built in 1.60s`, aucun warning.
- **`git diff --check`** : exit 0.

## 5. Preuve navigateur (Chromium réel, dev server réel, session fraîche — pas jsdom)

Un composant `RESISTOR` posé en `(200,180)`. Console vérifiée propre (`read_console_messages`, aucune erreur) avant, pendant et après chaque scénario.

| Scénario | Zoom | Delta écran | Résultat observé | Attendu (corrigé) | Ancien comportement (non corrigé) |
|---|---|---|---|---|---|
| Drag composant | **1.5×** (zoom > 1) | 150 px | `x: 200 → 300` | 200 + 150/1.5 = **300** ✅ | 200 + 150 = 360 |
| Drag composant | **0.5×** (zoom < 1) | 60 px | `x: 300 → 420` | 300 + 60/0.5 = **420** ✅ | 300 + 60 = 360 |
| Undo ×2 | — | — | `x: 420 → 300 → 200` | restaure exactement les deux positions zoom-corrigées | — |
| Marquee | 0.5× | tracé visuel autour du composant à l'écran | composant sélectionné (contour `rgb(34,197,94) solid 2px` confirmé) | sélectionné (le rectangle Document, une fois divisé par le zoom, recouvre bien le composant) | non sélectionné (le rectangle resterait en coordonnées écran brutes, hors du rectangle Document du composant) |

Une notification console `"The final argument passed to %s changed size between renders"` est apparue une fois, sur un onglet resté ouvert depuis avant les modifications de code — artefact de Hot Module Replacement (Vite) sur un composant déjà monté dont la longueur du tableau de dépendances d'un `useEffect` a changé en cours de session live, pas un défaut du code livré. Confirmé disparu après un rechargement complet de la page (navigation fraîche, pas de patch HMR) ; tous les scénarios ci-dessus ont été rejoués sur cette session fraîche, console propre du début à la fin.

## 6. Non-régression du scope out (vérifié)

Aucune modification de : `componentDefinitions.js`, `canonicalRegistry.js`, `Breadboard.jsx`/`breadboardGeometry.js`/`breadboardConnectivity.js`/`breadboardPlacementAdapter.js` (logique électrique/géométrique), le solveur, les `PartRenderer`, `Sidebar.jsx`/`Navbar.jsx`/`SettingsPanel.jsx` (aucune refonte UI), aucune introduction de pan/focus/zoom local/rotation.

## 7. Fichiers livrés (7, `git status`/`git diff --stat`, pas de suivi de session)

| Fichier | Nature |
|---|---|
| `frontend/src/utils/geometry.js` | modifié — `clientToCanvas(event, canvasRect, zoom = 1)` |
| `frontend/src/hooks/useCircuitState.js` | modifié — 8 sites d'appel + dépendance `zoom` sur l'effet pointermove + centralisation Sidebar preview |
| `frontend/src/canvas/SimulationCanvas.jsx` | modifié — `handleDrop` centralisé sur `clientToCanvas` |
| `frontend/src/wires/WiresLayer.jsx` | modifié — insertion de waypoint centralisée sur `clientToCanvas` |
| `frontend/src/utils/__tests__/clientToCanvasZoom.test.js` | nouveau — 7 tests |
| `frontend/src/utils/__tests__/coordinateConversionSingleModelGuard.test.js` | nouveau — 5 tests |
| `frontend/src/__tests__/CoordinateZoomInteraction.integration.test.jsx` | nouveau — 12 tests |

`git diff --stat` : `4 files changed, 70 insertions(+), 28 deletions(-)` (fichiers de production) + 3 nouveaux fichiers de test.

## 8. Traçabilité Git

- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- HEAD avant implémentation : `b06d767b019286fd11d0203de2c3d07e2884fa46`
- Commit livré : **`128daf9a38e51bd05549aa8cce23e6b29212424f`** — `fix(canvas): make screen-to-document coordinate conversion zoom-aware`
- `git diff --check` sur le commit : exit 0.

## 9. Suite

Conformément à l'Authority (`docs/pmo/delivery-reports/MB-VIS-CANVAS-049-authority.md`) et à la Décision CSA post-implémentation : **STOP**. `MB-VIS-CANVAS-050 — Canvas Navigation` ne sera abordé qu'après une nouvelle séquence Blueprint → Ticket → CSA GO dédiée.
