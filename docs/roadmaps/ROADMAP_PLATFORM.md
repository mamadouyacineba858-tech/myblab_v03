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
| EXP3 | Parité visuelle composants & expérience — seuil Tinkercad | Planifié |
| EXP4 | Dépassement du benchmark Tinkercad | Futur |
| EXP5 | Laboratoire virtuel avancé et immersif | Vision long terme |

### EXP1 — Formalisation et clôture de MB-VIS-001

Consolider la traçabilité PMO de la capacité déjà réalisée, sans refaire son implémentation.

### EXP2 — Visualisation des fils

Étendre la restitution graphique aux fils et connexions du circuit, dans le respect des responsabilités de Presentation.

### EXP3 — Parité visuelle composants & expérience — seuil Tinkercad

Construire, par itérations PMO contrôlées, le niveau de restitution visuelle et d'expérience nécessaire pour atteindre le benchmark Tinkercad. Les travaux couvrent notamment la cohérence géométrique et dimensionnelle des composants, le réalisme des matériaux et des broches, les états visuels, le canvas, le câblage, le breadboard, les cartes et la cohérence générale de l'environnement de travail.

Les Tickets PMO issus d'EXP3 sont organisés comme une séquence indicative et révisable après audit du dépôt :

| Séquence | Ticket cible | Finalité de référence | État |
| --- | --- | --- | --- |
| V1 | MB-VIS-RENDER-009 | Baseline visuelle et contrat de qualité de rendu | Planifié |
| V2 | MB-VIS-LED-010 | LED réaliste niveau benchmark | Planifié |
| V3 | MB-VIS-COMP-011 | Résistance réaliste et proportions physiques | Planifié |
| V4 | MB-VIS-COMP-012 | Diodes et composants axiaux | Planifié |
| V5 | MB-VIS-COMP-013 | Boutons et interrupteurs — mécanique et états | Planifié |
| V6 | MB-VIS-COMP-014 | Condensateurs, inductances et passifs | Planifié |
| V7 | MB-VIS-COMP-015 | Transistors et semi-conducteurs | Planifié |
| V8 | MB-VIS-COMP-016 | Potentiomètres et capteurs | Planifié |
| V9 | MB-VIS-COMP-017 | Buzzer, moteur et servo | Planifié |
| V10 | MB-VIS-COMP-018 | RGB LED et variantes LED | Planifié |
| V11 | MB-VIS-COMP-019 | Arduino et cartes — rendu réaliste | Planifié |
| V12 | MB-VIS-COMP-020 | Pins, contacts et précision d'ancrage | Planifié |
| V13 | MB-VIS-WIRE-021 | Fils — géométrie, épaisseur, routage et jonctions | Planifié |
| V14 | MB-VIS-WIRE-022 | États électriques et restitution dynamique des fils | Planifié |
| V15 | MB-VIS-BREAD-023 | Breadboard — restitution visuelle de référence | Planifié |
| V16 | MB-VIS-BREAD-024 | Insertion, alignement et assemblage breadboard | Planifié |
| V17 | MB-VIS-CANVAS-025 | Canvas — grille, zoom, sélection, déplacement et snapping | Planifié |
| V18 | MB-VIS-CANVAS-026 | Profondeur, ombres et feedback d'interaction | Planifié |
| V19 | MB-VIS-STATE-027 | Système visuel des états de simulation | Planifié |
| V20 | MB-VIS-LAB-028 | Cohérence visuelle globale du laboratoire | Planifié |
| V21 | MB-VIS-QA-029 | Visual regression suite et verrouillage des rendus | Planifié |
| V22 | MB-VIS-TINKERCAD-030 | Audit comparatif MYBlab ↔ benchmark Tinkercad et gate de niveau 1 | Jalon |

Cette séquence n'est pas une spécification d'implémentation et ne donne pas d'autorisation implicite de modifier un sous-système architectural. Chaque ticket doit disposer de son Blueprint, de ses invariants, de ses limites de périmètre et de son CSA GO avant implémentation.

