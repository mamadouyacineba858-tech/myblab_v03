# MB-BREADBOARD-001 — Breadboard Connectivity & Assembly Model

**PMO Status:** CADRAGE ARBITRÉ (2026-08-25) — Blueprint autorisé, implémentation TOUJOURS NON autorisée
**Phase:** 2 — Physical Assembly (Vague P2-4, GAP-04)
**Blueprint:** à produire — `docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md` (n'existe pas encore)
**Prerequisite:** `docs/roadmaps/PHASE2_LEVEL1_EXECUTION_ROADMAP.md` §5 (GAP-04) et §6 (Vague P2-4) ; `docs/roadmaps/PHASE2_CONTROL_FRAMEWORK.md` §9 (graphe de dépendances : SIMULATION → BREADBOARD CONNECTIVITY → EMBEDDED END-TO-END) et §14 (« Breadboard : modèle avant décor »)
**Implementation scope:** aucun — ce document est le ticket de cadrage lui-même ; aucune ligne de code n'est autorisée par ce document

---

## A. Objective

Définir le **modèle logique de connectivité et d'assemblage** d'un breadboard — pas sa seule apparence — avant toute implémentation, conformément à `PHASE2_CONTROL_FRAMEWORK.md` §14 : *« Une simple grille visuelle ne constitue pas la capacité Level 1. »*

MB-BREADBOARD-001 doit répondre, pour un breadboard V1, aux neuf questions posées par §14 (rails, groupes électriquement connectés, insertion/retrait, règles de connectivité, relation position/connectivité, impact Document, impact Simulation, erreurs de montage, instrumentation) et produire les critères d'acceptation qui rendront un futur ticket d'implémentation vérifiable — exactement comme `MB-OBS-001` a défini le contrat d'observation avant que `MB-MEASURE-001` ne construise un instrument.

Ce ticket ne construit **aucune** interface de breadboard.

## B. État technique de référence (constat, pas proposition)

Le modèle actuel du Document est un canevas libre, pas un breadboard :

1. **Position des composants** — `document.components[]` : `{ id, type, position: { x, y }, parameters }` (`AddComponentHandler.js`). La position est un point libre en pixels, alignée uniquement sur une grille générique de 20 px (`GRID_SIZE`, `frontend/src/utils/grid.js`) inspirée de la grille visuelle Tinkercad — pas une grille de trous de breadboard avec sémantique de rangée.
2. **Connectivité** — entièrement explicite et portée par les wires. `document.wires[]` relie deux pins nommément (`pinA: {componentId, pinId}`, `pinB: {...}`). Les réseaux électriques (« nets ») sont reconstruits à chaque validation par composantes connexes (Union-Find) **uniquement à partir des wires** (`frontend/src/core/validation/rules/shared/nets.js`, `buildNets()`), sans aucun état persistant de connectivité en dehors des wires eux-mêmes (contrat CF4 — ELE-007, cité dans le fichier).
3. **Pins** — chaque composant expose ses pins individuellement, rendues comme boutons cliquables positionnés en `{left, top}` relatifs au composant (`frontend/src/canvas/Pin.jsx`). L'utilisateur relie deux pins par un clic-clic explicite ; rien ne connecte deux pins par simple proximité ou alignement spatial.
4. **Aucune entité breadboard n'existe dans le dépôt** — confirmé par recherche exhaustive (`grep -ri breadboard` hors roadmap/documentation) : aucun fichier de modèle, de rendu ou de validation ne référence un breadboard.

Conclusion : le passage à un breadboard n'est pas un habillage visuel du modèle existant. Il introduit un **second mode de connectivité implicite** (position → connexion électrique sans wire) qui n'a aujourd'hui aucun équivalent dans le Document ni dans `buildNets()`. C'est précisément le risque que §14 désigne par « ne pas construire une breadboard purement décorative » (§21, Journal STOP).

## C. Architectural Contract

```text
SIMULATION (existant, stable)
      ↓
BREADBOARD CONNECTIVITY MODEL   ← ce ticket définit ce niveau
      ↓
EMBEDDED END-TO-END (GAP-05, bloqué tant que ce niveau n'est pas défini)
```

Le breadboard est un **modèle de connectivité et d'assemblage**, avec une projection visuelle Presentation au-dessus. Le modèle de connectivité doit exister et être vérifiable indépendamment de tout rendu graphique.

## D. Questions structurantes — arbitrées par le CSA le 2026-08-25

Ces cinq points avaient été posés sans être tranchés unilatéralement par l'assistant (Article 21 — Absence d'architecture implicite). Le CSA (Project Lead) a rendu son arbitrage le 2026-08-25, en confirmant dans chaque cas l'option recommandée par le cadrage :

