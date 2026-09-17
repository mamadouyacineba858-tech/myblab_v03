/**
 * hcSr04A7C5.test.js — Ticket A7-C5 (HC-SR04 Ultrasonic Distance Sensor).
 *
 * HC_SR04 est un NOUVEAU type canonique : 4 broches DIRECTIONNELLES
 * VCC/TRIG/ECHO/GND (même vocabulaire de rôles que TMP36/SOIL_MOISTURE_SENSOR/
 * PIR_MOTION_SENSOR/IR_RECEIVER — power/output/ground — plus `input`, déjà
 * utilisé ailleurs). ECHO est la SEULE sortie fonctionnelle — une sortie
 * numérique TEMPORELLE (timedDigitalContributionRegistry.js, PREMIER
 * producteur réel de A7-C5-PREQ, commit 56feb9b) — AUCUNE sortie
 * analogique/DC pour ce composant (§13 du ticket).
 *
 * Stimulus environnemental générique A7-C0 : DISTANCE ∈ [2,400] cm (contrat
 * Level-1 CONTINU, portée réelle datasheet), produisant distanceCm =
 * DISTANCE (passage direct, environmentalResponseRegistry.js).
 *
 * Couvre HC-01 à HC-66 du ticket §24-§32 (hors §31 Visual anti-overflow gate
 * et §32, prouvés séparément dans le navigateur — voir RAPPORT FINAL).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import {
  getCanonicalEntry,
  hasCanonicalType,
} from '../simulator/canonicalRegistry.js'
import {
  getDcContribution,
  hasDcContribution,
} from '../simulator/dcContributionRegistry.js'
import {
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
} from '../simulator/timedDigitalContributionRegistry.js'
import { resolveSignals } from '../simulator/resolution.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { Signal } from '../simulator/signals.js'
import { getSimulationDefaultParameters, isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
import { HcSr04Model } from '../simulator/models/HcSr04Model.js'
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
import { applyEnvironmentalStimuli } from '../simulator/environmentalStimulus.js'
import { isValidStimulusValue, isKnownStimulusKind } from '../simulator/environmentalStimulusRegistry.js'
import { getEnvironmentalResponse } from '../simulator/environmentalResponseRegistry.js'
import { runSimulationWithRuntime, computeTimedDigitalSignals } from '../simulator/simulationRuntimeIntegration.js'
import { createScheduler } from '../simulator/scheduler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HC_DIR = resolve(__dirname, '../../public/assets/components/hc-sr04')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function hcSr04(uid, parameters) {
  return { uid, type: 'HC_SR04', x: 0, y: 0, parameters }
}

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// HC-01 à HC-06 : type canonique enregistré, pins exactes, ordre exact
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-01 à HC-06 : HC_SR04 enregistré dans les registres déclaratifs', () => {
  it('HC-01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / timedDigitalContributionRegistry / palette', () => {
    expect(hasCanonicalType('HC_SR04')).toBe(true)
    expect(COMPONENT_TYPES.HC_SR04).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'HC_SR04')).toBe(true)
    expect(hasTimedDigitalContribution('HC_SR04')).toBe(true)
    expect(getComponentByType('HC_SR04')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'HC_SR04')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'HC_SR04')).toHaveLength(1)
  })

  it('HC-02/HC-03/HC-04 — pins canoniques EXACTEMENT VCC/TRIG/ECHO/GND, dans cet ordre, rôles power/input/output/ground', () => {
    const def = getComponentDef('HC_SR04')
    expect(def.pins.map((p) => p.id)).toEqual(['VCC', 'TRIG', 'ECHO', 'GND'])
    expect(getCanonicalEntry('HC_SR04').pins.map((p) => p.role)).toEqual(['power', 'input', 'output', 'ground'])
  })

  it('HC-05 — distanceCm fallback correct (100 cm)', () => {
    const defaults = getSimulationDefaultParameters('HC_SR04')
    expect(defaults).toEqual({ distanceCm: 100 })
  })

  it('HC-06 — aucun pin supplémentaire', () => {
    expect(getComponentDef('HC_SR04').pins).toHaveLength(4)
  })

  it('§13 — aucune contribution DC (HC_SR04 ne fournit aucune sortie analogique)', () => {
    expect(hasDcContribution('HC_SR04')).toBe(false)
    expect(getDcContribution('HC_SR04')).toBeNull()
    expect(getCanonicalEntry('HC_SR04').capabilities).toEqual(['digital'])
  })

  it('modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('HC_SR04').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('HC_SR04')).toBe(true)
  })

  it('backend raster déclaré', () => {
    expect(getComponentPresentation('HC_SR04')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C5 — boîte canonique 144×96 (dimensions natives @1x du paquet Founder)', () => {
  it('width/height === 144×96', () => {
    expect([COMPONENT_TYPES.HC_SR04.width, COMPONENT_TYPES.HC_SR04.height]).toEqual([144, 96])
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'HC_SR04')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([144, 96])
  })
})

// ---------------------------------------------------------------------------
// HC-07 à HC-18 : DISTANCE stimulus, distanceCm response
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-07/HC-08 : DISTANCE stimulus kind connu, distinct des autres stimuli', () => {
  it('HC-07 — DISTANCE reconnu', () => {
    expect(isKnownStimulusKind('DISTANCE')).toBe(true)
  })
  it('HC-08 — DISTANCE distinct des autres kinds (HC_SR04 répond à DISTANCE, jamais un autre kind)', () => {
    const response = getEnvironmentalResponse('HC_SR04')
    expect(response).toBeTruthy()
    expect(response.stimulus).toBe('DISTANCE')
    for (const other of ['LIGHT', 'TEMPERATURE', 'FORCE', 'FLEX', 'MOISTURE', 'MOTION', 'TILT', 'INFRARED']) {
      expect(response.stimulus).not.toBe(other)
    }
  })
})

describe('A7-C5 — HC-09 à HC-17 : domaine DISTANCE [2,400], valeurs finies uniquement', () => {
  it('HC-09/HC-10/HC-11 — 2, 100, 400 acceptés (bornes incluses + valeur centrale)', () => {
    expect(isValidStimulusValue('DISTANCE', 2)).toBe(true)
    expect(isValidStimulusValue('DISTANCE', 100)).toBe(true)
    expect(isValidStimulusValue('DISTANCE', 400)).toBe(true)
  })
  it('HC-12 — <2 rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', 1.999)).toBe(false)
    expect(isValidStimulusValue('DISTANCE', 0)).toBe(false)
    expect(isValidStimulusValue('DISTANCE', -1)).toBe(false)
  })
  it('HC-13 — >400 rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', 400.001)).toBe(false)
    expect(isValidStimulusValue('DISTANCE', 1000)).toBe(false)
  })
  it('HC-14 — NaN rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', NaN)).toBe(false)
  })
  it('HC-15 — Infinity/-Infinity rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', Infinity)).toBe(false)
    expect(isValidStimulusValue('DISTANCE', -Infinity)).toBe(false)
  })
  it('HC-16 — boolean rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', true)).toBe(false)
    expect(isValidStimulusValue('DISTANCE', false)).toBe(false)
  })
  it('HC-17 — string rejeté', () => {
    expect(isValidStimulusValue('DISTANCE', '100')).toBe(false)
  })
})

describe('A7-C5 — DISTANCE -> distanceCm (passage direct, identité)', () => {
  it('sans stimulus actif : fallback canonique distanceCm=100', () => {
    const defaults = getSimulationDefaultParameters('HC_SR04')
    expect(defaults).toEqual({ distanceCm: 100 })
  })
  it('DISTANCE=2 -> distanceCm=2 ; DISTANCE=400 -> distanceCm=400', () => {
    const [a] = applyEnvironmentalStimuli([hcSr04('h1', { distanceCm: 100 })], { DISTANCE: 2 })
    expect(a.parameters.distanceCm).toBe(2)
    const [b] = applyEnvironmentalStimuli([hcSr04('h1', { distanceCm: 100 })], { DISTANCE: 400 })
    expect(b.parameters.distanceCm).toBe(400)
  })

  it('HC-18 — aucune mutation Document : composant persistant original et ses parameters ne sont jamais mutés', () => {
    const originalParameters = { distanceCm: 100 }
    const originalComponent = hcSr04('h1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { DISTANCE: 250 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ distanceCm: 100 })
    expect(result[0]).not.toBe(originalComponent)
  })

  it('stimulus absent/invalide -> no-op strict, même référence de tableau', () => {
    const originalParameters = { distanceCm: 100 }
    const originalComponent = hcSr04('h1', originalParameters)
    const components = Object.freeze([originalComponent])
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [1, 401, NaN, true, '100']) {
      expect(applyEnvironmentalStimuli(components, { DISTANCE: invalid })).toBe(components)
    }
  })
})

// ---------------------------------------------------------------------------
// HC-19 à HC-23 : alimentation VCC/GND
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-19 à HC-23 : garde d\'alimentation VCC=HIGH/GND=LOW', () => {
  const contribute = getTimedDigitalContribution('HC_SR04')
  const params = { distanceCm: 100 }

  it('HC-19 — VCC HIGH + GND LOW -> composant actif (contribue)', () => {
    const powered = { VCC: Signal.HIGH, TRIG: Signal.LOW, ECHO: Signal.UNKNOWN, GND: Signal.LOW }
    const { outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered, currentTimeMs: 0, previousState: undefined })
    expect(outputs).not.toBeNull()
    expect(outputs.get('ECHO')).toBe(Signal.LOW)
  })

  it('HC-20 — VCC LOW -> pas de mesure valide (outputs null)', () => {
    const unpowered = { VCC: Signal.LOW, TRIG: Signal.HIGH, ECHO: Signal.UNKNOWN, GND: Signal.LOW }
    const { outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: unpowered, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
  })

  it('HC-21 — VCC UNKNOWN -> pas de mesure valide', () => {
    const unpowered = { VCC: Signal.UNKNOWN, TRIG: Signal.HIGH, ECHO: Signal.UNKNOWN, GND: Signal.LOW }
    const { outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: unpowered, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
  })

  it('HC-22 — GND HIGH -> pas de mesure valide (polarité inversée)', () => {
    const reversed = { VCC: Signal.LOW, TRIG: Signal.HIGH, ECHO: Signal.UNKNOWN, GND: Signal.HIGH }
    const { outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: reversed, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
  })

  it('HC-23 — GND UNKNOWN -> pas de mesure valide', () => {
    const unpowered = { VCC: Signal.HIGH, TRIG: Signal.HIGH, ECHO: Signal.UNKNOWN, GND: Signal.UNKNOWN }
    const { outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: unpowered, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
  })

  it('non alimenté : l\'état privé est préservé tel quel (jamais réinitialisé silencieusement)', () => {
    const previousState = { phase: 'MEASURING', previousTrig: Signal.HIGH, echoEndMs: 42 }
    const unpowered = { VCC: Signal.UNKNOWN, TRIG: Signal.HIGH, ECHO: Signal.UNKNOWN, GND: Signal.UNKNOWN }
    const { state } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: unpowered, currentTimeMs: 5, previousState })
    expect(state).toBe(previousState)
  })

  it('circuit réel déconnecté résout ECHO = UNKNOWN (jamais HIGH/LOW), via runSimulationWithRuntime', () => {
    const sensor = { uid: 'h1', type: 'HC_SR04', x: 0, y: 0, parameters: { distanceCm: 50 } }
    const result = runSimulationWithRuntime([sensor], [])
    expect(result.get('h1:ECHO')).toBe(Signal.UNKNOWN)
  })
})

// ---------------------------------------------------------------------------
// HC-24 à HC-29 : trigger FSM
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-24 à HC-29 : machine d\'état TRIG (front, pas de redéclenchement, réarmement)', () => {
  const contribute = getTimedDigitalContribution('HC_SR04')
  const powered = (trig) => ({ VCC: Signal.HIGH, TRIG: trig, ECHO: Signal.UNKNOWN, GND: Signal.LOW })
  const params = { distanceCm: 100 } // echoEndMs offset = 5.8 ms

  it('HC-24 — TRIG LOW au repos ne déclenche rien (ECHO LOW, phase IDLE)', () => {
    const { state, outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined })
    expect(outputs.get('ECHO')).toBe(Signal.LOW)
    expect(state.phase).toBe('IDLE')
  })

  it('HC-25 — un front LOW->HIGH valide déclenche une mesure (phase MEASURING, ECHO HIGH)', () => {
    const s0 = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined }).state
    const { state, outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 1, previousState: s0 })
    expect(state.phase).toBe('MEASURING')
    expect(outputs.get('ECHO')).toBe(Signal.HIGH)
    expect(state.echoEndMs).toBeCloseTo(1 + 100 * 0.058, 9)
  })

  it('HC-26 — TRIG maintenu HIGH ne redéclenche pas chaque step (deadline inchangée)', () => {
    let state
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined }).state
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 1, previousState: state }).state
    const echoEndMsAfterFirstEdge = state.echoEndMs
    // TRIG reste HIGH sur plusieurs steps successifs : deadline strictement inchangée.
    for (const t of [2, 3, 4]) {
      state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: t, previousState: state }).state
      expect(state.echoEndMs).toBe(echoEndMsAfterFirstEdge)
      expect(state.phase).toBe('MEASURING')
    }
  })

  it('HC-27/HC-29 — retour LOW réarme correctement, un nouveau front déclenche une NOUVELLE mesure (HC-28)', () => {
    let state
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined }).state
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 1, previousState: state }).state
    const firstDeadline = state.echoEndMs
    // Mesure terminée (T >= deadline) -> IDLE.
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: firstDeadline, previousState: state }).state
    expect(state.phase).toBe('IDLE')
    // TRIG toujours HIGH depuis la fin de la mesure : aucun nouveau front tant que TRIG ne redescend pas.
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: firstDeadline + 1, previousState: state }).state
    expect(state.phase).toBe('IDLE')
    // Retour LOW (réarmement) puis nouveau front HIGH -> nouvelle mesure (HC-29 : état persiste entre steps, HC-28 : nouvelle mesure).
    state = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: firstDeadline + 2, previousState: state }).state
    expect(state.phase).toBe('IDLE')
    const { state: state2, outputs } = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: firstDeadline + 3, previousState: state })
    expect(state2.phase).toBe('MEASURING')
    expect(outputs.get('ECHO')).toBe(Signal.HIGH)
    expect(state2.echoEndMs).toBeGreaterThan(firstDeadline)
  })
})

// ---------------------------------------------------------------------------
// HC-30 à HC-38 : ECHO timing
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-30 à HC-38 : durée ECHO = distanceCm × 0.058 ms, fraction préservée', () => {
  const contribute = getTimedDigitalContribution('HC_SR04')
  const powered = (trig) => ({ VCC: Signal.HIGH, TRIG: trig, ECHO: Signal.UNKNOWN, GND: Signal.LOW })

  function trigger(distanceCm, atMs) {
    let state = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm }, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined }).state
    const r = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm }, pinSignals: powered(Signal.HIGH), currentTimeMs: atMs, previousState: state })
    return r.state.echoEndMs - atMs
  }

  it('HC-30 — distance 10 cm -> durée ≈ 0.58 ms', () => {
    expect(trigger(10, 0)).toBeCloseTo(0.58, 9)
  })
  it('HC-31 — distance 100 cm -> durée ≈ 5.8 ms', () => {
    expect(trigger(100, 0)).toBeCloseTo(5.8, 9)
  })
  it('HC-32 — distance 400 cm -> durée ≈ 23.2 ms', () => {
    expect(trigger(400, 0)).toBeCloseTo(23.2, 9)
  })
  it('HC-33/HC-34 — durée fractionnaire préservée, aucune quantification 16 ms (2 cm -> 0.116 ms)', () => {
    const duration = trigger(2, 0)
    expect(duration).toBeCloseTo(0.116, 9)
    expect(duration).not.toBe(0)
    expect(duration).not.toBe(16)
  })

  it('HC-35/HC-36/HC-37 — ECHO LOW avant mesure, HIGH pendant la fenêtre, LOW après deadline', () => {
    const params = { distanceCm: 100 } // deadline offset 5.8 ms
    let state
    // Avant mesure : LOW.
    let r = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined })
    expect(r.outputs.get('ECHO')).toBe(Signal.LOW) // HC-35
    state = r.state
    // Front à T=10 -> deadline = 15.8.
    r = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 10, previousState: state })
    state = r.state
    expect(state.echoEndMs).toBeCloseTo(15.8, 9)
    expect(r.outputs.get('ECHO')).toBe(Signal.HIGH) // HC-36 (avant deadline)
    // T=15 (< 15.8) : toujours HIGH.
    r = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 15, previousState: state })
    state = r.state
    expect(r.outputs.get('ECHO')).toBe(Signal.HIGH)
    // T=15.8 (>= deadline) : LOW (HC-37).
    r = contribute({ component: hcSr04('h1'), pins: [], params, pinSignals: powered(Signal.HIGH), currentTimeMs: 15.8, previousState: state })
    expect(r.outputs.get('ECHO')).toBe(Signal.LOW)
  })

  it('HC-38 — une nouvelle mesure utilise la nouvelle DISTANCE effective', () => {
    let state
    state = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm: 100 }, pinSignals: powered(Signal.LOW), currentTimeMs: 0, previousState: undefined }).state
    // Premier front, distance 100 cm.
    let r = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm: 100 }, pinSignals: powered(Signal.HIGH), currentTimeMs: 0, previousState: state })
    expect(r.state.echoEndMs).toBeCloseTo(5.8, 9)
    state = r.state
    const firstEchoEndMs = state.echoEndMs
    // Mesure terminée (T >= echoEndMs réel, jamais un littéral 5.8 approximatif
    // — précision flottante), réarmement, second front avec une DISTANCE
    // différente (400 cm).
    state = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm: 400 }, pinSignals: powered(Signal.HIGH), currentTimeMs: firstEchoEndMs, previousState: state }).state
    expect(state.phase).toBe('IDLE')
    state = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm: 400 }, pinSignals: powered(Signal.LOW), currentTimeMs: firstEchoEndMs + 1, previousState: state }).state
    r = contribute({ component: hcSr04('h1'), pins: [], params: { distanceCm: 400 }, pinSignals: powered(Signal.HIGH), currentTimeMs: firstEchoEndMs + 2, previousState: state })
    expect(r.state.echoEndMs - (firstEchoEndMs + 2)).toBeCloseTo(23.2, 9)
  })
})

// ---------------------------------------------------------------------------
// HC-39 à HC-44 : single resolve, Registry générique, propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-39 à HC-44 : Registry générique, aucune branche HC_SR04, propagation réelle', () => {
  it('HC-39 — HC_SR04 utilise timedDigitalContributionRegistry (Registry générique du PREQ)', () => {
    expect(hasTimedDigitalContribution('HC_SR04')).toBe(true)
    expect(typeof getTimedDigitalContribution('HC_SR04')).toBe('function')
  })

  it('HC-40 — simulationRuntimeIntegration.js ne contient aucune branche HC_SR04 (littéral absent)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/simulationRuntimeIntegration.js'), 'utf-8')
    expect(src).not.toMatch(/HC_SR04/)
    expect(src).not.toMatch(/\bDISTANCE\b/)
    expect(src).not.toMatch(/\bTRIG\b/)
    expect(src).not.toMatch(/\bECHO\b/)
  })

  it('HC-41 — scheduler.js/clock.js ne contiennent aucun littéral HC_SR04', () => {
    for (const rel of ['../simulator/scheduler.js', '../simulator/clock.js']) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src).not.toMatch(/HC_SR04/)
    }
  })

  it('HC-42 — resolution.js ne contient aucun littéral HC_SR04', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/resolution.js'), 'utf-8')
    expect(src).not.toMatch(/HC_SR04/)
  })

  it('HC-43 — resolveSignals reste appelé une seule fois sur le chemin timed (preuve structurelle, même méthode que TD-37)', () => {
    const raw = readFileSync(resolve(__dirname, '../simulator/simulationRuntimeIntegration.js'), 'utf-8')
    const executable = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const matches = executable.match(/\bresolveSignals\s*\(/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('HC-44 — ECHO participe réellement à la propagation électrique (LED allumée), via runSimulationWithRuntime réel (aucun mock)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'h1', type: 'HC_SR04', x: 10, y: 0, parameters: { distanceCm: 100 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'h1', toPin: 'VCC' },
      { fromUid: 'h1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 'power1', fromPin: '5V', toUid: 'h1', toPin: 'TRIG' },
      { fromUid: 'h1', fromPin: 'ECHO', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    // Step 1 (dt=0) : TRIG observé HIGH pour la première fois -> front -> ECHO HIGH.
    const orchestrators = new Map()
    const timedDigitalStates = new Map()
    const result = runSimulationWithRuntime(components, wires, { dt: 0, orchestrators, timedDigitalStates })
    expect(result.get('h1:ECHO')).toBe(Signal.HIGH)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
    expect(result.get('led1:cathode')).toBe(Signal.LOW)
  })
})

// ---------------------------------------------------------------------------
// HC-45 à HC-55 : PhysicalContacts, pitch, résolveurs breadboard réels
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-45 à HC-49 : PhysicalContacts VCC(54,92)/TRIG(66,92)/ECHO(78,92)/GND(90,92), pitch 12/12/12', () => {
  const def = getComponentDef('HC_SR04')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('HC-45 — exactement quatre PhysicalContacts, câblables et enfichables', () => {
    for (const id of ['VCC', 'TRIG', 'ECHO', 'GND']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('HC-46 — ordre VCC/TRIG/ECHO/GND conservé', () => {
    expect(resolveContacts(byPin.VCC)[0]).toMatchObject({ id: 'VCC', dx: 54, dy: 92 })
    expect(resolveContacts(byPin.TRIG)[0]).toMatchObject({ id: 'TRIG', dx: 66, dy: 92 })
    expect(resolveContacts(byPin.ECHO)[0]).toMatchObject({ id: 'ECHO', dx: 78, dy: 92 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 90, dy: 92 })
  })

  it('HC-47/HC-48/HC-49 — Δ1=Δ2=Δ3=12=1×BREADBOARD_PITCH exact, même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [vcc, trig, echo, gnd] = ['VCC', 'TRIG', 'ECHO', 'GND'].map((id) => resolveContacts(byPin[id])[0])
    expect(trig.dx - vcc.dx).toBe(12)
    expect(echo.dx - trig.dx).toBe(12)
    expect(gnd.dx - echo.dx).toBe(12)
    expect(trig.dy).toBe(vcc.dy)
    expect(echo.dy).toBe(vcc.dy)
    expect(gnd.dy).toBe(vcc.dy)
  })
})

describe('A7-C5 — HC-50 à HC-53 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('HC_SR04')
  // Origine (-4,16) : trouvée par computeBreadboardPlacement (adapter réel,
  // recherche ±48px) à partir du candidat (0,16) — les dx (54/66/78/90) ne
  // sont PAS des multiples exacts de 12 (racines raster réelles ≈7.1 px de
  // pas, §3/§4 du ticket : fan-out obligatoire), donc position.x=0 seul ne
  // suffit pas (contrairement à PIR_MOTION_SENSOR dont les dx sont déjà des
  // multiples de 12) — la RECHERCHE de l'adapter le prouve, exactement comme
  // TILT_SENSOR/IR_RECEIVER. Preuve qu'AU MOINS une classe d'origines
  // valides existe.
  const origin = { x: -4, y: 16 }

  it('HC-50 — resolveComponentContactHoles : 4 trous DISTINCTS, même rangée, colonnes successives', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(4)
    expect(allResolved).toBe(true)
    const [vccR, trigR, echoR, gndR] = results
    for (const r of [vccR, trigR, echoR, gndR]) expect(r.hole).not.toBeNull()
    const rows = new Set([vccR.hole.row, trigR.hole.row, echoR.hole.row, gndR.hole.row])
    expect(rows.size).toBe(1)
    const columns = [vccR.hole.column, trigR.hole.column, echoR.hole.column, gndR.hole.column]
    expect(new Set(columns).size).toBe(4)
    expect(columns).toEqual([columns[0], columns[0] + 1, columns[0] + 2, columns[0] + 3])
    expect(vccR.hole).toEqual(holeAt(breadboard, origin.x + 54, origin.y + 92))
    expect(trigR.hole).toEqual(holeAt(breadboard, origin.x + 66, origin.y + 92))
    expect(echoR.hole).toEqual(holeAt(breadboard, origin.x + 78, origin.y + 92))
    expect(gndR.hole).toEqual(holeAt(breadboard, origin.x + 90, origin.y + 92))
  })

  it('HC-51 — computeBreadboardPlacement (adapter réel) : composant compatible, 4 trous distincts, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'HC_SR04', { x: 0, y: 16 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(4)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(4)
    expect(result.valid).toBe(true)
  })

  it('HC-52/HC-53 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, target = PhysicalContact exact', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'HC_SR04', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(4)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['VCC', 'TRIG', 'ECHO', 'GND']))
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.VCC.target).toEqual({ x: origin.x + 54, y: origin.y + 92 })
    expect(byPinId.TRIG.target).toEqual({ x: origin.x + 66, y: origin.y + 92 })
    expect(byPinId.ECHO.target).toEqual({ x: origin.x + 78, y: origin.y + 92 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 90, y: origin.y + 92 })
  })
})

describe('A7-C5 — HC-54/HC-55 : AssemblyProfile, racines mesurées par pixel-probe réel, aucun croisement', () => {
  it('HC-54 — through-hole, 4 leads, racines mesurées (alpha-pondérées, System.Drawing), aucun bodyClip', () => {
    const profile = getAssemblyProfile('HC_SR04')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['ECHO', 'GND', 'TRIG', 'VCC'])
    // Racines mesurées : centroïdes alpha-pondérés (System.Drawing, seuil
    // alpha>=32) sur le segment vertical stable de chaque patte (y∈[68,87]) :
    // VCC (60.077,77.232)->(60,77), TRIG (67.194,77.331)->(67,77),
    // ECHO (74.288,77.253)->(74,77), GND (81.402,77.187)->(81,77).
    expect(profile.leads.VCC.root).toEqual({ dx: 60, dy: 77 })
    expect(profile.leads.TRIG.root).toEqual({ dx: 67, dy: 77 })
    expect(profile.leads.ECHO.root).toEqual({ dx: 74, dy: 77 })
    expect(profile.leads.GND.root).toEqual({ dx: 81, dy: 77 })
    const def = getComponentDef('HC_SR04')
    for (const id of ['VCC', 'TRIG', 'ECHO', 'GND']) {
      // A7-C5-R2 — correction Founder (post-A7-C5-R1 STOP S3) : metallic-wire
      // (nickelé/brillant) remplacé par dark-wire (trait unique sombre,
      // AssemblyLeadsLayer.css) ; racines/PhysicalContacts/pitch/bodyClip
      // strictement inchangés, voir assemblyLeadsDarkWireR2.test.js pour la
      // preuve dédiée de la primitive.
      expect(profile.leads[id].style).toBe('dark-wire')
      const contact = resolveContacts(byPinOf(def, id))[0]
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy) // racine AU-DESSUS du contact (leçon A7-C4-TILT-R1)
    }
    expect(profile.bodyClip).toBeUndefined()
  })

  it('HC-55 — aucun lead croisé (ordre x des racines = ordre x des targets = ordre x des holes)', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'HC_SR04', x: -4, y: 16 }, breadboard)
    const order = ['VCC', 'TRIG', 'ECHO', 'GND']
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    const rootXs = order.map((id) => byPinId[id].root.x)
    const targetXs = order.map((id) => byPinId[id].target.x)
    expect(rootXs).toEqual([...rootXs].sort((a, b) => a - b))
    expect(targetXs).toEqual([...targetXs].sort((a, b) => a - b))
  })
})

// ---------------------------------------------------------------------------
// HC-56 à HC-62 : assets réels sur disque, byte-for-byte, manifest cohérent
// ---------------------------------------------------------------------------
describe('A7-C5 — HC-56 à HC-62 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder Pass)', () => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['hc-sr04.default.1x.png', 'hc-sr04.default.1x.webp', 'hc-sr04.default.3x.png', 'hc-sr04.default.3x.webp']) {
      expect(existsSync(resolve(HC_DIR, f)), f).toBe(true)
    }
  })

  it('HC-56/HC-57 — dimensions réelles des PNG livrés : 1x = 144×96, 3x = 432×288 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(HC_DIR, 'hc-sr04.default.1x.png')))
    const three = pngDims(readFileSync(resolve(HC_DIR, 'hc-sr04.default.3x.png')))
    expect([one.w, one.h]).toEqual([144, 96])
    expect([three.w, three.h]).toEqual([432, 288])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, ordre des pins visibles)', () => {
    const m = JSON.parse(readFileSync(resolve(HC_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('HC_SR04')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 96])
    expect(m.visiblePinOrder).toEqual(['VCC', 'TRIG', 'ECHO', 'GND'])
  })

  it('HC-58 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(HC_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(HC_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(HC_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(HC_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })

  it('HC-59 — renderer raster enregistré (HcSr04Part)', () => {
    expect(getComponentByType('HC_SR04')).not.toBeNull()
    expect(getComponentByType('HC_SR04').name).toBe('HcSr04Part')
  })

  it('HC-60 — visualContract (SCALE_REFERENCE) enregistré', () => {
    expect(SCALE_REFERENCE.find((e) => e.type === 'HC_SR04')).toBeTruthy()
  })

  it('HC-61/HC-62 — HcSr04Part.jsx ne dessine aucun SVG physique ni CSS/DOM du corps (uniquement <picture>/<img> raster)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/HcSr04Part.jsx'), 'utf-8')
    expect(src).not.toMatch(/<svg/)
    expect(src).not.toMatch(/<rect|<circle|<line|<path|<ellipse|<polygon/)
    expect(src).toMatch(/<picture/)
    expect(src).toMatch(/<img/)
  })
})

// ---------------------------------------------------------------------------
// Coexistence Scheduler partagé (sans/avec Arduino) + GATE 0
// ---------------------------------------------------------------------------
describe('A7-C5 — coexistence Arduino (Scheduler partagé) et fonctionnement sans Arduino', () => {
  it('un HC_SR04 fonctionne SANS aucun ARDUINO (Scheduler générique seul, aucun orchestrator créé)', () => {
    // Non câblé (aucune source DC) : garde d'alimentation non satisfaite ->
    // aucune contribution -> ECHO reste UNKNOWN (résolution réelle, jamais un
    // LOW inventé, §19 du ticket). Ce test prouve l'absence de Scheduler/
    // Arduino inutile, pas le comportement alimenté (voir HC-44 pour la
    // propagation réelle alimentée).
    const sensor = { uid: 'h1', type: 'HC_SR04', x: 0, y: 0, parameters: { distanceCm: 100 } }
    const orchestrators = new Map()
    const result = runSimulationWithRuntime([sensor], [], { dt: 0, orchestrators })
    expect(orchestrators.size).toBe(0)
    expect(result.get('h1:ECHO')).toBe(Signal.UNKNOWN)
  })

  it('HC_SR04 + ARDUINO partagent exactement le même Scheduler/currentTimeMs pour un step partagé', () => {
    const seenTimes = []
    const registry = {
      hasTimedDigitalContribution: (type) => type === 'HC_SR04',
      getTimedDigitalContribution: (type) => type === 'HC_SR04' ? (ctx) => { seenTimes.push(ctx.currentTimeMs); return { state: undefined, outputs: null } } : null,
    }
    const components = [
      { uid: 'ard1', type: 'ARDUINO', x: 0, y: 0 },
      { uid: 'h1', type: 'HC_SR04', x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators, timedDigitalContributionRegistry: registry })
    expect(orchestrators.get('ard1').getCurrentTime()).toBe(16)
    expect(seenTimes).toEqual([16])
  })
})

describe('A7-C5 — GATE 0 : non-régression stricte (dette préexistante non touchée)', () => {
  it('SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR/TILT_SENSOR/IR_RECEIVER inchangés (pins, contributions, réponses)', () => {
    expect(getComponentDef('SOIL_MOISTURE_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'AO', 'DO', 'GND'])
    expect(getComponentDef('PIR_MOTION_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'OUT', 'GND'])
    expect(getComponentDef('TILT_SENSOR').pins.map((p) => p.id)).toEqual(['DO', 'GND'])
    expect(getComponentDef('IR_RECEIVER').pins.map((p) => p.id)).toEqual(['SIGNAL', 'GND', 'VCC'])
    expect(getEnvironmentalResponse('SOIL_MOISTURE_SENSOR').stimulus).toBe('MOISTURE')
    expect(getEnvironmentalResponse('PIR_MOTION_SENSOR').stimulus).toBe('MOTION')
    expect(getEnvironmentalResponse('TILT_SENSOR').stimulus).toBe('TILT')
    expect(getEnvironmentalResponse('IR_RECEIVER').stimulus).toBe('INFRARED')
    for (const type of ['SOIL_MOISTURE_SENSOR', 'PIR_MOTION_SENSOR', 'TILT_SENSOR', 'IR_RECEIVER']) {
      expect(hasTimedDigitalContribution(type)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Modèle exécutable (validation)
// ---------------------------------------------------------------------------
describe('A7-C5 — HcSr04Model : validation continue [2,400]', () => {
  it('valeurs par défaut valides', () => {
    const defaults = getSimulationDefaultParameters('HC_SR04')
    expect(defaults).toEqual({ distanceCm: 100 })
    expect(HcSr04Model.type).toBe('HC_SR04')
    expect(HcSr04Model.validate(defaults)).toBe(true)
  })

  it('rejette toute valeur hors [2,400] (NaN, Infinity, ou paramètre manquant)', () => {
    expect(HcSr04Model.validate({ distanceCm: 2 })).toBe(true)
    expect(HcSr04Model.validate({ distanceCm: 400 })).toBe(true)
    expect(HcSr04Model.validate({ distanceCm: 1.999 })).toBe(false)
    expect(HcSr04Model.validate({ distanceCm: 400.001 })).toBe(false)
    expect(HcSr04Model.validate({ distanceCm: NaN })).toBe(false)
    expect(HcSr04Model.validate({ distanceCm: Infinity })).toBe(false)
    expect(HcSr04Model.validate({})).toBe(false)
    expect(HcSr04Model.validate(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Mécanismes génériques
// ---------------------------------------------------------------------------
describe('A7-C5 — createComponent / round-trip générique, aucun code spécifique', () => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent('HC_SR04', 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe('HC_SR04')
    expect(created.pins.map((p) => p.id)).toEqual(['VCC', 'TRIG', 'ECHO', 'GND'])
    expect(created.uid).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// §16/§17-style : aucune branche HC_SR04 dans les couches génériques
// ---------------------------------------------------------------------------
describe('A7-C5 — aucune branche HC_SR04 dans les couches génériques, fichiers protégés intacts', () => {
  it('le littéral "HC_SR04" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
      '../simulator/simulationRuntimeIntegration.js',
      '../simulator/preparation.js',
      '../simulator/engine.js',
      '../simulator/environmentalStimulus.js',
      '../simulator/clock.js',
      '../simulator/scheduler.js',
      '../simulator/runtimeOrchestrator.js',
      '../utils/breadboardGeometry.js',
      '../utils/breadboardPlacementAdapter.js',
      '../utils/breadboardConnectivity.js',
      '../canvas/Breadboard.jsx',
      '../canvas/CircuitComponent.jsx',
      '../canvas/SimulationCanvas.jsx',
      '../components/assembly/AssemblyLeadsLayer.jsx',
      '../components/parts/PartRenderer.jsx',
    ]
    for (const rel of files) {
      const full = resolve(__dirname, rel)
      if (!existsSync(full)) continue
      const src = readFileSync(full, 'utf-8')
      expect(src, rel).not.toMatch(/HC_SR04/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']HC_SR04["']/)
    }
  })
})

// ---------------------------------------------------------------------------
// Preuve directe : computeTimedDigitalSignals avec le Registry de production
// ---------------------------------------------------------------------------
describe('A7-C5 — computeTimedDigitalSignals avec le Registry de production (pas un fixture)', () => {
  it('produit "h1:ECHO" via le Scheduler générique, sans Arduino, state persistant entre deux appels', () => {
    const registry = { hasTimedDigitalContribution, getTimedDigitalContribution }
    const scheduler = createScheduler()
    const states = new Map()
    const sensor = { uid: 'h1', type: 'HC_SR04', parameters: { distanceCm: 100 } }

    scheduler.advance(0)
    let produced = computeTimedDigitalSignals([sensor], registry, new Map([['h1:VCC', Signal.HIGH], ['h1:GND', Signal.LOW], ['h1:TRIG', Signal.LOW]]), scheduler.getCurrentTime(), states)
    expect(produced.get('h1:ECHO')).toBe(Signal.LOW)

    scheduler.advance(1)
    produced = computeTimedDigitalSignals([sensor], registry, new Map([['h1:VCC', Signal.HIGH], ['h1:GND', Signal.LOW], ['h1:TRIG', Signal.HIGH]]), scheduler.getCurrentTime(), states)
    expect(produced.get('h1:ECHO')).toBe(Signal.HIGH)
    expect(states.get('h1').phase).toBe('MEASURING')
  })
})

// ---------------------------------------------------------------------------
// Full suite d'exécution (targeted) : résolution du fichier resolution.js
// utilisée pour prouver l'absence de garde d'alimentation inventée (aucun
// second resolve, résolution réelle prepareCircuit+resolveSignals).
// ---------------------------------------------------------------------------
describe('A7-C5 — résolution réelle sans Arduino (prepareCircuit + resolveSignals directs)', () => {
  it('circuit HC_SR04 seul, sans wires : toutes les pins résolvent UNKNOWN (aucun fallback inventé)', () => {
    const sensor = { uid: 'h1', type: 'HC_SR04', x: 0, y: 0 }
    const prepared = prepareCircuit([sensor], [])
    const { pinSignals } = resolveSignals([sensor], prepared)
    expect(pinSignals.get('h1:VCC')).toBe(Signal.UNKNOWN)
    expect(pinSignals.get('h1:TRIG')).toBe(Signal.UNKNOWN)
    expect(pinSignals.get('h1:GND')).toBe(Signal.UNKNOWN)
  })
})
