# MB-VIS-COMP-003 — Shared Realistic Visual Primitives

## Statut

**PROPOSED — P0/P1**

## Objectif

Créer une petite bibliothèque de primitives SVG réutilisables afin de réduire le coût de fabrication des composants réalistes.

## Périmètre initial

- pattes métalliques droites ;
- pattes métalliques courbes si réellement nécessaires ;
- terminaux ;
- corps plastique ;
- corps céramique ;
- disque/cylindre ;
- lentille ;
- reflets ;
- ombres ;
- marquages/bandes.

## Travail demandé

1. Auditer les renderers existants pour identifier les motifs réellement répétés.
2. Implémenter uniquement les primitives démontrées par cette duplication.
3. Définir des props stables, petites et indépendantes du type de composant.
4. Remplacer un petit nombre de duplications représentatives pour prouver la réutilisation.
5. Vérifier que les primitives ne connaissent ni simulation, ni wiring, ni état global.

## Interdictions

- pas de redesign de tous les composants ;
- pas de changement des coordonnées électriques ;
- pas de dépendance à un composant particulier dans une primitive ;
- pas d'introduction de WebGL/sprites/atlas ;
- pas de recherche de réalisme au détriment du contrat géométrique.

## Critères d'acceptation

- primitives réutilisables et testables ;
- aucune dépendance au modèle électrique ;
- au moins deux renderers peuvent partager une primitive lorsque le motif est réellement commun ;
- absence de régression visuelle/interaction sur les composants touchés ;
- coût d'ajout d'un nouveau renderer réduit et documenté.
