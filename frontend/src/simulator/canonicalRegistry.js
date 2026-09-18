const DECLARED_TYPES_PINS = {
  BATTERY_AA:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  COIN_CELL_CR2032:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  BATTERY_9V:[{id:'plus',role:'power_out'},{id:'minus',role:'ground_out'}],
  LED:[{id:'anode',role:'input'},{id:'cathode',role:'input'}],
  RESISTOR:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  ARDUINO:[{id:'D2',role:'gpio'},{id:'D3',role:'gpio'},{id:'GND',role:'ground'},{id:'5V',role:'power'}],
  BUTTON:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  BUTTON_LATCHING:[{id:'pin1',role:'switch'},{id:'pin2',role:'switch'}],
  POWER:[{id:'5V',role:'power_out'},{id:'GND',role:'ground_out'}],
  CAPACITOR:[{id:'pinA',role:'passive'},{id:'pinB',role:'passive'}],
  POLARIZED_CAPACITOR:[{id:'plus',role:'passive'},{id:'minus',role:'passive'}],
  BUZZER:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  POTENTIOMETER:[{id:'left',role:'passive'},{id:'wiper',role:'output'},{id:'right',role:'passive'}],
  LDR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  THERMISTOR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  DIODE:[{id:'anode',role:'input'},{id:'cathode',role:'output'}],
  RGB_LED:[{id:'R',role:'input'},{id:'common',role:'ground'},{id:'G',role:'input'},{id:'B',role:'input'}],
  NPN_TRANSISTOR:[{id:'collector',role:'input'},{id:'base',role:'input'},{id:'emitter',role:'output'}],
  PNP_TRANSISTOR:[{id:'collector',role:'input'},{id:'base',role:'input'},{id:'emitter',role:'output'}],
  NMOS:[{id:'drain',role:'input'},{id:'gate',role:'input'},{id:'source',role:'output'}],
  PMOS:[{id:'drain',role:'input'},{id:'gate',role:'input'},{id:'source',role:'output'}],
  SERVO:[{id:'signal',role:'gpio'},{id:'vcc',role:'power'},{id:'gnd',role:'ground'}],
  DC_MOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  // A3-SW1 — Slide Switch (SPDT) : 3 pins, une seule connexion interne active
  // à la fois selon la position (cf. DECLARED_INTERNAL_CONNECTIONS ci-dessous).
  SLIDE_SWITCH:[{id:'throwA',role:'switch'},{id:'common',role:'switch'},{id:'throwB',role:'switch'}],
  // A3-SW2 — DIP Switch 4 positions : 4 canaux SPST indépendants, 8 pins
  // électriques (2 par canal). Aucune connexion croisée entre canaux (cf.
  // DECLARED_INTERNAL_CONNECTIONS.channels ci-dessous).
  DIP_SWITCH:[
    {id:'1A',role:'switch'},{id:'1B',role:'switch'},
    {id:'2A',role:'switch'},{id:'2B',role:'switch'},
    {id:'3A',role:'switch'},{id:'3B',role:'switch'},
    {id:'4A',role:'switch'},{id:'4B',role:'switch'},
  ],
  // A6-OUT1 — Vibration Motor : réutilisation DE LA FAMILLE DC_MOTOR (mêmes
  // rôles de broches plus/minus, cf. roadmap A6 "aucune duplication du
  // moteur DC"). Contrat électrique volontairement identique à DC_MOTOR ;
  // seule la présentation (componentDefinitions.js + renderer) diffère.
  VIBRATION_MOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  // A6-OUT2 — Light Bulb : charge résistive DC simple à deux bornes,
  // NON polarisée (à la différence de DC_MOTOR/VIBRATION_MOTOR, qui gardent
  // plus/minus par convention historique). Rôles/IDs 'A'/'B', réutilisation
  // STRICTE de la convention déjà établie par RESISTOR/LDR/THERMISTOR pour
  // les composants résistifs non polarisés — aucune nouvelle convention de
  // nommage introduite. Aucun modèle thermique/filament : hors périmètre.
  LIGHT_BULB:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  // A6-OUT3 — Hobby Gearmotor : réutilisation DE LA FAMILLE DC_MOTOR (mêmes
  // rôles de broches plus/minus que DC_MOTOR/VIBRATION_MOTOR) — composant
  // POLARISÉ, à la différence de LIGHT_BULB. Contrat électrique
  // volontairement identique à DC_MOTOR ; seule la présentation
  // (componentDefinitions.js + renderer) diffère. Câblage UNIQUEMENT
  // (wireConnectable:true / breadboardInsertable:false sur les deux
  // broches, cf. componentDefinitions.js) — jamais enfichable breadboard.
  HOBBY_GEARMOTOR:[{id:'plus',role:'input'},{id:'minus',role:'input'}],
  // A7-C1 — TMP36 : capteur de température analogique alimenté, 3 broches
  // DIRECTIONNELLES (à la différence de LDR/THERMISTOR, non polarisées) —
  // même vocabulaire de rôles que SERVO/ARDUINO (power/output/ground), pas
  // de nouveau rôle introduit. `vout` est en sortie (role 'output', comme
  // POTENTIOMETER.wiper/DIODE.cathode) : sa tension effective est produite
  // par environmentalResponseRegistry.js à partir du stimulus TEMPERATURE
  // (contrat générique A7-C0), jamais calculée ici.
  TMP36:[{id:'plus',role:'power'},{id:'vout',role:'output'},{id:'gnd',role:'ground'}],
  // A7-C2 — Force Sensor (FSR) / Flex Sensor : capteurs résistifs deux
  // bornes NON polarisées, même vocabulaire de rôles que LDR/THERMISTOR
  // ('sensor'/'sensor') — aucun nouveau rôle introduit. Leur résistance
  // EFFECTIVE dépend d'un stimulus environnemental runtime (FORCE / FLEX,
  // cf. environmentalStimulusRegistry.js + environmentalResponseRegistry.js,
  // même contrat générique A7-C0 que LDR/LIGHT et TMP36/TEMPERATURE) ; ce
  // paramètre `resistance` reste le fallback historique tant qu'aucun
  // stimulus actif n'est fourni.
  FORCE_SENSOR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  FLEX_SENSOR:[{id:'A',role:'sensor'},{id:'B',role:'sensor'}],
  // A7-C3 — Soil Moisture Sensor (YL-69 probe + YL-38 interface module) :
  // 4 broches DIRECTIONNELLES, ordre verrouillé VCC/AO/DO/GND (§3 du ticket),
  // même vocabulaire de rôles que TMP36/SERVO/ARDUINO (power/output/ground) —
  // aucun nouveau rôle introduit. AO (analogique, dcContributionRegistry.js)
  // et DO (numérique calculée, digitalContributionRegistry.js) sont deux
  // sorties DISTINCTES, jamais fusionnées en un seul pin.
  SOIL_MOISTURE_SENSOR:[{id:'VCC',role:'power'},{id:'AO',role:'output'},{id:'DO',role:'output'},{id:'GND',role:'ground'}],
  // A7-C4-PIR — PIR Motion Sensor (HC-SR501-style module) : 3 broches
  // DIRECTIONNELLES, ordre verrouillé VCC/OUT/GND (§7 du ticket), même
  // vocabulaire de rôles que TMP36/SOIL_MOISTURE_SENSOR (power/output/
  // ground) — aucun nouveau rôle introduit. OUT est la SEULE sortie
  // fonctionnelle (numérique calculée, digitalContributionRegistry.js) —
  // aucune sortie analogique/DC pour ce composant (§12 du ticket).
  PIR_MOTION_SENSOR:[{id:'VCC',role:'power'},{id:'OUT',role:'output'},{id:'GND',role:'ground'}],
  // A7-C4-TILT — Tilt Sensor (SW-520D-style module) : le pack Founder PASS
  // approuvé expose UNIQUEMENT 2 broches visibles DO/GND (§0/§7 du ticket) —
  // à la différence de TMP36/SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR (3
  // broches directionnelles avec `power`), ce module N'A PAS de broche VCC :
  // aucune broche `power` n'est donc introduite ici (§11 du ticket, audit
  // électrique DO/GND deux bornes — voir digitalContributionRegistry.js pour
  // la garde d'alimentation qui en découle, basée uniquement sur GND réel).
  // Même vocabulaire de rôles que les autres capteurs numériques (output/
  // ground), aucun nouveau rôle introduit. DO est la SEULE sortie
  // fonctionnelle (numérique calculée, digitalContributionRegistry.js).
  TILT_SENSOR:[{id:'DO',role:'output'},{id:'GND',role:'ground'}],
  // A7-C4-IR — IR Receiver (TSOP4838-style 38 kHz module) : 3 broches
  // DIRECTIONNELLES, ordre verrouillé SIGNAL/GND/VCC (§5 du ticket — ordre
  // DIFFÉRENT de PIR_MOTION_SENSOR/SOIL_MOISTURE_SENSOR qui placent VCC en
  // tête ; ici le pack Founder PASS expose visuellement SIGNAL en premier).
  // Même vocabulaire de rôles que TMP36/SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR
  // (power/output/ground), aucun nouveau rôle introduit. SIGNAL est la SEULE
  // sortie fonctionnelle (numérique calculée, active-low, §12 du ticket) —
  // aucune sortie analogique/DC pour ce composant (§15 du ticket).
  IR_RECEIVER:[{id:'SIGNAL',role:'output'},{id:'GND',role:'ground'},{id:'VCC',role:'power'}],
  // A7-C5 — HC-SR04 Ultrasonic Distance Sensor : 4 broches DIRECTIONNELLES,
  // ordre verrouillé VCC/TRIG/ECHO/GND (§8 du ticket), même vocabulaire de
  // rôles que TMP36/SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR/IR_RECEIVER
  // (power/output/ground) plus un rôle `input` déjà utilisé ailleurs (LED,
  // DIODE, NPN_TRANSISTOR) — aucun nouveau rôle introduit. TRIG est une
  // ENTRÉE numérique observée par le producteur temporel dédié (§14/§15 du
  // ticket, Generic Timed Digital Output Runtime) ; ECHO est la SEULE sortie
  // fonctionnelle, TEMPORELLE (durée HIGH encodant la distance, §16/§17/§19
  // du ticket) — premier composant réel de A7-C5-PREQ. Aucune sortie
  // analogique/DC (§13 du ticket : garde d'alimentation VCC/GND réelle
  // uniquement, même patron que PIR_MOTION_SENSOR/IR_RECEIVER).
  HC_SR04:[{id:'VCC',role:'power'},{id:'TRIG',role:'input'},{id:'ECHO',role:'output'},{id:'GND',role:'ground'}],
  // A4-INDUCTOR — Inductance axiale, deux bornes NON polarisées, même rôle
  // 'passive' exact que RESISTOR/CAPACITOR (composant passif réciproque, ni
  // source ni sortie logique). Aucun rôle plus/minus : une inductance
  // idéale n'a pas de polarité électrique (§6 du ticket).
  INDUCTOR:[{id:'A',role:'passive'},{id:'B',role:'passive'}],
  // A5-ZENER_DIODE — Diode Zener axiale, asset Founder PASS/FROZEN. Pins
  // canoniques verrouillés par le pack Founder (manifest.json
  // `visiblePinOrder`/`polarity`) : A = anode (input), K = cathode (output)
  // — PAS `anode`/`cathode` comme DIODE, dénomination imposée par l'asset.
  // Même rôle input/output que DIODE (§6/§18 du ticket).
  ZENER_DIODE:[{id:'A',role:'input'},{id:'K',role:'output'}],
}

