# MB-L1-ARDUINO-001 — ARDUINO — Tinkercad-like Canvas Readability

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
- Base SHA: `433071f2eb4f1ee400a7c42a40f905de204f7f93`
- Branch: `feat/MB-L1-ARDUINO-001-pin-visibility`

## Authority visuelle verrouillée
La référence approuvée par le Project Lead le 2026-09-14 impose :
- taille Canvas `2.20×` ;
- Arduino UNO immédiatement lisible ;
- aucun badge flottant `D2/D3/GND/5V` ;
- ARRÊT = câble USB visuellement débranché + LED ON éteinte ;
- MARCHE = câble USB visuellement inséré + LED ON verte ;
- même géométrie et même taille de carte dans les deux modes.

## Historique des corrections Canvas
1. badges artificiels autour des pins : rejetés ;
2. taille `1.30×` : rejetée car trop petite ;
3. taille `2.20×` : validée ;
4. tentative de remplacement complet par assets de référence : régression, Arduino invisible sur le Canvas ;
5. mécanisme visible historique restauré : carte + câble + LED de nouveau visibles ;
6. correction actuelle : amélioration de netteté uniquement, sans toucher au mécanisme validé.

## Implémentation actuelle
### `frontend/src/components/parts/ArduinoPart.jsx`
- mécanisme Canvas visible conservé ;
- `scale(2.20)` inchangé ;
- câble OFF/RUN inchangé ;
- LED ON OFF/RUN inchangée ;
- aucun badge artificiel ;
- backend raster historique conservé ;
- les candidats réellement rendus utilisent exclusivement les variantes `3x` :
  - `arduino.default.3x.webp` ;
  - `arduino.default.3x.png` ;
- les variantes `1x` ne sont plus proposées au navigateur comme source de rendu ;
- `pointer-events:none` sur l'image.

### But du correctif 3x-only
À `2.20×`, laisser le navigateur choisir une variante `1x` peut provoquer un agrandissement destructif de la sérigraphie. Le renderer force donc la source 3x (`360×420`) tout en conservant exactement la même géométrie Canvas et les mêmes états visuels.

## Invariants
- Document inchangé ;
- Core Arduino inchangé ;
- PhysicalContacts inchangés ;
- firmware/runtime/scheduler inchangés ;
- aucune nouvelle pin ;
- aucune persistance d'état visuel ;
- aucune modification de la taille validée ;
- aucune modification du mécanisme câble/LED validé.

## Validation locale requise
Le connecteur GitHub applique les modifications mais n'exécute pas Vitest/Vite localement.

Le Canvas Gate reste ouvert jusqu'à validation de la netteté des inscriptions avec la source 3x forcée.
