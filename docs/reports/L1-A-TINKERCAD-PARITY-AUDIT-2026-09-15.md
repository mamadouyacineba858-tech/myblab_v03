# L1-A — Audit de parité Tinkercad ↔ MYBlab

Date : 15 septembre 2026
Référence : `origin/main` canonique après synchronisation
Portée : L1-A — Component Catalogue & Instance Contract Parity

## 1. Verdict exécutif

L1-A n'est pas terminé. L'audit confirme cependant que plusieurs fondations que la roadmap présentait encore comme futures existent déjà dans le dépôt réel et ne doivent pas être recréées :

- A0 Component Library Rollout Gate : présent et verrouillé par `componentLibraryRolloutGate.test.js` ;
- A1 Generic Component Instance Properties : présent (`componentProperties.js`, persistance/normalisation/round-trip déjà établis dans la lignée Level 1) ;
- A2 DC Sources : POWER + BATTERY_AA + BATTERY_9V + COIN_CELL_CR2032 présents ;
- Environmental Stimulus Foundation : présente ; LIGHT → LDR est déjà raccordé ;
- SimulatedClock + Scheduler : présents ;
- Runtime Arduino + intégration Scheduler/Simulation : présents ;
- firmware Arduino V1 : compilation/exécution réelle mais subset volontairement limité ;
- Measurement/Observation : fondation présente, mesure V/I disponible.

Le prochain travail ne doit donc pas reconstruire ces fondations.

## 2. Baseline benchmark Tinkercad retenue

Le benchmark de catalogue est organisé par familles :

- General : Resistor, Capacitor, Polarized Capacitor, Diode, Zener Diode, Inductor ;
- Input : Pushbutton, Potentiometer, Slideswitch, Photoresistor, Photodiode/Ambient Light, Flex Sensor, Force Sensor, IR Sensor, Ultrasonic Distance Sensor, PIR, Soil Moisture, Tilt Sensor, TMP36, Gas Sensor, Keypad 4x4, DIP Switch ;
- Output : LED, RGB LED, Light Bulb, NeoPixel, Vibration Motor, DC Motor, Micro Servo, Piezo/Buzzer, IR Remote, 7-Segment, LCD 16x2 ;
- Power : 9V Battery, 1.5V Battery, Coin Cell 3V, Solar Cell, Potato/Lemon Battery ;
- Programmable/IC : Arduino Uno R3, ATtiny, timers, op-amp, comparators, optocoupler ; micro:bit est également un benchmark officiel de programmation Tinkercad ;
- Power Control : NPN, PNP, nMOS, pMOS, relais, régulateurs 5V/3.3V, H-Bridge/motor control ;
- Logic : NAND, NOR, AND, OR, XOR, inverter, Schmitt, flip-flops, latches, counters et familles logiques associées ;
- Instruments : Multimeter, Power Supply, Function Generator, Oscilloscope.

Les variantes historiques ou insuffisamment confirmées restent candidates et ne bloquent pas L1-A tant qu'elles ne sont pas requalifiées par une source benchmark suffisamment forte.

## 3. État MYBlab observé

Le `canonicalRegistry` expose 20 types :

`LED`, `RESISTOR`, `ARDUINO`, `BUTTON`, `BUTTON_LATCHING`, `POWER`, `BATTERY_AA`, `COIN_CELL_CR2032`, `BATTERY_9V`, `CAPACITOR`, `BUZZER`, `POTENTIOMETER`, `LDR`, `THERMISTOR`, `DIODE`, `RGB_LED`, `NPN_TRANSISTOR`, `SERVO`, `DC_MOTOR`, `POLARIZED_CAPACITOR`.

Tous sont au minimum PRESENT dans le contrat canonique. La qualification FUNCTIONAL/PARITY dépend du comportement considéré et ne doit pas être confondue avec la seule qualification visuelle FT-A.

### 3.1 Déjà présents et suffisamment fondés pour ne pas créer de ticket de catalogue