const DECLARED_TYPE_ORDER = ['LED','RESISTOR','ARDUINO','BUTTON','BUTTON_LATCHING','POWER','BATTERY_AA','COIN_CELL_CR2032','BATTERY_9V','CAPACITOR','BUZZER','POTENTIOMETER','LDR','THERMISTOR','DIODE','RGB_LED','NPN_TRANSISTOR','PNP_TRANSISTOR','NMOS','PMOS','SERVO','DC_MOTOR','POLARIZED_CAPACITOR','SLIDE_SWITCH','DIP_SWITCH','VIBRATION_MOTOR','LIGHT_BULB','HOBBY_GEARMOTOR','TMP36','FORCE_SENSOR','FLEX_SENSOR','SOIL_MOISTURE_SENSOR','PIR_MOTION_SENSOR','TILT_SENSOR','IR_RECEIVER','HC_SR04','INDUCTOR','ZENER_DIODE']

const DECLARED_PARAMETER_SCHEMA = {
  BATTERY_AA:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:1.5,maximum:1.5,defaultValue:1.5,description:'Tension nominale fixe de la pile'}],
  COIN_CELL_CR2032:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:3,maximum:3,defaultValue:3,description:'Tension nominale fixe de la pile'}],
  BATTERY_9V:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:9,maximum:9,defaultValue:9,description:'Tension nominale fixe de la pile'}],
  POWER:[{key:'voltage',parameterType:'voltage',unit:'V',minimum:0.001,maximum:1000,defaultValue:5,description:'Tension de sortie de la source en Volts'}],
  RESISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:220,description:'Valeur de la résistance en Ohms'}],
  LDR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:10000000,defaultValue:10000,description:'Résistance fixe par défaut (fallback historique) tant qu\'aucun stimulus environnemental LIGHT actif n\'est fourni. Sous LIGHT actif (MB-L1-ENV-001), la résistance EFFECTIVE de cette LDR est calculée par le Registry environnemental dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce paramètre persistant.'}],
  THERMISTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:100,maximum:1000000,defaultValue:10000,description:'Résistance fixe (mode simplifié MB-SIM-008, type NTC) : cette thermistance est modélisée par une résistance constante et ne dépend pas de la température — la relation température → résistance est hors périmètre de MB-SIM-008.'}],
  DIODE:[
    {key:'forwardVoltage',parameterType:'voltage',unit:'V',minimum:0,maximum:5,defaultValue:0.7,description:'Tension de seuil de conduction directe (modèle DC simplifié, MB-SIM-008 v2) : diode idéale à seuil, sans modèle non linéaire complet ni dynamique de commutation.'},
    {key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:10,description:'Résistance équivalente en conduction directe au-delà du seuil (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  DC_MOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente du bobinage (modèle électrique DC simplifié, MB-SIM-008 v2) : vitesse, couple, inertie et force contre-électromotrice dynamique sont hors périmètre.'}],
  // A6-OUT1 : même schéma/valeur par défaut que DC_MOTOR — aucune fiche
  // technique réelle de moteur vibreur ne justifie une valeur différente à
  // ce stade. Documenté explicitement comme une équivalence électrique
  // simplifiée (pas une caractéristique moteur mesurée), au même titre que
  // DC_MOTOR : vitesse, couple, inertie et force contre-électromotrice
  // dynamique restent hors périmètre.
  VIBRATION_MOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée (modèle électrique DC simplifié, A6-OUT1, réutilise la convention DC_MOTOR de MB-SIM-008 v2) : vitesse, couple, inertie et force contre-électromotrice dynamique sont hors périmètre.'}],
  // A6-OUT2 : ampoule = charge résistive DC simple (loi d'Ohm), NON polarisée.
  // Même bornes min/max que DC_MOTOR/VIBRATION_MOTOR (ordre de grandeur d'un
  // filament/charge basse résistance) ; valeur par défaut 20 Ω documentée
  // comme une équivalence électrique simplifiée (pas une fiche technique
  // d'ampoule réelle) — aucun modèle thermique de filament, aucun
  // vieillissement, aucun claquage : hors périmètre de ce ticket.
  LIGHT_BULB:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée du filament (modèle électrique DC simplifié, A6-OUT2) : aucun modèle thermique, aucune non-linéarité tungstène, aucun vieillissement/claquage — hors périmètre à ce niveau de simulation.'}],
  // A6-OUT3 : même schéma/valeur par défaut que DC_MOTOR/VIBRATION_MOTOR —
  // aucune fiche technique réelle du gearmotor ne justifie une valeur
  // différente à ce stade (équivalence électrique simplifiée, pas une
  // caractéristique moteur/réducteur mesurée). Aucun modèle mécanique du
  // réducteur (couple, inertie, rapport de réduction) : hors périmètre.
  HOBBY_GEARMOTOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:20,description:'Résistance électrique équivalente simplifiée (modèle électrique DC simplifié, A6-OUT3, réutilise la convention DC_MOTOR de MB-SIM-008 v2) : vitesse, couple, inertie, rapport de réduction du réducteur et force contre-électromotrice dynamique sont hors périmètre.'}],
  CAPACITOR:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:1e-7,description:'Capacité (modèle DC établi, MB-SIM-008 v2) : le condensateur est traité comme un circuit ouvert en régime permanent (I=0) ; cette valeur n\'intervient pas dans l\'analyse DC et n\'est significative que pour un futur modèle Transitoire, hors périmètre de MB-SIM-008. Défaut 1e-7 F (100 nF, MB-L1-PROP-005) : cohérent avec le boîtier céramique radial Candidate C et son marquage EIA "104" dérivé dynamiquement — l\'ancien défaut 1e-4 F (100 µF) ne correspondait à aucune identité visuelle réaliste.'}],
  POLARIZED_CAPACITOR:[{key:'capacitance',parameterType:'capacitance',unit:'F',minimum:1e-12,maximum:1,defaultValue:0.0001,description:'Capacité (modèle DC établi, FT-C-COMP-002) : le condensateur électrolytique polarisé est traité, comme CAPACITOR, comme un circuit ouvert en régime permanent (I=0) quelle que soit la polarité ; cette valeur n\'intervient pas dans l\'analyse DC et n\'est significative que pour un futur modèle Transitoire, hors périmètre. La tension nominale 25 V est une caractéristique de l\'asset, pas un paramètre simulé.'}],
  POTENTIOMETER:[
    {key:'resistance',parameterType:'resistance',unit:'Ω',minimum:1,maximum:1e7,defaultValue:10000,description:'Résistance totale de la piste résistive, extrémité LEFT à extrémité RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
    {key:'position',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0.5,description:'Position du curseur (0 = extrémité LEFT, 1 = extrémité RIGHT) : détermine les deux résistances équivalentes LEFT↔WIPER et WIPER↔RIGHT (modèle DC simplifié, MB-SIM-008 v2).'},
  ],
  NPN_TRANSISTOR:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente collecteur-émetteur à l\'état passant (modèle logique simplifié, MB-SIM-008 v2) : commande tout-ou-rien par BASE, sans β réel, sans courbes Ic/Vce, sans dynamique.'}],
  PNP_TRANSISTOR:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente collecteur-émetteur à l\'état passant (modèle logique simplifié, MB-SIM-008 v2) : PNP Level-1 commandé par BASE LOW, sans β réel, sans courbes Ic/Vce, sans dynamique.'}],
  NMOS:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente DRAIN-SOURCE à l’état passant dans le modèle pédagogique Level-1 commandé par GATE HIGH.'}],
  PMOS:[{key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e6,defaultValue:1,description:'Résistance équivalente DRAIN-SOURCE à l’état passant dans le modèle pédagogique Level-1 commandé par GATE LOW.'}],
  // A7-C1 : sortie analogique TMP36 (datasheet Analog Devices) — Vout(T) =
  // 0.5 V + 0.01 V/°C × T. Bornes 0.1 V / 1.75 V = Vout(-40°C) / Vout(125°C),
  // exactement la plage opérationnelle du capteur (jamais une plage
  // arbitraire). Valeur par défaut 0.75 V = Vout(25°C), fallback historique
  // tant qu'aucun stimulus environnemental TEMPERATURE actif n'est fourni —
  // même convention que LDR.resistance (MB-L1-ENV-001) : sous TEMPERATURE
  // actif (A7-C1), la tension EFFECTIVE de ce TMP36 est calculée par le
  // Registry environnemental dédié entre ces mêmes bornes minimum/maximum,
  // sans jamais modifier ce paramètre persistant.
  TMP36:[{key:'outputVoltage',parameterType:'voltage',unit:'V',minimum:0.1,maximum:1.75,defaultValue:0.75,description:'Tension de sortie Vout (fallback historique / valeur à 25°C) tant qu\'aucun stimulus environnemental TEMPERATURE actif n\'est fourni. Sous TEMPERATURE actif (A7-C1), la tension EFFECTIVE de ce TMP36 est calculée par le Registry environnemental dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce paramètre persistant.'}],
  // A7-C2 : Force Sensor (FSR) — plage indicative type Interlink FSR40x
  // (no-load >1 MΩ ; pleine charge ~250 Ω), bornes arrondies en ordre de
  // grandeur pédagogique. Valeur par défaut = borne maximum (état "aucune
  // force appliquée", fallback historique tant qu'aucun stimulus
  // environnemental FORCE actif n'est fourni — même convention que
  // LDR.resistance / TMP36.outputVoltage, MB-L1-ENV-001/A7-C1). Sous FORCE
  // actif (A7-C2), la résistance EFFECTIVE est calculée par le Registry
  // environnemental dédié entre ces mêmes bornes minimum/maximum, sans
  // jamais modifier ce paramètre persistant.
  FORCE_SENSOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:250,maximum:1000000,defaultValue:1000000,description:'Résistance fixe par défaut (fallback historique = état "aucune force appliquée") tant qu\'aucun stimulus environnemental FORCE actif n\'est fourni. Sous FORCE actif (A7-C2), la résistance EFFECTIVE de ce capteur est calculée par le Registry environnemental dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce paramètre persistant.'}],
  // A7-C2 : Flex Sensor — plage indicative type capteur flex résistif
  // 2.2" (à plat ~10 kΩ ; pleine flexion ~40 kΩ), bornes arrondies en
  // ordre de grandeur pédagogique. Valeur par défaut = borne minimum
  // (état "à plat", fallback historique tant qu'aucun stimulus
  // environnemental FLEX actif n'est fourni — même convention que
  // FORCE_SENSOR.resistance ci-dessus). Sous FLEX actif (A7-C2), la
  // résistance EFFECTIVE est calculée par le Registry environnemental
  // dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce
  // paramètre persistant.
  FLEX_SENSOR:[{key:'resistance',parameterType:'resistance',unit:'Ω',minimum:10000,maximum:40000,defaultValue:10000,description:'Résistance fixe par défaut (fallback historique = état "à plat") tant qu\'aucun stimulus environnemental FLEX actif n\'est fourni. Sous FLEX actif (A7-C2), la résistance EFFECTIVE de ce capteur est calculée par le Registry environnemental dédié entre ces mêmes bornes minimum/maximum, sans jamais modifier ce paramètre persistant.'}],
  // A7-C3 — Soil Moisture Sensor : deux paramètres [0,1] (ratios, jamais une
  // unité physique — même convention de normalisation que LIGHT/FORCE/FLEX).
  // `analogRatio` est le niveau analogique normalisé EFFECTIF (1 = sol sec,
  // 0 = sol saturé), fallback historique 1 tant qu'aucun stimulus MOISTURE
  // actif n'est fourni. Sous MOISTURE actif (§5 du ticket), la valeur
  // EFFECTIVE de `analogRatio` est calculée par environmentalResponseRegistry.js
  // (analogRatio = 1 - MOISTURE) — jamais recalculée ici. `threshold` reste un
  // paramètre d'instance/persistant PUR (jamais dérivé d'un stimulus) :
  // consulté par digitalContributionRegistry.js pour décider DO HIGH/LOW.
  SOIL_MOISTURE_SENSOR:[
    {key:'analogRatio',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:1,description:'Niveau analogique normalisé EFFECTIF (1 = sol sec, 0 = sol saturé), fallback historique tant qu\'aucun stimulus environnemental MOISTURE actif n\'est fourni. Sous MOISTURE actif (A7-C3), la valeur EFFECTIVE est calculée par le Registry environnemental dédié (analogRatio = 1 - MOISTURE), sans jamais modifier ce paramètre persistant.'},
    {key:'threshold',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0.5,description:'Seuil d\'humidité (échelle MOISTURE [0,1]) sous lequel la sortie numérique DO commute HIGH (sol jugé "sec") — paramètre d\'instance persistant, jamais dérivé d\'un stimulus environnemental.'},
  ],
  // A7-C4-PIR — PIR Motion Sensor : paramètre effectif UNIQUE `motionDetected`
  // ∈ {0,1} (jamais une plage continue — contrat Level-1 binaire, §8/§9 du
  // ticket), fallback canonique 0 (aucun mouvement) tant qu'aucun stimulus
  // environnemental MOTION actif n'est fourni. Sous MOTION actif, la valeur
  // EFFECTIVE est le passage direct MOTION -> motionDetected (identité,
  // aucune formule, cf. environmentalResponseRegistry.js) — jamais recalculée
  // ailleurs (digitalContributionRegistry.js la consomme telle quelle).
  PIR_MOTION_SENSOR:[
    {key:'motionDetected',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0,description:'État de détection EFFECTIF (0 = aucun mouvement, 1 = mouvement détecté), fallback canonique 0 tant qu\'aucun stimulus environnemental MOTION actif n\'est fourni. Sous MOTION actif (A7-C4-PIR), la valeur EFFECTIVE est calculée par le Registry environnemental dédié (passage direct, identité), sans jamais modifier ce paramètre persistant.'},
  ],
  // A7-C4-TILT — Tilt Sensor : paramètre effectif UNIQUE `tiltDetected` ∈
  // {0,1} (jamais une plage continue — contrat Level-1 binaire, §8/§9 du
  // ticket, même patron que PIR_MOTION_SENSOR.motionDetected), fallback
  // canonique 0 (position normale / aucune inclinaison) tant qu'aucun
  // stimulus environnemental TILT actif n'est fourni. Sous TILT actif, la
  // valeur EFFECTIVE est le passage direct TILT -> tiltDetected (identité,
  // cf. environmentalResponseRegistry.js) — jamais recalculée ailleurs
  // (digitalContributionRegistry.js la consomme telle quelle).
  TILT_SENSOR:[
    {key:'tiltDetected',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0,description:'État de détection EFFECTIF (0 = position normale, aucune inclinaison détectée, 1 = inclinaison détectée), fallback canonique 0 tant qu\'aucun stimulus environnemental TILT actif n\'est fourni. Sous TILT actif (A7-C4-TILT), la valeur EFFECTIVE est calculée par le Registry environnemental dédié (passage direct, identité), sans jamais modifier ce paramètre persistant.'},
  ],
  // A7-C4-IR — IR Receiver : paramètre effectif UNIQUE `infraredDetected` ∈
  // {0,1} (jamais une plage continue — contrat Level-1 binaire, §10/§11 du
  // ticket, même patron que TILT_SENSOR.tiltDetected/PIR_MOTION_SENSOR.
  // motionDetected), fallback canonique 0 (aucun signal IR 38 kHz détecté)
  // tant qu'aucun stimulus environnemental INFRARED actif n'est fourni. Sous
  // INFRARED actif, la valeur EFFECTIVE est le passage direct INFRARED ->
  // infraredDetected (identité, aucune formule, cf.
  // environmentalResponseRegistry.js) — jamais recalculée ailleurs
  // (digitalContributionRegistry.js la consomme telle quelle pour produire
  // SIGNAL en logique active-low, §12 du ticket).
  IR_RECEIVER:[
    {key:'infraredDetected',parameterType:'ratio',unit:'',minimum:0,maximum:1,defaultValue:0,description:'État de détection EFFECTIF (0 = aucun signal IR 38 kHz détecté, 1 = signal IR 38 kHz détecté), fallback canonique 0 tant qu\'aucun stimulus environnemental INFRARED actif n\'est fourni. Sous INFRARED actif (A7-C4-IR), la valeur EFFECTIVE est calculée par le Registry environnemental dédié (passage direct, identité), sans jamais modifier ce paramètre persistant.'},
  ],
  // A7-C5 — HC-SR04 : paramètre effectif UNIQUE `distanceCm` (§9/§10 du
  // ticket), domaine [2,400] cm (portée réelle du capteur, datasheet),
  // fallback canonique 100 cm tant qu'aucun stimulus environnemental
  // DISTANCE actif n'est fourni. Sous DISTANCE actif, la valeur EFFECTIVE
  // est le passage direct DISTANCE -> distanceCm (identité, même patron que
  // PIR_MOTION_SENSOR.motionDetected/TILT_SENSOR.tiltDetected, mais sur un
  // domaine CONTINU [2,400] plutôt que binaire {0,1} — cf.
  // environmentalResponseRegistry.js) — jamais recalculée ailleurs
  // (le Generic Timed Digital Output Runtime la consomme telle quelle pour
  // calculer la durée ECHO, §16 du ticket).
  HC_SR04:[
    {key:'distanceCm',parameterType:'distance',unit:'cm',minimum:2,maximum:400,defaultValue:100,description:'Distance mesurée EFFECTIVE (portée réelle du capteur [2,400] cm, datasheet HC-SR04), fallback canonique 100 cm tant qu\'aucun stimulus environnemental DISTANCE actif n\'est fourni. Sous DISTANCE actif (A7-C5), la valeur EFFECTIVE est calculée par le Registry environnemental dédié (passage direct, identité), sans jamais modifier ce paramètre persistant.'},
  ],
  // A4-INDUCTOR — paramètre canonique `inductance` (nouveau parameterType,
  // même patron d'extension propre que `capacitance` : ni enum fermé, ni
  // registre séparé à étendre — ADR #3, parameterType est une chaîne
  // ouverte). Domaine [1 µH, 10 H] : couvre les inductances axiales
  // traversantes courantes (µH à quelques centaines de mH), avec une marge
  // haute généreuse pédagogique (même esprit que `capacitance`
  // [1e-12, 1] F, qui dépasse largement les valeurs catalogue réelles).
  // Default 1 mH : valeur pédagogique usuelle d'une inductance axiale
  // traversante de prototypage. Le modèle DC steady-state est
  // intentionnellement absent de dcContributionRegistry.js (voir
  // transientContributionRegistry.js pour la justification Level-1 : un
  // court-circuit idéal introduirait un courant DC indéterminé sans
  // résistance de boucle connue de ce moteur simplifié — aucune résistance
  // parasite arbitraire n'est inventée, §11 du ticket).
  INDUCTOR:[{key:'inductance',parameterType:'inductance',unit:'H',minimum:1e-6,maximum:10,defaultValue:0.001,description:'Valeur de l\'inductance en Henry. Modèle Level-1 explicitement non-SPICE : aucune contribution DC steady-state (voir transientContributionRegistry.js) — seule la réponse TRANSITOIRE (V = L × di/dt, temps simulé partagé) est modélisée.'}],
  // A5-ZENER_DIODE — famille physique diode générique (A5-D-PREQ,
  // createDiodeDcContribution({reverseBreakdown:true}), dcContributionRegistry.js).
  // forwardVoltage/onResistance : même convention/bornes que DIODE (base
  // réelle inchangée, §8 du ticket). breakdownVoltage default 5.1 V : le
  // raster Founder est marqué "5V1", valeur pédagogique cohérente avec ce
  // marquage. breakdownResistance default 10 Ω : AUCUNE fiche technique
  // réelle de BZX55 ne justifie cette valeur — approximation pédagogique
  // Level-1 explicite (résistance dynamique constante), PAS la résistance
  // dynamique exacte mesurée d'un composant réel ; réutilise seulement la
  // convention numérique déjà en place pour onResistance en l'absence de
  // toute référence plus autoritative dans ce dépôt.
  ZENER_DIODE:[
    {key:'forwardVoltage',parameterType:'voltage',unit:'V',minimum:0,maximum:5,defaultValue:0.7,description:'Tension de seuil de conduction directe (modèle DC simplifié, même convention que DIODE) : diode idéale à seuil, sans modèle non linéaire complet ni dynamique de commutation.'},
    {key:'onResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:10,description:'Résistance équivalente en conduction directe au-delà du seuil (modèle DC simplifié, même convention que DIODE).'},
    {key:'breakdownVoltage',parameterType:'voltage',unit:'V',minimum:0,maximum:200,defaultValue:5.1,description:'Tension de claquage inverse (reverse breakdown), modèle DC Level-1 (A5-D-PREQ) : en dessous, blocage inverse strict (courant nul) ; au-dessus, conduction de breakdown. Default 5.1 V cohérent avec le marquage "5V1" du raster Founder PASS.'},
    {key:'breakdownResistance',parameterType:'resistance',unit:'Ω',minimum:0.001,maximum:1e9,defaultValue:10,description:'Résistance équivalente en conduction de breakdown au-delà du seuil inverse (modèle DC Level-1, A5-D-PREQ). APPROXIMATION PÉDAGOGIQUE : ne représente PAS la résistance dynamique réelle mesurée d\'un BZX55, seulement une pente de conduction constante simplifiée.'},
  ],
}

