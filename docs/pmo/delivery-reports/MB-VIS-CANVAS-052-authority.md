# MB-VIS-CANVAS-052 — CSA Implementation Authority

## A. AUTORITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-052` |
| Blueprint-ID | `MB-VIS-CANVAS-052-blueprint` |
| Commit audité | `d9497320789227c310bec2eafaf1074fd5426a58` |
| Date | `2026-09-05` |
| Autorité | `CSA — ChatGPT / Chief Software Architect` |
| Statut | `CSA GO — IMPLÉMENTATION AUTORISÉE` |

## B. DÉCISION CSA

Le CSA a audité le terrain GitHub de MYBlab v0.3 après `MB-VIS-CANVAS-050` et `MB-VIS-CANVAS-051`. Les fondations nécessaires sont présentes : viewport unique avec zoom/pan et primitives `centerOnRect`/`centerOnPoint`, oracle unique `clientToCanvas()` intégrant le viewport, couche Canvas commune, séparation stable/high-frequency issue de 051, `CircuitComponent` mémorisé et géométrie de pins distinguant canonique et présentation.

Le Ticket 052 et son Blueprint sont cohérents avec la séquence maître EXP3 et avec l'invariant central :

```text
ÉCHELLE VISUELLE ≠ GÉOMÉTRIE ÉLECTRIQUE CANONIQUE
```

**CSA GO : l'implémentation de MB-VIS-CANVAS-052 est autorisée.**

## C. MANDAT D'IMPLÉMENTATION

Claude Code doit implémenter exclusivement :

1. focus générique d'un composant ;
2. centrage du viewport via les primitives 050 existantes ;
3. sortie fiable du focus ;
4. local visual scale borné, fini et déterministe ;
5. entrée focus par composant sélectionné + `Enter` ;
6. sortie par `Escape` ;
7. variation du local scale par molette au-dessus du composant focalisé ;
8. conservation de la molette globale hors focus selon 050 ;
9. cohérence asset/pins/hit target/wire endpoint sous local scale ;
10. conservation du drag et du câblage ;
11. conservation de l'isolation de performance 051 ;
12. tests automatisés et preuve navigateur ;
13. typecheck, build et `git diff --check` ;
14. Delivery Report final dans le dépôt.

## D. PARAMÈTRES CSA VERROUILLÉS

```text
LOCAL_SCALE_MIN = 1.0
LOCAL_SCALE_MAX = 3.0
LOCAL_SCALE_STEP = 0.1
LOCAL_SCALE_DEFAULT = 1.5
```

Le local scale est une présentation du composant focalisé. Il ne doit jamais être injecté dans `clientToCanvas()` comme un zoom de viewport.

La sortie focus conserve le viewport courant ; aucune restauration d'une ancienne caméra n'est demandée.

## E. CONTRAINTES NON NÉGOCIABLES

1. Document = source de vérité.
2. `component.uid`, `component.x/y` et les données canoniques restent inchangés par focus/local scale.
3. Les pin IDs et références de wires restent inchangés.
4. La simulation et le runtime ne sont pas modifiés.
5. Focus/local scale ne créent aucune entrée Undo/Redo métier.
6. Il n'existe qu'un seul viewport.
7. Il n'existe qu'un seul oracle screen↔Document.
8. Les bounds de focus sont calculés en espace Document, jamais depuis des pixels écran transformés.
9. Aucun `if (type === ...)` ou branche équivalente ne doit être ajouté au renderer pour obtenir le focus/local zoom.
10. Le mécanisme doit être générique pour les 16 types rasterisés.
11. Une transformation CSS isolée de l'image est refusée si elle désynchronise pins, hit target ou wires.
12. Le local scale ne doit pas provoquer un rerender global à chaque pas de molette ; la frontière 051 doit être conservée.
13. Une interaction pointer active à la fois.
14. Aucun asset réaliste ne doit être régénéré, remplacé ou agrandi artificiellement.
15. Aucun travail sur 053+.
16. Aucun Inspector, Toolbar/Menu 2.0 ou Library 2.0 dans ce ticket.
17. Aucun changement de backend de rendu.
18. Aucun refactor général du solveur/connectivité/simulation.

## F. ARTEFACTS À LIRE AVANT CODE

```text
docs/pmo/blueprints/MB-VIS-CANVAS-052-blueprint.md
docs/pmo/tickets/MB-VIS-CANVAS-052.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-052-authority.md
docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md
docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md
docs/pmo/tickets/MB-VIS-CANVAS-050.md
docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-050-authority.md
docs/pmo/tickets/MB-VIS-CANVAS-051.md
docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md
docs/pmo/delivery-reports/MB-VIS-CANVAS-051-authority.md
```

## G. FICHIERS TERRAIN INITIAUX

