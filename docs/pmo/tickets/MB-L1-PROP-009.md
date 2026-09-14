# MB-L1-PROP-009 — DC MOTOR — Physical Electrical Terminal Presentation

**Status:** CLOSED — PROJECT CANVAS PASS

## Base

- Base SHA: `422f2ebc43f754cce1f085117ba5897841505ba4`
- Branch: `feat/MB-L1-PROP-009-dc-motor-physical-terminals`

## Objectif

Corriger la correspondance entre les deux bornes électriques `plus` / `minus` et deux cosses physiques réellement visibles du moteur DC.

## À conserver

- type `DC_MOTOR` ;
- pins `plus` / `minus` ;
- paramètre `resistance` ;
- modèle DC existant ;
- dimensions 84×50 ;
- arbre mécanique réaliste ;
- architecture générique des `PhysicalContacts`.

## Implémentation réalisée

1. Asset physique
   - le raster historique du moteur reste la source du corps, du carter et de l'arbre ;
   - l'ancienne cosse unique cuite côté arrière est masquée par un crop de 15 px ;
   - `frontend/public/assets/components/dc-motor/dc-motor.terminals.svg` ajoute deux cosses métalliques distinctes côté arrière ;
   - les trous de connexion sont centrés en `(3.5,16)` et `(3.5,34)` ;
   - l'arbre reste à droite et n'est associé à aucun contact électrique.

2. `manifest.json`
   - version 4.1.0 ;
   - géométrie canonique inchangée : `plus(0,25)` / `minus(84,25)` ;
   - section `presentation.contacts` ajoutée pour les deux cosses ;
   - `mechanicalShaft.connectable = false` ;
   - overlay déclaré comme asset de présentation.

3. `componentDefinitions.js`
   - coordonnées électriques canoniques inchangées ;
   - `plus` reçoit un `PhysicalContact` en `(3.5,16)` ;
   - `minus` reçoit un `PhysicalContact` en `(3.5,34)` ;
   - `wireConnectable = true` ;
   - `breadboardInsertable = false` ;
   - aucune branche `DC_MOTOR` ajoutée dans `pinPresentationGeometry.js` ou `CircuitComponent.jsx`.

4. Tests
   - test raster mis à jour pour verrouiller le corps + overlay ;
   - verrouillage des deux contacts distincts ;
   - verrouillage des hit targets aux positions physiques ;
   - verrouillage de l'absence de contact sur l'ancien endpoint droit / arbre ;
   - verrouillage de la géométrie électrique canonique inchangée ;
   - verrouillage de l'architecture générique sans branche `DC_MOTOR` centrale ;
   - tests transversaux `contactModel` et `physicalContactConvergence` mis à niveau sur le contrat explicite DC_MOTOR.

5. Intégrité assets
   - `ASSET-INTEGRITY.json` étendu avec `dc-motor.terminals.svg` et le manifeste 4.1.0.

## Validation technique CTO

Sur HEAD `4b61915264a2ffffe747dbc30e8c49df1339c185` :

- `DcMotorPart.raster.test.jsx` : 10/10 PASS ;
- `contactModel.test.js` : 22/22 PASS ;
- `physicalContactConvergence.test.js` : 64/64 PASS ;
- lot ciblé : 96/96 PASS ;
- build Vite/TypeScript : PASS ;
- lint ciblé : aucune erreur signalée dans la validation finale.

## Canvas Gate — PASS CTO

Le CTO a validé le Canvas Gate final :

- deux cosses électriques clairement visibles côté arrière ;
- câblage possible sur les deux cosses ;
- aucun contact électrique sur l'arbre ;
- corps moteur visuellement cohérent ;
- drag / zoom / sélection inchangés.

## Interdits respectés

- aucune modification du Core `plus` / `minus` ;
- aucune utilisation de l'arbre comme borne ;
- aucune modification du modèle DC ;
- aucune vitesse, couple ou animation ajoutée ;
- aucune branche spéciale ajoutée à `pinPresentationGeometry.js`.

## Clôture

**MB-L1-PROP-009 est CLOSED — PROJECT CANVAS PASS.**

Voir `docs/pmo/blueprints/MB-L1-PROP-009-dc-motor-physical-terminals-blueprint.md`.