const DECLARED_DEFAULT_PARAMETERS = {
  BATTERY_AA:{voltage:1.5},
  COIN_CELL_CR2032:{voltage:3},
  BATTERY_9V:{voltage:9},
  POWER:{voltage:5},
  RESISTOR:{resistance:220},
  LDR:{resistance:10000},
  THERMISTOR:{resistance:10000},
  DIODE:{forwardVoltage:0.7,onResistance:10},
  DC_MOTOR:{resistance:20},
  VIBRATION_MOTOR:{resistance:20},
  LIGHT_BULB:{resistance:20},
  HOBBY_GEARMOTOR:{resistance:20},
  CAPACITOR:{capacitance:1e-7},
  POLARIZED_CAPACITOR:{capacitance:0.0001},
  POTENTIOMETER:{resistance:10000,position:0.5},
  NPN_TRANSISTOR:{onResistance:1},
  PNP_TRANSISTOR:{onResistance:1},
  NMOS:{onResistance:1},
  PMOS:{onResistance:1},
  TMP36:{outputVoltage:0.75},
  FORCE_SENSOR:{resistance:1000000},
  FLEX_SENSOR:{resistance:10000},
  SOIL_MOISTURE_SENSOR:{analogRatio:1,threshold:0.5},
  PIR_MOTION_SENSOR:{motionDetected:0},
  TILT_SENSOR:{tiltDetected:0},
  IR_RECEIVER:{infraredDetected:0},
  HC_SR04:{distanceCm:100},
  INDUCTOR:{inductance:0.001},
  ZENER_DIODE:{forwardVoltage:0.7,onResistance:10,breakdownVoltage:5.1,breakdownResistance:10},
}

