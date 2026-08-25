# Delivery Report — MB-VIS-005

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-VIS-005` (exécuté via `MB-VIS-005-IMPLEMENTATION`) |
| Nature | Régularisation documentaire rétroactive |
| Date | 2026-08-25 |
| Base contractuelle | `a34ffc2` (déclarée « PASS — TICKET CONTRACTUELLEMENT FERMÉ » par audit Qwen/Claude, selon `docs/pmo/tickets/MB-VIS-005-IMPLEMENTATION.md` §1) |
| Référence de livraison | `f8f5944` (selon `docs/roadmaps/amendments/2026-08-22-platform-roadmap-reconciliation.md` §2 : « MB-VIS-005 — routage utilisateur / waypoints persistants — intégré par `f8f5944` ») |
| Code modifié par cette régularisation | Aucun |

## 2. Objet du rapport

Ce Delivery Report restaure la preuve documentaire d'une livraison technique déjà intégrée sur `main`. Il ne constitue pas le rapport d'une nouvelle implémentation.

`MB-VIS-005` avait été identifié comme un gap documentaire explicite par l'amendement P2-0 (§2.3 : « L'absence d'un Delivery Report versionné formel reste un gap documentaire. Aucun travail de code ne doit être recréé uniquement pour combler ce manque documentaire »). Le présent rapport comble ce manque.

## 3. Preuves disponibles

Le ticket parent `docs/pmo/tickets/MB-VIS-005.md` définit le contrat des waypoints persistants (AC-01 à AC-14). Le ticket d'exécution `docs/pmo/tickets/MB-VIS-005-IMPLEMENTATION.md` en fixe le périmètre technique précis et la base contractuelle `a34ffc2`.

L'inspection du code sur `main` confirme la présence des éléments requis par ce contrat :

- `frontend/src/utils/circuitModel.js` expose `normalizeWaypoints()` et l'applique dans `normalizeWire()`, avec un commentaire citant explicitement « MB-VIS-005, ADR-008 amendé » et précisant l'absence de `waypoints` normalisée en tableau vide.
- `frontend/src/core/handlers/wire/UpdateWireWaypointsHandler.js` existe, avec son test dédié `frontend/src/core/handlers/__tests__/UpdateWireWaypointsHandler.test.js`.
- `frontend/src/wires/wirePath.js::buildWirePath()` et `frontend/src/utils/circuitSelectors.js::buildWirePaths()` consomment un paramètre `waypoints`, dans leur ordre, comme l'exige la section 5.6 du ticket parent.
- `frontend/src/core/validation/rules/structural/WireWaypointsStructureRule.js` existe, avec son test dans `frontend/src/core/validation/__tests__/rules/structuralRules.test.js`.
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` référence, dans son intitulé de test principal, un « CSA RULING — AUTORISATION DE REPRISE MB-VIS-005 (2026-08-21) », attestant que l'extension du verrou `CommandRegistry` à `UPDATE_WIRE_WAYPOINTS` a suivi le protocole de gouvernance requis par la section G-09 du ticket parent (ruling CSA traçable, pas de suppression ni d'affaiblissement silencieux du verrou).
- Des tests d'intégration dédiés existent : `frontend/src/__tests__/UpdateWireWaypointsMutationChannel.integration.test.jsx` et `frontend/src/__tests__/MBVIS005WaypointsMutationChannel.integration.test.js`.
- `frontend/src/hooks/useCircuitState.js` enregistre `UpdateWireWaypointsHandler` sur la commande `UPDATE_WIRE_WAYPOINTS` et expose `updateWireWaypoints(wireId, waypoints)`, dispatchée uniquement au relâchement de l'interaction utilisateur.

## 4. Ce qui est établi

- Le modèle `Wire` est étendu avec `waypoints`, préservé par `normalizeWire()` et ses chemins d'appel.
- La mutation persistante des waypoints passe exclusivement par le canal CF3 (`CommandBus → UpdateWireWaypointsHandler → HistoryService → Document`).
- Une règle de validation structurelle dédiée existe (`WireWaypointsStructureRule.js`).
- La géométrie du fil (`buildWirePath()`, `buildWirePaths()`) consomme les waypoints persistants dans leur ordre.
- L'extension du verrou `cf1DocumentArchitecture.test.js` à `UPDATE_WIRE_WAYPOINTS` est tracée par un ruling CSA (21/08/2026), et non silencieuse.
- Des tests unitaires, d'intégration et de validation dédiés à MB-VIS-005 sont présents dans le dépôt.
- Aucun fichier `frontend/` n'est modifié par la présente régularisation.

## 5. Ce qui n'est pas établi par cette livraison

- Ce rapport ne reproduit pas une exécution de suite de tests au moment de l'implémentation d'origine (aucun journal d'exécution contemporain, avec décompte exact de tests passants, n'a été retrouvé dans les artefacts PMO) ; il s'appuie sur l'audit Qwen/Claude cité par le ticket d'exécution (« PASS — TICKET CONTRACTUELLEMENT FERMÉ » sur `a34ffc2`) et sur l'inspection directe du code présent sur `main`.
- La vérification point par point de chacun des critères AC-01 à AC-14 n'est pas rejouée par ce rapport ; elle est attestée par le statut d'audit déjà enregistré dans `MB-VIS-005-IMPLEMENTATION.md`, pas redémontrée ici.
- Cette régularisation ne rouvre pas la question Core vs Presentation-only, déjà tranchée par la gouvernance ADR-003/ADR-008 antérieure au ticket (règle G-08 du ticket parent).
- Le rattachement stratégique `EXP-VIS` reste séparé et non concerné par cette régularisation ; il concerne le réalisme des renderers (`MB-VIS-002`), pas le routage des fils (EXP2 / `MB-VIS-004`/`MB-VIS-005`).

## 6. Limites et dettes documentaires

Aucun rapport de livraison contemporain de l'implémentation n'était présent dans les artefacts PMO inspectés, malgré l'existence d'un ticket d'exécution détaillé et d'un audit de clôture cité par ce dernier. Le présent rapport ne tente pas de reconstituer un journal d'exécution qui n'est pas disponible ; il formalise les faits attestés par les tickets déjà présents et par le code et les tests présents sur `main`.

## 7. Résultat de régularisation

La chaîne documentaire est désormais complétée par :

- `docs/pmo/tickets/MB-VIS-005.md` (déjà présent — contrat)
- `docs/pmo/tickets/MB-VIS-005-IMPLEMENTATION.md` (déjà présent — exécution)
- `docs/pmo/delivery-reports/MB-VIS-005-delivery-report.md` (ce document)

La régularisation a été effectuée sans modification du code fonctionnel.

## 8. Conclusion

`MB-VIS-005` est régularisé comme livraison techniquement intégrée et déjà auditée (« PASS — TICKET CONTRACTUELLEMENT FERMÉ » sur `a34ffc2`), avec Delivery Report désormais présent. Ceci clôt, avec `MB-VIS-004`, le périmètre EXP2 tel que découpé par l'arbitrage CSA du 2026-08-20 (`docs/roadmaps/amendments/2026-08-20-EXP2-arbitrage.md`).
