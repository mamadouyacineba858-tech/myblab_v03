# ROADMAP_PLATFORM.md

## 1. Objet

Cette roadmap définit la trajectoire de construction de la plateforme MYBlab à partir de la Vision 2030 et de l'architecture décrite dans PLATFORM_ARCHITECTURE.md.

Elle établit la hiérarchie :

**Vision → Piliers → Programmes → Épics → Tickets PMO**

La roadmap ne définit pas les mécanismes d'implémentation. Elle ne remplace ni le Tome I, ni le Tome II, ni les ADR, ni les spécifications PMO.

Elle définit les grandes unités de progression, leurs dépendances, leurs priorités et leurs jalons.

### 1.1 Trajectoire stratégique de l'expérience MYBlab

L'évolution de l'expérience utilisateur et de la représentation des circuits suit une trajectoire stratégique en trois niveaux. Cette trajectoire constitue une orientation durable de la plateforme et doit guider les futurs Épics et Tickets PMO sans devenir elle-même un mécanisme d'implémentation.

```text
MYBlab actuel
     ↓
NIVEAU 1 — Atteindre le niveau Tinkercad
     ↓
NIVEAU 2 — Dépasser Tinkercad
     ↓
NIVEAU 3 — Tendre vers un laboratoire électronique virtuel
           avancé, réaliste, immersif et extensible
```

**Tinkercad est un benchmark intermédiaire, pas la destination finale de MYBlab.**

Le niveau 1 vise notamment à atteindre un niveau de référence en matière de :

* qualité et cohérence de la représentation des composants ;
* manipulation et expérience du canvas ;
* câblage et assemblage des circuits ;
* breadboard, cartes et composants usuels ;
* cohérence générale de l'environnement de travail.

Le niveau 2 vise à identifier puis construire les capacités par lesquelles MYBlab pourra dépasser ce benchmark, en privilégiant les capacités qui apportent une valeur propre à la plateforme plutôt qu'une simple reproduction de fonctionnalités existantes.

Le niveau 3 constitue la direction d'évolution à long terme vers un véritable laboratoire électronique virtuel, notamment :

* représentation physique et réalisme avancés ;
* environnement de laboratoire immersif ;
* composants et assemblages complexes ;
* instrumentation et observation des phénomènes ;
* visualisation avancée des états de simulation ;
* interaction spatiale et, lorsque l'architecture le permettra, représentation 3D ;
* intégration cohérente entre expérience, simulation et apprentissage.

Les références externes utilisées pour éclairer cette trajectoire sont des **benchmarks et sources d'inspiration**, et non des spécifications à reproduire. Elles comprennent notamment Tinkercad pour le premier seuil de référence, les références vidéo fournies pour le niveau de réalisme et d'immersion recherché, ainsi que des plateformes telles que Wokwi, LogixSim 3DLab et ExoSynk pour certaines dimensions de simulation, de laboratoire virtuel et d'instrumentation.

### 1.2 Principe de continuité stratégique

Cette trajectoire doit rester visible dans la roadmap même lorsque les travaux immédiats portent sur des fondations, de la gouvernance, du Core, de la Simulation ou d'autres dépendances.

Les futurs tickets ne doivent donc pas être évalués uniquement selon leur valeur locale. Ils doivent également être examinés selon leur contribution à la trajectoire :

**Atteindre Tinkercad → Dépasser Tinkercad → Laboratoire virtuel MYBlab avancé.**

Cette orientation ne constitue pas une autorisation d'implémenter immédiatement une architecture 3D ou une fonctionnalité particulière. Toute évolution architecturale nécessaire devra suivre les règles de gouvernance, les ADR et le cycle PMO appropriés.

---

## 2. Gouvernance de référence

La roadmap s'appuie sur quatre niveaux documentaires complémentaires :

| Niveau | Référence | Rôle |
| --- | --- | --- |
| Vision | Tome I — Vision 2030 | Définit la direction, les valeurs, principes et piliers |
| Architecture | Tome II — PLATFORM_ARCHITECTURE.md | Définit les couches, sous-systèmes, responsabilités et invariants |
| Roadmap | ROADMAP_PLATFORM.md | Définit l'ordre de construction, les programmes, épics, dépendances et jalons |
| PMO | docs/pmo/ | Transforme les épics en travaux exécutables et contrôlés |

Un Épic de cette roadmap peut donner naissance à plusieurs Tickets PMO. Un Ticket PMO ne doit pas introduire une responsabilité architecturale absente du Tome II.

### 2.1 Prérequis de gouvernance

La fusion de la branche documentaire docs/vision-2030 dans main constitue un prérequis de gouvernance avant l'ouverture d'une nouvelle génération de Tickets PMO fondés sur cette roadmap.

