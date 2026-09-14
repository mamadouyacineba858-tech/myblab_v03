# Blueprint — MB-L1-PROP-008 — POTENTIOMETER Dynamic Wiper Position Rendering

## Base

- Base SHA: `70f826188ed2b878524902fa456414a6cbf8b9e5`
- Branch: `feat/MB-L1-PROP-008-potentiometer-dynamic-position`

## Gap observé

Le modèle canonique expose déjà `parameters.position` dans `[0,1]`, mais le renderer raster affiche un repère blanc statique. La position électrique du curseur n'est donc pas observable physiquement sur le Canvas.

## Architecture

`component.parameters.position`
→ `PartRenderer` / `resolveComponentParameters()`
→ `PotentiometerPart({ parameters })`
→ `resolvePotentiometerVisualPosition(position)`
→ rotation du repère blanc.

Aucune seconde vérité persistante. Aucun changement du solver. `resistance` reste indépendante de l'angle.

## Contrat visuel V1

- débattement mécanique qualifié : 270° ;
- `position=0` → `-135°` ;
- `position=0.5` → `0°` ;
- `position=1` → `+135°` ;
- raster réaliste existant conservé ;
- aucune interaction rotative directe au pointeur dans ce ticket.

## Invariants

- pins `left/wiper/right` inchangés ;
- PhysicalContacts inchangés ;
- modèle DC inchangé ;
- assets inchangés ;
- drag/wire/breadboard/zoom inchangés.