const DECLARED_CAPABILITIES = {
  BATTERY_AA:['digital','dc'],
  COIN_CELL_CR2032:['digital','dc'],
  BATTERY_9V:['digital','dc'],
  POWER:['digital','dc'],
  RESISTOR:['digital','dc'],
  LDR:['digital','dc'],
  THERMISTOR:['digital','dc'],
  DIODE:['digital','dc'],
  DC_MOTOR:['digital','dc'],
  VIBRATION_MOTOR:['digital','dc'],
  LIGHT_BULB:['digital','dc'],
  HOBBY_GEARMOTOR:['digital','dc'],
  CAPACITOR:['digital','dc'],
  POLARIZED_CAPACITOR:['digital','dc'],
  POTENTIOMETER:['digital','dc'],
  NPN_TRANSISTOR:['digital','dc'],
  PNP_TRANSISTOR:['digital','dc'],
  NMOS:['digital','dc'],
  PMOS:['digital','dc'],
  TMP36:['digital','dc'],
  FORCE_SENSOR:['digital','dc'],
  FLEX_SENSOR:['digital','dc'],
  SOIL_MOISTURE_SENSOR:['digital','dc'],
  // A7-C4-PIR : capability 'digital' UNIQUEMENT (§12 du ticket) — PIR ne
  // fournit aucune sortie analogique/DC ; aucune entrée dcContributionRegistry
  // n'est donc requise ni attendue pour ce type (TEST G4, componentLibraryRolloutGate).
  PIR_MOTION_SENSOR:['digital'],
  // A7-C4-TILT : capability 'digital' UNIQUEMENT (§12 du ticket) — module
  // DO/GND deux bornes, aucune sortie analogique/DC ; aucune entrée
  // dcContributionRegistry n'est donc requise ni attendue pour ce type
  // (TEST G4, componentLibraryRolloutGate).
  TILT_SENSOR:['digital'],
  // A7-C4-IR : capability 'digital' UNIQUEMENT (§15 du ticket) — aucune
  // sortie analogique/DC (pas de modélisation de la photodiode/AGC/filtre
  // interne) ; aucune entrée dcContributionRegistry n'est donc requise ni
  // attendue pour ce type (TEST G4, componentLibraryRolloutGate).
  IR_RECEIVER:['digital'],
  // A7-C5 : capability 'digital' UNIQUEMENT (§13 du ticket) — aucune sortie
  // analogique/DC (ECHO est une sortie TEMPORELLE, Generic Timed Digital Output Runtime,
  // pas une sortie DC) ; aucune entrée dcContributionRegistry n'est donc
  // requise ni attendue pour ce type (TEST G4, componentLibraryRolloutGate).
  HC_SR04:['digital'],
  // A4-INDUCTOR : capability 'digital' UNIQUEMENT (même patron exact que
  // PIR_MOTION_SENSOR/TILT_SENSOR/IR_RECEIVER/HC_SR04 ci-dessus) — aucune
  // contribution DC steady-state enregistrée (dcContributionRegistry.js,
  // §11 du ticket : un court-circuit idéal introduirait un courant DC
  // indéterminé sans résistance de boucle connue) ; aucune entrée
  // dcContributionRegistry n'est donc requise ni attendue pour ce type
  // (TEST G4, componentLibraryRolloutGate). La réponse électrique
  // TRANSITOIRE réelle est portée par transientContributionRegistry.js.
  INDUCTOR:['digital'],
  // A5-ZENER_DIODE : capability 'dc' REQUISE (contrairement à INDUCTOR) —
  // ce composant enregistre bien une contribution DC steady-state
  // (dcContributionRegistry.js, réutilise createDiodeDcContribution comme
  // DIODE), même patron exact que DIODE ci-dessus (TEST G4,
  // componentLibraryRolloutGate).
  ZENER_DIODE:['digital','dc'],
}

