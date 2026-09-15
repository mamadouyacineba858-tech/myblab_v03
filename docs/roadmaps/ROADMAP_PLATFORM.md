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

L'audit exhaustif Tinkercad ↔ MYBlab est versionné dans `docs/reports/L1-A-TINKERCAD-PARITY-AUDIT-2026-09-15.md`. Il recale la campagne sur l'état réel du dépôt canonique et remplace l'ancien ordre théorique lorsque celui-ci désigne comme futurs des socles déjà réalisés.

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

**L1-A reste le chantier actif avant L1-B.** Breadboard et Wire relèvent de L1-B et ne doivent pas interrompre la clôture du catalogue L1-A, sauf décision CSA explicite démontrant une dépendance bloquante.

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

L'industrialisation `MB-VIS-COMP-001..007` reste une fondation de L1-A et ne doit pas être remplacée par une architecture parallèle.

#### 1.3.5 Fondations déjà disponibles — ne pas recréer

L'audit du dépôt canonique confirme que les socles suivants existent déjà et sont retirés de la file des nouveaux tickets de fondation :

- **A0 — Component Library Rollout Gate : AVAILABLE / QUALIFIED** ;
- **A1 — Generic Component Instance Properties : AVAILABLE** — schéma déclaratif, defaults, persistance, normalisation et round-trip ;
- **A2 — DC Sources / Battery Family : AVAILABLE** — POWER, 1.5 V, 9 V et Coin Cell 3 V ;
- **Environmental Stimulus Foundation : AVAILABLE** — `LIGHT → LDR` déjà raccordé ;
- **SimulatedClock + Scheduler : AVAILABLE** ;
- **Arduino runtime + intégration Scheduler/Simulation : AVAILABLE**, avec parité Arduino encore incomplète ;
- **Measurement/Observation V/I Foundation : AVAILABLE**.

Ces capacités doivent être réutilisées et qualifiées au besoin ; elles ne doivent pas être recréées sous de nouveaux tickets.

#### 1.3.6 Matrice maître des familles L1-A

| Vague | Famille benchmark | État MYBlab / cible | Orientation |
| --- | --- | --- | --- |
| A0 | Industrialisation catalogue | AVAILABLE / QUALIFIED | réutiliser Rollout Gate |
| A1 | Instance Properties | AVAILABLE | réutiliser contrat générique |
| A2 | DC Sources | AVAILABLE | POWER + Battery Family |
| A3 | Switches | BUTTON / BUTTON_LATCHING présents | Generic Switch Topology → Slide Switch → DIP Switch |
| A4 | Passifs | Resistor / Capacitor présents | Transient foundation avant Inductor |
| A5 | Diodes | DIODE présent | reverse-breakdown contract avant Zener |
| A6 | Actuators / outputs | Motor / Servo / Buzzer présents | Vibration Motor, Light Bulb, Hobby Gearmotor selon réutilisation |
| A7 | Sensors | LDR / Thermistor présents | extension générique des stimuli ; TMP36, Force/Flex, Soil, PIR/Tilt/IR, Ultrasonic |
| A8 | Semiconductor / Power Control | NPN présent | PNP, nMOS/pMOS, relais, régulateurs, H-Bridge |
| A9 | Digital Logic | absent | combinatoire puis séquentiel basé Scheduler |
| A10 | Displays | absent | 7-Segment puis LCD 16×2 |
| A11 | Analog IC | absent | 555/Dual Timer, Op-Amp, comparateurs, optocoupleur |
| A12 | Addressable RGB | RGB LED présent | moteur/protocole générique NeoPixel + variantes |
| A13 | Programmable Devices | Arduino FUNCTIONAL, PARITY incomplète | Arduino parity → ATtiny → micro:bit via L1-E |
| A14 | Instruments | Measurement V/I disponible | Multimeter → Function Generator → Oscilloscope via L1-F |

Le détail exhaustif des références benchmark, des gaps et des statuts est conservé dans le rapport d'audit L1-A versionné.

#### 1.3.7 DAG exécutable L1-A — ordre opérationnel de référence

Les nœuds A0, A1 et A2 ainsi que les fondations ENV, Clock/Scheduler, Arduino runtime integration et Measurement V/I sont déjà disponibles. Ils ne sont donc plus des points d'entrée de la campagne.

