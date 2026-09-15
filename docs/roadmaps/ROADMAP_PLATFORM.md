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
     └── Battery Family (sous-famille de A2, pas une famille distincte)
          ├── 1.5 V
          ├── 9 V
          └── Coin Cell 3 V
        ↓
A3 — Switch topology / Slide Switch / DIP Switch
        ↓
A6 — Actuator variants
     ├── Vibration Motor
     └── Hobby Gearmotor
        ↓
A7 — Sensor integration contract
        ↓
A4 / A5 / A8+ — autres familles dépendantes des capacités L1-C/L1-D/L1-E/L1-F
```

L'ordre du catalogue Tinkercad n'est pas l'ordre d'implémentation. Le DAG de capacités détermine les tickets.

**Note de réconciliation (2026-09-15) :** un audit antérieur avait détecté une collision de nomenclature — cette séquence de dépendance réutilisait `A3` pour désigner l'étape "Battery Family" alors que la matrice maître §1.3.6 attribue `A3` à la famille Switches et rattache Battery à `A2` (DC Sources). La séquence ci-dessus a été corrigée pour utiliser les identifiants de famille réels de la matrice ; l'ordre d'exécution proprement dit n'a pas été modifié. Battery reste une sous-famille de DC Sources et `A3` ne désigne que Switches dans tout ce document.

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

La première unité d'exécution Fast Track est :

**`FT-A-001 — 16/16 Component Capability Matrix & Gap Closure`.**

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

FT-C regroupe `041–045` parce que le benchmark utilisateur ne perçoit pas breadboard, canvas, snapping, wire et états comme cinq produits séparés. La qualification s'effectue par scénarios end-to-end, par exemple :

```text
POWER → breadboard → RESISTOR → LED → GND