const DECLARED_MODEL_AVAILABLE = {
  BATTERY_AA:true,
  COIN_CELL_CR2032:true,
  BATTERY_9V:true,
  POWER:true,
  RESISTOR:true,
  LDR:true,
  THERMISTOR:true,
  DIODE:true,
  DC_MOTOR:true,
  VIBRATION_MOTOR:true,
  LIGHT_BULB:true,
  HOBBY_GEARMOTOR:true,
  CAPACITOR:true,
  POLARIZED_CAPACITOR:true,
  POTENTIOMETER:true,
  NPN_TRANSISTOR:true,
  PNP_TRANSISTOR:true,
  NMOS:true,
  PMOS:true,
  TMP36:true,
  FORCE_SENSOR:true,
  FLEX_SENSOR:true,
  SOIL_MOISTURE_SENSOR:true,
  PIR_MOTION_SENSOR:true,
  TILT_SENSOR:true,
  IR_RECEIVER:true,
  HC_SR04:true,
  INDUCTOR:true,
  ZENER_DIODE:true,
}

/**
 * A3-SW0 : topologie interne déclarative, générique (aucun nom de type
 * n'est connu en dehors de cette table de déclaration). Une entrée
 * absente ici reçoit internalConnections: null (aucune topologie).
 */
const DECLARED_INTERNAL_CONNECTIONS = {
  BUTTON:{ states:{ pressed:[['pin1','pin2']] } },
  BUTTON_LATCHING:{ states:{ on:[['pin1','pin2']] } },
  // A3-SW1 : SPDT — une seule paire active par position, jamais throwA↔throwB.
  SLIDE_SWITCH:{ states:{ left:[['common','throwA']], right:[['common','throwB']] } },
  // A3-SW2 : composition de canaux indépendants — extension générique du
  // contrat A3-SW0 (forme `channels`, alternative à `states`). Chaque canal
  // résout sa propre paire selon SON PROPRE état (component.channelStates),
  // jamais une union croisée entre canaux.
  DIP_SWITCH:{
    channels:{
      '1':{ states:{ on:[['1A','1B']], off:[] } },
      '2':{ states:{ on:[['2A','2B']], off:[] } },
      '3':{ states:{ on:[['3A','3B']], off:[] } },
      '4':{ states:{ on:[['4A','4B']], off:[] } },
    },
  },
}

