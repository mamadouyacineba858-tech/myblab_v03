# BLUEPRINT — MB-L1-PROP-009 — DC MOTOR Physical Electrical Terminal Presentation

## 1. Problème observé

Le composant `DC_MOTOR` possède deux pins électriques canoniques `plus` et `minus`, mais l'asset raster courant ne présente visuellement qu'une cosse électrique claire. Le point droit actuellement associé à `minus` tombe sur la zone de l'arbre mécanique, ce qui crée une ambiguïté physique : l'arbre n'est pas une borne électrique.

## 2. Invariants à préserver

- Type Core : `DC_MOTOR`.
- Pins Core : `plus`, `minus`.
- Paramètre : `resistance`.
- Modèle DC existant inchangé.
- `breadboardInsertable = false`.
- Architecture générique `PhysicalContact` inchangée.
- Aucun ajout de vitesse, couple, inertie, FEM dynamique ou animation.

## 3. Architecture cible

Séparer strictement :

1. **géométrie électrique canonique** — inchangée ;
2. **géométrie de présentation** — deux `contacts` dédiés, chacun posé sur une vraie cosse physique visible ;
3. **arbre mécanique** — purement visuel, jamais wire-connectable.

`pinPresentationGeometry.js` reste générique : aucune branche `DC_MOTOR` ne doit y être ajoutée. Les coordonnées de présentation doivent vivre dans `componentDefinitions.js` via `contacts`.

## 4. Asset cible

Le raster du moteur doit montrer clairement :

- le corps métallique ;
- l'arbre mécanique à l'avant ;
- deux cosses électriques distinctes du côté arrière ;
- aucune lecture possible de l'arbre comme borne.

Le format 84×50 est conservé si la composition le permet. Les variantes PNG/WebP 1x/3x et l'intégrité d'asset doivent rester cohérentes avec les conventions existantes.

## 5. Fichiers attendus

### À modifier si nécessaire

- `frontend/public/assets/components/dc-motor/dc-motor.default.1x.png`
- `frontend/public/assets/components/dc-motor/dc-motor.default.1x.webp`
- `frontend/public/assets/components/dc-motor/dc-motor.default.3x.png`
- `frontend/public/assets/components/dc-motor/dc-motor.default.3x.webp`
- `frontend/public/assets/components/dc-motor/manifest.json`
- `frontend/public/assets/components/dc-motor/ASSET-INTEGRITY.json`
- `frontend/src/config/componentDefinitions.js`

### Tests à adapter/ajouter

- tests raster/manifest/integrity existants du `DC_MOTOR` ;
- test de présentation vérifiant deux contacts distincts ;
- test garantissant `wireConnectable = true` et `breadboardInsertable = false` pour les deux contacts ;
- test verrouillant que les coordonnées de présentation sont différentes de la zone de l'arbre mécanique.

## 6. Méthode d'implémentation

1. Produire/valider l'asset final avec deux cosses visibles.
2. Mesurer les coordonnées pixels exactes des deux cosses sur l'asset final.
3. Reporter ces coordonnées dans `componentDefinitions.js` comme `contacts` de `plus` et `minus`.
4. Mettre à jour `manifest.json` et `ASSET-INTEGRITY.json` selon les conventions du dépôt.
5. Exécuter les tests ciblés, puis la suite pertinente.
6. Faire le Canvas Gate CTO.

## 7. Interdits

- ne pas déplacer/renommer les pins Core ;
- ne pas connecter l'arbre ;
- ne pas modifier le solveur ou `dcContributionRegistry.js` ;
- ne pas créer de logique type-spécifique dans `pinPresentationGeometry.js` ;
- ne pas introduire de simulation mécanique dans ce ticket ;
- ne pas inventer les coordonnées avant mesure sur l'asset final.

## 8. Gate Canvas

PASS uniquement si :

- deux vraies cosses électriques sont clairement visibles ;
- deux fils peuvent atterrir visuellement sur ces deux cosses ;
- l'arbre reste mécaniquement identifiable et non connectable ;
- aucune ambiguïté visuelle ne subsiste entre bornes électriques et arbre.
