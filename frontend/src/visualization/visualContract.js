/**
 * visualContract.js — MB-VIS-RENDER-010 — Physical Component Visual Contract
 *
 * SOURCE DE VÉRITÉ UNIQUE du langage visuel physique de MYBlab.
 */

export const CONTRACT_VERSION = '1.0.0-RENDER-010'

export const LIGHTING = Object.freeze({
  label: 'clé haut-gauche, ombre bas-droite',
  keyLight: { fromDirection: Object.freeze({ x: -0.6, y: -0.8 }), intensity: 1.0, character: 'studio-softbox-neutre-legerement-froide' },
  fill: { intensity: 0.35, character: 'neutre' },
  ambient: { intensity: 0.18 },
  shadowDirection: Object.freeze({ x: 0.6, y: 0.8 }),
})

export const CONTACT_SHADOW = Object.freeze({
  offset: Object.freeze({ x: 1.8, y: 2.4 }), blur: 3.0, opacity: 0.28, maxIntensity: 0.32,
  color: 'rgba(0, 0, 0, 1)', anchor: 'silhouette-bottom', spread: 2.0,
  antiPatterns: Object.freeze(['halo', 'bordure-noire', 'ombre-decorative-large', 'filtre-drop-shadow-par-composant']),
})

export const SCALE = Object.freeze({ canvasUnitsPerMm: 3.0, provisional: true, confirmBy: 'MB-VIS-PROTOTYPE-001..003 (mesure réelle)' })