placer → aligner → câbler → déplacer → zoomer → sélectionner
→ undo/redo → simuler → observer
```

La réussite d'un scénario doit prouver simultanément la cohérence des sous-systèmes concernés.

#### FT-D — Tinkercad Qualification

FT-D regroupe `046–048`. `MB-VIS-TINKERCAD-048` reste le **gate officiel du Niveau 1**, mais la grille comparative doit être alimentée progressivement dès FT-A afin d'éviter de découvrir tardivement un écart essentiel. Le gate final compare au minimum : placement, drag, câblage, routage, breadboard, zoom/pan, sélection, undo/redo, valeurs de composants, états interactifs, simulation pertinente, Arduino, instrumentation disponible, feedback électrique et qualité visuelle.

### 7.2.3 — Classification des écarts Fast Track

Tout écart découvert pendant FT-A, FT-B, FT-C ou FT-D est classé :

* **P0** — crash, corruption, perte de données ou rupture architecturale : correction immédiate et possibilité de ticket séparé ;
* **P1** — empêche une capacité essentielle du seuil Tinkercad : correction obligatoire dans le gate courant ;
* **P2** — défaut UX/visuel gênant mais capacité encore utilisable : backlog du gate, à fermer avant sa sortie ;
* **P3** — perfectionnement non nécessaire à la parité : report vers EXP4 sauf décision CSA contraire.

Une anomalie interne à un Capability Gate **ne crée pas automatiquement un nouveau micro-ticket**. Un ticket distinct n'est justifié que par un P0, une violation architecturale, un changement de responsabilité ou une exigence de traçabilité explicitement décidée par le CSA.

### 7.2.4 — Mode d'exécution Fast Track

Pour chaque Capability Gate, la boucle nominale devient :

**1 audit CSA ciblé → 1 mission principale d'implémentation → tests ciblés pendant le développement → 1 suite complète finale → review/red-team ciblée si risque élevé → 1 QA CSA/Product → 1 commit/push de livraison.**

Claude Code est l'agent principal d'implémentation lorsque disponible. Codex est utilisé en priorité comme vérificateur/red-team ciblé ou comme implémenteur de secours sur un périmètre précisément borné. Les agents n'obtiennent aucune autorité architecturale ou d'intégration par défaut.

La mesure de progression principale n'est plus le nombre de tickets fermés, mais le nombre de **capacités Tinkercad complètes validées de bout en bout**.

### 7.2.5 — Règle de non-duplication

Un composant déjà validé techniquement et visuellement ne doit pas être réouvert uniquement parce qu'il apparaît encore dans une séquence historique. Une réouverture exige un écart observable dans la matrice de capacité, une nouvelle exigence de qualité ou une décision CSA explicitement tracée.

---

### 7.3 Règles spécifiques de progression visuelle

1. **Audit global initial, puis contrôles ciblés** — un audit EXP3 complet est réalisé au démarrage et aux checkpoints majeurs. La clôture d'une capacité utilise un contrôle de conformité ciblé et ne déclenche pas automatiquement un nouvel audit architectural complet.
2. **Audit anticipé si nécessaire** — un nouvel audit complet est déclenché uniquement lorsqu'un travail révèle une divergence susceptible de modifier la séquence, le périmètre, les invariants ou la technologie de rendu.
3. **Amélioration visible** — chaque travail visuel doit produire une amélioration observable de la qualité de restitution ou de l'expérience, sans sacrifier les invariants du Core.
4. **Réalisme compatible** — le réalisme doit rester compatible avec les performances, la maintenabilité et l'architecture retenue ; aucune architecture 3D n'est présupposée par EXP3.
5. **Contrats canoniques** — les dimensions, pins, états et autres métadonnées déclaratives existants doivent être réutilisés plutôt que dupliqués.
6. **Séparation fonctionnel / visuel** — la géométrie fonctionnelle, les identités de pins, connexions, hitboxes, sélection, drag, câblage et simulation restent gouvernées par les responsabilités architecturales existantes. Une amélioration visuelle ne doit pas déplacer ces responsabilités.
7. **Qualité de référence** — les critères de comparaison avec Tinkercad portent sur la perception utilisateur, la cohérence, les proportions, le comportement visuel et la qualité d'interaction, pas sur une copie de code ou de mécanismes propriétaires.
8. **Contrat assets** — les nouveaux assets éventuels doivent respecter le contrat industriel adopté : transparence, sujet isolé, variantes explicites lorsque nécessaires, formats et densités cohérents, poids maîtrisé, manifeste/intégrité lorsque requis, et validation visuelle avant intégration.
9. **Tests et preuve navigateur** — chaque Capability Gate fournit tests ciblés, build/typecheck, `git diff --check`, une suite complète finale et une preuve navigateur reproductible couvrant les scénarios pertinents.
10. **CSA Visual/Technical GO** — aucun gate n'est considéré prêt à versionner tant que le CSA n'a pas validé le résultat et la conformité au périmètre.
11. **Gate de niveau 1** — `MB-VIS-TINKERCAD-048`, intégré à FT-D, constitue le jalon de décision : le passage au niveau 2 doit être explicitement validé et tracé.
12. **FAST TRACK comme ordre opérationnel de référence** — les Capability Gates §7.2.2 remplacent l'exécution séquentielle ticket-par-ticket pour EXP3. Les identifiants 031–048 restent conservés pour la traçabilité.

### 7.4 — Capitalisation de la trajectoire visuelle : MYBlab Physical/Realistic Visual Engine

Cette sous-section capitalise les enseignements des travaux visuels antérieurs et définit la continuité technologique d'EXP3 → EXP5. Elle ne constitue pas une autorisation d'introduire une technologie nouvelle sans validation CSA.

**Base expérimentale.** Un premier lot de renderers a été porté à un langage volumétrique SVG, puis les composants de la vague visuelle ont été migrés vers un backend raster réaliste. Ces travaux sont des étapes historiques valides et ne doivent pas être réécrits uniquement pour uniformiser les numéros de tickets.

**État réel actuellement capitalisé.** Le backend déclaratif raster est désormais utilisé par **16 composants sur 16** de la vague visuelle : LED, RESISTOR, DIODE, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, BUTTON, BUTTON_LATCHING, BUZZER, POTENTIOMETER, RGB_LED, NPN_TRANSISTOR, SERVO, POWER et ARDUINO. La phase de rasterisation du catalogue de cette vague est donc **terminée**. Les assets correspondants suivent le contrat de production établi et les composants déclarent leur backend visuel via les mécanismes de présentation existants.

**Capitalisation du pipeline.** La vague visuelle confirme comme référence durable le pipeline suivant lorsqu'un nouvel asset est réellement nécessaire : production d'un asset physique réaliste → package raster transparent 1x/3x en WebP + PNG → manifeste et intégrité compatibles avec le gate de qualité → probe pixel/géométrique lorsque les contacts physiques doivent coïncider avec les pins → intégration déclarative du backend raster → validation navigateur aux zooms pertinents → tests/build → CSA Visual GO → versionnage. Les corrections d'asset et de metadata doivent être résolues avant de déplacer les contrats fonctionnels ; la géométrie canonique ne doit jamais être ajustée uniquement pour masquer un défaut du raster.

**Nouvelle référence d'ambition.** Une référence visuelle de laboratoire électronique réaliste fournie par le CSA constitue la référence d'ambition artistique d'EXP3 → EXP5 : les composants doivent tendre à être perçus comme de véritables objets physiques (silhouettes crédibles, volume, matériaux différenciés, leads et connecteurs physiques, profondeur, ombres et éclairage cohérents, contact avec la surface, cohérence inter-composants et avec la breadboard). Comme Tinkercad, c'est un **benchmark d'ambition**, pas une spécification à reproduire pixel par pixel.

**Principe architectural absolu.** La géométrie fonctionnelle, l'identité des pins, les connexions, la hitbox, la sélection, le drag, le câblage et la simulation restent gouvernés par leurs sources de vérité architecturales. La représentation visuelle doit pouvoir évoluer sans déplacer les responsabilités du Core.

**Trajectoire actuelle.**

```text
16/16 composants rasterisés
    ↓
