# ROADMAP_PLATFORM.md

## 1. Objet

Cette roadmap définit la trajectoire de construction de la plateforme MYBlab à partir de la Vision 2030 et de l'architecture décrite dans `PLATFORM_ARCHITECTURE.md`.

Elle établit la hiérarchie :

**Vision → Piliers → Programmes → Épics → Tickets PMO**

La roadmap ne remplace ni le Tome I, ni le Tome II, ni les ADR, ni les spécifications PMO. Elle définit les grandes unités de progression, leurs dépendances, leurs priorités et leurs jalons.

### 1.1 Trajectoire stratégique de l'expérience MYBlab

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

Le niveau 1 vise la parité produit utile avec Tinkercad : composants, simulation, assemblage physique, breadboard et wiring, systèmes embarqués, instrumentation et cohérence de l'expérience. Le niveau 2 vise les capacités propres permettant de dépasser ce benchmark. Le niveau 3 constitue la direction à long terme vers un laboratoire électronique virtuel avancé, réaliste et immersif.

Les références externes sont des benchmarks et sources d'inspiration, non des spécifications à recopier mécaniquement.

### 1.2 Principe de continuité stratégique

La trajectoire **Atteindre Tinkercad → Dépasser Tinkercad → Laboratoire virtuel MYBlab avancé** doit rester visible même lorsque les travaux immédiats portent sur le Core, la Simulation, la gouvernance ou d'autres fondations.

Toute évolution architecturale nécessaire suit les ADR et le cycle PMO appropriés.

### 1.3 Conclusion de l'audit stratégique Level 1 — 15 septembre 2026

L'audit croisé du dépôt réel, du catalogue MYBlab, du `canonicalRegistry`, du contrat de bibliothèque de composants, des tickets `MB-VIS-COMP-001..007` et du benchmark Tinkercad conduit aux décisions suivantes.

#### 1.3.1 Niveau 1 = parité produit, pas seulement parité visuelle

La présence d'un composant sur le Canvas ne suffit pas à déclarer la parité. Chaque référence du benchmark doit être suivie selon trois gates indépendants :

```text
PRESENT
   ↓
définition + pins + renderer + palette
   ↓
FUNCTIONAL
   ↓
comportement électronique principal opérationnel
   ↓
PARITY
   ↓
comportement benchmark Tinkercad démontré
```

Un composant peut donc être `PRESENT` sans être `FUNCTIONAL`, et `FUNCTIONAL` sans être encore `PARITY`.

#### 1.3.2 Découpage du Level 1

```text
LEVEL 1 — TINKERCAD PRODUCT PARITY
│
├── L1-A — Component Catalogue & Instance Contract Parity
├── L1-B — Physical Assembly
├── L1-C — Environmental Simulation
├── L1-D — Electrical / Component Simulation Depth
├── L1-E — Embedded & Programmable Components
├── L1-F — Measurement & Instruments
└── L1-G — Product Parity Certification
```

**L1-A reste le chantier actif avant L1-B.** Breadboard et Wire relèvent de L1-B et ne doivent pas interrompre la clôture du catalogue L1-A.

#### 1.3.3 Invariants Level 1

Les travaux Level 1 doivent préserver les invariants suivants :

- Document = vérité persistante ;
- les mutations persistantes passent par le canal Mutation/History autorisé ;
- runtime et stimuli restent séparés des données persistantes ;
- le Scheduler reste la source de vérité du temps simulé ;
- Presentation ne devient pas un second modèle métier ;
- la géométrie électrique reste indépendante de la géométrie visuelle ;
- les contrats génériques sont préférés aux branches type-spécifiques ;
- l'ajout d'un composant ne doit pas imposer une modification du Core Canvas, du wiring ou du breadboard sauf nouvelle capacité transversale réellement démontrée.

#### 1.3.4 L1-A — définition

**L1-A — Component Catalogue & Instance Contract Parity** établit et maintient la matrice canonique des composants nécessaires au benchmark Tinkercad, industrialise leur introduction dans MYBlab, réalise immédiatement ceux compatibles avec les capacités existantes et route explicitement les comportements nécessitant des capacités supplémentaires vers L1-C/L1-D/L1-E/L1-F.