Cette fusion ne constitue pas un Épic fonctionnel de la plateforme. Elle établit simplement que la Vision 2030 et l'Architecture de référence sont disponibles sur la branche principale du projet.

Les artefacts historiques ou périmés identifiés pendant cette transition restent des objets de gouvernance documentaire distincts et ne sont pas automatiquement réécrits dans le cadre de cette roadmap.

---

## 3. Structure des Programmes

La plateforme est organisée en sept Programmes, alignés sur les frontières architecturales du Tome II.

| Programme | Périmètre principal |
| --- | --- |
| **Core Foundation** | Document, Mutation, Validation, Registry et frontières du Core |
| **Simulation** | Simulation et évolution du moteur de calcul |
| **Embedded Systems** | Embedded Runtime et exécution des comportements embarqués |
| **Experience** | Presentation et restitution utilisateur |
| **Knowledge & Learning** | Knowledge et Learning |
| **Ecosystem** | Plugin Loader et capacités d'extension |
| **Collaboration** | Project Synchronization et Collaboration |

Cette organisation respecte la séparation des responsabilités du Tome II. Un sous-système appartient à un Programme de référence unique, même lorsqu'il fournit des capacités utilisées par plusieurs autres Programmes.

---

# 4. Core Foundation

## 4.1 Objectif

Stabiliser les fondations métier du Core Layer afin que les autres Programmes puissent évoluer sur une représentation canonique, un canal de mutation contrôlé, un registre cohérent et une validation clairement séparée.

## 4.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| CF1 | Unification du Document | Partiel |
| CF2 | Migration et unification du ComponentRegistry | Partiel |
| CF3 | Formalisation du canal Mutation unique | Partiel |
| CF4 | Stabilisation de la Validation | PROPOSED / à formaliser |

### CF1 — Unification du Document

Établir une représentation canonique unique du projet et stabiliser la frontière entre le Document architectural et les couches qui le consomment.

### CF2 — Migration et unification du ComponentRegistry

Éliminer la dualité des registres existants et établir Registry comme catalogue déclaratif de référence.

L'ancien chantier **MB-SIM-001-B2** est considéré comme un antécédent historique de cet Épic. Il ne doit pas être recréé sous un autre Programme.

### CF3 — Formalisation du canal Mutation unique

Stabiliser Mutation comme unique canal d'évolution du Document et clarifier la gestion des états successifs et de la réversibilité.

### CF4 — Stabilisation de la Validation

Transformer la responsabilité architecturale de Validation en une capacité suffisamment stable pour servir de fondation aux consommateurs qui dépendent de résultats de validation.

L'ADR-010 reste une décision PROPOSED tant qu'une décision explicite ultérieure ne modifie pas son statut.

---

# 5. Simulation

## 5.1 Objectif

Faire évoluer le moteur de simulation depuis les capacités déjà établies vers une simulation temporelle et des comportements plus complets, tout en conservant la séparation architecturale définie par le Tome II.

## 5.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| SIM1 | Composants analogiques | Planifié |
| SIM2 | Scheduler / temps simulé | Planifié |
| SIM3 | Intégration du runtime embarqué avec le Scheduler et la Simulation | Planifié |

### SIM1 — Composants analogiques

Étendre les capacités de simulation aux composants analogiques nécessaires à l'évolution du moteur.

### SIM2 — Scheduler / temps simulé

Introduire la capacité architecturale nécessaire à l'évolution temporelle de la simulation.

### SIM3 — Intégration du runtime embarqué avec le Scheduler et la Simulation

Établir l'intégration entre la simulation temporelle et un runtime embarqué consommable par Simulation.

SIM3 ne constitue pas l'implémentation du runtime firmware réel. Il définit l'intégration nécessaire entre les deux domaines.

---

# 6. Embedded Systems

## 6.1 Objectif

Permettre l'exécution fidèle de comportements programmés dans le cadre du chemin de conception vers les systèmes embarqués.

## 6.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| EMB1 | Runtime firmware réel | Non commencé |
| EMB2 | Extension multi-cartes | Hors périmètre immédiat |

### EMB1 — Runtime firmware réel

Établir un runtime capable d'exécuter réellement le comportement programmé d'un système embarqué.

EMB1 est distinct de SIM3.

SIM3 traite l'intégration entre Simulation, Scheduler et runtime embarqué. EMB1 traite la capacité du runtime à exécuter un comportement firmware réel.

### EMB2 — Extension multi-cartes

Étendre le périmètre à plusieurs familles de cartes après stabilisation du premier cas d'exécution réel.

---

# 7. Experience

