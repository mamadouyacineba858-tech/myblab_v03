import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { getSimulationModel, isSimulationModelAvailable } from '../simulationRegistry.js'
import { Lm339ne4Model } from '../models/Lm339ne4Model.js'
import { getAnalogConditionalConduction } from '../analogConditionalConductionRegistry.js'
import { getConditionalConduction } from '../conditionalConductionRegistry.js'
import { getDcContribution } from '../dcContributionRegistry.js'
import { getDcVoltageDomainContribution } from '../dcVoltageDomainRegistry.js'

// A11-COMP1 — TI LM339NE4 quad open-collector comparator, Level-1 through PREQ2 only.
const TYPE = 'LM339NE4'
const PINOUT = [
  ['1OUT', 'output'], ['2OUT', 'output'], ['VCC', 'power'], ['2IN-', 'input'], ['2IN+', 'input'],
  ['1IN-', 'input'], ['1IN+', 'input'], ['3IN-', 'input'], ['3IN+', 'input'], ['4IN-', 'input'],
  ['4IN+', 'input'], ['GND', 'ground'], ['4OUT', 'output'], ['3OUT', 'output'],
]
const CHANNELS = [1, 2, 3, 4]
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
const ALL_IDLE = { 1: [3, 2], 2: [3, 2], 3: [3, 2], 4: [3, 2] }
const run = (c) => resolveSignals(c.components, prepareCircuit(c.components, c.wires))
const out = (result, channel) => result.dcVoltageDomains.get(`u:${channel}OUT`)
const volts = (result) => CHANNELS.map(channel => out(result, channel)?.voltage)
const signals = (result) => CHANNELS.map(channel => result.pinSignals.get(`u:${channel}OUT`))
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const { HIGH, LOW, UNKNOWN } = Signal

describe('A11-COMP1 LM339NE4 canonical and registry contract', () => {
  it('T1 declares a functional canonical type with an executable model and no historical capability', () => {
    expect(getAllCanonicalTypes()).toContain(TYPE)
    expect(getCanonicalEntry(TYPE)).toMatchObject({
      type: TYPE, modelAvailable: true, parameterSchema: [], defaultParameters: {}, capabilities: [], internalConnections: null,
    })
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationModel(TYPE)).toBe(Lm339ne4Model)
    expect(Lm339ne4Model.validate({})).toBe(true)
    for (const invalid of [null, undefined, [], 'x', 1]) expect(Lm339ne4Model.validate(invalid)).toBe(false)
    // Behaviour lives in the PREQ2 registry only, never in a digital or DC registry.
    expect(getAnalogConditionalConduction(TYPE)).not.toBeNull()
    expect(getConditionalConduction(TYPE)).toBeNull()
    expect(getDcContribution(TYPE)).toBeNull()
    expect(getDcVoltageDomainContribution(TYPE)).toBeNull()
  })
  it('T2 exact TI pinout: 14 pins in physical order 1..14 with their roles', () => {
    expect(getCanonicalEntry(TYPE).pins.map(({ id, role }) => [id, role])).toEqual(PINOUT)
  })
  it('uses the generic PREQ2 contract: all inputs, GND reference, the four outputs projected', () => {
    const contract = getAnalogConditionalConduction(TYPE)
    expect(contract.inputPins).toEqual(['1IN+', '1IN-', '2IN+', '2IN-', '3IN+', '3IN-', '4IN+', '4IN-'])
    expect(contract.referencePin).toBe('GND')
    expect(contract.digitalProjectionPins).toEqual(['1OUT', '2OUT', '3OUT', '4OUT'])
  })
})

