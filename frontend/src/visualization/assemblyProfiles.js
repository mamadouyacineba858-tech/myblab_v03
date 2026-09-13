/**
 * assemblyProfiles.js — FT-C-001-A.
 *
 * Profil MÉCANIQUE de PRÉSENTATION d'un composant traversant : où les pattes /
 * cosses NAISSENT visuellement sous le corps (« racine »), et de quel style
 * elles sont dessinées. C'est de la présentation d'assemblage PURE.
 */

/** @typedef {{ dx: number, dy: number }} LocalPoint */
/**
 * @typedef {Object} AssemblyProfile
 * @property {'through-hole'} kind
 * @property {Record<string, { root: LocalPoint, style?: 'wire'|'wire-glossy'|'lug' }>} leads
 * @property {{ bottom: number }} [bodyClip]
 */

/** @type {Record<string, AssemblyProfile>} */
const ASSEMBLY_PROFILES = {
  LED: {
    kind: "through-hole",
    leads: {
      anode: { root: { dx: 28, dy: 32 }, style: "wire" },
      cathode: { root: { dx: 52, dy: 32 }, style: "wire" },
    },
    bodyClip: { bottom: 31 },
  },
  LDR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 29 }, style: "wire" },
      B: { root: { dx: 54, dy: 29 }, style: "wire" },
    },
  },
  THERMISTOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 31 }, style: "wire" },
      B: { root: { dx: 54, dy: 31 }, style: "wire" },
    },
  },
  CAPACITOR: {
    kind: "through-hole",
    leads: {
      // MB-L1-PROP-005 V2 visual correction: keep the exact mechanical
      // roots/contacts, only upgrade the presentation material to polished
      // nickel/tin so the leads read like the realistic resistor leads.
      pinA: { root: { dx: 23, dy: 27 }, style: "wire-glossy" },
      pinB: { root: { dx: 47, dy: 27 }, style: "wire-glossy" },
    },
  },
  // FT-C-COMP-002 — condensateur électrolytique radial polarisé. Le raster montre
  // déjà de longues pattes cuites : `bodyClip.bottom = 68` masque tout ce qui
  // est sous y=52. AssemblyLeadsLayer dessine ensuite les pattes fonctionnelles
  // depuis y=48 jusqu'aux PhysicalContacts y=80, soit ~32 px — longueur
  // harmonisée avec LED/LDR/THERMISTOR (~30–33 px). Racines alignées en x sur
  // les contacts `plus` (28) / `minus` (4, côté bande négative).
  POLARIZED_CAPACITOR: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 28, dy: 48 }, style: "wire" },
      minus: { root: { dx: 4, dy: 48 }, style: "wire" },
    },
    bodyClip: { bottom: 68 },
  },
  // FT-C-COMP-004 — buzzer piézo traversant (asset 120×120). Les deux pattes
  // métalliques sont cuites dans le raster autour de x≈42 / 77, y≈79..114
  // (probe pixel ; PO probe 44 / 76, entraxe 32). Pour l'insertion breadboard
  // les deux PhysicalContacts fonctionnels sont recalés à dx 42 / 78 (entraxe
  // 36 = 3 × BREADBOARD_PITCH exact, centrés sur les deux pieds visibles) et
  // dy 108 (= probe `canonical.pins` du manifeste ; 9 × BREADBOARD_PITCH).
  // AssemblyLeadsLayer relie racine visuelle → contact (pattes fines droites).
  // IDs, rôles et modèle électrique (plus / minus, role input) INCHANGÉS —
  // aucune nouvelle simulation, aucun état "on".
  BUZZER: {
    kind: "through-hole",
    leads: {
      plus: { root: { dx: 42, dy: 76 }, style: "wire" },
      minus: { root: { dx: 78, dy: 76 }, style: "wire" },
    },
    bodyClip: { bottom: 42 },
  },
  RGB_LED: {
    kind: "through-hole",
    leads: {
      R: { root: { dx: 32, dy: 29 }, style: "wire" },
      common: { root: { dx: 41, dy: 29 }, style: "wire" },
      G: { root: { dx: 49, dy: 29 }, style: "wire" },
      B: { root: { dx: 58, dy: 29 }, style: "wire" },
    },
    bodyClip: { bottom: 26 },
  },
  NPN_TRANSISTOR: {
    kind: "through-hole",
    leads: {
      base: { root: { dx: 31.5, dy: 23 }, style: "wire" },
      collector: { root: { dx: 42.5, dy: 23 }, style: "wire" },
      emitter: { root: { dx: 53.5, dy: 23 }, style: "wire" },
    },
    bodyClip: { bottom: 35 },
  },
  // FT-C-COMP-003 — potentiomètre rotatif réaliste (asset 120×120). Les 3
  // cosses métalliques verticales sont cuites dans le raster autour de
  // x≈42 / 60 / 78. AssemblyLeadsLayer garde les racines à dx 42 / 60 / 78,
  // dy 86 ; les cosses fonctionnelles restent indépendantes du raster.
  POTENTIOMETER: {
    kind: "through-hole",
    leads: {
      left: { root: { dx: 42, dy: 86 }, style: "lug" },
      wiper: { root: { dx: 60, dy: 86 }, style: "lug" },
      right: { root: { dx: 78, dy: 86 }, style: "lug" },
    },
    bodyClip: { bottom: 20 },
  },
}

export function getAssemblyProfile(type) {
  return ASSEMBLY_PROFILES[type] ?? null
}