## 7.1 Objectif

Faire évoluer la restitution utilisateur sans déplacer dans Presentation des responsabilités appartenant au Core, à l'Execution ou aux autres sous-systèmes de l'Application Layer.

La trajectoire stratégique de l'expérience est définie en §1.1 : **atteindre le niveau Tinkercad, dépasser ce benchmark, puis tendre vers un laboratoire électronique virtuel avancé**. Les Épics Experience doivent contribuer à cette trajectoire sans transformer la roadmap en spécification d'implémentation.

## 7.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| EXP1 | Formalisation et clôture de MB-VIS-001 | Réalisé techniquement |
| EXP2 | Visualisation des fils | Non commencé |
| EXP3 | Parité visuelle composants & expérience — seuil Tinkercad | En cours de recalage |
| EXP4 | Dépassement du benchmark Tinkercad | Futur |
| EXP5 | Laboratoire virtuel avancé et immersif | Vision long terme |

### EXP1 — Formalisation et clôture de MB-VIS-001

Consolider la traçabilité PMO de la capacité déjà réalisée, sans refaire son implémentation.

### EXP2 — Visualisation des fils

Étendre la restitution graphique aux fils et connexions du circuit, dans le respect des responsabilités de Presentation.

### EXP3 — Parité visuelle composants & expérience — seuil Tinkercad

Construire, par itérations PMO contrôlées, le niveau de restitution visuelle et d'expérience nécessaire pour atteindre le benchmark Tinkercad. Les travaux couvrent notamment la cohérence géométrique et dimensionnelle des composants, le réalisme des matériaux et des broches, les états visuels, le canvas, le câblage, le breadboard, les cartes et la cohérence générale de l'environnement de travail.

La séquence historique V1→V22 ci-dessous est conservée à des fins de traçabilité, mais **elle n'est plus l'ordre opérationnel à suivre**. Plusieurs de ses éléments ont déjà été réalisés sous des tickets antérieurs ou ont été regroupés/reformulés après l'évolution réelle du dépôt.

### 7.2.1 — Séquence historique EXP3

| Séquence historique | Ticket historique | Finalité initiale | Statut après recalage |
| --- | --- | --- | --- |
| V1 | MB-VIS-RENDER-009 | Baseline visuelle et contrat de qualité de rendu | Historique / capitalisé |
| V2 | MB-VIS-LED-010 | LED réaliste niveau benchmark | Réalisé sous travaux antérieurs |
| V3 | MB-VIS-COMP-011 | Résistance réaliste et proportions physiques | Réalisé |
| V4 | MB-VIS-COMP-012 | Diodes et composants axiaux | Réalisé |
| V5 | MB-VIS-COMP-013 | Boutons et interrupteurs — mécanique et états | Réalisé sous MB-VIS-PROTOTYPE-008 |
| V6 | MB-VIS-COMP-014 | Condensateurs, inductances et passifs | Condensateur réalisé ; inductance à évaluer |
| V7 | MB-VIS-COMP-015 | Transistors et semi-conducteurs | À traiter dans la nouvelle séquence |
| V8 | MB-VIS-COMP-016 | Potentiomètres et capteurs | Potentiomètre restant ; LDR et thermistor réalisés |
| V9 | MB-VIS-COMP-017 | Buzzer, moteur et servo | Moteur réalisé ; buzzer et servo restants |
| V10 | MB-VIS-COMP-018 | RGB LED et variantes LED | À traiter |
| V11 | MB-VIS-COMP-019 | Arduino et cartes — rendu réaliste | À traiter |
| V12 | MB-VIS-COMP-020 | Pins, contacts et précision d'ancrage | À traiter transversalement |
| V13 | MB-VIS-WIRE-021 | Fils — géométrie, épaisseur, routage et jonctions | À traiter |
| V14 | MB-VIS-WIRE-022 | États électriques et restitution dynamique des fils | À traiter |
| V15 | MB-VIS-BREAD-023 | Breadboard — restitution visuelle de référence | À traiter |
| V16 | MB-VIS-BREAD-024 | Insertion, alignement et assemblage breadboard | À traiter |
| V17 | MB-VIS-CANVAS-025 | Canvas — grille, zoom, sélection, déplacement et snapping | À traiter |
| V18 | MB-VIS-CANVAS-026 | Profondeur, ombres et feedback d'interaction | À traiter |
| V19 | MB-VIS-STATE-027 | Système visuel des états de simulation | À traiter |
| V20 | MB-VIS-LAB-028 | Cohérence visuelle globale du laboratoire | À traiter |
| V21 | MB-VIS-QA-029 | Visual regression suite et verrouillage des rendus | À traiter |
| V22 | MB-VIS-TINKERCAD-030 | Audit comparatif MYBlab ↔ benchmark Tinkercad et gate de niveau 1 | Jalon final à renuméroter dans la séquence opérationnelle |

