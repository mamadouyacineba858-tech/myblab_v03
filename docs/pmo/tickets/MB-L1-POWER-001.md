# MB-L1-POWER-001 — Bench Power Supply Canvas Readability

## Statut
IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
`c5be04b2864feabe059f0bd0752439cc28559376`

## Problème observé
Le composant `POWER` est rendu dans sa boîte canonique 70×90. Au Canvas, l'alimentation de laboratoire est trop petite pour lire correctement les afficheurs, commandes et polarités et pour identifier confortablement les bornes physiques.

## Objectif
Améliorer uniquement la lisibilité physique du composant POWER sur le Canvas, dans l'esprit d'un instrument de laboratoire directement manipulable.

## Décision CSA
- conserver le type `POWER` ;
- conserver la boîte/Core 70×90 ;
- conserver les pins canoniques `5V` et `GND` ;
- conserver les PhysicalContacts existants ;
- conserver le modèle DC et `parameters.voltage` ;
- conserver la borne verte EARTH comme élément purement visuel ;
- agrandir uniquement le renderer local autour de son centre ;
- utiliser uniquement l'asset raster 3x pour le rendu visible ;
- candidat Canvas initial : `2.5×`.

## Interdictions
- aucun nouveau pin ;
- aucune modification de `canonicalRegistry.js` ;
- aucune modification de `componentDefinitions.js` ;
- aucune modification du modèle de simulation ;
- aucun déplacement des PhysicalContacts pour compenser l'agrandissement visuel ;
- aucun label/pastille artificiel autour du composant.

## Fichier d'implémentation
`frontend/src/components/parts/PowerPart.jsx`

## Gate Canvas
Le ticket ne peut être fermé qu'après validation visuelle du Project Lead :
1. instrument suffisamment grand ;
2. afficheurs et façade nettement plus lisibles ;
3. bornes rouge/noire/verte visuellement identifiables ;
4. `5V` et `GND` restent câblables via les contacts existants ;
5. drag, sélection et zoom restent corrects ;
6. aucune régression du reste du Canvas.

## Preuve technique
À exécuter localement/CI après checkout de la branche : test raster POWER ciblé, tests PhysicalContact transversaux pertinents, ESLint ciblé et build. Aucun PASS n'est déclaré dans ce document avant exécution réelle.
