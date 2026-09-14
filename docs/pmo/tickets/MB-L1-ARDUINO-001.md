# MB-L1-ARDUINO-001 — ARDUINO — Pin Visibility & Physical Connectivity

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `433071f2eb4f1ee400a7c42a40f905de204f7f93`
- Branch: `feat/MB-L1-ARDUINO-001-pin-visibility`

## Objectif
Rendre les quatre pins Arduino actuellement fonctionnelles (`D2`, `D3`, `GND`, `5V`) immédiatement visibles et identifiables à l'œil sur le Canvas, tout en conservant leur connectivité réelle et leur géométrie existante.

## Audit réel
- le raster Arduino UNO est réaliste ;
- les quatre PhysicalContacts existent déjà ;
- les quatre hit targets de câblage existent déjà ;
- leur présentation est masquée par le mode `markerless` du backend raster ;
- la sérigraphie du raster est trop petite à l'échelle de travail normale.

## Implémentation
### `frontend/src/components/parts/ArduinoPart.jsx`
- ajout d'une couche de visibilité non interactive ;
- quatre marqueurs visibles : `D2`, `D3`, `GND`, `5V` ;
- positions strictement alignées sur les PhysicalContacts existants :
  - D2 = `(3,50)` ;
  - D3 = `(15,75)` ;
  - GND = `(15,108)` ;
  - 5V = `(115,50)` ;
- labels fortement contrastés ;
- `pointer-events:none` : aucun nouveau hit target ;
- aucune modification du raster source.

### Tests
`frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx`
- présence des quatre marqueurs ;
- labels visibles ;
- convergence exacte marqueur ↔ PhysicalContact ;
- convergence exacte marqueur ↔ hit target réel ;
- géométrie électrique canonique inchangée.

## Interdits respectés
- aucun nouveau pin Arduino ;
- aucune modification de `D2/D3/GND/5V` côté Core ;
- aucune modification de la simulation ;
- aucune modification de `CircuitComponent.jsx` ;
- aucune modification de `Pin.jsx` ;
- aucune modification de `pinPresentationGeometry.js` ;
- aucun faux connecteur ou endpoint décoratif.

## Validation locale requise
Le connecteur GitHub a appliqué les modifications mais n'exécute pas Vitest/Vite localement. Validation CTO requise : tests ciblés, lint, build, puis Canvas Gate.

## Canvas Gate
PASS seulement si :
- D2, D3, GND et 5V sont lisibles sans devoir zoomer fortement ;
- chaque repère visible correspond au vrai point où le fil s'accroche ;
- aucun marqueur ne masque de manière gênante la carte ;
- OFF et RUN gardent la même géométrie de pins ;
- drag, sélection, zoom et câblage restent normaux.

Voir `docs/pmo/blueprints/MB-L1-ARDUINO-001-pin-visibility-blueprint.md`.
