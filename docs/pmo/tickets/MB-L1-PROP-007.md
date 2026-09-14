# MB-L1-PROP-007 — DIODE Physical Lead Consolidation

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base

- Base SHA: `5dfba63375200c6b05990c34a1946ea1e2c83d48`
- Branch: `feat/MB-L1-PROP-007-diode-physical-leads`

## Scope

1. Conserver le corps raster DIODE existant et sa bande cathode.
2. Masquer visuellement les prolongements métalliques cuits hors du corps central.
3. Ajouter `DIODE` à `assemblyProfiles.js` avec pattes `metallic-wire`.
4. Conserver strictement anode `(0,15)` et cathode `(84,15)`.
5. Ne pas projeter `forwardVoltage` ou `onResistance` dans l'apparence.
6. Aucun changement du modèle DC.

## Acceptance

- corps axial centré et bande cathode visible ;
- pattes métalliques brillantes vers les deux endpoints ;
- aucune double patte visuelle évidente ;
- drag / wire / zoom inchangés ;
- paramètres DC inchangés ;
- Canvas final réservé au CTO.

Voir `docs/pmo/blueprints/MB-L1-PROP-007-diode-physical-leads-blueprint.md`.
