import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals, resolveSourceDrivenVoltageFacts } from '../resolution.js'
import {
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  runSimulationStep,
  circuitRequiresContinuousStepping,
  computeMixedSignalContributions,
} from '../simulationRuntimeIntegration.js'
import { runSimulation } from '../engine.js'
import {
  createMixedSignalContributionRegistry,
  getAllMixedSignalContributionTypes,
  hasMixedSignalContribution,
} from '../mixedSignalContributionRegistry.js'
import { createTimedDigitalContributionRegistry } from '../timedDigitalContributionRegistry.js'
import { createScheduler } from '../scheduler.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP4-PREQ3 — generic stateful mixed-signal step contract (T1..T26 + guards).
 * FAKE fixture types only (MS_FIXTURE_*), injected through vi.mock of the
 * canonical Registry and an isolated mixed-signal Registry : no production type
 * is registered or used as a functional fixture.
 */
const { FIXTURE_PINS, resolutions } = vi.hoisted(() => ({
  FIXTURE_PINS: ['vcc', 'gnd', 'in', 'dout', 'vout', 'sw'],
  resolutions: [],
}))

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return {
    ...actual,
    getCanonicalEntry: (type) => typeof type === 'string' && type.startsWith('MS_FIXTURE')
      ? { pins: FIXTURE_PINS.map((id) => ({ id })), modelAvailable: true, defaultParameters: { level: 2.5 },
        parameterSchema: [{ key: 'level', minimum: 0 }] }
      : actual.getCanonicalEntry(type),
  }
})
// ONE RESOLUTION probe: every resolveSignals() call made by the runtime integration is recorded.
vi.mock('../resolution.js', async (original) => {
  const actual = await original()
  return {
    ...actual,
    resolveSignals: (...args) => {
      const result = actual.resolveSignals(...args)
      resolutions.push({ args, result })
      return result
    },
  }
})

const here = dirname(fileURLToPath(import.meta.url))
const source = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid, voltage = 5) => ({ uid, type: 'POWER', parameters: { voltage } })
const fixture = (uid, type = 'MS_FIXTURE_A') => ({ uid, type })
const registryOf = (contributions) => createMixedSignalContributionRegistry({ contributions: new Map(Object.entries(contributions)) })
const counter = (log = []) => ({
  digitalOutputPins: ['dout'], voltageOutputPins: ['vout'], voltageReferencePin: 'gnd',
  contribute: (ctx) => {
    log.push(ctx)
    return { state: { n: (ctx.previousState?.n ?? 0) + 1 } }
  },
})
/** Powered fixture `ms` : vcc on p:5V, gnd on p:GND. */
const powered = (extra = {}) => ({
  components: [power('p'), fixture('ms'), ...(extra.components ?? [])],
  wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), ...(extra.wires ?? [])],
})
const step = (circuit, registry, options = {}) =>
  runSimulationStep(circuit.components, circuit.wires, { dt: 16, mixedSignalContributionRegistry: registry, ...options })
const lastResolution = () => resolutions[resolutions.length - 1]
const domain = (key) => lastResolution().result.dcVoltageDomains.get(key)

beforeEach(() => { resolutions.length = 0 })