Cette table est un **historique de planification**, pas une liste de tickets à relancer. Un travail déjà réalisé ne doit pas être recréé sous un autre identifiant uniquement pour respecter l'ancienne numérotation.

### 7.2.2 — Nouvelle séquence opérationnelle EXP3

La séquence suivante constitue désormais la référence de planification opérationnelle pour le seuil Tinkercad. Elle a été recalée à partir de l'état réel du dépôt et des travaux déjà réalisés.

| Ordre | Ticket opérationnel | Objet | État | Dépendance principale |
| ---: | --- | --- | --- | --- |
| 0 | AUDIT-EXP3-001 | Audit global initial et recalage de la séquence | Réalisé | — |
| 1 | MB-VIS-COMP-031 | Buzzer réaliste | **PROCHAIN** | Baseline visuelle existante |
| 2 | MB-VIS-COMP-032 | Potentiomètre réaliste | Planifié | COMP-031 |
| 3 | MB-VIS-COMP-033 | RGB LED réaliste et états | Planifié | COMP-032 |
| 4 | MB-VIS-COMP-034 | Transistor NPN réaliste | Planifié | COMP-033 |
| 5 | MB-VIS-COMP-035 | Servo réaliste | Planifié | COMP-034 |
| 6 | MB-VIS-COMP-036 | Arduino / carte réaliste | Planifié | COMP-035 |
| 7 | MB-VIS-CONTACT-037 | Pins, contacts et précision d'ancrage | Planifié | Composants principaux stabilisés |
| 8 | MB-VIS-WIRE-038 | Fils — géométrie, épaisseur, routage et jonctions | Planifié | CONTACT-037 |
| 9 | MB-VIS-WIRE-039 | Fils — états électriques et restitution dynamique | Planifié | WIRE-038 + états disponibles |
| 10 | MB-VIS-BREAD-040 | Breadboard — restitution visuelle de référence | Planifié | CONTACT-037 + WIRE-038 |
| 11 | MB-VIS-BREAD-041 | Breadboard — insertion, alignement et assemblage | Planifié | BREAD-040 |
| 12 | MB-VIS-CANVAS-042 | Canvas — grille, zoom, sélection, déplacement, snapping | Planifié | BREAD-041 |
| 13 | MB-VIS-CANVAS-043 | Canvas — profondeur, ombres, feedback d'interaction | Planifié | CANVAS-042 |
| 14 | MB-VIS-STATE-044 | Système visuel des états de simulation | Planifié | WIRE-039 + composants à états |
| 15 | MB-VIS-LAB-045 | Cohérence visuelle globale du laboratoire | Planifié | 031–044 |
| 16 | MB-VIS-QA-046 | Visual regression suite et verrouillage des rendus | Planifié | LAB-045 |
| 17 | MB-VIS-TINKERCAD-047 | Audit comparatif MYBlab ↔ Tinkercad et gate de niveau 1 | Jalon | QA-046 |

### 7.2.3 — Périmètre de la nouvelle séquence

Les tickets `031` à `036` traitent les composants encore présents dans le catalogue réel mais dont le renderer n'a pas encore adopté le backend raster de référence. Le dépôt réel contient notamment `BuzzerPart`, `PotentiometerPart`, `RgbLedPart`, `NpnTransistorPart`, `ServoPart` et `ArduinoPart`; ils constituent donc une base concrète pour cette vague. La séquence ne suppose pas que chacun doit obligatoirement être rasterisé si un audit ciblé démontre qu'une autre représentation est supérieure, mais toute décision doit respecter le contrat visuel et le CSA GO.

Les tickets `037` à `045` passent ensuite des composants individuels aux capacités transversales : contacts, fils, breadboard, canvas, états et cohérence globale.

Le ticket `046` verrouille la non-régression visuelle et le ticket `047` constitue le gate de décision du Niveau 1.

### 7.2.4 — Règle de non-duplication

Un composant déjà validé techniquement et visuellement ne doit pas être réouvert uniquement parce qu'il apparaît encore dans la séquence historique V1→V22. Une réouverture exige un écart observable, une nouvelle exigence de qualité ou une décision CSA explicitement tracée.

---

### 7.3 Règles spécifiques de progression visuelle