function cloneParameterSchema(schema){ return schema.map((param)=>Object.freeze({...param})) }
function cloneDefaultParameters(parameters){ return Object.freeze({...parameters}) }
function cloneCapabilities(capabilities){ return Object.freeze([...capabilities]) }
function clonePins(pins){ return Object.freeze(pins.map((pin)=>Object.freeze({...pin}))) }
function cloneStatesMap(statesMap){
  return Object.freeze(Object.fromEntries(
    Object.entries(statesMap).map(([state,pairs])=>[state,Object.freeze(pairs.map((pair)=>Object.freeze([...pair])))])
  ))
}
function cloneInternalConnections(internalConnections){
  if(!internalConnections) return null
  // A3-SW2 : forme `channels` (composition de canaux indépendants) —
  // alternative générique à `states` (topologie globale, A3-SW0).
  if(internalConnections.channels){
    const channels=Object.fromEntries(
      Object.entries(internalConnections.channels).map(([channelId,channelDef])=>[channelId,Object.freeze({ states:cloneStatesMap(channelDef.states) })])
    )
    return Object.freeze({ channels:Object.freeze(channels) })
  }
  return Object.freeze({ states:cloneStatesMap(internalConnections.states) })
}

function buildEntry(type){
  const modelAvailable=DECLARED_MODEL_AVAILABLE[type] === true
  return Object.freeze({
    type,
    pins:clonePins(DECLARED_TYPES_PINS[type]),
    parameterSchema:modelAvailable ? cloneParameterSchema(DECLARED_PARAMETER_SCHEMA[type]) : null,
    defaultParameters:modelAvailable ? cloneDefaultParameters(DECLARED_DEFAULT_PARAMETERS[type]) : null,
    capabilities:modelAvailable ? cloneCapabilities(DECLARED_CAPABILITIES[type]) : null,
    modelAvailable,
    internalConnections:cloneInternalConnections(DECLARED_INTERNAL_CONNECTIONS[type] ?? null),
  })
}