describe('A11-COMP4-PREQ3 — registry, state, time', () => {
  it('T1 an injected fake contributor is discovered through the Registry (Open/Closed); no FIXTURE in the production table', () => {
    const log = []
    step(powered(), registryOf({ MS_FIXTURE_A: counter(log) }))
    expect(log).toHaveLength(1)
    expect(log[0].component.uid).toBe('ms')
    // A11-COMP4 : the production table gains its first real entry (NE555P) ; never a fixture type.
    expect(getAllMixedSignalContributionTypes()).toEqual(['NE555P'])
    expect(hasMixedSignalContribution('MS_FIXTURE_A')).toBe(false)
    expect(circuitRequiresContinuousStepping([fixture('ms')])).toBe(false)
    expect(circuitRequiresContinuousStepping([fixture('ms')], undefined, undefined, registryOf({ MS_FIXTURE_A: counter() }))).toBe(true)
    expect(() => registryOf({ MS_FIXTURE_A: { voltageOutputPins: ['vout'], contribute: () => ({}) } })).toThrow(/voltageReferencePin/)
    expect(() => registryOf({ MS_FIXTURE_A: { contribute: 1 } })).toThrow(/contribute/)
  })

  it('T2 a contributor receives dt, currentTimeMs, previousState (and only its documented context)', () => {
    const log = []
    step(powered(), registryOf({ MS_FIXTURE_A: counter(log) }), { dt: 7, scheduler: createScheduler() })
    expect(Object.keys(log[0]).sort()).toEqual(['component', 'currentTimeMs', 'dt', 'params', 'pinSignals', 'pinVoltages', 'previousState'])
    expect(log[0].dt).toBe(7)
    expect(log[0].currentTimeMs).toBe(7)
    expect(log[0].previousState).toBeUndefined()
    expect(log[0].params).toEqual({ level: 2.5 })
  })

  it('T3 state produced at step n is previousState at step n+1 (runtime session)', () => {
    const log = []
    const session = createSimulationRuntimeSession()
    const registry = registryOf({ MS_FIXTURE_A: counter(log) })
    for (let i = 0; i < 3; i++) step(powered(), registry, { runtimeSession: session })
    expect(log.map((ctx) => ctx.previousState)).toEqual([undefined, { n: 1 }, { n: 2 }])
    expect(log.map((ctx) => ctx.currentTimeMs)).toEqual([16, 32, 48])
    expect(session.mixedSignalStates.get('ms')).toEqual({ n: 3 })
    expect(Object.isFrozen(session.mixedSignalStates.get('ms'))).toBe(true)
  })

  it('T4 reset / new session / retain: no historical state survives', () => {
    const log = []
    const registry = registryOf({ MS_FIXTURE_A: counter(log) })
    const session = createSimulationRuntimeSession()
    step(powered(), registry, { runtimeSession: session })
    resetSimulationRuntimeSession(session)
    expect(session.mixedSignalStates.size).toBe(0)
    expect(session.scheduler).toBeNull()
    step(powered(), registry, { runtimeSession: session })
    step(powered(), registry, { runtimeSession: createSimulationRuntimeSession() })
    expect(log.map((ctx) => [ctx.previousState, ctx.currentTimeMs])).toEqual([[undefined, 16], [undefined, 16], [undefined, 16]])
    retainSimulationRuntimeSessionUids(session, new Set(['other']))
    expect(session.mixedSignalStates.has('ms')).toBe(false)
  })

  it('T18 several contributors share ONE Scheduler advance and the exact same currentTimeMs / dt', () => {
    const log = []
    const scheduler = createScheduler()
    const circuit = { components: [fixture('a'), fixture('b'), fixture('c', 'MS_FIXTURE_B')], wires: [] }
    step(circuit, registryOf({ MS_FIXTURE_A: counter(log), MS_FIXTURE_B: counter(log) }), { scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
    expect(log.map((ctx) => [ctx.component.uid, ctx.currentTimeMs, ctx.dt])).toEqual([['a', 16, 16], ['b', 16, 16], ['c', 16, 16]])
  })
})

describe('A11-COMP4-PREQ3 — SAMPLE snapshot and COMMIT', () => {
  it('T5 two contributors observe the same pre-commit snapshot state[n-1]', () => {
    const states = new Map()
    const peeks = []
    const registry = registryOf({
      MS_FIXTURE_A: {
        contribute: ({ component, previousState }) => {
          // Test-side peek at the store: nothing of this step is published during SAMPLE.
          peeks.push({ uid: component.uid, store: Object.fromEntries(states) })
          return { state: { step: (previousState?.step ?? 0) + 1, uid: component.uid } }
        },
      },
    })
    const circuit = { components: [fixture('a'), fixture('b')], wires: [] }
    step(circuit, registry, { mixedSignalStates: states })
    step(circuit, registry, { mixedSignalStates: states })
    expect(peeks[0].store).toEqual({})
    expect(peeks[1].store).toEqual({})
    const previous = { a: { step: 1, uid: 'a' }, b: { step: 1, uid: 'b' } }
    expect(peeks[2].store).toEqual(previous)
    expect(peeks[3].store).toEqual(previous)
    expect(Object.fromEntries(states)).toEqual({ a: { step: 2, uid: 'a' }, b: { step: 2, uid: 'b' } })
  })

  it('T6 reversing the component order changes no observable result', () => {
    const behaviour = {
      digitalOutputPins: ['dout'], voltageOutputPins: ['vout'], voltageReferencePin: 'gnd',
      contribute: ({ component, previousState, pinVoltages }) => ({
        state: { n: (previousState?.n ?? 0) + 1 },
        effects: {
          digitalOutputs: { dout: component.uid === 'a' ? Signal.HIGH : Signal.LOW },
          voltageOutputs: { vout: (pinVoltages.vcc?.voltage ?? 0) / 2 },
          conductionPairs: component.uid === 'b' ? [['sw', 'gnd']] : [],
        },
      }),
    }
    const build = (order) => {
      const components = [power('p'), fixture('a'), fixture('b'), { uid: 'r', type: 'RESISTOR' }]
      const wires = ['a', 'b'].flatMap((uid) => [wire('p', '5V', uid, 'vcc'), wire('p', 'GND', uid, 'gnd')])
        .concat([wire('p', '5V', 'r', 'A'), wire('r', 'B', 'b', 'sw')])
      return { components: order === 'reverse' ? [...components].reverse() : components, wires }
    }
    const run = (order) => {
      const states = new Map()
      const registry = registryOf({ MS_FIXTURE_A: behaviour })
      const results = [step(build(order), registry, { mixedSignalStates: states }), step(build(order), registry, { mixedSignalStates: states })]
      const sorted = (map) => [...map].sort(([x], [y]) => x.localeCompare(y))
      return {
        results: results.map(({ pinSignals, electricalAnalysis }) => [sorted(pinSignals), sorted(electricalAnalysis)]),
        domains: sorted(lastResolution().result.dcVoltageDomains),
        states: sorted(states),
      }
    }
    expect(run('reverse')).toEqual(run('forward'))
  })

  it('T26 a refused effect or composition commits no new state (atomic step)', () => {
    const states = new Map()
    let failing = false
    const registry = registryOf({
      MS_FIXTURE_A: { digitalOutputPins: ['dout'], contribute: ({ previousState }) => ({ state: { n: (previousState?.n ?? 0) + 1 } }) },
      MS_FIXTURE_B: {
        digitalOutputPins: ['dout'],
        contribute: ({ previousState }) => ({ state: { n: (previousState?.n ?? 0) + 1 },
          effects: failing ? { digitalOutputs: { vout: Signal.HIGH } } : {} }),
      },
    })
    const circuit = { components: [fixture('a'), fixture('b', 'MS_FIXTURE_B')], wires: [] }
    step(circuit, registry, { mixedSignalStates: states })
    failing = true
    expect(() => step(circuit, registry, { mixedSignalStates: states })).toThrow(/not one of its declared digitalOutputPins/)
    expect(Object.fromEntries(states)).toEqual({ a: { n: 1 }, b: { n: 1 } })

    // Composition refusal after SAMPLE (collision with another producer family): still nothing committed.
    const colliding = registryOf({ MS_FIXTURE_A: { digitalOutputPins: ['dout'],
      contribute: ({ previousState }) => ({ state: { n: (previousState?.n ?? 0) + 1 }, effects: { digitalOutputs: { dout: Signal.HIGH } } }) } })
    const timed = createTimedDigitalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A',
      () => ({ state: undefined, outputs: new Map([['dout', Signal.LOW]]) })]]) })
    const own = new Map([['a', Object.freeze({ n: 5 })]])
    expect(() => step({ components: [fixture('a')], wires: [] }, colliding, { mixedSignalStates: own, timedDigitalContributionRegistry: timed }))
      .toThrow(/more than one independent signal source/)
    expect(Object.fromEntries(own)).toEqual({ a: { n: 5 } })
  })

  it('computeMixedSignalContributions itself never writes the store (SAMPLE only)', () => {
    const states = new Map([['a', Object.freeze({ n: 1 })]])
    const out = computeMixedSignalContributions([fixture('a')], registryOf({ MS_FIXTURE_A: counter() }),
      { pinSignals: new Map(), voltageFacts: new Map() }, 16, 16, states)
    expect(Object.fromEntries(states)).toEqual({ a: { n: 1 } })
    expect(Object.fromEntries(out.states)).toEqual({ a: { n: 2 } })
    expect(Object.isFrozen(out.electricalAuthorities)).toBe(true)
  })
})

