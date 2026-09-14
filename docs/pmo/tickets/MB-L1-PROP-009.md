# MB-L1-PROP-009 — DC MOTOR — Physical Electrical Terminal Presentation

**Status:** READY — ASSET IMPLEMENTATION PENDING

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
- dimensions 84×50 si le nouvel asset le permet ;
- arbre mécanique réaliste ;
- architecture générique des `PhysicalContacts`.

## À modifier

1. Asset DC MOTOR
   - deux vraies cosses électriques visibles côté arrière ;
   - arbre mécanique clairement séparé ;
   - aucune fausse borne sur l'arbre.

2. `manifest.json`
   - mettre à jour la géométrie de présentation si nécessaire.

3. `componentDefinitions.js`
   - conserver les coordonnées électriques canoniques ;
   - ajouter des contacts de présentation dédiés :
     - `plus` → cosse + ;
     - `minus` → cosse - ;
   - `breadboardInsertable = false` ;
   - `wireConnectable = true`.

4. Tests
   - deux contacts distincts ;
   - aucun contact sur l'arbre ;
   - fils visuellement attachés aux vraies cosses ;
   - aucune régression simulation.

## Interdits

- déplacer ou renommer `plus` / `minus` dans le Core ;
- considérer l'arbre comme borne ;
- modifier le modèle DC ;
- ajouter vitesse / couple / animation dans ce ticket ;
- ajouter une branche `DC_MOTOR` dans `pinPresentationGeometry.js` ;
- inventer les coordonnées de contacts avant mesure sur l'asset final.

## Canvas Gate

PASS seulement si :

- deux cosses électriques sont clairement visibles ;
- les deux fils peuvent être connectés dessus ;
- l'arbre reste purement mécanique ;
- aucune ambiguïté visuelle n'existe entre cosse et arbre.

## État actuel

Le ticket est architecturalement prêt. L'implémentation des coordonnées `PhysicalContact` est volontairement bloquée jusqu'à disponibilité et validation du nouvel asset, afin d'éviter toute géométrie fictive.

Voir `docs/pmo/blueprints/MB-L1-PROP-009-dc-motor-physical-terminals-blueprint.md`.
