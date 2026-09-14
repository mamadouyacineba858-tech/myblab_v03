# MB-L1-POWER-001 — Bench Power Supply Canvas Readability

## Statut
IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
`c5be04b2864feabe059f0bd0752439cc28559376`

## Problème observé
Le composant `POWER` est rendu dans sa boîte canonique 70×90. La première correction à `2.5×` améliore nettement la présence visuelle, mais le Project Lead a constaté que les inscriptions autour des deux curseurs restaient illisibles.

## Objectif
Conserver le réalisme du raster tout en rendant la façade effectivement lisible à l'échelle normale du Canvas.

## Décision CSA
- conserver le type `POWER` ;
- conserver la boîte/Core 70×90 ;
- conserver les pins canoniques `5V` et `GND` ;
- conserver les PhysicalContacts existants ;
- conserver le modèle DC et `parameters.voltage` ;
- conserver la borne verte EARTH comme élément purement visuel ;
- conserver le scale Canvas `2.5×` ;
- utiliser uniquement le raster 3x comme corps visible ;
- redessiner uniquement la sérigraphie de façade essentielle par-dessus le raster : `DC POWER SUPPLY`, `MCH-305D`, `VOLTAGE`, `CURRENT`, `POWER`, `MIN`, `MAX`, signes des bornes et plage `0 - 30V / 0 - 5A` ;
- tous ces éléments sont presentation-only, `pointer-events:none`, sans nouveau hit target.

## Interdictions
- aucun nouveau pin ;
- aucune modification de `canonicalRegistry.js` ;
- aucune modification de `componentDefinitions.js` ;
- aucune modification du modèle de simulation ;
- aucun déplacement des PhysicalContacts ;
- aucune nouvelle borne logique pour EARTH ;
- aucun label flottant autour du composant : les textes ajoutés appartiennent exclusivement à la façade réelle de l'instrument.

## Fichiers d'implémentation
- `frontend/src/components/parts/PowerPart.jsx`
- `frontend/src/components/parts/__tests__/PowerCanvasReadability.test.jsx`

## Gate Canvas
Le ticket ne peut être fermé qu'après validation visuelle du Project Lead :
1. instrument suffisamment grand ;
2. `VOLTAGE`, `CURRENT`, `POWER`, `MIN` et `MAX` lisibles ;
3. afficheurs et façade cohérents avec la référence approuvée ;
4. bornes rouge/noire/verte visuellement identifiables ;
5. `5V` et `GND` restent câblables via les contacts existants ;
6. drag, sélection et zoom restent corrects ;
7. aucune régression du reste du Canvas.

## Preuve technique
À exécuter localement/CI après checkout de la branche :
- `PowerPart.raster.test.jsx` ;
- `PowerCanvasReadability.test.jsx` ;
- ESLint ciblé ;
- build.

Aucun PASS n'est déclaré dans ce document avant exécution réelle.
