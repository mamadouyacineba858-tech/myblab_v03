import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  runSimulationStep,
  computeTimedDigitalSignals,
  SIMULATION_STEP_MS,
} from '../simulationRuntimeIntegration.js'
import {
  createTimedDigitalContributionRegistry,
  getAllTimedDigitalContributionTypes,
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
} from '../timedDigitalContributionRegistry.js'
import {
  createDigitalContributionRegistry,
  getAllDigitalContributionTypes,
  getDigitalContribution,
  hasDigitalContribution,
} from '../digitalContributionRegistry.js'
import { getCanonicalEntry } from '../canonicalRegistry.js'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals, resolveSourceDrivenPinSignals } from '../resolution.js'
import { createScheduler } from '../scheduler.js'
import { createRuntimeOrchestrator } from '../runtimeOrchestrator.js'
import { Signal } from '../signals.js'
import { PALETTE_ITEMS } from '../../config/componentDefinitions.js'

/**
 * A9-SEQ-PREQ — Generic sequential digital contract (qualification).
 *
 * The existing TimedDigitalContributionFn contract (timedDigitalContributionRegistry.js)
 * is reused as is. Sequential behaviour is proven with TEST-ONLY fixtures
 * injected through `createTimedDigitalContributionRegistry`; no production
 * type is added. The fixtures are hosted by existing canonical types whose
 * pin lists fit (as A7-C5-PREQ hosts its fixture on NPN_TRANSISTOR):
 *
 *   EDGE_FIXTURE  on XOR_GATE pins : A = D, B = CLK, Q = Q
 *   LEVEL_FIXTURE on NOR_GATE pins : A = D, B = EN,  Q = Q
 *
 * The host types are removed from the injected combinational registry, so
 * each host pin has exactly one producer. Every other combinational type is
 * the real production contribution, reached only through the registry API.
 *
 * Fixture semantics (documented choices, tests only):
 * - Edge = previous CLK decisively LOW and current CLK decisively HIGH.
 *   UNKNOWN/FLOATING never count as LOW or HIGH: UNKNOWN->HIGH,
 *   FLOATING->HIGH and HIGH->UNKNOWN->HIGH are not edges.
 * - On an edge, a decisive D is stored. An undetermined D (UNKNOWN/FLOATING)
 *   at the edge clears the stored value (most conservative: the captured
 *   level is unknown, the previous value is no longer an electrical
 *   authority), so Q is not driven.
 * - No stored value (first step, reset) => Q is not driven.
 * - Level fixture: EN HIGH => Q follows a decisive D (undetermined D clears);
 *   EN LOW => Q holds; EN undetermined => Q holds only if D is decisive and
 *   equal to the stored value, otherwise it clears.
 */

vi.mock('../resolution.js', async original => {
  const actual = await original()
  return { ...actual, resolveSignals: vi.fn(actual.resolveSignals) }
})
vi.mock('../scheduler.js', async original => {
  const actual = await original()
  return { ...actual, createScheduler: vi.fn(actual.createScheduler) }
})
afterEach(() => vi.clearAllMocks())

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const EDGE_HOST = 'XOR_GATE'
const LEVEL_HOST = 'NOR_GATE'
const isLogic = s => s === HIGH || s === LOW

function edgeFixture({ pinSignals, previousState }) {
  const prev = previousState ?? { clock: UNKNOWN, stored: null, edges: 0 }
  const clock = pinSignals.B
  const edge = prev.clock === LOW && clock === HIGH
  const stored = edge ? (isLogic(pinSignals.A) ? pinSignals.A : null) : prev.stored
  return {
    state: { clock, stored, edges: prev.edges + (edge ? 1 : 0) },
    outputs: stored ? new Map([['Q', stored]]) : null,
  }
}

function levelFixture({ pinSignals, previousState }) {
  const prev = previousState ?? { stored: null }
  const d = pinSignals.A
  const en = pinSignals.B
  let stored = prev.stored
  if (en === HIGH) stored = isLogic(d) ? d : null
  else if (en !== LOW) stored = isLogic(d) && d === prev.stored ? prev.stored : null
  return { state: { stored }, outputs: stored ? new Map([['Q', stored]]) : null }
}

const seen = []
const recording = fn => ctx => {
  seen.push({ uid: ctx.component.uid, t: ctx.currentTimeMs, pins: { ...ctx.pinSignals }, previousState: ctx.previousState })
  return fn(ctx)
}
afterEach(() => { seen.length = 0 })
const seenFor = uid => seen.filter(s => s.uid === uid)