- Resistor ;
- Capacitor ;
- Polarized Capacitor ;
- Diode (modèle direct simplifié, pas Zener) ;
- Pushbutton ;
- Potentiometer ;
- Photoresistor/LDR ;
- LED ;
- RGB LED ;
- DC Motor (électrique simplifié) ;
- Micro Servo (présent ; comportement positionnel complet à qualifier ailleurs) ;
- Piezo/Buzzer (présent ; comportement sonore complet à qualifier ailleurs) ;
- 1.5V Battery ;
- 9V Battery ;
- Coin Cell 3V ;
- Arduino Uno (présent et runtime firmware V1 réel, mais pas encore parité Arduino complète) ;
- NPN transistor ;
- Power Supply MYBlab.

THERMISTOR est également présent dans MYBlab mais sa relation température → résistance n'est pas encore implémentée ; il constitue une capacité MYBlab utile et une base pour L1-C, même si le benchmark Tinkercad principal retient TMP36 comme capteur de température.

### 3.2 Absents du catalogue canonique et confirmés comme gaps L1-A

- Inductor ; Zener Diode ;
- Slideswitch ; DIP Switch ;
- Photodiode/Ambient Light Sensor ; Flex Sensor ; Force Sensor ; IR Sensor ; Ultrasonic Distance Sensor ; PIR ; Soil Moisture ; Tilt Sensor ; TMP36 ; Gas Sensor ; Keypad 4x4 ;
- Light Bulb ; NeoPixel ; Vibration Motor ; IR Remote ; 7-Segment ; LCD 16x2 ; Hobby Gearmotor si retenu comme variante benchmark ;
- Solar Cell ; Potato/Lemon Battery ;
- ATtiny ; micro:bit ;
- Timer/555, Dual Timer, Op-Amp, comparators, optocoupler ;
- PNP, nMOS, pMOS, relais, régulateurs, H-Bridge/motor controller ;
- familles de logique combinatoire et séquentielle ;
- Multimeter comme instrument physique benchmark, Function Generator et Oscilloscope. La fondation Measurement V/I existe mais ne doit pas être confondue avec la parité UX/fonctionnelle de ces instruments.

## 4. Gaps de capacité transversale découverts

### 4.1 Switch topology — premier verrou réel

`preparation.js` contient encore deux branches spécifiques : `BUTTON` et `BUTTON_LATCHING`, qui réalisent directement l'union interne des pins selon l'état. Le Rollout Gate répertorie explicitement ces deux branches comme exceptions historiques et interdit l'apparition silencieuse d'une nouvelle comparaison de type dans les dispatchers génériques.

Conséquence : ajouter `SLIDE_SWITCH` par un troisième `if (comp.type === ...)` serait une régression architecturale. Avant Slide Switch et DIP Switch, MYBlab doit disposer d'un contrat générique/declaratif de topologie de switch, puis migrer BUTTON/BUTTON_LATCHING vers ce contrat sans changer leur comportement.

C'est le premier nœud exécutable du DAG.

### 4.2 Transient / dynamic electrical behavior

Le solveur actuel possède un registre générique de contributions DC. CAPACITOR/POLARIZED_CAPACITOR sont correctement ouverts en régime DC établi, mais leur capacité n'intervient pas encore dans un modèle transitoire. INDUCTOR, charge/décharge de condensateur, dynamique moteur, formes d'onde et plusieurs IC nécessitent L1-D.

### 4.3 Reverse breakdown

La DIODE actuelle modélise conduction directe et blocage inverse simplifiés. Zener exige une sémantique de claquage inverse dédiée ; ne pas l'émuler par une simple variante visuelle de DIODE.

### 4.4 Environmental expansion

L'infrastructure environnementale existe déjà et LIGHT → LDR fonctionne. Les futurs capteurs doivent étendre le contrat par stimuli génériques (TEMPERATURE, FORCE/FLEX, MOISTURE, MOTION, DISTANCE, GAS/IR selon modèle) au lieu de créer un moteur environnemental par composant.

### 4.5 Arduino / Embedded

Arduino est FUNCTIONAL mais pas PARITY : le compiler firmware V1 supporte actuellement `setup`, `loop`, `pinMode(2|3, OUTPUT)`, `digitalWrite(2|3, HIGH|LOW)` et `delay(littérale)`. `digitalRead`, `analogRead`, `analogWrite` dans le langage firmware, Serial et les pins générales sont explicitement hors subset V1, même si le runtime bas niveau possède déjà des primitives PWM. La parité Arduino reste donc propriété L1-E.

### 4.6 Measurement / Instruments