const CANONICAL_ENTRIES=Object.freeze(DECLARED_TYPE_ORDER.reduce((acc,type)=>{acc[type]=buildEntry(type);return acc},{}))
const CANONICAL_TYPES=Object.freeze(Object.keys(CANONICAL_ENTRIES))
const CANONICAL_ENTRIES_LIST=Object.freeze(Object.values(CANONICAL_ENTRIES))

export function validateCanonicalEntry(entry){
  const errors=[]
  if(!entry || typeof entry!=='object') return {valid:false,errors:['entry must be a non-null object']}
  if(typeof entry.type!=='string' || entry.type.length===0) errors.push('type must be a non-empty string')
  if(!Array.isArray(entry.pins)) errors.push('pins must be an array')
  else {
    const seen=new Set()
    entry.pins.forEach((pin,index)=>{
      if(!pin || typeof pin.id!=='string' || pin.id.length===0){errors.push(`pins[${index}].id must be a non-empty string`);return}
      if(seen.has(pin.id)) errors.push(`duplicate pin id "${pin.id}"`)
      seen.add(pin.id)
    })
  }
  if(entry.parameterSchema!==null){
    if(!Array.isArray(entry.parameterSchema)) errors.push('parameterSchema must be an array or null')
    else entry.parameterSchema.forEach((param,index)=>{
      if(!param || typeof param.key!=='string' || param.key.length===0) errors.push(`parameterSchema[${index}].key must be a non-empty string`)
      const hasMin=typeof param?.minimum==='number', hasMax=typeof param?.maximum==='number'
      if(hasMin&&hasMax&&param.minimum>param.maximum) errors.push(`parameterSchema[${index}] minimum (${param.minimum}) must be <= maximum (${param.maximum})`)
      const hasDefault=!!param&&Object.prototype.hasOwnProperty.call(param,'defaultValue')
      if(param?.required===true&&!hasDefault) errors.push(`parameterSchema[${index}] is declared required but has no defaultValue`)
      if(hasDefault){if(hasMin&&param.defaultValue<param.minimum) errors.push(`parameterSchema[${index}] defaultValue (${param.defaultValue}) is below minimum (${param.minimum})`);if(hasMax&&param.defaultValue>param.maximum) errors.push(`parameterSchema[${index}] defaultValue (${param.defaultValue}) is above maximum (${param.maximum})`)}
    })
  }
  if(entry.defaultParameters!==null && (!entry.defaultParameters || typeof entry.defaultParameters!=='object' || Array.isArray(entry.defaultParameters))) errors.push('defaultParameters must be an object or null')
  if(entry.capabilities!==null && !Array.isArray(entry.capabilities)) errors.push('capabilities must be an array or null')
  if(entry.internalConnections!==null && entry.internalConnections!==undefined){
    const ic=entry.internalConnections
    const pinIds=new Set(Array.isArray(entry.pins) ? entry.pins.filter((pin)=>pin && typeof pin.id==='string').map((pin)=>pin.id) : [])
    const validateStatesMap=(statesMap,prefix)=>{
      if(!statesMap || typeof statesMap!=='object' || Array.isArray(statesMap)){ errors.push(`${prefix} must be an object with a states object`); return }
      Object.entries(statesMap).forEach(([stateName,pairs])=>{
        if(!Array.isArray(pairs)){ errors.push(`${prefix}.${stateName} must be an array`); return }
        pairs.forEach((pair,index)=>{
          if(!Array.isArray(pair) || pair.length!==2 || typeof pair[0]!=='string' || typeof pair[1]!=='string'){
            errors.push(`${prefix}.${stateName}[${index}] must be a pair of two pin ids`)
            return
          }
          const [pinA,pinB]=pair
          if(!pinIds.has(pinA)) errors.push(`${prefix}.${stateName}[${index}] references unknown pin "${pinA}"`)
          if(!pinIds.has(pinB)) errors.push(`${prefix}.${stateName}[${index}] references unknown pin "${pinB}"`)
        })
      })
    }
    if(typeof ic!=='object' || Array.isArray(ic)){
      errors.push('internalConnections must be an object with a states object or a channels object')
    } else if(ic.channels!==undefined){
      // A3-SW2 : composition de canaux indépendants — chaque canal valide
      // séparément son propre vocabulaire d'états, sur le MÊME jeu de pins.
      if(!ic.channels || typeof ic.channels!=='object' || Array.isArray(ic.channels)){
        errors.push('internalConnections.channels must be an object')
      } else {
        Object.entries(ic.channels).forEach(([channelId,channelDef])=>{
          validateStatesMap(channelDef && channelDef.states, `internalConnections.channels.${channelId}.states`)
        })
      }
    } else {
      validateStatesMap(ic.states, 'internalConnections.states')
    }
  }
  if(typeof entry.modelAvailable!=='boolean') errors.push('modelAvailable must be a boolean')
  if(entry.modelAvailable && (entry.parameterSchema===null || entry.defaultParameters===null || entry.capabilities===null)) errors.push('available model must expose parameterSchema, defaultParameters and capabilities')
  if(!entry.modelAvailable && (entry.parameterSchema!==null || entry.defaultParameters!==null || entry.capabilities!==null)) errors.push('unavailable model must not expose model-specific declarative metadata')
  return {valid:errors.length===0,errors}
}