describe('A11-COMP4-PREQ3 — pre-resolution context', () => {
  const inputs = (wires, components = []) => {
    const log = []
    step(powered({ components, wires }), registryOf({ MS_FIXTURE_A: counter(log) }))
    return log[0]
  }

  it('T7 pinSignals project the digital pre-resolution context', () => {
    const ctx = inputs([])
    expect(ctx.pinSignals).toEqual({ vcc: Signal.HIGH, gnd: Signal.LOW, in: Signal.UNKNOWN, dout: Signal.UNKNOWN, vout: Signal.UNKNOWN, sw: Signal.UNKNOWN })
  })

  it('T8 pinVoltages project DC-source numeric facts with an explicit shared reference', () => {
    const ctx = inputs([wire('q', '5V', 'ms', 'in'), wire('q', 'GND', 'p', 'GND')], [power('q', 3)])
    expect(ctx.pinVoltages.vcc.voltage).toBe(5)
    expect(ctx.pinVoltages.gnd.voltage).toBe(0)
    expect(ctx.pinVoltages.in.voltage).toBe(3)
    const reference = ctx.pinVoltages.gnd.reference
    expect(typeof reference).toBe('string')
    expect([ctx.pinVoltages.vcc.reference, ctx.pinVoltages.in.reference]).toEqual([reference, reference])
  })

  it('T9 no numeric fact is invented: unconnected pins and pins behind a passive part are absent', () => {
    const ctx = inputs([wire('p', '5V', 'r', 'A'), wire('r', 'B', 'ms', 'in')], [{ uid: 'r', type: 'RESISTOR' }])
    expect(Object.keys(ctx.pinVoltages).sort()).toEqual(['gnd', 'vcc'])
    expect(ctx.pinVoltages.in).toBeUndefined()
    const unpowered = []
    step({ components: [fixture('ms')], wires: [] }, registryOf({ MS_FIXTURE_A: counter(unpowered) }))
    expect(unpowered[0].pinVoltages).toEqual({})
  })

  it('T10 conflicting source facts give null, never an arbitrary voltage', () => {
    const ctx = inputs([wire('q', '5V', 'ms', 'in'), wire('q', 'GND', 'p', 'GND'), wire('s', '5V', 'ms', 'in'), wire('s', 'GND', 'p', 'GND')],
      [power('q', 3), power('s', 9)])
    expect(ctx.pinVoltages.in).toBeNull()
    expect(ctx.pinVoltages.vcc.voltage).toBe(5)
  })

  it('resolveSourceDrivenVoltageFacts is pure and never mutates prepared', () => {
    const circuit = powered()
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const snapshot = JSON.stringify([[...prepared.nets], prepared.allKeys])
    const facts = resolveSourceDrivenVoltageFacts(circuit.components, prepared)
    expect(facts.get('ms:vcc').voltage).toBe(5)
    expect(JSON.stringify([[...prepared.nets], prepared.allKeys])).toBe(snapshot)
  })
})

