# MB-L1-PROP-006 — Thermistor realistic shared silhouette & dynamic nominal marking

**Status:** CLOSED — PROJECT CANVAS PASS

## Base

- Base SHA: `155f52f60d522ea5bef3aae96801cb9e0107a417`
- Branch: `feat/MB-L1-PROP-006-thermistor-dynamic-marking`

## Scope

1. `parameters.resistance` pilote le marquage nominal THERMISTOR.
2. Silhouette physique identique au CAPACITOR V2, rendue noire.
3. Pattes `metallic-wire` réutilisées.
4. PhysicalContacts et racines mécaniques inchangés.
5. Aucun comportement température → résistance.

## Acceptance

- Default 10 kΩ → `103`.
- 1 kΩ → `102`.
- 47 kΩ → `473`.
- 100 kΩ → `104`.
- 470 kΩ → `474`.
- 12 345 Ω → corps neutre, aucune fausse inscription.
- Drag / wire / breadboard / zoom inchangés.
- Project Canvas Gate : PASS, validé par le CTO Dr. Mamadou Yacine Ba.

Voir `docs/pmo/blueprints/MB-L1-PROP-006-thermistor-dynamic-marking-blueprint.md`.
