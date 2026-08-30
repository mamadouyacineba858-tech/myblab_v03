# MB-VIS-COMP-007 — Component Library Rollout Gate

## Statut

**PROPOSED — P1 — GATE FINAL**

## Objectif

Décider, preuves à l'appui, si MYBlab est prêt à passer de l'industrialisation pilote à l'ajout systématique de dizaines de composants.

## Prérequis

- MB-VIS-COMP-001 à 006 validés ;
- contrat V1 stable ;
- primitives visuelles réutilisables ;
- registre visuel dynamique stabilisé ;
- garde-fous de complétude actifs ;
- pilote ajouté sans modification indue du Core Canvas.

## Validation obligatoire

Le rapport de gate doit démontrer :

1. qu'un composant statique peut suivre une recette courte et répétable ;
2. que les pins restent indépendants du SVG ;
3. qu'une modification purement visuelle ne change pas la connectivité ;
4. que les composants existants ne régressent pas ;
5. que l'ajout du pilote n'a pas créé de branchement type-spécifique supplémentaire dans les couches génériques ;
6. que la suite de tests pertinente reste verte ;
7. que les coûts et limites observés sont documentés.

## Décision de sortie

### GO

Autoriser l'extension de la bibliothèque selon la recette V1.

### NO-GO

Identifier précisément le contrat ou l'abstraction qui reste insuffisant et créer un ticket correctif avant toute expansion.

## Hors périmètre

Aucune décision de migration WebGL/Canvas, rotation complète, LOD ou refonte globale du Canvas ne doit être déclenchée par ce gate sans preuve indépendante et ticket dédié.
