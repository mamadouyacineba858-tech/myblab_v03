import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { getSimulationModel, isSimulationModelAvailable } from '../simulationRegistry.js'
import { Lm358pModel } from '../models/Lm358pModel.js'
import { getDcVoltageDomainContribution, hasDcVoltageDomainContribution, createSingleSupplyOpAmps } from '../dcVoltageDomainRegistry.js'
import { getAnalogConditionalConduction } from '../analogConditionalConductionRegistry.js'
import { getConditionalConduction } from '../conditionalConductionRegistry.js'
import { getDcContribution } from '../dcContributionRegistry.js'
import { FEEDBACK_VOLTAGE_TOLERANCE } from '../controlledAnalogFeedbackSolver.js'

// A11-COMP3 — TI LM358P dual op amp, Level-1 through the generic PREQ1 + PREQ2 + PREQ3 contracts only.
const TYPE = 'LM358P'
const PINOUT = [
  ['1OUT', 'output'], ['1IN-', 'input'], ['1IN+', 'input'], ['VCC-', 'ground'],
  ['2IN+', 'input'], ['2IN-', 'input'], ['2OUT', 'output'], ['VCC+', 'power'],
]
const PARAMS = { openLoopGain: 100000, outputHighHeadroom: 1.5 }
const CHANNELS = [1, 2]
const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid, voltage) => ({ uid, type: 'POWER', parameters: { voltage } })

/**
 * LM358P `u` powered by `vcc` (VCC+ on 5V, VCC- on GND = common reference), a 220 ohm load
 * from each output to GND. `levels` maps channel -> [V(IN+), V(IN-)] (0 V = wire to GND,
 * null = pin left unconnected, other levels = a POWER source on the common ground).
 * `followers` lists channels whose output is wired directly to their own IN- (IN- level ignored).
 */
function circuit(levels, { supply = 5, followers = [] } = {}) {
  const components = [power('vcc', supply), { uid: 'u', type: TYPE }]
  const wires = [wire('vcc', '5V', 'u', 'VCC+'), wire('vcc', 'GND', 'u', 'VCC-')]
  for (const [channel, pair] of Object.entries(levels)) {
    pair.forEach((volts, i) => {
      const pin = `${channel}IN${i === 0 ? '+' : '-'}`
      if (i === 1 && followers.includes(Number(channel))) return
      if (volts === null) return
      if (volts === 0) return wires.push(wire('vcc', 'GND', 'u', pin))
      const uid = `s${channel}${i === 0 ? 'p' : 'm'}`
      components.push(power(uid, volts))
      wires.push(wire(uid, '5V', 'u', pin), wire(uid, 'GND', 'vcc', 'GND'))
    })
  }
  for (const channel of CHANNELS) {
    components.push({ uid: `r${channel}`, type: 'RESISTOR' })
    wires.push(wire('u', `${channel}OUT`, `r${channel}`, 'A'), wire(`r${channel}`, 'B', 'vcc', 'GND'))
  }
  for (const channel of followers) wires.push(wire('u', `${channel}OUT`, 'u', `${channel}IN-`))
  return { components, wires }
}
const withoutPin = (c, pin) => ({ ...c, wires: c.wires.filter(w => !(w.toUid === 'u' && w.toPin === pin) && !(w.fromUid === 'u' && w.fromPin === pin)) })
const run = (c) => resolveSignals(c.components, prepareCircuit(c.components, c.wires))
const fact = (result, pin) => result.dcVoltageDomains.get(`u:${pin}`)
const out = (result, channel) => fact(result, `${channel}OUT`)
const volts = (result) => CHANNELS.map(channel => out(result, channel)?.voltage)
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const followerValue = (vin) => PARAMS.openLoopGain / (PARAMS.openLoopGain + 1) * vin
const contract = () => getDcVoltageDomainContribution(TYPE)
const law = (channel, plus, minus, supply) => contract().groups[channel - 1].contribute({
  inputVoltages: { [`${channel}IN+`]: plus, [`${channel}IN-`]: minus }, supplyVoltages: { 'VCC+': supply }, params: PARAMS,
})[`${channel}OUT`]
const IDLE = { 1: [2.00001, 2], 2: [3.00002, 3] }

