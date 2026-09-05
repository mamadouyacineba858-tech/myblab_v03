# MB-VIS-CANVAS-051 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-VIS-CANVAS-051-blueprint` |
| Ticket-ID | `MB-VIS-CANVAS-051` |
| Commit analysé | `53cac55a0e8f8f951a51e17ca721dc2bf7f1399f` |
| Date de production | `2026-09-05` |
| Auteur | `CSA / ChatGPT — audit commit-spécifique` |
| Statut | `PRÊT_POUR_CONCEPTION` |

## B. SYNTHÈSE POUR L’AGENT D’IMPLÉMENTATION

MB-VIS-CANVAS-051 traite un problème transversal de performance d’interaction : l’état de drag/preview/navigation est aujourd’hui porté dans le même arbre de state que le Document et exposé par un Context global. À chaque mise à jour haute fréquence d’un preview de drag, le hook central se ré-exécute et la valeur du Context est reconstruite, ce qui force les consommateurs du laboratoire à réévaluer leur rendu même lorsqu’ils ne dépendent pas de l’état qui vient de changer.

Le ticket doit isoler les chemins haute fréquence des chemins stables, réduire le fan-out de rendu pendant les interactions, puis qualifier le résultat dans le navigateur sur un circuit d’au moins 100 composants.

La priorité architecturale est l’isolation, pas l’optimisation prématurée d’une opération métier particulière.

## C. TERRAIN ACTUEL — [FAIT]

### C1 — Source de state centrale

`frontend/src/hooks/useCircuitState.js` possède simultanément :
- le Document React (`components`, `wires`, `breadboard`) ;
- sélection et élément actif ;
- simulation ;
- viewport (`zoom`, `translateX`, `translateY`) ;
- états haute fréquence tels que `dragPreview`, `waypointPreview`, `marqueeRect`, `breadboardFeedback`, `breadboardInsertPreview` ;
- références et fonctions de mutation/interaction.

Le même hook calcule également des dérivés lourds ou structurants (`safeComponents`, `componentsForRender`, `wirePaths`, `connectedPins`, `pinSignals`, etc.).

### C2 — Context global

`frontend/src/context/CircuitContext.jsx` appelle `useCircuitState()` puis expose la valeur complète via un unique `CircuitContext.Provider`. `frontend/src/context/useCircuit.js` est un simple accès à ce Context ; il n’existe pas de séparation actuelle entre state de Document, state d’interaction et state de viewport.

### C3 — Fan-out de consommateurs

`SimulationCanvas.jsx`, `CircuitComponent.jsx` et `WiresLayer.jsx` consomment le Context global. `CircuitComponent.jsx` ne possède pas de mécanisme de mémorisation de composant au niveau du wrapper ; il lit notamment sélection, pinSignals et plusieurs fonctions d’interaction depuis le Context.

`WiresLayer.jsx` consomme également le Context pour les données de sélection, wires, signaux et interactions waypoint.

Le dépôt ne présente pas, au niveau observé dans ce ticket, de stratégie générale déjà établie de découpage des contextes ou de sélecteurs permettant à un consommateur de s’abonner uniquement à une tranche de state.

### C4 — État haute fréquence pendant le drag

Le drag de composant utilise `dragPreview` comme état de présentation pendant l’interaction. Le waypoint drag utilise `waypointPreview`. Le marquee met à jour `marqueeRect`. Ces états sont volontairement exclus du Document métier, mais ils vivent néanmoins dans `useCircuitState`, donc un changement d’un de ces états réexécute le hook central et reconstruit sa valeur contextuelle.

Le pan 050 a également introduit `viewport` comme state de navigation dans ce même hook. Le pan met à jour `viewport` pendant le déplacement ; le hook central est donc lui aussi sollicité à chaque évolution de navigation.

### C5 — Dérivations sensibles

`wirePaths` est dérivé de `componentsForRender` et `wiresForGeometry`. `componentsForRender` dépend de `dragPreview`. Ainsi, pendant un drag, la géométrie des fils est volontairement recalculée pour suivre le preview visuel.

`pinSignals` dépend de plusieurs états du hook et peut recalculer la simulation lorsque celle-ci est active.

