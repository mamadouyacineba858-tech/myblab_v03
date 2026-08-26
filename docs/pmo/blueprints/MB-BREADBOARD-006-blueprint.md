# MB-BREADBOARD-006 — BLUEPRINT → TICKET → CSA GO

## BLUEPRINT

### Objectif
Faire du Breadboard un objet Canvas de premier rang, aligné sur le cycle existant des composants : sélection → preview → mutation gouvernée → Document → History → rendu.

### Architecture
Pointer → Canvas interaction → CommandBus → Handler → Document/History → Breadboard presentation.

### Contraintes
- `Breadboard.jsx` reste présentation ; aucune mutation directe.
- La sélection doit intégrer `breadboard` sans système parallèle.
- Déplacement : preview uniquement pendant pointermove ; commit au pointerup.
- Suppression : commande gouvernée.
- Undo/Redo : même HistoryService que le reste du Canvas.
- La géométrie électrique reste dérivée du Document.
- Aucun changement du solveur ni de `buildNets()`.

### Preuves obligatoires
- clic Breadboard → sélection visible ;
- drag Breadboard → déplacement réel ;
- Ctrl+Z/Ctrl+Y → déplacement restauré/rétabli ;
- Delete → suppression ;
- Ctrl+Z/Ctrl+Y → suppression restaurée/rétablie ;
- composant + wire restent déplaçables/supprimables ;
- montage breadboard conserve sa connectivité après déplacement.

## TICKET À IMPLÉMENTER

**MB-BREADBOARD-006 — Canvas Object Lifecycle V1**

Implémenter le cycle complet du Breadboard dans le Canvas réel.

### Scope IN
1. Ajouter `breadboard` au modèle de sélection existant.
2. Ajouter la sélection visuelle du Breadboard.
3. Rendre le Breadboard draggable.
4. Ajouter une commande gouvernée de déplacement.
5. Ajouter une commande gouvernée de suppression.
6. Brancher les handlers au CommandBus/HistoryService.
7. Restaurer correctement le Breadboard par Undo/Redo.
8. Préserver les composants/wires existants.
9. Ajouter tests unitaires/intégration ciblés.
10. Vérifier build et suite complète.

### Scope OUT
Arduino, Runtime, solveur, buildNets, nouveau système de connectivité, redesign graphique.

### Acceptance
- AC01 sélection Breadboard ;
- AC02 déplacement ;
- AC03 aucune mutation persistante pendant pointermove ;
- AC04 déplacement historisé ;
- AC05 suppression ;
- AC06 suppression historisée ;
- AC07 Undo/Redo création ;
- AC08 Undo/Redo déplacement ;
- AC09 Undo/Redo suppression ;
- AC10 composants/wires non régressés ;
- AC11 connectivité conservée ;
- AC12 tests complets verts ;
- AC13 build vert ;
- AC14 `git diff --check` vert.

### STOP
Aucun élargissement de scope. Aucun commit/push supplémentaire avant validation post-implémentation CSA.

## CSA GO

**GO — IMPLÉMENTATION AUTORISÉE.**

Le ticket est validé pour implémentation immédiate.

Conditions :
- respecter strictement le Blueprint ;
- utiliser les mécanismes Canvas/CommandBus/History existants ;
- ne pas modifier simulation/connectivité ;
- fournir preuves AC01–AC14 ;
- STOP après validation technique.
