# MB-L1-PROP-008 — POTENTIOMETER Dynamic Wiper Position Rendering

**Status:** CLOSED — PROJECT CANVAS PASS

## Base

- Base SHA: `70f826188ed2b878524902fa456414a6cbf8b9e5`
- Branch: `feat/MB-L1-PROP-008-potentiometer-dynamic-position`

## Scope

1. `parameters.position` pilote le repère blanc du bouton rotatif.
2. Débattement visuel : 270° (`-135° .. +135°`).
3. `resistance` ne pilote pas l'angle.
4. Asset raster existant conservé.
5. Aucun changement solver / pins / contacts / assembly.
6. Aucune interaction directe de rotation au pointeur dans ce ticket.

## Acceptance

- `0.00` → butée gauche.
- `0.25` → quart.
- `0.50` → centre.
- `0.75` → trois-quarts.
- `1.00` → butée droite.
- modification de `resistance` seule : angle inchangé.
- drag / wire / breadboard / zoom inchangés.

## Project Canvas Gate

- CTO validation: **PASS**.
- Observation CTO: le comportement dynamique du repère blanc fonctionne correctement sur le Canvas.
- Décision CSA: ticket fermé après qualification visuelle utilisateur.

Voir `docs/pmo/blueprints/MB-L1-PROP-008-potentiometer-dynamic-position-blueprint.md`.