L'industrialisation `MB-VIS-COMP-001..007` est une fondation de L1-A et ne doit pas être remplacée par une architecture parallèle. Le Rollout Gate doit être qualifié par preuves avant l'expansion massive.

#### 1.3.5 Dépendance transversale découverte : propriétés persistantes d'instance

Le Registry canonique possède déjà `parameterSchema`, `defaultParameters`, `capabilities` et `modelAvailable`, mais l'audit du modèle d'instance montre qu'il faut qualifier puis, si nécessaire, établir un transport générique des propriétés persistantes d'instance :

```text
Registry definition
       ↓
instance defaults
       ↓
Document persistence
       ↓
normalization
       ↓
serialization / import / export
       ↓
simulation + presentation
```

Cette capacité doit être résolue avant de multiplier les familles paramétrables. Elle ne doit pas être remplacée par des exceptions `if (type === ...)` ajoutées composant par composant.

#### 1.3.6 Matrice maître des familles L1-A

| Vague | Famille benchmark | État MYBlab / cible | Orientation |
| --- | --- | --- | --- |
| A0 | Industrialisation catalogue | Architecture V1 + VIS-COMP présents | qualifier Rollout Gate |
| A1 | Instance Properties | contrat déclaratif partiel | persistance générique + defaults + round-trip |
| A2 | DC Sources | POWER existe | famille Battery |
| A3 | Switches | BUTTON / BUTTON_LATCHING existent | Slide Switch puis DIP Switch |
| A4 | Passifs | Resistor / Capacitor présents | Inductor selon capacité temporelle |
| A5 | Diodes | DIODE présent | Zener après reverse breakdown |
| A6 | Actuators | Motor / Servo / Buzzer présents | Vibration Motor, Hobby Gearmotor |
| A7 | Sensors | LDR / Thermistor présents | TMP36, Force/Flex, Soil, PIR, Ultrasonic ; comportement complet via L1-C si nécessaire |
| A8 | Semiconductor / Power Control | NPN présent | PNP, MOSFET, relais, régulateurs, H-Bridge |
| A9 | Digital Logic | absent | combinatoire puis séquentiel |
| A10 | Displays | absent | 7-Segment puis LCD 16×2 |
| A11 | Analog IC | absent | 555, Dual Timer, Op-Amp, comparateurs, optocoupleur |
| A12 | Addressable RGB | RGB LED présent | moteur générique NeoPixel + variantes |
| A13 | Programmable Devices | Arduino présent | qualification Arduino, ATtiny, micro:bit via L1-E |
| A14 | Instruments | POWER présent | Multimeter, Function Generator, Oscilloscope via L1-F |

Cette matrice est un registre stratégique : le détail exact des références et leur statut `PRESENT/FUNCTIONAL/PARITY` doit rester versionné et vérifiable au fil des tickets.

#### 1.3.7 Ordre de dépendance initial L1-A

```text
A0 — Rollout Gate qualification
        ↓
A1 — Generic Component Instance Properties
        ↓
A2 — DC Source Family
        ↓
A3 — Battery Family
     ├── 1.5 V
     ├── 9 V
     └── Coin Cell 3 V
        ↓
A4 — Switch topology / Slide Switch / DIP Switch
        ↓
A5 — Actuator variants
     ├── Vibration Motor
     └── Hobby Gearmotor
        ↓
A6 — Sensor integration contract
        ↓
A7+ — familles dépendantes des capacités L1-C/L1-D/L1-E/L1-F
```

L'ordre du catalogue Tinkercad n'est pas l'ordre d'implémentation. Le DAG de capacités détermine les tickets.

#### 1.3.8 Politique familles / variantes

Une référence du benchmark n'implique pas automatiquement un nouveau moteur ou un nouveau type électrique MYBlab. Les variantes partageant le même comportement doivent privilégier un contrat commun et des propriétés/variantes déclaratives lorsque le modèle d'instance le permet.

Exemple cible à confirmer par ticket d'architecture : les batteries 1.5 V, 9 V et Coin Cell 3 V partagent une sémantique de source DC à deux terminaux mais possèdent des présentations physiques différentes. La logique électrique ne doit pas être dupliquée sans nécessité démontrée.

#### 1.3.9 Définition de L1-A DONE

