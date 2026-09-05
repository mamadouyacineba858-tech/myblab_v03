# MB-VIS-CANVAS-050 — Delivery Report
## Canvas Navigation

Statut : **Implémentation livrée sous autorisation CSA « mode direct » — commit + push directs déjà exécutés sous cette même autorisation.**

---

## 1. Rappel du mandat

Après MB-VIS-CANVAS-049 (conversion écran→Document fiable à zoom non unitaire), le Canvas ne fournissait toujours qu'un zoom global borné, sans navigation de viewport complète : pas de pan, pas de zoom orienté curseur, pas de reset déterministe, pas d'ajustement automatique au contenu ou à la sélection. Le Blueprint (`docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md`) a tranché la Décision CSA : un unique modèle de viewport `{ zoom, translateX, translateY }` (translation en espace ÉCRAN, indépendante du zoom courant), une relation canonique `screen = viewportTranslation + document * zoom`, et `clientToCanvas()` étendue — jamais remplacée par une seconde fonction — pour rester l'oracle unique screen↔Document.

Périmètre inclus (Ticket §C) : pan, zoom global fiable, zoom orienté curseur, reset viewport, fit-to-content, fit-to-selection, primitive générique de centrage/focus réutilisable par un futur ticket, adaptation des interactions existantes (drag/marquee/waypoint/Breadboard/Sidebar) aux combinaisons pan+zoom, tests, preuve navigateur. Périmètre exclu, non touché : focus/zoom local de composant, rotation/miroir, Inspector, Component Library 2.0, Toolbar 2.0, isolation/performance React (réservée à MB-VIS-CANVAS-051), géométrie électrique canonique, connectivité/solveur, nouveau backend de rendu, régénération/agrandissement d'assets, historique métier de viewport.

## 2. Architecture livrée

### 2.1 Modèle de viewport unique — `useCircuitState.js`

L'ancien état isolé `const [zoom, setZoom] = useState(1)` est remplacé par `const [viewport, setViewport] = useState(createDefaultViewport)`, où `viewport = { zoom, translateX, translateY }` est la SEULE source de vérité de navigation (contrainte CSA #4). `zoom` reste exposé dans le contexte comme alias dérivé (`zoom: viewport.zoom`) pour compatibilité stricte avec tout consommateur/test hérité de 049 — jamais un second état indépendant. Une référence synchrone `viewportRef` (même patron que `componentsRef`/`wiresRef`/`breadboardRef`, MB-004.5) est lue par le gros `useEffect` pointermove/up/cancel/blur, afin que ce dernier n'ait PAS besoin de `viewport` dans son tableau de dépendances — indispensable car `viewport` change en continu à chaque pixel pendant un pan actif, ce qui aurait désabonné/réabonné les listeners `window` à chaque `pointermove` (coût de fluidité, cf. Ticket §Performances).

### 2.2 `frontend/src/utils/viewport.js` (nouveau) — mathématiques pures du viewport

- `createDefaultViewport()` / `DEFAULT_VIEWPORT` / `clampZoom()` (bornes `ZOOM_MIN=0.5`/`ZOOM_MAX=2`, identiques à 049, jamais de zoom infini/NaN — D10).
- `zoomViewportAtScreenPoint(viewport, screenX, screenY, nextZoomRaw)` (D4) — délègue à `clientToCanvas()` (`utils/geometry.js`) pour calculer le point Document sous le curseur AVANT de recomputer `translateX/Y`, afin qu'aucune seconde formule screen→Document ne coexiste avec l'oracle unique.
- `panViewport()` (D1/D5), `centerOnRect()`/`centerOnPoint()` (D9, primitive générique réutilisable par un futur focus composant — non implémentée ici), `fitViewportToBounds()` (D7/D8, no-op sûr — `null` — si bounds ou taille de viewport écran sont invalides).

### 2.3 `frontend/src/utils/sceneBounds.js` (nouveau) — bounds Document de la scène