Le contrat Measurement V1 supporte VOLTAGE et CURRENT via Observation/Simulation. Il constitue la fondation correcte pour le Multimeter, mais le composant/instrument benchmark complet et les modes supplémentaires restent à qualifier. Function Generator et Oscilloscope dépendent d'une représentation temporelle/transitoire suffisante.

## 5. DAG exécutable réconcilié

Les nœuds déjà réalisés sont retirés de la file d'exécution :

`A0 Rollout Gate` → DONE/QUALIFIED
`A1 Instance Properties` → DONE/AVAILABLE
`A2 DC Source/Battery Family` → DONE/AVAILABLE
`ENV Foundation + LIGHT/LDR` → AVAILABLE
`Clock/Scheduler` → AVAILABLE
`Arduino runtime integration` → AVAILABLE, parity incomplete
`Measurement V/I foundation` → AVAILABLE

La séquence L1-A devient :

1. **A3-SW0 — Generic Switch Topology Contract** : remplacer les exceptions BUTTON/BUTTON_LATCHING par un contrat générique, comportement inchangé.
2. **A3-SW1 — Slide Switch** : premier consommateur 3 bornes du contrat.
3. **A3-SW2 — DIP Switch Family** : composition multi-switch déclarative, sans nouveau branchement Core.
4. **A6 — Low-risk actuator/output variants** : Vibration Motor, Light Bulb, Hobby Gearmotor selon réutilisation des contrats existants ; aucune duplication du moteur DC.
5. **A7-C — Environmental sensor expansion** : TMP36/temperature puis Force/Flex, Soil, PIR/Tilt/IR ; Ultrasonic après contrat distance/temps approprié.
6. **A4/A5-D — Electrical depth prerequisites** : transient foundation avant Inductor et dynamique capacitive ; reverse-breakdown contract avant Zener.
7. **A8 — Semiconductor/Power Control** : PNP → nMOS/pMOS → relay/regulators → H-Bridge, en privilégiant des contrats de familles.
8. **A9 — Digital Logic** : contrat logique combinatoire → portes ; puis contrat séquentiel basé sur Scheduler → flip-flops/latches/counters.
9. **A10 — Displays** : 7-Segment après logique combinatoire ; LCD 16x2 après interface/driver approprié.
10. **A12 — Addressable RGB** : protocole/state engine générique NeoPixel → variantes.
11. **A11 — Analog IC** : 555/Dual Timer, Op-Amp, comparators, optocoupler selon capacités L1-D.
12. **A13 / L1-E — Programmable** : élargissement Arduino vers parité, puis ATtiny et micro:bit par contrat board/runtime commun lorsque possible.
13. **A14 / L1-F — Instruments** : Multimeter sur Measurement existant ; Function Generator ; Oscilloscope après capacité temporelle suffisante.
14. **Power/special sources** : Solar Cell et Potato/Lemon Battery après clarification du contrat environnemental/électrochimique et de leur priorité produit.
15. **L1-A Catalogue Closure Gate** : aucune référence benchmark sans statut ni propriétaire L1-C/D/E/F.

## 6. Direction obligatoire après cet audit

**DIRECTION EXÉCUTIVE LEVEL 1 — L1-A reste la priorité active. Le prochain nœud est A3-SW0 Generic Switch Topology Contract. Les tickets suivants doivent être sélectionnés dans l'ordre du DAG réconcilié ci-dessus, en sautant tout nœud déjà réalisé ou devenu inutile. Un nouvel audit global Tinkercad ↔ MYBlab n'est PAS requis avant chaque ticket : seul un contrôle ciblé du dépôt réel est requis pour vérifier que la cible, le HEAD et ses dépendances n'ont pas changé. L1-B Breadboard/Wire ne reprend qu'après satisfaction du gate de sortie L1-A ou décision CSA explicite de dépendance bloquante.**

## 7. Règle de clôture

Cet audit remplace l'ancien ordre théorique A0 → A1 → A2 comme file d'exécution, car ces fondations sont désormais observées dans le dépôt canonique. Il ne déclare pas les composants existants PARITY sans preuve benchmark. Il fixe le DAG de travail ; les audits futurs sont ciblés par nœud, sauf divergence architecturale majeure ou changement substantiel du benchmark.