describe('A11-COMP1 LM339NE4 open-collector behaviour', () => {
  it('T3 channel 1 IN+ < IN- (2 V < 3 V, both digital HIGH): 1OUT sinks to GND', () => {
    const result = run(circuit({ ...ALL_IDLE, 1: [2, 3] }))
    expect(result.pinSignals.get('u:1IN+')).toBe(HIGH)
    expect(result.pinSignals.get('u:1IN-')).toBe(HIGH)
    expect(out(result, 1)).toEqual(result.dcVoltageDomains.get('u:GND'))
    expect(out(result, 1).voltage).toBe(0)
    expect(result.pinSignals.get('u:1OUT')).toBe(LOW)
  })
  it('T4 channel 1 IN+ > IN- (3 V > 2 V): 1OUT is high-Z, the pull-up sets it', () => {
    const result = run(circuit(ALL_IDLE))
    expect(out(result, 1).voltage).toBe(5)
    expect(result.pinSignals.get('u:1OUT')).toBe(HIGH)
  })
  it('T5 equality IN+ == IN- is high-Z', () => {
    const result = run(circuit({ ...ALL_IDLE, 1: [2, 2] }))
    expect(out(result, 1).voltage).toBe(5)
    expect(getAnalogConditionalConduction(TYPE).contribute({
      inputVoltages: { '1IN+': 2, '1IN-': 2, '2IN+': 0, '2IN-': 0, '3IN+': 4, '3IN-': 4, '4IN+': 1, '4IN-': 1 }, params: {},
    })).toEqual([])
  })
  it('T6 each of the four channels can be active on its own', () => {
    for (const channel of CHANNELS) {
      const result = run(circuit({ ...ALL_IDLE, [channel]: [2, 3] }))
      expect(volts(result)).toEqual(CHANNELS.map(n => n === channel ? 0 : 5))
      expect(signals(result)).toEqual(CHANNELS.map(n => n === channel ? LOW : HIGH))
    }
    expect(volts(run(circuit({ 1: [2, 3], 2: [2, 3], 3: [2, 3], 4: [2, 3] })))).toEqual([0, 0, 0, 0])
  })
  it('T7 mixed combination: channels 1 and 3 sink, 2 and 4 are high-Z', () => {
    const result = run(circuit({ 1: [0, 3], 2: [3, 0], 3: [2, 3], 4: [3, 2] }))
    expect(volts(result)).toEqual([0, 5, 0, 5])
    expect(signals(result)).toEqual([LOW, HIGH, LOW, HIGH])
    expect(getAnalogConditionalConduction(TYPE).contribute({
      inputVoltages: { '1IN+': 0, '1IN-': 3, '2IN+': 3, '2IN-': 0, '3IN+': 2, '3IN-': 3, '4IN+': 3, '4IN-': 2 }, params: {},
    })).toEqual([['1OUT', 'GND'], ['3OUT', 'GND']])
  })
  it('T8 active output with external pull-up: forced to 0 V / LOW, current through the pull-up', () => {
    const result = run(circuit({ ...ALL_IDLE, 2: [2, 3] }))
    expect(out(result, 2)).toEqual({ voltage: 0, reference: result.dcVoltageDomains.get('u:GND').reference })
    expect(result.pinSignals.get('u:2OUT')).toBe(LOW)
    expect(result.dcAnalysis.get('r2')).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('T9 inactive output with external pull-up: the pull-up stays the authority, HIGH', () => {
    const result = run(circuit(ALL_IDLE))
    expect(volts(result)).toEqual([5, 5, 5, 5])
    expect(signals(result)).toEqual([HIGH, HIGH, HIGH, HIGH])
  })
  it('T10 inactive output without pull-up: the LM339 invents no HIGH', () => {
    const result = run(circuit(ALL_IDLE, { pullUps: [] }))
    for (const channel of CHANNELS) {
      expect(out(result, channel)).toBeUndefined()
      expect(result.pinSignals.get(`u:${channel}OUT`)).toBe(UNKNOWN)
    }
    // An active sink without pull-up still only conducts to the GND domain.
    const sinking = run(circuit({ ...ALL_IDLE, 4: [2, 3] }, { pullUps: [] }))
    expect(out(sinking, 4).voltage).toBe(0)
    expect(out(sinking, 1)).toBeUndefined()
  })
  it('T11 the four outputs are independent: toggling one channel leaves the others unchanged', () => {
    const base = { 1: [2, 3], 2: [3, 2], 3: [2, 3], 4: [3, 2] }
    const reference = run(circuit(base))
    for (const channel of CHANNELS) {
      const [plus, minus] = base[channel]
      const toggled = run(circuit({ ...base, [channel]: [minus, plus] }))
      CHANNELS.filter(n => n !== channel).forEach(n => expect(out(toggled, n)).toEqual(out(reference, n)))
      expect(out(toggled, channel).voltage).toBe(5 - out(reference, channel).voltage)
    }
  })
  it('T12 is independent of component and wire ordering', () => {
    const c = circuit({ 1: [2, 3], 2: [3, 2], 3: [0, 1], 4: [2, 2] })
    const expected = normalized(run(c))
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)]
      const wires = [...c.wires.slice(i), ...c.wires.slice(0, i)]
      expect(normalized(run({ components, wires }))).toEqual(expected)
      expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
    }
  })
  it('T13 contribute() does not mutate inputVoltages and returns only own-pin pairs to GND', () => {
    const inputVoltages = Object.freeze({ '1IN+': 1, '1IN-': 2, '2IN+': 2, '2IN-': 1, '3IN+': 0, '3IN-': 5, '4IN+': 5, '4IN-': 5 })
    const snapshot = { ...inputVoltages }
    const pairs = getAnalogConditionalConduction(TYPE).contribute({ inputVoltages, params: Object.freeze({}) })
    expect(inputVoltages).toEqual(snapshot)
    expect(pairs).toEqual([['1OUT', 'GND'], ['3OUT', 'GND']])
    for (const value of pairs.flat()) expect(typeof value).toBe('string')
  })
  it('T14 is deterministic', () => {
    const c = circuit({ 1: [2, 3], 2: [3, 2], 3: [0, 1], 4: [2, 2] })
    const first = normalized(run(c))
    for (let i = 0; i < 3; i++) expect(normalized(run(c))).toEqual(first)
  })
  it('T15 outputs are projected through digitalProjectionPins, consistent with the final DC facts', () => {
    const c = circuit({ 1: [2, 3], 2: [3, 2], 3: [2, 3], 4: [3, 2] })
    c.components.push({ uid: 'uno', type: 'ARDUINO' })
    c.wires.push(wire('u', '1OUT', 'uno', 'D2'), wire('u', '2OUT', 'uno', 'D3'))
    const result = run(c)
    for (const channel of CHANNELS) {
      expect(result.pinSignals.get(`u:${channel}OUT`)).toBe(out(result, channel).voltage > 0 ? HIGH : LOW)
    }
    // Digital consumers on the same physical nets read the projected levels.
    expect(result.pinSignals.get('uno:D2')).toBe(LOW)
    expect(result.pinSignals.get('uno:D3')).toBe(HIGH)
    expect([...result.pinSignals.values()].every(v => Object.values(Signal).includes(v))).toBe(true)
  })
  it('Level-1 limit (PREQ2 contract): an unresolved input keeps all four outputs high-Z, never HIGH', () => {
    const c = circuit({ 1: [2, 3], 2: [2, 3], 3: [2, 3] })
    const result = run(c)
    expect(volts(result)).toEqual([5, 5, 5, 5])
    const bare = run(circuit({ 1: [2, 3], 2: [2, 3], 3: [2, 3] }, { pullUps: [] }))
    for (const channel of CHANNELS) expect(bare.pinSignals.get(`u:${channel}OUT`)).toBe(UNKNOWN)
  })
  it('the generic engine keeps no LM339-specific branch', () => {
    expect(src('resolution.js')).not.toMatch(/LM339|comparator/i)
  })
})
