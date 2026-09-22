/**
 * visualContract.js — MB-VIS-RENDER-010 — Physical Component Visual Contract
 *
 * SOURCE DE VÉRITÉ UNIQUE du langage visuel physique de MYBlab.
 *
 * Rôle : ce module est au rendu visuel ce que `config/componentDefinitions.js`
 * est à la géométrie fonctionnelle — un module de DONNÉES pur, sans React,
 * sans effet de bord, déterministe. Les futurs renderers (backend `raster`
 * cible EXP3/J7, `svg` en transition, `r3f` réservé EXP5) doivent en dériver
 * lumière, matériaux, ombre de contact, échelle, budgets et règles QA au
 * lieu de réinventer chacun sa convention (cf. MB-VIS-RENDER-009 §4.F/§4.G :
 * « Design system : Absent »).
 *
 * CE MODULE NE FAIT PAS :
 *  - il ne redessine aucun composant ;
 *  - il n'importe rien de `simulator/`, `config/componentDefinitions.js`,
 *    `canvas/`, ni aucun `*Part.jsx` (contrat pur, pas un renderer) ;
 *  - il n'installe ni ne référence three / @react-three/fiber / @react-three/drei ;
 *  - il ne modifie aucun invariant fonctionnel (dimensions canoniques, pins,
 *    hitbox, sélection, drag, câblage, `VisualizationManager.render(type,props)`).
 *
 * Repère : coin haut-gauche de la boîte canonique du composant = (0,0),
 * axe x vers la droite, axe y vers le BAS (repère SVG/CSS). Toutes les
 * grandeurs spatiales sont en « unités canvas @1× » (le zoom de l'atelier
 * est un unique `transform: scale()` CSS sur la couche — aucun renderer ne
 * recalcule quoi que ce soit selon le zoom).
 */

export const CONTRACT_VERSION = '1.0.0-RENDER-010'

/* ============================================================
 * C — LIGHTING CONTRACT
 * Une seule logique de lumière pour tout le catalogue.
 * ============================================================ */
export const LIGHTING = Object.freeze({
  label: 'clé haut-gauche, ombre bas-droite',
  keyLight: {
    // Vecteur unitaire pointant DE la surface VERS la lumière (repère écran).
    // (-0.6, -0.8) => haut-gauche, dominante verticale (reflets hauts).
    fromDirection: Object.freeze({ x: -0.6, y: -0.8 }),
    intensity: 1.0,
    character: 'studio-softbox-neutre-legerement-froide',
  },
  fill: { intensity: 0.35, character: 'neutre' },
  ambient: { intensity: 0.18 },
  // Vecteur unitaire lumière -> ombre (opposé de keyLight.fromDirection).
  // Bas-droite : sert de base à l'orientation de l'ombre de contact et des
  // dégradés de volume, tous backends confondus.
  shadowDirection: Object.freeze({ x: 0.6, y: 0.8 }),
})

/* ============================================================
 * D — CONTACT SHADOW CONTRACT
 * Communique « l'objet repose sur la surface ». JAMAIS décorative.
 * ============================================================ */
export const CONTACT_SHADOW = Object.freeze({
  // Décalage en unités canvas @1×, colinéaire à LIGHTING.shadowDirection.
  offset: Object.freeze({ x: 1.8, y: 2.4 }),
  blur: 3.0,
  opacity: 0.28,
  // Plafond DUR. Au-delà : halo / ombre décorative — interdit.
  maxIntensity: 0.32,
  color: 'rgba(0, 0, 0, 1)',
  // L'ombre est ancrée au BAS de la silhouette (contact), jamais centrée sur
  // l'objet, et ne s'étend pas au-delà de `spread` px hors silhouette.
  anchor: 'silhouette-bottom',
  spread: 2.0,
  antiPatterns: Object.freeze([
    'halo', 'bordure-noire', 'ombre-decorative-large', 'filtre-drop-shadow-par-composant',
  ]),
})

/* ============================================================
 * E — PHYSICAL SCALE CONTRACT
 * Convention monde physique -> unités canvas. Les dimensions canoniques
 * (componentDefinitions.js) restent la SOURCE DE VÉRITÉ et ne sont PAS
 * modifiées ici : cette section sert à dimensionner les futurs assets et
 * à documenter les écarts d'échelle relative constatés.
 * ============================================================ */
export const SCALE = Object.freeze({
  // Valeur de calage sur le groupe des passifs axiaux « pattes comprises »
  // (~3 u/mm). Provisoire : à confirmer par MB-VIS-PROTOTYPE-001..003.
  canvasUnitsPerMm: 3.0,
  provisional: true,
  confirmBy: 'MB-VIS-PROTOTYPE-001..003 (mesure réelle)',
})

/**
 * Table de référence : boîte canonique observée (componentDefinitions.js,
 * NON modifiée) vs dimension physique réelle indicative. `impliedUnitsPerMm`
 * = plus grande dimension de boîte / plus grande dimension physique.
 * Sert à l'audit d'échelle relative (§E) — voir SCALE_AUDIT.
 */
