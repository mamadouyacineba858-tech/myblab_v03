# MB-L1-PROP-009 — DC MOTOR — Physical Electrical Terminal Presentation

**Status:** IMPLEMENTED — PROJECT CANVAS GATE PENDING

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
   - verrouillage de l'architecture générique sans branche `DC_MOTOR` centrale.

5. Intégrité assets
   - `ASSET-INTEGRITY.json` étendu avec `dc-motor.terminals.svg` et le manifeste 4.1.0.

## Interdits respectés

- aucune modification du Core `plus` / `minus` ;
- aucune utilisation de l'arbre comme borne ;
- aucune modification du modèle DC ;
- aucune vitesse, couple ou animation ajoutée ;
- aucune branche spéciale ajoutée à `pinPresentationGeometry.js`.

## Canvas Gate

PASS seulement si :

- deux cosses électriques sont clairement visibles côté arrière ;
- les deux fils peuvent être démarrés / terminés sur ces deux cosses ;
- aucun fil ne se connecte à l'arbre ;
- le corps moteur reste visuellement cohérent après le crop de l'ancienne cosse ;
- drag / zoom / sélection restent inchangés.

## Validation technique à exécuter localement

Le connecteur GitHub a réalisé l'implémentation et les commits, mais n'exécute pas le runtime Vite/Vitest local. La validation technique et le Canvas Gate restent donc réservés au CTO dans VS Code.

Voir `docs/pmo/blueprints/MB-L1-PROP-009-dc-motor-physical-terminals-blueprint.md`.