describe('A11-COMP3 LM358P registration', () => {
  it('T01 canonical registration: 8 pins in physical order 1..8, fixed Level-1 constants, dc capability', () => {
    expect(getAllCanonicalTypes()).toContain(TYPE)
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['dc'], internalConnections: null, defaultParameters: PARAMS })
    expect(entry.pins.map(({ id, role }) => [id, role])).toEqual(PINOUT)
    // Fixed pedagogical constants: minimum = maximum = default (same convention as fixed battery voltages).
    expect(entry.parameterSchema.map(({ key, minimum, maximum, defaultValue }) => [key, minimum, maximum, defaultValue]))
      .toEqual([['openLoopGain', 100000, 100000, 100000], ['outputHighHeadroom', 1.5, 1.5, 1.5]])
    for (const p of entry.parameterSchema) expect(p.description).toMatch(/pédagogique Level-1/)
  })
  it('T02 simulation model registration: minimal Lm358pModel, no transfer law', () => {
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationModel(TYPE, { requireCapability: 'dc' })).toBe(Lm358pModel)
    expect(Lm358pModel.type).toBe(TYPE)
    expect(Lm358pModel.validate(getCanonicalEntry(TYPE).defaultParameters)).toBe(true)
    for (const invalid of [null, undefined, [], 'x', 1, {}, { ...PARAMS, openLoopGain: 0 }, { ...PARAMS, outputHighHeadroom: NaN }]) {
      expect(Lm358pModel.validate(invalid)).toBe(false)
    }
    expect(Object.keys(Lm358pModel).sort()).toEqual(['type', 'validate'])
  })
  it('T03 DC voltage-domain registration through the generic factory: VCC- reference, VCC+ supply, 2 groups', () => {
    const c = contract()
    expect(hasDcVoltageDomainContribution(TYPE)).toBe(true)
    expect(c.referencePin).toBe('VCC-')
    expect(c.requiredPositivePins).toEqual(['VCC+'])
    expect(c.inputPins).toBeUndefined()
    expect(c.groups.map(g => g.inputPins)).toEqual([['1IN+', '1IN-'], ['2IN+', '2IN-']])
    expect(c.groups.map(g => g.outputPins)).toEqual([['1OUT'], ['2OUT']])
    for (const g of c.groups) expect(g.inputPins).not.toContain('VCC+')
    expect(c.groups.map(({ feedback: { mode, characteristic, variableOutputPin } }) => [mode, characteristic, variableOutputPin]))
      .toEqual([['scalar-bounded', 'single-root', '1OUT'], ['scalar-bounded', 'single-root', '2OUT']])
    const reference = createSingleSupplyOpAmps({ referencePin: 'VCC-', supplyPin: 'VCC+',
      channels: CHANNELS.map((n) => ({ plus: `${n}IN+`, minus: `${n}IN-`, output: `${n}OUT` })) })
    expect(Object.keys(c).sort()).toEqual(Object.keys(reference).sort())
    expect(getAnalogConditionalConduction(TYPE)).toBeNull()
    expect(getConditionalConduction(TYPE)).toBeNull()
    expect(getDcContribution(TYPE)).toBeNull()
  })
})