L1-A n'est terminé que lorsque :

1. le catalogue benchmark est inventorié et versionné ;
2. chaque référence cible possède une entrée dans la matrice de parité ;
3. chaque référence est intégrée ou explicitement rattachée à la capacité L1-C/L1-D/L1-E/L1-F nécessaire à sa qualification complète ;
4. aucun composant absent n'est simplement oublié ;
5. les ajouts respectent Component Contract V1 et les guards de complétude ;
6. aucune extension ne contourne Registry, Document ou Simulation ;
7. les états `PRESENT / FUNCTIONAL / PARITY` sont vérifiables ;
8. le Component Library Rollout Gate est réellement validé par preuves.

#### 1.3.10 Frontières avec les autres vagues

L1-A possède le catalogue et les contrats d'instance. L1-B possède l'assemblage physique, breadboard et wiring. L1-C possède les stimuli environnementaux tels que lumière, température, distance et mouvement. L1-D possède la profondeur de simulation électrique et temporelle nécessaire aux composants avancés. L1-E possède l'exécution des composants programmables. L1-F possède la mesure, la génération et l'observation instrumentale. L1-G ferme le Level 1 uniquement lorsque les gaps critiques de parité produit sont éliminés.

---

## 2. Gouvernance de référence

La roadmap s'appuie sur quatre niveaux documentaires complémentaires :

| Niveau | Référence | Rôle |
| --- | --- | --- |
| Vision | Tome I — Vision 2030 | direction, valeurs et principes |
| Architecture | Tome II — PLATFORM_ARCHITECTURE.md | couches, responsabilités et invariants |
| Roadmap | ROADMAP_PLATFORM.md | ordre, programmes, épics, dépendances et jalons |
| PMO | docs/pmo/ | travaux exécutables et contrôlés |

Un Ticket PMO ne doit pas introduire une responsabilité architecturale absente du Tome II.

---

## 3. Structure des Programmes

| Programme | Périmètre principal |
| --- | --- |
| **Core Foundation** | Document, Mutation, Validation, Registry et frontières du Core |
| **Simulation** | Simulation et évolution du moteur de calcul |
| **Embedded Systems** | Embedded Runtime et comportements embarqués |
| **Experience** | Presentation et restitution utilisateur |
| **Knowledge & Learning** | Knowledge et Learning |
| **Ecosystem** | Plugin Loader et extensions |
| **Collaboration** | Project Synchronization et Collaboration |

Les vagues L1-A..L1-G sont transversales : elles orchestrent ces Programmes sans déplacer leurs responsabilités architecturales.

---

# 4. Core Foundation

## 4.1 Objectif

Stabiliser les fondations métier du Core Layer afin que les autres Programmes évoluent sur une représentation canonique et contrôlée.

## 4.2 Épics

| ID | Épic | État de référence |
| --- | --- | --- |
| CF1 | Unification du Document | Partiel |
| CF2 | Migration et unification du ComponentRegistry | Partiel |
| CF3 | Formalisation du canal Mutation unique | Partiel |
| CF4 | Stabilisation de la Validation | PROPOSED / à formaliser |

CF1 établit la représentation canonique du projet. CF2 établit Registry comme catalogue déclaratif de référence. CF3 stabilise Mutation comme canal d'évolution du Document. CF4 stabilise Validation. Les travaux L1-A sur les propriétés d'instance se rattachent à ces responsabilités et ne créent pas un Core parallèle.

---

# 5. Simulation

## 5.1 Objectif

Faire évoluer le moteur depuis les capacités établies vers une simulation temporelle et des comportements plus complets.

## 5.2 Épics

| ID | Épic | État de référence |
| --- | --- | --- |
| SIM1 | Composants analogiques | Planifié |
| SIM2 | Scheduler / temps simulé | Planifié |
| SIM3 | Intégration runtime embarqué / Scheduler / Simulation | Planifié |

SIM1 supporte notamment L1-D. SIM2 introduit la capacité temporelle nécessaire aux phénomènes dynamiques. SIM3 établit l'intégration Simulation/Embedded sans absorber le runtime firmware réel.

---

# 6. Embedded Systems

