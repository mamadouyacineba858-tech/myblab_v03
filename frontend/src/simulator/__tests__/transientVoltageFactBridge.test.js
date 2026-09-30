import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { netIdentities, resolveSourceDrivenVoltageFacts } from '../resolution.js'
import {
  createSimulationRuntimeSession,
  runSimulationStep,
} from '../simulationRuntimeIntegration.js'
import { createMixedSignalContributionRegistry } from '../mixedSignalContributionRegistry.js'
import {
  createTransientContributionRegistry,
  getTransientContribution,
  getTransientObservation,
  hasTransientContribution,
} from '../transientContributionRegistry.js'
import { composeSampleVoltageFacts, observeTransientVoltageFacts } from '../transientVoltageFactBridge.js'

/**
 * A11-COMP4-PREQ4 — transient electrical fact -> mixed-signal sample bridge (T1..T26 + guards).
 * Mixed-signal contributors and synthetic transient models are FAKE fixture types
 * (MS_FIXTURE_*, TR_FIXTURE_*) injected through vi.mock of the canonical Registry and
 * isolated Registries. CAPACITOR / POLARIZED_CAPACITOR / INDUCTOR are the real
 * production observers under test.
 */
const { MS_PINS, TR_PINS, resolutions } = vi.hoisted(() => ({
  MS_PINS: ['vcc', 'gnd', 'in', 'aux'],
  TR_PINS: ['pos', 'ref', 'other'],
  resolutions: [],
}))

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  const fake = (pins) => ({ pins: pins.map((id) => ({ id })), modelAvailable: true, defaultParameters: {}, parameterSchema: [] })
  return {
    ...actual,
    getCanonicalEntry: (type) => typeof type !== 'string' ? actual.getCanonicalEntry(type)
      : type.startsWith('MS_FIXTURE') ? fake(MS_PINS)
        : type.startsWith('TR_FIXTURE') ? fake(TR_PINS)
          : actual.getCanonicalEntry(type),
  }
})
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
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

/** Mixed-signal probe `ms` recording the pinVoltages (and full ctx) it samples. */
const probe = (log) => createMixedSignalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A', {
  contribute: (ctx) => {
    log.push(ctx)
    return { state: null }
  },
}]]) })
/** Synthetic transient model: state = { v: currentTimeMs } (opaque to the runtime), observer maps it. */
const clockModel = (observeLog = []) => createTransientContributionRegistry({
  contributions: new Map([['TR_FIXTURE_A', ({ currentTimeMs }) => ({ state: { v: currentTimeMs }, contribution: null })]]),
  observations: new Map([['TR_FIXTURE_A', ({ previousState }) => {
    observeLog.push(previousState)
    return { voltageFacts: [{ positivePin: 'pos', referencePin: 'ref', voltage: previousState.v }] }
  }]]),
})
/** p powers ms ; ms.in on the tr.pos node ; tr.ref on ground. */
const clockCircuit = () => ({
  components: [power('p'), { uid: 'ms', type: 'MS_FIXTURE_A' }, { uid: 'tr', type: 'TR_FIXTURE_A' }],
  wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('tr', 'pos', 'ms', 'in'), wire('tr', 'ref', 'p', 'GND')],
})
/** Capacitor `c` of `type`, its positive pin on an isolated node shared with ms.in (+ r.A), reference on ground. */
const capacitorNode = (type = 'CAPACITOR', [pos, ref] = ['pinA', 'pinB']) => ({
  components: [power('p'), { uid: 'ms', type: 'MS_FIXTURE_A' }, { uid: 'c', type }, { uid: 'r', type: 'RESISTOR' }],
  wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('c', pos, 'ms', 'in'), wire('c', pos, 'r', 'A'),
    wire('c', ref, 'p', 'GND')],
})
const step = (circuit, options) => runSimulationStep(circuit.components, circuit.wires, { dt: 16, ...options })
const groundReference = (circuit) => netIdentities(prepareCircuit(circuit.components, circuit.wires).nets).get('p:GND')

beforeEach(() => { resolutions.length = 0 })

