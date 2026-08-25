# Delivery Report — MB-CF2-008

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-CF2-008` (aucun fichier de ticket PMO retrouvé dans les artefacts inspectés) |
| Nature | Régularisation documentaire rétroactive |
| Date | 2026-08-25 |
| Décision architecturale associée | `docs/adr/ADR-013-b2-residual-guarantees.md` (Statut : Accepté), issue de l'audit `MB-CF2-006` et de la mission `MB-CF2-007` |
| Code modifié par cette régularisation | Aucun |

## 2. Objet du rapport

Ce Delivery Report restaure la preuve documentaire d'une suppression de code déjà effective sur `main`. Il ne constitue pas le rapport d'une nouvelle implémentation.

`MB-CF2-008` avait été identifié comme un gap documentaire explicite par l'amendement P2-0 (§3 : « `MB-CF2-008` / registre B2 | exécution non démontrée par le dépôt | audit ciblé avant suppression »). L'audit ciblé mené pour ce rapport confirme que l'exécution a bien eu lieu ; le gap était documentaire, pas fonctionnel.

## 3. Preuves disponibles

`docs/adr/ADR-013-b2-residual-guarantees.md` documente la décision qui a précédé ce ticket : l'audit `MB-CF2-006` a établi que `B2` (`frontend/src/simulator/core/ComponentRegistry.ts`) n'avait aucun consommateur de production, et la mission `MB-CF2-007` a confirmé que sa garantie de copie défensive (`deepCopy`) n'était pas nécessaire au chemin de production actuel — concluant explicitement que « B2 sera traité par un ticket ultérieur dédié à sa suppression complète : MB-CF2-008 ».

L'inspection directe du dépôt confirme l'exécution de cette suppression :

- `frontend/src/simulator/core/ComponentRegistry.ts` n'existe plus dans l'arborescence.
- `frontend/src/simulator/__tests__/cf2RegistryConformance.test.js` contient un test dédié, intitulé « frontend/src/core/ComponentRegistry.ts reste absent (supprimé avant la baseline, non recréé) », qui vérifie `fs.existsSync(componentRegistryTsPath) === false`.
- Le même fichier contient un second test, « aucun fichier de production n'importe 'ComponentRegistry' (l'ancien registre B1/B2 n'est référencé nulle part) », qui parcourt l'ensemble des fichiers de production et échoue si l'un d'eux référence `ComponentRegistry`.
- `docs/adr/ADR-014-pin-source-of-truth.md` (§ »Aucune modification de code n'est requise dans MB-CF2-009 ») confirme, dans un ADR ultérieur et indépendant, que « B2, déjà supprimé par MB-CF2-008 » — attestation croisée cohérente avec les deux points précédents.

## 4. Ce qui est établi

- `B2` (`ComponentRegistry.ts`) est supprimé du dépôt.
- Aucune fonctionnalité de B2 n'a été migrée vers `registry.js`, `simulationRegistry.js` ou `canonicalRegistry.js`, conformément à la décision `CAS B CONFIRMÉ` de `ADR-013-b2-residual-guarantees.md`.
- La suppression est protégée par un garde-fou : un test d'architecture dédié (`cf2RegistryConformance.test.js`) qui empêche toute réintroduction silencieuse.
- Un ADR ultérieur (`ADR-014`) atteste indépendamment que la suppression a eu lieu.
- Aucun fichier `frontend/` n'est modifié par la présente régularisation.

## 5. Ce qui n'est pas établi par cette livraison

- Ce rapport ne reproduit pas un journal d'exécution contemporain de la suppression (date exacte, commit exact, résultats de suite de tests au moment du ticket) : aucun n'a été retrouvé dans les artefacts PMO inspectés.
- Cette régularisation ne se prononce pas sur l'état global du programme Core Foundation / CF2 au-delà du périmètre strict de B2.

## 6. Limites et dettes documentaires

Comme pour `MB-CF3-002`/`MB-CF3-003`/`MB-VIS-002`/`MB-VIS-005`, aucun ticket PMO formel ni rapport de livraison contemporain n'était présent pour `MB-CF2-008`, malgré une chaîne de décision architecturale (`ADR-013`) claire et une exécution attestée par le code, les tests et un ADR ultérieur indépendant (`ADR-014`). Le présent rapport ne tente pas de reconstruire un ticket ou un journal d'exécution qui n'est pas disponible ; il formalise les faits attestés par les ADR déjà présents et par le code et les tests présents sur `main`.

## 7. Résultat de régularisation

La chaîne documentaire est désormais complétée par :

- `docs/adr/ADR-013-b2-residual-guarantees.md` (déjà présent — décision)
- `docs/pmo/delivery-reports/MB-CF2-008-delivery-report.md` (ce document)

La régularisation a été effectuée sans modification du code fonctionnel.

## 8. Conclusion

`MB-CF2-008` est régularisé comme livraison techniquement effective et vérifiée : la suppression de B2 est réelle, protégée par un garde-fou d'architecture, et corroborée par un ADR indépendant ultérieur. Le gap relevé par l'amendement P2-0 était documentaire, pas fonctionnel ; il est désormais clos.
