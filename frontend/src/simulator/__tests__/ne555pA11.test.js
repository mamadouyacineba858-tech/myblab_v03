import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { COMPONENT_TYPES, createComponent } from '../../config/componentDefinitions.js'
import { getSimulationModel, isSimulationModelAvailable } from '../simulationRegistry.js'
import {
  getMixedSignalContribution,
  getAllMixedSignalContributionTypes,
  ne555pTimer,
} from '../mixedSignalContributionRegistry.js'
import {
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  runSimulationStep,
  circuitRequiresContinuousStepping,
} from '../simulationRuntimeIntegration.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP4 â€” TI NE555P Level-1 model (T01..T30) and architecture guards (T31..T38).
 * Unit cases drive the REAL production registry entry with isolated sample contexts ;
 * the real-circuit gates live in ne555pA11Circuits.test.js.
 */
const TYPE = 'NE555P'
const PINOUT = ['GND', 'TRIG', 'OUT', 'RESET', 'CONT', 'THRES', 'DISCH', 'VCC']
const here = dirname(fileURLToPath(import.meta.url))
const source = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const GROUND_NET = 'bat:minus'
const fact = (voltage, reference = GROUND_NET) => ({ voltage, reference })
const asFact = (value) => (value === null || typeof value === 'object' ? value : fact(value))
/** Sample context of the production entry : VCC 9 V (nominal trigger 3 V, threshold 6 V), RESET released. */
function sample(options = {}) {
  const { gnd = 0, trig, thres, cont, previous } = options
  // Explicit undefined is meaningful here (absent VCC fact, undefined RESET signal) : no default parameters.
  const vcc = 'vcc' in options ? options.vcc : 9
  const reset = 'reset' in options ? options.reset : Signal.HIGH
  const pinVoltages = { GND: fact(gnd) }
  if (vcc !== undefined) pinVoltages.VCC = asFact(vcc)
  if (trig !== undefined) pinVoltages.TRIG = asFact(trig)
  if (thres !== undefined) pinVoltages.THRES = asFact(thres)
  if (cont !== undefined) pinVoltages.CONT = asFact(cont)
  return {
    component: { uid: 'u', type: TYPE },
    params: {},
    pinSignals: { GND: Signal.LOW, VCC: Signal.HIGH, RESET: reset, TRIG: Signal.UNKNOWN, THRES: Signal.UNKNOWN, CONT: Signal.UNKNOWN, OUT: Signal.UNKNOWN, DISCH: Signal.UNKNOWN },
    pinVoltages,
    dt: 10,
    currentTimeMs: 10,
    previousState: previous === undefined ? undefined : Object.freeze({ latch: previous }),
  }
}
const step = (options) => ne555pTimer.contribute(sample(options))
const latch = (options) => step(options).state.latch

const SET_EFFECTS = { digitalOutputs: { OUT: Signal.HIGH } }
const RESET_EFFECTS = { digitalOutputs: { OUT: Signal.LOW }, conductionPairs: [['DISCH', 'GND']] }

