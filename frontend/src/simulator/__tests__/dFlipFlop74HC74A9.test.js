import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  runSimulationWithRuntime,
  computeTimedDigitalSignals,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  circuitRequiresContinuousStepping,
  SIMULATION_STEP_MS,
} from '../simulationRuntimeIntegration.js'
import {
  getAllTimedDigitalContributionTypes,
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
  createTimedDigitalContributionRegistry,
} from '../timedDigitalContributionRegistry.js'
import { hasDigitalContribution } from '../digitalContributionRegistry.js'
import { hasDcContribution } from '../dcContributionRegistry.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulationRegistry.js'
import { DFlipFlop74HC74Model } from '../models/DFlipFlop74HC74Model.js'
import { toEngineInput } from '../engineAdapter.js'
import { Signal } from '../signals.js'

/**
 * A9-DFF1 — 74HC74 dual D flip-flop (positive edge) : contrat séquentiel (DFF-01..DFF-28).
 *
 * Toute la logique passe par le Registry timed de production
 * (timedDigitalContributionRegistry.js) et le pipeline A9-SEQ-PREQ/PREQ2
 * réel (`runSimulationWithRuntime` + `createSimulationRuntimeSession`) ;
 * aucune fixture ne remplace le producteur 74HC74. FLOATING (non productible
 * par câblage) passe par `computeTimedDigitalSignals` avec la contribution
 * de production.
 */

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const TYPE = 'D_FLIP_FLOP_74HC74'
const isLogic = s => s === HIGH || s === LOW
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const components = [{ uid: 'p', type: 'POWER' }, { uid: 'ff', type: TYPE }]

/**
 * Câblage : chaque pin décisive est reliée au rail POWER correspondant ; une
 * pin UNKNOWN reste non connectée. Par défaut : alimenté, PRE/CLR inactifs
 * (HIGH), D/CLK LOW sur les deux canaux.
 */
const BASE = {
  VCC: HIGH, GND: LOW,
  '1D': LOW, '1CLK': LOW, '1PRE': HIGH, '1CLR': HIGH,
  '2D': LOW, '2CLK': LOW, '2PRE': HIGH, '2CLR': HIGH,
}
function wiresFor(levels) {
  const merged = { ...BASE, ...levels }
  return Object.entries(merged)
    .filter(([, level]) => isLogic(level))
    .map(([pin, level]) => wire('p', level === HIGH ? '5V' : 'GND', 'ff', pin))
}

function bench() {
  const runtimeSession = createSimulationRuntimeSession()
  const step = (levels = {}, dt = SIMULATION_STEP_MS) => {
    const signals = runSimulationWithRuntime(components, wiresFor(levels), { runtimeSession, dt })
    const read = pin => signals.get(`ff:${pin}`)
    return { signals, q1: read('1Q'), nq1: read('1NQ'), q2: read('2Q'), nq2: read('2NQ') }
  }
  return { runtimeSession, step }
}

/** Front montant complet sur un canal : CLK LOW puis CLK HIGH avec D donné. */
function rise(b, ch, d, extra = {}) {
  b.step({ [`${ch}D`]: d, [`${ch}CLK`]: LOW, ...extra })
  return b.step({ [`${ch}D`]: d, [`${ch}CLK`]: HIGH, ...extra })
}
/** Amène les deux canaux à Q=LOW via CLR asynchrone, puis relâche CLR. */
function clearBoth(b) {
  b.step({ '1CLR': LOW, '2CLR': LOW })
  return b.step()
}

/** Appel de la contribution de production via la composition timed, pour FLOATING. */
function direct() {
  const states = new Map()
  const registry = createTimedDigitalContributionRegistry({ contributions: new Map([[TYPE, getTimedDigitalContribution(TYPE)]]) })
  const call = levels => {
    const merged = { ...BASE, ...levels }
    const signals = new Map(Object.entries(merged).map(([pin, s]) => [`ff:${pin}`, s]))
    return computeTimedDigitalSignals([{ uid: 'ff', type: TYPE }], registry, signals, 0, states)
  }
  return { states, call }
}