| ID | Épic | État de référence |
| --- | --- | --- |
| EMB1 | Runtime firmware réel | Non commencé |
| EMB2 | Extension multi-cartes | Hors périmètre immédiat |

EMB1 porte l'exécution réelle du comportement programmé. EMB2 étend le périmètre à plusieurs familles de cartes après stabilisation du premier runtime. Ces épics supportent L1-E.

---

# 7. Experience

## 7.1 Objectif

Faire évoluer la restitution utilisateur sans déplacer dans Presentation les responsabilités du Core ou de l'Execution.

## 7.2 Épics

| ID | Épic | État de référence |
| --- | --- | --- |
| EXP1 | Formalisation et clôture de MB-VIS-001 | Réalisé techniquement |
| EXP2 | Visualisation des fils | Non commencé |

Les travaux de rendu des composants et de bibliothèque visuelle alimentent L1-A ; le breadboard et les wires sont qualifiés dans L1-B. Une amélioration visuelle ne doit jamais modifier la vérité électrique pour résoudre un problème purement graphique.

---

# 8. Knowledge & Learning

| ID | Épic | État de référence |
| --- | --- | --- |
| KL1 | Premier mécanisme d'explication | Non commencé |
| KL2 | Premier mécanisme d'adaptation pédagogique | Non commencé |

KL1 transforme des résultats techniques qualifiés en explications. KL2 décide quelles informations pédagogiques produire et montrer selon la progression de l'utilisateur. KL2 dépend de KL1.

---

# 9. Ecosystem

| ID | Épic | État de référence |
| --- | --- | --- |
| ECO1 | Plugin Loader — première implémentation | Non commencé |
| ECO2 | Extension lifecycle | Non commencé |
| ECO3 | Contrat d'extension basé sur Registry | Non commencé |

Registry reste une responsabilité du Core. ECO1 dépend de CF2.

---

# 10. Collaboration

| ID | Épic | État de référence |
| --- | --- | --- |
| COL1 | Project Synchronization — première implémentation | Non commencé |
| COL2 | Collaboration | Non commencé |

COL1 dépend de CF1 et CF3. COL2 dépend de COL1.

---

# 11. Graphe global de dépendances

```text
CF1 - Document
 ├── CF2 - Registry ───── ECO1 ─ ECO2 ─ ECO3
 │       │
 │       ├──── [porte d'intégration] ──── SIM1
 │       └──── L1-A Instance/Component Contracts
 │
 └── CF3 - Mutation ───── COL1 ─ COL2

CF4 - Validation ───────── KL1 ─ KL2

SIM1 ─ SIM2 ─ SIM3
                 │
                 └── intégration Simulation / Embedded Runtime

EMB1 - Runtime firmware réel

L1-A ──→ L1-B / L1-C / L1-D / L1-E / L1-F ──→ L1-G
```

Le graphe exprime les dépendances, non une obligation de sérialiser tous les travaux.

---

# 12. Règles de parallélisme

SIM1 peut progresser en parallèle de CF2 lorsqu'une porte d'intégration empêche une divergence durable. SIM3 et EMB1 restent distincts : SIM3 porte l'intégration Simulation/Scheduler/runtime ; EMB1 porte l'exécution firmware réelle.

Pour Level 1, un composant peut devenir `PRESENT` dans L1-A avant que son comportement complet soit disponible, mais son état `PARITY` reste bloqué tant que les capacités L1-C/L1-D/L1-E/L1-F nécessaires ne sont pas qualifiées.

---

# 13. Priorités

Les priorités sont déterminées par fondation architecturale, dépendances, risque, valeur produit, état réel du code et cohérence Vision 2030.

| Priorité | Domaine |
| --- | --- |
| **P0** | Gouvernance et preuves de base |
| **P1** | Core Foundation + L1-A Catalogue/Instance Contracts |
| **P1 parallèle** | Simulation lorsque les dépendances l'autorisent |
| **P2** | Embedded Systems / capacités L1-E |
| **P3** | Knowledge & Learning |
| **P4** | Experience selon dépendances |
| **P5** | Ecosystem |
| **P6** | Collaboration |

Les priorités ne constituent pas un calendrier.

---

# 14. Jalons

## J0 — Gouvernance stabilisée
Vision, architecture et roadmap disponibles et traçables.