describe('A11-COMP4 NE555P â€” identity and registration (T01..T04)', () => {
  it('T01 registration exists in the canonical, catalogue, simulation and mixed-signal registries', () => {
    expect(getAllCanonicalTypes()).toContain(TYPE)
    expect(getSimulationModel(TYPE)?.type).toBe(TYPE)
    expect(getSimulationModel(TYPE).validate({})).toBe(true)
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    // A11-COMP5 : NE556N joins the production table (same channel law, see ne556nA11.test.js).
    expect(getAllMixedSignalContributionTypes()).toEqual([TYPE, 'NE556N'])
    const entry = getMixedSignalContribution(TYPE)
    expect(entry.contribute).toBe(ne555pTimer.contribute)
    expect(entry.digitalOutputPins).toEqual(['OUT'])
    expect(entry.voltageOutputPins).toEqual([])
    expect(entry.voltageReferencePin).toBeNull()
    expect(circuitRequiresContinuousStepping([{ uid: 'u', type: TYPE }])).toBe(true)
  })

  it('T02 canonical identity NE555P (Texas Instruments), no alias type, no parameter', () => {
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'], parameterSchema: [], defaultParameters: {} })
    expect(COMPONENT_TYPES[TYPE]).toMatchObject({ id: TYPE, manufacturer: 'Texas Instruments', label: 'NE555 Precision Timer', width: 84, height: 64 })
    for (const alias of ['555', 'TIMER555', 'TIMER_555', 'GENERIC_555', 'NE555', 'LM555', 'NA555']) {
      expect(getCanonicalEntry(alias), alias).toBeFalsy()
      expect(COMPONENT_TYPES[alias], alias).toBeUndefined()
    }
  })

  it('T03 exactly 8 canonical pins', () => {
    expect(getCanonicalEntry(TYPE).pins).toHaveLength(8)
    expect(COMPONENT_TYPES[TYPE].pins).toHaveLength(8)
    expect(new Set(getCanonicalEntry(TYPE).pins.map((pin) => pin.id)).size).toBe(8)
  })

  it('T04 exact TI pin numbering 1 GND .. 8 VCC (canonical, catalogue and created component)', () => {
    expect(getCanonicalEntry(TYPE).pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(COMPONENT_TYPES[TYPE].pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(createComponent(TYPE, 0, 0).pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(getCanonicalEntry(TYPE).pins.map((pin) => pin.role)).toEqual(['ground', 'input', 'output', 'input', 'passive', 'input', 'output', 'power'])
  })
})

describe('A11-COMP4 NE555P â€” latch, priorities and boundaries (T07..T20)', () => {
  it('T07 initial latch RESET (previousState undefined), even when powered with no comparator request', () => {
    expect(step({})).toEqual({ state: { latch: 'RESET' }, effects: RESET_EFFECTS })
    expect(step({ trig: 4, thres: 5 })).toEqual({ state: { latch: 'RESET' }, effects: RESET_EFFECTS })
  })

  it('T08 SET persists under HOLD / T09 RESET persists under HOLD', () => {
    expect(step({ trig: 4, thres: 5, previous: 'SET' })).toEqual({ state: { latch: 'SET' }, effects: SET_EFFECTS })
    expect(step({ trig: 4, thres: 5, previous: 'RESET' })).toEqual({ state: { latch: 'RESET' }, effects: RESET_EFFECTS })
  })

  it('T10 RESET asserted (LOW or UNKNOWN) wins over a TRIG SET request / T11 release restores evaluation', () => {
    for (const reset of [Signal.LOW, Signal.UNKNOWN, undefined]) {
      expect(step({ reset, trig: 1, previous: 'SET' }), String(reset)).toEqual({ state: { latch: 'RESET' }, effects: RESET_EFFECTS })
    }
    expect(latch({ reset: Signal.LOW })).toBe('RESET')
    expect(latch({ reset: Signal.HIGH, trig: 1 })).toBe('SET')
    expect(latch({ reset: Signal.HIGH, thres: 8, previous: 'SET' })).toBe('RESET')
  })

  it('T12 TRIG below the trigger level SETs / T13 TRIG equality does not SET', () => {
    expect(latch({ trig: 3 - 1e-9 })).toBe('SET')
    expect(latch({ trig: 0 })).toBe('SET')
    expect(latch({ trig: 3 })).toBe('RESET')
    expect(latch({ trig: 3 + 1e-9 })).toBe('RESET')
  })

  it('T14 THRES above the threshold level RESETs / T15 THRES equality does not RESET', () => {
    expect(latch({ thres: 6 + 1e-9, previous: 'SET' })).toBe('RESET')
    expect(latch({ thres: 9, previous: 'SET' })).toBe('RESET')
    expect(latch({ thres: 6, previous: 'SET' })).toBe('SET')
    expect(latch({ thres: 6 - 1e-9, previous: 'SET' })).toBe('SET')
  })

  it('T16 simultaneous TRIG < trigger and THRES > threshold => SET (TRIG priority), whatever the previous latch', () => {
    for (const previous of [undefined, 'RESET', 'SET']) {
      expect(step({ trig: 1, thres: 8, previous }), String(previous)).toEqual({ state: { latch: 'SET' }, effects: SET_EFFECTS })
    }
  })

  it('T17 RESET asserted + TRIG + THRES => RESET', () => {
    expect(step({ reset: Signal.LOW, trig: 1, thres: 8, previous: 'SET' })).toEqual({ state: { latch: 'RESET' }, effects: RESET_EFFECTS })
  })

  it('T18 TRIG valid / THRES absent works ; T19 THRES valid / TRIG absent works', () => {
    expect(latch({ trig: 1 })).toBe('SET')
    expect(latch({ trig: 1, thres: null })).toBe('SET')
    expect(latch({ thres: 7, previous: 'SET' })).toBe('RESET')
    expect(latch({ trig: null, thres: 7, previous: 'SET' })).toBe('RESET')
    expect(latch({ trig: fact(1, 'foreign'), thres: 7, previous: 'SET' })).toBe('RESET')
  })

  it('T20 both analog observations absent (or unresolved) => HOLD ; RESET still wins', () => {
    expect(latch({ previous: 'SET' })).toBe('SET')
    expect(latch({ previous: 'RESET' })).toBe('RESET')
    expect(latch({ trig: null, thres: null, previous: 'SET' })).toBe('SET')
    expect(latch({ reset: Signal.LOW, previous: 'SET' })).toBe('RESET')
  })

  it('comparator levels are relative to GND (numeric facts only, never a logical level)', () => {
    // GND fact at 1 V, VCC at 10 V : supply 9 V, trigger 3 V above GND.
    expect(latch({ gnd: 1, vcc: 10, trig: 3.9 })).toBe('SET')
    expect(latch({ gnd: 1, vcc: 10, trig: 4 })).toBe('RESET')
    expect(latch({ gnd: 1, vcc: 10, thres: 7.01, previous: 'SET' })).toBe('RESET')
    // A 5 V supply scales the nominal levels (5/3 V and 10/3 V).
    expect(latch({ vcc: 5, trig: 1.6 })).toBe('SET')
    expect(latch({ vcc: 5, trig: 1.7 })).toBe('RESET')
    expect(latch({ vcc: 5, thres: 3.4, previous: 'SET' })).toBe('RESET')
  })
})

describe('A11-COMP4 NE555P â€” CONT (T21..T23)', () => {
  it('T21 CONT absent => nominal levels VCC/3 and 2VCC/3', () => {
    expect(latch({ trig: 2.99 })).toBe('SET')
    expect(latch({ trig: 3 })).toBe('RESET')
    expect(latch({ thres: 6.01, previous: 'SET' })).toBe('RESET')
    expect(latch({ thres: 6, previous: 'SET' })).toBe('SET')
  })

  it('T22 CONT valid => threshold = V(CONT), trigger = V(CONT)/2 (boundaries included)', () => {
    // CONT = 4 V : threshold 4 V, trigger 2 V (nominal would be 6 V / 3 V).
    expect(latch({ cont: 4, trig: 2.5 })).toBe('RESET')
    expect(latch({ cont: 4, trig: 2 })).toBe('RESET')
    expect(latch({ cont: 4, trig: 1.99 })).toBe('SET')
    expect(latch({ cont: 4, thres: 4.5, previous: 'SET' })).toBe('RESET')
    expect(latch({ cont: 4, thres: 4, previous: 'SET' })).toBe('SET')
    // CONT = 8 V : threshold 8 V, trigger 4 V.
    expect(latch({ cont: 8, trig: 3.5 })).toBe('SET')
    expect(latch({ cont: 8, thres: 7, previous: 'SET' })).toBe('SET')
    // Relative to GND.
    expect(latch({ gnd: 1, vcc: 10, cont: 5, trig: 2.9 })).toBe('SET')
  })

  it('T23 CONT null / foreign reference => unresolved levels, no nominal fallback (ABSENT != CONFLICT)', () => {
    for (const cont of [null, fact(4, 'another-net'), fact(Number.NaN)]) {
      expect(latch({ cont, trig: 1 }), JSON.stringify(cont)).toBe('RESET')
      expect(latch({ cont, trig: 1, previous: 'SET' })).toBe('SET')
      expect(latch({ cont, thres: 8, previous: 'SET' })).toBe('SET')
      // RESET keeps its priority even when the levels are unresolved.
      expect(latch({ cont, reset: Signal.LOW, previous: 'SET' })).toBe('RESET')
    }
    // Same inputs with CONT absent do act.
    expect(latch({ trig: 1 })).toBe('SET')
    expect(latch({ thres: 8, previous: 'SET' })).toBe('RESET')
  })
})

describe('A11-COMP4 NE555P â€” OUT / DISCH effects (T24..T28)', () => {
  const cases = [{}, { trig: 1 }, { thres: 8, previous: 'SET' }, { previous: 'SET' }, { reset: Signal.LOW }, { trig: 1, thres: 8 }]

  it('T24/T25 OUT HIGH iff SET, OUT LOW iff RESET ; T26/T27 DISCH-GND conduction iff RESET, open iff SET', () => {
    for (const options of cases) {
      const { state, effects } = step(options)
      expect(effects.digitalOutputs.OUT).toBe(state.latch === 'SET' ? Signal.HIGH : Signal.LOW)
      expect(effects.conductionPairs ?? []).toEqual(state.latch === 'RESET' ? [['DISCH', 'GND']] : [])
    }
  })

  it('T28 DISCH is never a digital output (no DISCH digital LOW), no voltage output', () => {
    for (const options of cases) {
      const { effects } = step(options)
      expect(Object.keys(effects.digitalOutputs)).toEqual(['OUT'])
      expect(effects.voltageOutputs).toBeUndefined()
    }
    expect(ne555pTimer.digitalOutputPins).toEqual(['OUT'])
    expect(ne555pTimer.voltageOutputPins).toBeUndefined()
  })

  it('supply domain : VCC must be a numeric fact of the GND reference within 4.5 V .. 16 V, else no effect', () => {
    const unpowered = { state: { latch: 'RESET' }, effects: {} }
    for (const vcc of [undefined, null, 0, 4.49, 16.01, fact(9, 'foreign')]) {
      expect(step({ vcc, trig: 1, previous: 'SET' }), JSON.stringify(vcc)).toEqual(unpowered)
    }
    // A logical HIGH on VCC is never turned into an analog supply.
    const noNumericVcc = sample({ vcc: undefined, trig: 1 })
    expect(noNumericVcc.pinSignals.VCC).toBe(Signal.HIGH)
    expect(ne555pTimer.contribute(noNumericVcc)).toEqual(unpowered)
    const noGround = sample({ trig: 1 })
    delete noGround.pinVoltages.GND
    expect(ne555pTimer.contribute(noGround)).toEqual(unpowered)
    for (const vcc of [4.5, 16]) expect(latch({ vcc, trig: 0.1 }), String(vcc)).toBe('SET')
  })

  it('the contributor is pure : frozen previous state and context are never mutated', () => {
    const ctx = sample({ trig: 1, previous: 'RESET' })
    const snapshot = JSON.stringify(ctx)
    const first = ne555pTimer.contribute(ctx)
    expect(JSON.stringify(ctx)).toBe(snapshot)
    expect(ne555pTimer.contribute(ctx)).toEqual(first)
  })
})

describe('A11-COMP4 NE555P â€” runtime state lifecycle (T29, T30)', () => {
  const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
  /** VCC/RESET on 9 V ; TRIG tied to GND through a wire : SET from the first SAMPLE. */
  const circuit = () => ({
    components: [{ uid: 'bat', type: 'BATTERY_9V', parameters: { voltage: 9 } }, { uid: 'u', type: TYPE, parameters: {} }],
    wires: [wire('bat', 'plus', 'u', 'VCC'), wire('bat', 'plus', 'u', 'RESET'), wire('bat', 'minus', 'u', 'GND'), wire('u', 'GND', 'u', 'TRIG')],
  })

  it('T29 a runtime reset discards the dynamic latch (fresh start-up convention)', () => {
    const session = createSimulationRuntimeSession()
    const c = circuit()
    runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
    expect(session.mixedSignalStates.get('u')).toEqual({ latch: 'SET' })
    expect(Object.isFrozen(session.mixedSignalStates.get('u'))).toBe(true)
    resetSimulationRuntimeSession(session)
    expect(session.mixedSignalStates.has('u')).toBe(false)
    // Released TRIG after the reset : HOLD from the start-up convention -> RESET.
    const released = { components: c.components, wires: c.wires.slice(0, 3) }
    runSimulationStep(released.components, released.wires, { dt: 10, runtimeSession: session })
    expect(session.mixedSignalStates.get('u')).toEqual({ latch: 'RESET' })
  })

  it('T30 the Document never persists the latch (no latch / timer field, component unchanged)', () => {
    const c = circuit()
    const before = JSON.stringify(c)
    const session = createSimulationRuntimeSession()
    for (let i = 0; i < 3; i++) runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
    expect(JSON.stringify(c)).toBe(before)
    expect(before).not.toMatch(/latch|timerState|elapsedTime|phase|deadline|internalCapacitor/i)
    const created = createComponent(TYPE, 10, 20)
    expect(JSON.stringify(created)).not.toMatch(/latch|timerState|elapsedTime|phase|deadline|internalCapacitor/i)
    expect(created).not.toHaveProperty('state')
  })
})

describe('A11-COMP4 NE555P â€” architecture guards (T31..T38)', () => {
  const NE555P_LITERAL = /NE555|Ne555|ne555/

  it('T31/T32/T33 no NE555P branch in the runtime, resolution, PREQ4/PREQ5 engines or other generic core', () => {
    for (const name of ['simulationRuntimeIntegration.js', 'resolution.js', 'resistiveDriveContext.js', 'transientVoltageFactBridge.js',
      'transientContributionRegistry.js', 'preparation.js', 'scheduler.js', 'clock.js', 'engine.js', 'controlledAnalogFeedbackSolver.js', 'dcContributionRegistry.js']) {
      expect(source(name), name).not.toMatch(NE555P_LITERAL)
    }
    for (const name of ['simulationRuntimeIntegration.js', 'resolution.js', 'resistiveDriveContext.js', 'transientVoltageFactBridge.js']) {
      expect(executable(source(name)), name).not.toMatch(/\bTRIG\b|\bTHRES\b|\bDISCH\b|\bCONT\b/)
    }
  })

  it('T34/T35/T36 ONE resolution call site, ONE Scheduler factory call, no Clock in the mixed-signal registry', () => {
    const integration = executable(source('simulationRuntimeIntegration.js'))
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
    expect(integration.match(/\bcreateScheduler\s*\(/g)).toHaveLength(1)
    const registry = executable(source('mixedSignalContributionRegistry.js'))
    expect(registry).not.toMatch(/resolveSignals|resolveElectricalSignals|prepareCircuit|Scheduler|createClock|clock\.js|advance\s*\(/)
  })

  it('T37 no wall-clock API ; T38 no timer counter, deadline, period, frequency, phase or internal capacitor', () => {
    const registry = executable(source('mixedSignalContributionRegistry.js'))
    for (const pattern of [/Date\.now/, /performance\.now/, /\bsetTimeout\b/, /\bsetInterval\b/, /requestAnimationFrame/]) {
      expect(registry, String(pattern)).not.toMatch(pattern)
    }
    const law = executable(registry.slice(registry.indexOf('const BIPOLAR_TIMER_SUPPLY_MIN_VOLTS'), registry.indexOf('const defaultRegistry')))
    expect(law.length).toBeGreaterThan(0)
    expect(law).not.toMatch(/timerCounter|elapsed|deadline|period|frequency|phase|internalCapacitor|oscillator|capacitance|resistance|\btau\b|currentTimeMs|\bdt\b/i)
    // The state holds the latch only.
    expect(Object.keys(step({ trig: 1 }).state)).toEqual(['latch'])
    expect(Object.keys(step({ vcc: undefined }).state)).toEqual(['latch'])
  })
})
