import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { getSimulationModel, isSimulationModelAvailable } from '../simulationRegistry.js'
import { Lm393pModel } from '../models/Lm393pModel.js'
import { getAnalogConditionalConduction, createOpenCollectorComparators } from '../analogConditionalConductionRegistry.js'
import { getConditionalConduction } from '../conditionalConductionRegistry.js'
import { getDcContribution } from '../dcContributionRegistry.js'
import { getDcVoltageDomainContribution } from '../dcVoltageDomainRegistry.js'

// A11-COMP2 — TI LM393P dual open-collector comparator, Level-1 through the generic PREQ2 factory only.
const TYPE = 'LM393P'
const PINOUT = [
  ['1OUT', 'output'], ['1IN-', 'input'], ['1IN+', 'input'], ['GND', 'ground'],
  ['2IN+', 'input'], ['2IN-', 'input'], ['2OUT', 'output'], ['VCC', 'power'],
]
const CHANNELS = [1, 2]
const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

/**
 * `levels` maps channel -> [V(IN+), V(IN-)]; 0 V is a wire to GND, other levels an
 * adjustable POWER source sharing the common ground. `pullUps` lists the channels whose
 * output has an external 220 ohm pull-up to the 5 V supply.
 */
function circuit(levels, { pullUps = CHANNELS } = {}) {
  const components = [{ uid: 'vcc', type: 'POWER', parameters: { voltage: 5 } }, { uid: 'u', type: TYPE }]
  const wires = [wire('vcc', '5V', 'u', 'VCC'), wire('vcc', 'GND', 'u', 'GND')]
  for (const [channel, pair] of Object.entries(levels)) {
    pair.forEach((volts, i) => {
      const pin = `${channel}IN${i === 0 ? '+' : '-'}`
      if (volts === 0) return wires.push(wire('vcc', 'GND', 'u', pin))
      const uid = `s${channel}${i === 0 ? 'p' : 'm'}`
      components.push({ uid, type: 'POWER', parameters: { voltage: volts } })
      wires.push(wire(uid, '5V', 'u', pin), wire(uid, 'GND', 'vcc', 'GND'))
    })
  }
  for (const channel of pullUps) {
    components.push({ uid: `r${channel}`, type: 'RESISTOR' })
    wires.push(wire('vcc', '5V', `r${channel}`, 'A'), wire(`r${channel}`, 'B', 'u', `${channel}OUT`))
  }
  return { components, wires }
}
/** Same circuit with one LM393P pin left unconnected (unresolved numeric fact). */
const floating = (c, pin) => ({ ...c, wires: c.wires.filter(w => !(w.toUid === 'u' && w.toPin === pin)) })
const withVcc = (c, replace) => ({ ...c, wires: [...c.wires.filter(w => !(w.toUid === 'u' && w.toPin === 'VCC')), ...replace] })
const IDLE = { 1: [3, 2], 2: [3, 2] }
const SINKING = { 1: [2, 3], 2: [2, 3] }
const run = (c) => resolveSignals(c.components, prepareCircuit(c.components, c.wires))
const out = (result, channel) => result.dcVoltageDomains.get(`u:${channel}OUT`)
const volts = (result) => CHANNELS.map(channel => out(result, channel)?.voltage)
const signals = (result) => CHANNELS.map(channel => result.pinSignals.get(`u:${channel}OUT`))
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const orderings = (c) => c.components.flatMap((_, i) => {
  const components = [...c.components.slice(i), ...c.components.slice(0, i)]
  const wires = [...c.wires.slice(i), ...c.wires.slice(0, i)]
  return [{ components, wires }, { components: [...components].reverse(), wires: [...wires].reverse() }]
})
const { HIGH, LOW, UNKNOWN } = Signal

