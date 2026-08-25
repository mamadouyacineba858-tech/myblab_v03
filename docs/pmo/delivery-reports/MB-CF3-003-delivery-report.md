# Delivery Report — MB-CF3-003

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-CF3-003` |
| Nature | Régularisation documentaire rétroactive |
| Date | 2026-08-25 |
| Référence de livraison | `918b392` (base intégrée de `main` à l'ouverture de P2-0, selon `docs/roadmaps/amendments/2026-08-22-P2-0-reconciliation.md` §2.2) |
| Ruling CSA associé | `CSA-CF3-003-MOVE-001` (2026-08-22), consigné dans `docs/pmo/tickets/MB-CF3-003.md` §R |
| Code modifié par cette régularisation | Aucun |

## 2. Objet du rapport

Ce Delivery Report restaure la preuve documentaire d'une livraison technique déjà intégrée sur `main`. Il ne constitue pas le rapport d'une nouvelle implémentation.

`MB-CF3-003` avait été identifié comme un gap documentaire explicite par l'amendement P2-0 lui-même (§2.2 : « Le manque de Delivery Report formel reste un gap documentaire à traiter dans la régularisation PMO ; il ne justifie pas de refaire l'implémentation »). Le présent rapport comble ce manque.

## 3. Preuves disponibles

Le ticket `docs/pmo/tickets/MB-CF3-003.md` contient lui-même, en §R, le ruling CSA `CSA-CF3-003-MOVE-001` (2026-08-22) qui documente un blocage rencontré en Phase B (multi-sélection incompatible avec le contrat mono-composant historique du Handler), la proposition de résolution qui en a découlé, et le contrat canonique retenu : une commande `MOVE_COMPONENT` unique portant `{ moves: [{ componentId, fromPosition, toPosition }, ...] }`, valable pour un ou plusieurs composants.

L'inspection du code sur `main` confirme que ce contrat est effectivement implémenté :

- `frontend/src/core/handlers/component/MoveComponentHandler.js` porte, en tête de fichier, un commentaire qui cite explicitement le ruling `CSA-CF3-003-MOVE-001` et documente le contrat `{ moves: [...] }`, la rétrocompatibilité de la forme héritée `{ componentId, position }`, et la séparation `dragPreview` (Presentation) ≠ Document persistant.
- `frontend/src/hooks/useCircuitState.js` enregistre `MoveComponentHandler` sur la commande `MOVE_COMPONENT`, construit un tableau `moves` au relâchement du glisser-déposer, et dispatche une seule commande via `CommandBus`.
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` contient un test intitulé `[CSA RULING MB-CF3-003 du 2026-08-22]` qui vérifie que le verrou du `CommandRegistry` est borné à exactement quatre commandes (`ADD_COMPONENT`, `ADD_WIRE`, `UPDATE_WIRE_WAYPOINTS`, `MOVE_COMPONENT`) et que le canal legacy `MoveCommand` n'est plus instancié par le drag de production.
- `frontend/src/core/handlers/__tests__/MoveComponentHandler.test.js` existe et couvre le Handler.

## 4. Ce qui est établi

- `MOVE_COMPONENT` est intégré au canal `CommandBus` sous le contrat `{ moves: [...] }` défini par le ruling `CSA-CF3-003-MOVE-001`.
- `MoveComponentHandler` est le Handler effectivement exécuté, y compris pour un déplacement multi-composants.
- La séparation `dragPreview` (état Presentation, pendant `pointermove`) / Document persistant (muté uniquement au `pointerup`) est en place, conformément à la décision du ruling.
- Le verrou architectural `cf1DocumentArchitecture.test.js` a été amendé sous ruling CSA traçable, et non silencieusement.
- La forme héritée `{ componentId, position }` est conservée uniquement pour la rétrocompatibilité des tests Core existants et n'est plus émise par le chemin de production.
- Aucun fichier `frontend/` n'est modifié par la présente régularisation.

## 5. Ce qui n'est pas établi par cette livraison

- Ce rapport ne reproduit pas une exécution de suite de tests au moment de l'implémentation d'origine (aucun journal d'exécution contemporain n'a été retrouvé dans les artefacts PMO) ; il s'appuie sur le ruling consigné dans le ticket et sur l'inspection directe du code présent sur `main`.
- Cette régularisation ne décide pas de la migration de `REMOVE_COMPONENT`, `UPDATE_COMPONENT` ou `TOGGLE_LATCHING_BUTTON` — explicitement hors périmètre du ruling `CSA-CF3-003-MOVE-001`.
- Cette régularisation ne décide pas de la suppression de `MoveCommand.js` ni de `HistoryManager` — conservés par le ruling pour compatibilité tant qu'un ticket ultérieur n'en décide pas autrement.
- `MB-CF3-003` ne clôt pas l'Épic CF3 dans son ensemble.

## 6. Limites et dettes documentaires

Comme pour `MB-CF3-002`, aucun rapport de livraison contemporain de l'implémentation n'était présent dans les artefacts PMO inspectés. Le présent rapport ne tente pas de reconstituer un journal d'exécution qui n'est pas disponible ; il formalise uniquement les faits attestés par le ruling CSA déjà consigné dans le ticket et par le code et les tests présents sur `main`.

## 7. Résultat de régularisation

La chaîne documentaire est désormais complétée par :

- `docs/pmo/tickets/MB-CF3-003.md` (déjà présent, ruling §R inclus)
- `docs/pmo/delivery-reports/MB-CF3-003-delivery-report.md` (ce document)

La régularisation a été effectuée sans modification du code fonctionnel.

## 8. Conclusion

`MB-CF3-003` est désormais **CLOSED — techniquement livré et PMO régularisé**, strictement limité au périmètre `MOVE_COMPONENT` tel que défini par le ruling `CSA-CF3-003-MOVE-001`. La clôture ne constitue pas une décision sur les mutations legacy restantes et ne modifie pas le statut global de l'Épic CF3 dans la roadmap.