function timedRegistry(extra = {}) {
  const table = new Map(getAllTimedDigitalContributionTypes().map(type => [type, getTimedDigitalContribution(type)]))
  table.set(EDGE_HOST, recording(extra.edge ?? edgeFixture))
  table.set(LEVEL_HOST, recording(extra.level ?? levelFixture))
  return createTimedDigitalContributionRegistry({ contributions: table })
}
function combinationalRegistry() {
  return createDigitalContributionRegistry({
    contributions: new Map(getAllDigitalContributionTypes()
      .filter(type => type !== EDGE_HOST && type !== LEVEL_HOST)
      .map(type => [type, getDigitalContribution(type)])),
  })
}

const comp = (uid, type) => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const rail = level => (level === HIGH ? '5V' : 'GND')
/** Wire `pin` of `uid` to POWER when the level is decisive, leave it unconnected (UNKNOWN) otherwise. */
const drive = (uid, pin, level) => (isLogic(level) ? [wire('p', rail(level), uid, pin)] : [])
const dff = (uid, d, clk) => [...drive(uid, 'A', d), ...drive(uid, 'B', clk)]

function session({ scheduler = createScheduler(), orchestrators = new Map() } = {}) {
  const timedDigitalStates = new Map()
  const options = {
    scheduler, orchestrators, timedDigitalStates,
    timedDigitalContributionRegistry: timedRegistry(),
    digitalContributionRegistry: combinationalRegistry(),
  }
  return {
    scheduler, orchestrators, timedDigitalStates, options,
    step: (components, wires, dt = SIMULATION_STEP_MS) => runSimulationStep(components, wires, { ...options, dt }).pinSignals,
  }
}

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

const permutations = list => [list, [...list].reverse(), [...list.slice(1), list[0]], [list[2], list[0], ...list.slice(3), list[1]].filter(Boolean)]

// --------------------------------------------------------------------------

describe('A9-SEQ-PREQ — registries and production isolation', () => {
  it('S1: fixtures are injectable tests-only through the existing timed registry factory', () => {
    const registry = timedRegistry()
    expect(registry.hasTimedDigitalContribution(EDGE_HOST)).toBe(true)
    expect(registry.hasTimedDigitalContribution(LEVEL_HOST)).toBe(true)
    expect(registry.hasTimedDigitalContribution('HC_SR04')).toBe(true)
    expect(hasTimedDigitalContribution(EDGE_HOST)).toBe(false)
    expect(hasTimedDigitalContribution(LEVEL_HOST)).toBe(false)
    expect(getAllTimedDigitalContributionTypes()).toEqual(['HC_SR04', 'JK_FLIP_FLOP_74HC73', 'D_FLIP_FLOP_74HC74'])
    expect(combinationalRegistry().hasDigitalContribution(EDGE_HOST)).toBe(false)
    expect(combinationalRegistry().hasDigitalContribution('AND_GATE')).toBe(true)
  })

  it('S2/S26: no sequential production type exists (canonical, palette, registries)', () => {
    for (const type of ['D_FLIP_FLOP', 'JK_FLIP_FLOP', 'SR_LATCH', 'COUNTER']) {
      expect(getCanonicalEntry(type)).toBeFalsy()
      expect(PALETTE_ITEMS).not.toContain(type)
      expect(hasDigitalContribution(type)).toBe(false)
      expect(hasTimedDigitalContribution(type)).toBe(false)
    }
    expect(getCanonicalEntry(EDGE_HOST).pins.map(p => p.id)).toEqual(['A', 'B', 'Q'])
    expect(getCanonicalEntry(LEVEL_HOST).pins.map(p => p.id)).toEqual(['A', 'B', 'Q'])
  })
})

