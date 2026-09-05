# MB-VIS-CANVAS-050 — CSA Implementation Authority

## A. AUTORITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-050` |
| Blueprint-ID | `MB-VIS-CANVAS-050-blueprint` |
| Commit audité | `047f66e5db14fa0fd8c89a9f2f5e45de34172172` |
| Date | `2026-09-05` |
| Autorité | `CSA — ChatGPT / Chief Software Architect` |
| Statut | `CSA GO — IMPLÉMENTATION AUTORISÉE` |

## B. DÉCISION

Le Blueprint `MB-VIS-CANVAS-050-blueprint.md` et le Ticket `MB-VIS-CANVAS-050.md` ont été produits à partir de l'état réel du repository au commit `047f66e...` et sont cohérents avec la séquence maître EXP3.

**CSA GO : l'implémentation de MB-VIS-CANVAS-050 est autorisée.**

## C. MANDAT

Implémenter exclusivement :

- pan du Canvas ;
- zoom global fiable ;
- zoom orienté curseur ;
- reset viewport ;
- fit-to-content ;
- fit-to-selection ;
- primitive générique de centrage/focus viewport ;
- adaptation du modèle screen↔Document pour intégrer le viewport ;
- adaptation des interactions existantes aux combinaisons pan + zoom ;
- tests, build/typecheck, diff-check et preuve navigateur requis par le Ticket.

## D. CONTRAINTES CSA NON NÉGOCIABLES

1. Document = source de vérité.
2. Pan/zoom/reset/fit/focus sont du state de viewport, jamais des mutations Document.
3. Aucune modification de la géométrie canonique des composants/pins/wires pour compenser le viewport.
4. Un seul modèle screen↔Document.
5. Le renderer des composants ne devient pas dépendant du zoom/pan.
6. Une interaction pointer active à la fois.
7. Drag, marquee, waypoint, Breadboard, câblage et Sidebar doivent rester cohérents après pan + zoom.
8. Pan/zoom/reset/fit/focus ne doivent pas créer d'entrée Undo/Redo métier.
9. Aucun développement de MB-VIS-CANVAS-051 ou 052 dans ce changement.
10. Aucun asset réaliste ne doit être régénéré ou agrandi.

## E. AUTORISATION GIT — MODE DIRECT

Pour ce ticket, conformément à la nouvelle règle opérationnelle décidée par le CSA :

**Claude Code est autorisé à commit et push directement.**

Après implémentation et vérifications, Claude doit :

1. committer les changements de MB-VIS-CANVAS-050 ;
2. produire `docs/pmo/delivery-reports/MB-VIS-CANVAS-050-delivery-report.md` ;
3. committer également ce Delivery Report ;
4. pousser directement les commits sur `feat/MB-VIS-LED-V16-leads-thicker-realistic` ;
5. vérifier que HEAD local et distant correspondent ;
6. vérifier `git diff --check`, tests, typecheck, build et preuve navigateur ;
7. laisser `.claude/` hors périmètre s'il est toujours uniquement local ;
8. **STOP** après livraison.

Le CSA effectuera ensuite la validation finale et la clôture PMO. Claude ne prononce pas la clôture du ticket.

## F. ARTEFACTS À LIRE AVANT IMPLÉMENTATION

```text
docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md
docs/pmo/tickets/MB-VIS-CANVAS-050.md
docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md
docs/pmo/tickets/MB-VIS-CANVAS-049.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-049-delivery-report.md
```

## G. FICHIERS TERRAIN IDENTIFIÉS PAR LE CSA

```text
frontend/src/hooks/useCircuitState.js
frontend/src/utils/geometry.js
frontend/src/canvas/SimulationCanvas.jsx
frontend/src/canvas/SimulationCanvas.css
frontend/src/components/Navbar.jsx
frontend/src/context/useCircuit.js
frontend/src/context/CircuitContext.jsx
```

Ces chemins sont les zones de départ de l'audit d'implémentation ; Claude reste libre d'ajouter un utilitaire de viewport générique ou de toucher des tests associés si cela est strictement nécessaire au contrat.

## H. GATES DE SORTIE

Le ticket ne peut être considéré comme livré sans :

- tests ciblés pan/zoom/cursor/fit/reset/interaction combinée ;
- absence de régression des tests 049 ;
- typecheck ;
- build ;
- `git diff --check` ;
- preuve navigateur reproductible ;
- Delivery Report intégré au dépôt ;
- push direct sur la branche de travail.

**Aucune autorisation n'est donnée pour commencer MB-VIS-CANVAS-051 ou MB-VIS-CANVAS-052.**
