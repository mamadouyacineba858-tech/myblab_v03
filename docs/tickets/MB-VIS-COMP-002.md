# MB-VIS-COMP-002 — Visual State Resolver Registry

## Statut

**PROPOSED — P0**

## Objectif

Retirer de `PartRenderer` la connaissance spécifique des composants dont l'apparence dépend de signaux électriques, en généralisant le patron registry déjà utilisé ailleurs.

## Périmètre

- visual dispatch/registry actuel ;
- résolution des props visuelles dynamiques ;
- LED/RGB_LED comme cas de migration ;
- tests de non-régression.

## Travail demandé

1. Identifier le pipeline actuel de résolution des états visuels.
2. Introduire un registre/resolver générique par type uniquement au point spécialisé approprié.
3. Faire consommer au renderer des props déjà résolues.
4. Migrer LED et RGB_LED sans changement fonctionnel.
5. Vérifier qu'un nouveau composant dynamique peut être enregistré sans modifier le dispatcher générique.

## Interdictions

- ne pas modifier `resolution.js` pour obtenir le résultat ;
- ne pas déplacer le modèle électrique dans le renderer ;
- ne pas changer le rendu esthétique LED/RGB_LED sauf nécessité de migration ;
- ne pas créer une abstraction générique sans test démontrant son besoin.

## Critères d'acceptation

- plus de logique électrique spécifique LED/RGB_LED dans le dispatcher générique ;
- état visuel résolu hors du renderer ;
- LED/RGB_LED visuellement et fonctionnellement non régressés ;
- ajout d'un resolver testable indépendamment ;
- suite de tests existante verte.