export const SCALE_REFERENCE = Object.freeze([
    // FT-C-BAT-001-R1: front-view envelopes; holder/tab estimates are indicative.
    // PP3: Energizer 522 datasheet, https://data.energizer.com/pdfs/522.pdf.
    { type: 'BATTERY_9V', box: [70, 90], physicalMm: [26.5, 48.5], ref: 'pile PP3, face avant avec bornes', impliedUnitsPerMm: 90 / 48.5 },
    { type: 'COIN_CELL_CR2032', box: [60, 60], physicalMm: [20, 24], ref: 'CR2032 vue de face, deux languettes comprises (~24 mm, indicatif)', impliedUnitsPerMm: 60 / 24 },
    // AA cell is 50.5 x 14.5 mm (Energizer E91); the visible holder is larger.
    { type: 'BATTERY_AA', box: [40, 100], physicalMm: [20, 60], ref: 'pile AA dans support, enveloppe du support ~20 x 60 mm (indicatif)', impliedUnitsPerMm: 100 / 60 },
  { type: 'LED',            box: [80, 64],   physicalMm: [5, 8.7],    ref: 'LED 5 mm traversante (pattes comprises ~30 mm)', impliedUnitsPerMm: 2.7 },
  { type: 'RESISTOR',       box: [84, 28],   physicalMm: [6.3, 2.5],  ref: 'axial 1/4 W (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'DIODE',          box: [84, 30],   physicalMm: [4, 2],      ref: '1N4148 DO-35 (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'CAPACITOR',      box: [70, 40],   physicalMm: [5, 5],      ref: 'céramique disque Ø5 (pattes comprises ~22 mm)',   impliedUnitsPerMm: 3.2 },
  // FT-C-COMP-002 : électrolytique radial polarisé, boîte portrait 33×120
  // (corps + longues pattes verticales). Corps ~Ø6.3 × 11 mm, pattes ~+15 mm.
  { type: 'POLARIZED_CAPACITOR', box: [33, 120], physicalMm: [6.3, 26], ref: 'électrolytique radial Ø6.3 (pattes comprises ~26 mm)', impliedUnitsPerMm: 120 / 26 },
  { type: 'LDR',            box: [84, 36],   physicalMm: [5, 5],      ref: 'GL5528 Ø5 (pattes comprises ~24 mm)',             impliedUnitsPerMm: 3.5 },
  { type: 'THERMISTOR',     box: [84, 36],   physicalMm: [3, 3],      ref: 'perle NTC Ø3, époxy ~5 (pattes comprises ~24 mm)', impliedUnitsPerMm: 3.5 },
  { type: 'BUTTON',         box: [60, 60],   physicalMm: [6.5, 6.5],  ref: 'tact switch 6×6',                                 impliedUnitsPerMm: 9.2 },
  { type: 'BUTTON_LATCHING',box: [60, 60],   physicalMm: [13, 8],     ref: 'interrupteur à bascule ~13×8',                    impliedUnitsPerMm: 4.6 },
  // A3-SW1 : interrupteur à glissière SPDT, renderer CSS/DOM (aucun asset
  // raster validé, cf. componentDefinitions.js/SlideSwitchPart.jsx).
  { type: 'SLIDE_SWITCH',   box: [72, 48],   physicalMm: [12, 6],     ref: 'interrupteur à glissière SPDT ~12×6 (indicatif)', impliedUnitsPerMm: 72 / 12 },
  // A3-SW2 : DIP switch 4 positions SPST×4, renderer CSS/DOM (aucun asset
  // raster validé, cf. componentDefinitions.js/DipSwitchPart.jsx).
  { type: 'DIP_SWITCH',     box: [112, 56],  physicalMm: [10.2, 7.6], ref: 'DIP switch 4 positions ~10.2×7.6 (indicatif)',    impliedUnitsPerMm: 112 / 10.2 },
  { type: 'POWER',          box: [70, 90],   physicalMm: [50, 70],    ref: 'bloc alim breadboard (indicatif)',                impliedUnitsPerMm: 1.3 },
  { type: 'BUZZER',         box: [120, 120], physicalMm: [12, 20],    ref: 'buzzer piézo Ø12, pattes comprises ~20 mm (FT-C-COMP-004)', impliedUnitsPerMm: 120 / 20 },
  { type: 'POTENTIOMETER',  box: [120, 120], physicalMm: [16, 26],    ref: 'potentiomètre rotatif Ø16, axe/bouton compris ~26 mm (FT-C-COMP-003)', impliedUnitsPerMm: 120 / 26 },
  // A8-PNP R3 : boîtier TO-92 représenté, dimensions indicatives du corps seul.
  // onsemi BC556B/BC557B/BC558B, CASE 29 STYLE 17 : A max=5.20 mm, B max=5.33 mm.
  // Source mécanique : https://www.onsemi.com/pdf/datasheet/bc556b-d.pdf, page 7.
  { type: 'PNP_TRANSISTOR', box: [132, 66], physicalMm: [5.20, 5.33], ref: 'BC557 TO-92 CASE 29 STYLE 17, corps A/B maximaux (indicatif)', impliedUnitsPerMm: 132 / 5.33 },
  // A8-NMOS: Infineon IRFZ44NPbF datasheet p8, TO-220AB: E max10.67, D max16.51, L max14.73 mm.
  // Indicative body+leads envelope [E,D+L]; implied scale = max(box)/max(physicalMm).
  { type: 'NMOS', box: [144, 288], physicalMm: [10.67, 31.24], ref: 'IRFZ44N TO-220AB E/D/L maxima, body+leads; Infineon datasheet p8', impliedUnitsPerMm: 288 / 31.24 },
  // Infineon IRF9540NPbF datasheet p8: TO-220AB width 10.54, body 15.24 + leads 14.09 mm.
  // https://www.infineon.com/dgdl/Infineon-IRF9540N-DataSheet-v01_01-EN.pdf?fileId=5546d462533600a401535611cfa21dc8
  { type: 'RELAY', box: [288, 288], physicalMm: [19.1, 15.3], ref: 'SONGLE SRD body width/height maxima, excludes leads; indicative front-view scale. https://nafcom.es/fotos_pdt/108.RL001/Relay_datasheet.pdf p1', impliedUnitsPerMm: 288 / 19.1 },
  // Frozen pixel dimensions only; no physical millimetre calibration is asserted.
  { type: 'VOLTAGE_REGULATOR', box: [144, 288], physicalMm: null, ref: 'L7805CV TO-220 Founder frozen raster; physical scale uncalibrated', impliedUnitsPerMm: null },
  // Frozen pixel dimensions only; no physical millimetre calibration is asserted.
  { type: 'AND_GATE', box: [144, 96], physicalMm: null, ref: 'Founder frozen raster, isotropic 3/32 derivative; abstract Level-1 logic, physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'OR_GATE', box: [144, 96], physicalMm: null, ref: 'Founder frozen raster, isotropic 3/32 derivative; abstract Level-1 logic, physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'NAND_GATE', box: [144, 96], physicalMm: null, ref: 'Founder frozen raster, isotropic 3/32 derivative; abstract Level-1 logic, physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'NOR_GATE', box: [144, 96], physicalMm: null, ref: 'Founder frozen raster, isotropic 3/32 derivative; abstract Level-1 logic, physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'XOR_GATE', box: [144, 96], physicalMm: null, ref: 'Founder frozen raster, isotropic 3/32 derivative; abstract Level-1 logic, physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'H_BRIDGE', box: [132, 88], physicalMm: null, ref: 'L293D DIP-16 Founder frozen raster, isotropic derivative rotated 90 deg; physical scale uncalibrated', impliedUnitsPerMm: null },
  { type: 'PMOS', box: [144, 288], physicalMm: [10.54, 29.33], ref: 'IRF9540N TO-220AB width/body/lead maxima, body+leads; Infineon datasheet p8', impliedUnitsPerMm: 288 / 29.33 },
  { type: 'NPN_TRANSISTOR', box: [90, 60],   physicalMm: [4.5, 4.5],  ref: '2N2222 TO-92 (pattes comprises ~15 mm)',          impliedUnitsPerMm: 6.0 },
  { type: 'RGB_LED',        box: [90, 56],   physicalMm: [5, 8.7],    ref: 'RGB 5 mm 4 pattes',                               impliedUnitsPerMm: 6.4 },
  { type: 'SERVO',          box: [90, 70],   physicalMm: [29, 12],    ref: 'micro servo SG90 23×12×29',                       impliedUnitsPerMm: 3.1 },
  { type: 'DC_MOTOR',       box: [84, 50],   physicalMm: [28, 20],    ref: 'moteur 130 Ø20 × ~28 (arbre en plus)',            impliedUnitsPerMm: 3.0 },
  { type: 'ARDUINO',        box: [120, 140], physicalMm: [68.6, 53.4],ref: 'Arduino UNO 68.6×53.4',                           impliedUnitsPerMm: 1.75 },
  // A6-OUT1-R1 : moteur vibreur coin-type ERM, asset raster réaliste validé
  // par le Founder (cf. componentDefinitions.js/VibrationMotorPart.jsx).
  { type: 'VIBRATION_MOTOR', box: [72, 96],  physicalMm: [10, 4],     ref: 'moteur vibreur coin-type ERM Ø10, pattes très courtes (FT-A6-OUT1-R1)', impliedUnitsPerMm: 96 / 4 },
  // A6-OUT2 : ampoule miniature filament (asset raster réaliste validé par
  // le Founder, cf. componentDefinitions.js/LightBulbPart.jsx).
  { type: 'LIGHT_BULB', box: [72, 96], physicalMm: [10, 25], ref: 'ampoule miniature Ø10, culot + pattes compris ~25 mm (indicatif, A6-OUT2)', impliedUnitsPerMm: 96 / 25 },
  // A6-OUT3 : motoréducteur hobby, asset raster réaliste VERTICAL FINAL
  // validé par le Founder (cf. componentDefinitions.js/HobbyGearmotorPart.jsx).
  { type: 'HOBBY_GEARMOTOR', box: [72, 120], physicalMm: [12, 35], ref: 'motoréducteur hobby (réducteur + carter moteur), fils compris ~35 mm (indicatif, A6-OUT3)', impliedUnitsPerMm: 120 / 35 },
  // A7-C1 : capteur TMP36, boîtier TO-92 (datasheet Analog Devices), asset
  // raster réaliste R3 validé par le Founder (cf.
  // componentDefinitions.js/Tmp36Part.jsx).
  { type: 'TMP36', box: [60, 72], physicalMm: [10, 20], ref: 'TMP36 TO-92, boîtier + pattes ~20 mm (indicatif, A7-C1)', impliedUnitsPerMm: 72 / 20 },
  // A7-C2 : capteur de force FSR (type Interlink FSR40x), pastille de
  // détection ~18.3 mm de diamètre + queue de connexion, asset raster
  // réaliste Founder-approved (cf. componentDefinitions.js/ForceSensorPart.jsx).
  { type: 'FORCE_SENSOR', box: [72, 144], physicalMm: [18.3, 44.4], ref: 'capteur de force FSR, pastille Ø18.3 + queue de connexion ~44.4 mm (indicatif, A7-C2)', impliedUnitsPerMm: 144 / 44.4 },
  // A7-C2 : capteur de flexion résistif (type flex sensor 2.2"), lame
  // ~6.35 mm de large sur ~55.9 mm de long, asset raster réaliste
  // Founder-approved (cf. componentDefinitions.js/FlexSensorPart.jsx).
  { type: 'FLEX_SENSOR', box: [72, 180], physicalMm: [6.35, 55.9], ref: 'capteur de flexion résistif 2.2", lame ~6.35 × 55.9 mm (indicatif, A7-C2)', impliedUnitsPerMm: 180 / 55.9 },
  // A7-C3 : capteur d'humidité du sol (module YL-69 probe + YL-38 interface),
  // sonde fourche + carte d'interface ~60 mm de haut assemblées (indicatif),
  // asset raster réaliste Founder-approved (cf.
  // componentDefinitions.js/SoilMoistureSensorPart.jsx).
  { type: 'SOIL_MOISTURE_SENSOR', box: [144, 144], physicalMm: [60, 60], ref: 'capteur d\'humidité du sol YL-69/YL-38, sonde + module ~60×60 mm (indicatif, A7-C3)', impliedUnitsPerMm: 144 / 60 },
  // A7-C4-PIR : capteur de mouvement PIR (type HC-SR501), carte PCB avec
  // dôme Fresnel ~32 × 24 mm (indicatif, dimensions typiques du module réel),
  // asset raster réaliste Founder-approved (cf.
  // componentDefinitions.js/PirMotionSensorPart.jsx).
  { type: 'PIR_MOTION_SENSOR', box: [120, 96], physicalMm: [32, 24], ref: 'capteur de mouvement PIR HC-SR501-style, carte + dôme Fresnel ~32×24 mm (indicatif, A7-C4-PIR)', impliedUnitsPerMm: 120 / 32 },
  { type: 'TILT_SENSOR', box: [72, 120], physicalMm: [14, 32.5], ref: 'capteur d\'inclinaison SW-520D-style, module 2 broches DO/GND, carte ~14×32.5 mm (indicatif, A7-C4-TILT)', impliedUnitsPerMm: 120 / 32.5 },
  { type: 'IR_RECEIVER', box: [72, 120], physicalMm: [10, 24], ref: 'récepteur infrarouge TSOP4838-style 38 kHz, dôme + 3 pattes SIGNAL/GND/VCC, boîtier + pattes ~10×24 mm (indicatif, A7-C4-IR)', impliedUnitsPerMm: 120 / 24 },
  { type: 'HC_SR04', box: [144, 96], physicalMm: [45, 31], ref: 'capteur ultrasonique HC-SR04, carte + 2 transducteurs + broches VCC/TRIG/ECHO/GND, carte ~45×20 mm + pattes ~11 mm (dimensions datasheet standard, indicatif, A7-C5)', impliedUnitsPerMm: 144 / 45 },
  // A4-INDUCTOR : inductance axiale moulée bobinée (style RL/choke axial
  // courant, corps ~13×8 mm hors pattes — dimensions typiques catalogue,
  // indicatif), asset raster réaliste Founder PASS FROZEN (cf.
  // componentDefinitions.js/InductorPart.jsx).
  { type: 'INDUCTOR', box: [144, 108], physicalMm: [13, 8], ref: 'inductance axiale moulée, corps bobiné ~13×8 mm hors pattes (indicatif, A4-INDUCTOR)', impliedUnitsPerMm: 144 / 13 },
  // A5-ZENER_DIODE : diode Zener axiale, même forme de boîtier verre DO-35
  // qu'une 1N4148 (corps ~4×2 mm), asset raster réaliste Founder PASS
  // FROZEN (cf. componentDefinitions.js/ZenerDiodePart.jsx).
  { type: 'ZENER_DIODE', box: [144, 72], physicalMm: [4, 2], ref: 'diode Zener DO-35 (ex. BZX55), corps verre ~4×2 mm hors pattes (indicatif, A5-ZENER_DIODE)', impliedUnitsPerMm: 144 / 4 },
])

/**
 * Constat d'audit d'échelle (FAIT OBSERVÉ, MB-VIS-RENDER-010) :
 * les boîtes canoniques ne sont PAS mutuellement à l'échelle physique —
 * `impliedUnitsPerMm` s'étale de ~1.75 (ARDUINO) à ~9.2 (BUTTON), soit un
 * facteur ~5. Les passifs axiaux « pattes comprises » se regroupent autour
 * de ~3.0–3.5. Conséquence pour ce contrat : chaque asset est produit pour
 * REMPLIR sa boîte canonique (via `fillFactor`), la proportion physique
 * INTERNE d'un asset doit être correcte, et la sous-échelle relative des
 * cartes complexes (ARDUINO surtout) est un écart PORTÉ PAR LES BOÎTES
 * CANONIQUES — corrigeable seulement par un futur ticket fonctionnel, HORS
 * périmètre RENDER-010 (les dimensions canoniques ne sont pas modifiées).
 */
export const SCALE_AUDIT = Object.freeze({
  finding: 'boites-canoniques-non-mutuellement-a-echelle',
  impliedUnitsPerMmRange: Object.freeze([1.75, 9.2]),
  clusterPassifsAxiaux: Object.freeze([3.0, 3.5]),
  underScaled: Object.freeze(['ARDUINO', 'POWER']),
  overScaled: Object.freeze(['BUTTON', 'POTENTIOMETER', 'NPN_TRANSISTOR', 'RGB_LED', 'BUZZER']),
  resolution: 'hors-perimetre-RENDER-010 : dimensions canoniques non modifiees ; asset remplit sa boite (fillFactor) ; rescale eventuel = futur ticket fonctionnel',
})

/**
 * Fraction de la boîte canonique effectivement occupée par l'objet dessiné
 * (le reste = pattes hors corps + marge d'ombre de contact). Utilisé pour
 * dimensionner l'objet dans l'asset sans qu'il « flotte » ni ne déborde.
 * Valeurs indicatives, à ajuster par prototype.
 */
export const FILL_FACTOR = Object.freeze({
  DEFAULT: 0.82,
  AXIAL_LEADED: 0.62,   // corps central, longues pattes horizontales : RESISTOR/DIODE/LDR/THERMISTOR/CAPACITOR/DC_MOTOR
  THROUGH_HOLE: 0.7,    // LED / RGB_LED : dôme + pattes verticales
  BOXED: 0.9,           // SERVO / ARDUINO / POWER / BUTTON* : boîtier occupant la boîte
})

/* ============================================================
 * B — MATERIAL TOKENS
 * Un token décrit une PROPRIÉTÉ PHYSIQUE VISUELLE (famille, rugosité,
 * caractère spéculaire, caractère de reflet, base). PAS une couleur.
 * Chaque backend traduit : SVG -> stops de gradient + opacités ;
 * raster -> shader équivalent en rendu hors-ligne ; r3f -> paramètres PBR.
 * ============================================================ */
export const MATERIALS = Object.freeze({
  METAL_LEAD:     Object.freeze({ family: 'metal',     base: 'neutre',            roughness: 0.35, specular: 'etroit-net',   highlight: 'lineaire-vif',   anisotropic: true,  note: 'patte / fil etame conducteur' }),
  METAL_CHROME:   Object.freeze({ family: 'metal',     base: 'neutre-clair',      roughness: 0.08, specular: 'miroir',       highlight: 'net-ponctuel',   anisotropic: false, note: 'arbre moteur, capuchon chrome' }),
  METAL_BRUSHED:  Object.freeze({ family: 'metal',     base: 'neutre',            roughness: 0.50, specular: 'large-doux',   highlight: 'strie',          anisotropic: true,  note: 'carcasse moteur DC' }),
  COPPER:         Object.freeze({ family: 'metal',     base: 'orange-chaud',      roughness: 0.30, specular: 'etroit-net',   highlight: 'chaud',          anisotropic: false, note: 'pistes / pastilles PCB' }),
  BRASS:          Object.freeze({ family: 'metal',     base: 'jaune-chaud',       roughness: 0.40, specular: 'doux',         highlight: 'chaud',          anisotropic: false, note: 'flasque moteur, contacts' }),
  PLASTIC_MATTE:  Object.freeze({ family: 'plastic',   base: 'teinte',            roughness: 0.80, specular: 'faible-large', highlight: 'diffus',         note: 'boitier servo, base bouton' }),
  PLASTIC_GLOSSY: Object.freeze({ family: 'plastic',   base: 'teinte',            roughness: 0.25, specular: 'net',          highlight: 'point-net',      note: 'capuchon bouton, boitier brillant' }),
  CERAMIC:        Object.freeze({ family: 'ceramic',   base: 'teinte-pale',       roughness: 0.60, specular: 'doux',         highlight: 'large-doux',     note: 'corps resistance, disque LDR' }),
  GLASS:          Object.freeze({ family: 'glass',     base: 'translucide',       roughness: 0.05, specular: 'miroir',       highlight: 'net',            transmission: 0.9, note: 'diode DO-35 verre' }),
  LENS:           Object.freeze({ family: 'glass',     base: 'translucide-teinte',roughness: 0.10, specular: 'net',          highlight: 'net',            transmission: 0.7, emissive: 'stateful', note: 'lentille LED : emission pilotee par etat electrique' }),
  EPOXY_RESIN:    Object.freeze({ family: 'resin',     base: 'teinte-semi',       roughness: 0.20, specular: 'net',          highlight: 'goutte-mouillee',transmission: 0.3, note: 'perle NTC, goutte epoxy' }),
  PCB:            Object.freeze({ family: 'composite', base: 'vert-ou-bleu-fonce',roughness: 0.55, specular: 'doux',         highlight: 'doux',           layers: Object.freeze(['soldermask', 'silkscreen-blanc', 'copper', 'pads']), note: 'carte Arduino' }),
})

export const MATERIAL_FAMILIES = Object.freeze(['metal', 'plastic', 'ceramic', 'glass', 'resin', 'composite'])

/* ============================================================
 * F — PIN / LEAD ANCHORING CONTRACT
 * Les extrémités visuelles des leads coïncident avec la position de
 * PRÉSENTATION du pin. Le renderer visuel n'invente AUCUNE coordonnée
 * électrique.
 * ============================================================ */
export const LEAD_ANCHORING = Object.freeze({
  source: 'utils/pinPresentationGeometry.js#getPinPresentationPosition(component, pin)',
  derivedFrom: 'config/componentDefinitions.js (PIN_PRESENTATION_BY_TYPE + COMPONENT_TYPES) — NON modifie',
  origin: 'coin haut-gauche de la boite canonique = (0,0), axe y vers le bas',
  cardinality: 'un-lead-visuel-par-pin ; jamais de lead sans pin, jamais de pin sans point de contact visuel',
  // Écart max toléré entre l'extrémité dessinée d'un lead et la position du
  // pin, en unités canvas @1×.
  tolerancePx: 0.75,
  // Le zoom est un transform CSS unique : l'écart apparent = tolerancePx * zoom.
  // Aucune correction par zoom n'est autorisée dans le renderer.
  zoomBehaviour: 'invariant en unites canvas ; aucun recalcul par zoom',
  zoomLevelsChecked: Object.freeze([0.5, 1, 2]),
})

/* ============================================================
 * G — BACKEND CONTRACT
 * `backend` est une propriété de PRÉSENTATION. Le point d'extension reste
 * `RendererRegistry` (type -> composant React), INCHANGÉ par ce ticket.
 * ============================================================ */
export const BACKENDS = Object.freeze({ SVG: 'svg', RASTER: 'raster', R3F: 'r3f' })

export const BACKEND_STATUS = Object.freeze({
  svg:    Object.freeze({ status: 'existing',  scope: 'fallback / passifs simples en transition' }),
  raster: Object.freeze({ status: 'target',    scope: 'EXP3 / J7 — rendu physique du catalogue' }),
  r3f:    Object.freeze({ status: 'reserved',  scope: 'EXP5 — non implemente, aucune dependance' }),
})

export const DEFAULT_BACKEND = BACKENDS.SVG

export function isValidBackend(b) {
  return b === BACKENDS.SVG || b === BACKENDS.RASTER || b === BACKENDS.R3F
}

/**
 * Résout le backend d'une entrée de présentation. Tolérant : une entrée sans
 * `visual` ou avec un backend inconnu retombe sur `DEFAULT_BACKEND` (svg),
 * ce qui préserve exactement le comportement actuel tant qu'aucune entrée ne
 * déclare de backend.
 * @param {{ backend?: string }|null|undefined} visual
 * @returns {'svg'|'raster'|'r3f'}
 */
export function resolveBackend(visual) {
  const b = visual && typeof visual === 'object' ? visual.backend : undefined
  return isValidBackend(b) ? b : DEFAULT_BACKEND
}

/**
 * MB-VIS-INDUSTRIAL-001 — dérive les drapeaux de PRÉSENTATION d'une entrée de
 * registre à partir de sa seule déclaration `visual`. Aucun couplage par type
 * de composant : le renderer central lit ces drapeaux, jamais `type === "…"`.
 *
 *  - `backend`    : `resolveBackend(visual)` — `'svg'` par défaut (rétrocompat).
 *  - `bareBody`   : le wrapper `.circuit-component__body` ne pose AUCUN
 *                   habillage de « carte » (fond, bordure, coins arrondis,
 *                   ombre générique). Par défaut `true` pour un backend
 *                   `raster` (l'asset porte sa propre silhouette + ombre de
 *                   contact) ; sinon la valeur booléenne explicite
 *                   `visual.bareBody` (un renderer SVG qui dessine lui-même
 *                   son fond, ex. LED, peut la déclarer).
 *  - `markerless` : les marqueurs visuels des `<Pin>` ne sont pas rendus (le
 *                   renderer dessine ses propres extrémités). Par défaut `true`
 *                   pour un backend `raster` ; sinon `visual.markerless`. Les
 *                   `<Pin>` restent dans le DOM et cliquables dans tous les cas
 *                   (câblage inchangé) — seul le disque est masqué, via
 *                   l'`opacity: 0` inline déjà porté par `Pin.jsx`.
 *
 * @param {{ backend?: string, bareBody?: boolean, markerless?: boolean }|null|undefined} visual
 * @returns {{ backend: 'svg'|'raster'|'r3f', bareBody: boolean, markerless: boolean }}
 */
export function resolvePresentation(visual) {
  const backend = resolveBackend(visual)
  const isRaster = backend === BACKENDS.RASTER
  const v = visual && typeof visual === 'object' ? visual : {}
  return Object.freeze({
    backend,
    bareBody: typeof v.bareBody === 'boolean' ? v.bareBody : isRaster,
    markerless: typeof v.markerless === 'boolean' ? v.markerless : isRaster,
  })
}

/* ============================================================
 * H — ASSET CONTRACT (backend raster)
 * AUCUN asset réel n'est produit dans MB-VIS-RENDER-010.
 * ============================================================ */
export const ASSET_CONTRACT = Object.freeze({
  format: Object.freeze({ primary: 'webp', fallback: 'png', alpha: true }),
  resolutions: Object.freeze([
    Object.freeze({ key: '1x', scaleFromCanonical: 1 }),
    Object.freeze({ key: '3x', scaleFromCanonical: 3 }),
  ]),
  // Emplacement des assets statiques : `frontend/public/` est le seul en
  // usage aujourd'hui. Racine définitive à confirmer à l'industrialisation.
  root: 'frontend/public/assets/components',
  naming: '{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}',
  namingExamples: Object.freeze([
    'frontend/public/assets/components/dc-motor/dc-motor.default.3x.webp',
    'frontend/public/assets/components/led/led.on.1x.webp',
    'frontend/public/assets/components/rgb-led/rgb-led.r1-g0-b1.3x.webp',
  ]),
  states: Object.freeze({
    convention: 'un fichier par etat visuel discret declare ; "default" si le composant est sans etat',
    source: 'visualization/visualStateRegistry.js (LED: on|off ; RGB_LED: combinaisons r/g/b ; autres: default)',
  }),
  productionPipeline: Object.freeze({
    method: 'rendu hors-ligne unique : une camera, un HDRI, un sol pour l\'ombre de contact -> coherence catalogue automatique',
    note: 'AUCUN asset produit dans MB-VIS-RENDER-010 ; les prototypes produisent les premiers.',
  }),
})

/* ============================================================
 * I — RENDERING BUDGET (par backend)
 * ============================================================ */
export const RENDER_BUDGET = Object.freeze({
  svg: Object.freeze({
    // Conservé tel quel de renderQualityGate T9 pour les renderers restés en svg.
    maxPrimitives: 40,
    primitiveSelector: 'rect, circle, line, path, ellipse, polygon',
    note: 'inchange pour les renderers backend svg',
  }),
  raster: Object.freeze({
    // Cibles INITIALES — à confirmer par mesure réelle sur les prototypes.
    // A7-C3 : maxWeightKbPerVariantComplex relevé de 120 à 150 Ko — mesure
    // réelle du paquet Founder-approved SOIL_MOISTURE_SENSOR (composite
    // photoréaliste sonde YL-69 + module YL-38, .3x.png ≈ 141.9 Ko), au-delà
    // du plafond "complexe" précédent (le plus proche jusqu'ici, DIP_SWITCH,
    // restait à 118.1 Ko) — confirmation par mesure réelle exactement comme
    // annoncé par ce commentaire, aucun asset existant ne se rapproche
    // davantage du nouveau plafond.
    // A7-C5 : maxWeightKbPerVariantComplex relevé de 150 à 175 Ko — mesure
    // réelle du paquet Founder-approved HC_SR04 (photoréaliste, PCB + 2
    // transducteurs, .3x.png = 171236 octets ≈ 167.2 Ko), au-delà du plafond
    // "complexe" précédent (le plus proche jusqu'ici, SOIL_MOISTURE_SENSOR,
    // restait à 141.9 Ko) — même méthode exacte que A7-C3 (mesure réelle du
    // plus lourd asset Founder-approved livré à ce jour, marge ~4.6 Ko
    // cohérente avec la marge ~8.1 Ko laissée par A7-C3).
    maxWeightKbPerVariantSimple: 30,
    maxWeightKbPerVariantComplex: 175,
    // CR-1: explicit manifest requests may exceed the normal cap, never this bound.
    // A8-H-BRIDGE-ASSET-PREQ : plafond exceptionnel relevé de 425 à 575 Ko —
    // mesure réelle du plus lourd asset complexe Founder-approved/Frozen
    // qualifié à ce jour (≈ 569.51 Ko par variante), marge bornée ≈ 5.49 Ko
    // (mêmes méthode et logique de calibration que les relèvements 150 puis
    // 175 Ko ci-dessus). Les plafonds normaux 30/175 restent strictement
    // inchangés ; l'exception n'est accordée que sur demande explicite du
    // manifeste (budget.maxWeightKbPerVariant), jamais implicitement d'après
    // l'identité du composant ni assetStatus.
    maxWeightKbPerVariantExceptional: 575,
    maxVariants: 8,           // ex. RGB_LED : combinaisons r/g/b
    resolutions: 2,           // @1x + @3x
    maxDimensionPx: 1024,     // cote le plus long de l'asset @3x
    provisional: true,
    confirmBy: 'MB-VIS-PROTOTYPE-001..003 (mesure reelle)',
  }),
  r3f: Object.freeze({ status: 'reserved', note: 'budget kdraws / polycount defini a l\'ouverture d\'EXP5' }),
})

/* ============================================================
 * J — DETERMINISTIC CAPTURE CONTRACT
 * ============================================================ */
export const CAPTURE_MODES = Object.freeze({ INTERACTIVE: 'interactive', DETERMINISTIC: 'deterministic' })
export const DEFAULT_CAPTURE_MODE = CAPTURE_MODES.INTERACTIVE

export const CAPTURE = Object.freeze({
  mode: CAPTURE_MODES.DETERMINISTIC,
  // En mode capture, un renderer visuel DOIT figer / désactiver :
  disables: Object.freeze([
    'animation', 'transition', 'random', 'time-based-effect', 'procedural-noise', 'auto-glow-pulse',
  ]),
  guarantee: 'memes props + captureMode:deterministic -> sortie DOM structurellement identique',
  // renderQualityGate T8 (deux rendus successifs -> HTML identique) reste
  // applicable aux backends svg et raster (<img> deterministe).
  keepsT8: true,
})

export function isDeterministicCapture(mode) {
  return mode === CAPTURE_MODES.DETERMINISTIC
}

/* ============================================================
 * K — VISUAL QA CONTRACT
 * Grille des 15 critères que les futurs renderers doivent respecter.
 * Note cible >= 4/5. Un composant n'est PAS « réaliste » parce qu'il a
 * plusieurs gradients.
 * ============================================================ */
export const QA_CRITERIA = Object.freeze([
  'silhouette identifiable',
  'proportions credibles',
  'volume lisible',
  'materiau identifiable',
  'leads credibles',
  'contact avec surface',
  'lumiere coherente',
  'absence de clipping',
  'coherence avec breadboard',
  'coherence avec les autres composants',
  'lisibilite a 0.5x',
  'lisibilite a 1x',
  'lisibilite a 2x',
  'etat visuel deterministe en capture',
  'aucun changement fonctionnel',
])
export const QA_TARGET_SCORE = 4
export const QA_ZOOM_LEVELS = Object.freeze([0.5, 1, 2])
export const QA_ANTI_RULE = 'un composant n\'est pas "realiste" parce qu\'il possede plusieurs gradients'

/* ============================================================
 * L — FUTURE R3F EXTENSION POINT (documentation seulement)
 * ============================================================ */
export const R3F_EXTENSION = Object.freeze({
  status: 'reserved-exp5',
  pointOfExtension: 'RendererRegistry (INCHANGE) : une entree peut porter visual.backend = "r3f"',
  sharedScene: 'un unique <Canvas> partage pour tout l\'atelier — jamais un par composant ; NON cree',
  untouched: Object.freeze([
    'SimulationCanvas zoom (transform CSS unique)',
    'hit-test wrapper (.circuit-component)',
    'Pin overlays HTML',
    'utils/geometry.js', 'utils/pinPresentationGeometry.js',
    'config/componentDefinitions.js',
  ]),
  dependencies: 'aucune — three / @react-three/fiber / @react-three/drei NON installes',
})

/* ============================================================
 * Agrégat gelé — point d'entrée unique.
 * ============================================================ */
export const VISUAL_CONTRACT = Object.freeze({
  version: CONTRACT_VERSION,
  lighting: LIGHTING,
  contactShadow: CONTACT_SHADOW,
  scale: SCALE,
  scaleReference: SCALE_REFERENCE,
  scaleAudit: SCALE_AUDIT,
  fillFactor: FILL_FACTOR,
  materials: MATERIALS,
  materialFamilies: MATERIAL_FAMILIES,
  leadAnchoring: LEAD_ANCHORING,
  backends: BACKENDS,
  backendStatus: BACKEND_STATUS,
  defaultBackend: DEFAULT_BACKEND,
  asset: ASSET_CONTRACT,
  renderBudget: RENDER_BUDGET,
  capture: CAPTURE,
  captureModes: CAPTURE_MODES,
  qa: Object.freeze({ criteria: QA_CRITERIA, targetScore: QA_TARGET_SCORE, zoomLevels: QA_ZOOM_LEVELS, antiRule: QA_ANTI_RULE }),
  r3fExtension: R3F_EXTENSION,
})

export default VISUAL_CONTRACT
