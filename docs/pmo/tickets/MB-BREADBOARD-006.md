# MB-BREADBOARD-006 — Breadboard Canvas Object Lifecycle V1

## Mission
Rendre le Breadboard un objet Canvas de premier rang : sélectionnable, déplaçable, supprimable et historisé, sans casser la connectivité ni les composants.

## Scope
- sélection Breadboard ;
- déplacement Breadboard ;
- suppression Breadboard ;
- Undo/Redo création, déplacement, suppression ;
- non-régression composants/wires ;
- tests d'intégration réels du cycle Canvas.

## Locks
- Document/Core reste source de vérité ;
- aucune mutation directe depuis `Breadboard.jsx` ;
- mutations via CommandBus/Handlers/History ;
- aucune modification de `buildNets()` ni du solveur ;
- la connectivité existante doit être reconstruite après déplacement ;
- aucun nouveau système parallèle de sélection/History.

## Acceptance
1. Breadboard sélectionnable par clic.
2. Breadboard déplaçable par drag.
3. Déplacement non persistant pendant pointermove.
4. Drop via mutation gouvernée.
5. Undo/Redo du déplacement.
6. Suppression clavier/UI via canal gouverné.
7. Undo/Redo de la suppression.
8. Création Undo/Redo conservée.
9. Composants toujours sélectionnables/déplaçables/supprimables.
10. Wires toujours fonctionnels.
11. Breadboard repositionné conserve sa géométrie et sa connectivité dérivée.
12. Toutes les suites existantes vertes + build + diff-check.

## Non-objectifs
Arduino, Runtime, nouveau solveur, nouveau moteur de connectivité, redesign visuel.

## Governance
STOP après implémentation + tests + build. Aucun push supplémentaire sans validation CSA post-implémentation.
