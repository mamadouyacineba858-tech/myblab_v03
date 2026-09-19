import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getCanonicalEntry } from '../canonicalRegistry.js'
import { getSimulationModel } from '../simulationRegistry.js'
import { getDcContribution } from '../dcContributionRegistry.js'
import { createPredicateConditionalConduction, getConditionalConduction } from '../conditionalConductionRegistry.js'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'

const ids = ['coilA', 'coilB', 'common', 'normallyClosed', 'normallyOpen']
const comp = (uid, type) => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

describe('A8-RELAY canonical and model', () => {
  it('declares exactly five IDs, a positive coil parameter, both capabilities and no static contacts', () => {
    const entry = getCanonicalEntry('RELAY')
    expect(entry.pins.map((p) => p.id)).toEqual(ids)
    expect(new Set(entry.pins.map((p) => p.id)).size).toBe(5)
    expect(entry.defaultParameters).toEqual({ coilResistance: 69.4 })
    expect(entry.parameterSchema).toEqual([expect.objectContaining({ key: 'coilResistance', defaultValue: 69.4, parameterType: 'resistance', unit: 'Ω', minimum: 0.001, maximum: 1e6 })])
    expect(entry.capabilities).toEqual(['digital', 'dc'])
    expect(entry.modelAvailable).toBe(true)
    expect(entry.internalConnections).toBeNull()
    expect(Object.keys(getSimulationModel('RELAY')).sort()).toEqual(['type', 'validate'])
  })
  it.each([69.4, 0.01, 1000])('accepts resistance %s', (coilResistance) => {
    expect(getSimulationModel('RELAY').validate({ coilResistance })).toBe(true)
  })
  it.each([0, -1, NaN, Infinity, '69.4', null, undefined])('rejects resistance %s', (coilResistance) => {
    expect(getSimulationModel('RELAY').validate({ coilResistance })).toBe(false)
  })
  it.each([null, undefined, 69.4, '69.4', {}])('requires a parameter object %s', (params) => {
    expect(getSimulationModel('RELAY').validate(params)).toBe(false)
  })
})

describe('A8-RELAY nonpolar coil and mutually exclusive contacts', () => {
  for (const coilA of Object.values(Signal)) {
    for (const coilB of Object.values(Signal)) {
      it(`${coilA}/${coilB}: coil load and fail-safe selected pair`, () => {
        const energized = (coilA === Signal.HIGH && coilB === Signal.LOW) || (coilA === Signal.LOW && coilB === Signal.HIGH)
        const pins = Object.freeze({ coilA, coilB, common: Signal.HIGH, normallyClosed: Signal.LOW, normallyOpen: Signal.HIGH })
        expect(getConditionalConduction('RELAY')(pins)).toEqual([['common', energized ? 'normallyOpen' : 'normallyClosed']])
        expect(getDcContribution('RELAY')({ pins, params: { coilResistance: 69.4 }, supplyVoltage: 5 }))
          .toEqual(energized ? { voltage: 5, current: 5 / 69.4 } : null)
      })
    }
  }
  it('explicitly proves nonpolarity and contact independence with a custom coil load', () => {
    const dc = getDcContribution('RELAY')
    const result = (coilA, coilB, contacts) => dc({ pins: { coilA, coilB, ...contacts }, params: { coilResistance: 100 }, supplyVoltage: 12 })
    expect(result(Signal.HIGH, Signal.LOW, {})).toEqual({ voltage: 12, current: 0.12 })
    expect(result(Signal.LOW, Signal.HIGH, { common: Signal.UNKNOWN, normallyClosed: Signal.FLOATING, normallyOpen: Signal.LOW })).toEqual(result(Signal.HIGH, Signal.LOW, {}))
    expect(result(Signal.LOW, Signal.LOW, { common: Signal.HIGH, normallyClosed: Signal.LOW })).toBeNull()
  })
  it('selects fail-safe anew after excitation, without retaining previous state', () => {
    const contribution = getConditionalConduction('RELAY')
    expect(contribution({ coilA: Signal.HIGH, coilB: Signal.LOW })).toEqual([['common', 'normallyOpen']])
    expect(contribution({ coilA: Signal.UNKNOWN, coilB: Signal.LOW })).toEqual([['common', 'normallyClosed']])
  })
  it('supports an unrelated multipin component and does not expose mutable pair state', () => {
    const contribution = createPredicateConditionalConduction({ predicate: (pins) => pins.a === pins.b, whenTrue: [['x', 'y']], whenFalse: [['x', 'z']] })
    const result = contribution({ a: 1, b: 1 })
    result[0][0] = 'mutated'
    expect(contribution({ a: 2, b: 2 })).toEqual([['x', 'y']])
    expect(contribution({ a: 1, b: 2 })).toEqual([['x', 'z']])
  })
})

describe('A8-RELAY fixed-point integration', () => {
  it.each([['GND', 'GND', 'normallyClosed'], ['5V', 'GND', 'normallyOpen'], ['GND', '5V', 'normallyOpen']])('coil %s/%s propagates only through %s, independently of component order', (a, b, selected) => {
    const components = [comp('power', 'POWER'), comp('relay', 'RELAY'), comp('zcontrol', 'RESISTOR'), comp('nc', 'RESISTOR'), comp('no', 'RESISTOR')]
    // Control resolves AFTER the relay is first visited, exercising a topology
    // replacement from initial fail-safe NC to energized NO on a later round.
    const wires = [wire('power', a, 'zcontrol', 'A'), wire('zcontrol', 'B', 'relay', 'coilA'), wire('power', b, 'relay', 'coilB'), wire('power', '5V', 'relay', 'common'), wire('relay', 'normallyClosed', 'nc', 'A'), wire('relay', 'normallyOpen', 'no', 'A')]
    const original = JSON.stringify({ components, wires })
    let reference
    for (const order of [components, [...components].reverse(), [components[3], components[1], components[4], components[2], components[0]]]) {
      const prepared = prepareCircuit(order, wires)
      const topology = JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
      prepared.uf.find = prepared.uf.union = () => { throw new Error('Physical topology must remain immutable') }
      const { pinSignals } = resolveSignals(order, prepared)
      expect(pinSignals.get(`relay:${selected}`)).toBe(Signal.HIGH)
      expect(pinSignals.get(`${selected === 'normallyClosed' ? 'nc' : 'no'}:B`)).toBe(Signal.HIGH)
      expect(pinSignals.get(`${selected === 'normallyClosed' ? 'no' : 'nc'}:B`)).toBe(Signal.UNKNOWN)
      expect(JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(topology)
      const result = [...pinSignals].sort()
      if (reference) expect(result).toEqual(reference)
      reference = result
    }
    expect(JSON.stringify({ components, wires })).toBe(original)
  })
  it('keeps relay-specific branches out of protected simulation and geometry consumers', () => {
    for (const file of ['engine.js', 'electricalAnalysis.js', 'scheduler.js', 'simulationRuntimeIntegration.js', 'resolution.js']) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).not.toMatch(/(?:===|!==|case)\s*["']RELAY["']/)
    }
    for (const file of ['breadboardGeometry.js', 'breadboardPlacementAdapter.js', 'assemblyGeometry.js']) {
      expect(readFileSync(new URL(`../../utils/${file}`, import.meta.url), 'utf8')).not.toMatch(/RELAY/)
    }
  })
})