FT-A — Component Completion
    ↓
FT-B — Physical Connectivity (038–040)
    ↓
FT-C — Assembly Experience (041–045)
    ↓
FT-D — Tinkercad Qualification (046–048)
    ↓
MB-VIS-TINKERCAD-048 — Gate Niveau 1
    ↓
EXP4 — Dépasser Tinkercad
    ↓
EXP5 — Laboratoire virtuel avancé et immersif
```

**Règle de technologie.** La technologie de rendu peut évoluer si les contraintes de qualité, performance, maintenabilité ou réalisme le justifient, mais aucun basculement architectural majeur n'est implicite dans le Fast Track. Une décision de technologie nouvelle relève d'une analyse et, si nécessaire, d'une ADR avant intégration.

**Capitalisation obligatoire.** Les enseignements du protocole visuel existant restent obligatoires : audit, référence, validation pixel/géométrique lorsque pertinente, pins/câblage, breadboard, zoom, tests/build, CSA Visual/Technical GO et versionnage contrôlé.

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

EXP1 ───────────────────── EXP2 ───── EXP3 ───── EXP4 ───── EXP5
                              │
                              └── FAST TRACK §7.2.2
                                  FT-A → FT-B → FT-C → FT-D
                                             ↓
                                  MB-VIS-TINKERCAD-048

L1-A ──→ L1-B / L1-C / L1-D / L1-E / L1-F ──→ L1-G
   │
   └── alimenté notamment par EXP3 (rendu et bibliothèque de composants,
       cf. §1.3.4 : l'industrialisation MB-VIS-COMP-001..007 est une
       fondation de L1-A)
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

Les priorités ne constituent pas un calendrier. Elles indiquent un ordre stratégique de traitement.

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

## J7 — Seuil Tinkercad

Résultats attendus :

* **16/16 composants rasterisés** et qualifiés par FT-A ;
* contrat physique de connectivité validé par FT-B ;
* scénarios d'assemblage de bout en bout validés par FT-C ;
* cohérence du laboratoire et visual regression verrouillées par FT-D ;
* **MB-VIS-TINKERCAD-048** exécuté comme gate comparatif ;
* aucun écart P0/P1 empêchant la parité de Niveau 1 ;
* décision explicite de passage au Niveau 2 — Dépasser Tinkercad.

J7 est un jalon Experience. Il ne modifie pas à lui seul les responsabilités architecturales du Tome II.

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

### R8 — La trajectoire Tinkercad est un benchmark, pas une spécification

Les travaux EXP3 peuvent utiliser Tinkercad comme référence de qualité perçue et d'expérience, mais ne doivent pas copier son code, ses mécanismes propriétaires ou présumer une architecture identique. Le benchmark sert à mesurer un niveau cible ; l'architecture de MYBlab reste gouvernée par le Tome II et les ADR.

### R9 — Audit lourd initial, contrôle léger ensuite

Après un audit EXP3 global validé, les travaux sont contrôlés par rapport à la matrice de capacité, au Blueprint, aux invariants, aux tests et aux preuves de livraison. Un nouvel audit global n'est requis qu'en cas de divergence significative ou à un checkpoint explicitement défini.

### R10 — Le dépôt réel est la source de vérité opérationnelle

La roadmap ne doit jamais imposer la répétition d'un travail déjà réalisé et validé dans le dépôt réel. Les identifiants historiques sont conservés pour la traçabilité, tandis que la séquence opérationnelle est recalée sur l'état réel du code, des assets, des tests et des artefacts PMO.

### R11 — Pilotage par capacité, pas par micro-ticket

Pendant EXP3 Fast Track, une anomalie qui reste dans le périmètre d'un Capability Gate est corrigée dans ce gate sans créer automatiquement un nouveau ticket. Seuls un P0, une violation architecturale, un changement de responsabilité ou une décision explicite de traçabilité justifient une unité PMO séparée.

### R12 — Deux gates de validation par capacité

Une Capability Fast Track possède deux niveaux de sortie : **Gate ingénieur** (tests ciblés, suite complète finale, build/typecheck, diff-check) puis **Gate CSA/Product** (contrôle d'architecture, preuves et validation navigateur/visuelle lorsque pertinente). Les suites complètes ne doivent pas être répétées inutilement à chaque micro-correction interne.

### R13 — Répartition des rôles IA Fast Track

Le CSA conserve la responsabilité de l'architecture, du séquencement, des invariants et des GO/STOP. Claude Code est l'implémenteur principal lorsque disponible. Codex est prioritairement utilisé comme red-team/reviewer ciblé ou implémenteur de secours. Aucun agent n'a d'autorité d'intégration implicite.

---

# 16. Traçabilité

```text
MYBLAB_VISION_2030.md
        ↓