describe('A11-COMP4-PREQ4 — Registry observation contract', () => {
  it('T1 a transient contributor without observer keeps working exactly as before', () => {
    const noObserver = createTransientContributionRegistry({ contributions: new Map([['CAPACITOR', getTransientContribution('CAPACITOR')]]) })
    expect(noObserver.getTransientObservation('CAPACITOR')).toBeNull()
    const legacyShape = { hasTransientContribution, getTransientContribution } // historical injected shape, no observer method
    const circuit = { components: [power('p'), { uid: 'c', type: 'CAPACITOR' }], wires: [wire('p', '5V', 'c', 'pinA'), wire('p', 'GND', 'c', 'pinB')] }
    const run = (registry) => {
      const session = createSimulationRuntimeSession()
      return [1, 2, 3].map(() => step(circuit, { runtimeSession: session, transientContributionRegistry: registry }).electricalAnalysis.get('c'))
    }
    expect(run(noObserver)).toEqual(run(undefined))
    expect(run(legacyShape)).toEqual(run(undefined))
    expect(() => createTransientContributionRegistry({ observations: new Map([['GHOST', () => null]]) })).toThrow(/invalid observation/)
  })

  it('T2 the bridge never reads the private state structure: only the owner observer does', () => {
    const secret = Symbol('owner-only')
    const opaque = createTransientContributionRegistry({
      contributions: new Map([['TR_FIXTURE_A', ({ previousState }) => ({ state: previousState, contribution: null })]]),
      observations: new Map([['TR_FIXTURE_A', ({ previousState }) => ({ voltageFacts: [{ positivePin: 'pos', referencePin: 'ref', voltage: previousState[secret] }] })]]),
    })
    const facts = observeTransientVoltageFacts([{ uid: 'tr', type: 'TR_FIXTURE_A' }], opaque, new Map([['tr', { [secret]: 1.5 }]]))
    expect(facts).toEqual([{ uid: 'tr', positivePin: 'pos', referencePin: 'ref', voltage: 1.5 }])
    const code = executable(source('transientVoltageFactBridge.js'))
    expect(code).not.toMatch(/previousState\s*\??\.|previousState\s*\[|\.current\b|\.charge\b/)
    expect(executable(source('simulationRuntimeIntegration.js'))).not.toMatch(/electricalTransientStates\.get\([^)]*\)\s*\??\.\s*voltage/)
  })

  it('T3 CAPACITOR exposes its committed voltage between pinA and pinB', () => {
    const observe = getTransientObservation('CAPACITOR')
    expect(observe({ previousState: { voltage: 2 } })).toEqual({ voltageFacts: [{ positivePin: 'pinA', referencePin: 'pinB', voltage: 2 }] })
    const log = []
    const circuit = capacitorNode()
    step(circuit, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 2 }]]) })
    expect(log[0].pinVoltages.in).toEqual({ voltage: 2, reference: groundReference(circuit) })
  })

  it('T4 POLARIZED_CAPACITOR exposes its committed voltage between plus and minus', () => {
    expect(getTransientObservation('POLARIZED_CAPACITOR')({ previousState: { voltage: 3 } }))
      .toEqual({ voltageFacts: [{ positivePin: 'plus', referencePin: 'minus', voltage: 3 }] })
    const log = []
    const circuit = capacitorNode('POLARIZED_CAPACITOR', ['plus', 'minus'])
    step(circuit, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 3 }]]) })
    expect(log[0].pinVoltages.in).toEqual({ voltage: 3, reference: groundReference(circuit) })
  })

  it('T5 INDUCTOR invents no voltage fact from its current', () => {
    expect(getTransientObservation('INDUCTOR')).toBeNull()
    const log = []
    const circuit = capacitorNode('INDUCTOR', ['A', 'B'])
    step(circuit, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { current: 3 }]]) })
    expect(log[0].pinVoltages.in).toBeUndefined()
    expect(observeTransientVoltageFacts([{ uid: 'c', type: 'INDUCTOR' }], { getTransientObservation }, new Map([['c', { current: 3 }]]))).toEqual([])
  })

  it('T11 no committed state: no voltage is invented (first step)', () => {
    const log = []
    step(capacitorNode(), { mixedSignalContributionRegistry: probe(log) })
    expect(log[0].pinVoltages.in).toBeUndefined()
    expect(getTransientObservation('CAPACITOR')({ previousState: undefined })).toBeNull()
  })

  it('T12 a non-finite observed voltage is unresolved (null), never a valid voltage', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity, '2', undefined]) {
      const registry = createTransientContributionRegistry({
        contributions: new Map([['TR_FIXTURE_A', () => ({ state: {}, contribution: null })]]),
        observations: new Map([['TR_FIXTURE_A', () => ({ voltageFacts: [{ positivePin: 'pos', referencePin: 'ref', voltage: bad }] })]]),
      })
      const log = []
      step(clockCircuit(), { mixedSignalContributionRegistry: probe(log), transientContributionRegistry: registry,
        electricalTransientStates: new Map([['tr', {}]]) })
      expect(log[0].pinVoltages.in).toBeNull()
    }
  })

  it('T13/T14 a non-canonical pin or positivePin == referencePin is refused explicitly', () => {
    for (const fact of [{ positivePin: 'ghost', referencePin: 'ref', voltage: 1 }, { positivePin: 'pos', referencePin: 'nowhere', voltage: 1 },
      { positivePin: 'pos', referencePin: 'pos', voltage: 1 }]) {
      const registry = createTransientContributionRegistry({
        contributions: new Map([['TR_FIXTURE_A', () => ({ state: {}, contribution: null })]]),
        observations: new Map([['TR_FIXTURE_A', () => ({ voltageFacts: [fact] })]]),
      })
      expect(() => observeTransientVoltageFacts([{ uid: 'tr', type: 'TR_FIXTURE_A' }], registry, new Map([['tr', {}]])))
        .toThrow(/two distinct canonical pins/)
    }
  })
})

