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
  { type: 'LED',            box: [80, 64],   physicalMm: [5, 8.7],    ref: 'LED 5 mm traversante (pattes comprises ~30 mm)', impliedUnitsPerMm: 2.7 },
  { type: 'RESISTOR',       box: [84, 28],   physicalMm: [6.3, 2.5],  ref: 'axial 1/4 W (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'DIODE',          box: [84, 30],   physicalMm: [4, 2],      ref: '1N4148 DO-35 (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'CAPACITOR',      box: [70, 40],   physicalMm: [5, 5],      ref: 'céramique disque Ø5 (pattes comprises ~22 mm)',   impliedUnitsPerMm: 3.2 },
  { type: 'LDR',            box: [84, 36],   physicalMm: [5, 5],      ref: 'GL5528 Ø5 (pattes comprises ~24 mm)',             impliedUnitsPerMm: 3.5 },
  { type: 'THERMISTOR',     box: [84, 36],   physicalMm: [3, 3],      ref: 'perle NTC Ø3, époxy ~5 (pattes comprises ~24 mm)', impliedUnitsPerMm: 3.5 },
  { type: 'BUTTON',         box: [60, 60],   physicalMm: [6.5, 6.5],  ref: 'tact switch 6×6',                                 impliedUnitsPerMm: 9.2 },
  { type: 'BUTTON_LATCHING',box: [60, 60],   physicalMm: [13, 8],     ref: 'interrupteur à bascule ~13×8',                    impliedUnitsPerMm: 4.6 },
  { type: 'POWER',          box: [70, 90],   physicalMm: [50, 70],    ref: 'bloc alim breadboard (indicatif)',                impliedUnitsPerMm: 1.3 },
  { type: 'BUZZER',         box: [70, 50],   physicalMm: [12, 12],    ref: 'buzzer piézo Ø12',                                impliedUnitsPerMm: 5.8 },
  { type: 'POTENTIOMETER',  box: [90, 50],   physicalMm: [10, 10],    ref: 'trimmer ~10×10',                                  impliedUnitsPerMm: 9.0 },
  { type: 'NPN_TRANSISTOR', box: [90, 60],   physicalMm: [4.5, 4.5],  ref: '2N2222 TO-92 (pattes comprises ~15 mm)',          impliedUnitsPerMm: 6.0 },
  { type: 'RGB_LED',        box: [90, 56],   physicalMm: [5, 8.7],    ref: 'RGB 5 mm 4 pattes',                               impliedUnitsPerMm: 6.4 },
  { type: 'SERVO',          box: [90, 70],   physicalMm: [29, 12],    ref: 'micro servo SG90 23×12×29',                       impliedUnitsPerMm: 3.1 },
  { type: 'DC_MOTOR',       box: [84, 50],   physicalMm: [28, 20],    ref: 'moteur 130 Ø20 × ~28 (arbre en plus)',            impliedUnitsPerMm: 3.0 },
  { type: 'ARDUINO',        box: [120, 140], physicalMm: [68.6, 53.4],ref: 'Arduino UNO 68.6×53.4',                           impliedUnitsPerMm: 1.75 },
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
    maxWeightKbPerVariantSimple: 30,
    maxWeightKbPerVariantComplex: 120,
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
