# MB-VIS-COMP-006 — Component Library Industrialization Pilot

## Statut

**PROPOSED — P1 — GATE**

## Objectif

Prouver sur un seul nouveau composant représentatif que le contrat, les registres et les primitives permettent une fabrication reproductible sans modification du Core Canvas.

## Choix du pilote

Le composant pilote doit être choisi après MB-VIS-COMP-001 à 005 sur la base du meilleur pouvoir de démonstration, et non selon une préférence esthétique. Un composant statique à deux pins est recommandé en premier choix.

## Travail demandé

1. Partir du contrat V1 validé.
2. Déclarer identité, géométrie logique, pins et géométrie physique.
3. Implémenter le renderer avec les primitives disponibles.
4. Enregistrer le renderer et, si nécessaire, le modèle électrique.
5. Ajouter les tests de contrat, placement, pins, wiring et simulation applicables.
6. Vérifier qu'aucun fichier générique du Core Canvas n'a dû être modifié pour le seul ajout du composant.
7. Documenter exactement la recette d'ajout pour les composants suivants.

## Interdictions

- ne pas utiliser CAPACITOR comme excuse pour réintroduire des modifications ad hoc ;
- ne pas modifier les pins pour corriger un défaut purement visuel ;
- ne pas modifier le breadboard pour adapter le renderer ;
- ne pas modifier la propagation générique ;
- ne pas entreprendre de migration de moteur graphique.

## Critères d'acceptation

- composant fonctionnel sur Canvas ;
- pins correctement câblables ;
- placement breadboard cohérent si applicable ;
- simulation cohérente si le composant est simulable ;
- rendu visuel réaliste et indépendant de la logique électrique ;
- aucune modification du flux générique requise ;
- procédure d'ajout reproductible pour le composant suivant.

## Gate

Le ticket est bloquant pour l'expansion massive de la bibliothèque : si le pilote nécessite encore des exceptions dans le Core, les tickets précédents doivent être réévalués avant d'ajouter de nouveaux composants.