Ces calculs sont légitimes fonctionnellement, mais leur voisinage avec l’état haute fréquence augmente le risque de travail inutile pour les consommateurs qui n’ont pas besoin du changement courant.

### C6 — Invariants Document déjà établis

Le drag de composant utilise un preview de présentation et ne mute le Document réel qu’au relâchement via le canal de mutation historisé. Le pan et le zoom 050 sont également du state de viewport et ne créent pas d’entrée Undo/Redo métier.

Ces invariants sont à conserver : l’optimisation ne doit pas revenir à muter directement le Document à chaque frame.

### C7 — Repository / architecture de rendu

`SimulationCanvas.jsx` applique une transformation unique au niveau de la couche de zoom. Les composants, pins, fils et breadboard ne possèdent pas de moteur de rendu parallèle introduit pour la performance par les tickets précédents.

## D. ANALYSE ARCHITECTURALE — [ANALYSE]

### D1 — Problème principal

Le principal risque de performance observé n’est pas encore la complexité mathématique d’une fonction isolée ; c’est le **fan-out de réévaluation** induit par un Context global qui mélange state stable et state haute fréquence.

Pendant un drag/pan/marquee, une modification locale peut donc provoquer la réévaluation d’une large partie du laboratoire, même lorsque la majorité des consommateurs n’a besoin ni de la position courante ni du preview.

### D2 — Décision architecturale recommandée

Le ticket doit introduire une séparation claire entre au minimum :

```text
STATE STABLE / DOCUMENT
        │
        ├── composants
        ├── wires
        ├── breadboard
        ├── simulation
        └── sélection métier

STATE HAUTE FRÉQUENCE
        │
        ├── drag preview
        ├── waypoint preview
        ├── marquee en cours
        ├── feedback de drag
        └── navigation viewport en mouvement
```

L’objectif est que les mises à jour d’un sous-ensemble haute fréquence n’invalident pas automatiquement tous les consommateurs du laboratoire.

Le mécanisme concret reste libre dans la limite du contrat du Ticket : découpage de Contexts, sous-contextes spécialisés, store/selectors ou autre mécanisme React équivalent déjà compatible avec le dépôt.

### D3 — Principe de stabilité des références

Les fonctions et objets exposés à des consommateurs peu volatils doivent conserver des identités stables lorsque leurs dépendances fonctionnelles n’ont pas changé. La réduction du fan-out ne doit pas être annulée par la reconstruction systématique d’objets/fonctions à chaque frame.

### D4 — Mémoïsation et composants

Une stratégie de mémorisation des wrappers de rendu peut devenir pertinente si elle est adossée à un découpage correct des props/state. Elle ne doit pas servir de cache superficiel autour d’un Context global qui continue à notifier tout le monde à chaque frame.

### D5 — Calculs dérivés

`wirePaths` doit continuer à refléter le preview de drag lorsque celui-ci existe. Il n’est donc pas demandé de supprimer ces recalculs nécessaires ; il faut plutôt empêcher leur propagation vers des consommateurs qui n’en dépendent pas.

`pinSignals` et la simulation ne doivent pas être recalculés simplement parce qu’un état de navigation ou de preview visuel évolue lorsqu’ils n’en dépendent pas fonctionnellement.

### D6 — Pan / viewport

Le viewport 050 est un état d’interaction haute fréquence. Le ticket 051 ne doit pas revenir sur son architecture fonctionnelle, mais doit s’assurer que ses mises à jour ne deviennent pas une raison de rerender de tout le laboratoire sans nécessité.

### D7 — Une seule interaction reste active

L’isolation de performance ne doit pas créer plusieurs machines d’interaction concurrentes. Les gardes existantes pour drag, marquee, waypoint, breadboard et pan restent la référence comportementale.

## E. MESURE À PRODUIRE — [ANALYSE]

Le ticket doit passer d’une appréciation qualitative de performance à une qualification reproductible.

La preuve minimale attendue doit inclure, dans le navigateur réel :

1. un circuit représentatif d’au moins 100 composants ;
2. un scénario de drag continu d’un composant ;
3. un scénario de pan continu ;
4. une mesure avant/après du coût de rendu ou du nombre de réévaluations/renders observables par seconde, avec la même procédure ;
5. une conclusion factuelle sur le gain ou l’absence de gain ;
6. une vérification que les comportements 049/050 restent corrects pendant cette charge.