export function validateCanonicalEntrySet(entries){
  if(!Array.isArray(entries)) return {valid:false,errors:['entries must be an array']}
  const errors=[],seen=new Set()
  entries.forEach((entry,index)=>{const result=validateCanonicalEntry(entry);if(!result.valid)errors.push(...result.errors.map(e=>`entries[${index}]: ${e}`));if(entry&&typeof entry.type==='string'){if(seen.has(entry.type))errors.push(`duplicate type "${entry.type}" in entry set`);seen.add(entry.type)}})
  return {valid:errors.length===0,errors}
}

const selfCheck=validateCanonicalEntrySet(CANONICAL_ENTRIES_LIST)
if(!selfCheck.valid) throw new Error(`canonicalRegistry: internal data failed self-validation: ${selfCheck.errors.join('; ')}`)
export function getAllCanonicalTypes(){return CANONICAL_TYPES}
export function hasCanonicalType(type){return typeof type==='string'&&Object.prototype.hasOwnProperty.call(CANONICAL_ENTRIES,type)}
export function getCanonicalEntry(type){return hasCanonicalType(type)?CANONICAL_ENTRIES[type]:null}
export function getAllCanonicalEntries(){return CANONICAL_ENTRIES_LIST}

/**
 * A3-SW0 (étendu par A3-SW2) : résolution générique de la topologie
 * interne active d'un composant. Ne connaît aucun nom de type ; lit
 * uniquement le contrat déclaratif internalConnections de l'entry et
 * l'état courant du composant. Retourne toujours un tableau (jamais
 * d'exception).
 *
 * Deux formes de contrat, mutuellement exclusives :
 * - `states` (A3-SW0) : topologie globale, lue depuis `component.state`.
 * - `channels` (A3-SW2) : composition de canaux indépendants, chaque
 *   canal résolu depuis SA PROPRE entrée de `component.channelStates`
 *   (jamais une union croisée entre canaux — chaque canal ne peut
 *   produire que des paires impliquant ses propres pins déclarées).
 *
 * @param {object|null} entry canonical entry (getCanonicalEntry)
 * @param {{ state?: string, channelStates?: Record<string,string> }} component instance/state
 * @returns {Array<[string,string]>}
 */
export function resolveInternalConnections(entry,component){
  if(!entry || !entry.internalConnections) return []
  const ic=entry.internalConnections
  if(ic.channels){
    const channelStates=component && component.channelStates
    if(!channelStates || typeof channelStates!=='object') return []
    const pairs=[]
    for(const [channelId,channelDef] of Object.entries(ic.channels)){
      const state=channelStates[channelId]
      if(typeof state!=='string') continue
      const channelPairs=channelDef.states[state]
      if(Array.isArray(channelPairs)) for(const pair of channelPairs) pairs.push(pair)
    }
    return pairs.map(([pinA,pinB])=>[pinA,pinB])
  }
  const state=component && component.state
  if(typeof state!=='string') return []
  const pairs=ic.states[state]
  if(!Array.isArray(pairs)) return []
  return pairs.map(([pinA,pinB])=>[pinA,pinB])
}