### EXP4 — Dépassement du benchmark Tinkercad

Identifier puis construire les capacités par lesquelles MYBlab apporte une valeur visuelle, interactive et pédagogique supérieure au benchmark. EXP4 commence après le gate de niveau 1 et ne se limite pas à reproduire Tinkercad.

### EXP5 — Laboratoire virtuel avancé et immersif

Préparer, à long terme et sous contrôle architectural, l'évolution vers un laboratoire électronique virtuel réaliste et immersif : représentation physique avancée, instrumentation, observation des phénomènes, interactions spatiales et, lorsque les ADR et l'architecture le permettront, représentation 3D.

### 7.3 Règles spécifiques de progression visuelle

1. **Audit avant implémentation** — l'ordre détaillé des Tickets EXP3 doit être confirmé ou ajusté par un audit du dépôt à la clôture du ticket précédent.
2. **Amélioration visible** — chaque ticket visuel doit produire une amélioration observable de la qualité de restitution ou de l'expérience, sans sacrifier les invariants du Core.
3. **Réalisme compatible** — le réalisme doit rester compatible avec les performances, la maintenabilité et l'architecture React/SVG retenue ; aucune architecture 3D n'est présupposée par EXP3.
4. **Contrats canoniques** — les dimensions, pins, états et autres métadonnées déclaratives existants doivent être réutilisés plutôt que dupliqués.
5. **Qualité de référence** — les critères de comparaison avec Tinkercad portent sur la perception utilisateur, la cohérence, les proportions, le comportement visuel et la qualité d'interaction, pas sur une copie de code ou de mécanismes propriétaires.
6. **Gate de niveau 1** — MB-VIS-TINKERCAD-030 constitue le jalon de décision : le passage au niveau 2 doit être explicitement validé et tracé.

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
                              └── MB-VIS-RENDER-009 → … → MB-VIS-TINKERCAD-030
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

* EXP3 réalisé selon la séquence PMO validée et ajustée par audits successifs ;
* composants usuels, fils, breadboard, cartes et canvas atteignent un niveau de référence cohérent ;
* visual regression et critères de qualité visuelle verrouillés ;
* **MB-VIS-TINKERCAD-030** exécuté comme gate comparatif ;
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
Audit architectural
```

La roadmap constitue ainsi le niveau intermédiaire entre la décision stratégique, l'architecture permanente et l'exécution opérationnelle.

Elle ne doit ni descendre jusqu'au détail du code, ni remonter jusqu'à redéfinir la Vision.

---

# 17. État de référence

Cette première version de ROADMAP_PLATFORM.md constitue la roadmap stratégique de référence du Programme Platform.

Elle reflète l'état du dépôt observé lors de sa construction et les décisions architecturales établies dans les Tomes I et II.

Les états « réalisé », « partiel », « planifié » ou « non commencé » ne constituent pas des décisions de clôture PMO. La clôture opérationnelle d'un travail relève du cycle PMO et de ses mécanismes de vérification.

Toute évolution future de cette roadmap doit préserver la traçabilité :

**Vision → Architecture → Programme → Épic → PMO → Implémentation → Vérification.**

La trajectoire stratégique définie en §1.1 fait désormais partie intégrante de cette référence : **atteindre le niveau Tinkercad, dépasser ce benchmark, puis tendre vers un laboratoire électronique virtuel MYBlab avancé.** Elle ne doit pas être perdue ou implicitement abandonnée au fil des tickets futurs ; toute évolution significative de cette ambition doit être explicitement décidée et tracée dans la roadmap et les documents de gouvernance appropriés.

La séquence EXP3 `MB-VIS-RENDER-009` → `MB-VIS-TINKERCAD-030` est désormais inscrite comme trajectoire indicative du premier seuil visuel. Elle reste révisable après audit de chaque étape et ne constitue pas une autorisation d'implémentation anticipée.