describe('A11-COMP3 LM358P Level-1 law and PREQ3 supply context', () => {
  it('T04 contribute() reads the supply from supplyVoltages["VCC+"], never from inputVoltages', () => {
    expect(law(1, 1, 0, 5)).toBe(3.5)
    expect(law(1, 1, 0, 9)).toBe(7.5)
    expect(law(2, 1, 0, 9)).toBe(7.5)
    const group = contract().groups[0]
    const withIntruder = group.contribute({ inputVoltages: { '1IN+': 1, '1IN-': 0, 'VCC+': 100 }, supplyVoltages: { 'VCC+': 5 }, params: PARAMS })
    expect(withIntruder).toEqual({ '1OUT': 3.5 })
    // Same dynamic VHIGH in bounds().
    expect(group.feedback.bounds({ supplyVoltages: { 'VCC+': 5 }, params: PARAMS })).toEqual({ min: 0, max: 3.5 })
    expect(group.feedback.bounds({ supplyVoltages: { 'VCC+': 9 }, params: PARAMS })).toEqual({ min: 0, max: 7.5 })
    expect(group.feedback.bounds({ supplyVoltages: { 'VCC+': 1 }, params: PARAMS })).toEqual({ min: 0, max: 0 })
  })
  it('T05 law: out = clamp(100000 * (V+ - V-), 0, max(0, VCC+ - 1.5))', () => {
    expect(law(1, 2.00001, 2, 5)).toBeCloseTo(1, 6)
    expect(law(1, 2, 2, 5)).toBe(0)
    expect(law(1, 2, 3, 5)).toBe(0)
    expect(law(1, 1, 0, 1)).toBe(0)
    expect(law(1, 1, 0, 1.5)).toBe(0)
    expect(law(1, 1, 0, 2)).toBe(0.5)
  })
})

describe('A11-COMP3 LM358P feed-forward', () => {
  it('T06 channel 1 amplifies V+ - V- with the open-loop gain', () => {
    const result = run(circuit(IDLE))
    expect(out(result, 1).voltage).toBeCloseTo(1, 6)
    expect(out(result, 1).reference).toBe(fact(result, 'VCC-').reference)
    expect(result.dcAnalysis.get('r1').voltage).toBe(out(result, 1).voltage)
  })
  it('T07 channel 2 amplifies V+ - V- with the open-loop gain', () => {
    const result = run(circuit(IDLE))
    expect(out(result, 2).voltage).toBeCloseTo(2, 6)
    expect(result.dcAnalysis.get('r2').voltage).toBe(out(result, 2).voltage)
  })
  it('T08 low saturation: V+ <= V- gives 0 V relative to VCC-', () => {
    const result = run(circuit({ 1: [1, 2], 2: [0, 3] }))
    expect(volts(result)).toEqual([0, 0])
    expect(volts(run(circuit({ 1: [2, 2], 2: [3, 3] })))).toEqual([0, 0])
  })
  it('T09 high saturation follows the supply: 5 V -> 3.5 V, 9 V -> 7.5 V, <= 1.5 V -> 0 V', () => {
    const high = { 1: [3, 2], 2: [2, 0] }
    expect(volts(run(circuit(high)))).toEqual([3.5, 3.5])
    expect(volts(run(circuit(high, { supply: 9 })))).toEqual([7.5, 7.5])
    expect(volts(run(circuit(high, { supply: 12 })))).toEqual([10.5, 10.5])
    expect(volts(run(circuit({ 1: [1, 0.5], 2: [1, 0] }, { supply: 1.5 })))).toEqual([0, 0])
  })
  it('T10 the two channels are independent', () => {
    const reference = run(circuit({ 1: [3, 2], 2: [1, 2] }))
    expect(volts(reference)).toEqual([3.5, 0])
    const toggled = run(circuit({ 1: [2, 3], 2: [1, 2] }))
    expect(out(toggled, 1).voltage).toBe(0)
    expect(out(toggled, 2)).toEqual(out(reference, 2))
    const toggled2 = run(circuit({ 1: [3, 2], 2: [2, 1] }))
    expect(out(toggled2, 1)).toEqual(out(reference, 1))
    expect(out(toggled2, 2).voltage).toBe(3.5)
  })
})