describe('A11-COMP2 LM393P registration', () => {
  it('T01 canonical registration: 8 pins in physical order 1..8, executable, no parameter or capability', () => {
    expect(getAllCanonicalTypes()).toContain(TYPE)
    expect(getCanonicalEntry(TYPE)).toMatchObject({
      type: TYPE, modelAvailable: true, parameterSchema: [], defaultParameters: {}, capabilities: [], internalConnections: null,
    })
    expect(getCanonicalEntry(TYPE).pins.map(({ id, role }) => [id, role])).toEqual(PINOUT)
  })
  it('T02 simulation model registration: minimal Lm393pModel, no comparator logic', () => {
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationModel(TYPE)).toBe(Lm393pModel)
    expect(Lm393pModel.type).toBe(TYPE)
    expect(Lm393pModel.validate({})).toBe(true)
    for (const invalid of [null, undefined, [], 'x', 1]) expect(Lm393pModel.validate(invalid)).toBe(false)
    expect(Object.keys(Lm393pModel).sort()).toEqual(['type', 'validate'])
  })
  it('T03 analogConditionalConduction registration through the generic factory only', () => {
    const contract = getAnalogConditionalConduction(TYPE)
    expect(contract.referencePin).toBe('GND')
    expect(contract.requiredPositivePins).toEqual(['VCC'])
    expect(contract.inputPins).toBeUndefined()
    expect(contract.groups.map(g => g.inputPins)).toEqual([['1IN+', '1IN-'], ['2IN+', '2IN-']])
    expect(contract.digitalProjectionPins).toEqual(['1OUT', '2OUT'])
    const reference = createOpenCollectorComparators({
      referencePin: 'GND', supplyPin: 'VCC',
      channels: CHANNELS.map((n) => ({ plus: `${n}IN+`, minus: `${n}IN-`, output: `${n}OUT` })),
    })
    expect(Object.keys(contract).sort()).toEqual(Object.keys(reference).sort())
    expect(getConditionalConduction(TYPE)).toBeNull()
    expect(getDcContribution(TYPE)).toBeNull()
    expect(getDcVoltageDomainContribution(TYPE)).toBeNull()
  })
})

