# MB-VIS-CANVAS-051 — CSA Implementation Authority

## A. AUTORITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-051` |
| Blueprint-ID | `MB-VIS-CANVAS-051-blueprint` |
| Commit audité | `53cac55a0e8f8f951a51e17ca721dc2bf7f1399f` |
| Date | `2026-09-05` |
| Autorité | `CSA — ChatGPT / Chief Software Architect` |
| Statut | `CSA GO — IMPLÉMENTATION AUTORISÉE` |

## B. DÉCISION

Le CSA a audité directement le repository au commit `53cac55...`, après clôture de MB-VIS-CANVAS-050. Le problème traité par 051 est transversal : le hook `useCircuitState()` porte simultanément le Document, la sélection, le viewport et plusieurs états haute fréquence de preview/interaction, puis expose cette valeur par un unique `CircuitContext.Provider`. Les consommateurs canvas utilisent ce même contexte, ce qui peut propager les mises à jour haute fréquence à des parties qui n’en dépendent pas.

Le Blueprint et le Ticket 051 sont cohérents avec la séquence maître EXP3 et avec les invariants établis par 049/050.

**CSA GO : l’implémentation de MB-VIS-CANVAS-051 est autorisée.**

## C. MANDAT

Implémenter exclusivement :

- isolation du state haute fréquence ;
- réduction du fan-out de rendu pendant drag, pan, marquee, waypoint et feedback ;
- stabilisation des références nécessaires ;
- adaptation minimale des consommateurs pour bénéficier de l’isolation ;
- tests fonctionnels et tests de rendu/rerender adaptés au mécanisme choisi ;
- protocole de mesure reproductible sur au moins 100 composants ;
- comparaison avant/après selon une procédure identique ;
- preuve navigateur ;
- documentation du résultat, des limites et des éventuelles mesures sans gain.

## D. CONTRAINTES CSA NON NÉGOCIABLES

1. Document = source de vérité.
2. Aucun preview haute fréquence ne doit réintroduire une mutation Document par frame.
3. Le viewport de 050 reste fonctionnel et indépendant du Document.
4. Drag, marquee, waypoint, Breadboard, câblage, sélection et Sidebar restent cohérents.
5. Les fils doivent continuer à suivre les previews nécessaires.
6. La simulation et l’état runtime doivent rester fonctionnels.
7. History/Undo/Redo ne doit pas être contaminé par l’optimisation.
8. Une interaction pointer active à la fois reste la règle.
9. Aucun travail sur MB-VIS-CANVAS-052 ou sur les tickets suivants.
10. Aucun asset réaliste modifié, régénéré ou agrandi.
11. Aucun changement du backend de rendu.
12. Aucun découplage reposant sur des refs/stores qui créerait des stale states ou une divergence entre rendu et Document.
13. L’optimisation doit être mesurée sur un scénario réel d’au moins 100 composants.
14. Ne pas déclarer un gain sur la seule base d’un ressenti ; distinguer mesure, observation et hypothèse.

## E. AUTORISATION GIT — MODE DIRECT

Conformément à la règle opérationnelle décidée par le CSA :

**Claude Code est autorisé à commit et push directement.**

Après implémentation et vérifications, Claude doit :

1. committer les changements d’implémentation 051 ;
2. produire `docs/pmo/delivery-reports/MB-VIS-CANVAS-051-delivery-report.md` ;
3. committer également ce Delivery Report ;
4. pousser directement tous les commits sur `feat/MB-VIS-LED-V16-leads-thicker-realistic` ;
5. vérifier que HEAD local = HEAD distant ;
6. vérifier tests, mesure performance, typecheck, build et `git diff --check` ;
7. laisser `.claude/` hors périmètre s’il est toujours uniquement local ;
8. **STOP** après livraison.

Le CSA effectuera ensuite la validation finale et la clôture PMO.

## F. ARTEFACTS À LIRE AVANT IMPLÉMENTATION

```text
docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md
docs/pmo/tickets/MB-VIS-CANVAS-051.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-051-authority.md
docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md
docs/pmo/tickets/MB-VIS-CANVAS-050.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-050-delivery-report.md
```

## G. FICHIERS TERRAIN DE DÉPART

```text
frontend/src/hooks/useCircuitState.js
frontend/src/context/CircuitContext.jsx
frontend/src/context/useCircuit.js
frontend/src/canvas/SimulationCanvas.jsx
frontend/src/canvas/CircuitComponent.jsx
frontend/src/wires/WiresLayer.jsx
```

Claude peut ajouter les fichiers de tests/utilitaires nécessaires et modifier d’autres consommateurs uniquement si cela est strictement requis pour satisfaire le contrat d’isolation.

## H. GATES DE SORTIE

Le ticket ne peut être considéré comme livré sans :

- tests d’isolation adaptés au mécanisme choisi ;
- tests fonctionnels de non-régression 049/050 ;
- preuve qu’un preview/navigation haute fréquence ne mute pas le Document ;
- mesure browser reproductible sur 100+ composants avant/après ;
- preuve de maintien des fils, breadboard, sélection et simulation ;
- typecheck ;
- build ;
- `git diff --check` ;
- Delivery Report intégré au dépôt ;
- commits et push directs effectués.

**Aucune autorisation n’est donnée pour commencer MB-VIS-CANVAS-052 ou tout ticket ultérieur.**