describe('A11-COMP3 LM358P power contract', () => {
  it('T11 unresolved VCC+ (unconnected) invalidates both groups', () => {
    const result = run(withoutPin(circuit(IDLE), 'VCC+'))
    expect(fact(result, 'VCC+')).toBeUndefined()
    expect(out(result, 1)).toBeNull()
    expect(out(result, 2)).toBeNull()
    expect(fact(result, '1IN+').voltage).toBe(2.00001)
  })
  it('T12 VCC+ at 0 V or from another reference domain invalidates both groups', () => {
    const grounded = circuit(IDLE)
    grounded.wires = grounded.wires.filter(w => !(w.toUid === 'u' && w.toPin === 'VCC+')).concat(wire('vcc', 'GND', 'u', 'VCC+'))
    expect(volts(run(grounded))).toEqual([undefined, undefined])
    expect(out(run(grounded), 1)).toBeNull()
    const isolated = withoutPin(circuit(IDLE), 'VCC+')
    isolated.components.push(power('iso', 5))
    isolated.wires.push(wire('iso', '5V', 'u', 'VCC+'))
    const result = run(isolated)
    expect(fact(result, 'VCC+').reference).not.toBe(fact(result, 'VCC-').reference)
    expect(out(result, 1)).toBeNull()
    expect(out(result, 2)).toBeNull()
  })
  it('T13 VCC- is the local reference: floating or non-zero VCC- invalidates both, an isolated supply domain works', () => {
    const floating = run(withoutPin(circuit(IDLE), 'VCC-'))
    expect(out(floating, 1)).toBeNull()
    expect(out(floating, 2)).toBeNull()
    // VCC- on a +2 V node of the common domain: single-supply Level-1 only, no offset reference.
    const lifted = withoutPin(circuit(IDLE), 'VCC-')
    lifted.components.push(power('neg', 2))
    lifted.wires.push(wire('neg', '5V', 'u', 'VCC-'), wire('neg', 'GND', 'vcc', 'GND'))
    const liftedResult = run(lifted)
    expect(fact(liftedResult, 'VCC-').voltage).toBe(2)
    expect(out(liftedResult, 1)).toBeNull()
    expect(out(liftedResult, 2)).toBeNull()
    // An op amp powered by its own isolated 9 V battery, inputs referenced to that battery's ground.
    const components = [power('main', 5), power('bat', 9), { uid: 'u', type: TYPE }, power('in', 3), { uid: 'r1', type: 'RESISTOR' }]
    const wires = [wire('bat', '5V', 'u', 'VCC+'), wire('bat', 'GND', 'u', 'VCC-'), wire('in', '5V', 'u', '1IN+'),
      wire('in', 'GND', 'bat', 'GND'), wire('bat', 'GND', 'u', '1IN-'), wire('u', '1OUT', 'r1', 'A'), wire('r1', 'B', 'bat', 'GND')]
    const local = run({ components, wires })
    expect(out(local, 1).voltage).toBe(7.5)
    expect(out(local, 1).reference).toBe(fact(local, 'VCC-').reference)
    expect(local.dcVoltageDomains.get('main:5V').reference).not.toBe(out(local, 1).reference)
  })
})

