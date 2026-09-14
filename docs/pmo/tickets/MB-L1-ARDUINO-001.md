# MB-L1-ARDUINO-001 — ARDUINO — Tinkercad-like Canvas Readability

**Status:** IMPLEMENTED — REVISED PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `433071f2eb4f1ee400a7c42a40f905de204f7f93`
- Branch: `feat/MB-L1-ARDUINO-001-pin-visibility`

## Authority / cible Canvas révisée
Le Project Lead a rejeté la première proposition à quatre badges `D2/D3/GND/5V` : elle reste trop petite et ajoute une signalétique artificielle absente de la référence Tinkercad.

La référence visuelle approuvée le 2026-09-14 impose :
- Arduino UNO nettement plus grand sur le Canvas ;
- lecture naturelle des headers/trous/sérigraphies du PCB ;
- aucun badge, numéro, pastille ou label flottant ajouté par MYBlab ;
- même taille de carte en mode arrêt et en mode simulation ;
- cible de taille verrouillée pour cette correction : `1.30×` par rapport au rendu Canvas antérieur.

## Audit réel
- le raster actuel est `120×140` et ne possède qu'un état `default` dans son manifeste ;
- les quatre PhysicalContacts historiques `D2`, `D3`, `GND`, `5V` existent déjà ;
- le backend raster est `markerless`, donc les `<Pin>` fonctionnels restent invisibles ;
- la première correction ajoutait des badges artificiels : **rejetée au Canvas Gate**.

## Implémentation révisée
### `frontend/src/components/parts/ArduinoPart.jsx`
- suppression complète des badges/pastilles/labels artificiels ;
- raster UNO conservé comme unique source visuelle du PCB ;
- scale Canvas `1.30×`, centré, pour atteindre la taille de référence approuvée ;
- aucune modification de la simulation ou du Document.

### `frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx`
- verrouille l'absence de badges artificiels ;
- verrouille `data-canvas-scale="1.3"` / `scale(1.3)` ;
- préserve les quatre PhysicalContacts historiques ;
- préserve les coordonnées électriques historiques.

## Limite explicitement constatée
Le dépôt ne contient actuellement qu'un asset Arduino `default` : il n'existe pas encore deux assets raster distincts `OFF/unplugged` et `RUN/plugged`. La reproduction exacte de la référence câble débranché ↔ câble branché doit donc être un sous-ticket asset/runtime dédié ; elle ne doit pas être simulée par des badges ou par une fausse modification du Core.

## Interdits
- aucun nouveau pin Arduino dans ce ticket ;
- aucune modification du modèle électrique ;
- aucune modification de la simulation ;
- aucun badge artificiel sur le PCB ;
- aucun faux connecteur décoratif.

## Validation locale requise
Le connecteur GitHub applique les modifications mais n'exécute pas Vitest/Vite localement. Validation CTO requise : tests ciblés, lint, build, puis Canvas Gate.

## Canvas Gate révisé
PASS seulement si :
- la taille de l'Arduino correspond visuellement à la référence approuvée ;
- les headers, trous et sérigraphies deviennent naturellement lisibles ;
- aucun badge `D2/D3/GND/5V` n'apparaît ;
- drag, sélection et zoom restent acceptables ;
- aucune régression technique ciblée.

Le comportement exact OFF câble débranché / RUN câble branché reste explicitement ouvert tant que les deux assets physiques correspondants ne sont pas intégrés.

Voir `docs/pmo/blueprints/MB-L1-ARDUINO-001-pin-visibility-blueprint.md`.