describe('A11-COMP4-PREQ3 — effects in the ONE resolution', () => {
  const emitter = (effects, extra = {}) => registryOf({ MS_FIXTURE_A: {
    digitalOutputPins: ['dout'], voltageOutputPins: ['vout'], voltageReferencePin: 'gnd', ...extra,
    contribute: (ctx) => ({ state: null, effects: typeof effects === 'function' ? effects(ctx) : effects }),
  } })

  it('T11 digitalOutputs participate in the one resolution (net propagation)', () => {
    const circuit = powered({ components: [{ uid: 'r', type: 'RESISTOR' }], wires: [wire('ms', 'dout', 'r', 'A')] })
    const { pinSignals } = step(circuit, emitter({ digitalOutputs: new Map([['dout', Signal.HIGH]]) }))
    expect(pinSignals.get('ms:dout')).toBe(Signal.HIGH)
    expect(pinSignals.get('r:A')).toBe(Signal.HIGH)
    expect(resolutions).toHaveLength(1)
    expect(lastResolution().args[2].get('ms:dout')).toBe(Signal.HIGH)
  })

  it('T12 two producers of the same pin fail explicitly (never last-write-wins); undeclared or invalid outputs are refused', () => {
    const timed = createTimedDigitalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A',
      () => ({ state: undefined, outputs: new Map([['dout', Signal.LOW]]) })]]) })
    expect(() => step(powered(), emitter({ digitalOutputs: { dout: Signal.HIGH } }), { timedDigitalContributionRegistry: timed }))
      .toThrow(/more than one independent signal source/)
    expect(() => step(powered(), emitter({ digitalOutputs: { vout: Signal.HIGH } }))).toThrow(/not one of its declared digitalOutputPins/)
    expect(() => step(powered(), emitter({ digitalOutputs: { dout: 'MAYBE' } }))).toThrow(/invalid digital level/)
    expect(() => step(powered(), emitter({ voltageOutputs: { dout: 1 } }))).toThrow(/not one of its declared voltageOutputPins/)
    expect(() => step(powered(), emitter({}, { digitalOutputPins: ['ghost'] }))).toThrow(/not one of its canonical pins/)
    expect(resolutions).toHaveLength(0)
  })

  it('T13 voltageOutputs participate in the one electrical resolution (numeric, never HIGH/LOW)', () => {
    const circuit = powered({ components: [{ uid: 'r', type: 'RESISTOR' }], wires: [wire('ms', 'vout', 'r', 'A'), wire('r', 'B', 'p', 'GND')] })
    const { pinSignals, electricalAnalysis } = step(circuit, emitter(({ params }) => ({ voltageOutputs: { vout: params.level } })))
    expect(resolutions).toHaveLength(1)
    expect(domain('ms:vout')).toEqual({ voltage: 2.5, reference: domain('p:GND').reference })
    expect(domain('r:A').voltage).toBe(2.5)
    expect(electricalAnalysis.get('r').voltage).toBe(2.5)
    // Never converted to HIGH/LOW: the digital result is exactly the one without the authority.
    const baseline = step(circuit, emitter({}))
    expect(pinSignals).toEqual(baseline.pinSignals)
    expect(baseline.electricalAnalysis.get('r')).toBeUndefined()
  })

  it('T14 an invalid electrical reference or value is refused conservatively (null), never invented', () => {
    const floatingReference = { components: [power('p'), fixture('ms'), { uid: 'r', type: 'RESISTOR' }],
      wires: [wire('p', '5V', 'ms', 'vcc'), wire('ms', 'vout', 'r', 'A'), wire('r', 'B', 'p', 'GND')] }
    step(floatingReference, emitter({ voltageOutputs: { vout: 2 } }))
    expect(domain('ms:vout')).toBeNull()
    for (const invalid of [Number.NaN, Infinity, -1, '2', null]) {
      step(powered(), emitter({ voltageOutputs: { vout: invalid } }))
      expect(domain('ms:vout')).toBeNull()
    }
    // A voltage output on a net already held by a different source fact is a conflict.
    step(powered({ wires: [wire('p', '5V', 'ms', 'vout')] }), emitter({ voltageOutputs: { vout: 2 } }))
    expect(domain('ms:vout')).toBeNull()
    expect(() => step(powered(), emitter({}, { voltageReferencePin: 'nowhere' }))).toThrow(/not one of its canonical pins/)
  })

  it('T15/T16 conductionPairs act for their step only, without touching prepared / Union-Find', () => {
    const circuit = powered({ components: [{ uid: 'r', type: 'RESISTOR' }], wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'ms', 'sw')] })
    let closed = true
    const registry = registryOf({ MS_FIXTURE_A: { contribute: () => ({ state: null, effects: { conductionPairs: closed ? [['sw', 'gnd']] : [] } }) } })
    const session = createSimulationRuntimeSession()
    step(circuit, registry, { runtimeSession: session })
    expect(domain('ms:sw').voltage).toBe(0)
    const prepared = lastResolution().args[1]
    const netCount = prepared.nets.size
    expect(prepared.uf.find('ms:sw')).not.toBe(prepared.uf.find('ms:gnd'))
    closed = false
    step(circuit, registry, { runtimeSession: session })
    expect(domain('ms:sw').voltage).toBe(5)
    expect(prepared.nets.size).toBe(netCount)
    expect(() => step(circuit, registryOf({ MS_FIXTURE_A: { contribute: () => ({ state: null, effects: { conductionPairs: [['sw', 'sw']] } }) } })))
      .toThrow(/two distinct canonical pins/)
    expect(() => step(circuit, registryOf({ MS_FIXTURE_A: { contribute: () => ({ state: null, effects: { conductionPairs: [['sw', 'ghost']] } }) } })))
      .toThrow(/two distinct canonical pins/)
  })

  it('resolveSignals consumes pure step authorities without mutating prepared', () => {
    const circuit = powered({ components: [{ uid: 'r', type: 'RESISTOR' }], wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'ms', 'sw')] })
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const snapshot = JSON.stringify([[...prepared.nets], prepared.allKeys])
    const authorities = Object.freeze({ voltageOutputs: [Object.freeze({ uid: 'ms', pinId: 'vout', referencePin: 'gnd', voltage: 1.25 })],
      conductionPairs: [Object.freeze({ uid: 'ms', pinA: 'sw', pinB: 'gnd' })] })
    const result = resolveSignals(circuit.components, prepared, null, authorities)
    expect(result.dcVoltageDomains.get('ms:vout').voltage).toBe(1.25)
    expect(result.dcVoltageDomains.get('ms:sw').voltage).toBe(0)
    expect(JSON.stringify([[...prepared.nets], prepared.allKeys])).toBe(snapshot)
  })

  it('T17 ONE RESOLUTION per step, whatever the number of contributors and families', () => {
    const timed = createTimedDigitalContributionRegistry({ contributions: new Map([['MS_FIXTURE_B',
      () => ({ state: undefined, outputs: new Map([['dout', Signal.LOW]]) })]]) })
    const circuit = { components: [power('p'), fixture('a'), fixture('b'), fixture('t', 'MS_FIXTURE_B')], wires: [wire('p', 'GND', 'a', 'gnd')] }
    const session = createSimulationRuntimeSession()
    const registry = emitter({ digitalOutputs: { dout: Signal.HIGH }, voltageOutputs: { vout: 1 }, conductionPairs: [['sw', 'gnd']] })
    for (let i = 1; i <= 3; i++) {
      step(circuit, registry, { runtimeSession: session, timedDigitalContributionRegistry: timed })
      expect(resolutions).toHaveLength(i)
    }
    const [, , , authorities] = lastResolution().args
    expect(authorities.voltageOutputs.map(({ uid }) => uid)).toEqual(['a', 'b'])
    expect(authorities.conductionPairs.map(({ uid }) => uid)).toEqual(['a', 'b'])
  })

  it('T25 unsupported same-step self-feedback stays conservative: own output never re-sampled, no loop', () => {
    const log = []
    const registry = emitter((ctx) => {
      log.push(ctx.pinVoltages.in)
      return { voltageOutputs: { vout: (ctx.pinVoltages.in?.voltage ?? 1) + 1 } }
    })
    const circuit = powered({ wires: [wire('ms', 'vout', 'ms', 'in')] })
    const session = createSimulationRuntimeSession()
    for (let i = 0; i < 3; i++) step(circuit, registry, { runtimeSession: session })
    expect(log).toEqual([undefined, undefined, undefined])
    expect(resolutions).toHaveLength(3)
    expect(domain('ms:vout').voltage).toBe(2)
    expect(domain('ms:in').voltage).toBe(2)
  })
})

