# MB-BREADBOARD-012 — Wire endpoints on Breadboard holes

## Statut
Draft implementation — PR #15, based on `fix/MB-BREADBOARD-011-sidebar-hole-anchor`.

## Gap fermé
Les trous du breadboard sont électriquement résolus par `holeAt()`/`groupKey`, mais ne sont pas encore des endpoints de wire utilisables par l'utilisateur.

## Scope
- clic sur un trou = endpoint de câblage ;
- pin → trou ;
- trou → pin ;
- trou → trou ;
- rendu du wire jusqu'au trou ;
- sélection/suppression du wire ;
- simulation via dérivation des groupes électriques.

## Architecture
Un endpoint trou est encodé dans la forme historique `{fromUid, fromPin}` / `{toUid, toPin}` avec un sentinel explicite. Aucun composant fictif n'est créé.

La présentation et la simulation résolvent ce sentinel avec `holeAt()`. Pour la simulation, les wires pin→trou et trou→trou enrichissent les groupes électriques existants avant émission des arêtes virtuelles pin→pin.

## Invariants
- `holeAt()` reste l'oracle unique des trous ;
- `groupKey` reste la source de vérité de connectivité du breadboard ;
- les wires pin→pin existants restent inchangés ;
- aucun changement dans `preparation.js`/`resolution.js` ;
- aucun composant fictif n'est ajouté au Document ;
- les mutations passent toujours par `ADD_WIRE`/CommandBus ;
- pas de commit directement sur `main`.

## Validation attendue
Sur le poste local :
- `npm run test:ci`
- `npm run build`

Puis validation manuelle :
1. pin → trou ;
2. trou → pin ;
3. trou → trou ;
4. trou de rail+ → trou de rail+ ;
5. rail+ → rail− reste distinct ;
6. lancer la simulation et vérifier la continuité créée par les wires.