1. **Audit global initial, puis contrôles ciblés** — un audit EXP3 complet est réalisé au démarrage de la nouvelle séquence et aux checkpoints majeurs. La clôture d'un ticket individuel utilise un contrôle de conformité ciblé et ne déclenche pas automatiquement un nouvel audit architectural complet.
2. **Audit anticipé si nécessaire** — un nouvel audit complet est déclenché uniquement lorsqu'un ticket révèle une divergence susceptible de modifier la séquence, le périmètre, les invariants ou la technologie de rendu.
3. **Amélioration visible** — chaque ticket visuel doit produire une amélioration observable de la qualité de restitution ou de l'expérience, sans sacrifier les invariants du Core.
4. **Réalisme compatible** — le réalisme doit rester compatible avec les performances, la maintenabilité et l'architecture retenue ; aucune architecture 3D n'est présupposée par EXP3.
5. **Contrats canoniques** — les dimensions, pins, états et autres métadonnées déclaratives existants doivent être réutilisés plutôt que dupliqués.
6. **Séparation fonctionnel / visuel** — la géométrie fonctionnelle, les identités de pins, connexions, hitboxes, sélection, drag, câblage et simulation restent des sources de vérité du Core/Presentation existant. Une amélioration visuelle ne doit pas modifier ces responsabilités pour obtenir un meilleur rendu.
7. **Qualité de référence** — les critères de comparaison avec Tinkercad portent sur la perception utilisateur, la cohérence, les proportions, le comportement visuel et la qualité d'interaction, pas sur une copie de code ou de mécanismes propriétaires.
8. **Contrat assets** — les nouveaux assets doivent respecter le contrat industriel déjà adopté : transparence, sujet isolé, variantes explicites lorsque nécessaires, formats et densités cohérents, poids maîtrisé, manifeste/intégrité lorsque requis par le protocole, et validation visuelle avant intégration.
9. **Tests et preuve navigateur** — chaque ticket visuel doit fournir les tests ciblés, le build/typecheck, `git diff --check` et une preuve navigateur reproductible couvrant les états pertinents, le zoom et la cohabitation avec le canvas/breadboard lorsque pertinent.
10. **CSA Visual GO** — aucun ticket visuel n'est considéré comme prêt à versionner tant que le CSA n'a pas validé le résultat visuel et la conformité au périmètre.
11. **Gate de niveau 1** — `MB-VIS-TINKERCAD-047` constitue le jalon de décision : le passage au niveau 2 doit être explicitement validé et tracé.
12. **Séquence opérationnelle de référence** — la table §7.2.2 remplace la séquence historique comme ordre de travail. L'historique reste conservé pour la traçabilité et ne doit pas être interprété comme une obligation de recréer des travaux déjà réalisés.

### 7.4 — Capitalisation de la trajectoire visuelle : MYBlab Physical/Realistic Visual Engine

Cette sous-section capitalise les enseignements des travaux visuels antérieurs et définit la continuité technologique d'EXP3 → EXP5. Elle ne constitue pas une autorisation d'introduire une technologie nouvelle sans validation CSA.

**Base expérimentale.** Un premier lot de renderers a été porté à un langage volumétrique SVG, puis plusieurs composants ont été migrés vers un backend raster réaliste. Ces travaux sont des étapes historiques valides et ne doivent pas être réécrits uniquement pour uniformiser les numéros de tickets.

**État réel actuellement capitalisé.** Le backend déclaratif raster est désormais utilisé par plusieurs composants : LED, RESISTOR, DIODE, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, BUTTON et BUTTON_LATCHING. Les assets correspondants sont présents dans `frontend/public/assets/components/` et suivent le contrat de production établi. Le registre de présentation reste déclaratif : les composants déclarent leur backend visuel via `visual.backend`, sans logique centrale spécifique par type.

**Nouvelle référence d'ambition.** Une référence visuelle de laboratoire électronique réaliste fournie par le CSA constitue la référence d'ambition artistique d'EXP3 → EXP5 : les composants doivent tendre à être perçus comme de véritables objets physiques (silhouettes crédibles, volume, matériaux différenciés, leads et connecteurs physiques, profondeur, ombres et éclairage cohérents, contact avec la surface, cohérence inter-composants et avec la breadboard). Comme Tinkercad, c'est un **benchmark d'ambition**, pas une spécification à reproduire pixel par pixel.

**Principe architectural absolu.** La géométrie fonctionnelle (position, dimensions canoniques, pins et leur identité, connexions, hitbox, sélection, drag, câblage, simulation) reste la source de vérité unique et ne doit pas être modifiée pour un objectif de rendu. La représentation visuelle doit pouvoir évoluer indépendamment.

**Trajectoire actuelle.**