describe('A9-SEQ-PREQ — edge-triggered storage', () => {
  it('S4-S8: LOW->LOW none, LOW->HIGH one, HIGH->HIGH none, HIGH->LOW re-arms, LOW->HIGH again; Q retained without edge', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('ff', EDGE_HOST)]
    const sequence = [
      // [D, CLK, expected edges, expected Q]
      [HIGH, LOW, 0, UNKNOWN],
      [HIGH, LOW, 0, UNKNOWN], // LOW -> LOW
      [HIGH, HIGH, 1, HIGH], // LOW -> HIGH captures D
      [LOW, HIGH, 1, HIGH], // HIGH -> HIGH: no retrigger, Q retained although D changed
      [LOW, LOW, 1, HIGH], // HIGH -> LOW: re-arm, Q retained
      [LOW, LOW, 1, HIGH], // retained without edge
      [LOW, HIGH, 2, LOW], // second rising edge captures new D
    ]
    for (const [d, clk, edges, q] of sequence) {
      const result = s.step(components, dff('ff', d, clk))
      expect(s.timedDigitalStates.get('ff').edges).toBe(edges)
      expect(result.get('ff:Q')).toBe(q)
    }
  })

  it('S9: deterministic initial state — previousState undefined, CLK HIGH at first step is not an edge', () => {
    const s = session()
    const result = s.step([comp('p', 'POWER'), comp('ff', EDGE_HOST)], dff('ff', HIGH, HIGH))
    expect(seenFor('ff')[0].previousState).toBeUndefined()
    expect(s.timedDigitalStates.get('ff')).toEqual({ clock: HIGH, stored: null, edges: 0 })
    expect(result.get('ff:Q')).toBe(UNKNOWN)
  })

  it('S10: runtime reset/recreation, component deletion/recreation and stop/resume follow the runtime store only', () => {
    const components = [comp('p', 'POWER'), comp('ff', EDGE_HOST)]
    const s = session()
    s.step(components, dff('ff', HIGH, LOW))
    expect(s.step(components, dff('ff', HIGH, HIGH)).get('ff:Q')).toBe(HIGH)

    // stop/resume: no call in between, same store => state retained.
    expect(s.step(components, dff('ff', LOW, HIGH), 0).get('ff:Q')).toBe(HIGH)

    // component deleted: store entry removed by the owner => no held output survives.
    s.timedDigitalStates.delete('ff')
    s.step([comp('p', 'POWER')], [])
    const recreated = s.step(components, dff('ff', HIGH, HIGH))
    expect(seenFor('ff').at(-1).previousState).toBeUndefined()
    expect(recreated.get('ff:Q')).toBe(UNKNOWN)

    // runtime recreated: fresh store + fresh scheduler => initial state, no hidden persistence.
    const fresh = session()
    expect(fresh.step(components, dff('ff', HIGH, HIGH)).get('ff:Q')).toBe(UNKNOWN)
    expect(seenFor('ff').at(-1).previousState).toBeUndefined()
    expect(fresh.scheduler.getCurrentTime()).toBe(SIMULATION_STEP_MS)

    // no store supplied at all => every step starts from the initial state.
    const opts = { timedDigitalContributionRegistry: timedRegistry(), digitalContributionRegistry: combinationalRegistry() }
    runSimulationStep(components, dff('ff', HIGH, LOW), opts)
    expect(runSimulationStep(components, dff('ff', HIGH, HIGH), opts).pinSignals.get('ff:Q')).toBe(UNKNOWN)
  })
})

describe('A9-SEQ-PREQ — level-sensitive storage', () => {
  it('EN HIGH follows D, EN LOW holds, same contract', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('lt', LEVEL_HOST)]
    const latch = (d, en) => [...drive('lt', 'A', d), ...drive('lt', 'B', en)]
    expect(s.step(components, latch(HIGH, LOW)).get('lt:Q')).toBe(UNKNOWN)
    expect(s.step(components, latch(HIGH, HIGH)).get('lt:Q')).toBe(HIGH)
    expect(s.step(components, latch(LOW, HIGH)).get('lt:Q')).toBe(LOW)
    expect(s.step(components, latch(HIGH, LOW)).get('lt:Q')).toBe(LOW)
    expect(s.step(components, latch(HIGH, LOW)).get('lt:Q')).toBe(LOW)
    expect(s.step(components, latch(HIGH, HIGH)).get('lt:Q')).toBe(HIGH)
    // EN undetermined: hold only when D agrees, never a phantom latch.
    expect(s.step(components, latch(HIGH, UNKNOWN)).get('lt:Q')).toBe(HIGH)
    expect(s.step(components, latch(LOW, UNKNOWN)).get('lt:Q')).toBe(UNKNOWN)
  })
})