```text
A3-SW0 — Generic Switch Topology Contract        ← NEXT
        ↓
A3-SW1 — Slide Switch
        ↓
A3-SW2 — DIP Switch Family
        ↓
A6 — Low-risk actuator/output variants
        ↓
A7-C — Environmental Sensor Expansion
        ↓
A4/A5-D — Transient foundation + Reverse Breakdown
        ↓
A8 — Semiconductor / Power Control
        ↓
A9 — Digital Logic
        ↓
A10 — Displays (7-Segment → LCD 16×2)
        ↓
A12 — Addressable RGB / NeoPixel
        ↓
A11 — Analog IC
        ↓
A13 / L1-E — Arduino parity → ATtiny → micro:bit
        ↓
A14 / L1-F — Multimeter → Function Generator → Oscilloscope
        ↓
Power / special sources à priorité produit confirmée
        ↓
L1-A CATALOGUE CLOSURE GATE
        ↓
L1-B
```

**DIRECTION EXÉCUTIVE LEVEL 1 — L1-A reste la priorité active. Le prochain nœud exécutable est `A3-SW0 — Generic Switch Topology Contract`. Les tickets suivants sont sélectionnés dans l'ordre du DAG ci-dessus en sautant tout nœud déjà réalisé ou devenu inutile. Un nouvel audit global Tinkercad ↔ MYBlab n'est PAS requis avant chaque ticket : seul un contrôle ciblé du dépôt réel est requis pour confirmer le HEAD, la cible et ses dépendances. L1-B Breadboard/Wire ne reprend qu'après satisfaction du gate de sortie L1-A ou décision CSA explicite de dépendance bloquante.**

#### 1.3.8 Politique familles / variantes

Une référence du benchmark n'implique pas automatiquement un nouveau moteur ou un nouveau type électrique MYBlab. Les variantes partageant le même comportement doivent privilégier un contrat commun et des propriétés/variantes déclaratives lorsque le modèle d'instance le permet.

Les batteries 1.5 V, 9 V et Coin Cell 3 V illustrent cette politique : elles partagent une sémantique de source DC à deux terminaux tout en conservant des présentations physiques distinctes.

#### 1.3.9 Définition de L1-A DONE

L1-A n'est terminé que lorsque :

1. le catalogue benchmark est inventorié et versionné ;
2. chaque référence cible possède une entrée dans la matrice de parité ;
3. chaque référence est intégrée ou explicitement rattachée à la capacité L1-C/L1-D/L1-E/L1-F nécessaire à sa qualification complète ;
4. aucun composant absent n'est simplement oublié ;
5. les ajouts respectent Component Contract V1 et les guards de complétude ;
6. aucune extension ne contourne Registry, Document ou Simulation ;
7. les états `PRESENT / FUNCTIONAL / PARITY` sont vérifiables ;
8. le Component Library Rollout Gate reste validé par preuves.

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
| SIM2 | Scheduler / temps simulé | Disponible / à approfondir selon L1-D |
| SIM3 | Intégration runtime embarqué / Scheduler / Simulation | Disponible / parité à étendre |

SIM1 supporte notamment L1-D. Le dépôt réel possède déjà SimulatedClock/Scheduler et l'intégration runtime Arduino/Simulation ; les futurs tickets ne doivent pas recréer ces fondations.

---

# 6. Embedded Systems

| ID | Épic | État de référence |
| --- | --- | --- |
| EMB1 | Runtime firmware réel | Disponible V1 / parité incomplète |
| EMB2 | Extension multi-cartes | Hors périmètre immédiat |

EMB1 dispose déjà d'un runtime firmware Arduino V1 réel mais limité. L'élargissement vers la parité Arduino et les autres cartes relève de L1-E.

---

# 7. Experience

## 7.1 Objectif

Faire évoluer la restitution utilisateur sans déplacer dans Presentation les responsabilités du Core ou de l'Execution.

## 7.2 Épics

| ID | Épic | État de référence |
| --- | --- | --- |
| EXP1 | Formalisation et clôture de MB-VIS-001 | Réalisé techniquement |
| EXP2 | Visualisation des fils | Non commencé |
| EXP3 | Parité visuelle composants & expérience — seuil Tinkercad | En cours — **FAST TRACK actif** |
| EXP4 | Dépassement du benchmark Tinkercad | Futur |
| EXP5 | Laboratoire virtuel avancé et immersif | Vision long terme |

