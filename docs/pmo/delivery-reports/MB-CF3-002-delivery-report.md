# Delivery Report — MB-CF3-002

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-CF3-002` |
| Nature | Régularisation documentaire rétroactive |
| Date | 2026-08-21 |
| Référence de livraison | `046b579d56765c2fde76262c2b4d35d11e082215` |
| Commit de régularisation | `17272a03b89505863411cd11d6887d8820cbc257` |
| Code modifié par la régularisation | Aucun |

## 2. Objet du rapport

Ce Delivery Report restaure la preuve PMO d'une livraison technique déjà intégrée sur `main`. Il ne constitue pas le rapport d'une nouvelle implémentation.

La régularisation concerne exclusivement l'extension du canal de mutation à `ADD_WIRE` sous le ruling `CSA-CF3-002-ADD-WIRE-001`.

## 3. Preuves disponibles

Le commit `046b579d56765c2fde76262c2b4d35d11e082215` décrit et implémente le chemin :

`CommandBus → AddWireHandler → HistoryService → HistoryManager`.

Le même commit précise que la garde `wireAlreadyExists` reste au niveau UI et que `REMOVE_COMPONENT`, `MOVE_COMPONENT` et `UPDATE_COMPONENT` restent explicitement hors périmètre.

Le fichier `frontend/src/__tests__/AddWireMutationChannel.integration.test.jsx` est présent sur `main` et couvre les comportements essentiels du canal `ADD_WIRE`, notamment création, Undo/Redo, pile historique partagée, invalidation du redo, garde contre les doublons, auto-connexion, arguments incomplets et conservation des données préexistantes.

## 4. Ce qui est établi

- `ADD_WIRE` est intégré au canal `CommandBus`.
- `AddWireHandler` est utilisé pour la mutation.
- L'historisation passe par `HistoryService` et la pile historique existante.
- `wireAlreadyExists` reste une garde UI.
- Les comportements de garde existants sont couverts par les tests dédiés.
- La mutation partage la pile Undo/Redo avec les mutations déjà intégrées au canal et avec le chemin legacy.
- Les mutations `REMOVE_COMPONENT`, `MOVE_COMPONENT` et `UPDATE_COMPONENT` ne sont pas incluses dans cette livraison.
- La suite complète observée lors de l'audit de clôture est de **679/679 tests passants, 68/68 fichiers**.
- Aucun fichier `frontend/` n'est modifié par la présente régularisation.

## 5. Ce qui n'est pas établi par cette livraison

- `MB-CF3-002` ne clôt pas l'Épic CF3.
- Cette livraison ne décide pas de la migration de `deleteSelection`.
- Cette livraison ne décide pas de la migration de la fin de glisser-déposer / `MoveCommand`.
- Cette livraison ne décide pas de la migration de `toggleLatchingButton`.
- Cette livraison ne décide pas de la suppression ou du remplacement de `HistoryManager`.
- Aucun nouveau ticket de migration des mutations legacy n'est créé par la présente régularisation.

## 6. Limites et dettes documentaires

Le Ticket PMO formel n'était pas présent dans les artefacts historiques inspectés. Le présent rapport ne tente pas de reconstruire une spécification historique qui n'est pas disponible. Il formalise uniquement les faits attestés par le ruling, le commit, le code et les tests présents sur `main`.

## 7. Résultat de régularisation

La chaîne documentaire est désormais complétée par :

- `docs/pmo/tickets/MB-CF3-002.md`
- `docs/pmo/delivery-reports/MB-CF3-002-delivery-report.md`

La régularisation a été effectuée sans modification du code fonctionnel.

## 8. Conclusion

`MB-CF3-002` est désormais **CLOSED — techniquement livré et PMO régularisé**.

La clôture est strictement limitée à `ADD_WIRE`. Elle ne constitue pas une décision sur les mutations legacy restantes et ne modifie pas le statut global de l'Épic CF3 dans la roadmap.