```text
frontend/src/hooks/useCircuitState.js
frontend/src/context/CircuitContext.jsx
frontend/src/context/useCircuit.js
frontend/src/context/useCircuitInteraction.js
frontend/src/canvas/SimulationCanvas.jsx
frontend/src/canvas/CircuitComponent.jsx
frontend/src/canvas/CircuitComponent.css
frontend/src/canvas/Pin.jsx
frontend/src/utils/viewport.js
frontend/src/utils/geometry.js
frontend/src/utils/pinPresentationGeometry.js
frontend/src/config/componentDefinitions.js
frontend/src/components/parts/PartRenderer.jsx
frontend/src/wires/WiresLayer.jsx
```

Claude peut ajouter uniquement des utilitaires/tests ciblés rendus nécessaires par le contrat. Tout fichier supplémentaire substantiel doit être justifié dans le Delivery Report.

## H. TESTS / GATES DE SORTIE

Le ticket n'est pas livré sans :

- tests focus Enter/Escape ;
- test unicité du focus ;
- tests bornes local scale ;
- tests invariants Document/pins/wires ;
- tests drag et câblage focalisés ;
- tests combinaison global zoom + pan + focus + local scale ;
- test de non-régression 049/050/051 ;
- preuve de cohérence hit target/asset/pins/wire ;
- preuve multi-types ;
- typecheck ;
- build ;
- `git diff --check` ;
- preuve navigateur sur session fraîche ;
- console sans erreur liée au ticket ;
- Delivery Report intégré au dépôt.

## I. PREUVE NAVIGATEUR MINIMALE

```text
Sélection composant
    ↓
Enter
    ↓
Focus + centrage
    ↓
Local scale ↑ / ↓ par molette
    ↓
Drag
    ↓
Câblage
    ↓
Escape
    ↓
Vérification Document / pins / wires / History
```

Puis reproduire sur un second type visuellement différent et sur une combinaison `zoom global + pan + focus + local scale`.

## J. AUTORISATION GIT — MODE DIRECT

**Claude Code est explicitement autorisé à commit et push directement pour MB-VIS-CANVAS-052.**

Cette autorisation est donnée précisément pour éviter les va-et-vient de transfert entre l'agent d'implémentation et le CSA.

Après implémentation et validation locale, Claude doit :

1. créer le ou les commits nécessaires pour l'implémentation 052 ;
2. créer et committer `docs/pmo/delivery-reports/MB-VIS-CANVAS-052-delivery-report.md` ;
3. pousser directement les commits sur :

```text
feat/MB-VIS-LED-V16-leads-thicker-realistic
```

4. vérifier que `HEAD` local correspond au `HEAD` distant ;
5. vérifier `git status` propre après push ;
6. fournir les SHA des commits, le SHA final distant, les tests, le build, le typecheck, `git diff --check` et les preuves navigateur ;
7. ne pas modifier `.claude/` si celui-ci reste un état local hors périmètre ;
8. **STOP immédiatement après livraison.**

Claude n'a aucune autorité pour :

- déclarer le CSA Technical GO ;
- déclarer le CSA Visual GO ;
- clôturer le ticket PMO ;
- commencer 053 ou un ticket ultérieur ;
- modifier la roadmap de manière décisionnelle ;
- redéfinir les invariants de ce Blueprint/Authority.

Le commit/push direct est une autorisation opérationnelle de livraison, **pas une délégation d'autorité architecturale**.

## K. LIVRAISON ATTENDUE DE CLAUDE

Le Delivery Report doit contenir au minimum :

- résumé des changements ;
- liste exacte des fichiers modifiés/ajoutés ;
- tests exécutés et résultats ;
- typecheck/build/diff-check ;
- preuve navigateur ;
- vérification explicite `uid/x/y/pins/wires/simulation/history` ;
- vérification de la combinaison global/local ;
- vérification multi-types ;
- observations de performance/rerenders ;
- limites ou écarts éventuels ;
- SHA des commits ;
- branche et SHA distant final.

## L. ARRÊT / ESCALADE

Claude doit STOP et remonter au CSA au lieu d'inventer une solution si :

- le contrat nécessite une modification du modèle électrique ;
- le local scale impose une deuxième caméra ;
- le hit testing ou les wires deviennent incohérents ;
- l'architecture 051 empêche une implémentation propre ;
- un choix dépasse le périmètre 052 ;
- un test existant contredit un invariant CSA ;
- un asset doit être modifié pour rendre le ticket possible ;
- une modification substantielle du Core ou du renderer devient nécessaire.

## M. CSA GO FINAL

**CSA GO — MB-VIS-CANVAS-052 — IMPLÉMENTATION AUTORISÉE.**

Claude Code peut maintenant exécuter le ticket, **commit + push directs inclus**, puis STOP pour laisser au CSA la validation technique/visuelle finale.
