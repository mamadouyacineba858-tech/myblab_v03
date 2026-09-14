# MB-L1-ARDUINO-001 — ARDUINO — Exact Approved Canvas Reference

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `433071f2eb4f1ee400a7c42a40f905de204f7f93`
- Branch: `feat/MB-L1-ARDUINO-001-pin-visibility`

## Authority visuelle verrouillée
La référence fournie et approuvée par le Project Lead le 2026-09-14 devient l'autorité directe du rendu Arduino pour ce ticket. Il ne faut plus reconstruire approximativement le PCB, le câble ou la LED.

Exigences verrouillées :
- même taille Canvas validée (`2.20×`) ;
- même Arduino UNO visuel que la référence ;
- mêmes sérigraphies et proportions ;
- aucun badge flottant D2/D3/GND/5V ;
- ARRÊT = câble USB non inséré + LED ON éteinte ;
- MARCHE = câble USB inséré + LED ON verte ;
- même géométrie entre les deux états.

## Implémentation
### Assets de référence
- `frontend/public/assets/components/arduino/arduino.reference.off.webp`
- `frontend/public/assets/components/arduino/arduino.reference.run.webp`

Ces deux assets sont dérivés directement de la référence approuvée, avec fond rendu transparent pour l'intégration sur le Canvas MYBlab.

### `frontend/src/components/parts/ArduinoPart.jsx`
- choisit directement l'asset OFF ou RUN selon `simulationActive` ;
- ne reconstruit plus séparément le câble ;
- ne reconstruit plus séparément la LED ;
- n'utilise plus `arduino.default.*` ;
- n'utilise plus `arduino.approved.body.svg` pour le rendu actif ;
- conserve `scale(2.20)` ;
- overlays interactifs absents ; image `pointer-events:none`.

## Invariants
- Document inchangé ;
- Core Arduino inchangé ;
- PhysicalContacts inchangés ;
- simulation/runtime inchangés ;
- aucune nouvelle pin ;
- aucune persistance d'état visuel.

## Validation locale requise
Le connecteur GitHub a appliqué les fichiers et le code mais n'exécute pas Vitest/Vite localement.

Canvas PASS seulement si MYBlab reproduit visuellement la référence approuvée, sans retour vers l'ancien raster ou vers une reconstruction SVG approximative.