describe('A9-SEQ-PREQ — UNKNOWN / FLOATING, no coercion', () => {
  const direct = (states, pins, t = 0) => computeTimedDigitalSignals(
    [comp('ff', EDGE_HOST)], timedRegistry(), new Map(Object.entries(pins).map(([pin, s]) => [`ff:${pin}`, s])), t, states)

  it.each([[UNKNOWN], [FLOATING]])('S11/S12: D %s at the edge is never stored as HIGH/LOW (Q not driven)', level => {
    const states = new Map()
    direct(states, { A: HIGH, B: LOW })
    expect(direct(states, { A: HIGH, B: HIGH }).get('ff:Q')).toBe(HIGH)
    direct(states, { A: HIGH, B: LOW })
    const out = direct(states, { A: level, B: HIGH })
    expect(states.get('ff')).toMatchObject({ stored: null, edges: 2 })
    expect(out.has('ff:Q')).toBe(false)
  })

  it.each([[UNKNOWN], [FLOATING]])('S13/S14/S15: CLK %s is neither LOW nor HIGH — no phantom edge', level => {
    const states = new Map()
    direct(states, { A: HIGH, B: level })
    direct(states, { A: HIGH, B: HIGH }) // X -> HIGH is not an edge
    direct(states, { A: HIGH, B: LOW })
    direct(states, { A: HIGH, B: level })
    direct(states, { A: HIGH, B: HIGH }) // LOW -> X -> HIGH is not an edge
    direct(states, { A: HIGH, B: level })
    direct(states, { A: LOW, B: level })
    expect(states.get('ff')).toMatchObject({ edges: 0, stored: null })
  })

  it('S11/S13 through the real step: unconnected D/CLK reach the producer as UNKNOWN, undriven Arduino pins stay non-logic', () => {
    const s = session()
    const orchestrator = createRuntimeOrchestrator({ scheduler: s.scheduler })
    s.orchestrators.set('ard', orchestrator)
    orchestrator.getRuntime().start()
    const components = [comp('p', 'POWER'), comp('ard', 'ARDUINO'), comp('ff', EDGE_HOST)]
    const wires = [wire('ard', 'D2', 'ff', 'B'), wire('ard', 'D3', 'ff', 'A')]
    const r1 = s.step(components, wires)
    const r2 = s.step(components, wires)
    expect(seenFor('ff').map(x => [x.pins.A, x.pins.B])).toEqual([[UNKNOWN, UNKNOWN], [UNKNOWN, UNKNOWN]])
    expect(r2.get('ard:D2')).toBe(FLOATING) // final resolution fallback on the undriven GPIO, never coerced
    expect(isLogic(r2.get('ff:B'))).toBe(false)
    expect(r1.get('ff:Q')).toBe(UNKNOWN)
    expect(r2.get('ff:Q')).toBe(UNKNOWN)
    expect(s.timedDigitalStates.get('ff').edges).toBe(0)
  })
})

describe('A9-SEQ-PREQ — sequential -> combinational', () => {
  it('S16/S17: Q_new -> NOT -> AND is propagated in the same step', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('ff', EDGE_HOST), comp('inv', 'NOT_GATE'), comp('and', 'AND_GATE')]
    const chain = [wire('ff', 'Q', 'inv', 'A'), wire('inv', 'Q', 'and', 'A'), wire('p', '5V', 'and', 'B')]
    let r = s.step(components, [...dff('ff', LOW, LOW), ...chain])
    expect([r.get('ff:Q'), r.get('inv:Q'), r.get('and:Q')]).toEqual([UNKNOWN, UNKNOWN, UNKNOWN])
    r = s.step(components, [...dff('ff', LOW, HIGH), ...chain])
    expect([r.get('ff:Q'), r.get('inv:Q'), r.get('and:Q')]).toEqual([LOW, HIGH, HIGH])
    s.step(components, [...dff('ff', HIGH, LOW), ...chain])
    r = s.step(components, [...dff('ff', HIGH, HIGH), ...chain])
    expect([r.get('ff:Q'), r.get('inv:Q'), r.get('and:Q')]).toEqual([HIGH, LOW, LOW])
  })
})

describe('A9-SEQ-PREQ — combinational -> sequential (S4 regression)', () => {
  it('S18: POWER -> AND -> D — the producer itself receives HIGH from AND and captures it on the edge', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('g', 'AND_GATE'), comp('ff', EDGE_HOST)]
    const wires = clk => [wire('p', '5V', 'g', 'A'), wire('p', '5V', 'g', 'B'), wire('g', 'Q', 'ff', 'A'), ...drive('ff', 'B', clk)]
    const r1 = s.step(components, wires(LOW))
    const r2 = s.step(components, wires(HIGH))
    expect(seenFor('ff').map(x => x.pins.A)).toEqual([HIGH, HIGH])
    expect(r1.get('ff:Q')).toBe(UNKNOWN)
    expect(r2.get('g:Q')).toBe(HIGH)
    expect(r2.get('ff:Q')).toBe(HIGH)
  })

  it('S18b: a LOW produced by a real gate is captured as LOW (not a default)', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('g', 'AND_GATE'), comp('ff', EDGE_HOST)]
    const wires = clk => [wire('p', '5V', 'g', 'A'), wire('p', 'GND', 'g', 'B'), wire('g', 'Q', 'ff', 'A'), ...drive('ff', 'B', clk)]
    s.step(components, wires(LOW))
    expect(s.step(components, wires(HIGH)).get('ff:Q')).toBe(LOW)
    expect(seenFor('ff').map(x => x.pins.A)).toEqual([LOW, LOW])
  })
})