PLATFORM_ARCHITECTURE.md
        ↓
ROADMAP_PLATFORM.md
        ↓
Programme / Vague Level 1 / Épic / Capability Gate
        ↓
Ticket PMO ou unité d'exécution Fast Track
        ↓
Execution Blueprint
        ↓
Implémentation
        ↓
Delivery Report
        ↓
Audit architectural / contrôle de conformité / Parity Gate
```

---

# 17. État de référence

Cette version de `ROADMAP_PLATFORM.md` intègre la conclusion de l'audit stratégique Level 1 du 15 septembre 2026, tout en conservant la capitalisation complète de la vague raster EXP3 réalisée sous le Programme Experience.

Le recalage conserve les identifiants historiques `031` à `048` pour assurer la traçabilité, et capitalise le **FAST TRACK TINKERCAD FT-A → FT-B → FT-C → FT-D** comme mécanique d'exécution des travaux relevant du Programme Experience.

Les **16 composants sur 16** du catalogue de la vague visuelle sont capitalisés en raster : LED, RESISTOR, DIODE, CAPACITOR, LDR, THERMISTOR, DC_MOTOR, BUTTON, BUTTON_LATCHING, BUZZER, POTENTIOMETER, RGB_LED, NPN_TRANSISTOR, SERVO, POWER et ARDUINO. Il ne reste donc plus de campagne de rasterisation POWER/ARDUINO à ouvrir.

Elle conserve la trajectoire durable : **atteindre le niveau Tinkercad → dépasser Tinkercad → tendre vers un laboratoire électronique virtuel MYBlab avancé, réaliste, immersif et extensible.**

**La conclusion opérationnelle de l'audit du 15 septembre 2026 prévaut pour la campagne actuelle : L1-A n'est pas terminé ; il reste prioritaire avant L1-B.** Le prochain travail exécutable doit être déterminé à partir du dépôt réel et du DAG L1-A (§1.3.7), en commençant par la qualification du Rollout Gate (A0) et du contrat générique de propriétés d'instance (A1) avant toute expansion massive du catalogue. `FT-A-001 — 16/16 Component Capability Matrix & Gap Closure` reste une unité valide du Programme Experience, mais n'est plus à lui seul la prochaine unité opérationnelle prioritaire : il est désormais séquencé dans le DAG L1-A comme contribution à la clôture du catalogue, et non comme point d'entrée de la campagne actuelle.

Les états « réalisé », « partiel », « planifié » ou « non commencé », ainsi que les états `PRESENT`, `FUNCTIONAL` et `PARITY` (§1.3.1), ne constituent pas des décisions de clôture PMO. Toute clôture exige les preuves prévues par la gouvernance.
