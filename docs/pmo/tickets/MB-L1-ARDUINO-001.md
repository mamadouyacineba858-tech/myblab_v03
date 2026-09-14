# MB-L1-ARDUINO-001 — ARDUINO — Tinkercad-like Canvas Readability

**Status:** IMPLEMENTED — REVISED PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `433071f2eb4f1ee400a7c42a40f905de204f7f93`
- Branch: `feat/MB-L1-ARDUINO-001-pin-visibility`

## Authority / cible Canvas révisée
Le Project Lead a rejeté la première proposition à quatre badges `D2/D3/GND/5V`, puis la taille `1.30×`, car les sérigraphies du PCB restaient trop petites.

La référence visuelle approuvée le 2026-09-14 impose désormais :
- Arduino UNO nettement agrandi sur le Canvas ;
- sérigraphies réelles du PCB naturellement lisibles ;
- aucun badge, numéro, pastille ou label flottant ajouté par MYBlab ;
- même taille et même géométrie de carte en ARRÊT et MARCHE ;
- ARRÊT : câble USB visuellement débranché, LED ON éteinte ;
- MARCHE : câble USB visuellement inséré, LED ON verte ;
- nouvelle cible de taille : `2.20×` par rapport au renderer canonique historique.

## Audit réel
- le raster actuel est `120×140`, avec variantes `1x` et `3x` ;
- le dépôt ne possède qu'un état raster `default` ;
- `simulationActive` existe déjà dans le contexte stable du circuit ;
- les quatre PhysicalContacts historiques `D2`, `D3`, `GND`, `5V` restent inchangés ;
- le backend raster est `markerless`.

## Implémentation révisée
### `frontend/src/components/parts/ArduinoPart.jsx`
- suppression maintenue de tous les badges artificiels ;
- raster UNO existant conservé comme corps physique ;
- scale Canvas porté à `2.20×` pour rendre la sérigraphie lisible ;
- lecture présentation-only de `simulationActive` via `CircuitContext` ;
- overlay USB non interactif :
  - `disconnected` en ARRÊT ;
  - `connected` en MARCHE ;
- LED ON de présentation :
  - éteinte en ARRÊT ;
  - verte/lumineuse en MARCHE ;
- aucune mutation du Document, aucune modification du modèle électrique.

### `frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx`
- absence de badges artificiels ;
- scale `2.20×` verrouillé ;
- mode ARRÊT : USB débranché + LED off ;
- mode MARCHE : USB branché + LED on ;
- PhysicalContacts historiques préservés ;
- coordonnées électriques historiques préservées.

## Invariants / interdits
- aucun nouveau pin Arduino dans ce ticket ;
- aucune modification du modèle électrique ;
- aucun changement de firmware/runtime/scheduler ;
- aucune persistance du mode visuel ;
- aucun badge artificiel autour de la carte ;
- overlays USB/LED avec `pointer-events:none` ;
- taille de carte identique entre ARRÊT et MARCHE.

## Validation locale requise
Le connecteur GitHub applique les modifications mais n'exécute pas Vitest/Vite localement. Validation CTO requise : tests ciblés, lint, build, puis Canvas Gate.

## Canvas Gate révisé
PASS seulement si :
- les écritures essentielles du PCB sont lisibles au niveau de zoom de travail normal ;
- la taille correspond à la référence approuvée ;
- ARRÊT montre le câble débranché et la LED ON éteinte ;
- MARCHE montre le câble inséré et la LED ON verte ;
- aucun badge `D2/D3/GND/5V` n'apparaît ;
- drag, sélection et zoom restent acceptables ;
- aucune régression technique ciblée.

Voir `docs/pmo/blueprints/MB-L1-ARDUINO-001-pin-visibility-blueprint.md`.