Les travaux de rendu des composants et de bibliothèque visuelle alimentent L1-A ; le breadboard et les wires sont qualifiés dans L1-B. Une amélioration visuelle ne doit jamais modifier la vérité électrique pour résoudre un problème purement graphique.

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
| V7 | MB-VIS-COMP-015 | Transistors et semi-conducteurs | NPN réalisé dans la séquence opérationnelle |
| V8 | MB-VIS-COMP-016 | Potentiomètres et capteurs | Potentiomètre, LDR et thermistor réalisés |
| V9 | MB-VIS-COMP-017 | Buzzer, moteur et servo | Buzzer, moteur et servo réalisés |
| V10 | MB-VIS-COMP-018 | RGB LED et variantes LED | RGB LED réalisée |
| V11 | MB-VIS-COMP-019 | Arduino et cartes — rendu réaliste | Réalisé / capitalisé |
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
| V22 | MB-VIS-TINKERCAD-030 | Audit comparatif MYBlab ↔ benchmark Tinkercad et gate de niveau 1 | Jalon final renuméroté dans la séquence opérationnelle |

Cette table est un **historique de planification**, pas une liste de tickets à relancer. Un travail déjà réalisé ne doit pas être recréé sous un autre identifiant uniquement pour respecter l'ancienne numérotation.

### 7.2.2 — Séquence opérationnelle EXP3 — FAST TRACK TINKERCAD

Le dépôt réel établit désormais que les **16 composants sur 16 du catalogue visuel de la vague sont rasterisés**, POWER et ARDUINO inclus. Les identifiants `031` à `048` sont conservés pour la traçabilité PMO, mais l'exécution opérationnelle n'est plus pilotée ticket par ticket. Elle est regroupée en quatre **Capability Gates** afin de réduire les boucles administratives et d'atteindre le seuil Tinkercad plus rapidement sans réduire les exigences architecturales.

| Gate | Tickets / travaux capitalisés | Objectif de capacité | Critère de sortie |
| --- | --- | --- | --- |
| **FT-A — Component Completion** | 031–037 + clôture des anomalies d'interaction ouvertes, dont MB-VIS-BUTTON-INTERACTION-008 | Qualifier les 16 composants comme objets réellement utilisables | Visuel + sélection + drag + pins + wire + déplacement câblé + zoom/localScale + états interactifs pertinents + non-régression |
| **FT-B — Physical Connectivity** | MB-VIS-CONTACT-038 + MB-VIS-WIRE-039 + MB-VIS-WIRE-040 | Établir un contrat transversal unique de connectivité physique | Contact physique visible = hit target = pin de présentation = endpoint wire, relié à l'identité électrique canonique ; cohérence validée sur les 16 composants |
| **FT-C — Assembly Experience** | MB-VIS-BREAD-041 + 042 + MB-VIS-CANVAS-043 + 044 + MB-VIS-STATE-045 | Rendre la construction d'un circuit fluide de bout en bout | Déposer → aligner/snaper → câbler → déplacer → zoomer → sélectionner → undo/redo → simuler → observer, sans rupture d'expérience |
| **FT-D — Tinkercad Qualification** | MB-VIS-LAB-046 + MB-VIS-QA-047 + MB-VIS-TINKERCAD-048 | Qualifier officiellement le Niveau 1 | Cohérence du laboratoire + QA globale + comparaison MYBlab↔Tinkercad ; aucun écart P0/P1 empêchant le passage au Niveau 2 |

#### FT-A — Component Completion Gate

FT-A ne constitue pas une nouvelle campagne de rasterisation. La production des assets est **terminée pour 16/16 composants**. FT-A construit une matrice de capacité transversale et ne corrige que les cases réellement déficientes. Un composant est qualifié lorsque ses invariants d'usage essentiels sont cohérents : rendu, sélection, drag, pins, câblage, déplacement câblé, zoom/localScale et états interactifs pertinents.

La première unité d'exécution Fast Track historique est :

**`FT-A-001 — 16/16 Component Capability Matrix & Gap Closure`.**

Elle reste une unité valide du Programme Experience mais ne remplace pas le NEXT global L1-A défini au §1.3.7.

#### FT-B — Physical Connectivity

FT-B absorbe les travaux `038–040` dans un contrat transversal. Le contrat cible est :

```text
CONTACT PHYSIQUE VISIBLE
          =
POINT CLIQUABLE / HIT TARGET
          =
PIN DE PRÉSENTATION
          =
ENDPOINT DU FIL
          ↕
IDENTITÉ ÉLECTRIQUE CANONIQUE
```

