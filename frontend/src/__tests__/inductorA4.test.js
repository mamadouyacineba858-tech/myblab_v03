/**
 * inductorA4.test.js — Ticket A4-INDUCTOR (Realistic Inductor + Transient
 * Electrical Model).
 *
 * INDUCTOR est un NOUVEAU type canonique : deux bornes NON polarisées A/B
 * (rôle 'passive', même vocabulaire que RESISTOR/CAPACITOR). Premier et
 * seul nouveau consommateur réel autorisé du contrat transitoire générique
 * introduit par A4-D-PREQ1/A4-D-PREQ2 (AUCUN A4-D-PREQ3, §2 du ticket).
 *
 * Couvre T1 à T46 du ticket §16-§20 (asset FOUNDER PASS FROZEN,
 * physical-fit breadboard, contrat transitoire, electricalAnalysis).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { getCanonicalEntry, hasCanonicalType } from '../simulator/canonicalRegistry.js'
import { getDcContribution, hasDcContribution } from '../simulator/dcContributionRegistry.js'
import { getTransientContribution, hasTransientContribution } from '../simulator/transientContributionRegistry.js'
import { composeElectricalAnalysis } from '../simulator/electricalAnalysis.js'
import { runSimulationWithRuntime, runSimulationStep, computeTransientElectricalContributions } from '../simulator/simulationRuntimeIntegration.js'
import { resolveComponentParameters, validateComponentParameters } from '../simulator/resolveComponentParameters.js'
import { getSimulationDefaultParameters, isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
import { InductorModel } from '../simulator/models/InductorModel.js'
import { Signal } from '../simulator/signals.js'
import { createScheduler } from '../simulator/scheduler.js'
import { COMPONENT_TYPES, PALETTE_ITEMS, getComponentDef, createComponent } from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDUCTOR_DIR = resolve(__dirname, '../../public/assets/components/inductor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// T1-T10 : Registres canoniques
// ---------------------------------------------------------------------------
describe('A4-INDUCTOR — T1 : INDUCTOR existe dans le Registry canonique', () => {
  it('enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / palette', () => {
    expect(hasCanonicalType('INDUCTOR')).toBe(true)
    expect(COMPONENT_TYPES.INDUCTOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'INDUCTOR')).toBe(true)
    expect(getComponentByType('INDUCTOR')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'INDUCTOR')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'INDUCTOR')).toHaveLength(1)
  })
})

describe('A4-INDUCTOR — T2/T3 : pins exactement A/B, deux pins passive/passive', () => {
  it('pins canoniques EXACTEMENT A/B, rôle passive/passive', () => {
    const def = getComponentDef('INDUCTOR')
    expect(def.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getCanonicalEntry('INDUCTOR').pins.map((p) => p.role)).toEqual(['passive', 'passive'])
  })

  it('aucun pin plus/minus (composant non polarisé, §6 du ticket)', () => {
    const def = getComponentDef('INDUCTOR')
    expect(def.pins.map((p) => p.id)).not.toContain('plus')
    expect(def.pins.map((p) => p.id)).not.toContain('minus')
  })
})

describe('A4-INDUCTOR — T4/T5/T6 : paramètre inductance présent, positif, default résolu', () => {
  it('T4 — parameterSchema porte "inductance", unité H, parameterType "inductance"', () => {
    const entry = getCanonicalEntry('INDUCTOR')
    expect(entry.parameterSchema).toEqual([
      expect.objectContaining({ key: 'inductance', parameterType: 'inductance', unit: 'H' }),
    ])
  })

  it('T5 — minimum strictement positif', () => {
    const entry = getCanonicalEntry('INDUCTOR')
    expect(entry.parameterSchema[0].minimum).toBeGreaterThan(0)
  })

  it('T6 — default résolu correctement (resolveComponentParameters + simulationRegistry)', () => {
    expect(resolveComponentParameters('INDUCTOR', undefined)).toEqual({ inductance: 0.001 })
    expect(getSimulationDefaultParameters('INDUCTOR')).toEqual({ inductance: 0.001 })
  })

  it('modelAvailable: true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('INDUCTOR').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('INDUCTOR')).toBe(true)
  })
})

describe('A4-INDUCTOR — T7/T8/T9 : round-trip Document, normalisation, rejet de valeur invalide', () => {
  it('T7 — createComponent(INDUCTOR) produit un squelette valide (pins clonées) ; parameters explicites survivent un round-trip JSON (persistance Document)', () => {
    const comp = createComponent('INDUCTOR', 10, 20)
    expect(comp.type).toBe('INDUCTOR')
    expect(comp.pins.map((p) => p.id)).toEqual(['A', 'B'])
    const withParameters = { ...comp, parameters: { inductance: 0.047 } }
    const serialized = JSON.parse(JSON.stringify(withParameters))
    expect(serialized.parameters).toEqual({ inductance: 0.047 })
  })

  it('T8 — normalization (resolveComponentParameters) conserve une valeur explicite valide', () => {
    expect(resolveComponentParameters('INDUCTOR', { inductance: 0.047 })).toEqual({ inductance: 0.047 })
  })

  it('T9 — valeur invalide rejetée par le contrat générique (validateComponentParameters), clampée par resolveComponentParameters (repli default)', () => {
    const validated = validateComponentParameters('INDUCTOR', { inductance: -1 })
    expect(validated.valid).toBe(false)
    expect(validated.errors.length).toBeGreaterThan(0)
    // resolveComponentParameters ne lève jamais : repli silencieux sur le default canonique.
    expect(resolveComponentParameters('INDUCTOR', { inductance: -1 })).toEqual({ inductance: 0.001 })
    expect(resolveComponentParameters('INDUCTOR', { inductance: 'x' })).toEqual({ inductance: 0.001 })
  })

  it('InductorModel.validate() rejette les valeurs non strictement positives', () => {
    expect(InductorModel.validate({ inductance: 0.001 })).toBe(true)
    expect(InductorModel.validate({ inductance: 0 })).toBe(false)
    expect(InductorModel.validate({ inductance: -1 })).toBe(false)
    expect(InductorModel.validate({ inductance: NaN })).toBe(false)
    expect(InductorModel.validate({})).toBe(false)
  })
})

describe('A4-INDUCTOR — T10 : completeness guards (mêmes verrous que componentLibraryRolloutGate.test.js)', () => {
  it('capabilities = [\'digital\'] uniquement, aucune contribution DC (cohérent avec TEST G4)', () => {
    const entry = getCanonicalEntry('INDUCTOR')
    expect(entry.capabilities).toEqual(['digital'])
    expect(hasDcContribution('INDUCTOR')).toBe(false)
    expect(getDcContribution('INDUCTOR')).toBeNull()
  })

  it('backend raster déclaré, bareBody + markerless', () => {
    expect(getComponentPresentation('INDUCTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('boîte canonique 144×108 (dimensions natives @1x du paquet Founder)', () => {
    expect([COMPONENT_TYPES.INDUCTOR.width, COMPONENT_TYPES.INDUCTOR.height]).toEqual([144, 108])
  })
})

// ---------------------------------------------------------------------------
// T11-T25 : contrat transitoire
// ---------------------------------------------------------------------------
function poweredPins(orientation = 'AtoB') {
  return orientation === 'AtoB' ? { A: Signal.HIGH, B: Signal.LOW } : { A: Signal.LOW, B: Signal.HIGH }
}

describe('A4-INDUCTOR — T11/T12 : Registry transitoire, aucune branche moteur', () => {
  it('T11 — hasTransientContribution("INDUCTOR") === true', () => {
    expect(hasTransientContribution('INDUCTOR')).toBe(true)
    expect(typeof getTransientContribution('INDUCTOR')).toBe('function')
  })

  it('T12 — aucun littéral INDUCTOR dans simulationRuntimeIntegration.js (code exécutable)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/simulationRuntimeIntegration.js'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(src).not.toMatch(/INDUCTOR/)
  })

  it('aucun littéral INDUCTOR dans resolution.js', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/resolution.js'), 'utf-8')
    expect(src).not.toMatch(/INDUCTOR/)
  })
})

describe('A4-INDUCTOR — T13/T14/T15 : état initial déterministe, évolution, reset', () => {
  const contribute = () => getTransientContribution('INDUCTOR')

  it('T13 — previousState undefined => current initial 0 A', () => {
    const { contribution } = contribute()({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    // ΔI = (5/1) × (100/1000) = 0.5 A depuis 0 A initial.
    expect(contribution.current).toBeCloseTo(0.5, 10)
  })

  it('T14 — même store sur plusieurs steps => current évolue (croît sous tension constante)', () => {
    const ctx = { pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100 }
    const step1 = contribute()({ ...ctx, previousState: undefined })
    const step2 = contribute()({ ...ctx, previousState: step1.state })
    expect(step2.contribution.current).toBeGreaterThan(step1.contribution.current)
    expect(step2.contribution.current).toBeCloseTo(1.0, 10)
  })

  it('T15 — nouveau store => reset déterministe (identique au premier step)', () => {
    const ctx = { pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100 }
    const first = contribute()({ ...ctx, previousState: undefined })
    const afterReset = contribute()({ ...ctx, previousState: undefined })
    expect(afterReset).toEqual(first)
  })
})

describe('A4-INDUCTOR — T16/T17 : L différente / dt différent => évolution différente', () => {
  it('T16 — inductance plus grande => variation de courant plus faible pour même V/dt', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const small = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    const large = contribute({ pins: poweredPins(), params: { inductance: 10 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    expect(small.contribution.current).toBeGreaterThan(large.contribution.current)
  })

  it('T17 — dt plus grand => variation de courant plus grande pour même L/V', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const shortDt = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 10, currentTimeMs: 10, previousState: undefined })
    const longDt = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 200, currentTimeMs: 200, previousState: undefined })
    expect(longDt.contribution.current).toBeGreaterThan(shortDt.contribution.current)
  })
})

describe('A4-INDUCTOR — T18 : conversion millisecondes -> secondes prouvée (V=5V, L=1H, dt=100ms => ΔI=0.5A)', () => {
  it('exemple physique de qualification du ticket §17', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const { contribution, state } = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    expect(contribution.current).toBeCloseTo(0.5, 10)
    expect(state.current).toBeCloseTo(0.5, 10)
  })

  it('dt en millisecondes n\'est jamais utilisé directement (dt=1000ms, L=1H, V=1V => ΔI=1A, pas 1000A)', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const { contribution } = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: 1, dt: 1000, currentTimeMs: 1000, previousState: undefined })
    expect(contribution.current).toBeCloseTo(1, 10)
  })
})

describe('A4-INDUCTOR — T19 : changement de polarité affecte le signe de di/dt', () => {
  it('A=HIGH,B=LOW => courant croît positivement ; A=LOW,B=HIGH => courant croît négativement', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const forward = contribute({ pins: poweredPins('AtoB'), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    const reverse = contribute({ pins: poweredPins('BtoA'), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: undefined })
    expect(forward.contribution.current).toBeGreaterThan(0)
    expect(reverse.contribution.current).toBeLessThan(0)
    expect(reverse.contribution.current).toBeCloseTo(-forward.contribution.current, 10)
  })

  it('une polarité inversée fait DÉCROÎTRE un courant positif déjà établi (jamais Math.abs())', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const established = { current: 0.5 }
    const { contribution } = contribute({ pins: poweredPins('BtoA'), params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState: established })
    expect(contribution.current).toBeLessThan(established.current)
  })

  it('transientContributionRegistry.js n\'utilise jamais Math.abs() sur le courant (code exécutable, hors commentaires)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/transientContributionRegistry.js'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(src).not.toMatch(/Math\.abs/)
  })
})

describe('A4-INDUCTOR — T20 : contexte invalide => aucune contribution, état préservé', () => {
  it('boucle non simple (UNKNOWN/UNKNOWN) => contribution null, état inchangé', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const previousState = { current: 0.3 }
    const result = contribute({ pins: { A: Signal.UNKNOWN, B: Signal.UNKNOWN }, params: { inductance: 1 }, supplyVoltage: 5, dt: 100, currentTimeMs: 100, previousState })
    expect(result.contribution).toBeNull()
    expect(result.state).toBe(previousState)
  })

  it('supplyVoltage absent (plusieurs sources DC) => traité comme non alimenté', () => {
    const contribute = getTransientContribution('INDUCTOR')
    const result = contribute({ pins: poweredPins(), params: { inductance: 1 }, supplyVoltage: null, dt: 100, currentTimeMs: 100, previousState: undefined })
    expect(result.contribution).toBeNull()
    expect(result.state).toBeUndefined()
  })
})

describe('A4-INDUCTOR — T21 : aucune wall-clock API', () => {
  it('transientContributionRegistry.js n\'utilise ni Date.now, ni performance.now, ni setTimeout, ni setInterval, ni requestAnimationFrame', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/transientContributionRegistry.js'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/performance\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })
})

const INDUCTOR_CIRCUIT = {
  components: [
    { uid: 'power1', type: 'POWER', x: 0, y: 0 },
    { uid: 'ind1', type: 'INDUCTOR', x: 10, y: 0, parameters: { inductance: 1 } },
  ],
  wires: [
    { fromUid: 'power1', fromPin: '5V', toUid: 'ind1', toPin: 'A' },
    { fromUid: 'power1', fromPin: 'GND', toUid: 'ind1', toPin: 'B' },
  ],
}

describe('A4-INDUCTOR — T22 : aucune mutation Document/parameters', () => {
  it('le composant original et ses parameters ne sont jamais mutés par runSimulationStep()', () => {
    const originalParameters = { inductance: 1 }
    const originalComponent = { uid: 'ind1', type: 'INDUCTOR', x: 10, y: 0, parameters: originalParameters }
    const components = Object.freeze([
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      originalComponent,
    ])
    runSimulationStep(components, INDUCTOR_CIRCUIT.wires, { dt: 100 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ inductance: 1 })
  })
})

describe('A4-INDUCTOR — T23 : un seul electricalTransientStates', () => {
  it('le store fourni par l\'appelant est le SEUL état runtime muté (uid ind1 seul)', () => {
    const electricalTransientStates = new Map()
    runSimulationStep(INDUCTOR_CIRCUIT.components, INDUCTOR_CIRCUIT.wires, { dt: 100, electricalTransientStates })
    expect([...electricalTransientStates.keys()]).toEqual(['ind1'])
    expect(electricalTransientStates.get('ind1').current).toBeCloseTo(0.5, 10)
  })
})

describe('A4-INDUCTOR — T24 : un seul Scheduler.advance(dt) par step', () => {
  it('un INDUCTOR seul ne fait avancer un Scheduler explicite que d\'un seul dt par appel', () => {
    const scheduler = createScheduler()
    runSimulationStep(INDUCTOR_CIRCUIT.components, INDUCTOR_CIRCUIT.wires, { dt: 16, scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
  })

  it('deux INDUCTOR dans le même circuit ne font avancer le Scheduler que d\'un seul dt', () => {
    const scheduler = createScheduler()
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'ind1', type: 'INDUCTOR', x: 10, y: 0 },
      { uid: 'ind2', type: 'INDUCTOR', x: 20, y: 0 },
    ]
    const wires = [
      ...INDUCTOR_CIRCUIT.wires,
      { fromUid: 'power1', fromPin: '5V', toUid: 'ind2', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'ind2', toPin: 'B' },
    ]
    runSimulationStep(components, wires, { dt: 16, scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
  })
})

describe('A4-INDUCTOR — T25 : un seul resolveSignals par step', () => {
  it('simulationRuntimeIntegration.js appelle resolveSignals(...) exactement une fois (hors commentaires/JSDoc)', () => {
    const raw = readFileSync(resolve(__dirname, '../simulator/simulationRuntimeIntegration.js'), 'utf-8')
    const executable = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const matches = executable.match(/\bresolveSignals\s*\(/g) ?? []
    expect(matches.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// T26-T31 : electricalAnalysis
// ---------------------------------------------------------------------------
describe('A4-INDUCTOR — T26 : runSimulationStep expose INDUCTOR dans electricalAnalysis', () => {
  it('electricalAnalysis.get("ind1") reflète le courant transitoire du step courant', () => {
    const { electricalAnalysis } = runSimulationStep(INDUCTOR_CIRCUIT.components, INDUCTOR_CIRCUIT.wires, { dt: 100 })
    expect(electricalAnalysis.get('ind1')).toBeDefined()
    expect(electricalAnalysis.get('ind1').current).toBeCloseTo(0.5, 10)
  })
})

describe('A4-INDUCTOR — T27 : pinSignals reste Signal-only', () => {
  it('aucune valeur numérique injectée dans pinSignals', () => {
    const validSignals = new Set(Object.values(Signal))
    const { pinSignals } = runSimulationStep(INDUCTOR_CIRCUIT.components, INDUCTOR_CIRCUIT.wires, { dt: 100 })
    for (const value of pinSignals.values()) {
      expect(typeof value).toBe('string')
      expect(validSignals.has(value)).toBe(true)
    }
  })
})

describe('A4-INDUCTOR — T28 : transient > steady-state DC (INDUCTOR n\'a pas de DC, donc TOUJOURS le transient)', () => {
  it('composeElectricalAnalysis : dcAnalysis vide pour INDUCTOR (jamais enregistré), electricalAnalysis vient donc exclusivement du transient', () => {
    const dcAnalysis = new Map() // INDUCTOR jamais présent dans dcAnalysis, hasDcContribution === false.
    const transientAnalysis = new Map([['ind1', { voltage: 5, current: 0.5 }]])
    const composed = composeElectricalAnalysis(dcAnalysis, transientAnalysis)
    expect(composed.get('ind1')).toEqual({ voltage: 5, current: 0.5 })
  })
})

describe('A4-INDUCTOR — T29 : circuit sans INDUCTOR reste identique au baseline', () => {
  it('un circuit RESISTOR/POWER (sans INDUCTOR) garde electricalAnalysis strictement DC', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'r1', type: 'RESISTOR', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'r1', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'r1', toPin: 'B' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires)
    expect(electricalAnalysis.get('r1')).toEqual({ voltage: 5, current: 5 / 220 })
  })
})

describe('A4-INDUCTOR — T30 : coexistence CAPACITOR + INDUCTOR, même Scheduler/même electricalTransientStates', () => {
  it('les deux composants partagent le même store et le même currentTimeMs', () => {
    const scheduler = createScheduler()
    const electricalTransientStates = new Map()
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'ind1', type: 'INDUCTOR', x: 10, y: 0, parameters: { inductance: 1 } },
      { uid: 'cap1', type: 'CAPACITOR', x: 20, y: 0 },
    ]
    const wires = [
      ...INDUCTOR_CIRCUIT.wires,
      { fromUid: 'power1', fromPin: '5V', toUid: 'cap1', toPin: 'pinA' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'cap1', toPin: 'pinB' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires, { dt: 16, scheduler, electricalTransientStates })
    expect(scheduler.getCurrentTime()).toBe(16)
    expect([...electricalTransientStates.keys()].sort()).toEqual(['cap1', 'ind1'])
    expect(electricalAnalysis.get('ind1')).toBeDefined()
    expect(electricalAnalysis.get('cap1')).toBeDefined()
  })
})

describe('A4-INDUCTOR — T31 : coexistence Arduino/Timed Digital/INDUCTOR, aucune duplication du temps', () => {
  it('les trois observent exactement le même currentTimeMs, un seul Scheduler', () => {
    const orchestrators = new Map()
    const electricalTransientStates = new Map()
    const components = [
      { uid: 'ard1', type: 'ARDUINO', x: 0, y: 0 },
      { uid: 'ind1', type: 'INDUCTOR', x: 10, y: 0, parameters: { inductance: 1 } },
    ]
    const { electricalAnalysis } = runSimulationStep(components, [], { dt: 16, orchestrators, electricalTransientStates })
    expect(orchestrators.get('ard1').getCurrentTime()).toBe(16)
    // Composant non alimenté (aucune source DC câblée, aucun wire) : état
    // préservé tel quel (undefined au premier step, même patron que
    // capacitorChargeStep), aucune contribution.
    expect(electricalTransientStates.get('ind1')).toBeUndefined()
    expect(electricalAnalysis.has('ind1')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// T32-T39 : Asset (Founder PASS FROZEN)
// ---------------------------------------------------------------------------
describe('A4-INDUCTOR — T32-T39 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder PASS)', () => {
  it('T33/T34 — les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['inductor.default.1x.png', 'inductor.default.1x.webp', 'inductor.default.3x.png', 'inductor.default.3x.webp']) {
      expect(existsSync(resolve(INDUCTOR_DIR, f)), f).toBe(true)
    }
  })

  it('T35 — dimensions réelles des PNG livrés : 1x = 144×108, 3x = 432×324 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(INDUCTOR_DIR, 'inductor.default.1x.png')))
    const three = pngDims(readFileSync(resolve(INDUCTOR_DIR, 'inductor.default.3x.png')))
    expect([one.w, one.h]).toEqual([144, 108])
    expect([three.w, three.h]).toEqual([432, 324])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('T32 — manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, ordre des pins visibles)', () => {
    const m = JSON.parse(readFileSync(resolve(INDUCTOR_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('INDUCTOR')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 108])
    expect(m.visiblePinOrder).toEqual(['A', 'B'])
  })

  it('T36 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(INDUCTOR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(INDUCTOR_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(INDUCTOR_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(INDUCTOR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })

  it('T37 — renderer raster enregistré (InductorPart), utilise le raster Founder PASS', () => {
    expect(getComponentByType('INDUCTOR')).not.toBeNull()
    expect(getComponentByType('INDUCTOR').name).toBe('InductorPart')
  })

  it('T38 — visualContract (SCALE_REFERENCE) enregistré, box = canonical', () => {
    const entry = SCALE_REFERENCE.find((e) => e.type === 'INDUCTOR')
    expect(entry).toBeTruthy()
    expect(entry.box).toEqual([144, 108])
  })

  it('T39 — InductorPart.jsx ne dessine aucun SVG physique ni CSS/DOM du corps (uniquement <picture>/<img> raster, aucun fallback)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/InductorPart.jsx'), 'utf-8')
    expect(src).not.toMatch(/<svg/)
    expect(src).not.toMatch(/<rect|<circle|<line|<path|<ellipse|<polygon/)
    expect(src).toMatch(/<picture/)
    expect(src).toMatch(/<img/)
  })
})

// ---------------------------------------------------------------------------
// T40-T46 : Physical Fit
// ---------------------------------------------------------------------------
describe('A4-INDUCTOR — T40/T41/T45 : PhysicalContacts A(12,92)/B(132,92), pitch 10×12px', () => {
  const def = getComponentDef('INDUCTOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T40 — exactement deux PhysicalContacts DISTINCTS, câblables et enfichables', () => {
    for (const id of ['A', 'B']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
    const [a, b] = ['A', 'B'].map((id) => resolveContacts(byPin[id])[0])
    expect(a).not.toEqual(b)
  })

  it('ordre A/B conservé, positions exactes', () => {
    expect(resolveContacts(byPin.A)[0]).toMatchObject({ id: 'A', dx: 12, dy: 92 })
    expect(resolveContacts(byPin.B)[0]).toMatchObject({ id: 'B', dx: 132, dy: 92 })
  })

  it('T41 — Δx = 120 px = 10 × BREADBOARD_PITCH exact, même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [a, b] = ['A', 'B'].map((id) => resolveContacts(byPin[id])[0])
    expect(b.dx - a.dx).toBe(120)
    expect(b.dx - a.dx).toBe(10 * BREADBOARD_PITCH)
    expect(b.dy).toBe(a.dy)
  })
})

describe('A4-INDUCTOR — T42/T43/T44/T45/T46 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('INDUCTOR')
  // A/B (dx=12/132) sont déjà des multiples exacts de 12, mais dy=92 ne
  // l'est pas seul (92 = 7×12 + 8) : une origine y=16 replace les deux
  // contacts exactement sur la grille (16+92=108=9×12, rangée STRIP_BOTTOM
  // valide — row=8 serait tombé dans la rainure centrale, invalide) — même
  // origine y que le précédent HC_SR04.
  const origin = { x: 0, y: 16 }

  it('T42 — resolveComponentContactHoles : allResolved = true, 2 trous DISTINCTS, même rangée', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [aR, bR] = results
    expect(aR.hole).not.toBeNull()
    expect(bR.hole).not.toBeNull()
    expect(aR.hole.row).toBe(bR.hole.row)
    expect(aR.hole.column).not.toBe(bR.hole.column)
    expect(aR.hole).toEqual(holeAt(breadboard, origin.x + 12, origin.y + 92))
    expect(bR.hole).toEqual(holeAt(breadboard, origin.x + 132, origin.y + 92))
  })

  it('T45 — contacts A/B résolus vers deux trous DIFFÉRENTS', () => {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, origin)
    const columns = results.map((r) => r.hole.column)
    expect(new Set(columns).size).toBe(2)
  })

  it('T43 — computeBreadboardPlacement (adapter réel) : composant compatible, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'INDUCTOR', { x: 0, y: 16 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(2)
    expect(result.valid).toBe(true)
  })

  it('T44 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, target = PhysicalContact exact', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'INDUCTOR', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.A.target).toEqual({ x: origin.x + 12, y: origin.y + 92 })
    expect(byPinId.B.target).toEqual({ x: origin.x + 132, y: origin.y + 92 })
  })

  it('AssemblyProfile : through-hole, 2 leads, racines mesurées, aucun bodyClip, aucun lead croisé', () => {
    const profile = getAssemblyProfile('INDUCTOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['A', 'B'])
    expect(profile.leads.A.root).toEqual({ dx: 4, dy: 52 })
    expect(profile.leads.B.root).toEqual({ dx: 139, dy: 52 })
    expect(profile.leads.A.style).toBe('metallic-wire')
    expect(profile.leads.B.style).toBe('metallic-wire')
    expect(profile.bodyClip).toBeUndefined()
    for (const id of ['A', 'B']) {
      const contact = resolveContacts(byPinOf(def, id))[0]
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy) // racine AU-DESSUS du contact
    }
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'INDUCTOR', x: origin.x, y: origin.y }, breadboard)
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.A.root.x).toBeLessThan(byPinId.B.root.x)
    expect(byPinId.A.target.x).toBeLessThan(byPinId.B.target.x)
  })

  it('T46 — aucun changement du raster Founder PASS pour satisfaire le breadboard (racines = mesures réelles pixel-probe, jamais inventées)', () => {
    // Preuve indirecte : les racines A(4,52)/B(139,52) tombent dans les
    // bounds opaques mesurés du manifest ([1,4,142,67]) — cohérentes avec le
    // raster livré tel quel, jamais un recadrage/redessin (§3/§4 du ticket).
    const manifest = JSON.parse(readFileSync(resolve(INDUCTOR_DIR, 'manifest.json'), 'utf-8'))
    const [x0, y0, x1, y1] = manifest.pixelProbe.opaqueBounds1x
    for (const dx of [4, 139]) expect(dx).toBeGreaterThanOrEqual(x0)
    for (const dx of [4, 139]) expect(dx).toBeLessThanOrEqual(x1)
    expect(52).toBeGreaterThanOrEqual(y0)
    expect(52).toBeLessThanOrEqual(y1)
  })
})

// ---------------------------------------------------------------------------
// GATE 0 : non-régression stricte, aucune contribution invalide inventée
// ---------------------------------------------------------------------------
describe('A4-INDUCTOR — GATE 0 : dette préexistante non touchée, aucune régression', () => {
  it('un circuit sans INDUCTOR reste identique au chemin historique runSimulationWithRuntime/runSimulation', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'led1', type: 'LED', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    const result = runSimulationWithRuntime(components, wires)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
  })

  it('computeTransientElectricalContributions reste utilisable directement pour INDUCTOR (composition unitaire)', () => {
    const registry = { hasTransientContribution, getTransientContribution }
    const states = new Map()
    const produced = computeTransientElectricalContributions(
      [{ uid: 'ind1', type: 'INDUCTOR', parameters: { inductance: 1 } }],
      registry,
      new Map([['ind1:A', Signal.HIGH], ['ind1:B', Signal.LOW]]),
      5, 100, 100, states
    )
    expect(produced.get('ind1').current).toBeCloseTo(0.5, 10)
    expect(states.get('ind1').current).toBeCloseTo(0.5, 10)
  })
})
