import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { getSimulationModel, isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulationRegistry.js'
import { DiodeModel } from '../models/DiodeModel.js'
import { getAnalogConditionalConduction, createIsolatedThresholdConduction } from '../analogConditionalConductionRegistry.js'
import { getConditionalConduction } from '../conditionalConductionRegistry.js'
import { getDcContribution, createDiodeDcContribution, getUnconditionalConductionPinPair, getResistiveEdge } from '../dcContributionRegistry.js'
import { getDcVoltageDomainContribution } from '../dcVoltageDomainRegistry.js'
import { getDcSource } from '../dcSourceRegistry.js'
import { getAllMixedSignalContributionTypes } from '../mixedSignalContributionRegistry.js'

// A11-COMP6 — 4N35 optocoupler, Level-1: diode-family A-K input, isolated optical transfer to C-E.
const TYPE = '4N35'
const PINOUT = [['A', 'input'], ['K', 'passive'], ['NC', 'passive'], ['E', 'passive'], ['C', 'output'], ['B', 'passive']]
const INPUT = ['A', 'K']
const OUTPUT = ['C', 'E', 'B']
const FORBIDDEN = INPUT.flatMap((i) => OUTPUT.flatMap((o) => [[i, o], [o, i]]))
const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const { HIGH, LOW, UNKNOWN } = Signal

/**
 * Two galvanically separate domains. Input: POWER `vin` (vinVolts) -> 220 ohm `rin` -> A,
 * K -> vin GND (`direct` wires vin straight onto A). Output: its own POWER `vout` (5 V) ->
 * 220 ohm pull-up `rl` -> C, E -> vout GND. No wire ever joins the two domains.
 */
function circuit({ vinVolts = 5, input = true, direct = false, reverse = false, output = true, pullUp = true, parameters } = {}) {
  const components = [{ uid: 'u', type: TYPE, ...(parameters ? { parameters } : {}) }]
  const wires = []
  if (input) {
    components.push({ uid: 'vin', type: 'POWER', parameters: { voltage: vinVolts } })
    const [plus, minus] = reverse ? ['K', 'A'] : ['A', 'K']
    if (direct) wires.push(wire('vin', '5V', 'u', plus))
    else {
      components.push({ uid: 'rin', type: 'RESISTOR' })
      wires.push(wire('vin', '5V', 'rin', 'A'), wire('rin', 'B', 'u', plus))
    }
    wires.push(wire('vin', 'GND', 'u', minus))
  }
  if (output) {
    components.push({ uid: 'vout', type: 'POWER', parameters: { voltage: 5 } })
    wires.push(wire('vout', 'GND', 'u', 'E'))
  }
  if (pullUp) {
    components.push({ uid: 'rl', type: 'RESISTOR' })
    wires.push(wire('rl', 'B', 'u', 'C'))
    if (output) wires.push(wire('vout', '5V', 'rl', 'A'))
  }
  return { components, wires }
}
const run = (c) => resolveSignals(c.components, prepareCircuit(c.components, c.wires))
const fact = (result, pin) => result.dcVoltageDomains.get(`u:${pin}`)
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const contract = () => getAnalogConditionalConduction(TYPE)
const select = (volts, params = { forwardVoltage: 0.7, onResistance: 10 }) =>
  contract().contribute({ inputVoltages: { A: volts }, params })

describe('A11-COMP6 4N35 registration (canonical, simulation, registries)', () => {
  it('T01 canonical entry: 6 pins A,K,NC,E,C,B, diode-family parameters, executable, no internal topology', () => {
    expect(getAllCanonicalTypes().filter((t) => t === TYPE)).toHaveLength(1)
    expect(getCanonicalEntry(TYPE)).toMatchObject({
      type: TYPE, modelAvailable: true, defaultParameters: { forwardVoltage: 0.7, onResistance: 10 },
      capabilities: ['digital', 'dc'], internalConnections: null,
    })
    expect(getCanonicalEntry(TYPE).pins.map(({ id, role }) => [id, role])).toEqual(PINOUT)
    expect(getCanonicalEntry(TYPE).parameterSchema.map((p) => [p.key, p.defaultValue])).toEqual([['forwardVoltage', 0.7], ['onResistance', 10]])
    // No fake common ground: neither K nor E carries a ground/power role.
    expect(getCanonicalEntry(TYPE).pins.filter((p) => /ground|power/.test(p.role))).toEqual([])
  })
  it('T02 simulation model: validation only, same parameter contract as DiodeModel', () => {
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    const model = getSimulationModel(TYPE, { requireCapability: 'dc' })
    expect(model.type).toBe(TYPE)
    expect(Object.keys(model).sort()).toEqual(['type', 'validate'])
    expect(model.validate).toBe(DiodeModel.validate)
    expect(model.validate(getSimulationDefaultParameters(TYPE))).toBe(true)
    for (const invalid of [null, {}, { forwardVoltage: -1, onResistance: 10 }, { forwardVoltage: 0.7, onResistance: 0 }]) {
      expect(model.validate(invalid)).toBe(false)
    }
  })
  it('T03 registered once in each Level-1 registry; no other electrical capability', () => {
    expect(getDcContribution(TYPE)).toBeTypeOf('function')
    expect(contract()).not.toBeNull()
    expect(getConditionalConduction(TYPE)).toBeNull()
    expect(getDcVoltageDomainContribution(TYPE)).toBeNull()
    expect(getUnconditionalConductionPinPair(TYPE)).toBeNull()
    expect(getResistiveEdge(TYPE)).toBeNull()
    expect(getDcSource({ uid: 'u', type: TYPE })).toBeNull()
    expect(getAllMixedSignalContributionTypes()).not.toContain(TYPE)
  })
})

describe('A11-COMP6 4N35 input A-K (generic diode family)', () => {
  const reference = createDiodeDcContribution({ reverseBreakdown: false, anodePinId: 'A', cathodePinId: 'K' })
  const params = { forwardVoltage: 0.7, onResistance: 10 }
  it('T04 forward A HIGH / K LOW: diode contribution with the canonical parameters', () => {
    expect(getDcContribution(TYPE)({ pins: { A: HIGH, K: LOW }, params, supplyVoltage: 5 })).toEqual({ voltage: 5, current: (5 - 0.7) / 10 })
  })
  it('T05 reverse A LOW / K HIGH: no current, no reverse breakdown even with breakdown parameters', () => {
    expect(getDcContribution(TYPE)({ pins: { A: LOW, K: HIGH }, params, supplyVoltage: 5 })).toEqual({ voltage: 5, current: 0 })
    expect(getDcContribution(TYPE)({ pins: { A: LOW, K: HIGH }, params: { ...params, breakdownVoltage: 1, breakdownResistance: 1 }, supplyVoltage: 50 }))
      .toEqual({ voltage: 50, current: 0 })
  })
  it('T06 behaviour is exactly the generic factory (A/K ids, no breakdown) and reads only A and K', () => {
    const levels = [HIGH, LOW, UNKNOWN, Signal.FLOATING, undefined]
    for (const a of levels) for (const k of levels) for (const other of levels) {
      const pins = { A: a, K: k, C: other, E: other, B: other, NC: other }
      expect(getDcContribution(TYPE)({ pins, params, supplyVoltage: 9 })).toEqual(reference({ pins: { A: a, K: k }, params, supplyVoltage: 9 }))
    }
    const registry = src('dcContributionRegistry.js')
    expect(registry).toMatch(/createDiodeDcContribution\(\{ reverseBreakdown: false, anodePinId: "A", cathodePinId: "K" \}\)/)
    expect(registry.match(/function createDiodeDcContribution/g)).toHaveLength(1)
  })
  it('T07 circuit: forward-biased input carries diode current in dcAnalysis (single input source)', () => {
    const result = run(circuit({ direct: true, output: false, pullUp: false }))
    expect(result.dcAnalysis.get('u')).toEqual({ voltage: 5, current: (5 - 0.7) / 10 })
    const reversed = run(circuit({ direct: true, reverse: true, output: false, pullUp: false }))
    expect(reversed.dcAnalysis.get('u')).toEqual({ voltage: 5, current: 0 })
  })
})

describe('A11-COMP6 4N35 optical transfer (Level-1 threshold, A relative to K)', () => {
  it('T08 contract: input A observed relative to K, threshold from params, only [C,E] selected, C/E projected', () => {
    expect(contract()).toMatchObject({ referencePin: 'K', inputPins: ['A'], digitalProjectionPins: ['C', 'E'] })
    expect(contract().requiredPositivePins).toBeUndefined()
    expect(contract().groups).toBeUndefined()
    expect(select(5)).toEqual([['C', 'E']])
    expect(select(0.71)).toEqual([['C', 'E']])
    for (const v of [0.7, 0.69, 0]) expect(select(v)).toEqual([])
    // Threshold comes from the effective instance parameter, never a hidden constant.
    expect(select(1.5, { forwardVoltage: 2, onResistance: 10 })).toEqual([])
    expect(select(2.5, { forwardVoltage: 2, onResistance: 10 })).toEqual([['C', 'E']])
    for (const params of [{}, { forwardVoltage: NaN }, { forwardVoltage: '0.7' }, null, undefined]) {
      expect(contract().contribute({ inputVoltages: { A: 5 }, params })).toEqual([])
    }
  })
  it('CASE 1 input not powered / unresolved: C-E high-Z, the pull-up sets C', () => {
    for (const c of [circuit({ input: false }), { ...circuit(), wires: circuit().wires.filter((w) => !(w.toUid === 'u' && w.toPin === 'K')) }]) {
      const result = run(c)
      expect(fact(result, 'C').voltage).toBe(5)
      expect(result.pinSignals.get('u:C')).toBe(HIGH)
    }
  })
  it('CASE 2 reverse-biased input: C-E high-Z', () => {
    for (const direct of [true, false]) {
      const result = run(circuit({ reverse: true, direct }))
      expect(fact(result, 'C').voltage).toBe(5)
      expect(result.pinSignals.get('u:C')).toBe(HIGH)
    }
  })
  it('CASE 3 V(A)-V(K) <= forwardVoltage: C-E high-Z', () => {
    for (const vinVolts of [0.5, 0.7]) {
      const result = run(circuit({ vinVolts, direct: true }))
      expect(fact(result, 'A').voltage).toBe(vinVolts)
      expect(fact(result, 'C').voltage).toBe(5)
    }
    expect(fact(run(circuit({ vinVolts: 1.5, direct: true, parameters: { forwardVoltage: 2, onResistance: 10 } })), 'C').voltage).toBe(5)
  })
  it('CASE 4 V(A)-V(K) > forwardVoltage: C-E conducts, C takes the external output reference (LOW)', () => {
    for (const c of [circuit(), circuit({ vinVolts: 0.71, direct: true }), circuit({ vinVolts: 2.5, direct: true, parameters: { forwardVoltage: 2, onResistance: 10 } })]) {
      const result = run(c)
      expect(fact(result, 'C')).toEqual(fact(result, 'E'))
      expect(fact(result, 'C').voltage).toBe(0)
      expect(result.pinSignals.get('u:C')).toBe(LOW)
      expect(result.dcAnalysis.get('rl')).toEqual({ voltage: 5, current: 5 / 220 })
    }
  })
  it('CASE 5 active with no output-side source: no voltage, no source, no HIGH invented on C/E', () => {
    for (const c of [circuit({ output: false, pullUp: false }), circuit({ output: false, pullUp: true })]) {
      const result = run(c)
      expect(fact(result, 'A').voltage).toBe(5)
      for (const pin of ['C', 'E', 'B']) {
        expect(fact(result, pin)).toBeUndefined()
        expect(result.pinSignals.get(`u:${pin}`)).not.toBe(HIGH)
      }
    }
  })
  it('CASE 6 separate input/output references: causal transfer without merging the references', () => {
    const active = run(circuit())
    const inputRef = fact(active, 'K').reference
    const outputRef = fact(active, 'E').reference
    expect(inputRef).not.toBe(outputRef)
    expect(fact(active, 'A')).toEqual({ voltage: 5, reference: inputRef })
    expect(fact(active, 'C')).toEqual({ voltage: 0, reference: outputRef })
    // The input domain is identical whether or not the output conducts or exists.
    const bare = run(circuit({ output: false, pullUp: false }))
    for (const pin of INPUT) expect(fact(active, pin)).toEqual(fact(bare, pin))
  })
  it('CASE 6b shared ground is a user wiring choice, never created by the part', () => {
    const c = circuit()
    c.wires.push(wire('vin', 'GND', 'vout', 'GND'))
    const result = run(c)
    expect(fact(result, 'K').reference).toBe(fact(result, 'E').reference)
    expect(fact(result, 'C').voltage).toBe(0)
    expect(fact(result, 'A').voltage).toBe(5)
  })
  it('CASE 7 B has no Level-1 effect on C-E', () => {
    for (const base of [circuit(), circuit({ input: false })]) {
      const expected = run(base)
      // Wiring B onto a net may rename that net's identity, never change its voltage or level.
      for (const extra of [[wire('vout', '5V', 'u', 'B')], [wire('vout', 'GND', 'u', 'B')]]) {
        const result = run({ ...base, wires: [...base.wires, ...extra] })
        expect(fact(result, 'C').voltage).toBe(fact(expected, 'C').voltage)
        expect(result.pinSignals.get('u:C')).toBe(expected.pinSignals.get('u:C'))
      }
    }
    expect(contract().inputPins).not.toContain('B')
  })
  it('CASE 8 NC has no Level-1 effect', () => {
    for (const base of [circuit(), circuit({ input: false })]) {
      const expected = fact(run(base), 'C')
      for (const extra of [[wire('vout', '5V', 'u', 'NC')], [wire('vout', 'GND', 'u', 'NC')]]) {
        expect(fact(run({ ...base, wires: [...base.wires, ...extra] }), 'C')).toEqual(expected)
      }
    }
    const active = run(circuit())
    expect(fact(active, 'NC')).toBeUndefined()
  })
  it('T09 digital projection: a GPIO on the C net reads the final electrical level', () => {
    for (const [input, expected] of [[true, LOW], [false, HIGH]]) {
      const c = circuit({ input })
      c.components.push({ uid: 'uno', type: 'ARDUINO' })
      c.wires.push(wire('u', 'C', 'uno', 'D2'))
      expect(run(c).pinSignals.get('uno:D2')).toBe(expected)
    }
  })
  it('T10 deterministic and independent of component/wire ordering', () => {
    for (const c of [circuit(), circuit({ reverse: true }), circuit({ output: false })]) {
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        const wires = [...c.wires.slice(i % c.wires.length), ...c.wires.slice(0, i % c.wires.length)]
        expect(normalized(run({ components, wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
      }
    }
  })
})

describe('A11-COMP6 4N35 galvanic isolation gate (blocking)', () => {
  it('ISO-1 no contribution ever pairs A/K with C/E/B, in either orientation', () => {
    const pairs = [-5, 0, 0.5, 0.7, 0.71, 1, 5, 24].flatMap((v) =>
      [{ forwardVoltage: 0.7, onResistance: 10 }, { forwardVoltage: 0, onResistance: 1 }, { forwardVoltage: 5, onResistance: 1e9 }].flatMap((p) => select(v, p)))
    expect(pairs.length).toBeGreaterThan(0)
    for (const pair of pairs) {
      expect(pair).toEqual(['C', 'E'])
      for (const forbidden of FORBIDDEN) expect(pair).not.toEqual(forbidden)
    }
    expect(contract().digitalProjectionPins.some((pin) => INPUT.includes(pin))).toBe(false)
  })
  it('ISO-2 K is only the observation reference of A; it is never a pin of the C/E domain', () => {
    expect(contract().referencePin).toBe('K')
    expect([...contract().inputPins, contract().referencePin].sort()).toEqual(['A', 'K'])
    for (const pin of OUTPUT) expect([...contract().inputPins, contract().referencePin]).not.toContain(pin)
  })
  it('ISO-3 no projection or continuity carries an A/K voltage onto C/E/B (and vice versa)', () => {
    const active = run(circuit())
    const inputNets = new Set(INPUT.map((pin) => fact(active, pin).reference))
    for (const pin of ['C', 'E']) {
      expect(fact(active, pin).voltage).toBe(0)
      expect(inputNets.has(fact(active, pin).reference)).toBe(false)
    }
    // Output alone powered, input not: nothing appears on A/K.
    const outputOnly = run(circuit({ input: false }))
    for (const pin of INPUT) expect(fact(outputOnly, pin)).toBeUndefined()
    // Input alone powered: nothing appears on C/E/B, whatever the input state.
    for (const reverse of [false, true]) {
      const inputOnly = run(circuit({ output: false, pullUp: false, reverse }))
      for (const pin of OUTPUT) expect(fact(inputOnly, pin)).toBeUndefined()
    }
  })
  it('ISO-4 the part is never a source and never declares an internal connection', () => {
    expect(getDcSource({ uid: 'u', type: TYPE })).toBeNull()
    expect(getCanonicalEntry(TYPE).internalConnections).toBeNull()
    expect(getConditionalConduction(TYPE)).toBeNull()
    expect(getUnconditionalConductionPinPair(TYPE)).toBeNull()
  })
  it('ISO-5 the generic factory never returns a pair touching the observed input domain', () => {
    const generic = createIsolatedThresholdConduction({ inputPin: 'in', referencePin: 'ref', thresholdParameter: 't', outputPair: ['o1', 'o2'] })
    expect(generic.contribute({ inputVoltages: { in: 2 }, params: { t: 1 } })).toEqual([['o1', 'o2']])
    expect(generic.contribute({ inputVoltages: { in: 1 }, params: { t: 1 } })).toEqual([])
    expect(createIsolatedThresholdConduction.toString()).not.toMatch(/4N35|'A'|'K'|'C'|'E'/)
  })
})

describe('A11-COMP6 4N35 architecture guards', () => {
  it('ARCH-1 no 4N35-specific branch in the generic resolver, preparation, engine or runtime', () => {
    for (const name of ['resolution.js', 'preparation.js', 'engine.js', 'scheduler.js', 'simulationRuntimeIntegration.js', 'resolveComponentParameters.js']) {
      expect(src(name), name).not.toMatch(/4N35|4n35|FourN35|optocoupl/i)
    }
  })
  it('ARCH-2 the registry holds one declarative 4N35 entry built by the generic factory; no CTR/IF/hFE model', () => {
    const registry = src('analogConditionalConductionRegistry.js')
    expect(registry.match(/\['4N35', createIsolatedThresholdConduction\(/g)).toHaveLength(1)
    expect(registry.match(/function createIsolatedThresholdConduction/g)).toHaveLength(1)
    expect(registry.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')).not.toMatch(/ctr|hfe|current|beta/i)
  })
  it('ARCH-3 comparators (LM339NE4, LM393P) keep their historical contract', () => {
    for (const type of ['LM339NE4', 'LM393P']) {
      expect(getAnalogConditionalConduction(type)).toMatchObject({ referencePin: 'GND', requiredPositivePins: ['VCC'] })
    }
  })
  it('ARCH-4 no mutation of inputs, components or wires', () => {
    const inputVoltages = Object.freeze({ A: 5 })
    const params = Object.freeze({ forwardVoltage: 0.7, onResistance: 10 })
    expect(contract().contribute({ inputVoltages, params })).toEqual([['C', 'E']])
    const c = circuit()
    const snapshot = structuredClone(c)
    run(c)
    expect(c).toEqual(snapshot)
  })
})
