# MB-VIS-COMP-001 — Component Contract & Geometry Invariants

## Statut

**PROPOSED — P0**

## Objectif

Formaliser et verrouiller le contrat V1 d'un composant sans refondre le Canvas ni modifier le comportement électrique.

## Périmètre

- `componentDefinitions.js`
- `canonicalRegistry.js` si nécessaire pour les tests de contrat
- utilitaires de géométrie/pins déjà existants
- tests de contrat

## Travail demandé

1. Cartographier le contrat réellement consommé par le Canvas, le wiring et le breadboard.
2. Définir les champs V1 nécessaires : identité, dimensions logiques, pins relatifs, renderer, capacités/état lorsque requis.
3. Séparer explicitement dans la documentation/test les concepts : logical bounds, electrical anchors, physical geometry, visual bounds.
4. Garantir que `dx/dy` reste la source de vérité des ancres électriques.
5. Préparer les champs réservés à la rotation sans implémenter la rotation.
6. Ajouter les tests de contrat minimaux et génériques.

## Interdictions

- aucune migration de renderer ;
- aucune refonte du breadboard ;
- aucune modification de la propagation électrique ;
- aucune implémentation de rotation ;
- aucun changement visuel opportuniste sur LED/CAPACITOR.

## Critères d'acceptation

- contrat documenté et testable ;
- pin IDs stables ;
- positions de pins relatives et cohérentes entre Canvas, wires et breadboard ;
- les dimensions logiques ne dépendent pas du SVG interne ;
- les tests existants restent verts ;
- aucun comportement utilisateur existant n'est régressé.

## Livrables

- tests de contrat ;
- documentation/notes de contrat mises à jour ;
- rapport listant les fichiers modifiés et les invariants vérifiés.
