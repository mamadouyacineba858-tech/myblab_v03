import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  runSimulationWithRuntime,
  runSimulationStep,
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
import { JkFlipFlop74HC73Model } from '../models/JkFlipFlop74HC73Model.js'
import { Signal } from '../signals.js'

/**
 * A9-JK1 — 74HC73 dual J-K flip-flop : contrat séquentiel (JK-01..JK-25).
 *
 * Toute la logique passe par le Registry timed de production
 * (timedDigitalContributionRegistry.js) et le pipeline A9-SEQ-PREQ/PREQ2
 * réel (`runSimulationWithRuntime` + `createSimulationRuntimeSession`) ;
 * aucune fixture ne remplace le producteur 74HC73.
 */

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const TYPE = 'JK_FLIP_FLOP_74HC73'
const isLogic = s => s === HIGH || s === LOW
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const components = [{ uid: 'p', type: 'POWER' }, { uid: 'ff', type: TYPE }]

/**
 * Câblage : chaque pin décisive est reliée au rail POWER correspondant ; une
 * pin UNKNOWN reste non connectée. Par défaut : alimenté, resets inactifs
 * (HIGH), J/K/CP LOW sur les deux canaux.
 */
const BASE = {
  VCC: HIGH, GND: LOW,
  '1J': LOW, '1K': LOW, '1CP': LOW, '1R': HIGH,
  '2J': LOW, '2K': LOW, '2CP': LOW, '2R': HIGH,
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

/** Amène un canal à un Q connu via le reset asynchrone, puis relâche le reset. */
function resetBoth(b) {
  b.step({ '1R': LOW, '2R': LOW })
  return b.step()
}
/** Front descendant complet sur un canal : CP HIGH puis CP LOW avec J/K donnés. */
function fall(b, ch, j, k, extra = {}) {
  b.step({ [`${ch}J`]: j, [`${ch}K`]: k, [`${ch}CP`]: HIGH, ...extra })
  return b.step({ [`${ch}J`]: j, [`${ch}K`]: k, [`${ch}CP`]: LOW, ...extra })
}

/** Appel direct de la contribution, pour FLOATING (non productible par câblage). */
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

describe('A9-JK1 — registry and catalogue contract', () => {
  it('JK-01: the production timed registry contains JK_FLIP_FLOP_74HC73 (one declarative entry)', () => {
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
      ['1CP', 'input'], ['1R', 'input'], ['1K', 'input'], ['VCC', 'power'], ['2CP', 'input'], ['2R', 'input'], ['2J', 'input'],
      ['2NQ', 'output'], ['2Q', 'output'], ['2K', 'input'], ['GND', 'ground'], ['1Q', 'output'], ['1NQ', 'output'], ['1J', 'input'],
    ])
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationDefaultParameters(TYPE)).toEqual({})
    expect(JkFlipFlop74HC73Model).toMatchObject({ type: TYPE })
    expect(JkFlipFlop74HC73Model.validate({})).toBe(true)
    expect(JkFlipFlop74HC73Model.validate(null)).toBe(false)
  })
})