describe('A9-SEQ-PREQ — sequential -> sequential (sample/commit simultaneity)', () => {
  function shiftRegister(order) {
    const s = session()
    const byUid = { p: comp('p', 'POWER'), ff1: comp('ff1', EDGE_HOST), ff2: comp('ff2', EDGE_HOST) }
    const components = order.map(uid => byUid[uid])
    const wires = (d1, clk) => [...dff('ff1', d1, clk), ...drive('ff2', 'B', clk), wire('ff1', 'Q', 'ff2', 'A')]
    const trace = []
    const record = r => trace.push([r.get('ff1:Q'), r.get('ff2:Q')])
    // preload FF1=LOW, FF2=LOW
    record(s.step(components, wires(LOW, LOW)))
    record(s.step(components, wires(LOW, HIGH))) // FF1<-LOW, FF2<-FF1 previous (none) => not driven
    record(s.step(components, wires(LOW, LOW)))
    record(s.step(components, wires(LOW, HIGH))) // FF1<-LOW, FF2<-LOW
    record(s.step(components, wires(HIGH, LOW)))
    record(s.step(components, wires(HIGH, HIGH))) // FF1<-HIGH, FF2<-FF1 previous = LOW
    const beforeEdge = trace.at(-1)
    record(s.step(components, wires(LOW, LOW)))
    record(s.step(components, wires(LOW, HIGH))) // FF1<-LOW, FF2<-FF1 previous = HIGH
    return { trace, beforeEdge, s }
  }

  it('S-SR: FF2 captures FF1.Q_previous, never FF1.Q_new, on the same edge', () => {
    const { trace, beforeEdge } = shiftRegister(['p', 'ff1', 'ff2'])
    expect(trace[1]).toEqual([LOW, UNKNOWN])
    expect(trace[3]).toEqual([LOW, LOW])
    expect(beforeEdge).toEqual([HIGH, LOW])
    expect(trace.at(-1)).toEqual([LOW, HIGH])
  })

  it('S19: shift register is independent of component order', () => {
    const reference = shiftRegister(['p', 'ff1', 'ff2']).trace
    for (const order of [['ff2', 'ff1', 'p'], ['ff2', 'p', 'ff1'], ['ff1', 'p', 'ff2']]) {
      expect(shiftRegister(order).trace).toEqual(reference)
    }
  })

  it('S-LOOP: Q_previous -> NOT -> D toggles deterministically on each edge, independent of order', () => {
    const run = order => {
      const s = session()
      const byUid = { p: comp('p', 'POWER'), ff: comp('ff', EDGE_HOST), inv: comp('inv', 'NOT_GATE') }
      const components = order.map(uid => byUid[uid])
      const loop = clk => [wire('ff', 'Q', 'inv', 'A'), wire('inv', 'Q', 'ff', 'A'), ...drive('ff', 'B', clk)]
      // seed Q=LOW with a direct D once, then close the loop
      s.step(components, dff('ff', LOW, LOW))
      s.step(components, dff('ff', LOW, HIGH))
      const trace = []
      for (const clk of [LOW, HIGH, LOW, HIGH, HIGH, LOW, HIGH]) {
        const r = s.step(components, loop(clk))
        trace.push([r.get('ff:Q'), r.get('ff:A')])
      }
      return trace
    }
    const reference = run(['p', 'ff', 'inv'])
    expect(reference).toEqual([
      [LOW, HIGH], [HIGH, LOW], [HIGH, LOW], [LOW, HIGH], [LOW, HIGH], [LOW, HIGH], [HIGH, LOW],
    ])
    for (const order of [['inv', 'ff', 'p'], ['ff', 'p', 'inv']]) expect(run(order)).toEqual(reference)
  })
})

describe('A9-SEQ-PREQ — order independence', () => {
  it('S19: combinational -> sequential -> combinational circuit gives identical results under permutations', () => {
    const base = [comp('p', 'POWER'), comp('g', 'OR_GATE'), comp('ff', EDGE_HOST), comp('inv', 'NOT_GATE'), comp('and', 'AND_GATE')]
    const wires = (a, clk) => [
      ...drive('g', 'A', a), wire('p', 'GND', 'g', 'B'), wire('g', 'Q', 'ff', 'A'), ...drive('ff', 'B', clk),
      wire('ff', 'Q', 'inv', 'A'), wire('inv', 'Q', 'and', 'A'), wire('p', '5V', 'and', 'B'),
    ]
    const run = components => {
      const s = session()
      return [[HIGH, LOW], [HIGH, HIGH], [LOW, LOW], [LOW, HIGH], [HIGH, HIGH]]
        .map(([a, clk]) => [...s.step(components, wires(a, clk))].sort(([x], [y]) => x.localeCompare(y)))
    }
    const reference = run(base)
    expect(reference[1].find(([k]) => k === 'and:Q')[1]).toBe(LOW)
    expect(reference[3].find(([k]) => k === 'and:Q')[1]).toBe(HIGH)
    for (const order of permutations(base)) expect(run(order)).toEqual(reference)
  })
})