describe('A11-COMP3 LM358P direct voltage followers (PREQ2)', () => {
  it('T14 channel 1 follower: external signal on 1IN+, 1OUT wired to 1IN-', () => {
    for (const vin of [0.5, 2, 3.2]) {
      const result = run(circuit({ 1: [vin, null] }, { followers: [1] }))
      expect(Math.abs(out(result, 1).voltage - followerValue(vin))).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
      expect(out(result, 1).voltage).toBeCloseTo(vin, 4)
      expect(fact(result, '1IN-')).toEqual(out(result, 1))
      expect(out(result, 1).reference).toBe(fact(result, 'VCC-').reference)
      expect(result.dcAnalysis.get('r1').voltage).toBe(out(result, 1).voltage)
    }
  })
  it('T15 channel 2 follower: external signal on 2IN+, 2OUT wired to 2IN-', () => {
    for (const vin of [0.5, 2, 3.2]) {
      const result = run(circuit({ 2: [vin, null] }, { followers: [2] }))
      expect(Math.abs(out(result, 2).voltage - followerValue(vin))).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
      expect(fact(result, '2IN-')).toEqual(out(result, 2))
    }
  })
  it('T16 two independent followers simultaneously', () => {
    const result = run(circuit({ 1: [1.25, null], 2: [2.75, null] }, { followers: [1, 2] }))
    expect(Math.abs(out(result, 1).voltage - followerValue(1.25))).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    expect(Math.abs(out(result, 2).voltage - followerValue(2.75))).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    // Follower on one channel, feed-forward on the other.
    const mixed = run(circuit({ 1: [1.25, null], 2: [3, 2] }, { followers: [1] }))
    expect(out(mixed, 1).voltage).toBeCloseTo(1.25, 4)
    expect(out(mixed, 2).voltage).toBe(3.5)
  })
  it('T17 a saturated follower respects the supply-dependent VHIGH', () => {
    expect(volts(run(circuit({ 1: [4, null], 2: [4.9, null] }, { followers: [1, 2] })))).toEqual([3.5, 3.5])
    const nine = run(circuit({ 1: [4, null], 2: [8, null] }, { supply: 9, followers: [1, 2] }))
    expect(out(nine, 1).voltage).toBeCloseTo(4, 4)
    expect(out(nine, 2).voltage).toBe(7.5)
  })
  it('T18 the follower solution is a fixed point of the SAME registered law', () => {
    for (const [vin, supply] of [[2, 5], [3.2, 5], [6, 9]]) {
      const x = out(run(circuit({ 1: [vin, null] }, { supply, followers: [1] })), 1).voltage
      expect(Math.abs(law(1, vin, x, supply) - x)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    }
  })
})

describe('A11-COMP3 LM358P robustness', () => {
  it('T19 an unresolved group does not suppress the other group', () => {
    for (const pin of ['1IN+', '1IN-']) {
      const result = run(withoutPin(circuit({ 1: [3, 2], 2: [3, 2] }), pin))
      expect(out(result, 1)).toBeNull()
      expect(out(result, 2).voltage).toBe(3.5)
    }
    for (const pin of ['2IN+', '2IN-']) {
      const result = run(withoutPin(circuit({ 1: [3, 2], 2: [3, 2] }), pin))
      expect(out(result, 1).voltage).toBe(3.5)
      expect(out(result, 2)).toBeNull()
    }
    // A follower with an unresolved signal does not suppress the other follower.
    const followers = run(withoutPin(circuit({ 1: [1, null], 2: [2, null] }, { followers: [1, 2] }), '1IN+'))
    expect(out(followers, 1)).toBeNull()
    expect(out(followers, 2).voltage).toBeCloseTo(2, 4)
  })
  const CASES = () => [circuit(IDLE), circuit({ 1: [1.25, null], 2: [2.75, null] }, { followers: [1, 2] }),
    withoutPin(circuit({ 1: [3, 2], 2: [3, 2] }), '2IN+'), withoutPin(circuit(IDLE), 'VCC+')]
  it('T20 is deterministic', () => {
    for (const c of CASES()) {
      const first = normalized(run(c))
      for (let i = 0; i < 3; i++) expect(normalized(run(c))).toEqual(first)
    }
  })
  it('T21 is independent of component and wire ordering', () => {
    for (const c of CASES()) {
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        const wires = [...c.wires.slice(i % c.wires.length), ...c.wires.slice(0, i % c.wires.length)]
        expect(normalized(run({ components, wires: c.wires }))).toEqual(expected)
        expect(normalized(run({ components: c.components, wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
      }
    }
  })
  it('T22 is independent of UIDs', () => {
    const rename = (c, from, to) => JSON.parse(JSON.stringify(c).replace(new RegExp(`"${from}"`, 'g'), `"${to}"`))
    for (const c of CASES()) {
      const base = run(c)
      for (const to of ['a0', 'zz9']) {
        const renamed = run(rename(rename(c, 'u', to), 'vcc', `${to}_supply`))
        for (const pin of ['1OUT', '2OUT', '1IN-', '2IN-']) {
          expect(renamed.dcVoltageDomains.get(`${to}:${pin}`)?.voltage).toBe(fact(base, pin)?.voltage)
        }
      }
    }
  })
  it('T23 unsupported feedback topologies never invent a result', () => {
    // Pathological IN+ = IN- = OUT: no external input -> PREQ2 unsupported -> reserved null.
    const shorted = circuit({ 1: [null, null], 2: [3, 2] })
    shorted.wires.push(wire('u', '1OUT', 'u', '1IN-'), wire('u', '1OUT', 'u', '1IN+'))
    const shortedResult = run(shorted)
    expect(out(shortedResult, 1)).toBeNull()
    expect(out(shortedResult, 2).voltage).toBe(3.5)
    // Positive feedback OUT -> IN+ (rising residual): rejected, no rail picked.
    const positive = circuit({ 1: [null, 1], 2: [3, 2] })
    positive.wires.push(wire('u', '1OUT', 'u', '1IN+'))
    expect(out(run(positive), 1)).toBeNull()
    // Cross-channel loop 1OUT -> 2IN-, 2OUT -> 1IN- (two-variable cycle): unsupported.
    const cross = circuit({ 1: [2, null], 2: [2, null] })
    cross.wires.push(wire('u', '1OUT', 'u', '2IN-'), wire('u', '2OUT', 'u', '1IN-'))
    const crossResult = run(cross)
    expect(out(crossResult, 1)).toBeNull()
    expect(out(crossResult, 2)).toBeNull()
    // Feedback through a resistor (OUT -R- IN-): resistor networks are out of scope, no numeric output.
    const viaResistor = circuit({ 1: [2, null], 2: [3, 2] })
    viaResistor.components.push({ uid: 'rf', type: 'RESISTOR' })
    viaResistor.wires.push(wire('u', '1OUT', 'rf', 'A'), wire('rf', 'B', 'u', '1IN-'))
    const resistorResult = run(viaResistor)
    expect(out(resistorResult, 1)).toBeNull()
    expect(out(resistorResult, 2).voltage).toBe(3.5)
  })
  it('T24 no LM358-specific branch in the resolver, solver, PREQ3 mechanism or engine', () => {
    for (const name of ['resolution.js', 'controlledAnalogFeedbackSolver.js', 'engine.js', 'preparation.js', 'scheduler.js',
      'simulationRuntimeIntegration.js']) {
      expect(src(name), name).not.toMatch(/LM358|Lm358|lm358|VCC[+-]/)
    }
    const code = executable(src('resolution.js'))
    expect(code.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g)).toEqual(['comp.type !== "ARDUINO"'])
    expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
    // The registry holds one declarative LM358P entry built by the shared factory, no local copy of the law.
    const registry = src('dcVoltageDomainRegistry.js')
    expect(registry.match(/function createSingleSupplyOpAmps/g)).toHaveLength(1)
    expect(registry.match(/\['LM358P', createSingleSupplyOpAmps\(/g)).toHaveLength(1)
    expect(executable(registry).match(/openLoopGain \*/g)).toHaveLength(1)
    expect(createSingleSupplyOpAmps.toString()).not.toMatch(/LM358|100000|1\.5/)
  })
  it('T25 no mutation of the circuit or of the contexts handed to the law', () => {
    const c = circuit({ 1: [1.25, null], 2: [3, 2] }, { followers: [1] })
    const snapshot = structuredClone(c)
    run(c)
    expect(c).toEqual(snapshot)
    const context = { inputVoltages: Object.freeze({ '2IN+': 3, '2IN-': 2 }), supplyVoltages: Object.freeze({ 'VCC+': 5 }), params: Object.freeze({ ...PARAMS }) }
    expect(contract().groups[1].contribute(context)).toEqual({ '2OUT': 3.5 })
  })
})