describe('A9-JK1 — initial state and asynchronous reset', () => {
  it('JK-02: powered without reset, Q is undetermined (never an invented LOW)', () => {
    const b = bench()
    const r = b.step()
    for (const pin of ['q1', 'nq1', 'q2', 'nq2']) expect(r[pin]).toBe(UNKNOWN)
    expect(b.runtimeSession.timedDigitalStates.get('ff')).toEqual({
      channel1: { q: UNKNOWN, previousClock: LOW }, channel2: { q: UNKNOWN, previousClock: LOW },
    })
  })

  it('JK-03: 1R LOW -> 1Q LOW / 1NQ HIGH', () => {
    const r = bench().step({ '1R': LOW })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('JK-04: 2R LOW -> 2Q LOW / 2NQ HIGH', () => {
    const r = bench().step({ '2R': LOW })
    expect([r.q2, r.nq2]).toEqual([LOW, HIGH])
  })

  it('JK-05: reset is asynchronous — no clock edge needed, and it overrides J/K/clock', () => {
    const b = bench()
    // CP held HIGH (no edge), J=K=HIGH : reset alone establishes Q=LOW in the same step.
    const r = b.step({ '1R': LOW, '1CP': HIGH, '1J': HIGH, '1K': HIGH })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
    // Falling edge while reset LOW with J=1 K=0 (SET) : reset wins.
    const r2 = b.step({ '1R': LOW, '1CP': LOW, '1J': HIGH, '1K': LOW })
    expect([r2.q1, r2.nq1]).toEqual([LOW, HIGH])
    // Set it, then an asynchronous reset with CP static clears it at once.
    b.step()
    const set = fall(b, 1, HIGH, LOW)
    expect(set.q1).toBe(HIGH)
    const cleared = b.step({ '1R': LOW })
    expect([cleared.q1, cleared.nq1]).toEqual([LOW, HIGH])
  })
})

describe('A9-JK1 — falling-edge clock', () => {
  it('JK-06: rising edge LOW->HIGH never switches', () => {
    const b = bench()
    resetBoth(b)
    const r = b.step({ '1J': HIGH, '1K': LOW, '1CP': HIGH })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('JK-07: HIGH->HIGH (no change) never switches', () => {
    const b = bench()
    resetBoth(b)
    b.step({ '1J': HIGH, '1K': LOW, '1CP': HIGH })
    const r = b.step({ '1J': HIGH, '1K': LOW, '1CP': HIGH })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
    // The following HIGH->LOW is the only valid edge ; LOW->LOW afterwards never re-triggers.
    expect(b.step({ '1J': HIGH, '1K': LOW }).q1).toBe(HIGH) // HIGH -> LOW : SET
    expect(b.step({ '1J': LOW, '1K': HIGH }).q1).toBe(HIGH) // LOW -> LOW with J=0 K=1 : no edge, no RESET
  })

  it('only HIGH->LOW is an edge: the switch happens exactly on the falling step', () => {
    const b = bench()
    resetBoth(b)
    const rising = b.step({ '1J': HIGH, '1CP': HIGH })
    expect(rising.q1).toBe(LOW)
    const falling = b.step({ '1J': HIGH, '1CP': LOW })
    expect(falling.q1).toBe(HIGH)
  })

  it('JK-08: J=0 K=0 -> HOLD (from LOW and from HIGH)', () => {
    const b = bench()
    resetBoth(b)
    expect(fall(b, 1, LOW, LOW).q1).toBe(LOW)
    expect(fall(b, 1, HIGH, LOW).q1).toBe(HIGH)
    const r = fall(b, 1, LOW, LOW)
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
  })

  it('JK-09: J=0 K=1 -> RESET', () => {
    const b = bench()
    resetBoth(b)
    expect(fall(b, 1, HIGH, LOW).q1).toBe(HIGH)
    const r = fall(b, 1, LOW, HIGH)
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
    // J=0 K=1 also determines Q from UNKNOWN.
    const fresh = bench()
    fresh.step()
    expect(fall(fresh, 1, LOW, HIGH).q1).toBe(LOW)
  })

  it('JK-10: J=1 K=0 -> SET (also from UNKNOWN)', () => {
    const b = bench()
    resetBoth(b)
    const r = fall(b, 1, HIGH, LOW)
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
    const fresh = bench()
    fresh.step()
    expect(fall(fresh, 1, HIGH, LOW).q1).toBe(HIGH)
  })

  it('JK-11: J=1 K=1 -> TOGGLE', () => {
    const b = bench()
    resetBoth(b)
    const r = fall(b, 1, HIGH, HIGH)
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
  })

  it('JK-12: two successive toggles return Q to its previous value', () => {
    const b = bench()
    resetBoth(b)
    expect(fall(b, 1, HIGH, HIGH).q1).toBe(HIGH)
    expect(fall(b, 1, HIGH, HIGH).q1).toBe(LOW)
    expect(fall(b, 1, HIGH, HIGH).q1).toBe(HIGH)
    expect(fall(b, 1, HIGH, HIGH).q1).toBe(LOW)
  })

  it('TOGGLE on an undetermined Q stays undetermined', () => {
    const b = bench()
    b.step()
    const r = fall(b, 1, HIGH, HIGH)
    expect([r.q1, r.nq1]).toEqual([UNKNOWN, UNKNOWN])
  })
})

describe('A9-JK1 — two independent channels', () => {
  it('JK-13: a falling edge on 1CP does not affect channel 2', () => {
    const b = bench()
    resetBoth(b)
    const r = fall(b, 1, HIGH, LOW, { '2J': HIGH, '2K': LOW })
    expect(r.q1).toBe(HIGH)
    expect([r.q2, r.nq2]).toEqual([LOW, HIGH])
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel2).toEqual({ q: LOW, previousClock: LOW })
  })

  it('JK-14: a falling edge on 2CP does not affect channel 1', () => {
    const b = bench()
    resetBoth(b)
    const r = fall(b, 2, HIGH, HIGH, { '1J': HIGH, '1K': HIGH })
    expect(r.q2).toBe(HIGH)
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
  })

  it('JK-15: 1R resets channel 1 only', () => {
    const b = bench()
    b.step()
    fall(b, 1, HIGH, LOW)
    fall(b, 2, HIGH, LOW)
    const r = b.step({ '1R': LOW })
    expect([r.q1, r.nq1]).toEqual([LOW, HIGH])
    expect([r.q2, r.nq2]).toEqual([HIGH, LOW])
    // And from UNKNOWN : channel 2 stays UNKNOWN.
    const fresh = bench().step({ '1R': LOW })
    expect([fresh.q2, fresh.nq2]).toEqual([UNKNOWN, UNKNOWN])
  })

  it('JK-16: 2R resets channel 2 only', () => {
    const b = bench()
    b.step()
    fall(b, 1, HIGH, LOW)
    fall(b, 2, HIGH, LOW)
    const r = b.step({ '2R': LOW })
    expect([r.q2, r.nq2]).toEqual([LOW, HIGH])
    expect([r.q1, r.nq1]).toEqual([HIGH, LOW])
    const fresh = bench().step({ '2R': LOW })
    expect([fresh.q1, fresh.nq1]).toEqual([UNKNOWN, UNKNOWN])
  })

  it('JK-17: both channels can switch in the same simulation step', () => {
    const b = bench()
    resetBoth(b)
    b.step({ '1J': HIGH, '1K': LOW, '1CP': HIGH, '2J': HIGH, '2K': HIGH, '2CP': HIGH })
    const r = b.step({ '1J': HIGH, '1K': LOW, '1CP': LOW, '2J': HIGH, '2K': HIGH, '2CP': LOW })
    expect([r.q1, r.nq1, r.q2, r.nq2]).toEqual([HIGH, LOW, HIGH, LOW])
  })

  it('JK-18: Q/NQ are complementary whenever Q is determined (every step of a mixed sequence)', () => {
    const b = bench()
    const results = [resetBoth(b)]
    for (const [j, k] of [[HIGH, HIGH], [LOW, LOW], [HIGH, LOW], [LOW, HIGH], [HIGH, HIGH], [HIGH, HIGH]]) {
      b.step({ '1J': j, '1K': k, '1CP': HIGH, '2J': k, '2K': j, '2CP': HIGH })
      results.push(b.step({ '1J': j, '1K': k, '1CP': LOW, '2J': k, '2K': j, '2CP': LOW }))
    }
    for (const r of results) {
      for (const [q, nq] of [[r.q1, r.nq1], [r.q2, r.nq2]]) {
        expect(isLogic(q)).toBe(true)
        expect(nq).toBe(q === HIGH ? LOW : HIGH)
      }
    }
  })
})

describe('A9-JK1 — UNKNOWN / FLOATING are never coerced', () => {
  it('JK-19: an UNKNOWN clock (unconnected) creates no phantom edge (HIGH->UNKNOWN->LOW, UNKNOWN->LOW)', () => {
    const b = bench()
    resetBoth(b)
    b.step({ '1J': HIGH, '1CP': HIGH })
    expect(b.step({ '1J': HIGH, '1CP': UNKNOWN }).q1).toBe(LOW) // HIGH -> UNKNOWN : not an edge
    expect(b.step({ '1J': HIGH, '1CP': LOW }).q1).toBe(LOW) // UNKNOWN -> LOW : not an edge
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.previousClock).toBe(LOW)
  })

  it('JK-20: a FLOATING clock creates no phantom edge', () => {
    const d = direct()
    d.call({ '1R': LOW })
    d.call({})
    d.call({ '1J': HIGH, '1CP': HIGH })
    expect(d.call({ '1J': HIGH, '1CP': FLOATING }).get('ff:1Q')).toBe(LOW)
    expect(d.states.get('ff').channel1.previousClock).toBe(FLOATING)
    expect(d.call({ '1J': HIGH, '1CP': LOW }).get('ff:1Q')).toBe(LOW)
    // A genuine HIGH->LOW right after still works.
    d.call({ '1J': HIGH, '1CP': HIGH })
    expect(d.call({ '1J': HIGH, '1CP': LOW }).get('ff:1Q')).toBe(HIGH)
  })

  it.each([[UNKNOWN], [FLOATING]])('JK-21: J/K %s at a valid edge are never coerced to HIGH or LOW', level => {
    // Ambiguous : J undetermined with K=LOW from Q=LOW -> HOLD(LOW) or SET(HIGH) -> Q undetermined.
    const d = direct()
    d.call({ '1R': LOW })
    d.call({ '1CP': HIGH })
    let out = d.call({ '1J': level, '1K': LOW, '1CP': LOW })
    expect(out.has('ff:1Q')).toBe(false)
    expect(out.has('ff:1NQ')).toBe(false)
    expect(d.states.get('ff').channel1.q).toBe(UNKNOWN)

    // Ambiguous : K undetermined with J=HIGH from Q=HIGH -> SET(HIGH) or TOGGLE(LOW).
    d.call({ '1R': LOW })
    d.call({ '1J': HIGH, '1CP': HIGH })
    expect(d.call({ '1J': HIGH, '1CP': LOW }).get('ff:1Q')).toBe(HIGH)
    d.call({ '1J': HIGH, '1K': level, '1CP': HIGH })
    out = d.call({ '1J': HIGH, '1K': level, '1CP': LOW })
    expect(out.has('ff:1Q')).toBe(false)

    // Both undetermined -> undetermined.
    d.call({ '1R': LOW })
    d.call({ '1J': level, '1K': level, '1CP': HIGH })
    expect(d.call({ '1J': level, '1K': level, '1CP': LOW }).has('ff:1Q')).toBe(false)

    // Only when every possible J/K level gives the same Q is it determined (same "decisive" rule as AND/OR) :
    // Q=LOW, J=LOW, K undetermined -> HOLD(LOW) or RESET(LOW) = LOW.
    d.call({ '1R': LOW })
    d.call({ '1K': level, '1CP': HIGH })
    expect(d.call({ '1K': level, '1CP': LOW }).get('ff:1Q')).toBe(LOW)
    // Q=HIGH, K=LOW, J undetermined -> HOLD(HIGH) or SET(HIGH) = HIGH.
    d.call({ '1J': HIGH, '1CP': HIGH })
    expect(d.call({ '1J': HIGH, '1CP': LOW }).get('ff:1Q')).toBe(HIGH)
    d.call({ '1J': level, '1CP': HIGH })
    expect(d.call({ '1J': level, '1CP': LOW }).get('ff:1Q')).toBe(HIGH)
  })

  it.each([[UNKNOWN], [FLOATING]])('an undetermined reset %s never invents a Q other than the reset value', level => {
    const d = direct()
    d.call({ '1R': LOW })
    // Q=LOW, R undetermined : reset or not, Q stays LOW.
    expect(d.call({ '1R': level }).get('ff:1Q')).toBe(LOW)
    d.call({})
    d.call({ '1J': HIGH, '1CP': HIGH })
    expect(d.call({ '1J': HIGH, '1CP': LOW }).get('ff:1Q')).toBe(HIGH)
    // Q=HIGH, R undetermined : might have been cleared -> undetermined.
    expect(d.call({ '1R': level }).has('ff:1Q')).toBe(false)
  })
})

describe('A9-JK1 — power guard', () => {
  it.each([
    ['no supply at all', { VCC: UNKNOWN, GND: UNKNOWN }],
    ['VCC missing', { VCC: UNKNOWN }],
    ['GND missing', { GND: UNKNOWN }],
    ['VCC LOW', { VCC: LOW }],
  ])('JK-22: without a valid supply (%s) the contribution outputs === null', (_label, supply) => {
    const contribute = getTimedDigitalContribution(TYPE)
    const pinSignals = { ...BASE, ...supply, '1R': LOW, '2R': LOW }
    const { outputs, state } = contribute({ component: { uid: 'ff', type: TYPE }, pins: [], params: {}, pinSignals, currentTimeMs: 0, previousState: undefined })
    expect(outputs).toBeNull()
    expect(state).toEqual({ channel1: { q: UNKNOWN, previousClock: UNKNOWN }, channel2: { q: UNKNOWN, previousClock: UNKNOWN } })
    const r = bench().step({ ...supply, '1R': LOW, '2R': LOW })
    for (const pin of ['q1', 'nq1', 'q2', 'nq2']) expect(r[pin]).toBe(UNKNOWN)
  })

  it('JK-23: VCC/GND reversed -> no contribution', () => {
    const contribute = getTimedDigitalContribution(TYPE)
    const pinSignals = { ...BASE, VCC: LOW, GND: HIGH, '1R': LOW, '2R': LOW }
    expect(contribute({ component: { uid: 'ff', type: TYPE }, pins: [], params: {}, pinSignals, currentTimeMs: 0, previousState: undefined }).outputs).toBeNull()
    const r = bench().step({ VCC: LOW, GND: HIGH, '1R': LOW, '2R': LOW })
    for (const pin of ['q1', 'nq1', 'q2', 'nq2']) expect(r[pin]).toBe(UNKNOWN)
  })

  it('power loss clears the memory: repowering never restores a phantom Q', () => {
    const b = bench()
    b.step()
    expect(fall(b, 1, HIGH, LOW).q1).toBe(HIGH)
    const off = b.step({ VCC: UNKNOWN })
    expect([off.q1, off.nq1]).toEqual([UNKNOWN, UNKNOWN])
    const on = b.step()
    expect([on.q1, on.nq1]).toEqual([UNKNOWN, UNKNOWN])
  })
})

describe('A9-JK1 — runtime state lifecycle (A9-SEQ-PREQ2)', () => {
  it('JK-24/JK-25: private state persists across real runSimulationWithRuntime steps, only in the runtime session', () => {
    const b = bench()
    resetBoth(b)
    fall(b, 1, HIGH, HIGH)
    // Many steps without edges: Q retained purely by the runtime store.
    for (let i = 0; i < 5; i++) expect(b.step().q1).toBe(HIGH)
    expect(b.runtimeSession.timedDigitalStates.get('ff').channel1.q).toBe(HIGH)
    // Scheduler of the session is the single time authority and advances deterministically.
    expect(b.runtimeSession.scheduler.getCurrentTime()).toBe(SIMULATION_STEP_MS * 9) // 2 (reset) + 2 (edge) + 5 steps
    // Persistent inputs are never mutated and carry no flip-flop state.
    for (const c of components) {
      expect(c).not.toHaveProperty('state')
      expect(c).not.toHaveProperty('parameters')
    }
  })

  it('deterministic: two independent sessions fed the same sequence give identical outputs and states', () => {
    const sequence = [{ '1R': LOW, '2R': LOW }, {}, { '1J': HIGH, '1K': HIGH, '1CP': HIGH, '2J': HIGH, '2CP': HIGH },
      { '1J': HIGH, '1K': HIGH, '2J': HIGH }, { '1CP': HIGH, '2K': HIGH, '2CP': HIGH }, { '2K': HIGH }]
    const run = () => {
      const b = bench()
      const out = sequence.map(levels => { const r = b.step(levels); return [r.q1, r.nq1, r.q2, r.nq2] })
      return { out, state: b.runtimeSession.timedDigitalStates.get('ff') }
    }
    const first = run()
    expect(run()).toEqual(first)
    expect(first.out.at(-1)).toEqual([HIGH, LOW, LOW, HIGH])
  })

  it('dt=0 (stop/resume) keeps the state; reset/purge of the runtime session returns to the initial state', () => {
    const b = bench()
    b.step()
    fall(b, 1, HIGH, LOW)
    expect(b.step({}, 0).q1).toBe(HIGH)

    // Component removed from the circuit : PREQ2 purge drops its runtime state.
    retainSimulationRuntimeSessionUids(b.runtimeSession, new Set(['p']))
    expect(b.runtimeSession.timedDigitalStates.has('ff')).toBe(false)
    expect(b.step().q1).toBe(UNKNOWN)

    fall(b, 1, HIGH, LOW)
    expect(b.step().q1).toBe(HIGH)
    // Retaining a live uid keeps the state.
    retainSimulationRuntimeSessionUids(b.runtimeSession, new Set(['p', 'ff']))
    expect(b.step().q1).toBe(HIGH)

    // New runtime (Document replaced / simulation restarted) : no hidden persistence.
    resetSimulationRuntimeSession(b.runtimeSession)
    expect(b.runtimeSession.timedDigitalStates.size).toBe(0)
    expect(b.runtimeSession.scheduler).toBeNull()
    expect(b.step().q1).toBe(UNKNOWN)
  })

  it('two 74HC73 instances keep separate runtime states', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'a', type: TYPE }, { uid: 'b', type: TYPE }]
    const supply = uid => [wire('p', '5V', uid, 'VCC'), wire('p', 'GND', uid, 'GND'), wire('p', '5V', uid, '1R')]
    const w = (clockHigh) => [...supply('a'), ...supply('b'), wire('p', '5V', 'a', '1J'), wire('p', 'GND', 'a', '1K'),
      wire('p', clockHigh ? '5V' : 'GND', 'a', '1CP'), wire('p', 'GND', 'b', '1J'), wire('p', '5V', 'b', '1K'), wire('p', 'GND', 'b', '1CP')]
    runSimulationWithRuntime(comps, w(true), { runtimeSession, dt: SIMULATION_STEP_MS })
    const s = runSimulationWithRuntime(comps, w(false), { runtimeSession, dt: SIMULATION_STEP_MS })
    expect(s.get('a:1Q')).toBe(HIGH)
    expect(s.get('b:1Q')).toBe(UNKNOWN) // b never saw a falling edge
    expect(runtimeSession.timedDigitalStates.get('a')).not.toBe(runtimeSession.timedDigitalStates.get('b'))
  })

  it('ripple: 1Q driving 2CP through a wire clocks channel 2 on the falling edge of 1Q (sampled, one step later)', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const toggle = [wire('ff', '1Q', 'ff', '2CP')]
    const step = levels => runSimulationStep(components, [...wiresFor({ '1J': HIGH, '1K': HIGH, '2J': HIGH, '2K': HIGH, '2CP': UNKNOWN, ...levels }), ...toggle],
      { runtimeSession, dt: SIMULATION_STEP_MS }).pinSignals
    step({ '1R': LOW, '2R': LOW })
    step({})
    const clock = () => { step({ '1CP': HIGH }); return step({ '1CP': LOW }) }
    let s = clock() // 1Q LOW -> HIGH (rising on 2CP : no switch)
    expect([s.get('ff:1Q'), s.get('ff:2Q')]).toEqual([HIGH, LOW])
    s = clock() // 1Q HIGH -> LOW, produced this step : channel 2 has not sampled it yet
    expect([s.get('ff:1Q'), s.get('ff:2Q')]).toEqual([LOW, LOW])
    s = step({}) // next step : channel 2 samples the held 1Q falling edge and toggles
    expect([s.get('ff:1Q'), s.get('ff:2Q')]).toEqual([LOW, HIGH])
  })
})

describe('A9-JK1 — architecture', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

  it('generic engine files carry no JK_FLIP_FLOP_74HC73 branch', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../resolution.js', '../scheduler.js', '../engine.js', '../preparation.js',
      '../digitalContributionRegistry.js', '../../hooks/useCircuitState.js', '../../canvas/CircuitComponent.jsx', '../../canvas/Pin.jsx',
      '../../canvas/Breadboard.jsx', '../../components/parts/PartRenderer.jsx', '../../components/assembly/AssemblyLeadsLayer.jsx',
      '../../utils/assemblyGeometry.js', '../../utils/contactModel.js']) {
      expect(read(file), file).not.toMatch(/JK_FLIP_FLOP|74HC73|JkFlipFlop/)
    }
  })

  it('the 74HC73 contribution uses no wall clock and no Document/React access', () => {
    const source = read('../timedDigitalContributionRegistry.js')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
    expect(imports).toEqual(['./signals.js'])
  })
})