describe('A11-COMP2 LM393P open-collector behaviour', () => {
  it('T04 powered channel 1 IN+ < IN- (2 V < 3 V): 1OUT sinks to GND', () => {
    const result = run(circuit({ ...IDLE, 1: [2, 3] }))
    expect(result.pinSignals.get('u:1IN+')).toBe(HIGH)
    expect(result.pinSignals.get('u:1IN-')).toBe(HIGH)
    expect(out(result, 1)).toEqual(result.dcVoltageDomains.get('u:GND'))
    expect(out(result, 1).voltage).toBe(0)
    expect(result.pinSignals.get('u:1OUT')).toBe(LOW)
  })
  it('T05 powered channel 1 IN+ > IN- (3 V > 2 V): 1OUT is high-Z, the pull-up sets it', () => {
    const result = run(circuit(IDLE))
    expect(out(result, 1).voltage).toBe(5)
    expect(result.pinSignals.get('u:1OUT')).toBe(HIGH)
  })
  it('T06 powered channel 2 IN+ < IN-: 2OUT sinks to GND', () => {
    const result = run(circuit({ ...IDLE, 2: [0, 1] }))
    expect(out(result, 2)).toEqual(result.dcVoltageDomains.get('u:GND'))
    expect(result.pinSignals.get('u:2OUT')).toBe(LOW)
  })
  it('T07 powered channel 2 IN+ > IN-: 2OUT is high-Z, the pull-up sets it', () => {
    const result = run(circuit({ ...IDLE, 2: [4, 1] }))
    expect(out(result, 2).voltage).toBe(5)
    expect(result.pinSignals.get('u:2OUT')).toBe(HIGH)
  })
  it('T08 equality IN+ == IN- is high-Z on both channels', () => {
    const result = run(circuit({ 1: [2, 2], 2: [4, 4] }))
    expect(volts(result)).toEqual([5, 5])
    expect(getAnalogConditionalConduction(TYPE).groups.flatMap(g => g.contribute({
      inputVoltages: Object.fromEntries(g.inputPins.map(pin => [pin, 3])), params: {},
    }))).toEqual([])
  })
  it('T09 the open collector never produces HIGH itself (no pull-up)', () => {
    const result = run(circuit(IDLE, { pullUps: [] }))
    for (const channel of CHANNELS) {
      expect(out(result, channel)).toBeUndefined()
      expect(result.pinSignals.get(`u:${channel}OUT`)).toBe(UNKNOWN)
    }
    const sinking = run(circuit({ ...IDLE, 2: [2, 3] }, { pullUps: [] }))
    expect(out(sinking, 2).voltage).toBe(0)
    expect(out(sinking, 1)).toBeUndefined()
    expect(sinking.pinSignals.get('u:1OUT')).not.toBe(HIGH)
  })
  it('T10 external pull-up produces HIGH while the output is high-Z', () => {
    const result = run(circuit(IDLE))
    expect(volts(result)).toEqual([5, 5])
    expect(signals(result)).toEqual([HIGH, HIGH])
    expect(result.dcAnalysis.get('r1')?.current ?? 0).toBe(0)
  })
  it('T11 an active sink overrides the pull-up to LOW, current flows through the pull-up', () => {
    const result = run(circuit(SINKING))
    expect(volts(result)).toEqual([0, 0])
    expect(signals(result)).toEqual([LOW, LOW])
    for (const channel of CHANNELS) expect(result.dcAnalysis.get(`r${channel}`)).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('T12 the two channels are independent: toggling one leaves the other unchanged', () => {
    for (const base of [{ 1: [2, 3], 2: [3, 2] }, { 1: [3, 2], 2: [2, 3] }]) {
      const reference = run(circuit(base))
      for (const channel of CHANNELS) {
        const [plus, minus] = base[channel]
        const toggled = run(circuit({ ...base, [channel]: [minus, plus] }))
        const other = channel === 1 ? 2 : 1
        expect(out(toggled, other)).toEqual(out(reference, other))
        expect(out(toggled, channel).voltage).toBe(5 - out(reference, channel).voltage)
      }
    }
  })
  it('T13 unresolved channel 1 does not suppress the resolved channel 2', () => {
    for (const pin of ['1IN+', '1IN-']) {
      const result = run(floating(circuit(SINKING), pin))
      expect(result.dcVoltageDomains.get(`u:${pin}`)).toBeUndefined()
      expect(volts(result)).toEqual([5, 0])
      expect(signals(result)).toEqual([HIGH, LOW])
    }
  })
  it('T14 unresolved channel 2 does not suppress the resolved channel 1', () => {
    for (const pin of ['2IN+', '2IN-']) {
      const result = run(floating(circuit(SINKING), pin))
      expect(result.dcVoltageDomains.get(`u:${pin}`)).toBeUndefined()
      expect(volts(result)).toEqual([0, 5])
      expect(signals(result)).toEqual([LOW, HIGH])
    }
  })
  it('T15 unpowered component (VCC at 0 V, or from an isolated domain) selects no conduction', () => {
    const grounded = run(withVcc(circuit(SINKING), [wire('vcc', 'GND', 'u', 'VCC')]))
    expect(grounded.dcVoltageDomains.get('u:VCC').voltage).toBe(0)
    expect(volts(grounded)).toEqual([5, 5])
    expect(grounded.dcAnalysis.get('r1')?.current ?? 0).toBe(0)
    const c = withVcc(circuit(SINKING), [])
    c.components.push({ uid: 'iso', type: 'POWER', parameters: { voltage: 5 } })
    c.wires.push(wire('iso', '5V', 'u', 'VCC'))
    const isolated = run(c)
    expect(isolated.dcVoltageDomains.get('u:VCC').reference).not.toBe(isolated.dcVoltageDomains.get('u:GND').reference)
    expect(volts(isolated)).toEqual([5, 5])
  })
  it('T16 missing/unresolved VCC selects no conduction and invents nothing', () => {
    const pulled = run(withVcc(circuit(SINKING), []))
    expect(pulled.dcVoltageDomains.get('u:VCC')).toBeUndefined()
    expect(volts(pulled)).toEqual([5, 5])
    expect(signals(pulled)).toEqual([HIGH, HIGH])
    const bare = run(withVcc(circuit(SINKING, { pullUps: [] }), []))
    for (const channel of CHANNELS) {
      expect(out(bare, channel)).toBeUndefined()
      expect(bare.pinSignals.get(`u:${channel}OUT`)).toBe(UNKNOWN)
    }
    // A valid positive VCC restores normal behaviour.
    expect(volts(run(circuit(SINKING)))).toEqual([0, 0])
  })
  it('T17 is deterministic', () => {
    for (const c of [circuit({ 1: [2, 3], 2: [3, 2] }), floating(circuit(SINKING), '1IN+')]) {
      const first = normalized(run(c))
      for (let i = 0; i < 3; i++) expect(normalized(run(c))).toEqual(first)
    }
  })
  it('T18 is independent of component ordering', () => {
    for (const c of [circuit({ 1: [2, 3], 2: [3, 2] }), floating(circuit(SINKING), '2IN-'), withVcc(circuit(SINKING), [])]) {
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        expect(normalized(run({ components, wires: c.wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: c.wires }))).toEqual(expected)
      }
    }
  })
  it('T19 is independent of wire ordering', () => {
    for (const c of [circuit({ 1: [2, 3], 2: [3, 2] }), floating(circuit(SINKING), '1IN-')]) {
      const expected = normalized(run(c))
      for (const permuted of orderings(c)) {
        expect(normalized(run({ components: c.components, wires: permuted.wires }))).toEqual(expected)
        expect(normalized(run(permuted))).toEqual(expected)
      }
    }
  })
  it('T20 digitalProjectionPins projects the final DC facts onto 1OUT/2OUT and their nets only', () => {
    const c = circuit({ 1: [2, 3], 2: [3, 2] })
    c.components.push({ uid: 'uno', type: 'ARDUINO' })
    c.wires.push(wire('u', '1OUT', 'uno', 'D2'), wire('u', '2OUT', 'uno', 'D3'))
    const result = run(c)
    for (const channel of CHANNELS) {
      expect(result.pinSignals.get(`u:${channel}OUT`)).toBe(out(result, channel).voltage > 0 ? HIGH : LOW)
    }
    expect(result.pinSignals.get('uno:D2')).toBe(LOW)
    expect(result.pinSignals.get('uno:D3')).toBe(HIGH)
    // Inputs are never projected; they keep their historical digital signal.
    expect(result.pinSignals.get('u:1IN+')).toBe(HIGH)
    expect([...result.pinSignals.values()].every(v => Object.values(Signal).includes(v))).toBe(true)
  })
  it('T21 no mutation of input facts, components or wires', () => {
    const all = { '1IN+': 1, '1IN-': 2, '2IN+': 2, '2IN-': 1 }
    const pairs = getAnalogConditionalConduction(TYPE).groups.flatMap(({ inputPins, contribute }) => {
      const inputVoltages = Object.freeze(Object.fromEntries(inputPins.map(pin => [pin, all[pin]])))
      const snapshot = { ...inputVoltages }
      const selected = contribute({ inputVoltages, params: Object.freeze({}) })
      expect(inputVoltages).toEqual(snapshot)
      return selected
    })
    expect(pairs).toEqual([['1OUT', 'GND']])
    const c = circuit({ 1: [2, 3], 2: [3, 2] })
    const snapshot = structuredClone(c)
    run(c)
    expect(c).toEqual(snapshot)
  })
  it('T22 no LM393-specific branch in the generic resolver or registry mechanics', () => {
    const text = src('resolution.js')
    expect(text).not.toMatch(/LM393|Lm393|lm393|comparator|VCC|[12]IN[+-]|[12]OUT/i)
    const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect(code.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g)).toEqual(['comp.type !== "ARDUINO"'])
    expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
    for (const name of ['engine.js', 'preparation.js', 'scheduler.js', 'simulationRuntimeIntegration.js']) {
      expect(src(name), name).not.toMatch(/LM393|Lm393|lm393/)
    }
    // The registry holds one declarative LM393P entry built by the shared factory, no local copy.
    const registry = src('analogConditionalConductionRegistry.js')
    expect(registry.match(/function createOpenCollectorComparators/g)).toHaveLength(1)
    expect(registry.match(/\['LM393P', createOpenCollectorComparators\(/g)).toHaveLength(1)
  })
})