## J1 — Fondations en construction
CF1/CF2/CF3/CF4 progressent ; Simulation peut avancer avec portes d'intégration.

## J1-L1A — Catalogue Tinkercad gouverné
Matrice benchmark versionnée, Rollout Gate qualifié, contrat d'instance générique établi si nécessaire, ordre des familles fixé et aucun gap de catalogue laissé sans propriétaire.

## J2 — Core canonique et Simulation intégrée
Document, Registry, Mutation et Validation suffisamment stabilisés ; Simulation raccordée au Core canonique ; Scheduler disponible selon besoin.

## J3 — Runtime embarqué
SIM3 et EMB1 établissent la frontière et l'exécution embarquée nécessaires à L1-E.

## J4 — Première boucle de connaissance
KL1 établi et KL2 engagé selon dépendances.

## J5 — Écosystème et collaboration
ECO1..ECO3 et COL1..COL2 progressent sans violer les frontières du Tome II.

## J6 — Consolidation Experience
Restitution et interaction qualifiées sur les fondations stabilisées.

## J7 — Level 1 Product Parity Certification
L1-G audite la matrice `PRESENT/FUNCTIONAL/PARITY`. Level 1 n'est fermé qu'en l'absence de gap critique non traité par rapport au benchmark Tinkercad retenu.

---

# 15. Règles de gouvernance de la roadmap

### R1 — La roadmap ne remplace pas l'architecture
Une évolution architecturale passe par le Tome II et/ou une ADR appropriée.

### R2 — Un Épic appartient à un Programme de référence
Les vagues Level 1 orchestrent les Programmes sans dupliquer leurs responsabilités.

### R3 — Les antécédents historiques ne sont pas recréés
Un ancien chantier peut être rattaché à un Épic sans être recréé artificiellement.

### R4 — Les détails d'implémentation restent hors de la roadmap
Fichiers, fonctions, bibliothèques et choix techniques relèvent des tickets, Blueprints et ADR.

### R5 — Les dépendances peuvent autoriser le parallélisme
Une porte d'intégration doit empêcher qu'une divergence temporaire devienne permanente.

### R6 — Les Tickets PMO dérivent des Épics et vagues applicables
Chaque ticket doit être rattachable sans ambiguïté à son Programme et, pour la parité produit, à la vague Level 1 concernée.

### R7 — La roadmap reste révisable et traçable
Toute modification significative doit être justifiée par l'état réel du dépôt, une décision architecturale ou une contrainte majeure.

### R8 — Aucun faux progrès de parité
`PRESENT`, `FUNCTIONAL` et `PARITY` sont des états distincts. Aucun ticket visuel ou d'enregistrement ne peut à lui seul certifier une parité fonctionnelle non démontrée.

### R9 — Le benchmark ne dicte pas une mauvaise architecture
L'ordre d'implémentation suit le DAG de capacités et les contrats MYBlab, non l'ordre d'affichage du catalogue Tinkercad.

---

# 16. Traçabilité

```text
MYBLAB_VISION_2030.md
        ↓
PLATFORM_ARCHITECTURE.md
        ↓
ROADMAP_PLATFORM.md
        ↓
Programme / Vague Level 1 / Épic
        ↓
Ticket PMO
        ↓
Execution Blueprint
        ↓
Implémentation
        ↓
Delivery Report
        ↓
Audit architectural / Parity Gate
```

---

# 17. État de référence

Cette version de `ROADMAP_PLATFORM.md` intègre la conclusion de l'audit stratégique Level 1 du 15 septembre 2026.

Elle conserve la trajectoire durable : **atteindre Tinkercad, dépasser ce benchmark, puis tendre vers un laboratoire électronique virtuel MYBlab avancé**.

La conclusion opérationnelle de l'audit est la suivante : **L1-A n'est pas terminé ; il reste prioritaire avant L1-B.** Le prochain travail exécutable doit être déterminé à partir du dépôt réel et du DAG L1-A, en commençant par la qualification du Rollout Gate et du contrat générique de propriétés d'instance avant toute expansion massive du catalogue.

Les états « réalisé », « partiel », « planifié » ou « non commencé » ne constituent pas des décisions de clôture PMO. Toute clôture exige les preuves prévues par la gouvernance.
