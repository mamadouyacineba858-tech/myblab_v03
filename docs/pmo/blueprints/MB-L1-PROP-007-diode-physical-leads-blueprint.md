# Blueprint — MB-L1-PROP-007 — DIODE Physical Lead Consolidation

## Base

- Base SHA: `5dfba63375200c6b05990c34a1946ea1e2c83d48`
- Branch: `feat/MB-L1-PROP-007-diode-physical-leads`

## Problem

La DIODE utilise déjà un raster réaliste avec bande cathode visible, mais les prolongements métalliques sont cuits dans l'image alors que CAPACITOR et THERMISTOR utilisent désormais `AssemblyLeadsLayer` pour faire coïncider visuel, pin et endpoint électrique.

## Décision CSA

- conserver le raster et la bande cathode ;
- n'exposer que la fenêtre centrale du boîtier axial ;
- ajouter un profil mécanique DIODE ;
- anode root `(24,15)` -> pin `(0,15)` ;
- cathode root `(60,15)` -> pin `(84,15)` ;
- style `metallic-wire` ;
- conserver `forwardVoltage` et `onResistance` comme paramètres de simulation uniquement ;
- ne créer aucun marquage dynamique artificiel.

## Invariants

- dimensions DIODE : `84×30` ;
- ids électriques : `anode`, `cathode` ;
- pins canoniques inchangés ;
- backend raster inchangé ;
- aucun changement solver/Core/History/Arduino/Wire/Breadboard.

## Canvas Gate

La DIODE doit montrer un corps axial central avec bande cathode conservée, relié à deux pattes métalliques brillantes et continues jusqu'aux endpoints. Drag, wire et zoom doivent rester inchangés.