**Q1 — Unicité du breadboard.** **Décidé : un seul breadboard par Document en V1** (`document.breadboard` singulier). L'extension à plusieurs breadboards juxtaposables reste possible dans un futur lot sans rupture de schéma.

**Q2 — Coexistence avec le canevas libre.** **Décidé : coexistence.** Le câblage point-à-point actuel (wires libres) reste utilisable en V1 en parallèle du breadboard — aucune régression du workflow existant ; utile pour relier le breadboard à un module externe. La migration vers un workflow de montage crédible reste progressive, conformément à la Vague P2-4.

**Q3 — Mécanisme de fusion des nets.** **Décidé : extension additive de `buildNets()`.** Les rangées/rails de breadboard sont traduits en « wires virtuels » consommés tels quels par l'Union-Find existant, sans le modifier. Le contrat CF4 — ELE-007 (« reconstruit à chaque appel de règle, à partir des wires uniquement ») est préservé et étendu, pas contredit.

**Q4 — Pas de la grille de trous.** **Décidé : constante dédiée**, représentant fidèlement l'espacement réel 0,1″ d'un breadboard physique — découplée de `GRID_SIZE = 20` (grille visuelle générique du canevas libre). Choix motivé par la fidélité scientifique (Valeur 3 de la Vision MYBlab).

**Q5 — Insertion partielle / entre-jambes.** **Décidé : hors périmètre V1.** V1 se limite aux composants à 2 broches (résistance, LED, câble de liaison). Les composants à empattement large (circuits intégrés à cheval sur la rainure centrale) sont reportés à un lot ultérieur, pour ne pas alourdir les règles de connectivité/erreurs de montage du premier périmètre.

## E. Modèle de domaine proposé (base de travail du Blueprint, implémentation toujours non autorisée)

Conformément à l'arbitrage §D (un seul breadboard, coexistence avec le câblage libre, fusion additive dans `buildNets()`, pas dédié 0,1″, composants 2 broches uniquement en V1), la structure suivante sert de point de départ au futur Blueprint — **elle n'a toujours aucune valeur d'autorisation d'implémentation, seule une rédaction de Blueprint est ouverte à ce stade** :

- **Rails d'alimentation** (haut/bas, `+`/`−`) : chaque rail est un groupe électriquement connecté sur toute sa longueur, indépendant des rangées de montage.
- **Rangées de montage** (« terminal strips ») : groupées par cinq trous de part et d'autre de la rainure centrale ; chaque groupe de cinq est électriquement connecté entre lui, isolé des groupes voisins et isolé de l'autre côté de la rainure.
- **Trou (hole)** : unité d'insertion, identifiée par une coordonnée `(rangée, colonne, côté)` ; c'est la seule interface par laquelle une patte de composant se connecte au breadboard.
- **Insertion/retrait** : une patte de composant insérée dans un trou rejoint le groupe électrique de ce trou ; son retrait la retire du groupe. Aucun état de connectivité ne doit survivre au retrait (cohérent avec le principe CF4 « reconstruit à chaque appel »).
- **Relation position ↔ connectivité** : contrairement au canevas libre actuel où la position est purement visuelle, la position sur breadboard **détermine** la connectivité — deux pattes dans le même groupe de cinq sont connectées sans wire explicite. C'est le changement de paradigme central que ce ticket doit documenter avant toute implémentation.

## F. Impact Document (à trancher par le Blueprint, encadré ici)

