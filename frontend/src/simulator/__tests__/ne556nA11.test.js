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
  ne556nTimer,
} from '../mixedSignalContributionRegistry.js'
import {
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  runSimulationStep,
  circuitRequiresContinuousStepping,
} from '../simulationRuntimeIntegration.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP5 — TI NE556N Level-1 model (T01..T47), architecture guards (T48..T54) and the
 * common NE555P / NE556N channel-law regression (one law, two production entry points).
 * Unit cases drive the REAL production registry entries with isolated sample contexts ;
 * the real-circuit gates live in ne556nA11Circuits.test.js.
 */
const TYPE = 'NE556N'
const PINOUT = ['1DISCH', '1THRES', '1CONT', '1RESET', '1OUT', '1TRIG', 'GND', '2TRIG', '2OUT', '2RESET', '2CONT', '2THRES', '2DISCH', 'VCC']
const ROLES = ['output', 'input', 'passive', 'input', 'output', 'input', 'ground', 'input', 'output', 'input', 'passive', 'input', 'output', 'power']
const CHANNEL_PINS = {
  timer1: { reset: '1RESET', cont: '1CONT', trig: '1TRIG', thres: '1THRES', out: '1OUT', disch: '1DISCH' },
  timer2: { reset: '2RESET', cont: '2CONT', trig: '2TRIG', thres: '2THRES', out: '2OUT', disch: '2DISCH' },
}
const here = dirname(fileURLToPath(import.meta.url))
const source = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const GROUND_NET = 'bat:minus'
const fact = (voltage, reference = GROUND_NET) => ({ voltage, reference })
const asFact = (value) => (value === null || typeof value === 'object' ? value : fact(value))

/**
 * Sample context of the NE556N production entry : common VCC 9 V (nominal trigger 3 V,
 * threshold 6 V), both RESETs released. `t1` / `t2` = { reset?, trig?, thres?, cont? } of
 * each channel ; `previous` = [timer1 latch, timer2 latch].
 */
function sample556(options = {}) {
  const { gnd = 0, t1 = {}, t2 = {}, previous } = options
  const vcc = 'vcc' in options ? options.vcc : 9
  const pinVoltages = { GND: fact(gnd) }
  if (vcc !== undefined) pinVoltages.VCC = asFact(vcc)
  const pinSignals = Object.fromEntries(PINOUT.map((pin) => [pin, Signal.UNKNOWN]))
  pinSignals.GND = Signal.LOW
  pinSignals.VCC = Signal.HIGH
  for (const [name, channel] of [['timer1', t1], ['timer2', t2]]) {
    const pins = CHANNEL_PINS[name]
    pinSignals[pins.reset] = 'reset' in channel ? channel.reset : Signal.HIGH
    for (const key of ['trig', 'thres', 'cont']) if (channel[key] !== undefined) pinVoltages[pins[key]] = asFact(channel[key])
  }
  return {
    component: { uid: 'u', type: TYPE },
    params: {},
    pinSignals,
    pinVoltages,
    dt: 10,
    currentTimeMs: 10,
    previousState: previous === undefined ? undefined
      : Object.freeze({ timer1: Object.freeze({ latch: previous[0] }), timer2: Object.freeze({ latch: previous[1] }) }),
  }
}
const step = (options) => ne556nTimer.contribute(sample556(options))
const latches = (options) => {
  const { state } = step(options)
  return [state.timer1.latch, state.timer2.latch]
}
const latch1 = (options) => latches(options)[0]
const latch2 = (options) => latches(options)[1]

/** Same single-channel scenario on NE555P (pins TRIG / THRES / CONT / RESET). */
function sample555({ gnd = 0, ch = {}, previous, ...rest } = {}) {
  const vcc = 'vcc' in rest ? rest.vcc : 9
  const pinVoltages = { GND: fact(gnd) }
  if (vcc !== undefined) pinVoltages.VCC = asFact(vcc)
  if (ch.trig !== undefined) pinVoltages.TRIG = asFact(ch.trig)
  if (ch.thres !== undefined) pinVoltages.THRES = asFact(ch.thres)
  if (ch.cont !== undefined) pinVoltages.CONT = asFact(ch.cont)
  return {
    component: { uid: 'p', type: 'NE555P' },
    params: {},
    pinSignals: { GND: Signal.LOW, VCC: Signal.HIGH, RESET: 'reset' in ch ? ch.reset : Signal.HIGH, TRIG: Signal.UNKNOWN, THRES: Signal.UNKNOWN, CONT: Signal.UNKNOWN, OUT: Signal.UNKNOWN, DISCH: Signal.UNKNOWN },
    pinVoltages,
    dt: 10,
    currentTimeMs: 10,
    previousState: previous === undefined ? undefined : Object.freeze({ latch: previous }),
  }
}

