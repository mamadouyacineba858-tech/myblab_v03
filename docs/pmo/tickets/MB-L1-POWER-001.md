# MB-L1-POWER-001 — Bench Power Supply Canvas Readability

## Statut
IMPLEMENTED — PROJECT CANVAS GATE PENDING

## Base
`c5be04b2864feabe059f0bd0752439cc28559376`

## Problème observé
Le composant `POWER` était trop petit et les inscriptions autour des deux curseurs restaient illisibles. Une première tentative par labels DOM superposés a amélioré la lisibilité mais a produit des décalages visibles par rapport à la référence approuvée.

## Autorité visuelle
La référence approuvée par le Project Lead le 2026-09-14 devient l'autorité directe pour ce ticket : alimentation DC de laboratoire réaliste, façade nette, afficheurs `5.00 V / 0.00 A`, commandes `VOLTAGE` / `CURRENT`, `MIN` / `MAX`, interrupteur `POWER`, bornes noire/rouge/verte et plage `0 - 30V / 0 - 5A`.

## Décision CSA
- conserver le type `POWER` ;
- conserver la boîte/Core 70×90 ;
- conserver les pins canoniques `5V` et `GND` ;
- conserver les PhysicalContacts existants ;
- conserver le modèle DC et `parameters.voltage` ;
- conserver la borne verte EARTH comme élément purement visuel ;
- conserver le scale Canvas `2.5×` ;
- supprimer les labels DOM de façade ajoutés lors de la correction intermédiaire ;
- utiliser directement l'asset haute résolution approuvé : `frontend/public/assets/components/power/power.reference.hires.webp` ;
- l'image reste `pointer-events:none` et ne crée aucun nouveau hit target.

## Interdictions
- aucun nouveau pin ;
- aucune modification de `canonicalRegistry.js` ;
- aucune modification de `componentDefinitions.js` ;
- aucune modification du modèle de simulation ;
- aucun déplacement des PhysicalContacts ;
- aucune nouvelle borne logique pour EARTH ;
- aucun label flottant ou texte DOM compensatoire autour du composant.

## Fichiers d'implémentation
- `frontend/public/assets/components/power/power.reference.hires.webp`
- `frontend/src/components/parts/PowerPart.jsx`
- `frontend/src/components/parts/__tests__/PowerCanvasReadability.test.jsx`
- `frontend/src/components/parts/__tests__/PowerPart.raster.test.jsx`

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