describe('A9-DFF1 — registry and catalogue contract', () => {
  it('the production timed registry contains D_FLIP_FLOP_74HC74 (one declarative entry)', () => {
    expect(hasTimedDigitalContribution(TYPE)).toBe(true)
    expect(getTimedDigitalContribution(TYPE)).toBeTypeOf('function')
    expect(getAllTimedDigitalContributionTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(hasDigitalContribution(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
    expect(circuitRequiresContinuousStepping(components)).toBe(true)
  })

  it('canonical entry: 14 electrical pins with locked roles, digital, no parameters, model available', () => {
    expect(getAllCanonicalTypes().filter(t => t === TYPE)).toHaveLength(1)
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'], defaultParameters: {}, parameterSchema: [] })
    expect(entry.pins.map(p => [p.id, p.role])).toEqual([
      ['1CLR', 'input'], ['1D', 'input'], ['1CLK', 'input'], ['1PRE', 'input'], ['1Q', 'output'], ['1NQ', 'output'], ['GND', 'ground'],
      ['2NQ', 'output'], ['2Q', 'output'], ['2PRE', 'input'], ['2CLK', 'input'], ['2D', 'input'], ['2CLR', 'input'], ['VCC', 'power'],
    ])
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationDefaultParameters(TYPE)).toEqual({})
    expect(DFlipFlop74HC74Model).toMatchObject({ type: TYPE })
    expect(DFlipFlop74HC74Model.validate({})).toBe(true)
    expect(DFlipFlop74HC74Model.validate(null)).toBe(false)
  })
})

describe('A9-DFF1 — initial state and power', () => {
  it('DFF-01: powered, no async and no edge, Q/NQ are undetermined (never an invented LOW)', () => {
    const b = bench()
    const r = b.step()
    for (const pin of ['q1', 'nq1', 'q2', 'nq2']) expect(r[pin]).toBe(UNKNOWN)
    expect(b.runtimeSession.timedDigitalStates.get('ff')).toEqual({
      channel1: { q: UNKNOWN, previousClock: LOW }, channel2: { q: UNKNOWN, previousClock: LOW },
    })
  })

  it.each([
    ['no supply at all', { VCC: UNKNOWN, GND: UNKNOWN }],
    ['VCC missing', { VCC: UNKNOWN }],
    ['GND missing', { GND: UNKNOWN }],
    ['VCC LOW', { VCC: LOW }],
    ['VCC/GND reversed', { VCC: LOW, GND: HIGH }],
  ])('DFF-02: without a valid supply (%s) outputs are not driven', (_label, supply) => {
    const contribute = getTimedDigitalContribution(TYPE)
    const pinSignals = { ...BASE, ...supply, '1PRE': LOW, '2CLR': LOW }
    const { outputs, state } = contribute({ component: { uid: 'ff', type: TYPE }, pins: [], params: {}, pinSignals, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
    expect(state).toEqual({ channel1: { q: UNKNOWN, previousClock: UNKNOWN }, channel2: { q: UNKNOWN, previousClock: UNKNOWN } })
    const r = bench().step({ ...supply, '1PRE': LOW, '2CLR': LOW })
    for (const pin of ['q1', 'nq1', 'q2', 'nq2']) expect(r[pin]).toBe(UNKNOWN)
  })

  it('DFF-24: power loss clears the runtime memory (A9-JK1 precedent)', () => {
    const b = bench()
    b.step()
    expect(rise(b, 1, HIGH).q1).toBe(HIGH)
    const off = b.step({ VCC: UNKNOWN })
    expect([off.q1, off.nq1]).toEqual([UNKNOWN, UNKNOWN])
    expect(b.runtimeSession.timedDigitalStates.get('ff')).toEqual({
      channel1: { q: UNKNOWN, previousClock: UNKNOWN }, channel2: { q: UNKNOWN, previousClock: UNKNOWN },
    })
  })

  it('DFF-25: repower starts from UNKNOWN (no phantom Q, no phantom edge from the pre-loss clock)', () => {
    const b = bench()
    b.step()
    expect(rise(b, 1, HIGH).q1).toBe(HIGH) // CLK held HIGH
    b.step({ '1D': HIGH, '1CLK': HIGH, VCC: UNKNOWN })
    const on = b.step({ '1D': HIGH, '1CLK': HIGH })
    expect([on.q1, on.nq1, on.q2, on.nq2]).toEqual([UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN])
    // A genuine rising edge after repower restores a deterministic state.
    expect(rise(b, 1, LOW).q1).toBe(LOW)
  })
})

describe('A9-DFF1 — asynchronous PRE / CLR (active LOW)', () => {
  it('DFF-03: PRE LOW, CLR HIGH -> Q HIGH / NQ LOW', () => {
    const r = bench().step({ '1PRE': LOW })
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
  })

  it('DFF-04: PRE HIGH, CLR LOW -> Q LOW / NQ HIGH', () => {
    const r = bench().step({ '1CLR': LOW })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('DFF-05: PRE acts without any clock activity and the state is held after release', () => {
    const b = bench()
    const held = b.step({ '1CLK': HIGH })
    expect(held.q1).toBe(UNKNOWN)
    expect(b.step({ '1CLK': HIGH, '1PRE': LOW }).q1).toBe(HIGH)
    const released = b.step({ '1CLK': HIGH })
    expect([released.q1, released.nq1]).toEqual([HIGH, LOW])
  })

  it('DFF-06: CLR acts without any clock activity and the state is held after release', () => {
    const b = bench()
    b.step({ '1PRE': LOW })
    expect(b.step({ '1CLR': LOW }).q1).toBe(LOW)
    const released = b.step()
    expect([released.q1, released.nq1]).toEqual([LOW, HIGH])
  })

  it('DFF-23: asynchronous inputs dominate a simultaneous rising edge', () => {
    const b = bench()
    b.step({ '1D': HIGH })
    const cleared = b.step({ '1D': HIGH, '1CLK': HIGH, '1CLR': LOW })
    expect([cleared.q1, cleared.nq1]).toEqual([LOW, HIGH])
    b.step({ '1D': LOW, '1CLK': LOW, '1PRE': LOW })
    const preset = b.step({ '1D': LOW, '1CLK': HIGH, '1PRE': LOW })
    expect([preset.q1, preset.nq1]).toEqual([HIGH, LOW])
    // The edge consumed while PRE was active is not replayed after release.
    const released = b.step({ '1D': LOW, '1CLK': HIGH })
    expect([released.q1, released.nq1]).toEqual([HIGH, LOW])
  })

  it('DFF-16: PRE and CLR both LOW -> Q HIGH and NQ HIGH (explicitly non-complementary)', () => {
    const b = bench()
    const r = b.step({ '1PRE': LOW, '1CLR': LOW })
    expect([r.q1, r.nq1]).toEqual([HIGH, HIGH])
    // Even with a rising edge and D LOW during the condition.
    b.step({ '1PRE': LOW, '1CLR': LOW, '1CLK': LOW })
    const edge = b.step({ '1PRE': LOW, '1CLR': LOW, '1CLK': HIGH })
    expect([edge.q1, edge.nq1]).toEqual([HIGH, HIGH])
  })

  it('DFF-17: releasing the illegal state to PRE=CLR=HIGH leaves the memory UNKNOWN', () => {
    const b = bench()
    clearBoth(b)
    b.step({ '1PRE': LOW, '1CLR': LOW })
    const released = b.step()
    expect([released.q1, released.nq1]).toEqual([UNKNOWN, UNKNOWN])
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.q).toBe(UNKNOWN)
    // Held UNKNOWN on following steps without a deterministic event.
    expect(b.step().q1).toBe(UNKNOWN)
    // Channel 2 is untouched.
    expect([released.q2, released.nq2]).toEqual([LOW, HIGH])
  })

  it('DFF-18: after the illegal state, a deterministic event restores Q (edge, PRE alone, CLR alone)', () => {
    const b = bench()
    b.step({ '1PRE': LOW, '1CLR': LOW })
    b.step()
    const edge = rise(b, 1, HIGH)
    expect([edge.q1, edge.nq1]).toEqual([HIGH, LOW])

    b.step({ '1PRE': LOW, '1CLR': LOW, '1CLK': LOW })
    expect(b.step({ '1CLR': LOW }).q1).toBe(LOW) // PRE released first: CLR alone
    b.step({ '1PRE': LOW, '1CLR': LOW })
    const pre = b.step({ '1PRE': LOW }) // CLR released first: PRE alone
    expect([pre.q1, pre.nq1]).toEqual([HIGH, LOW])
  })
})

describe('A9-DFF1 — positive-edge clock', () => {
  it('DFF-07: LOW->HIGH with D=LOW captures LOW', () => {
    const b = bench()
    b.step({ '1PRE': LOW })
    b.step()
    const r = rise(b, 1, LOW)
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('DFF-08: LOW->HIGH with D=HIGH captures HIGH (also from UNKNOWN)', () => {
    const b = bench()
    clearBoth(b)
    const r = rise(b, 1, HIGH)
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
    const fresh = bench()
    fresh.step()
    expect(rise(fresh, 1, HIGH).q1).toBe(HIGH)
  })

  it('the capture happens exactly on the rising step', () => {
    const b = bench()
    clearBoth(b)
    expect(b.step({ '1D': HIGH }).q1).toBe(LOW)
    expect(b.step({ '1D': HIGH, '1CLK': HIGH }).q1).toBe(HIGH)
  })

  it('DFF-09: HIGH->LOW never captures', () => {
    const b = bench()
    clearBoth(b)
    b.step({ '1CLK': HIGH }) // rising with D=LOW : Q stays LOW
    const r = b.step({ '1D': HIGH, '1CLK': LOW })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('DFF-10: a stable clock (HIGH->HIGH, LOW->LOW) never captures', () => {
    const b = bench()
    clearBoth(b)
    b.step({ '1CLK': HIGH })
    expect(b.step({ '1D': HIGH, '1CLK': HIGH }).q1).toBe(LOW)
    expect(b.step({ '1D': HIGH, '1CLK': HIGH }).q1).toBe(LOW)
    b.step({ '1D': HIGH })
    expect(b.step({ '1D': HIGH }).q1).toBe(LOW)
  })

  it('DFF-11: D changing without a rising edge -> HOLD', () => {
    const b = bench()
    clearBoth(b)
    expect(rise(b, 1, HIGH).q1).toBe(HIGH)
    for (const d of [LOW, HIGH, LOW, LOW]) {
      const r = b.step({ '1D': d, '1CLK': HIGH })
      expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
    }
    b.step({ '1D': LOW })
    expect(b.step({ '1D': HIGH }).q1).toBe(HIGH)
  })

  it('DFF-14: NQ is the complement in the normal LOW state', () => {
    const b = bench()
    b.step()
    const r = rise(b, 1, LOW)
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('DFF-15: NQ is the complement in the normal HIGH state (every step of a mixed sequence)', () => {
    const b = bench()
    const results = [clearBoth(b)]
    for (const d of [HIGH, HIGH, LOW, HIGH, LOW, LOW]) results.push(rise(b, 1, d, { '2D': d === HIGH ? LOW : HIGH, '2CLK': LOW }))
    for (const d of [HIGH, LOW]) results.push(rise(b, 2, d))
    for (const r of results) {
      for (const [q, nq] of [[r.q1, r.nq1], [r.q2, r.nq2]]) {
        expect(isLogic(q)).toBe(true)
        expect(nq).toBe(q === HIGH ? LOW : HIGH)
      }
    }
  })
})

describe('A9-DFF1 — two independent channels', () => {
  it('DFF-12: a rising edge on 1CLK and 1PRE/1CLR never modify channel 2', () => {
    const b = bench()
    clearBoth(b)
    const r = rise(b, 1, HIGH, { '2D': HIGH })
    expect(r.q1).toBe(HIGH)
    expect([r.q2, r.nq2]).toEqual([LOW, HIGH])
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel2).toEqual({ q: LOW, previousClock: LOW })
    expect(bench().step({ '1PRE': LOW }).q2).toBe(UNKNOWN)
  })

  it('DFF-13: a rising edge on 2CLK and 2PRE/2CLR never modify channel 1', () => {
    const b = bench()
    clearBoth(b)
    const r = rise(b, 2, HIGH, { '1D': HIGH })
    expect(r.q2).toBe(HIGH)
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1).toEqual({ q: LOW, previousClock: LOW })
    expect(bench().step({ '2CLR': LOW }).q1).toBe(UNKNOWN)
  })

  it('DFF-27: both channels operate in the same simulation step', () => {
    const b = bench()
    clearBoth(b)
    b.step({ '1D': HIGH, '2D': LOW })
    const r = b.step({ '1D': HIGH, '1CLK': HIGH, '2D': LOW, '2CLK': HIGH })
    expect([r.q1, r.nq1, r.q2, r.nq2]).toEqual([HIGH, LOW, LOW, HIGH])
    b.step({ '1D': LOW, '2D': HIGH })
    const r2 = b.step({ '1D': LOW, '1CLK': HIGH, '2D': HIGH, '2CLK': HIGH })
    expect([r2.q1, r2.nq1, r2.q2, r2.nq2]).toEqual([LOW, HIGH, HIGH, LOW])
    // Simultaneous asynchronous action on one channel with an edge on the other.
    b.step({ '2D': LOW })
    const r3 = b.step({ '1PRE': LOW, '2D': LOW, '2CLK': HIGH })
    expect([r3.q1, r3.nq1, r3.q2, r3.nq2]).toEqual([HIGH, LOW, LOW, HIGH])
  })
})

describe('A9-DFF1 — UNKNOWN / FLOATING are never coerced', () => {
  it('DFF-19: D UNKNOWN (unconnected) on a valid rising edge -> Q/NQ UNKNOWN', () => {
    const b = bench()
    clearBoth(b)
    const r = rise(b, 1, UNKNOWN)
    expect([r.q1, r.nq1]).toEqual([UNKNOWN, UNKNOWN])
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.q).toBe(UNKNOWN)
  })

  it('DFF-20: D FLOATING on a valid rising edge -> Q/NQ UNKNOWN', () => {
    const d = direct()
    d.call({ '1PRE': LOW })
    d.call({})
    const out = d.call({ '1D': FLOATING, '1CLK': HIGH })
    expect(out.has('ff:1Q')).toBe(false)
    expect(out.has('ff:1NQ')).toBe(false)
    expect(d.states.get('ff').channel1.q).toBe(UNKNOWN)
  })

  it('DFF-21: an UNKNOWN clock (unconnected) creates no edge (LOW->UNKNOWN->HIGH)', () => {
    const b = bench()
    clearBoth(b)
    expect(b.step({ '1D': HIGH, '1CLK': UNKNOWN }).q1).toBe(LOW) // LOW -> UNKNOWN : not an edge
    expect(b.step({ '1D': HIGH, '1CLK': HIGH }).q1).toBe(LOW) // UNKNOWN -> HIGH : not an edge
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.previousClock).toBe(HIGH)
  })

  it('DFF-22: a FLOATING clock creates no edge', () => {
    const d = direct()
    d.call({ '1CLR': LOW })
    d.call({})
    expect(d.call({ '1D': HIGH, '1CLK': FLOATING }).get('ff:1Q')).toBe(LOW)
    expect(d.states.get('ff').channel1.previousClock).toBe(FLOATING)
    expect(d.call({ '1D': HIGH, '1CLK': HIGH }).get('ff:1Q')).toBe(LOW)
    // A genuine LOW->HIGH right after still works.
    d.call({ '1D': HIGH })
    expect(d.call({ '1D': HIGH, '1CLK': HIGH }).get('ff:1Q')).toBe(HIGH)
  })

  it.each([[UNKNOWN], [FLOATING]])('PRE/CLR %s: an output is driven only when every interpretation agrees', level => {
    const d = direct()
    // Q=HIGH, PRE undetermined, CLR HIGH : preset or hold gives HIGH either way.
    d.call({ '1PRE': LOW })
    let out = d.call({ '1PRE': level })
    expect([out.get('ff:1Q'), out.get('ff:1NQ')]).toEqual([HIGH, LOW])
    // Q=HIGH, CLR undetermined : cleared or held -> undetermined.
    out = d.call({ '1CLR': level })
    expect(out.has('ff:1Q')).toBe(false)
    expect(out.has('ff:1NQ')).toBe(false)
    expect(d.states.get('ff').channel1.q).toBe(UNKNOWN)
    // PRE LOW, CLR undetermined : Q is HIGH in both cases (preset / illegal), NQ is not.
    out = d.call({ '1PRE': LOW, '1CLR': level })
    expect(out.get('ff:1Q')).toBe(HIGH)
    expect(out.has('ff:1NQ')).toBe(false)
    expect(d.states.get('ff').channel1.q).toBe(UNKNOWN)
    // CLR LOW, PRE undetermined : NQ is HIGH in both cases (clear / illegal), Q is not.
    out = d.call({ '1CLR': LOW, '1PRE': level })
    expect(out.get('ff:1NQ')).toBe(HIGH)
    expect(out.has('ff:1Q')).toBe(false)
    // No arbitrary priority invented : channel 2 is unaffected throughout.
    expect(out.has('ff:2Q')).toBe(false)
  })

  it('D undetermined without an edge is irrelevant (HOLD stays deterministic)', () => {
    const b = bench()
    clearBoth(b)
    expect(rise(b, 1, HIGH).q1).toBe(HIGH)
    const r = b.step({ '1D': UNKNOWN, '1CLK': HIGH })
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
  })
})

describe('A9-DFF1 — runtime state lifecycle (A9-SEQ-PREQ2)', () => {
  it('DFF-26: sequential state persists across real runSimulationWithRuntime steps, only in the runtime session', () => {
    const b = bench()
    clearBoth(b)
    rise(b, 1, HIGH)
    for (let i = 0; i < 5; i++) expect(b.step({ '1CLK': HIGH }).q1).toBe(HIGH)
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.q).toBe(HIGH)
    expect(b.runtimeSession.scheduler.getCurrentTime()).toBe(SIMULATION_STEP_MS * 9) // 2 (clear) + 2 (edge) + 5 steps
    // dt=0 (stop/resume) keeps the state.
    expect(b.step({ '1CLK': HIGH }, 0).q1).toBe(HIGH)
  })

  it('DFF-28: no Document persistence — the Document is never mutated and carries no flip-flop state', () => {
    const doc = levels => ({
      components: [{ id: 'p', type: 'POWER', position: { x: 0, y: 0 } }, { id: 'ff', type: TYPE, position: { x: 200, y: 0 } }],
      wires: Object.entries({ VCC: true, GND: false, '1PRE': true, '1CLR': true, '1D': true, ...levels })
        .map(([pin, high], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'ff', pinId: pin } })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      for (const c of d.components) expect(c).not.toHaveProperty('state')
      return [signals.get('ff:1Q'), signals.get('ff:1NQ')]
    }
    expect(step({ '1CLK': false })).toEqual([UNKNOWN, UNKNOWN])
    expect(step({ '1CLK': true })).toEqual([HIGH, LOW])
    expect(step({ '1CLK': true, '1D': false })).toEqual([HIGH, LOW])
    for (const c of components) expect(c).not.toHaveProperty('state')

    // Purge / reset of the runtime session : no hidden persistence anywhere else.
    retainSimulationRuntimeSessionUids(runtimeSession, new Set(['p']))
    expect(runtimeSession.timedDigitalStates.has('ff')).toBe(false)
    expect(step({ '1CLK': true })).toEqual([UNKNOWN, UNKNOWN])
    resetSimulationRuntimeSession(runtimeSession)
    expect(runtimeSession.timedDigitalStates.size).toBe(0)
    expect(runtimeSession.scheduler).toBeNull()
  })

  it('deterministic: two independent sessions fed the same sequence give identical outputs and states', () => {
    const sequence = [{ '1CLR': LOW, '2PRE': LOW }, {}, { '1D': HIGH, '2D': LOW }, { '1D': HIGH, '1CLK': HIGH, '2CLK': HIGH },
      { '1PRE': LOW, '1CLR': LOW }, {}, { '2D': HIGH }, { '2D': HIGH, '2CLK': HIGH }]
    const run = () => {
      const b = bench()
      const out = sequence.map(levels => { const r = b.step(levels); return [r.q1, r.nq1, r.q2, r.nq2] })
      return { out, state: b.runtimeSession.timedDigitalStates.get('ff') }
    }
    const first = run()
    expect(run()).toEqual(first)
    expect(first.out.at(-1)).toEqual([UNKNOWN, UNKNOWN, HIGH, LOW])
  })

  it('two 74HC74 instances keep separate runtime states', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'a', type: TYPE }, { uid: 'b', type: TYPE }]
    const supply = uid => [wire('p', '5V', uid, 'VCC'), wire('p', 'GND', uid, 'GND'), wire('p', '5V', uid, '1PRE'), wire('p', '5V', uid, '1CLR')]
    const w = clockHigh => [...supply('a'), ...supply('b'), wire('p', '5V', 'a', '1D'), wire('p', clockHigh ? '5V' : 'GND', 'a', '1CLK'),
      wire('p', '5V', 'b', '1D'), wire('p', 'GND', 'b', '1CLK')]
    runSimulationWithRuntime(comps, w(false), { runtimeSession, dt: SIMULATION_STEP_MS })
    const s = runSimulationWithRuntime(comps, w(true), { runtimeSession, dt: SIMULATION_STEP_MS })
    expect(s.get('a:1Q')).toBe(HIGH)
    expect(s.get('b:1Q')).toBe(UNKNOWN) // b never saw a rising edge
    expect(runtimeSession.timedDigitalStates.get('a')).not.toBe(runtimeSession.timedDigitalStates.get('b'))
  })
})

describe('A9-DFF1 — architecture', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

  it('generic engine files carry no D_FLIP_FLOP_74HC74 branch', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../resolution.js', '../scheduler.js', '../clock.js', '../engine.js', '../preparation.js',
      '../digitalContributionRegistry.js', '../../hooks/useCircuitState.js', '../../canvas/CircuitComponent.jsx', '../../canvas/Pin.jsx',
      '../../canvas/Breadboard.jsx', '../../components/parts/PartRenderer.jsx', '../../components/assembly/AssemblyLeadsLayer.jsx',
      '../../utils/assemblyGeometry.js', '../../utils/contactModel.js']) {
      expect(read(file), file).not.toMatch(/D_FLIP_FLOP|74HC74|DFlipFlop/)
    }
  })

  it('the timed registry remains free of wall clock and Document/React access', () => {
    const source = read('../timedDigitalContributionRegistry.js')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
    expect(imports).toEqual(['./signals.js'])
  })
})