const OUT = (o1, o2) => ({ '1OUT': o1, '2OUT': o2 })
const P1 = ['1DISCH', 'GND']
const P2 = ['2DISCH', 'GND']

describe('A11-COMP5 NE556N — identity and registration (T01..T07)', () => {
  it('T01 identity : canonical, catalogue, simulation and mixed-signal registries', () => {
    expect(getAllCanonicalTypes()).toContain(TYPE)
    expect(getSimulationModel(TYPE)?.type).toBe(TYPE)
    expect(getSimulationModel(TYPE).validate({})).toBe(true)
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    const entry = getMixedSignalContribution(TYPE)
    expect(entry.contribute).toBe(ne556nTimer.contribute)
    expect(entry.digitalOutputPins).toEqual(['1OUT', '2OUT'])
    expect(entry.voltageOutputPins).toEqual([])
    expect(entry.voltageReferencePin).toBeNull()
    expect(circuitRequiresContinuousStepping([{ uid: 'u', type: TYPE }])).toBe(true)
    expect(getCanonicalEntry(TYPE)).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'] })
    expect(COMPONENT_TYPES[TYPE]).toMatchObject({ id: TYPE, label: 'NE556 Dual Precision Timer', width: 120, height: 64 })
  })

  it('T02 manufacturer Texas Instruments ; T03 PDIP-14 = 14 pins in two rows of 7', () => {
    expect(COMPONENT_TYPES[TYPE].manufacturer).toBe('Texas Instruments')
    expect(getCanonicalEntry(TYPE).pins).toHaveLength(14)
    expect(COMPONENT_TYPES[TYPE].pins).toHaveLength(14)
    const rows = COMPONENT_TYPES[TYPE].pins.reduce((acc, pin) => ({ ...acc, [pin.dy]: (acc[pin.dy] ?? 0) + 1 }), {})
    expect(rows).toEqual({ 16: 7, 48: 7 })
  })

  it('T04 exact 14 canonical pins in TI physical order 1..14, with the NE555P per-channel roles', () => {
    expect(getCanonicalEntry(TYPE).pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(COMPONENT_TYPES[TYPE].pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(createComponent(TYPE, 0, 0).pins.map((pin) => pin.id)).toEqual(PINOUT)
    expect(getCanonicalEntry(TYPE).pins.map((pin) => pin.role)).toEqual(ROLES)
    expect(new Set(PINOUT).size).toBe(14)
  })

  it('T05 registry uniqueness : one canonical type, one mixed-signal entry, no per-channel type', () => {
    expect(getAllCanonicalTypes().filter((type) => type === TYPE)).toHaveLength(1)
    expect(getAllMixedSignalContributionTypes()).toEqual(['NE555P', TYPE])
    for (const type of getAllCanonicalTypes()) expect(type).not.toMatch(/556.*(TIMER|CH|_1|_2)|TIMER[12]/)
  })

  it('T06 no alias type ; T07 no arbitrary parameter', () => {
    for (const alias of ['556', 'NE556', 'NE556D', 'LM556', 'NA556', 'TIMER556', 'DUAL_555', 'NE556N_TIMER1', 'NE556N_TIMER2']) {
      expect(getCanonicalEntry(alias), alias).toBeFalsy()
      expect(COMPONENT_TYPES[alias], alias).toBeUndefined()
    }
    expect(getCanonicalEntry(TYPE)).toMatchObject({ parameterSchema: [], defaultParameters: {} })
    expect(createComponent(TYPE, 0, 0).parameters ?? {}).toEqual({})
  })
})

describe('A11-COMP5 NE556N — common supply (T08..T11)', () => {
  const unpowered = { state: { timer1: { latch: 'RESET' }, timer2: { latch: 'RESET' } }, effects: {} }

  it('T08 valid common supply 4.5 V .. 16 V : both channels evaluate', () => {
    for (const vcc of [4.5, 9, 16]) {
      expect(latches({ vcc, t1: { trig: 0.1 }, t2: { trig: 0.1 } }), String(vcc)).toEqual(['SET', 'SET'])
    }
    // GND fact at 1 V : supply = V(VCC) - V(GND).
    expect(latches({ gnd: 1, vcc: 10, t1: { trig: 3.9 }, t2: { trig: 4 } })).toEqual(['SET', 'RESET'])
  })

  it('T09 supply < 4.5 V / T10 supply > 16 V : unpowered, both RESET, no OUT drive, no DISCH conduction', () => {
    for (const vcc of [0, 4.49, 16.01, 24]) {
      expect(step({ vcc, t1: { trig: 1 }, t2: { trig: 1 }, previous: ['SET', 'SET'] }), String(vcc)).toEqual(unpowered)
    }
  })

  it('T11 unresolved supply (absent, null, foreign reference, no ground) : conservative unpowered', () => {
    for (const vcc of [undefined, null, fact(9, 'foreign'), fact(Number.NaN)]) {
      expect(step({ vcc, t1: { trig: 1 }, t2: { trig: 1 }, previous: ['SET', 'SET'] }), JSON.stringify(vcc)).toEqual(unpowered)
    }
    const noGround = sample556({ t1: { trig: 1 }, t2: { trig: 1 } })
    delete noGround.pinVoltages.GND
    expect(ne556nTimer.contribute(noGround)).toEqual(unpowered)
    // A logical HIGH on VCC is never turned into an analog supply.
    const noNumericVcc = sample556({ vcc: undefined, t1: { trig: 1 } })
    expect(noNumericVcc.pinSignals.VCC).toBe(Signal.HIGH)
    expect(ne556nTimer.contribute(noNumericVcc)).toEqual(unpowered)
  })
})

describe('A11-COMP5 NE556N — per-channel latch law (T12..T25)', () => {
  it('T12 timer1 / T13 timer2 initial RESET (previousState undefined), even when powered with no request', () => {
    expect(step({})).toEqual({ state: { timer1: { latch: 'RESET' }, timer2: { latch: 'RESET' } }, effects: { digitalOutputs: OUT(Signal.LOW, Signal.LOW), conductionPairs: [P1, P2] } })
    expect(latches({ t1: { trig: 4, thres: 5 }, t2: { trig: 4, thres: 5 } })).toEqual(['RESET', 'RESET'])
  })

  it('T14 timer1 TRIG < trigger SETs / T18 timer2 TRIG < trigger SETs', () => {
    expect(latch1({ t1: { trig: 3 - 1e-9 } })).toBe('SET')
    expect(latch1({ t1: { trig: 0 } })).toBe('SET')
    expect(latch2({ t2: { trig: 3 - 1e-9 } })).toBe('SET')
    expect(latch2({ t2: { trig: 0 } })).toBe('SET')
  })

  it('T15 timer1 THRES > threshold RESETs / T19 timer2 THRES > threshold RESETs', () => {
    expect(latch1({ t1: { thres: 6 + 1e-9 }, previous: ['SET', 'SET'] })).toBe('RESET')
    expect(latch1({ t1: { thres: 9 }, previous: ['SET', 'SET'] })).toBe('RESET')
    expect(latch2({ t2: { thres: 6 + 1e-9 }, previous: ['SET', 'SET'] })).toBe('RESET')
    expect(latch2({ t2: { thres: 9 }, previous: ['SET', 'SET'] })).toBe('RESET')
  })

  it('T16 timer1 / T20 timer2 RESET priority : LOW and UNKNOWN assert, only HIGH releases', () => {
    for (const reset of [Signal.LOW, Signal.UNKNOWN, undefined]) {
      expect(latch1({ t1: { reset, trig: 1, thres: 8 }, previous: ['SET', 'SET'] }), String(reset)).toBe('RESET')
      expect(latch2({ t2: { reset, trig: 1, thres: 8 }, previous: ['SET', 'SET'] }), String(reset)).toBe('RESET')
    }
    expect(latch1({ t1: { reset: Signal.HIGH, trig: 1 } })).toBe('SET')
    expect(latch2({ t2: { reset: Signal.HIGH, trig: 1 } })).toBe('SET')
    // TRIG has priority over THRES when both request.
    expect(latches({ t1: { trig: 1, thres: 8 }, t2: { trig: 1, thres: 8 }, previous: ['RESET', 'RESET'] })).toEqual(['SET', 'SET'])
  })

  it('T17 timer1 / T21 timer2 equality HOLD (TRIG == trigger does not SET, THRES == threshold does not RESET)', () => {
    for (const previous of [['SET', 'SET'], ['RESET', 'RESET']]) {
      expect(latches({ t1: { trig: 3 }, t2: { trig: 3 }, previous }), String(previous)).toEqual(previous)
      expect(latches({ t1: { thres: 6 }, t2: { thres: 6 }, previous }), String(previous)).toEqual(previous)
      expect(latches({ t1: { trig: 3, thres: 6 }, t2: { trig: 3, thres: 6 }, previous })).toEqual(previous)
    }
    // Both observations absent / unresolved : HOLD.
    expect(latches({ previous: ['SET', 'RESET'] })).toEqual(['SET', 'RESET'])
    expect(latches({ t1: { trig: null, thres: null }, t2: { trig: null, thres: null }, previous: ['RESET', 'SET'] })).toEqual(['RESET', 'SET'])
  })

  it('T22 timer1 / T23 timer2 CONT override : threshold = V(xCONT), trigger = V(xCONT) / 2', () => {
    for (const [name, at] of [['timer1', latch1], ['timer2', latch2]]) {
      const ch = (values) => (name === 'timer1' ? { t1: values } : { t2: values })
      expect(at(ch({ cont: 4, trig: 2.5 })), name).toBe('RESET')
      expect(at(ch({ cont: 4, trig: 2 }))).toBe('RESET')
      expect(at(ch({ cont: 4, trig: 1.99 }))).toBe('SET')
      expect(at({ ...ch({ cont: 4, thres: 4.5 }), previous: ['SET', 'SET'] })).toBe('RESET')
      expect(at({ ...ch({ cont: 4, thres: 4 }), previous: ['SET', 'SET'] })).toBe('SET')
      expect(at(ch({ cont: 8, trig: 3.5 }))).toBe('SET')
      expect(at({ ...ch({ cont: 8, thres: 7 }), previous: ['SET', 'SET'] })).toBe('SET')
      expect(at({ gnd: 1, vcc: 10, ...ch({ cont: 5, trig: 2.9 }) })).toBe('SET')
    }
  })

  it('T24 timer1 / T25 timer2 invalid CONT (null, foreign, NaN) : thresholds unresolved, no nominal fallback', () => {
    for (const cont of [null, fact(4, 'another-net'), fact(Number.NaN)]) {
      expect(latch1({ t1: { cont, trig: 1 } }), JSON.stringify(cont)).toBe('RESET')
      expect(latch1({ t1: { cont, thres: 8 }, previous: ['SET', 'SET'] })).toBe('SET')
      expect(latch1({ t1: { cont, reset: Signal.LOW }, previous: ['SET', 'SET'] })).toBe('RESET')
      expect(latch2({ t2: { cont, trig: 1 } }), JSON.stringify(cont)).toBe('RESET')
      expect(latch2({ t2: { cont, thres: 8 }, previous: ['SET', 'SET'] })).toBe('SET')
      expect(latch2({ t2: { cont, reset: Signal.LOW }, previous: ['SET', 'SET'] })).toBe('RESET')
    }
  })
})

describe('A11-COMP5 NE556N — OUT / DISCH effects (T26..T34)', () => {
  it('T26/T27/T28 timer1 SET -> 1OUT HIGH, 1DISCH open ; RESET -> 1OUT LOW + [1DISCH, GND]', () => {
    const set = step({ t1: { trig: 1 }, t2: { reset: Signal.LOW } })
    expect(set.effects.digitalOutputs['1OUT']).toBe(Signal.HIGH)
    expect(set.effects.conductionPairs).toEqual([P2])
    const reset = step({ t1: { thres: 8 }, t2: { trig: 1 }, previous: ['SET', 'RESET'] })
    expect(reset.effects.digitalOutputs['1OUT']).toBe(Signal.LOW)
    expect(reset.effects.conductionPairs).toEqual([P1])
  })

  it('T29/T30/T31 timer2 SET -> 2OUT HIGH, 2DISCH open ; RESET -> 2OUT LOW + [2DISCH, GND]', () => {
    const set = step({ t2: { trig: 1 }, t1: { reset: Signal.LOW } })
    expect(set.effects.digitalOutputs['2OUT']).toBe(Signal.HIGH)
    expect(set.effects.conductionPairs).toEqual([P1])
    const reset = step({ t2: { thres: 8 }, t1: { trig: 1 }, previous: ['RESET', 'SET'] })
    expect(reset.effects.digitalOutputs['2OUT']).toBe(Signal.LOW)
    expect(reset.effects.conductionPairs).toEqual([P2])
  })

  it('T32 both RESET -> two independent conduction pairs ; both SET -> none', () => {
    expect(step({ previous: ['RESET', 'RESET'] }).effects).toEqual({ digitalOutputs: OUT(Signal.LOW, Signal.LOW), conductionPairs: [P1, P2] })
    expect(step({ t1: { trig: 1 }, t2: { trig: 1 } }).effects).toEqual({ digitalOutputs: OUT(Signal.HIGH, Signal.HIGH) })
    expect(step({ t1: { trig: 1 }, t2: { trig: 1 } }).effects.conductionPairs).toBeUndefined()
  })

  it('T33 timer1 SET / timer2 RESET and T34 timer1 RESET / timer2 SET are valid states', () => {
    expect(step({ t1: { trig: 1 } })).toEqual({
      state: { timer1: { latch: 'SET' }, timer2: { latch: 'RESET' } },
      effects: { digitalOutputs: OUT(Signal.HIGH, Signal.LOW), conductionPairs: [P2] },
    })
    expect(step({ t2: { trig: 1 } })).toEqual({
      state: { timer1: { latch: 'RESET' }, timer2: { latch: 'SET' } },
      effects: { digitalOutputs: OUT(Signal.LOW, Signal.HIGH), conductionPairs: [P1] },
    })
    // Held under HOLD.
    expect(latches({ previous: ['SET', 'RESET'] })).toEqual(['SET', 'RESET'])
    expect(latches({ previous: ['RESET', 'SET'] })).toEqual(['RESET', 'SET'])
  })

  it('DISCH is never a digital output ; no voltage output', () => {
    for (const options of [{}, { t1: { trig: 1 } }, { t2: { trig: 1 } }, { previous: ['SET', 'SET'] }]) {
      const { effects } = step(options)
      expect(Object.keys(effects.digitalOutputs).sort()).toEqual(['1OUT', '2OUT'])
      expect(effects.voltageOutputs).toBeUndefined()
    }
    expect(ne556nTimer.digitalOutputPins).toEqual(['1OUT', '2OUT'])
    expect(ne556nTimer.voltageOutputPins).toBeUndefined()
  })
})

describe('A11-COMP5 NE556N — channel independence hard gate (T35..T40)', () => {
  const PREVIOUS = [['SET', 'SET'], ['SET', 'RESET'], ['RESET', 'SET'], ['RESET', 'RESET']]

  it('T35 1RESET affects timer1 only / T36 2RESET affects timer2 only', () => {
    for (const previous of PREVIOUS) {
      for (const reset of [Signal.LOW, Signal.UNKNOWN]) {
        expect(latches({ t1: { reset }, previous }), `${previous} 1RESET`).toEqual(['RESET', previous[1]])
        expect(latches({ t2: { reset }, previous }), `${previous} 2RESET`).toEqual([previous[0], 'RESET'])
      }
    }
  })

  it('T37 1CONT affects timer1 only / T38 2CONT affects timer2 only', () => {
    // CONT = 4 V moves timer1's levels to 4 V / 2 V ; timer2 keeps 6 V / 3 V on the same inputs.
    expect(latches({ t1: { cont: 4, trig: 2.5 }, t2: { trig: 2.5 } })).toEqual(['RESET', 'SET'])
    expect(latches({ t1: { cont: 4, thres: 5 }, t2: { thres: 5 }, previous: ['SET', 'SET'] })).toEqual(['RESET', 'SET'])
    expect(latches({ t2: { cont: 4, trig: 2.5 }, t1: { trig: 2.5 } })).toEqual(['SET', 'RESET'])
    expect(latches({ t2: { cont: 4, thres: 5 }, t1: { thres: 5 }, previous: ['SET', 'SET'] })).toEqual(['SET', 'RESET'])
    // An unresolved 1CONT freezes timer1's comparators only.
    expect(latches({ t1: { cont: null, trig: 1 }, t2: { trig: 1 } })).toEqual(['RESET', 'SET'])
    expect(latches({ t2: { cont: null, trig: 1 }, t1: { trig: 1 } })).toEqual(['SET', 'RESET'])
  })

  it('T39 no cross-channel trigger leak', () => {
    for (const previous of PREVIOUS) {
      expect(latches({ t1: { trig: 0 }, previous }), String(previous)).toEqual(['SET', previous[1]])
      expect(latches({ t2: { trig: 0 }, previous }), String(previous)).toEqual([previous[0], 'SET'])
    }
  })

  it('T40 no cross-channel threshold leak', () => {
    for (const previous of PREVIOUS) {
      expect(latches({ t1: { thres: 9 }, previous }), String(previous)).toEqual(['RESET', previous[1]])
      expect(latches({ t2: { thres: 9 }, previous }), String(previous)).toEqual([previous[0], 'RESET'])
    }
  })

  it('each channel reads only its own previous latch (no previous-state leak)', () => {
    const ctx = sample556({})
    ctx.previousState = Object.freeze({ timer1: Object.freeze({ latch: 'SET' }) })
    expect(ne556nTimer.contribute(ctx).state).toEqual({ timer1: { latch: 'SET' }, timer2: { latch: 'RESET' } })
    ctx.previousState = Object.freeze({ timer2: Object.freeze({ latch: 'SET' }) })
    expect(ne556nTimer.contribute(ctx).state).toEqual({ timer1: { latch: 'RESET' }, timer2: { latch: 'SET' } })
  })
})

describe('A11-COMP5 — ONE common channel law : NE555P and each NE556N channel agree', () => {
  /** Single-channel scenarios, expressed once and played through both production entry points. */
  const SCENARIOS = [
    ['nominal SET', { ch: { trig: 1 } }],
    ['nominal RESET', { ch: { thres: 8 }, previous: 'SET' }],
    ['RESET priority (LOW)', { ch: { reset: Signal.LOW, trig: 1 }, previous: 'SET' }],
    ['RESET priority (UNKNOWN)', { ch: { reset: Signal.UNKNOWN, trig: 1, thres: 8 }, previous: 'SET' }],
    ['TRIG over THRES', { ch: { trig: 1, thres: 8 }, previous: 'RESET' }],
    ['CONT override SET', { ch: { cont: 4, trig: 1.99 } }],
    ['CONT override no SET', { ch: { cont: 4, trig: 2.5 } }],
    ['CONT override RESET', { ch: { cont: 4, thres: 4.5 }, previous: 'SET' }],
    ['CONT unresolved', { ch: { cont: null, trig: 1, thres: 8 }, previous: 'SET' }],
    ['equality HOLD (TRIG)', { ch: { trig: 3 }, previous: 'RESET' }],
    ['equality HOLD (THRES)', { ch: { thres: 6 }, previous: 'SET' }],
    ['HOLD SET', { previous: 'SET' }],
    ['start-up RESET', {}],
    ['GND offset', { gnd: 1, vcc: 10, ch: { trig: 3.9 } }],
    ['invalid supply (low)', { vcc: 4.49, ch: { trig: 1 }, previous: 'SET' }],
    ['invalid supply (high)', { vcc: 16.01, ch: { trig: 1 }, previous: 'SET' }],
    ['invalid supply (absent)', { vcc: undefined, ch: { trig: 1 }, previous: 'SET' }],
  ]

  /** NE556N channel `name` driven like the NE555P scenario ; the other channel parked with neutral inputs. */
  function as556(name, { ch = {}, previous, ...rest }) {
    const other = name === 'timer1' ? 'timer2' : 'timer1'
    const channels = { [name]: ch, [other]: { reset: Signal.HIGH } }
    const prev = previous === undefined ? undefined : name === 'timer1' ? [previous, 'RESET'] : ['RESET', previous]
    return sample556({ ...rest, t1: channels.timer1, t2: channels.timer2, previous: prev })
  }

  it.each(SCENARIOS)('%s : same latch, same OUT, same DISCH behaviour on NE555P, NE556N timer1 and timer2', (_, scenario) => {
    const single = ne555pTimer.contribute(sample555(scenario))
    for (const name of ['timer1', 'timer2']) {
      const pins = CHANNEL_PINS[name]
      const dual = ne556nTimer.contribute(as556(name, scenario))
      expect(dual.state[name].latch, name).toBe(single.state.latch)
      expect(dual.effects.digitalOutputs?.[pins.out], name).toBe(single.effects.digitalOutputs?.OUT)
      const pairs = (dual.effects.conductionPairs ?? []).filter(([pin]) => pin === pins.disch)
      const expected = (single.effects.conductionPairs ?? []).map(() => [pins.disch, 'GND'])
      expect(pairs, name).toEqual(expected)
      expect(single.effects.conductionPairs ?? []).toEqual(single.state.latch === 'RESET' && single.effects.digitalOutputs ? [['DISCH', 'GND']] : [])
    }
  })

  it('the law exists ONCE in the registry source ; both entries call it ; NE555P state stays { latch }', () => {
    const registry = executable(source('mixedSignalContributionRegistry.js'))
    expect(registry.match(/function evaluateBipolarTimerChannel\s*\(/g)).toHaveLength(1)
    expect(registry.match(/\bsupply\s*\/\s*3\b/g)).toHaveLength(1)
    expect(registry.match(/\(2\s*\*\s*supply\)\s*\/\s*3/g)).toHaveLength(1)
    expect(registry.match(/controlVoltage\s*\/\s*2/g)).toHaveLength(1)
    expect(registry.match(/evaluateBipolarTimerChannel\s*\(/g)).toHaveLength(2) // definition + one call site
    expect(registry.match(/timerChannelLatch\s*\(/g)).toHaveLength(4) // definition + NE555P + NE556N timer1 / timer2
    expect(registry.match(/BIPOLAR_TIMER_SUPPLY_MIN_VOLTS\s*=\s*4\.5\b/g)).toHaveLength(1)
    expect(registry.match(/BIPOLAR_TIMER_SUPPLY_MAX_VOLTS\s*=\s*16\b/g)).toHaveLength(1)
    expect(Object.keys(ne555pTimer.contribute(sample555({ ch: { trig: 1 } })).state)).toEqual(['latch'])
    expect(Object.keys(ne555pTimer.contribute(sample555({ vcc: undefined })).state)).toEqual(['latch'])
    // The law helpers are internal : nothing but the two entries and the registry API is exported.
    expect(registry.match(/^export\s+(?:const|function)\s+(\w+)/gm).map((line) => line.split(/\s+/).pop()))
      .toEqual(['createMixedSignalContributionRegistry', 'ne555pTimer', 'ne556nTimer', 'getMixedSignalContribution', 'hasMixedSignalContribution', 'getAllMixedSignalContributionTypes'])
  })
})

describe('A11-COMP5 NE556N — runtime state lifecycle (T41..T47)', () => {
  const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
  /** Common VCC / both RESETs on 9 V ; 1TRIG tied to GND : timer1 SET, timer2 HOLD (RESET) from the first SAMPLE. */
  const circuit = () => ({
    components: [{ uid: 'bat', type: 'BATTERY_9V', parameters: { voltage: 9 } }, { uid: 'u', type: TYPE, parameters: {} }],
    wires: [wire('bat', 'plus', 'u', 'VCC'), wire('bat', 'plus', 'u', '1RESET'), wire('bat', 'plus', 'u', '2RESET'),
      wire('bat', 'minus', 'u', 'GND'), wire('u', 'GND', 'u', '1TRIG')],
  })

  it('T41 ONE component state entry / T42 two latch members inside it / T43 deep-frozen runtime state', () => {
    const session = createSimulationRuntimeSession()
    const c = circuit()
    runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
    expect([...session.mixedSignalStates.keys()]).toEqual(['u'])
    for (const key of session.mixedSignalStates.keys()) expect(key).not.toMatch(/timer|:/)
    const state = session.mixedSignalStates.get('u')
    expect(state).toEqual({ timer1: { latch: 'SET' }, timer2: { latch: 'RESET' } })
    expect(Object.keys(state)).toEqual(['timer1', 'timer2'])
    expect(Object.keys(state.timer1)).toEqual(['latch'])
    expect(Object.keys(state.timer2)).toEqual(['latch'])
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.timer1)).toBe(true)
    expect(Object.isFrozen(state.timer2)).toBe(true)
  })

  it('T44 a runtime reset discards both latches (fresh start-up convention)', () => {
    const session = createSimulationRuntimeSession()
    const c = circuit()
    runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
    expect(session.mixedSignalStates.get('u').timer1.latch).toBe('SET')
    resetSimulationRuntimeSession(session)
    expect(session.mixedSignalStates.has('u')).toBe(false)
    // Released 1TRIG after the reset : HOLD from the start-up convention -> RESET for both.
    runSimulationStep(c.components, c.wires.slice(0, 4), { dt: 10, runtimeSession: session })
    expect(session.mixedSignalStates.get('u')).toEqual({ timer1: { latch: 'RESET' }, timer2: { latch: 'RESET' } })
  })

  it('T45 the Document never persists the timer state', () => {
    const c = circuit()
    const before = JSON.stringify(c)
    const session = createSimulationRuntimeSession()
    for (let i = 0; i < 3; i++) runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
    expect(JSON.stringify(c)).toBe(before)
    expect(before).not.toMatch(/latch|timer1|timer2|timerState|elapsedTime|phase|deadline|internalCapacitor/i)
    const created = createComponent(TYPE, 10, 20)
    expect(JSON.stringify(created)).not.toMatch(/latch|timer1|timer2|timerState|elapsedTime|phase|deadline|internalCapacitor/i)
    expect(created).not.toHaveProperty('state')
  })

  it('T46 deterministic repeated evaluation : same context -> same result, context never mutated', () => {
    const ctx = sample556({ t1: { trig: 1 }, t2: { thres: 8 }, previous: ['RESET', 'SET'] })
    const snapshot = JSON.stringify(ctx)
    const first = ne556nTimer.contribute(ctx)
    for (let i = 0; i < 5; i++) expect(ne556nTimer.contribute(ctx)).toEqual(first)
    expect(JSON.stringify(ctx)).toBe(snapshot)
  })

  it('T47 component / wire enumeration order does not change the committed state', () => {
    const run = (c) => {
      const session = createSimulationRuntimeSession()
      for (let i = 0; i < 3; i++) runSimulationStep(c.components, c.wires, { dt: 10, runtimeSession: session })
      return session.mixedSignalStates.get('u')
    }
    const c = circuit()
    expect(run({ components: [...c.components].reverse(), wires: [...c.wires].reverse() })).toEqual(run(c))
  })
})

describe('A11-COMP5 NE556N — architecture guards (T48..T54)', () => {
  const NE556N_LITERAL = /NE556|Ne556|ne556/
  const registry = executable(source('mixedSignalContributionRegistry.js'))
  const law = registry.slice(registry.indexOf('const BIPOLAR_TIMER_SUPPLY_MIN_VOLTS'), registry.indexOf('const defaultRegistry'))

  it('T48 no wall-clock API in the registry', () => {
    for (const pattern of [/Date\.now/, /performance\.now/, /\bsetTimeout\b/, /\bsetInterval\b/, /requestAnimationFrame/, /new Date\b/]) {
      expect(registry, String(pattern)).not.toMatch(pattern)
    }
  })

  it('T49 no internal capacitor / T50 no period, frequency, deadline or counter in the timer law', () => {
    expect(law.length).toBeGreaterThan(0)
    expect(law).toMatch(/ne556nTimer/)
    expect(law).not.toMatch(/timerCounter|counter|elapsed|deadline|period|frequency|phase|internalCapacitor|oscillator|capacitance|resistance|\btau\b|currentTimeMs|\bdt\b/i)
    expect(Object.keys(step({ t1: { trig: 1 } }).state)).toEqual(['timer1', 'timer2'])
    expect(Object.keys(step({ vcc: undefined }).state)).toEqual(['timer1', 'timer2'])
  })

  it('T51 no second scheduler / T52 no second resolution (one call site each, none in the registry)', () => {
    const integration = executable(source('simulationRuntimeIntegration.js'))
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
    expect(integration.match(/\bcreateScheduler\s*\(/g)).toHaveLength(1)
    expect(registry).not.toMatch(/resolveSignals|resolveElectricalSignals|prepareCircuit|Scheduler|createClock|clock\.js|advance\s*\(/)
  })

  it('T53 no NE556N-specific branch in the generic runtime or core', () => {
    for (const name of ['simulationRuntimeIntegration.js', 'resolution.js', 'preparation.js', 'scheduler.js', 'clock.js', 'engine.js',
      'controlledAnalogFeedbackSolver.js', 'dcContributionRegistry.js']) {
      expect(source(name), name).not.toMatch(NE556N_LITERAL)
    }
    for (const name of ['simulationRuntimeIntegration.js', 'resolution.js']) {
      expect(executable(source(name)), name).not.toMatch(/\b[12](?:TRIG|THRES|DISCH|CONT|RESET|OUT)\b|timer1|timer2/)
    }
  })

  it('T54 no NE556N-specific branch in PREQ4 / PREQ5', () => {
    for (const name of ['resistiveDriveContext.js', 'transientVoltageFactBridge.js', 'transientContributionRegistry.js']) {
      expect(source(name), name).not.toMatch(NE556N_LITERAL)
      expect(executable(source(name)), name).not.toMatch(/\b[12](?:TRIG|THRES|DISCH|CONT|RESET|OUT)\b|timer1|timer2/)
    }
  })
})
