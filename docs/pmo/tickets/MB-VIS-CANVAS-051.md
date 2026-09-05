# MB-VIS-CANVAS-051 — Canvas Performance Isolation

## A. IDENTITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-051` |
| Titre | Canvas Performance Isolation |
| Pilier | Experience |
| Programme | Experience |
| Épic | EXP3 — Parité visuelle composants & expérience — seuil Tinkercad |
| Type | REFACTOR + PERFORMANCE |
| Importance | HIGH |
| Urgence | HIGH |
| Jalon | Niveau 1 — Fondation Canvas |

## B. MISSION

### Problème à résoudre
Le Canvas doit rester réactif lorsque les interactions haute fréquence mettent à jour des états de présentation ou de navigation. L’architecture actuelle mélange state stable et state haute fréquence dans un même flux de consommation, ce qui peut provoquer des réévaluations de composants qui ne dépendent pas du changement courant.

### Contexte stratégique
Après MB-VIS-CANVAS-050, le viewport est fonctionnel mais sa mise à jour est fréquente. Avant d’introduire le focus composant et le zoom local de MB-VIS-CANVAS-052, il faut établir une frontière de performance claire afin que les futures interactions n’entraînent pas un fan-out global du laboratoire.

### Bénéfice attendu
Le laboratoire conserve une interaction fluide et prévisible sur des circuits représentatifs, sans sacrifier les invariants du Document, des fils, de la simulation, de la sélection ou de l’historique.

## C. CONTRAT D'EXÉCUTION

### Périmètre inclus
- isoler les mises à jour haute fréquence des états stables lorsque cela est nécessaire ;
- réduire les réévaluations/renders inutiles pendant drag, pan, marquee, waypoint et feedback d’interaction ;
- préserver la continuité visuelle nécessaire des composants, fils et breadboard ;
- stabiliser les dépendances et références nécessaires à la fluidité ;
- ajouter les tests de comportement et de rendu permettant de verrouiller l’isolation ;
- établir une mesure reproductible sur un circuit d’au moins 100 composants ;
- comparer la situation avant/après selon un protocole identique ;
- documenter le résultat et les limites observées.

### Périmètre exclu
- nouvelle fonctionnalité métier hors performance ;
- nouvelle architecture de viewport ou nouvelle interaction utilisateur ;
- focus composant ou zoom local ;
- rotation, miroir ou transformations ;
- refonte de la Component Library ;
- refonte Toolbar/Menu/Inspector ;
- nouveau backend de rendu ;
- régénération ou agrandissement des assets ;
- modification du solveur, de la connectivité ou de la sémantique électrique ;
- réarchitecture générale de la simulation sans nécessité démontrée par les mesures.

### Niveau de liberté
`CONCEPTION`, sous respect du Blueprint `MB-VIS-CANVAS-051-blueprint` et des invariants CSA.

### Performances attendues
Le ticket doit démontrer une réduction mesurable du travail inutile associé aux changements haute fréquence, ou documenter honnêtement l’absence de gain si une autre contrainte dominante est démontrée. Aucun seuil arbitraire de FPS ne doit être inventé ; la comparaison doit utiliser la même procédure, le même circuit représentatif et les mêmes scénarios avant/après.

### Livrables attendus
`CODE`, `TESTS`, `DOCUMENTATION`, `PERFORMANCE EVIDENCE`.

## D. CONTRAT DE VALIDATION

### Critères d'acceptation
1. Une mise à jour de state haute fréquence n’invalide plus inutilement les consommateurs stables lorsque ceux-ci n’en dépendent pas.
2. Le drag reste fonctionnel et visuellement continu.
3. Le pan reste fonctionnel et visuellement continu.
4. Le marquee reste fonctionnel sans perte de sélection ou de feedback.
5. Le déplacement et la prévisualisation des waypoints restent corrects.
6. Le drag et le feedback Breadboard restent corrects.
7. Les fils continuent de suivre les previews nécessaires sans artefact de synchronisation.
8. La simulation active conserve ses mises à jour fonctionnelles et son état de runtime.
9. Le Document reste la source de vérité et n’est pas muté à chaque frame d’un preview ou de la navigation.
10. L’historique métier reste inchangé par les opérations de preview/navigation et conserve son contrat existant.
11. Aucun changement de comportement de 049 ou 050 n’est introduit par le refactor.
12. Les tests dédiés au mécanisme d’isolation et les tests fonctionnels associés sont verts.
13. Une mesure navigateur reproductible sur au moins 100 composants montre le comportement avant/après selon un protocole identique.
14. Les résultats de mesure sont documentés sans confondre observations et hypothèses.
15. `tsc --noEmit`, build et `git diff --check` restent propres.
16. La preuve navigateur ne montre pas de dégradation d’interaction sur les scénarios représentatifs.

### Conditions de refus
- optimisation reposant uniquement sur une assertion qualitative non mesurée ;
- perte de cohérence entre preview, composants, fils ou breadboard ;
- mutation du Document réintroduite à haute fréquence pour gagner en fluidité ;
- régression de la simulation ou de l’historique ;
- changement des invariants du viewport sans décision CSA dédiée ;
- optimisation limitée à un seul composant alors que le problème est transversal ;
- modification de 052 ou d’un autre ticket futur dans le même changement.

### Preuves attendues
Logs de tests, mesure avant/après sur 100+ composants, protocole de mesure reproductible, typecheck, build, `git diff --check`, preuve navigateur et résumé des fichiers touchés.

## E. CONTEXTE STRATÉGIQUE

### Justification de priorité
Le ticket constitue la troisième fondation de la phase Canvas. Il réduit le coût de propagation de l’état haute fréquence avant l’introduction du focus/local zoom et des interactions de présentation plus riches.

### Ticket bloquant
`MB-VIS-CANVAS-050` — DONE / CLOS.

### Tickets bloqués
`MB-VIS-CANVAS-052` et les capacités de la séquence EXP3 qui dépendent de la stabilité du Canvas.

## F. GESTION PMO

- Date de création : `2026-09-05`
- Cycle PMO : `VALIDÉ → EN COURS` uniquement après CSA GO.
- Statut actuel : `PRÊT POUR IMPLÉMENTATION`.

## G. DÉCISION CSA

Le ticket impose le résultat de performance, les invariants et les preuves, mais ne prescrit pas le découpage technique exact. Le mécanisme concret d’isolation relève du Blueprint et de la conception d’implémentation.

## H. TRACE

Blueprint : `docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md`
Autorité : `docs/pmo/delivery-reports/MB-VIS-CANVAS-051-authority.md`
Séquence maître : `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`

## I. SOURCES DE CADRAGE

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-050.md`
- `docs/pmo/delivery-reports/MB-VIS-CANVAS-050-delivery-report.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md`