- Le Document devra pouvoir représenter : la présence d'un (ou plusieurs, cf. Q1) breadboard, sa position/orientation sur le canevas, et l'occupation de ses trous par des pattes de composants.
- Les commandes de mutation existantes (`ADD_COMPONENT`, `MOVE_COMPONENT`, `REMOVE_COMPONENT`, `UPDATE_COMPONENT`, `ADD_WIRE`, `UPDATE_WIRE_WAYPOINTS`) régies par CF3 devront soit être étendues, soit complétées par de nouvelles commandes gouvernées (ex. insertion/retrait de patte dans un trou) — **aucune nouvelle commande n'est autorisée par ce ticket** ; leur définition appartient au Blueprint puis à un futur ticket d'implémentation.
- Conformément à l'Article 17 (Source de vérité du domaine) de `MYBLAB-CONSTITUTION.md`, le Document/Core reste l'unique source de vérité de la topologie ; la représentation visuelle du breadboard ne doit jamais redéfinir cette vérité.

## G. Impact Simulation

- Le solveur ne doit pas être modifié par ce ticket ni par son Blueprint : le breadboard est une couche de **production de connectivité**, en amont de `buildNets()`, pas une modification de la résolution électrique elle-même.
- Toute extension de `buildNets()` (cf. Q3) doit préserver le contrat CF4 — ELE-007 déjà en vigueur pour la connectivité par wires.

## H. Erreurs de montage (à spécifier par le Blueprint)

Le Blueprint devra définir explicitement, au minimum : insertion à cheval sur la rainure centrale sans intention explicite, court-circuit rail `+`/`−` par insertion erronée, patte insérée hors grille de trous valide, composant partiellement inséré (une seule patte connectée). Aucune de ces règles n'est tranchée par le présent ticket.

## I. Instrumentation

Les instruments existants ou futurs (contrat `MB-OBS-001`, `MB-MEASURE-001`) doivent pouvoir observer un nœud électrique de breadboard exactement comme un nœud de canevas libre — le breadboard ne doit pas introduire une seconde frontière d'observation. Ceci est une contrainte de compatibilité, pas une implémentation autorisée par ce ticket.

## J. Responsibilities

### Simulation
Inchangé : résolution physique/logique, conventions existantes. Ne connaît pas la notion de breadboard.

### Document / Core
Source de vérité de la topologie, y compris — si Q1/Q2 le confirment — de l'état d'occupation des trous de breadboard.

### Presentation
Rendu visuel du breadboard (rails, rangées, trous, composants insérés). Ne doit jamais devenir une seconde source de connectivité (Article 16, Constitution).

## K. Required Evidence (pour le Blueprint et le futur ticket d'implémentation, pas pour ce document)

Ce ticket de cadrage lui-même n'a pas de preuve d'implémentation à produire. Il doit cependant lister ce que le Blueprint devra couvrir avant qu'un GO d'implémentation soit envisageable :

1. Réponse explicite aux cinq questions CSA (§D).
2. Schéma de données du breadboard (rails, groupes, trous) et son articulation avec `document.components`/`document.wires`.
3. Algorithme de fusion breadboard → nets, compatible avec `buildNets()` et le contrat CF4 — ELE-007.
4. Liste exhaustive des nouvelles commandes de mutation gouvernées (le cas échéant) et de leurs invariants CF3.
5. Liste des erreurs de montage détectables et leur statut (bloquant / avertissement).
6. Scénario de preuve end-to-end minimal : composant inséré → net breadboard formé → simulation inchangée → observation correcte via le contrat `MB-OBS-001` existant.

## L. Allowed Files / Scope Rule

Ce ticket de cadrage n'autorise la création/modification que de :

- lui-même (`docs/pmo/tickets/MB-BREADBOARD-001.md`) ;
- le futur Blueprint (`docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md`), une fois les questions §D arbitrées par le CSA.

**Aucun fichier de code source (`frontend/src/**`) n'est autorisé par ce document.**

## M. Explicit Non-Goals

Ce ticket, et le Blueprint qui en découlera avant tout GO d'implémentation, NE DOIVENT PAS :