describe('A11-COMP4-PREQ4 — projection and composition', () => {
  it('T6/T7 a fact belongs to the physical net of its positive pin, relative to the net of its reference pin', () => {
    const circuit = capacitorNode()
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const nets = netIdentities(prepared.nets)
    const facts = composeSampleVoltageFacts(resolveSourceDrivenVoltageFacts(circuit.components, prepared),
      [{ uid: 'c', positivePin: 'pinA', referencePin: 'pinB', voltage: 1.2 }], prepared)
    for (const key of ['c:pinA', 'ms:in', 'r:A']) expect(facts.get(key)).toEqual({ voltage: 1.2, reference: nets.get('c:pinB') })
    expect(nets.get('c:pinB')).toBe(nets.get('p:GND'))
    // Reference on a floating net: the reference is that net's identity, never a guess.
    const floating = { components: [{ uid: 'c', type: 'CAPACITOR' }, { uid: 'ms', type: 'MS_FIXTURE_A' }], wires: [wire('c', 'pinB', 'ms', 'aux')] }
    const floatingPrepared = prepareCircuit(floating.components, floating.wires)
    const floatingFacts = composeSampleVoltageFacts(new Map(), [{ uid: 'c', positivePin: 'pinA', referencePin: 'pinB', voltage: 4 }], floatingPrepared)
    expect(floatingFacts.get('c:pinA')).toEqual({ voltage: 4, reference: netIdentities(floatingPrepared.nets).get('ms:aux') })
    expect(floatingFacts.has('ms:aux')).toBe(false)
  })

  it('T8 compatible source + transient facts stay valid', () => {
    const log = []
    const circuit = { components: [power('p'), { uid: 'ms', type: 'MS_FIXTURE_A' }, { uid: 'c', type: 'CAPACITOR' }],
      wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('p', '5V', 'c', 'pinA'), wire('p', 'GND', 'c', 'pinB')] }
    step(circuit, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 5 }]]) })
    expect(log[0].pinVoltages.vcc).toEqual({ voltage: 5, reference: groundReference(circuit) })
  })

  it('T9 incompatible source + transient facts are unresolved (null): no family wins', () => {
    const log = []
    const circuit = { components: [power('p'), { uid: 'ms', type: 'MS_FIXTURE_A' }, { uid: 'c', type: 'CAPACITOR' }],
      wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('p', '5V', 'c', 'pinA'), wire('p', 'GND', 'c', 'pinB')] }
    step(circuit, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 2 }]]) })
    expect(log[0].pinVoltages.vcc).toBeNull()
    expect(log[0].pinVoltages.gnd).toEqual({ voltage: 0, reference: groundReference(circuit) })
  })

  it('T10 the result does not depend on producer order', () => {
    const circuit = capacitorNode()
    circuit.components.push({ uid: 'c2', type: 'CAPACITOR' })
    circuit.wires.push(wire('c2', 'pinA', 'ms', 'in'), wire('c2', 'pinB', 'p', 'GND'))
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const sourceFacts = resolveSourceDrivenVoltageFacts(circuit.components, prepared)
    const a = { uid: 'c', positivePin: 'pinA', referencePin: 'pinB', voltage: 1 }
    const b = { uid: 'c2', positivePin: 'pinA', referencePin: 'pinB', voltage: 2 }
    const sorted = (map) => [...map].sort(([x], [y]) => x.localeCompare(y))
    expect(sorted(composeSampleVoltageFacts(sourceFacts, [a, b], prepared))).toEqual(sorted(composeSampleVoltageFacts(sourceFacts, [b, a], prepared)))
    expect(composeSampleVoltageFacts(sourceFacts, [a, b], prepared).get('ms:in')).toBeNull()
    expect(composeSampleVoltageFacts(sourceFacts, [a, { ...b, voltage: 1 }], prepared).get('ms:in').voltage).toBe(1)
    const run = (reverse) => {
      const log = []
      const c = { ...circuit, components: reverse ? [...circuit.components].reverse() : circuit.components }
      step(c, { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 1 }], ['c2', { voltage: 2 }]]) })
      return log[0].pinVoltages
    }
    expect(run(true)).toEqual(run(false))
  })

  it('T15 the bridge mutates neither previousState, nor the source facts, nor prepared', () => {
    const circuit = capacitorNode()
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const snapshot = JSON.stringify([[...prepared.nets], prepared.allKeys])
    const sourceFacts = resolveSourceDrivenVoltageFacts(circuit.components, prepared)
    const sourceSnapshot = JSON.stringify([...sourceFacts])
    const states = new Map([['c', deepFreeze({ voltage: 2 })]])
    const facts = observeTransientVoltageFacts([{ uid: 'c', type: 'CAPACITOR' }], { getTransientObservation }, states)
    expect(Object.isFrozen(facts) && Object.isFrozen(facts[0])).toBe(true)
    const composed = composeSampleVoltageFacts(sourceFacts, facts, prepared)
    composed.get('ms:in').voltage = 99
    expect(composeSampleVoltageFacts(sourceFacts, facts, prepared).get('ms:in').voltage).toBe(2)
    expect(JSON.stringify([...sourceFacts])).toBe(sourceSnapshot)
    expect(JSON.stringify([[...prepared.nets], prepared.allKeys])).toBe(snapshot)
    expect(states.get('c')).toEqual({ voltage: 2 })
  })
})