La séparation Registry / Presentation et la jointure par `pin.id` restent gouvernées par l'architecture et les ADR. FT-B doit notamment auditer et résorber les éventuelles divergences de source de vérité de présentation au lieu d'ajouter une troisième source concurrente.

#### FT-C — Assembly Experience

FT-C regroupe `041–045` parce que le benchmark utilisateur ne perçoit pas breadboard, canvas, snapping, wire et états comme cinq produits séparés. La qualification s'effectue par scénarios end-to-end.

#### FT-D — Tinkercad Qualification

FT-D regroupe `046–048`. `MB-VIS-TINKERCAD-048` reste le gate officiel du Niveau 1 Experience ; le gate produit global reste L1-G.

### 7.2.3 — Classification des écarts Fast Track

Tout écart découvert pendant FT-A, FT-B, FT-C ou FT-D est classé P0/P1/P2/P3 selon la gouvernance existante. Une anomalie interne à un Capability Gate ne crée pas automatiquement un nouveau micro-ticket.

### 7.2.4 — Mode d'exécution Fast Track

Pour chaque Capability Gate, la boucle nominale reste : **audit CSA ciblé → mission principale → tests ciblés → suite complète finale → review/red-team si risque → QA CSA/Product → commit/push**.

Claude Code est l'agent principal d'implémentation lorsque disponible. Codex est utilisé en priorité comme vérificateur/red-team ciblé ou comme implémenteur de secours sur un périmètre précisément borné. Les agents n'obtiennent aucune autorité architecturale ou d'intégration par défaut.

### 7.2.5 — Règle de non-duplication

Un composant déjà validé techniquement et visuellement ne doit pas être réouvert uniquement parce qu'il apparaît encore dans une séquence historique.

---

### 7.3 Règles spécifiques de progression visuelle

1. Audit global initial, puis contrôles ciblés.
2. Nouvel audit complet uniquement en cas de divergence significative ou checkpoint majeur.
3. Toute amélioration visuelle préserve les invariants Core/Simulation.
4. Les contrats canoniques existants sont réutilisés.
5. Les nouveaux assets suivent le contrat industriel et le Canvas Gate.
6. Aucun gate n'est considéré prêt à versionner sans validation CSA.

### 7.4 — Capitalisation de la trajectoire visuelle : MYBlab Physical/Realistic Visual Engine

Le backend déclaratif raster est capitalisé pour les 16 composants de la vague visuelle : LED, RESISTOR, DIODE, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, BUTTON, BUTTON_LATCHING, BUZZER, POTENTIOMETER, RGB_LED, NPN_TRANSISTOR, SERVO, POWER et ARDUINO.

La trajectoire durable reste : **atteindre Tinkercad → dépasser Tinkercad → laboratoire virtuel avancé, réaliste et immersif**. Les assets réalistes et leur pipeline restent une capacité de présentation ; ils ne déplacent pas la vérité électrique, les pins, les connexions ou la simulation.

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

L1-A: A3-SW0 → A3-SW1 → A3-SW2 → A6 → A7-C → A4/A5-D → A8 → A9 → A10 → A12 → A11 → A13 → A14 → Closure
                                                                      │
                                                                      ├── L1-C Environmental depth
                                                                      ├── L1-D Electrical/transient depth
                                                                      ├── L1-E Embedded parity
                                                                      └── L1-F Instruments