`computeSceneBounds(components, wires, breadboard)`, purement géométrique, alimente `fitToContent`/`fitToSelection`. Réutilise EXACTEMENT les mêmes approximations déjà en production dans `endMarquee()` (`comp.width || 80`/`comp.height || 40` ; même formule de bbox breadboard, mêmes constantes `breadboardGeometry.js`) — aucune géométrie nouvelle inventée, aucune modification de `endMarquee()` lui-même.

### 2.4 `clientToCanvas()` étendu, jamais remplacé — `frontend/src/utils/geometry.js`

Signature `clientToCanvas(event, canvasRect, zoom = 1, translateX = 0, translateY = 0)` — deux nouveaux paramètres optionnels, défauts `0`, comportement 049 strictement inchangé pour tout appel à 3 arguments. Relation : `x = (event.clientX - canvasRect.left - translateX) / zoom`. Les 8 sites d'appel de 049 (`useCircuitState.js`, `WiresLayer.jsx`, `SimulationCanvas.jsx`) passent désormais `viewport.translateX/translateY` en plus de `viewport.zoom` — aucun n'a été dupliqué, tous délèguent à cette même fonction (garde-fou `coordinateConversionSingleModelGuard.test.js`, non modifié, toujours vert).

### 2.5 Pan — geste dédié clic MOLETTE (`e.button === 1`)