```text
Travaux historiques / baseline
    ↓
Industrialisation du backend visuel déclaratif
    ↓
Vague composants restants : 031 → 036
    ↓
Contacts / fils : 037 → 039
    ↓
Breadboard : 040 → 041
    ↓
Canvas : 042 → 043
    ↓
États + cohérence : 044 → 045
    ↓
Visual regression : 046
    ↓
MB-VIS-TINKERCAD-047 — Gate Niveau 1
    ↓
EXP4 — Dépasser Tinkercad
    ↓
EXP5 — Laboratoire virtuel avancé et immersif
```

**Règle de technologie.** La technologie de rendu peut évoluer si les contraintes de qualité, performance, maintenabilité ou réalisme le justifient, mais aucun basculement architectural majeur n'est implicite dans les tickets `031` à `047`. Une décision de technologie nouvelle relève d'une analyse et, si nécessaire, d'une ADR avant intégration.

**Capitalisation obligatoire.** Les enseignements du protocole visuel existant restent obligatoires pour tous les composants suivants, notamment les phases d'audit, référence, asset, validation pixel, validation géométrique, intégration, suppression des artefacts wrapper, pins/câblage, breadboard, zoom, tests/build, CSA Visual GO et versionnage.

---

# 8. Knowledge & Learning

## 8.1 Objectif

Introduire progressivement la capacité de MYBlab à transformer des résultats techniques en compréhension, puis à adapter cette présentation à la progression de l'utilisateur.

## 8.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| KL1 | Premier mécanisme d'explication | Non commencé |
| KL2 | Premier mécanisme d'adaptation pédagogique | Non commencé |

### KL1 — Premier mécanisme d'explication

Établir Knowledge comme responsable de la production d'explications, diagnostics et annotations à partir de résultats qualifiés.

### KL2 — Premier mécanisme d'adaptation pédagogique

Établir Learning comme responsable de la décision de quelles informations pédagogiques produire et montrer selon la progression de l'utilisateur.

KL2 dépend de KL1.

---

# 9. Ecosystem

## 9.1 Objectif

Permettre l'extension contrôlée de MYBlab sans déplacer la responsabilité du catalogue des composants hors du Core.

## 9.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| ECO1 | Plugin Loader — première implémentation | Non commencé |
| ECO2 | Extension lifecycle | Non commencé |
| ECO3 | Contrat d'extension basé sur Registry | Non commencé |

### ECO1 — Plugin Loader

Établir le chargement et l'activation d'extensions déjà cataloguées par Registry.

Registry n'appartient pas à Ecosystem : il reste un sous-système du Core Layer et relève exclusivement de Core Foundation.

### ECO2 — Extension lifecycle

Structurer le cycle de vie des extensions après établissement du mécanisme de chargement.

### ECO3 — Contrat d'extension basé sur Registry

Établir la frontière contractuelle entre le catalogue déclaratif du Core et les extensions utilisables par la plateforme.

ECO1 dépend de CF2.

---

# 10. Collaboration

## 10.1 Objectif

Permettre le travail collectif autour d'un même projet sans dupliquer les responsabilités du Document ou de Project Synchronization.

## 10.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| COL1 | Project Synchronization — première implémentation | Non commencé |
| COL2 | Collaboration | Non commencé |

### COL1 — Project Synchronization

Établir la capacité de gérer les versions métier d'un projet, notamment la réplication, la résolution de conflits et la fusion.

COL1 dépend de CF1 et CF3.

### COL2 — Collaboration

Introduire les capacités de présence, commentaires, permissions, notifications et travail collectif.

COL2 dépend de COL1.

---

# 11. Graphe global de dépendances

Le graphe de référence est le suivant :

```text
CF1 - Document
 ├── CF2 - Registry ───── ECO1 ─ ECO2 ─ ECO3
 │       │
 │       └──── [porte d'intégration] ──── SIM1
 │
 └── CF3 - Mutation ───── COL1 ─ COL2

CF4 - Validation ────────── KL1 ─ KL2

SIM1 ─ SIM2 ─ SIM3
                     │
                     └── intégration Simulation / Embedded Runtime

EMB1 - Runtime firmware réel
 └── exécution du comportement firmware

EXP1 ───────────────────── EXP2 ───── EXP3 ───── EXP4 ───── EXP5
                              │
                              └── séquence opérationnelle §7.2.2 → MB-VIS-TINKERCAD-047
```

Ce graphe ne signifie pas que chaque Épic doit attendre la clôture complète de toutes ses dépendances pour commencer.

---

# 12. Règles de parallélisme

## 12.1 CF2 et SIM1

SIM1 peut progresser en parallèle de CF2 lorsque les capacités existantes permettent de poursuivre le travail.

Cependant, la stabilisation définitive de SIM1 doit passer par une **porte d'intégration avec le Registry canonique** établi par CF2.

