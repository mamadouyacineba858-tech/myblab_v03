# MB-VIS-PROTOTYPE-001A — CSA AMENDMENT 001

## Objet

Durcir la cible visuelle de production externe du RESISTOR à partir de la référence visuelle présentée au CSA le 31 août 2026.

Cet amendment complète `docs/pmo/tickets/MB-VIS-PROTOTYPE-001A-resistor.md` sans créer de nouvelle source de vérité pour les dimensions, pins, matériaux, lumière, ombre ou backend. Les valeurs numériques continuent de dériver de `frontend/src/visualization/visualContract.js` et de `getComponentDef("RESISTOR")`.

## Décision CSA

**PASS — cible visuelle durcie pour la production externe RESISTOR.**

La référence visuelle fournie n'est pas un asset à intégrer tel quel. Elle constitue une **référence d'ambition perceptuelle et de silhouette**. L'artiste/pipeline Blender doit produire un véritable asset individuel avec transparence alpha, sans planche, sans cadre et sans éléments d'interface.

## Contraintes obligatoires supplémentaires

### 1. Silhouette « dog-bone »

La silhouette du corps doit être celle d'une résistance axiale physique de type dog-bone :

- corps central renflé ;
- extrémités du corps arrondies ;
- épaules/transition corps-lead progressivement resserrées ;
- léger étranglement avant chaque lead ;
- volume réellement modélisé, avec perspective/éclairage révélant la forme ;
- **interdit : cylindre droit uniforme utilisé comme substitut du corps physique** ;
- la silhouette doit rester compatible avec `FILL_FACTOR.AXIAL_LEADED = 0.62` et la boîte canonique `84 × 28`.

La forme dog-bone est une contrainte de **géométrie visuelle**, pas une nouvelle dimension canonique. Aucune modification de `componentDefinitions.js` n'est autorisée par cet amendment.

### 2. Corps céramique beige/crème

Le corps doit être :

- beige/crème clair ;
- mat à satiné ;
- crédiblement céramique/résine de composant électronique ;
- spéculaire doux et large conformément à `MATERIALS.CERAMIC` ;
- suffisamment texturé par la lumière pour révéler le volume sans devenir plastique.

**Interdit :** corps orange, ambre/orange saturé, plastique orange ou gradient orange utilisé comme approximation du matériau.

La couleur exacte n'est pas une nouvelle valeur hexadécimale contractuelle : il s'agit d'une contrainte perceptuelle de production appliquée au token `CERAMIC`.

### 3. Bagues de couleur

Les bagues sont des coatings/peintures réellement appliqués à la géométrie du corps :

- elles épousent la courbure du corps ;
- elles possèdent des bords physiques propres ;
- elles ne sont pas des bandes SVG ou des aplats 2D ;
- elles doivent rester nettes à @3x et lors du contrôle zoom 200 % ;
- leur rendu doit rester cohérent avec le matériau céramique sous la même lumière.

### 4. Séquence de référence des bagues

Pour rendre la production déterministe et comparable, la séquence du prototype RESISTOR est **figée** :

**marron → noir → rouge → or**.

Cette séquence est une référence visuelle de prototype et ne constitue pas une nouvelle définition électrique de la résistance. Elle ne doit pas être interprétée comme une modification de la valeur ohmique du composant dans le modèle électrique.

Si une valeur électrique est affichée ultérieurement, elle doit continuer de provenir du modèle électrique existant, jamais de l'asset visuel.

### 5. Leads / extrémités

Les leads doivent rester :

- cylindriques ;
- en métal étamé crédible ;
- brillants avec un reflet spéculaire continu ;
- strictement horizontaux dans la vue de production ;
- à extrémités arrondies physiquement plausibles.

**Le rayon apparent de l'extrémité arrondie du lead doit être égal au rayon du lead métallique lui-même.**

Autrement dit, l'extrémité doit être une terminaison cylindrique arrondie cohérente (type hémisphère/capsule), **pas un disque, pas une sphère surdimensionnée et pas un bouchon d'un rayon différent**.

Le lead doit se terminer exactement aux ancres de pins après mise à l'échelle de l'asset :

- `A = (0,14)` ;
- `B = (84,14)`.

### 6. Alpha et absence de cadre

L'asset final est une image isolée, pas une planche de présentation.

**Interdits absolus dans les quatre fichiers finaux :**

- rectangle de fond ;
- fond blanc/gris/noir cuit ;
- checkerboard rasterisé ;
- cadre ;
- texte ;
- labels A/B ;
- flèches ou cotations ;
- points de pin ;
- cercles bleus des pins MYBlab ;
- grille ;
- interface utilisateur ;
- autre composant ;
- plusieurs vues dans un même fichier.

Le fond doit être réellement transparent et l'ombre de contact doit être portée correctement par l'alpha conformément au contrat.

### 7. Intégration MYBlab — séparation stricte

Les cercles/points visibles dans l'interface MYBlab appartiennent au système de pins et **ne doivent jamais être dessinés dans l'asset**.

L'asset fournit uniquement :

`corps réaliste + bagues + leads métalliques + ombre de contact`

Le wrapper, les hitboxes, les pins, le câblage, la sélection, le drag et les interactions restent ceux de MYBlab et ne sont pas reproduits dans l'image.

## Critères de rejet immédiat en 001B

Le prototype doit être **NO-GO** si l'un des points suivants est observé :

1. cadre/rectangle ou fond non transparent ;
2. points/cercle de pin inclus dans l'image ;
3. corps cylindrique droit sans silhouette dog-bone ;
4. corps orange au lieu de beige/crème ;
5. leads courbés dans la vue canonique ;
6. terminaison du lead dont le rayon diffère du rayon du lead ;
7. leads qui n'atteignent pas A/B dans la tolérance `0.75` ;
8. bagues qui semblent être des aplats 2D plutôt qu'un coating sur géométrie ;
9. asset livré comme planche ou montage multi-vues au lieu de quatre fichiers individuels ;
10. absence d'alpha exploitable.

Ces critères s'ajoutent aux contrôles automatisés du harnais `componentAssetValidation.js` et aux 15 critères QA humains de 001B.

## Périmètre et gouvernance

Cet amendment :

- ne modifie aucun renderer ;
- ne modifie pas `RendererRegistry`, `PartRenderer`, `VisualizationManager`, `CircuitComponent`, `Pin` ou `componentDefinitions` ;
- ne modifie pas le modèle électrique ;
- n'ajoute aucune dépendance ;
- ne crée aucun asset ;
- ne modifie pas les dimensions canoniques ;
- ne change pas le backend `svg/raster/r3f` ;
- ne réécrit aucun commit existant ;
- ne justifie aucun `force-push`.

Il complète uniquement la feuille de production externe de 001A et constitue la base obligatoire de comparaison en 001B.

## Prochaine étape

**PRODUCTION EXTERNE RÉELLE RESISTOR**, puis `MB-VIS-PROTOTYPE-001B` :

1. produire les quatre fichiers individuels `resistor.default.{1x,3x}.{webp,png}` ;
2. mesurer dimensions, poids, alpha et SHA-256 ;
3. exécuter le harnais 001A ;
4. mesurer l'ancrage des leads sur A/B ;
5. vérifier les zooms 0.5× / 1× / 2× et navigateur 150 % ;
6. évaluer les 15 critères QA ;
7. comparer à la référence visuelle ;
8. rendre un verdict **CSA VISUAL GO / NO-GO**.

**Aucun GO industriel n'est accordé par cet amendment.**