describe('A11-COMP4-PREQ4 — n-1 sampling semantics', () => {
  it('T16/T17/T18 SAMPLE[n] observes transient state[n-1], never state[n]; state[n] is seen at n+1', () => {
    const log = []
    const observed = []
    const session = createSimulationRuntimeSession()
    for (let i = 0; i < 4; i++) {
      step(clockCircuit(), { runtimeSession: session, mixedSignalContributionRegistry: probe(log), transientContributionRegistry: clockModel(observed) })
    }
    expect(log.map((ctx) => ctx.currentTimeMs)).toEqual([16, 32, 48, 64])
    // Sample at n sees the state committed at n-1 (16 ms earlier), never its own step's value.
    expect(log.map((ctx) => ctx.pinVoltages.in?.voltage)).toEqual([undefined, 16, 32, 48])
    expect(observed).toEqual([{ v: 16 }, { v: 32 }, { v: 48 }])
    expect(session.electricalTransientStates.get('tr')).toEqual({ v: 64 })
  })

  it('T19 still exactly ONE resolution per step', () => {
    const session = createSimulationRuntimeSession()
    for (let i = 1; i <= 3; i++) {
      step(clockCircuit(), { runtimeSession: session, mixedSignalContributionRegistry: probe([]), transientContributionRegistry: clockModel() })
      expect(resolutions).toHaveLength(i)
    }
  })

  it('T20 a transient voltage never becomes HIGH/LOW implicitly', () => {
    const run = (registry) => {
      const session = createSimulationRuntimeSession()
      return [1, 2, 3].map(() => step(clockCircuit(), { runtimeSession: session, mixedSignalContributionRegistry: probe([]), transientContributionRegistry: registry }).pinSignals)
    }
    const withoutObserver = createTransientContributionRegistry({ contributions: new Map([['TR_FIXTURE_A', ({ currentTimeMs }) => ({ state: { v: currentTimeMs }, contribution: null })]]) })
    expect(run(clockModel())).toEqual(run(withoutObserver))
    const log = []
    step(capacitorNode(), { mixedSignalContributionRegistry: probe(log), electricalTransientStates: new Map([['c', { voltage: 4 }]]) })
    expect(log[0].pinSignals.in).toBe('UNKNOWN')
  })

  it('T21 mixedSignalStates and electricalTransientStates stay distinct; a contributor never receives the transient store', () => {
    const session = createSimulationRuntimeSession()
    expect(session.mixedSignalStates).not.toBe(session.electricalTransientStates)
    const log = []
    const stateful = createMixedSignalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A', {
      contribute: (ctx) => { log.push(ctx); return { state: { mine: true } } },
    }]]) })
    step(clockCircuit(), { runtimeSession: session, mixedSignalContributionRegistry: stateful, transientContributionRegistry: clockModel() })
    step(clockCircuit(), { runtimeSession: session, mixedSignalContributionRegistry: stateful, transientContributionRegistry: clockModel() })
    expect([...session.mixedSignalStates.keys()]).toEqual(['ms'])
    expect([...session.electricalTransientStates.keys()]).toEqual(['tr'])
    const transientValues = new Set([session.electricalTransientStates, ...session.electricalTransientStates.values()])
    for (const ctx of log) {
      expect(Object.keys(ctx).sort()).toEqual(['component', 'currentTimeMs', 'dt', 'params', 'pinSignals', 'pinVoltages', 'previousState'])
      for (const value of Object.values(ctx)) expect(transientValues.has(value)).toBe(false)
    }
  })

  it('T26 GATE 0: without mixed-signal contributor, observers are never consulted and results are unchanged', () => {
    const calls = []
    const observing = createTransientContributionRegistry({
      contributions: new Map([['CAPACITOR', getTransientContribution('CAPACITOR')]]),
      observations: new Map([['CAPACITOR', (ctx) => { calls.push(ctx); return null }]]),
    })
    const circuit = { components: [power('p'), { uid: 'c', type: 'CAPACITOR' }], wires: [wire('p', '5V', 'c', 'pinA'), wire('p', 'GND', 'c', 'pinB')] }
    const run = (registry) => {
      const session = createSimulationRuntimeSession()
      return [1, 2].map(() => step(circuit, { runtimeSession: session, transientContributionRegistry: registry }))
    }
    expect(run(observing)).toEqual(run(undefined))
    expect(calls).toEqual([])
    const plain = { components: [power('p'), { uid: 'l', type: 'LED' }], wires: [wire('p', '5V', 'l', 'anode'), wire('p', 'GND', 'l', 'cathode')] }
    const session = createSimulationRuntimeSession()
    step(plain, { runtimeSession: session })
    expect(session.scheduler).toBeNull()
  })
})