describe('A11-COMP4-PREQ3 — backward compatibility', () => {
  it('T20 a circuit without mixed-signal contributor keeps the historical path', () => {
    const components = [power('p'), { uid: 'l', type: 'LED' }]
    const wires = [wire('p', '5V', 'l', 'anode'), wire('p', 'GND', 'l', 'cathode')]
    const session = createSimulationRuntimeSession()
    const log = []
    const result = runSimulationStep(components, wires, { runtimeSession: session, mixedSignalContributionRegistry: registryOf({ MS_FIXTURE_A: counter(log) }) })
    expect(resolutions).toHaveLength(1)
    expect(lastResolution().args[3]).toBeNull()
    expect(result.pinSignals).toEqual(runSimulation(components, wires))
    expect(log).toEqual([])
    expect(session.scheduler).toBeNull()
    expect(session.mixedSignalStates.size).toBe(0)
    const prepared = prepareCircuit(components, wires)
    const plain = resolveSignals(components, prepared)
    expect(resolveSignals(components, prepared, null, { voltageOutputs: [], conductionPairs: [] })).toEqual(plain)
    expect(resolveSignals(components, prepared, null, null)).toEqual(plain)
  })
})

describe('A11-COMP4-PREQ3 — architecture guards', () => {
  const engineFiles = ['mixedSignalContributionRegistry.js', 'simulationRuntimeIntegration.js', 'resolution.js']

  it('G1 no timer-IC literal (555/556 family) in the generic seam', () => {
    for (const name of engineFiles) {
      expect(source(name), name).not.toMatch(/\b(?:NE|LM)?55[56]\b/)
    }
  })

  it('T19 no wall-clock API in the mixed-signal seam', () => {
    for (const name of engineFiles) {
      const code = executable(source(name))
      for (const pattern of [/Date\.now\s*\(/, /performance\.now\s*\(/, /\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(/]) {
        expect(code, `${name} ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it('G2 resolution.js knows no Scheduler, time, runtime session, mixed-signal state or Registry', () => {
    const code = executable(source('resolution.js'))
    expect(code).not.toMatch(/\bScheduler\b|scheduler\.js|currentTimeMs|runtimeSession|mixedSignalStates|mixedSignalContributionRegistry|previousState/)
  })

  it('G3 ONE RESOLUTION structurally: one resolveSignals() call; the numeric pre-context never resolves', () => {
    const integration = executable(source('simulationRuntimeIntegration.js'))
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
    const code = executable(source('resolution.js'))
    const body = code.slice(code.indexOf('export function resolveSourceDrivenVoltageFacts('), code.indexOf('function netIdentities('))
    expect(body.length).toBeGreaterThan(0)
    expect(body).not.toMatch(/resolveSignals|resolveDcVoltageDomains|resolveSourceDrivenPinSignals|contribute|\.set\(\w+\.|uf\.union/)
    const sample = computeMixedSignalContributions.toString()
    expect(sample).not.toMatch(/resolveSignals|resolveElectricalSignals|advance\s*\(|\.type\s*[!=]==|mixedSignalStates\.set/)
  })

  it('G4 mixed-signal state never reaches the Document', () => {
    const circuit = powered()
    const before = JSON.stringify(circuit)
    const session = createSimulationRuntimeSession()
    step(circuit, registryOf({ MS_FIXTURE_A: counter() }), { runtimeSession: session })
    expect(JSON.stringify(circuit)).toBe(before)
    expect(before).not.toMatch(/mixedSignal|"n":/)
  })
})
