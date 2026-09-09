/**
 * assemblyProfiles.js — FT-C-001-A.
 *
 * Profil MÉCANIQUE de PRÉSENTATION d'un composant traversant : où les pattes /
 * cosses NAISSENT visuellement sous le corps (« racine »), et de quel style
 * elles sont dessinées. C'est de la présentation d'assemblage PURE.
 *
 * INVARIANTS (ruling FT-C-001-R1 §10) :
 *  - une `root` n'est JAMAIS un PhysicalContact, jamais un nœud électrique,
 *    jamais un net, jamais stockée dans le Document ;
 *  - `root.dx` / `root.dy` sont dans le repère LOCAL du composant, même origine
 *    que `pin.dx/dy` (`componentDefinitions.js`) — mais ne participent à AUCUN
 *    calcul électrique / de simulation / de résolution de trou ;
 *  - aucun `*_VISUAL_PINS`, aucune coordonnée de contact ici : l'extrémité
 *    d'une patte reste résolue par le modèle PhysicalContact
 *    (`utils/contactModel.js`) — ce module ne fournit que le POINT DE DÉPART
 *    mécanique et un `bodyClip` optionnel ;
 *  - aucune branche `type === …` chez les consommateurs : ils lisent
 *    `getAssemblyProfile(type)` (peut renvoyer `null`).
 */

/** @typedef {{ dx: number, dy: number }} LocalPoint */
/**
 * @typedef {Object} AssemblyProfile
 * @property {'through-hole'} kind
 * @property {Record<string, { root: LocalPoint, style?: 'wire'|'lug' }>} leads
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
  // CAPACITOR radial — corps vertical centré dans la boîte 70×40. Les deux
  // pattes descendent sous le boîtier vers les PhysicalContacts séparés de
  // 24 unités, même entraxe mécanique que LED/LDR/THERMISTOR.
  CAPACITOR: {
    kind: "through-hole",
    leads: {
      pinA: { root: { dx: 23, dy: 25 }, style: "wire" },
      pinB: { root: { dx: 47, dy: 25 }, style: "wire" },
    },
  },
  // LDR — même entraxe validé que la LED (24 unités), centré sur x=42.
  LDR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 29 }, style: "wire" },
      B: { root: { dx: 54, dy: 29 }, style: "wire" },
    },
  },
  // THERMISTOR — corps NTC réaliste vertical validé CSA. Les deux pattes
  // dynamiques naissent juste sous la pastille noire puis rejoignent les
  // PhysicalContacts inchangés, toujours avec l'entraxe de 24 unités.
  THERMISTOR: {
    kind: "through-hole",
    leads: {
      A: { root: { dx: 30, dy: 31 }, style: "wire" },
      B: { root: { dx: 54, dy: 31 }, style: "wire" },
    },
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
  POTENTIOMETER: {
    kind: "through-hole",
    leads: {
      left: { root: { dx: 10, dy: 38 }, style: "lug" },
      wiper: { root: { dx: 45, dy: 38 }, style: "lug" },
      right: { root: { dx: 80, dy: 38 }, style: "lug" },
    },
    bodyClip: { bottom: 10 },
  },
}

export function getAssemblyProfile(type) {
  return ASSEMBLY_PROFILES[type] ?? null
}
