import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getDcSource } from '../dcSourceRegistry.js'
import { getCanonicalEntry } from '../canonicalRegistry.js'
import { getSimulationModel } from '../simulationRegistry.js'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { runSimulation, getLedState } from '../engine.js'
import { toEngineInput } from '../engineAdapter.js'
import { makeBreadboardHoleEndpoint } from '../../utils/breadboardWireEndpoint.js'

const batteries = [['BATTERY_9V', 9], ['COIN_CELL_CR2032', 3], ['BATTERY_AA', 1.5]]
function circuit(type, parameters) {
  const components = [{ uid: 's', type, parameters }, { uid: 'r', type: 'RESISTOR' }]
  const source = getDcSource(components[0])
  const wires = [
    { fromUid: 's', fromPin: source.positivePin, toUid: 'r', toPin: 'A' },
    { fromUid: 's', fromPin: source.negativePin, toUid: 'r', toPin: 'B' },
  ]
  return { components, wires }
}
function resolve({ components, wires }) {
  return resolveSignals(components, prepareCircuit(components, wires))
}

describe('FT-C-BAT-001 generic DC sources', () => {
  it.each([['POWER', undefined, 5], ['POWER', { voltage: 12 }, 12], ...batteries.map(([t,v]) => [t, undefined, v])])('%s uses effective volts %j => %s', (type, parameters, voltage) => {
    const { dcAnalysis } = resolve(circuit(type, parameters))
    expect(dcAnalysis.get('r').voltage).toBe(voltage)
    expect(dcAnalysis.get('r').current).toBeCloseTo(voltage / 220, 10)
  })
  it.each(batteries)('%s canonical contract and fixed nominal voltage', (type, voltage) => {
    const entry = getCanonicalEntry(type)
    expect(entry.pins).toEqual([{ id: 'plus', role: 'power_out' }, { id: 'minus', role: 'ground_out' }])
    expect(entry.defaultParameters).toEqual({ voltage })
    expect(entry.capabilities).toEqual(['digital', 'dc'])
    expect(entry.modelAvailable).toBe(true)
    expect(entry.parameterSchema[0]).toMatchObject({ key: 'voltage', minimum: voltage, maximum: voltage })
    expect(getDcSource({ type, parameters: { voltage: 100 } }).voltage).toBe(voltage)
    const model = getSimulationModel(type)
    expect(model.type).toBe(type)
    expect(model.validate({ voltage })).toBe(true)
    expect(model.validate({ voltage: NaN })).toBe(false)
    expect(model.validate({ voltage: 0 })).toBe(false)
  })
  it.each(batteries)('%s isolated terminals are HIGH/LOW', (type) => {
    const signals = runSimulation([{ uid: 's', type }], [])
    expect(signals).toBeInstanceOf(Map)
    expect([...signals]).toEqual([['s:plus', 'HIGH'], ['s:minus', 'LOW']])
  })
  it.each([0, -1, NaN, Infinity, '12', null])('invalid POWER override %s falls back to canonical default', voltage => {
    expect(getDcSource({ type: 'POWER', parameters: { voltage } }).voltage).toBe(5)
  })
  it('no source never invents a DC supply even with external digital signals', () => {
    const components = [{ uid: 'r', type: 'RESISTOR' }]
    const prepared = prepareCircuit(components, [])
    expect(resolveSignals(components, prepared).dcAnalysis.size).toBe(0)
    expect(resolveSignals(components, prepared, new Map([['r:A', 'HIGH'], ['r:B', 'LOW']])).dcAnalysis.size).toBe(0)
    expect(getDcSource(components[0])).toBeNull()
  })
  it.each([['POWER', 'BATTERY_9V'], ['BATTERY_AA', 'COIN_CELL_CR2032'], ['BATTERY_9V', 'BATTERY_9V']])('multiple sources %s/%s refuse analysis in either order', (a,b) => {
    const c = circuit(a)
    c.components.push({ uid: 's2', type: b })
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolve({ ...c, components })
      expect(result.dcAnalysis.size).toBe(0)
      expect(result.pinSignals.get('r:A')).toBe('HIGH')
      expect(result.pinSignals.get('r:B')).toBe('LOW')
      expect(runSimulation(components, c.wires)).toBeInstanceOf(Map)
    }
  })
  it('opposing source polarities on a shared net refuse signals independent of order', () => {
    const c = circuit('BATTERY_9V')
    c.components.push({ uid: 's2', type: 'BATTERY_AA' })
    c.wires.push({ fromUid: 's', fromPin: 'plus', toUid: 's2', toPin: 'minus' })
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolve({ ...c, components })
      expect(result.dcAnalysis.size).toBe(0)
      expect([...result.pinSignals.values()].every(s => s === 'UNKNOWN')).toBe(true)
    }
  })
  it('resolution has no source-specific type or voltage hardcode', () => {
    const source = readFileSync(new URL('../resolution.js', import.meta.url), 'utf8')
    expect(source).not.toMatch(/comp\.type\s*[!=]==?\s*["'](?:POWER|BATTERY_9V|BATTERY_AA|COIN_CELL_CR2032)["']/)
    expect(source).not.toMatch(/getSimulationDefaultParameters\(["']POWER/)
  })
  it.each(batteries)('%s powers resistor and LED through two breadboard rails', (type) => {
    const hole = (column,row) => {
      const e = makeBreadboardHoleEndpoint('bb',column,row)
      return { componentId: e.uid, pinId: e.pinId }
    }
    const pin = (componentId,pinId) => ({ componentId,pinId })
    const document = {
      breadboard: { id: 'bb', position: { x:0,y:0 }, layout:'STANDARD_V1' },
      components: [
        { id:'s',type,position:{x:-300,y:-200} },
        { id:'r',type:'RESISTOR',position:{x:-300,y:100} },
        { id:'led',type:'LED',position:{x:-300,y:200} },
      ],
      wires: [
        {id:'a',pinA:pin('s','plus'),pinB:hole(0,0)},
        {id:'b',pinA:hole(5,0),pinB:pin('r','A')},
        {id:'c',pinA:pin('r','B'),pinB:pin('led','anode')},
        {id:'d',pinA:pin('led','cathode'),pinB:hole(5,1)},
        {id:'e',pinA:hole(0,1),pinB:pin('s','minus')},
      ],
    }
    const input = toEngineInput(document)
    expect(getLedState('led',runSimulation(input.components,input.wires)).on).toBe(true)
    const disconnected = toEngineInput({ ...document, wires: document.wires.filter(w => w.id !== 'a') })
    expect(getLedState('led',runSimulation(disconnected.components,disconnected.wires)).on).toBe(false)
  })
})