- écrire une seule ligne de code d'implémentation ;
- introduire une nouvelle commande CF3 sans qu'elle soit explicitement listée et justifiée dans le Blueprint ;
- modifier `buildNets()`, le solveur, ou toute règle de validation existante ;
- construire un rendu visuel de breadboard, même minimal ;
- traiter le rendu visuel comme suffisant pour clôturer GAP-04 (rappel explicite §21 du Control Framework : « ne pas construire une breadboard purement décorative ») ;
- préjuger de l'implémentation de GAP-05 (Embedded end-to-end), qui reste bloqué par ce ticket tant qu'il n'est pas clos.

## N. Acceptance Criteria (du cadrage lui-même)

**AC-01 — Constat technique de référence documenté**
L'état actuel du modèle de connectivité (canevas libre, wires explicites, `buildNets()`) est explicitement documenté avant toute proposition (§B).

**AC-02 — Questions structurantes explicitées**
Les cinq questions bloquantes (§D) sont formulées de façon vérifiable, avec leur impact identifié, sans être tranchées unilatéralement par un assistant.

**AC-03 — Couverture des neuf points §14**
Rails, groupes électriquement connectés, insertion/retrait, règles de connectivité, relation position/connectivité, impact Document, impact Simulation, erreurs de montage, instrumentation sont tous couverts par une section dédiée de ce document.

**AC-04 — Aucune implémentation**
Aucun fichier sous `frontend/src/` n'est créé ou modifié par ce ticket.

**AC-05 — Traçabilité de dépendance**
Le ticket référence explicitement sa position dans le graphe de dépendances (§9 du Control Framework) et ne prétend pas lever le blocage de GAP-05 (Embedded E2E).

## O. Dependencies

- `PHASE2_CONTROL_FRAMEWORK.md` §9, §14, §21 (autorité de cadrage).
- `PHASE2_LEVEL1_EXECUTION_ROADMAP.md` §5 (GAP-04), §6 (Vague P2-4).
- Modèle Document/Core existant (`AddComponentHandler.js`, `nets.js`, `grid.js`) comme référence de compatibilité, non comme contrainte figée.
- Contrat d'observation `MB-OBS-001` (compatibilité requise, cf. §I).

Aucune dépendance vers une bibliothèque externe, un moteur physique tiers, ou une 3D quelconque n'est introduite (réserve architecturale 3D, §18 du Control Framework — hors périmètre).

## P. Execution Protocol

1. Le CSA (Project Lead) tranche les cinq questions §D, ou mandate explicitement l'assistant pour instruire chacune avec des options motivées (comme cela a été fait pour les 4 points de gouvernance de l'Étape 5 précédente).
2. Une fois §D arbitré, rédaction du Blueprint technique détaillé (schéma de données, algorithmes, liste de commandes, scénarios d'erreur) — document séparé, pas une extension de ce ticket.
3. Revue du Blueprint par le CSA.
4. Rédaction d'un ticket d'implémentation dédié (ex. `MB-BREADBOARD-002` ou renumérotation à confirmer), avec Acceptance Criteria vérifiables et périmètre de fichiers autorisés, mirroring la structure de `MB-OBS-001.md`.
5. Ruling CSA explicite (GO/NO-GO) avant toute ligne de code.

## Q. CSA RULING

**STATUT : ARBITRAGE RENDU (2026-08-25) — GO POUR LA RÉDACTION DU BLUEPRINT UNIQUEMENT. NO-GO IMPLÉMENTATION MAINTENU.**

Le CSA (Project Lead) a arbitré les cinq questions §D le 2026-08-25, en confirmant dans chaque cas l'option recommandée par le cadrage (un seul breadboard, coexistence avec le câblage libre, fusion additive dans `buildNets()`, pas de grille dédié 0,1″, composants 2 broches uniquement en V1).

Ce ruling autorise exactement l'étape 2 du Protocole d'exécution (§P) : la rédaction du Blueprint technique détaillé (`docs/pmo/blueprints/MB-BREADBOARD-001-breadboard-connectivity-blueprint.md`), sur la base du modèle de domaine §E et des arbitrages §D.

Il n'autorise **aucune** ligne de code (§L, §M inchangés). L'implémentation reste soumise à un ruling CSA distinct et ultérieur, après revue du Blueprint (étape 3 du Protocole d'exécution), conformément à l'Article 21 (Absence d'architecture implicite) de `MYBLAB-CONSTITUTION.md`.
