# MB-CF3-003 — Delivery Report

## 1. Identité

- **Ticket:** `MB-CF3-003`
- **Objet:** Migration contrôlée de `MOVE_COMPONENT` vers le canal de mutation CF3
- **Commit d’implémentation:** `918b39242e9be240edef1eca42804fb3177db304`
- **HEAD audité:** `befcb3eb01a3a3dd74a53f134492290fe664c279`
- **Date de l’audit:** 2026-08-24
- **Mode:** audit lecture seule

## 2. Verdict CSA

**CLOSURE WITH DOCUMENTATION ONLY.**

La migration technique est conforme au contrat du ticket et au ruling `CSA-CF3-003-MOVE-001`. Aucun défaut de code de production ni aucune régression technique n’a été identifié pendant l’audit.

Les écarts restant sont documentaires/process et ne nécessitent pas de modification du chemin `MOVE_COMPONENT` :

1. le statut PMO du ticket doit être clôturé explicitement ;
2. ce rapport de livraison doit être conservé dans `docs/pmo/delivery-reports/` ;
3. la couverture CI du test d’intégration UI critique doit faire l’objet d’un suivi séparé.

## 3. Preuves techniques

Le chemin réel audité est :

```text
pointerdown/startDrag
  -> aperçu local pendant pointermove
  -> pointerup
  -> Command("MOVE_COMPONENT")
  -> CommandBus
  -> ValidationEngine
  -> MoveComponentHandler
  -> HistoryService
  -> Document API
```

Garanties vérifiées :

- une seule mutation persistante par session de drag ;
- aucun dispatch pendant `pointermove` ;
- aucun dispatch si la position finale est inchangée ;
- Undo et Redo fonctionnels ;
- invalidation du Redo après nouvelle action ;
- multi-sélection atomique ;
- absence de double historisation via `MoveCommand` legacy ;
- préservation des propriétés du composant ;
- wires et waypoints préservés ;
- simulation non modifiée par le preview ;
- verrou architectural CF3 maintenu.

## 4. Vérification automatisée

- Suite Node/CI : **806/806 tests PASS**, 76 fichiers.
- Suite jsdom : **894/894 tests PASS**, 85 fichiers.
- Test `MoveComponentMutationChannel.integration.test.jsx` isolé : **12/12 PASS**.
- Build : **PASS**.
- `git diff --check` : **PASS**.
- Aucun fichier du chemin MOVE modifié dans les commits postérieurs à `918b392` ; les modifications postérieures concernent les domaines Observation et Measurement.

## 5. Écart CI hors périmètre

Le test `MoveComponentMutationChannel.integration.test.jsx`, notamment le test critique de séparation Presentation/Document pendant le drag, est exécuté par la configuration jsdom mais n’est pas inclus dans la CI GitHub officielle actuelle.

Ce point ne bloque pas la clôture technique de `MB-CF3-003`. Il doit être traité par un ticket de suivi CI séparé afin de ne pas élargir le périmètre du ticket clos.

## 6. Action de clôture

Le présent rapport formalise la clôture technique de `MB-CF3-003` et doit être associé au ticket existant. Aucune modification de production, aucun refactor et aucune suppression de l’infrastructure legacy ne sont requis pour cette clôture.

## 7. Intégrité de l’audit

L’audit a été effectué en lecture seule. Aucun changement de code, commit, rebase, reset ou force-push n’a été effectué dans le cadre de l’audit.
