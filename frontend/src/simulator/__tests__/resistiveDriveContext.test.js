import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSourceDrivenVoltageFacts } from '../resolution.js'
import { getResistiveEdge, getUnconditionalConductionPinPair } from '../dcContributionRegistry.js'
import {
  collectResistiveEdges,
  createResistiveDriveNetwork,
  resolveResistiveDriveContext,
} from '../resistiveDriveContext.js'
import {
  computeTransientDriveContexts,
  createSimulationRuntimeSession,
  runSimulationStep,
} from '../simulationRuntimeIntegration.js'
import { createMixedSignalContributionRegistry } from '../mixedSignalContributionRegistry.js'
import {
  createTransientContributionRegistry,
  getTransientContribution,
  getTransientDriveTerminals,
  getTransientObservation,
  hasTransientContribution,
} from '../transientContributionRegistry.js'
import { observeTransientVoltageFacts } from '../transientVoltageFactBridge.js'

/**
 * A11-COMP4-PREQ5 — generic resistive-drive context for transient storage (T1..T32 + causal proof).
 * Mixed-signal producers (MS_FIXTURE_*) and resistive fixtures (RX_FIXTURE_*) are FAKE types
 * injected through vi.mock of the canonical Registry and isolated Registries ; RESISTOR,
 * CAPACITOR and POLARIZED_CAPACITOR are the real production contracts under test.
 */
const { MS_PINS, RX_VALUES, resolutions } = vi.hoisted(() => ({
  MS_PINS: ['vcc', 'gnd', 'in', 'sw', 'out'],
  RX_VALUES: { RX_FIXTURE_ZERO: 0, RX_FIXTURE_NEG: -10, RX_FIXTURE_NAN: Number.NaN, RX_FIXTURE_INF: Infinity, RX_FIXTURE_STR: '100', RX_FIXTURE_OK: 330 },
  resolutions: [],
}))

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  const fake = (pins, defaultParameters = {}) => ({ pins: pins.map((id) => ({ id })), modelAvailable: true, defaultParameters, parameterSchema: [] })
  return {
    ...actual,
    getCanonicalEntry: (type) => typeof type !== 'string' ? actual.getCanonicalEntry(type)
      : type.startsWith('MS_FIXTURE') ? fake(MS_PINS)
        : type.startsWith('RX_FIXTURE') ? fake(['A', 'B'], { resistance: RX_VALUES[type] })
          : actual.getCanonicalEntry(type),
  }
})
vi.mock('../resolution.js', async (original) => {
  const actual = await original()
  return {
    ...actual,
    resolveSignals: (...args) => {
      const result = actual.resolveSignals(...args)
      resolutions.push(args)
      return result
    },
  }
})

const here = dirname(fileURLToPath(import.meta.url))
const source = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid = 'p', voltage = 5) => ({ uid, type: 'POWER', parameters: { voltage } })
const resistor = (uid, resistance) => ({ uid, type: 'RESISTOR', parameters: resistance === undefined ? {} : { resistance } })
const capacitor = (uid = 'c', capacitance = 1e-4, type = 'CAPACITOR') => ({ uid, type, parameters: { capacitance } })
const DT = 16

/** 5V -- r -- c.pinA ; c.pinB -- GND. */
const rc = (resistance = 1000, capacitance = 1e-4) => ({
  components: [power(), resistor('r', resistance), capacitor('c', capacitance)],
  wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')],
})

/** Pure primitive on a circuit : DC-source authorities, Registry edges, optional pairs / high-impedance keys. */
const contextOf = (circuit, [positivePin, referencePin] = ['pinA', 'pinB'], { uid = 'c', conductionPairs = [], highImpedanceKeys = new Set(), lookup = getResistiveEdge } = {}) => {
  const prepared = prepareCircuit(circuit.components, circuit.wires)
  const network = createResistiveDriveNetwork({
    prepared,
    voltageFacts: resolveSourceDrivenVoltageFacts(circuit.components, prepared),
    resistiveEdges: collectResistiveEdges(circuit.components, prepared, lookup),
    conductionPairs,
    highImpedanceKeys,
  })
  return resolveResistiveDriveContext(network, `${uid}:${positivePin}`, `${uid}:${referencePin}`)
}
const step = (circuit, options) => runSimulationStep(circuit.components, circuit.wires, { dt: DT, ...options })
const run = (circuit, steps, options = {}) => {
  const session = createSimulationRuntimeSession()
  const trajectory = []
  for (let i = 0; i < steps; i++) {
    step(circuit, { runtimeSession: session, ...options })
    trajectory.push(session.electricalTransientStates.get(options.uid ?? 'c')?.voltage)
  }
  return { session, trajectory }
}
const charged = (target, resistance, capacitance, n, v0 = 0) => target + (v0 - target) * Math.exp(-(n * DT / 1000) / (resistance * capacitance))
const shuffled = (circuit) => ({ components: [...circuit.components].reverse(), wires: [...circuit.wires].reverse() })