describe('A11-COMP4-PREQ4 — architecture guards', () => {
  const bridge = executable(source('transientVoltageFactBridge.js'))
  const integration = executable(source('simulationRuntimeIntegration.js'))

  it('G1 causal order: mixed SAMPLE is computed before the transient update of the same step', () => {
    const body = integration.slice(integration.indexOf('function computeElectricalStep('), integration.indexOf('export function runSimulationWithRuntime('))
    const sample = body.indexOf('computeMixedSignalContributions(')
    const observe = body.indexOf('observeTransientVoltageFacts(')
    const update = body.indexOf('computeTransientElectricalContributions(')
    expect(Math.min(sample, observe, update)).toBeGreaterThan(-1)
    expect(observe).toBeLessThan(sample)
    expect(sample).toBeLessThan(update)
  })

  it('G2 ONE RESOLUTION: the bridge never resolves; the integration keeps one resolveSignals() call', () => {
    expect(bridge).not.toMatch(/resolveSignals|resolveElectricalSignals|resolveDcVoltageDomains|propagatePassiveConduction|contribute\s*\(/)
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
  })

  it('G3 the bridge is type-agnostic, produces no Signal, touches no topology or time', () => {
    expect(bridge).not.toMatch(/\.type\s*[!=]==|["'](?:CAPACITOR|POLARIZED_CAPACITOR|INDUCTOR)["']/)
    expect(bridge).not.toMatch(/\bSignal\b|HIGH|LOW/)
    expect(bridge).not.toMatch(/uf\.union|prepared\.\w+\s*=|\.nets\.(?:set|delete|clear)\(/)
    expect(bridge).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame|Scheduler|currentTimeMs/)
    expect(bridge).not.toMatch(/mixedSignalStates|\.set\(\s*\w+\.uid/)
    for (const name of ['transientVoltageFactBridge.js', 'transientContributionRegistry.js', 'simulationRuntimeIntegration.js']) {
      expect(source(name), name).not.toMatch(/\b(?:NE|LM)?55[56]\b/)
    }
  })

  it('G4 the integration hands the transient store only to the observation bridge and its own update', () => {
    const uses = integration.match(/electricalTransientStates\b(?!:)/g) ?? []
    const sampleCall = integration.match(/computeMixedSignalContributions\([\s\S]*?\n\s*\)/)[0]
    expect(sampleCall).not.toMatch(/electricalTransientStates/)
    expect(uses.length).toBeGreaterThan(0)
  })
})
