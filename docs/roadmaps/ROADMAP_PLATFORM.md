# ROADMAP_PLATFORM.md

## 1. Objet

Cette roadmap définit la trajectoire de construction de la plateforme MYBlab à partir de la Vision 2030 et de l'architecture décrite dans PLATFORM_ARCHITECTURE.md.

Elle établit la hiérarchie :

**Vision → Piliers → Programmes → Épics → Tickets PMO**

La roadmap ne définit pas les mécanismes d'implémentation. Elle ne remplace ni le Tome I, ni le Tome II, ni les ADR, ni les spécifications PMO.

Elle définit les grandes unités de progression, leurs dépendances, leurs priorités et leurs jalons.

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

## 7.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| EXP1 | Formalisation et clôture de MB-VIS-001 | Réalisé techniquement |
| EXP2 | Visualisation des fils | Non commencé |

### EXP1 — Formalisation et clôture de MB-VIS-001

Consolider la traçabilité PMO de la capacité déjà réalisée, sans refaire son implémentation.

### EXP2 — Visualisation des fils

Étendre la restitution graphique aux fils et connexions du circuit, dans le respect des responsabilités de Presentation.

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

EXP1 ───────────────────── EXP2
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