describe('A9-SEQ-PREQ — Arduino coexistence', () => {
  function arduinoSession() {
    const s = session()
    const orchestrator = createRuntimeOrchestrator({ scheduler: s.scheduler })
    s.orchestrators.set('ard', orchestrator)
    const runtime = orchestrator.getRuntime()
    runtime.start()
    return { ...s, runtime }
  }

  it('S21: Arduino GPIO -> CLK and D of a sequential fixture, one Scheduler, one Runtime', () => {
    const s = arduinoSession()
    const components = [comp('ard', 'ARDUINO'), comp('ff', EDGE_HOST)]
    const wires = [wire('ard', 'D2', 'ff', 'B'), wire('ard', 'D3', 'ff', 'A')]
    const advance = vi.spyOn(s.scheduler, 'advance')
    const tick = vi.spyOn(s.runtime, 'tick')
    const schedulersBefore = createScheduler.mock.calls.length
    const script = [[HIGH, LOW, UNKNOWN], [HIGH, HIGH, HIGH], [LOW, HIGH, HIGH], [LOW, LOW, HIGH], [LOW, HIGH, LOW]]
    for (const [d, clk, q] of script) {
      s.runtime.digitalWrite('D3', d)
      s.runtime.digitalWrite('D2', clk)
      const r = s.step(components, wires)
      expect(seenFor('ff').at(-1).pins).toMatchObject({ A: d, B: clk })
      expect(r.get('ff:Q')).toBe(q)
    }
    expect(SIMULATION_STEP_MS).toBe(16)
    expect(advance).toHaveBeenCalledTimes(script.length)
    expect(tick).toHaveBeenCalledTimes(script.length)
    expect(s.orchestrators.size).toBe(1)
    expect(createScheduler.mock.calls.length).toBe(schedulersBefore)
    expect(seenFor('ff').map(x => x.t)).toEqual(script.map((_, i) => (i + 1) * SIMULATION_STEP_MS))
    expect(s.scheduler.getCurrentTime()).toBe(script.length * SIMULATION_STEP_MS)
  })

  it('S21b: Arduino GPIO keeps authority on its own pin; the sequential Q drives a gate in the same step', () => {
    const s = arduinoSession()
    const components = [comp('ard', 'ARDUINO'), comp('ff', EDGE_HOST), comp('inv', 'NOT_GATE')]
    const wires = [wire('ard', 'D2', 'ff', 'B'), wire('ard', 'D3', 'ff', 'A'), wire('ff', 'Q', 'inv', 'A')]
    s.runtime.digitalWrite('D3', HIGH)
    s.runtime.digitalWrite('D2', LOW)
    s.step(components, wires)
    s.runtime.digitalWrite('D2', HIGH)
    const r = s.step(components, wires)
    expect([r.get('ard:D2'), r.get('ard:D3'), r.get('ff:Q'), r.get('inv:Q')]).toEqual([HIGH, HIGH, HIGH, LOW])
  })
})

