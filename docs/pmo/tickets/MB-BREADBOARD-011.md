# MB-BREADBOARD-011 — Alignement réel Sidebar → trous Breadboard

## Statut
Implémentation expérimentale — branche `fix/MB-BREADBOARD-011-sidebar-hole-anchor`.

## Cause racine
Lors d'un drag HTML5 depuis la Sidebar, `SimulationCanvas.jsx` transforme le pointeur en position composant avec un décalage historique (`- GRID_SIZE * 2`, `- GRID_SIZE`). Cette position représente l'origine du composant, pas nécessairement une position dont les pins tombent sur les trous. `computeBreadboardPlacement()` ne cherchait qu'une fenêtre de ±1 pas autour du candidat et pouvait donc manquer le point valide situé sous le pointeur.

## Correction
`breadboardPlacementAdapter.js` élargit la recherche à `4 * BREADBOARD_PITCH` dans chaque axe. Chaque candidat reste validé exclusivement par `holeAt()` et la position valide la plus proche est retenue.

## Invariants
- aucune nouvelle topologie électrique ;
- `holeAt()` reste l'oracle unique ;
- `deriveBreadboardVirtualWires()` reste la source des connexions virtuelles ;
- `engineAdapter.js` ajoute déjà ces arêtes au moteur ;
- les composants sont toujours persistés via le CommandBus ;
- pas de commit directement sur `main`.

## Audit connexe
- `breadboardGeometry.js` : pas de snap utilisateur sur trou, seulement résolution d'un point déjà positionné ; `holeAt()` exige une tolérance de 2 px autour du pas de 12 px.
- `breadboardConnectivity.js` : les rails sont continus par `groupKey`; les strips haut/bas utilisent un groupKey par colonne, ce qui sépare les colonnes et la rainure.
- `CircuitComponent.jsx` : les pins sont rendues à `left=dx`, `top=dy` depuis la position composant.
- `engineAdapter.js` : les virtual wires breadboard sont effectivement ajoutés à l'entrée moteur.
- `normalizeComponent()` ne réapplique plus `snapToGrid()` aux positions persistées.

## Validation locale
`npm run test:ci` : 107/107 fichiers, 1200/1200 tests.
`npm run build` : OK.