L1-A Closure → L1-B / autres gates restants → L1-G
```

Le graphe exprime les dépendances et la direction prioritaire ; il n'interdit pas un parallélisme explicitement validé par le CSA.

---

# 12. Règles de parallélisme

Un composant peut devenir `PRESENT` dans L1-A avant que son comportement complet soit disponible, mais son état `PARITY` reste bloqué tant que les capacités L1-C/L1-D/L1-E/L1-F nécessaires ne sont pas qualifiées. Le DAG L1-A est la file de référence ; tout parallélisme doit préserver ses dépendances.

---

# 13. Priorités

| Priorité | Domaine |
| --- | --- |
| **P0** | Gouvernance et preuves de base |
| **P1** | L1-A Catalogue/Instance Contracts — NEXT A3-SW0 |
| **P1 parallèle** | Simulation lorsque les dépendances l'autorisent |
| **P2** | Embedded Systems / capacités L1-E |
| **P3** | Knowledge & Learning |
| **P4** | Experience selon dépendances |
| **P5** | Ecosystem |
| **P6** | Collaboration |

---

# 14. Jalons

## J0 — Gouvernance stabilisée
Vision, architecture et roadmap disponibles et traçables.

## J1-L1A — Catalogue Tinkercad gouverné
Audit benchmark versionné, DAG exécutable fixé, fondations déjà disponibles retirées de la file et aucun gap de catalogue laissé sans propriétaire.

## J2 — Core canonique et Simulation intégrée
Document, Registry, Mutation et Validation suffisamment stabilisés ; Simulation raccordée au Core canonique.

## J3 — Runtime embarqué
Runtime Arduino V1 disponible ; élargissement de parité traité sous L1-E.

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
Chaque ticket doit être rattachable sans ambiguïté à son Programme et à la vague Level 1 concernée.

### R7 — La roadmap reste révisable et traçable
Toute modification significative doit être justifiée par l'état réel du dépôt, une décision architecturale ou une contrainte majeure.

### R8 — Aucun faux progrès de parité
`PRESENT`, `FUNCTIONAL` et `PARITY` sont des états distincts.

### R9 — Le benchmark ne dicte pas une mauvaise architecture
L'ordre d'implémentation suit le DAG de capacités et les contrats MYBlab, non l'ordre d'affichage du catalogue Tinkercad.

### R10 — Le dépôt réel est la source de vérité opérationnelle
La roadmap ne doit jamais imposer la répétition d'un travail déjà réalisé et validé dans le dépôt réel.

### R11 — Pilotage par capacité, pas par micro-ticket
Les anomalies internes à une capacité ne créent pas automatiquement de nouvelles unités PMO.

### R12 — Deux gates de validation par capacité
Gate ingénieur puis Gate CSA/Product ; ne pas répéter inutilement les suites complètes à chaque micro-correction.

### R13 — Répartition des rôles IA
Le CSA conserve architecture, séquencement, invariants et GO/STOP. Les agents n'ont aucune autorité d'intégration implicite.

### R14 — Audit global L1-A capitalisé
L'audit global Tinkercad ↔ MYBlab du 15 septembre 2026 est la baseline de la campagne L1-A. Avant chaque prochain ticket, effectuer seulement un **contrôle ciblé** du dépôt réel pour vérifier HEAD, cible et dépendances. Refaire un audit global uniquement en cas de divergence architecturale majeure, changement substantiel du benchmark ou checkpoint explicitement décidé par le CSA.

---

# 16. Traçabilité

```text
MYBLAB_VISION_2030.md
        ↓
PLATFORM_ARCHITECTURE.md
        ↓
ROADMAP_PLATFORM.md
        ↓
L1-A PARITY AUDIT REPORT
        ↓
DAG exécutable / prochain nœud disponible
        ↓
Contrôle ciblé du dépôt réel
        ↓
Execution Blueprint → Ticket → CSA GO
        ↓
Implémentation → Tests → CSA/Product Gate
        ↓
Clôture → nœud suivant
```

---

# 17. État de référence

Cette version de `ROADMAP_PLATFORM.md` capitalise l'audit exhaustif Tinkercad ↔ MYBlab du 15 septembre 2026 et le rapport `docs/reports/L1-A-TINKERCAD-PARITY-AUDIT-2026-09-15.md`.

La trajectoire durable reste : **atteindre le niveau Tinkercad → dépasser Tinkercad → tendre vers un laboratoire électronique virtuel MYBlab avancé, réaliste, immersif et extensible.**

**DIRECTION ACTIVE : L1-A N'EST PAS TERMINÉ ET RESTE PRIORITAIRE AVANT L1-B. A0 Rollout Gate, A1 Generic Instance Properties et A2 DC Sources/Battery Family sont déjà disponibles et ne doivent pas être recréés. LE PROCHAIN NŒUD EXÉCUTABLE EST `A3-SW0 — Generic Switch Topology Contract`, suivi de `A3-SW1 — Slide Switch`, puis `A3-SW2 — DIP Switch Family`. La suite est gouvernée par le DAG §1.3.7. Aucun nouvel audit global n'est requis avant chaque ticket ; un contrôle ciblé du dépôt réel suffit sauf divergence majeure.**

`FT-A-001` et les gates Experience restent capitalisés et valides dans leur Programme, mais ne remplacent pas cette priorité globale L1-A.

Les états « réalisé », « partiel », « planifié » ou « non commencé », ainsi que `PRESENT`, `FUNCTIONAL` et `PARITY`, ne constituent pas à eux seuls des décisions de clôture PMO. Toute clôture exige les preuves prévues par la gouvernance.