describe('A9-SEQ-PREQ — HC_SR04 coexistence and non-regression', () => {
  const HC_WIRES = trig => [wire('p', '5V', 'hc', 'VCC'), wire('p', 'GND', 'hc', 'GND'), ...drive('hc', 'TRIG', trig)]
  // [TRIG, dt]: pulse, hold (no retrigger), end of pulse, re-arm, new pulse, unpowered below.
  const SCRIPT = [[HIGH, 1], [HIGH, 1], [HIGH, 5], [HIGH, 1], [LOW, 1], [HIGH, 1], [HIGH, 2.5], [HIGH, 3]]

  /** Historical A7-C5 context: HC_SR04 fed by resolveSourceDrivenPinSignals(components, prepared) only. */
  function historicalEcho(components, wiresFor) {
    const states = new Map()
    const scheduler = createScheduler()
    const registry = createTimedDigitalContributionRegistry({ contributions: new Map([['HC_SR04', getTimedDigitalContribution('HC_SR04')]]) })
    return SCRIPT.map(([trig, dt]) => {
      const wires = wiresFor(trig)
      const prepared = prepareCircuit(components, wires)
      scheduler.advance(dt)
      const hc = components.find(c => c.uid === 'hc')
      const out = computeTimedDigitalSignals([hc], registry, resolveSourceDrivenPinSignals(components, prepared), scheduler.getCurrentTime(), states)
      return [out.get('hc:ECHO'), { ...states.get('hc') }]
    })
  }

  function newEcho(components, wiresFor) {
    const s = session()
    return SCRIPT.map(([trig, dt]) => {
      const r = s.step(components, wiresFor(trig), dt)
      return [r.get('hc:ECHO'), { ...s.timedDigitalStates.get('hc') }]
    })
  }

  it('HC-1: HC_SR04 alone — identical inputs give identical ECHO and state to the historical context', () => {
    const components = [comp('p', 'POWER'), comp('hc', 'HC_SR04')]
    const expected = historicalEcho(components, HC_WIRES)
    expect(newEcho(components, HC_WIRES)).toEqual(expected)
    // 100 cm * 0.058 = 5.8 ms. t=1 edge (end 6.8), t=2 HIGH, t=7 end, t=8 held HIGH: no retrigger,
    // t=9 LOW re-arms, t=10 new edge (end 15.8), t=12.5 and t=15.5 still HIGH.
    expect(expected.map(([echo]) => echo)).toEqual([HIGH, HIGH, LOW, LOW, LOW, HIGH, HIGH, HIGH])
    expect(expected[0][1].phase).toBe('MEASURING')
    expect(expected[0][1].echoEndMs).toBeCloseTo(6.8, 9)
    expect(expected[5][1].echoEndMs).toBeCloseTo(15.8, 9)
  })

  it('HC-2: the producer observes exactly the historical input pins; only its own output pin shows its previous output', () => {
    const components = [comp('p', 'POWER'), comp('hc', 'HC_SR04')]
    const observed = []
    const spyRegistry = createTimedDigitalContributionRegistry({
      contributions: new Map([['HC_SR04', ctx => { observed.push({ ...ctx.pinSignals }); return getTimedDigitalContribution('HC_SR04')(ctx) }]]),
    })
    const states = new Map()
    let previousEcho = UNKNOWN
    for (const [trig] of SCRIPT) {
      const wires = HC_WIRES(trig)
      const r = runSimulationStep(components, wires, { timedDigitalContributionRegistry: spyRegistry, timedDigitalStates: states, dt: 1 })
      const prepared = prepareCircuit(components, wires)
      const historical = resolveSourceDrivenPinSignals(components, prepared)
      const { ECHO, ...inputs } = observed.at(-1)
      expect(inputs).toEqual(Object.fromEntries(['VCC', 'TRIG', 'GND'].map(pin => [pin, historical.get(`hc:${pin}`)])))
      expect(historical.get('hc:ECHO')).toBe(UNKNOWN)
      expect(ECHO).toBe(previousEcho) // held output of the previous step, never the current one
      previousEcho = r.pinSignals.get('hc:ECHO')
    }
  })

  it('HC-3: unpowered HC_SR04 never produces ECHO and keeps its state', () => {
    const s = session()
    const components = [comp('p', 'POWER'), comp('hc', 'HC_SR04')]
    const r = s.step(components, drive('hc', 'TRIG', HIGH), 1)
    expect(r.get('hc:ECHO')).toBe(UNKNOWN)
    expect(s.timedDigitalStates.get('hc')).toBeUndefined()
  })

  it('S20: HC_SR04 + sequential fixture + gates share one runtime without state/pin collision, HC_SR04 results unchanged', () => {
    const components = [comp('p', 'POWER'), comp('hc', 'HC_SR04'), comp('ff', EDGE_HOST), comp('g', 'AND_GATE')]
    const withFf = trig => [...HC_WIRES(trig), wire('hc', 'ECHO', 'ff', 'A'), ...drive('ff', 'B', trig === HIGH ? HIGH : LOW), wire('ff', 'Q', 'g', 'A'), wire('p', '5V', 'g', 'B')]
    const expected = historicalEcho([comp('p', 'POWER'), comp('hc', 'HC_SR04')], HC_WIRES)
    const s = session()
    const advance = vi.spyOn(s.scheduler, 'advance')
    const trace = SCRIPT.map(([trig, dt]) => {
      const r = s.step(components, withFf(trig), dt)
      return { echo: r.get('hc:ECHO'), hcState: { ...s.timedDigitalStates.get('hc') }, ffQ: r.get('ff:Q'), g: r.get('g:Q') }
    })
    expect(trace.map(x => [x.echo, x.hcState])).toEqual(expected)
    expect([...s.timedDigitalStates.keys()].sort()).toEqual(['ff', 'hc'])
    expect(advance).toHaveBeenCalledTimes(SCRIPT.length)
    // FF samples ECHO of the PREVIOUS step at its CLK edge (step 6: LOW->HIGH, previous ECHO = LOW).
    expect(trace[5].ffQ).toBe(LOW)
    expect(trace[5].g).toBe(LOW)
  })

  it('HC-4: Arduino GPIO -> HC_SR04 TRIG is now observable, with the same model', () => {
    const s = session()
    const orchestrator = createRuntimeOrchestrator({ scheduler: s.scheduler })
    s.orchestrators.set('ard', orchestrator)
    const runtime = orchestrator.getRuntime()
    runtime.start()
    const components = [comp('p', 'POWER'), comp('ard', 'ARDUINO'), comp('hc', 'HC_SR04')]
    const wires = [wire('p', '5V', 'hc', 'VCC'), wire('p', 'GND', 'hc', 'GND'), wire('ard', 'D2', 'hc', 'TRIG')]
    runtime.digitalWrite('D2', LOW)
    expect(s.step(components, wires, 1).get('hc:ECHO')).toBe(LOW)
    runtime.digitalWrite('D2', HIGH)
    expect(s.step(components, wires, 1).get('hc:ECHO')).toBe(HIGH)
    expect(s.timedDigitalStates.get('hc').phase).toBe('MEASURING')
    expect(s.timedDigitalStates.get('hc').echoEndMs).toBeCloseTo(7.8, 9)
  })
})