beforeEach(() => { resolutions.length = 0 })

describe('A11-COMP4-PREQ5 — resistive capability (Registry)', () => {
  it('T1 the resistive-edge capability is an Open/Closed Registry lookup, distinct from the passive pair table', () => {
    expect(getResistiveEdge('RESISTOR')).toEqual({ terminalAPinId: 'A', terminalBPinId: 'B', resistanceParameter: 'resistance' })
    for (const type of ['CAPACITOR', 'LED', 'LDR', 'GHOST']) expect(getResistiveEdge(type)).toBeNull()
    expect(getUnconditionalConductionPinPair('RESISTOR')).toEqual(['A', 'B'])
    // A fixture lookup extends the graph without touching the engine.
    const circuit = { components: [power(), { uid: 'x', type: 'RX_FIXTURE_OK' }, capacitor()],
      wires: [wire('p', '5V', 'x', 'A'), wire('x', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(circuit)).toBeNull()
    const fixture = (type) => type.startsWith('RX_FIXTURE') ? { terminalAPinId: 'A', terminalBPinId: 'B', resistanceParameter: 'resistance' } : null
    expect(contextOf(circuit, undefined, { lookup: fixture })).toEqual({ targetVoltage: 5, equivalentResistance: 330, reference: 'c:pinB' })
  })

  it('T2/T18 the PREQ5 engine holds no type literal, no type comparison and no 555/556 vocabulary', () => {
    const engine = executable(source('resistiveDriveContext.js'))
    expect(engine).not.toMatch(/["'](?:RESISTOR|CAPACITOR|POLARIZED_CAPACITOR|INDUCTOR|POWER)["']/)
    expect(engine).not.toMatch(/\.type\s*[!=]==/)
    for (const name of ['resistiveDriveContext.js', 'transientContributionRegistry.js', 'simulationRuntimeIntegration.js', 'dcContributionRegistry.js']) {
      expect(source(name), name).not.toMatch(/\b(?:NE|LM)?55[56]\b|\bTRIG\b|\bTHRESH\b|\bDISCH\b|\bCTRL\b|1\s*\/\s*3|2\s*\/\s*3/)
    }
  })

  it('T3 the EFFECTIVE instance resistance is used, not the canonical default', () => {
    expect(contextOf(rc(4700)).equivalentResistance).toBe(4700)
    const defaulted = rc()
    defaulted.components[1] = resistor('r')
    expect(contextOf(defaulted).equivalentResistance).toBe(220)
  })

  it('T4 R <= 0, NaN, Infinity or a non-number are refused (inadmissible edge, never an open circuit by assumption)', () => {
    const fixture = (type) => type.startsWith('RX_FIXTURE') ? { terminalAPinId: 'A', terminalBPinId: 'B', resistanceParameter: 'resistance' } : null
    for (const type of ['RX_FIXTURE_ZERO', 'RX_FIXTURE_NEG', 'RX_FIXTURE_NAN', 'RX_FIXTURE_INF', 'RX_FIXTURE_STR']) {
      const circuit = { components: [power(), { uid: 'x', type }, capacitor()],
        wires: [wire('p', '5V', 'x', 'A'), wire('x', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
      const prepared = prepareCircuit(circuit.components, circuit.wires)
      expect(collectResistiveEdges(circuit.components, prepared, fixture), type).toEqual([])
      expect(contextOf(circuit, undefined, { lookup: fixture }), type).toBeNull()
    }
  })
})

describe('A11-COMP4-PREQ5 — unique resistive path', () => {
  it('T5 one resistor : Req = R, target = authority voltage relative to the reference terminal', () => {
    expect(contextOf(rc(1000))).toEqual({ targetVoltage: 5, equivalentResistance: 1000, reference: 'c:pinB' })
    // Resistance on the reference side is part of the same single loop.
    const low = { components: [power(), resistor('r', 680), capacitor()],
      wires: [wire('p', '5V', 'c', 'pinA'), wire('c', 'pinB', 'r', 'A'), wire('r', 'B', 'p', 'GND')] }
    expect(contextOf(low)).toEqual({ targetVoltage: 5, equivalentResistance: 680, reference: 'c:pinB' })
  })

  it('T6/T7 strict series : Req = R1 + R2 + R3, independent of the enumeration order', () => {
    const series = { components: [power(), resistor('r1', 100), resistor('r2', 2200), resistor('r3', 47000), capacitor()],
      wires: [wire('p', '5V', 'r1', 'A'), wire('r1', 'B', 'r2', 'B'), wire('r2', 'A', 'r3', 'A'), wire('r3', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    const expected = { targetVoltage: 5, equivalentResistance: 100 + 2200 + 47000, reference: 'c:pinB' }
    expect(contextOf(series)).toEqual(expected)
    expect(contextOf(shuffled(series))).toEqual(expected)
    const swapped = { ...series, components: [series.components[3], series.components[1], series.components[4], series.components[0], series.components[2]] }
    expect(contextOf(swapped)).toEqual(expected)
    // A resistor with both terminals on one net carries no current : transparent.
    const shorted = { components: [...series.components, resistor('rs', 10)], wires: [...series.wires, wire('rs', 'A', 'r1', 'B'), wire('rs', 'B', 'r2', 'B')] }
    expect(contextOf(shorted)).toEqual(expected)
  })

  it('T8 no admissible path : null (floating node, dead end, no authority)', () => {
    const floating = { components: [power(), resistor('r'), capacitor()], wires: [wire('r', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(floating)).toBeNull()
    const bare = { components: [power(), capacitor()], wires: [wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(bare)).toBeNull()
    const noSource = { components: [resistor('r'), capacitor()], wires: [wire('r', 'B', 'c', 'pinA')] }
    expect(contextOf(noSource)).toBeNull()
  })

  it('T9 two competing drives on the target node : null, in every enumeration order', () => {
    const divider = { components: [power(), resistor('r1', 1000), resistor('r2', 1000), capacitor()],
      wires: [wire('p', '5V', 'r1', 'A'), wire('r1', 'B', 'c', 'pinA'), wire('r2', 'A', 'c', 'pinA'), wire('r2', 'B', 'p', 'GND'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(divider)).toBeNull()
    expect(contextOf(shuffled(divider))).toBeNull()
    const twoSources = { components: [power('p1', 5), power('p2', 3), resistor('r1', 1000), resistor('r2', 2000), capacitor()],
      wires: [wire('p1', '5V', 'r1', 'A'), wire('p2', '5V', 'r2', 'A'), wire('r1', 'B', 'c', 'pinA'), wire('r2', 'B', 'c', 'pinA'),
        wire('p1', 'GND', 'p2', 'GND'), wire('c', 'pinB', 'p1', 'GND')] }
    expect(contextOf(twoSources)).toBeNull()
    expect(contextOf(shuffled(twoSources))).toBeNull()
  })

  it('T10 branches that would need a nodal solve (parallel, loaded divider, unknown load) : null', () => {
    const parallel = { components: [power(), resistor('r1', 1000), resistor('r2', 1000), capacitor()],
      wires: [wire('p', '5V', 'r1', 'A'), wire('p', '5V', 'r2', 'A'), wire('r1', 'B', 'c', 'pinA'), wire('r2', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(parallel)).toBeNull()
    const branch = { components: [power(), resistor('r1', 1000), resistor('r2', 1000), resistor('r3', 1000), capacitor()],
      wires: [wire('p', '5V', 'r1', 'A'), wire('r1', 'B', 'r2', 'A'), wire('r2', 'B', 'c', 'pinA'), wire('r1', 'B', 'r3', 'A'), wire('r3', 'B', 'p', 'GND'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(branch)).toBeNull()
    const loaded = { components: [power(), resistor('r'), capacitor(), { uid: 'l', type: 'LED' }],
      wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'pinA'), wire('l', 'anode', 'c', 'pinA'), wire('l', 'cathode', 'p', 'GND'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(loaded)).toBeNull()
    const secondStorage = { components: [...rc().components, capacitor('c2')], wires: [...rc().wires, wire('c2', 'pinA', 'c', 'pinA'), wire('c2', 'pinB', 'p', 'GND')] }
    expect(contextOf(secondStorage)).toBeNull()
  })

  it('T11/T25 explicit reference : signed target in the requested orientation ; another reference domain is refused', () => {
    const reversed = { components: [power(), resistor('r', 1000), capacitor()],
      wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'pinB'), wire('c', 'pinA', 'p', 'GND')] }
    expect(contextOf(reversed)).toEqual({ targetVoltage: -5, equivalentResistance: 1000, reference: 'c:pinB' })
    expect(contextOf(reversed, ['pinB', 'pinA'])).toEqual({ targetVoltage: 5, equivalentResistance: 1000, reference: 'c:pinA' })
    // Isolated sources : two unrelated reference nets, never compared.
    const isolated = { components: [power('p1', 5), power('p2', 9), resistor('r'), capacitor()],
      wires: [wire('p1', '5V', 'r', 'A'), wire('r', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p2', 'GND')] }
    expect(contextOf(isolated)).toBeNull()
    // Directly across an authority on both sides : R = 0, no drive context (historical path).
    const direct = { components: [power(), capacitor()], wires: [wire('p', '5V', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(direct)).toBeNull()
  })

  it('T12 a HIGH/LOW level is never turned into a voltage authority', () => {
    // ms drives `out` HIGH (digital only, no numeric value) into r ; the node carries no numeric fact.
    const registry = createMixedSignalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A', {
      digitalOutputPins: ['out'],
      contribute: () => ({ state: null, effects: { digitalOutputs: { out: 'HIGH' } } }),
    }]]) })
    const circuit = { components: [power(), { uid: 'ms', type: 'MS_FIXTURE_A' }, resistor('r', 1000), capacitor()],
      wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('ms', 'out', 'r', 'A'), wire('r', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    const contexts = []
    const spy = createTransientContributionRegistry({
      contributions: new Map([['CAPACITOR', (ctx) => { contexts.push(ctx.driveContext); return getTransientContribution('CAPACITOR')(ctx) }]]),
      driveTerminals: new Map([['CAPACITOR', getTransientDriveTerminals('CAPACITOR')]]),
    })
    const { trajectory } = run(circuit, 3, { mixedSignalContributionRegistry: registry, transientContributionRegistry: spy })
    expect(contexts).toEqual([undefined, undefined, undefined])
    expect(trajectory).toEqual([undefined, undefined, undefined])
    expect(contextOf(circuit, undefined, { highImpedanceKeys: new Set(['ms:out']) })).toBeNull()
  })
})

describe('A11-COMP4-PREQ5 — step conduction (local, pure)', () => {
  /** c.pinA -- r -- node Y (ms.sw) ; ms.vcc on 5V, ms.gnd on GND ; c.pinB on GND. */
  const switched = () => ({
    components: [power(), { uid: 'ms', type: 'MS_FIXTURE_A' }, resistor('r', 2000), capacitor()],
    wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('ms', 'sw', 'r', 'A'), wire('r', 'B', 'c', 'pinA'),
      wire('ms', 'in', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')],
  })
  const msKeys = new Set(MS_PINS.map((pin) => `ms:${pin}`))

  it('T13 without the pair no admissible path exists ; with it a unique path to an authority appears', () => {
    expect(contextOf(switched(), undefined, { highImpedanceKeys: msKeys })).toBeNull()
    expect(contextOf(switched(), undefined, { highImpedanceKeys: msKeys, conductionPairs: [{ uid: 'ms', pinA: 'sw', pinB: 'vcc' }] }))
      .toEqual({ targetVoltage: 5, equivalentResistance: 2000, reference: 'c:pinB' })
    expect(contextOf(switched(), undefined, { highImpedanceKeys: msKeys, conductionPairs: [{ uid: 'ms', pinA: 'sw', pinB: 'gnd' }] }))
      .toEqual({ targetVoltage: 0, equivalentResistance: 2000, reference: 'c:pinB' })
    // A pair shorting two different authorities makes the joined net unresolved : null, never a pick.
    expect(contextOf(switched(), undefined, { highImpedanceKeys: msKeys,
      conductionPairs: [{ uid: 'ms', pinA: 'sw', pinB: 'vcc' }, { uid: 'ms', pinA: 'vcc', pinB: 'gnd' }] })).toBeNull()
  })

  it('T14 the conduction pair and the network never mutate prepared (uf, nets, allKeys)', () => {
    const circuit = switched()
    const prepared = prepareCircuit(circuit.components, circuit.wires)
    const snapshot = JSON.stringify([[...prepared.nets], prepared.allKeys, [...prepared.uf.parent]])
    const network = createResistiveDriveNetwork({
      prepared,
      voltageFacts: resolveSourceDrivenVoltageFacts(circuit.components, prepared),
      resistiveEdges: collectResistiveEdges(circuit.components, prepared, getResistiveEdge),
      conductionPairs: [{ uid: 'ms', pinA: 'sw', pinB: 'vcc' }],
      highImpedanceKeys: msKeys,
    })
    expect(resolveResistiveDriveContext(network, 'c:pinA', 'c:pinB')).not.toBeNull()
    expect(JSON.stringify([[...prepared.nets], prepared.allKeys, [...prepared.uf.parent]])).toBe(snapshot)
    const code = executable(source('resistiveDriveContext.js'))
    expect(code).not.toMatch(/uf\.(?:union|find)\(|prepared\.\w+\s*=|\.nets\.(?:set|delete|clear)\(|allKeys\.(?:push|splice)\(/)
    expect(code).not.toMatch(/preparation\.js|prepareCircuit/)
  })
})

describe('A11-COMP4-PREQ5 — capacitor external-R law', () => {
  it('T21 charge uses the real R : V[n] = 5 (1 - e^(-n dt / RC)), dt in ms, R in Ω, C in F', () => {
    const { trajectory } = run(rc(1000, 1e-4), 5)
    trajectory.forEach((v, i) => expect(v).toBeCloseTo(charged(5, 1000, 1e-4, i + 1), 12))
    expect(trajectory[0]).toBeCloseTo(5 * (1 - Math.exp(-0.016 / 0.1)), 12)
  })

  it('T22 discharge through the real R towards 0 V (no pedagogical constant)', () => {
    const circuit = { components: [power(), resistor('r', 4700), capacitor('c', 1e-5)],
      wires: [wire('c', 'pinA', 'r', 'A'), wire('r', 'B', 'p', 'GND'), wire('c', 'pinB', 'p', 'GND')] }
    expect(contextOf(circuit)).toEqual({ targetVoltage: 0, equivalentResistance: 4700, reference: 'c:pinB' })
    const states = new Map([['c', { voltage: 5 }]])
    const trajectory = []
    const scheduler = createSimulationRuntimeSession()
    for (let i = 0; i < 4; i++) {
      step(circuit, { runtimeSession: scheduler, electricalTransientStates: states })
      trajectory.push(states.get('c').voltage)
    }
    trajectory.forEach((v, i) => expect(v).toBeCloseTo(charged(0, 4700, 1e-5, i + 1, 5), 12))
    expect(trajectory[3]).toBeLessThan(trajectory[0])
  })

  it('T23 two R values give two observable time constants', () => {
    const slow = run(rc(10000, 1e-4), 10).trajectory
    const fast = run(rc(1000, 1e-4), 10).trajectory
    fast.forEach((v, i) => expect(v).toBeGreaterThan(slow[i]))
    // ln(1 - V/5) = -t / tau : the ratio of the two slopes is exactly R2/R1.
    const slope = (trajectory) => Math.log(1 - trajectory[9] / 5) / (10 * DT / 1000)
    expect(slope(fast) / slope(slow)).toBeCloseTo(10, 9)
    expect(-1 / slope(fast)).toBeCloseTo(0.1, 9)
    expect(-1 / slope(slow)).toBeCloseTo(1, 9)
  })

  it('T19 CAPACITOR state is signed V(pinA) - V(pinB)', () => {
    const reversed = { components: [power(), resistor('r', 1000), capacitor()],
      wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'pinB'), wire('c', 'pinA', 'p', 'GND')] }
    const { trajectory } = run(reversed, 3)
    trajectory.forEach((v, i) => expect(v).toBeCloseTo(charged(-5, 1000, 1e-4, i + 1), 12))
    expect(Math.sign(trajectory[2])).toBe(-1)
  })

  it('T20 POLARIZED_CAPACITOR state is signed V(plus) - V(minus) ; a negative drive is refused (no reverse physics)', () => {
    const forward = { components: [power(), resistor('r', 1000), capacitor('c', 1e-4, 'POLARIZED_CAPACITOR')],
      wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'plus'), wire('c', 'minus', 'p', 'GND')] }
    const { trajectory } = run(forward, 3)
    trajectory.forEach((v, i) => expect(v).toBeCloseTo(charged(5, 1000, 1e-4, i + 1), 12))
    const reverse = { ...forward, wires: [wire('p', '5V', 'r', 'A'), wire('r', 'B', 'c', 'minus'), wire('c', 'plus', 'p', 'GND')] }
    expect(contextOf(reverse, ['plus', 'minus'])).toEqual({ targetVoltage: -5, equivalentResistance: 1000, reference: 'c:minus' })
    const refused = run(reverse, 3)
    expect(refused.trajectory).toEqual([undefined, undefined, undefined])
    expect(getTransientContribution('POLARIZED_CAPACITOR')({ pins: {}, params: { capacitance: 1e-4 }, supplyVoltage: 5, dt: DT, currentTimeMs: DT,
      previousState: { voltage: 1 }, driveContext: { targetVoltage: -5, equivalentResistance: 1000, reference: 'minus' } }))
      .toEqual({ state: { voltage: 1 }, contribution: null })
  })

  it('T25 PREQ4 observes the new signed state unchanged', () => {
    const states = new Map([['c', { voltage: -2.5 }]])
    expect(observeTransientVoltageFacts([{ uid: 'c', type: 'CAPACITOR' }], { getTransientObservation }, states))
      .toEqual([{ uid: 'c', positivePin: 'pinA', referencePin: 'pinB', voltage: -2.5 }])
  })

  it('invalid drive contexts never reach the external law (fallback to the historical path)', () => {
    const contribute = getTransientContribution('CAPACITOR')
    const base = { pins: { pinA: 'HIGH', pinB: 'LOW' }, params: { capacitance: 1e-4 }, supplyVoltage: 5, dt: DT, currentTimeMs: DT, previousState: undefined }
    const historical = contribute(base)
    for (const driveContext of [null, {}, { targetVoltage: 5, equivalentResistance: 0 }, { targetVoltage: 5, equivalentResistance: -1 },
      { targetVoltage: Number.NaN, equivalentResistance: 10 }, { targetVoltage: 5, equivalentResistance: Infinity }, { targetVoltage: '5', equivalentResistance: 10 }]) {
      expect(contribute({ ...base, driveContext })).toEqual(historical)
    }
  })
})

describe('A11-COMP4-PREQ5 — historical fallback and non-regression', () => {
  const direct = { components: [power(), capacitor()], wires: [wire('p', '5V', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
  const legacy = { hasTransientContribution, getTransientContribution, getTransientObservation } // pre-PREQ5 shape

  it('T24/T32 without an admissible drive context the historical behaviour is identical', () => {
    const results = (registry) => {
      const session = createSimulationRuntimeSession()
      return [1, 2, 3].map(() => step(direct, { runtimeSession: session, transientContributionRegistry: registry }))
    }
    expect(results(undefined)).toEqual(results(legacy))
    // Historical pedagogical law, unchanged : tau = C × 1000, dt used as given.
    const session = createSimulationRuntimeSession()
    step(direct, { runtimeSession: session })
    expect(session.electricalTransientStates.get('c').voltage).toBeCloseTo(5 * (1 - Math.exp(-DT / (1e-4 * 1000))), 12)
    // A contributor receives no driveContext key when there is none.
    const seen = []
    const spy = createTransientContributionRegistry({
      contributions: new Map([['CAPACITOR', (ctx) => { seen.push(Object.keys(ctx).sort()); return getTransientContribution('CAPACITOR')(ctx) }]]),
      driveTerminals: new Map([['CAPACITOR', { positivePin: 'pinA', referencePin: 'pinB' }]]),
    })
    step(direct, { transientContributionRegistry: spy })
    expect(seen).toEqual([['currentTimeMs', 'dt', 'params', 'pins', 'previousState', 'supplyVoltage']])
    // An RC circuit with a registry that declares no drive terminals keeps the historical (unpowered) behaviour.
    expect(run(rc(), 2, { transientContributionRegistry: legacy }).trajectory).toEqual([undefined, undefined])
  })

  it('driveTerminals must be two distinct pins of a registered contributor', () => {
    const noop = () => ({ state: undefined, contribution: null })
    expect(() => createTransientContributionRegistry({ driveTerminals: new Map([['GHOST', { positivePin: 'a', referencePin: 'b' }]]) })).toThrow(/invalid drive terminals/)
    expect(() => createTransientContributionRegistry({ contributions: new Map([['X', noop]]), driveTerminals: new Map([['X', { positivePin: 'a', referencePin: 'a' }]]) })).toThrow(/invalid drive terminals/)
    expect(getTransientDriveTerminals('CAPACITOR')).toEqual({ positivePin: 'pinA', referencePin: 'pinB' })
    expect(getTransientDriveTerminals('POLARIZED_CAPACITOR')).toEqual({ positivePin: 'plus', referencePin: 'minus' })
    expect(getTransientDriveTerminals('INDUCTOR')).toBeNull()
  })

  it('T30 historical RESISTOR passive propagation is unchanged by an RC drive', () => {
    const circuit = rc(1000)
    const withDrive = step(circuit).pinSignals
    const without = step(circuit, { transientContributionRegistry: legacy }).pinSignals
    expect(withDrive).toEqual(without)
    expect(withDrive.get('r:B')).toBe('HIGH')
  })
})

describe('A11-COMP4-PREQ5 — causal order and ONE RESOLUTION', () => {
  /**
   * Generic mixed producer : closes sw<->vcc from its 2nd step on (state = step count) and
   * records the numeric fact it samples on `in` (the capacitor node).
   */
  const closingSwitch = (log) => createMixedSignalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A', {
    contribute: ({ previousState, pinVoltages }) => {
      const n = (previousState ?? 0) + 1
      log.push({ n, sampled: pinVoltages.in })
      return { state: n, effects: n >= 2 ? { conductionPairs: [['sw', 'vcc']] } : {} }
    },
  }]]) })
  const circuit = () => ({
    components: [power(), { uid: 'ms', type: 'MS_FIXTURE_A' }, resistor('r', 2000), capacitor('c', 1e-4)],
    wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('ms', 'sw', 'r', 'A'), wire('r', 'B', 'c', 'pinA'),
      wire('ms', 'in', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')],
  })

  it('CAUSAL mixed effect[n] -> conductionPair[n] -> driveContext[n] -> capacitor[n] -> PREQ4 -> SAMPLE[n+1], one resolution per step', () => {
    const log = []
    const session = createSimulationRuntimeSession()
    const states = []
    for (let i = 1; i <= 4; i++) {
      step(circuit(), { runtimeSession: session, mixedSignalContributionRegistry: closingSwitch(log) })
      states.push(session.electricalTransientStates.get('c')?.voltage)
      expect(resolutions).toHaveLength(i)
    }
    // Step 1 : switch open -> no drive context -> historical path (unpowered : no state).
    expect(states[0]).toBeUndefined()
    // Step 2 : the pair produced at step 2 drives the capacitor at step 2 (same step).
    expect(states[1]).toBeCloseTo(5 * (1 - Math.exp(-0.016 / 0.2)), 12)
    expect(states[2]).toBeCloseTo(charged(5, 2000, 1e-4, 2), 12)
    expect(states[3]).toBeCloseTo(charged(5, 2000, 1e-4, 3), 12)
    // SAMPLE[n+1] observes transient state[n] (PREQ4), never state[n+1].
    const reference = log[2].sampled.reference
    expect(log.map(({ sampled }) => sampled?.voltage)).toEqual([undefined, undefined, states[1], states[2]])
    expect(log[3].sampled).toEqual({ voltage: states[2], reference })
    // The step-n pair joined nets for step n only : the ONE resolution received it as plain data.
    expect(resolutions[1][3].conductionPairs).toEqual([{ uid: 'ms', pinA: 'sw', pinB: 'vcc' }])
    expect(resolutions[0][3].conductionPairs).toEqual([])
  })

  it('G1 causal order in the integration : SAMPLE < drive contexts < transient update < COMMIT < ONE resolution', () => {
    const integration = executable(source('simulationRuntimeIntegration.js'))
    const body = integration.slice(integration.indexOf('function computeElectricalStep('), integration.indexOf('export function runSimulationWithRuntime('))
    const order = ['computeMixedSignalContributions(', 'computeTransientDriveContexts(', 'computeTransientElectricalContributions(',
      'commitMixedSignalStates(', 'resolveElectricalSignals(effectiveComponents, prepared, externalSignals']
      .map((marker) => body.indexOf(marker))
    expect(order.every((index) => index > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('T15/T16/T17 ONE RESOLUTION, no extra Scheduler/Clock, no wall-clock', () => {
    const engine = executable(source('resistiveDriveContext.js'))
    expect(engine).not.toMatch(/resolveSignals|resolveElectricalSignals|resolveDcVoltageDomains|propagatePassiveConduction|computeDcAnalysis/)
    expect(engine).not.toMatch(/Scheduler|createScheduler|Clock|currentTimeMs|\bdt\b/)
    expect(engine).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    expect(engine).not.toMatch(/matrix|gauss|invert|kcl|mna|spice/i)
    const integration = executable(source('simulationRuntimeIntegration.js'))
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
    expect(integration.match(/\bcreateScheduler\s*\(/g)).toHaveLength(1)
    const registry = executable(source('transientContributionRegistry.js'))
    expect(registry).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    const session = createSimulationRuntimeSession()
    for (let i = 1; i <= 3; i++) {
      step(rc(), { runtimeSession: session })
      expect(resolutions).toHaveLength(i)
    }
    expect(session.scheduler.getCurrentTime()).toBe(3 * DT)
  })

  it('computeTransientDriveContexts is pure with respect to its inputs and the transient store', () => {
    const c = circuit()
    const prepared = prepareCircuit(c.components, c.wires)
    const sourceVoltageFacts = resolveSourceDrivenVoltageFacts(c.components, prepared)
    const factsSnapshot = JSON.stringify([...sourceVoltageFacts])
    const input = {
      transientComponents: [c.components[3]],
      transientRegistry: { getTransientDriveTerminals },
      components: c.components,
      prepared,
      sourceVoltageFacts,
      mixedSignalComponents: [c.components[1]],
      mixedSignalStep: { digitalSignals: new Map(), electricalAuthorities: { voltageOutputs: [], conductionPairs: [{ uid: 'ms', pinA: 'sw', pinB: 'gnd' }] } },
    }
    const contexts = computeTransientDriveContexts(input)
    expect([...contexts]).toEqual([['c', { targetVoltage: 0, equivalentResistance: 2000, reference: 'pinB' }]])
    expect(Object.isFrozen(contexts.get('c'))).toBe(true)
    expect(JSON.stringify([...sourceVoltageFacts])).toBe(factsSnapshot)
    // A mixed digital output driven this step on the path is not high impedance : null.
    const driven = computeTransientDriveContexts({ ...input, mixedSignalStep: { ...input.mixedSignalStep, digitalSignals: new Map([['ms:in', 'HIGH']]) } })
    expect(driven.size).toBe(0)
    // A registry without drive terminals (historical shape) yields no context.
    expect(computeTransientDriveContexts({ ...input, transientRegistry: {} }).size).toBe(0)
  })

  it('step voltage outputs are authorities with the resolution reference rule (invalid -> unresolved, never 0 V)', () => {
    const producer = (value) => createMixedSignalContributionRegistry({ contributions: new Map([['MS_FIXTURE_A', {
      voltageOutputPins: ['out'], voltageReferencePin: 'gnd',
      contribute: () => ({ state: null, effects: { voltageOutputs: { out: value } } }),
    }]]) })
    const c = { components: [power(), { uid: 'ms', type: 'MS_FIXTURE_A' }, resistor('r', 1000), capacitor()],
      wires: [wire('p', '5V', 'ms', 'vcc'), wire('p', 'GND', 'ms', 'gnd'), wire('ms', 'out', 'r', 'A'), wire('r', 'B', 'c', 'pinA'), wire('c', 'pinB', 'p', 'GND')] }
    const ok = run(c, 2, { mixedSignalContributionRegistry: producer(2.5) }).trajectory
    ok.forEach((v, i) => expect(v).toBeCloseTo(charged(2.5, 1000, 1e-4, i + 1), 12))
    expect(run(c, 2, { mixedSignalContributionRegistry: producer(null) }).trajectory).toEqual([undefined, undefined])
    expect(run(c, 2, { mixedSignalContributionRegistry: producer(-1) }).trajectory).toEqual([undefined, undefined])
  })
})
