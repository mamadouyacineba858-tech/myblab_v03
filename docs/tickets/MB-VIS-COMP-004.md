# MB-VIS-COMP-004 — Declarative State & Interaction Capabilities

## Statut

**PROPOSED — P1**

## Objectif

Réduire les branchements spécifiques aux types dans les couches génériques en déclarant explicitement les capacités d'état et d'interaction des composants.

## Travail demandé

1. Inventorier les branchements par type liés à l'état et aux interactions dans les couches génériques.
2. Définir un vocabulaire minimal de capacités : aucun état, état transitoire, état historisé, interaction personnalisée, props visuelles dérivées.
3. Ajouter les champs déclaratifs uniquement lorsque leur sémantique est démontrée par le code existant.
4. Unifier les points d'accès génériques sans modifier le comportement de BUTTON/BUTTON_LATCHING.
5. Migrer progressivement les branchements concernés vers la déclaration/capacité.
6. Ajouter les tests couvrant création, transition, undo/redo et interaction selon la capacité déclarée.

## Interdictions

- aucune nouvelle capacité fonctionnelle non demandée ;
- ne pas supprimer une branche par type sans équivalent testé ;
- ne pas refondre HistoryManager ;
- ne pas refondre le drag breadboard ;
- ne pas modifier la simulation électrique pour des raisons d'API UI.

## Critères d'acceptation

- état initial déterminé par le contrat lorsque pertinent ;
- interaction spécifique déclarée plutôt que détectée par comparaison dispersée ;
- BUTTON et BUTTON_LATCHING non régressés ;
- undo/redo inchangé ;
- tests de capacité génériques ;
- aucun nouveau couplage type→Core sans justification documentée.