`SimulationCanvas.jsx::handleCanvasPointerDown` route tout `pointerdown` à `button === 1` vers `startPan(e)`, n'importe où sur le Canvas (composants inclus, comme Figma/Blender), sans jamais concurrencer le marquee (clic gauche). `startPan` (`useCircuitState.js`) applique la garde I-M1 (rejet si `dragSessionRef`/`marqueeSessionRef`/`waypointDragSessionRef`/`pendingPin` actif) et enregistre `{ pointerStart, translateStart }` dans `panSessionRef` (ref, même patron que les autres sessions). Le gros effect pointermove calcule `translateX/Y = translateStart + deltaÉcran` — jamais divisé par zoom (D1) — et pointerup se contente de nettoyer la session : `viewport` EST déjà l'état final, aucun commit/rollback séparé, donc aucune entrée Undo/Redo (contrainte #8). `startDrag`/`startMarquee`/`startBreadboardDrag`/`startWaypointDrag`/`onPinClick` ont chacun reçu la garde symétrique (`panSessionRef.current !== null → return`).

### 2.6 Zoom orienté curseur — molette (listener natif non-passif)

`zoomAtScreenPoint(screenX, screenY, nextZoom)` (absolu) et `zoomByFactorAtScreenPoint(screenX, screenY, factor)` (relatif, résout `nextZoom = viewport.zoom * factor` À L'INTÉRIEUR du updater `setViewport`, donc toujours contre la valeur la plus fraîche). `SimulationCanvas.jsx` attache un `addEventListener('wheel', ..., { passive: false })` **natif** sur `canvasRef.current` via un `useEffect` dédié — **pas** `onWheel` JSX. Ce choix est corrigé après une découverte empirique en cours de développement (§5, Déviation) : React attache son délégué `wheel` en mode passif, rendant `e.preventDefault()` inopérant et provoquant l'avertissement navigateur *« Unable to preventDefault inside passive event listener invocation »* à chaque molette. `zoomIn`/`zoomOut` (boutons Navbar) restent des pas fixes de 0.1 bornés [0.5,2] — comportement 049 préservé bit-à-bit — mais ancrent désormais le zoom au centre du Canvas (`getBoundingClientRect()`) plutôt qu'implicitement en (0,0).

### 2.7 Reset, fit-to-content, fit-to-selection, primitive de centrage

`resetViewport()` → `createDefaultViewport()` (D6). `fitToContent()`/`fitToSelection()` calculent les bounds Document (via `computeSceneBounds`, sur `componentsRef`/`wiresRef`/`breadboardRef` — jamais une géométrie déjà transformée par le viewport, condition de refus explicite du Ticket) puis `fitViewportToBounds()` ; les deux sont des no-op sûrs (aucun `setViewport`) si le canvas n'est pas mesurable, si la scène est vide, ou — pour `fitToSelection` — si la sélection ne contient aucun composant/wire exploitable (D8). `centerViewportOnRect`/`centerViewportOnPoint` exposent la primitive générique D9 (non consommée par un focus composant dans ce ticket — hors périmètre explicite).

### 2.8 CSS — un seul point d'application (D2)

`SimulationCanvas.jsx` : `transform: translate(${translateX}px, ${translateY}px) scale(${zoom})` sur `.simulation-canvas__zoom-layer` — remplace l'ancien `scale(${zoom})` seul. `transform-origin: 0 0` (CSS, inchangé) garantit que la composition CSS réalise exactement `screen = translation + document * zoom` (les fonctions CSS s'appliquent de l'interne vers l'externe : `scale` d'abord, `translate` ensuite). Aucun composant/fil/breadboard enfant ne reçoit sa propre transformation indépendante (contrainte #5/#7).

### 2.9 Navbar — affordances utilisateur

Trois nouveaux boutons (`Navbar.jsx`) : « Réinitialiser la vue », « Ajuster au contenu », « Ajuster à la sélection ». Le pan lui-même n'a pas de bouton dédié (geste direct sur le Canvas, molette).

### 2.10 Ce qui n'a pas changé (invariants)

- `component.x/y`, pins, wires, breadboard, simulation/connectivité : jamais mutés pour compenser le viewport (contraintes #1/#3).
- Aucun `PartRenderer`/`CircuitComponent.jsx`/`Pin.jsx` ne lit `zoom`/`translateX`/`translateY` (contrainte #5).
- Snapping, sélection, `dragPreview`/`breadboardFeedback`/`waypointPreview`, sémantique d'historique (I-H10) : strictement inchangés dans leur forme.
- Aucune entrée `HistoryManager`/Undo-Redo créée par pan/zoom/reset/fit/centrage (contrainte #8, vérifié par test).
- Aucun travail sur MB-VIS-CANVAS-051/052 (contrainte #9) ; aucun asset réaliste modifié/régénéré/agrandi (contrainte #10).

## 3. Déviation disclosed (corrigée avant livraison)

**`onWheel` React est un listener passif** : la première implémentation utilisait `onWheel={handleWheel}` (JSX), avec `e.preventDefault()` à l'intérieur. Une preuve navigateur en cours de développement (Chromium réel, pas jsdom) a révélé l'avertissement console *« Unable to preventDefault inside passive event listener invocation »* à chaque molette — un défaut réel (le `preventDefault()` échoue silencieusement), pas un artefact HMR. Corrigé en remplaçant `onWheel` par un `useEffect` posant `canvasRef.current.addEventListener('wheel', handleWheel, { passive: false })` au montage, avec nettoyage au démontage — `zoomByFactorAtScreenPoint` (stable, deps `[]`) a été introduite spécifiquement pour que cet effect n'ait pas besoin de dépendre de `viewport.zoom` (donc ne se réattache jamais). Reconfirmé sur session fraîche : console propre, zoom fonctionnel, aucune régression (voir §5 et §6).

## 4. Tests ajoutés — 56 tests neufs

- **`frontend/src/utils/__tests__/viewportModel.test.js`** (nouveau, 17 tests) — unitaires purs sur `utils/viewport.js` : `clampZoom`, invariant du zoom orienté curseur (point Document sous le curseur préservé, y compris depuis un viewport déjà pan+zoomé), bornes D10, `panViewport` (delta écran indépendant du zoom), `centerOnRect`/`centerOnPoint`, `fitViewportToBounds` (zoom calculé + centré, borné aux deux extrémités, `null` pour bounds/viewport invalides).
- **`frontend/src/utils/__tests__/sceneBounds.test.js`** (nouveau, 8 tests) — `computeSceneBounds` : scène vide, un/plusieurs composants, waypoints de fils, breadboard seul, combinaison, coordonnées non finies ignorées.
- **`frontend/src/utils/__tests__/clientToCanvasZoom.test.js`** (+5 tests, 12 au total) — `clientToCanvas()` avec `translateX`/`translateY` : défauts rétrocompatibles, translation pure, pan+zoom combinés (ordre soustraction-avant-division vérifié sans ambiguïté), translation négative, défense NaN/undefined/Infinity.
- **`frontend/src/__tests__/ViewportNavigation.integration.test.jsx`** (nouveau, 19 tests, pipeline réel `CircuitProvider`/`useCircuit`) — pan horizontal/vertical/indépendant-du-zoom/sans-mutation-Document/sans-entrée-Undo, `pointercancel` pendant un pan, zoom orienté curseur (invariant du point visé) et ses bornes, `zoomByFactorAtScreenPoint` (facteur appliqué au zoom courant, bornes), `zoomIn`/`zoomOut` non-régression, reset déterministe, fit-to-content (scène vide → no-op, scène non vide → viewport recalculé, aucune mutation/Undo), fit-to-selection (aucune sélection → no-op, sélection non vide → cadrage restreint), primitive de centrage, garde I-M1 dans les deux sens (pan bloque un drag actif et réciproquement).
- **`frontend/src/__tests__/CoordinateZoomInteraction.integration.test.jsx`** (+7 tests, 19 au total) — 049 non-régression intégrale (12/12 toujours verts) + nouveau describe « pan + zoom combinés » : drag composant après pan pur puis après pan+zoom combinés, marquee après pan+zoom, drag de waypoint après pan+zoom, drag de Breadboard après pan+zoom, Sidebar drag/preview après pan+zoom, pan+zoom+reset+fit ne créent aucune entrée Undo/Redo.

## 5. Résultats

- **Tests ciblés viewport/navigation** (7 fichiers ci-dessus + `coordinateConversionSingleModelGuard.test.js`, non modifié) : **102/102 verts**, puis **109/109** après l'ajout de `zoomByFactorAtScreenPoint`.
- **Non-régression 049** : `CoordinateZoomInteraction.integration.test.jsx` (12 tests historiques), `clientToCanvasZoom.test.js` (7 tests historiques) et `coordinateConversionSingleModelGuard.test.js` (5 tests) tous verts sans modification de leur contenu original.
- **Suite complète** (`npx vitest run --config src/simulator/vitest.config.ts`) : **1884/1903 verts (19 échecs / 11 fichiers)** — exactement la même baseline pré-existante que celle documentée par MB-VIS-CANVAS-049 (géométrie breadboard/LED héritée, sans rapport avec ce ticket ; 1903 = 1847 baseline post-049 + 56 tests neufs de ce ticket). Confirmé identique avant/après par exécution différentielle (`git stash` ciblé des 5 fichiers source de production, suite ré-exécutée sur les 11 fichiers concernés : mêmes 19 échecs exacts, mêmes messages). **0 régression nouvelle.**
- **`tsc --noEmit`** : exit 0.
- **`npm run build`** (`tsc -b && vite build`) : vert, `built in <1s`, aucun warning.
- **`git diff --check`** : exit 0 (avertissements LF/CRLF de fin de ligne uniquement, non bloquants).

## 6. Preuve navigateur (Chromium réel, dev server réel, session fraîche — pas jsdom)

Circuit : une LED et une RÉSISTANCE, positions initiales distinctes.

| Scénario | Détail | Résultat observé |
|---|---|---|
| Zoom orienté curseur | Molette (5 crans) centrée sur la LED (zoom 1 → 1.21) | Centre réel (`getBoundingClientRect`) de la LED : `(474.0000, 283.2000)` avant → `(474.0000, 283.2200)` après — dérive **< 0,03 px**, aucune (D4 respecté) |
| Pan | Pan écran (Δ=-120,-80 px) après le zoom ci-dessus | `translate(-36.4px,-33.3px) scale(1.21)` → `translate(-156.4px,-113.3px) scale(1.21)` — delta EXACT au pixel écran près, zoom inchangé (D1) |
| Reset | `resetViewport()` (bouton Navbar) depuis un état pan+zoom quelconque | `translate(0px, 0px) scale(1)` — exact, à chaque fois (D6) |
| Fit-to-content | Scène = LED + Résistance écartées | Les deux composants recadrés avec marge visible, zoom recalculé automatiquement |
| Fit-to-sélection | LED seule sélectionnée puis « Ajuster à la sélection » | Cadrage étroit sur la LED uniquement, Résistance hors-champ — bien plus zoomé que fit-to-content |
| Drag après pan+zoom | Drag de la LED (zoom=1.21, viewport déjà pan+zoomé) | `left: 200px → 280px` (delta écran réel 160px / zoom 2 lors d'un second essai à zoom=2 ; delta correctement divisé par le zoom courant dans tous les cas) |
| Marquee après pan+zoom | Marquee tracé après un pan + zoom=2 combinés | LED et Résistance toutes deux sélectionnées (contours verts confirmés) |
| Console | `read_console_messages` avant/pendant/après chaque scénario ci-dessus, sur une session fraîche (`navigate` complet, pas de patch HMR) | **Propre du début à la fin** — 0 erreur, 0 avertissement lié au Ticket (confirmé après correction de la déviation §3 ; l'avertissement `preventDefault` observé PENDANT le développement n'apparaît plus) |

## 7. Non-régression du scope out (vérifié)

Aucune modification de : `componentDefinitions.js`, `canonicalRegistry.js`, géométrie électrique canonique, `Breadboard.jsx`/`breadboardGeometry.js`/`breadboardConnectivity.js`/`breadboardPlacementAdapter.js` (logique), le solveur, les `PartRenderer`/`CircuitComponent.jsx`/`Pin.jsx`, `Sidebar.jsx`/`SettingsPanel.jsx`. Aucune introduction de focus/zoom local de composant, rotation/miroir, nouveau backend de rendu, ou historique métier de viewport.

## 8. Fichiers livrés

| Fichier | Nature |
|---|---|
| `frontend/src/utils/geometry.js` | modifié — `clientToCanvas` étendu (`translateX`/`translateY`) |
| `frontend/src/utils/viewport.js` | **nouveau** — modèle pur de viewport (zoom/pan/reset/fit/centrage) |
| `frontend/src/utils/sceneBounds.js` | **nouveau** — bounds Document de la scène |
| `frontend/src/hooks/useCircuitState.js` | modifié — état `viewport` unique, pan, zoom orienté curseur, reset, fit, centrage |
| `frontend/src/canvas/SimulationCanvas.jsx` | modifié — pan (clic molette), molette native non-passive, CSS `translate+scale` |
| `frontend/src/components/Navbar.jsx` | modifié — boutons Reset/Fit-to-content/Fit-to-selection |
| `frontend/src/wires/WiresLayer.jsx` | modifié — `clientToCanvas` avec translation |
| `frontend/src/utils/__tests__/viewportModel.test.js` | **nouveau** — 17 tests |
| `frontend/src/utils/__tests__/sceneBounds.test.js` | **nouveau** — 8 tests |
| `frontend/src/utils/__tests__/clientToCanvasZoom.test.js` | modifié — +5 tests |
| `frontend/src/__tests__/ViewportNavigation.integration.test.jsx` | **nouveau** — 19 tests |
| `frontend/src/__tests__/CoordinateZoomInteraction.integration.test.jsx` | modifié — +7 tests |

`.claude/launch.json` (config locale de preview du dev server, utilisée pour la preuve navigateur) reste hors périmètre de ce commit, comme `.claude/` dans son ensemble (répertoire non suivi).

`git diff --stat` (fichiers de production) : `5 files changed, 356 insertions(+), 40 deletions(-)`.

## 9. Traçabilité Git

- Branche : `feat/MB-VIS-LED-V16-leads-thicker-realistic`
- HEAD avant implémentation : `5f18cf723ad2702958176a5c044bb0bdab8d40e8` (« docs(pmo): issue MB-VIS-CANVAS-050 CSA implementation authority »)
- Commit d'implémentation : **`ace676d`** (poussé, fast-forward `5f18cf7..ace676d`) — `feat(canvas): add viewport navigation (pan, cursor zoom, reset, fit)`
- `git diff --check` sur le commit : exit 0.

## 10. Suite

Conformément à l'Authority (`docs/pmo/delivery-reports/MB-VIS-CANVAS-050-authority.md`) : **STOP**. Aucun travail sur MB-VIS-CANVAS-051 ou MB-VIS-CANVAS-052, aucun nouveau Blueprint/Ticket produit. Le CSA effectue la validation finale et la clôture PMO.
