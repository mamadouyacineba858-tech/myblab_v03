/**
 * assemblyProfiles.js — FT-C-001-A.
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
  CAPACITOR: {
    kind: "through-hole",
    leads: {
      pinA: { root: { dx: 23, dy: 27 }, style: "wire" },
      pinB: { root: { dx: 47, dy: 27 }, style: "wire" },
    },
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
  // RGB LED — preserve canonical R/common/G/B identities while replacing the
  // short baked-in legs with four long breadboard-ready dynamic leads.
  RGB_LED: {
    kind: "through-hole",
    leads: {
      R: { root: { dx: 19, dy: 30 }, style: "wire" },
      common: { root: { dx: 35, dy: 30 }, style: "wire" },
      G: { root: { dx: 53, dy: 30 }, style: "wire" },
      B: { root: { dx: 71, dy: 30 }, style: "wire" },
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