Le parallélisme est donc autorisé.

Le contournement durable du Core ne l'est pas.

```text
CF2 ────────────────────────────────────────┐
                          ├──→ Porte d'intégration ───→ Simulation stabilisée
SIM1 ───────────────────────────────────────┘
```

Cette règle permet de préserver la vitesse d'avancement de Simulation sans créer une nouvelle dette architecturale.

## 12.2 SIM3 et EMB1

SIM3 et EMB1 sont deux Épics distincts.

**SIM3** porte l'intégration entre Scheduler, Simulation et runtime embarqué.

**EMB1** porte l'exécution réelle du firmware.

Aucun des deux ne doit absorber la responsabilité de l'autre.

---

# 13. Priorités

Les priorités sont établies selon six critères :

1. fondation architecturale ;
2. dépendances ;
3. risque ;
4. valeur pour MYBlab ;
5. état réel du code ;
6. cohérence avec la Vision 2030.

| Priorité | Domaine | Justification |
| --- | --- | --- |
| **P0** | Gouvernance | Établir la base documentaire commune avant une nouvelle génération de Tickets PMO |
| **P1** | Core Foundation | Stabiliser les fondations du Core Layer |
| **P1 parallèle** | Simulation | Exploiter l'avance existante sans attendre inutilement la totalité du Core |
| **P2** | Embedded Systems | Prolonger la simulation vers l'exécution embarquée réelle |
| **P3** | Knowledge & Learning | Introduire la compréhension et l'adaptation pédagogique |
| **P4** | Experience | Poursuivre la restitution après consolidation des fondations |
| **P5** | Ecosystem | Construire l'extensibilité sur un Registry stabilisé |
| **P6** | Collaboration | Construire la collaboration sur Document et Mutation stabilisés |

Les priorités ne constituent pas un calendrier. Elles indiquent un ordre stratégique de traitement.

---

# 14. Jalons

## J0 — Gouvernance stabilisée

Résultats attendus :

* Vision 2030 et Tome II disponibles sur `main` ;
* structure de roadmap officielle établie ;
* séparation Roadmap / PMO confirmée ;
* artefacts historiques identifiés sans confusion avec les références courantes.

## J1 — Fondations en construction

Résultats attendus :

* CF1 en progression ;
* CF2 en progression ;
* CF3 et CF4 engagés selon les dépendances ;
* SIM1 pouvant progresser en parallèle ;
* porte d'intégration Core/Simulation définie.

## J2 — Core canonique et Simulation intégrée

Résultats attendus :

* Document stabilisé ;
* Registry canonique stabilisé ;
* canal Mutation stabilisé ;
* Validation suffisamment stable ;
* Simulation raccordée au Core canonique ;
* SIM2 disponible ;
* décision d'intégration préparant SIM3.

## J3 — Runtime embarqué

Résultats attendus :

* SIM3 établi ;
* EMB1 réalisé ;
* frontière Simulation / Embedded Runtime stabilisée.

## J4 — Première boucle de connaissance

Résultats attendus :

* KL1 établi ;
* KL2 engagé ou établi selon les dépendances ;
* première boucle cohérente entre résultat technique, explication et adaptation.

## J5 — Écosystème et collaboration

Résultats attendus :

* ECO1 à ECO3 progressivement établis ;
* COL1 puis COL2 établis ;
* extensions et collaboration respectent les frontières du Tome II.

## J6 — Consolidation Experience

Résultats attendus :

* EXP1 formellement tracé ;
* EXP2 traité selon les capacités stabilisées du Core et de l'Execution ;
* cohérence globale de la restitution vérifiée.

## J7 — Seuil visuel Tinkercad

Résultats attendus :

* EXP3 réalisé selon la séquence opérationnelle §7.2.2 et les contrôles de conformité ;
* composants usuels, fils, breadboard, cartes et canvas atteignent un niveau de référence cohérent ;
* visual regression et critères de qualité visuelle verrouillés ;
* **MB-VIS-TINKERCAD-047** exécuté comme gate comparatif ;
* décision explicite de passage au Niveau 2 — Dépasser Tinkercad.

J7 est un jalon Experience. Il ne modifie pas à lui seul les responsabilités architecturales du Tome II.

---

# 15. Règles de gouvernance de la roadmap

### R1 — La roadmap ne remplace pas l'architecture

Une évolution architecturale doit être traitée dans le Tome II et/ou par une ADR appropriée avant d'être considérée comme une base stable de planification.

### R2 — Un Épic appartient à un Programme de référence

Un Épic ne doit pas être dupliqué dans plusieurs Programmes sous des noms différents.