describe('A9-SEQ-PREQ — single authorities and architecture', () => {
  it('S22: one Scheduler advance, one producer evaluation and exactly one resolveSignals() per step', () => {
    const s = session()
    const advance = vi.spyOn(s.scheduler, 'advance')
    const schedulersBefore = createScheduler.mock.calls.length
    const components = [comp('p', 'POWER'), comp('g', 'AND_GATE'), comp('ff', EDGE_HOST), comp('inv', 'NOT_GATE')]
    const wires = clk => [wire('p', '5V', 'g', 'A'), wire('p', '5V', 'g', 'B'), wire('g', 'Q', 'ff', 'A'), ...drive('ff', 'B', clk), wire('ff', 'Q', 'inv', 'A')]
    for (const [i, clk] of [LOW, HIGH, LOW].entries()) {
      s.step(components, wires(clk))
      expect(resolveSignals).toHaveBeenCalledTimes(i + 1)
      expect(advance).toHaveBeenCalledTimes(i + 1)
      expect(seenFor('ff')).toHaveLength(i + 1)
    }
    expect(createScheduler.mock.calls.length).toBe(schedulersBefore)
    expect(seenFor('ff').map(x => x.t)).toEqual([16, 32, 48])
  })

  it('S23: no wall-clock API is used by the step or the generic files', () => {
    const now = vi.spyOn(Date, 'now')
    const perf = vi.spyOn(globalThis.performance, 'now')
    const s = session()
    const components = [comp('p', 'POWER'), comp('ff', EDGE_HOST)]
    s.step(components, dff('ff', HIGH, LOW))
    s.step(components, dff('ff', HIGH, HIGH))
    expect(now).not.toHaveBeenCalled()
    expect(perf).not.toHaveBeenCalled()
    for (const file of ['../simulationRuntimeIntegration.js', '../timedDigitalContributionRegistry.js']) {
      const code = readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    }
  })

  it('S3/S24: Document inputs are never mutated; sequential state lives only in the runtime store', () => {
    const s = session()
    const components = freeze([comp('p', 'POWER'), comp('g', 'AND_GATE'), comp('ff', EDGE_HOST)])
    const wiresLow = freeze([wire('p', '5V', 'g', 'A'), wire('p', '5V', 'g', 'B'), wire('g', 'Q', 'ff', 'A'), wire('p', 'GND', 'ff', 'B')])
    const wiresHigh = freeze([...wiresLow.slice(0, 3), wire('p', '5V', 'ff', 'B')])
    const before = JSON.stringify([components, wiresLow, wiresHigh])
    s.step(components, wiresLow)
    expect(s.step(components, wiresHigh).get('ff:Q')).toBe(HIGH)
    expect(JSON.stringify([components, wiresLow, wiresHigh])).toBe(before)
    for (const c of components) {
      expect(c).not.toHaveProperty('state')
      expect(c).not.toHaveProperty('parameters')
    }
    expect(s.timedDigitalStates.get('ff')).toMatchObject({ stored: HIGH })
  })

  it('S25: the generic step does not reach History/Mutation/Document modules', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../timedDigitalContributionRegistry.js']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
      for (const path of imports) expect(path).not.toMatch(/history|mutation|document|localStorage|react/i)
      expect(source).not.toMatch(/localStorage|HistoryManager|HistoryService/)
    }
  })

  it('S27: generic files carry no knowledge of future sequential types', () => {
    // A9-JK1 : timedDigitalContributionRegistry.js et canonicalRegistry.js sont les points
    // d'extension DÉCLARATIFS où un type séquentiel réel (JK_FLIP_FLOP_74HC73) est enregistré ;
    // les fichiers du moteur générique restent sans aucune connaissance séquentielle.
    const generic = ['engine.js', 'resolution.js', 'preparation.js', 'clock.js', 'scheduler.js', 'runtimeOrchestrator.js',
      'simulationRuntimeIntegration.js', 'digitalContributionRegistry.js']
    for (const file of generic) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(/FLIP_?FLOP|SR_LATCH|JK_|D_LATCH|\bCOUNTER\b|flip-?flop/i)
    }
    const code = readFileSync(new URL('../simulationRuntimeIntegration.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const comparison of code.match(/\.type\s*(===|!==)\s*["'][A-Z_]+["']/g) ?? []) expect(comparison).toMatch(/ARDUINO/)
  })
})