export const SCALE_REFERENCE = Object.freeze([
  { type: 'LED',            box: [80, 64],   physicalMm: [5, 8.7],    ref: 'LED 5 mm traversante (pattes comprises ~30 mm)', impliedUnitsPerMm: 2.7 },
  { type: 'RESISTOR',       box: [84, 28],   physicalMm: [6.3, 2.5],  ref: 'axial 1/4 W (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'DIODE',          box: [84, 30],   physicalMm: [4, 2],      ref: '1N4148 DO-35 (pattes comprises ~25 mm)',          impliedUnitsPerMm: 3.4 },
  { type: 'CAPACITOR',      box: [70, 64],   physicalMm: [5, 22],     ref: 'céramique disque 104 non polarisé, pattes longues', impliedUnitsPerMm: 3.2 },
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

export const SCALE_AUDIT = Object.freeze({
  finding: 'boites-canoniques-non-mutuellement-a-echelle',
  impliedUnitsPerMmRange: Object.freeze([1.75, 9.2]),
  clusterPassifsAxiaux: Object.freeze([3.0, 3.5]),
  underScaled: Object.freeze(['ARDUINO', 'POWER']),
  overScaled: Object.freeze(['BUTTON', 'POTENTIOMETER', 'NPN_TRANSISTOR', 'RGB_LED', 'BUZZER']),
  resolution: 'hors-perimetre-RENDER-010 : dimensions canoniques non modifiees ; asset remplit sa boite (fillFactor) ; rescale eventuel = futur ticket fonctionnel',
})

export const FILL_FACTOR = Object.freeze({ DEFAULT: 0.82, AXIAL_LEADED: 0.62, THROUGH_HOLE: 0.7, BOXED: 0.9 })

export const MATERIALS = Object.freeze({
  METAL_LEAD: Object.freeze({ family: 'metal', base: 'neutre', roughness: 0.35, specular: 'etroit-net', highlight: 'lineaire-vif', anisotropic: true, note: 'patte / fil etame conducteur' }),
  METAL_CHROME: Object.freeze({ family: 'metal', base: 'neutre-clair', roughness: 0.08, specular: 'miroir', highlight: 'net-ponctuel', anisotropic: false, note: 'arbre moteur, capuchon chrome' }),
  METAL_BRUSHED: Object.freeze({ family: 'metal', base: 'neutre', roughness: 0.50, specular: 'large-doux', highlight: 'strie', anisotropic: true, note: 'carcasse moteur DC' }),
  COPPER: Object.freeze({ family: 'metal', base: 'orange-chaud', roughness: 0.30, specular: 'etroit-net', highlight: 'chaud', anisotropic: false, note: 'pistes / pastilles PCB' }),
  BRASS: Object.freeze({ family: 'metal', base: 'jaune-chaud', roughness: 0.40, specular: 'doux', highlight: 'chaud', anisotropic: false, note: 'flasque moteur, contacts' }),
  PLASTIC_MATTE: Object.freeze({ family: 'plastic', base: 'teinte', roughness: 0.80, specular: 'faible-large', highlight: 'diffus', note: 'boitier servo, base bouton' }),
  PLASTIC_GLOSSY: Object.freeze({ family: 'plastic', base: 'teinte', roughness: 0.25, specular: 'net', highlight: 'point-net', note: 'capuchon bouton, boitier brillant' }),
  CERAMIC: Object.freeze({ family: 'ceramic', base: 'teinte-pale', roughness: 0.60, specular: 'doux', highlight: 'large-doux', note: 'corps resistance, disque LDR' }),
  GLASS: Object.freeze({ family: 'glass', base: 'translucide', roughness: 0.05, specular: 'miroir', highlight: 'net', transmission: 0.9, note: 'diode DO-35 verre' }),
  LENS: Object.freeze({ family: 'glass', base: 'translucide-teinte', roughness: 0.10, specular: 'net', highlight: 'net', transmission: 0.7, emissive: 'stateful', note: 'lentille LED : emission pilotee par etat electrique' }),
  EPOXY_RESIN: Object.freeze({ family: 'resin', base: 'teinte-semi', roughness: 0.20, specular: 'net', highlight: 'goutte-mouillee', transmission: 0.3, note: 'perle NTC, goutte epoxy' }),
  PCB: Object.freeze({ family: 'composite', base: 'vert-ou-bleu-fonce', roughness: 0.55, specular: 'doux', highlight: 'doux', layers: Object.freeze(['soldermask', 'silkscreen-blanc', 'copper', 'pads']), note: 'carte Arduino' }),
})

export const MATERIAL_FAMILIES = Object.freeze(['metal', 'plastic', 'ceramic', 'glass', 'resin', 'composite'])

export const LEAD_ANCHORING = Object.freeze({
  source: 'utils/pinPresentationGeometry.js#getPinPresentationPosition(component, pin)',
  derivedFrom: 'config/componentDefinitions.js (PIN_PRESENTATION_BY_TYPE + COMPONENT_TYPES) — NON modifie',
  origin: 'coin haut-gauche de la boite canonique = (0,0), axe y vers le bas',
  cardinality: 'un-lead-visuel-par-pin ; jamais de lead sans pin, jamais de pin sans point de contact visuel',
  tolerancePx: 0.75,
  zoomBehaviour: 'invariant en unites canvas ; aucun recalcul par zoom',
  zoomLevelsChecked: Object.freeze([0.5, 1, 2]),
})

export const BACKENDS = Object.freeze({ SVG: 'svg', RASTER: 'raster', R3F: 'r3f' })
export const BACKEND_STATUS = Object.freeze({
  svg: Object.freeze({ status: 'existing', scope: 'fallback / passifs simples en transition' }),
  raster: Object.freeze({ status: 'target', scope: 'EXP3 / J7 — rendu physique du catalogue' }),
  r3f: Object.freeze({ status: 'reserved', scope: 'EXP5 — non implemente, aucune dependance' }),
})
export const DEFAULT_BACKEND = BACKENDS.SVG
export function isValidBackend(b) { return b === BACKENDS.SVG || b === BACKENDS.RASTER || b === BACKENDS.R3F }
export function resolveBackend(visual) { const b = visual && typeof visual === 'object' ? visual.backend : undefined; return isValidBackend(b) ? b : DEFAULT_BACKEND }
export function resolvePresentation(visual) { const backend = resolveBackend(visual); const isRaster = backend === BACKENDS.RASTER; const v = visual && typeof visual === 'object' ? visual : {}; return Object.freeze({ backend, bareBody: typeof v.bareBody === 'boolean' ? v.bareBody : isRaster, markerless: typeof v.markerless === 'boolean' ? v.markerless : isRaster }) }

export const ASSET_CONTRACT = Object.freeze({
  format: Object.freeze({ primary: 'webp', fallback: 'png', alpha: true }),
  resolutions: Object.freeze([Object.freeze({ key: '1x', scaleFromCanonical: 1 }), Object.freeze({ key: '3x', scaleFromCanonical: 3 })]),
  root: 'frontend/public/assets/components', naming: '{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}',
  namingExamples: Object.freeze(['frontend/public/assets/components/dc-motor/dc-motor.default.3x.webp','frontend/public/assets/components/led/led.on.1x.webp','frontend/public/assets/components/rgb-led/rgb-led.r1-g0-b1.3x.webp']),
  states: Object.freeze({ convention: 'un fichier par etat visuel discret declare ; "default" si le composant est sans etat', source: 'visualization/visualStateRegistry.js (LED: on|off ; RGB_LED: combinaisons r/g/b ; autres: default)' }),
  productionPipeline: Object.freeze({ method: 'rendu hors-ligne unique : une camera, un HDRI, un sol pour l\'ombre de contact -> coherence catalogue automatique', note: 'AUCUN asset produit dans MB-VIS-RENDER-010 ; les prototypes produisent les premiers.' }),
})

export const RENDER_BUDGET = Object.freeze({
  svg: Object.freeze({ maxPrimitives: 40, primitiveSelector: 'rect, circle, line, path, ellipse, polygon', note: 'inchange pour les renderers backend svg' }),
  raster: Object.freeze({ maxWeightKbPerVariantSimple: 30, maxWeightKbPerVariantComplex: 120, maxVariants: 8, resolutions: 2, maxDimensionPx: 1024, provisional: true, confirmBy: 'MB-VIS-PROTOTYPE-001..003 (mesure reelle)' }),
  r3f: Object.freeze({ status: 'reserved', note: 'budget kdraws / polycount defini a l\'ouverture d\'EXP5' }),
})

export const CAPTURE_MODES = Object.freeze({ INTERACTIVE: 'interactive', DETERMINISTIC: 'deterministic' })
export const DEFAULT_CAPTURE_MODE = CAPTURE_MODES.INTERACTIVE
export const CAPTURE = Object.freeze({ mode: CAPTURE_MODES.DETERMINISTIC, disables: Object.freeze(['animation','transition','random','time-based-effect','procedural-noise','auto-glow-pulse']), guarantee: 'memes props + captureMode:deterministic -> sortie DOM structurellement identique', keepsT8: true })
export function isDeterministicCapture(mode) { return mode === CAPTURE_MODES.DETERMINISTIC }

export const QA_CRITERIA = Object.freeze(['silhouette identifiable','proportions credibles','volume lisible','materiau identifiable','leads credibles','contact avec surface','lumiere coherente','absence de clipping','coherence avec breadboard','coherence avec les autres composants','lisibilite a 0.5x','lisibilite a 1x','lisibilite a 2x','etat visuel deterministe en capture','aucun changement fonctionnel'])
export const QA_TARGET_SCORE = 4
export const QA_ZOOM_LEVELS = Object.freeze([0.5, 1, 2])
export const QA_ANTI_RULE = 'un composant n\'est pas "realiste" parce qu\'il possede plusieurs gradients'

export const R3F_EXTENSION = Object.freeze({ status: 'reserved-exp5', pointOfExtension: 'RendererRegistry (INCHANGE) : une entree peut porter visual.backend = "r3f"', sharedScene: 'un unique <Canvas> partage pour tout l\'atelier — jamais un par composant ; NON cree', untouched: Object.freeze(['SimulationCanvas zoom (transform CSS unique)','hit-test wrapper (.circuit-component)','Pin overlays HTML','utils/geometry.js','utils/pinPresentationGeometry.js','config/componentDefinitions.js']), dependencies: 'aucune — three / @react-three/fiber / @react-three/drei NON installes' })

export const VISUAL_CONTRACT = Object.freeze({ version: CONTRACT_VERSION, lighting: LIGHTING, contactShadow: CONTACT_SHADOW, scale: SCALE, scaleReference: SCALE_REFERENCE, scaleAudit: SCALE_AUDIT, fillFactor: FILL_FACTOR, materials: MATERIALS, materialFamilies: MATERIAL_FAMILIES, leadAnchoring: LEAD_ANCHORING, backends: BACKENDS, backendStatus: BACKEND_STATUS, defaultBackend: DEFAULT_BACKEND, asset: ASSET_CONTRACT, renderBudget: RENDER_BUDGET, capture: CAPTURE, captureModes: CAPTURE_MODES, qa: Object.freeze({ criteria: QA_CRITERIA, targetScore: QA_TARGET_SCORE, zoomLevels: QA_ZOOM_LEVELS, antiRule: QA_ANTI_RULE }), r3fExtension: R3F_EXTENSION })

export default VISUAL_CONTRACT