Le protocole de mesure exact peut rester libre, mais il doit être reproductible et décrire clairement la procédure, l’échelle de circuit, le scénario et la comparaison.

## F. RISQUES — [ANALYSE]

1. **Sur-isolation** : créer tellement de contextes/stores qu’un flux simple devient plus difficile à raisonner et à tester.
2. **Stale state** : déplacer une information dans une ref/store sans traiter correctement la synchronisation avec le rendu.
3. **Perte de cohérence visuelle** : casser le suivi des fils, pins, breadboard ou preview pendant un drag.
4. **Simulation involontairement découplée** : empêcher une mise à jour nécessaire de `pinSignals` ou du runtime.
5. **Régression historique** : transformer par erreur une interaction unique en plusieurs mutations.
6. **Optimisation non démontrée** : modifier l’architecture sans preuve de réduction du travail de rendu.

## G. TESTS À PRÉVOIR — [ANALYSE]

Les tests doivent couvrir au minimum :

- isolation du state haute fréquence par rapport au Document stable ;
- changement de preview sans mutation Document ;
- pan/viewport sans mutation Document ;
- conservation de `wirePaths` lorsque le preview doit suivre le drag ;
- absence de recomputation de dérivés non concernés lorsque possible ;
- drag/marquee/waypoint/Breadboard après refactor ;
- simulation active sans régression de `pinSignals` ;
- sélection et History inchangés ;
- seuil 100+ composants avec preuve navigateur ;
- absence de fuite/listener supplémentaire pendant les interactions répétées.

Le test doit porter sur le mécanisme réellement choisi par l’implémentation, pas uniquement sur une fonction d’utilité isolée.

## H. PÉRIMÈTRE RECOMMANDÉ — [ANALYSE]

### Inclus
- isolation du state haute fréquence ;
- réduction du fan-out de rendu pendant drag/pan/marquee/waypoint ;
- stabilisation des références nécessaires ;
- adaptation minimale des composants consommateurs ;
- tests de rendu/rerender et tests fonctionnels nécessaires ;
- protocole de mesure 100+ composants ;
- preuve navigateur ;
- documentation du résultat.

### Exclus
- nouvelle fonctionnalité utilisateur hors performance ;
- nouveau système de viewport ;
- local zoom/focus composant de 052 ;
- refonte Toolbar/Library/Inspector ;
- nouveau backend de rendu ;
- changement des assets ;
- modification du solveur/connectivité ;
- réarchitecture complète du moteur de simulation sans preuve qu’elle est indispensable au problème ciblé.

## I. QUESTION OUVERTE — [QUESTION OUVERTE]

Aucune question ouverte bloquante identifiée pour la conception.

Le mécanisme concret d’isolation reste volontairement une liberté de conception, sous réserve des invariants du Blueprint et du Ticket.

## J. CRITÈRES ARCHITECTURAUX DE SORTIE

Le Blueprint sera considéré respecté lorsque :

- le state haute fréquence n’entraîne plus une invalidation globale injustifiée ;
- les consommateurs stables du laboratoire ne réévaluent plus inutilement à chaque frame d’interaction ;
- le Document reste la source de vérité ;
- les previews restent Presentation-only ;
- les fils suivent encore les previews nécessaires ;
- la simulation conserve son comportement ;
- les gardes d’interaction restent intactes ;
- le gain est démontré par une mesure browser reproductible à 100+ composants ;
- aucun changement de 052 ou autre ticket futur n’est embarqué.

## K. SOURCES

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-049.md`
- `docs/pmo/delivery-reports/MB-VIS-CANVAS-049-delivery-report.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-050.md`
- `docs/pmo/delivery-reports/MB-VIS-CANVAS-050-delivery-report.md`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/context/CircuitContext.jsx`
- `frontend/src/context/useCircuit.js`
- `frontend/src/canvas/SimulationCanvas.jsx`
- `frontend/src/canvas/CircuitComponent.jsx`
- `frontend/src/wires/WiresLayer.jsx`

## L. GO DE CONCEPTION

**CSA — Blueprint prêt pour production du Ticket PMO.**
