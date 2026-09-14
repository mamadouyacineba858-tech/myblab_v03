# MB-L1-PROP-010 — POLARIZED CAPACITOR — Dynamic Capacitance Marking

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `eb24fe68b2d6ae412327b712c6462d691230b86a`
- Branch: `feat/MB-L1-PROP-010-polarized-capacitor-dynamic-marking`

## Objectif
Faire refléter la valeur persistante `parameters.capacitance` de l'Inspector dans le marquage visible du condensateur électrolytique polarisé.

## Conservé
- type `POLARIZED_CAPACITOR` ;
- pins `plus` / `minus` ;
- polarité et bande négative ;
- modèle DC existant ;
- PhysicalContacts ;
- AssemblyLeadsLayer ;
- asset réaliste bleu ;
- tension nominale visuelle fixe `25V`.

## Implémentation
1. `frontend/src/visualization/polarizedCapacitorMarking.js`
   - formatter pur de capacitance ;
   - unités F / µF / nF / pF ;
   - aucune mutation du Document ;
   - aucune valeur inventée pour entrée invalide/non représentable.

2. `frontend/src/components/parts/PolarizedCapacitorPart.jsx`
   - reçoit `parameters` déjà résolus par `PartRenderer` ;
   - masque visuellement la zone du marquage historique cuit dans le raster ;
   - affiche la capacitance dynamique ;
   - réaffiche `25V` comme caractéristique visuelle fixe ;
   - ne couvre ni la bande négative ni les pattes ;
   - aucune branche type-spécifique dans `PartRenderer`/`CircuitComponent`.

3. Tests ajoutés
   - `frontend/src/visualization/__tests__/polarizedCapacitorMarking.test.js` ;
   - `frontend/src/components/parts/__tests__/PolarizedCapacitorDynamicMarking.test.jsx`.

## Exemples verrouillés
- 100 µF → `100µF`
- 47 µF → `47µF`
- 10 µF → `10µF`
- 1 µF → `1µF`

## Interdits respectés
- aucun `voltageRating` ajouté ;
- modèle DC inchangé ;
- pins inchangées ;
- polarité inchangée ;
- contacts inchangés.

## Validation technique locale requise
Le connecteur GitHub a réalisé l'implémentation mais n'exécute pas Vite/Vitest localement. À valider dans VS Code : tests ciblés, tests raster historiques, lint ciblé, build, puis Canvas Gate.

## Canvas Gate
PASS seulement si :
- la modification de `capacitance` dans l'Inspector met immédiatement à jour le marquage ;
- `25V` reste fixe ;
- la bande négative reste clairement visible ;
- aucun ancien `100µF` parasite n'est lisible ;
- drag / zoom / sélection / câblage restent inchangés.

Voir `docs/pmo/blueprints/MB-L1-PROP-010-polarized-capacitor-dynamic-marking-blueprint.md`.