### R3 — Les antécédents historiques ne sont pas recréés

Un ancien ticket ou chantier peut être rattaché à un Épic actuel comme antécédent sans être recréé artificiellement.

### R4 — Les détails d'implémentation restent hors de la roadmap

Les fichiers, fonctions, bibliothèques, APIs concrètes et choix technologiques relèvent des Tickets PMO, Blueprints, ADR et décisions d'implémentation appropriées.

### R5 — Les dépendances peuvent autoriser le parallélisme

Une dépendance architecturale ne signifie pas nécessairement une impossibilité de travailler en parallèle. Lorsqu'un parallélisme est autorisé, une porte d'intégration doit empêcher qu'une divergence temporaire devienne une architecture permanente.

### R6 — Les Tickets PMO dérivent des Épics

Un Ticket PMO doit pouvoir être rattaché sans ambiguïté à un Programme et à un Épic de cette roadmap.

### R7 — La roadmap reste révisable

Les priorités et jalons peuvent évoluer lorsque l'état réel du dépôt, une nouvelle décision architecturale ou une contrainte majeure le justifie. Toute modification significative doit toutefois rester traçable.

### R8 — La trajectoire Tinkercad est un benchmark, pas une spécification

Les Tickets EXP3 peuvent utiliser Tinkercad comme référence de qualité perçue et d'expérience, mais ne doivent pas copier son code, ses mécanismes propriétaires ou présumer une architecture identique. Le benchmark sert à mesurer un niveau cible ; l'architecture de MYBlab reste gouvernée par le Tome II et les ADR.

### R9 — Audit lourd initial, contrôle léger ensuite

Après un audit EXP3 global validé, les tickets individuels sont contrôlés par rapport à la matrice, au Blueprint, aux invariants, aux tests et aux preuves de livraison. Un nouvel audit global n'est requis qu'en cas de divergence significative ou à un checkpoint explicitement défini.

### R10 — Le dépôt réel est la source de vérité opérationnelle

La roadmap ne doit jamais imposer la répétition d'un travail déjà réalisé et validé dans le dépôt réel. Les identifiants historiques sont conservés pour la traçabilité, tandis que la séquence opérationnelle est recalée sur l'état réel du code, des assets, des tests et des artefacts PMO.

---

# 16. Traçabilité

La chaîne de référence est :

```text
MYBLAB_VISION_2030.md
        │
        ▼
PLATFORM_ARCHITECTURE.md
        │
        ▼
ROADMAP_PLATFORM.md
        │
        ▼
Épic
        │
        ▼
Ticket PMO
        │
        ▼
Execution Blueprint
        │
        ▼
Implémentation
        │
        ▼
Delivery Report
        │
        ▼
Audit architectural / contrôle de conformité
```

La roadmap constitue ainsi le niveau intermédiaire entre la décision stratégique, l'architecture permanente et l'exécution opérationnelle.

Elle ne doit ni descendre jusqu'au détail du code, ni remonter jusqu'à redéfinir la Vision.

---

# 17. État de référence

Cette version de ROADMAP_PLATFORM.md constitue la roadmap stratégique de référence du Programme Platform après recalage de l'EXP3 sur l'état réel du dépôt.

Le recalage conserve les identifiants historiques pour assurer la traçabilité, mais établit une nouvelle séquence opérationnelle explicite `MB-VIS-COMP-031` → `MB-VIS-TINKERCAD-047`.

Les travaux déjà réalisés — notamment LED, RESISTOR, DIODE, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, BUTTON et BUTTON_LATCHING — ne doivent pas être recréés uniquement pour satisfaire l'ancienne numérotation. Le catalogue réel de présentation confirme également l'existence des renderers encore candidats à la vague suivante, notamment Buzzer, Potentiometer, RGB LED, NPN Transistor, Servo et Arduino.

La nouvelle règle de pilotage est :

**Audit global initial → séquence stabilisée → ticket → contrôle ciblé → ticket suivant → checkpoint → audit global uniquement si nécessaire.**

Chaque ticket visuel conserve les exigences de Blueprint, invariants, limites de périmètre, tests, preuve navigateur et CSA Visual GO. Une modification architecturale ou technologique majeure reste soumise au Tome II et aux ADR appropriées.

La trajectoire stratégique demeure :

**Atteindre le niveau Tinkercad → Dépasser Tinkercad → Tendre vers un laboratoire virtuel MYBlab avancé, réaliste, immersif et extensible.**

Le prochain ticket opérationnel de la séquence EXP3 est désormais **`MB-VIS-COMP-031 — Buzzer réaliste`**, sous réserve du CSA GO spécifique qui précédera son implémentation.
