# Blueprint — MB-L1-PROP-010 — POLARIZED CAPACITOR Dynamic Capacitance Marking

## But
Projeter la source persistante `parameters.capacitance` dans le marquage visible du condensateur électrolytique polarisé, sans créer de seconde vérité métier.

## Base
- Base commit : `eb24fe68b2d6ae412327b712c6462d691230b86a`
- Branche : `feat/MB-L1-PROP-010-polarized-capacitor-dynamic-marking`
- Type : `POLARIZED_CAPACITOR`

## Architecture conservée
- identité électrique `plus` / `minus` ;
- modèle DC circuit ouvert établi ;
- paramètre canonique `capacitance` uniquement ;
- PhysicalContacts existants ;
- `AssemblyLeadsLayer` ;
- raster électrolytique bleu et bande négative ;
- `25 V` reste une caractéristique visuelle fixe tant qu'aucun paramètre nominal de tension n'existe.

## Projection
`Document.parameters.capacitance` → `resolveComponentParameters()` → `PolarizedCapacitorPart(parameters)` → `formatPolarizedCapacitanceMarking()` → marquage DOM visuel.

Aucune valeur de marquage n'est persistée.

## Règles
- exemples requis : 100 µF → `100µF`, 47 µF → `47µF`, 10 µF → `10µF`, 1 µF → `1µF` ;
- les unités d'ingénierie F/µF/nF/pF sont supportées lorsque la valeur peut être affichée sans arrondi silencieux ;
- entrée invalide/non représentable : aucun marquage de capacitance inventé ;
- `25V` reste affiché indépendamment de la capacitance ;
- la bande de polarité et les pattes ne sont pas recouvertes.

## Interdits
- ajouter `voltageRating`/`nominalVoltage` au Core ;
- modifier les pins ou PhysicalContacts ;
- modifier le modèle DC ;
- modifier la polarité ;
- persister le texte de marquage ;
- brancher `POLARIZED_CAPACITOR` dans la couche de rendu centrale.

## Gate technique
- formatter pur testé ;
- rendu dynamique testé ;
- changement 100µF → 47µF testé ;
- `25V` fixe testé ;
- schéma canonique vérifié sans `voltageRating` ;
- pins/contacts verrouillés ;
- tests raster historiques non régressés ;
- build et lint ciblé à exécuter localement.

## Canvas Gate
PASS si l'édition de capacitance dans l'Inspector met à jour le marquage du corps, si `25V` reste fixe, si la bande négative reste nette, et si drag/zoom/câblage sont inchangés.
