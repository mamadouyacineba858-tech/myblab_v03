import { describe, it, expect } from 'vitest'
import { normalizeComponent } from '../circuitModel.js'
import { ReactDocumentMapper } from '../../bridge/ReactDocumentMapper.js'
import { toEngineInput } from '../../simulator/engineAdapter.js'
import { getDcSource } from '../../simulator/dcSourceRegistry.js'
import { resolveSignals } from '../../simulator/resolution.js'
import { prepareCircuit } from '../../simulator/preparation.js'

const base = { uid: 's', type: 'POWER', x: 58, y: 22, pins: [] }
describe('FT-C-BAT-001-R2 parameter transport', () => {
  it.each(['POWER','RESISTOR','FUTURE_COMPONENT'])('%s preserves parameters without mutating the source', type => {
    const parameters = Object.freeze({ voltage: 12, custom: { mode: 'test' } })
    const input = Object.freeze({ ...base, type, parameters })
    const normalized = normalizeComponent(input)
    expect(normalized).toEqual(input)
    expect(normalized.parameters).not.toBe(parameters)
    normalized.parameters.voltage = 3
    expect(parameters.voltage).toBe(12)
  })
  it('does not synthesize parameters for legacy components', () => {
    expect(normalizeComponent(base)).toEqual(base)
    expect(Object.hasOwn(normalizeComponent(base),'parameters')).toBe(false)
  })
  it.each([null,undefined,[],12,'12'])('ignores invalid parameter containers %j', parameters => {
    expect(normalizeComponent({ ...base, parameters })).toEqual(base)
  })
  it.each([['BUTTON','pressed'],['BUTTON_LATCHING','on']])('%s preserves interaction state, positions and pins', (type,state) => {
    const input = { ...base,type,state,parameters:{custom:1} }
    expect(normalizeComponent(input)).toEqual(input)
  })
  it.each([['POWER',{voltage:12},12],['POWER',undefined,5],['BATTERY_9V',{voltage:12},9],['COIN_CELL_CR2032',{voltage:12},3],['BATTERY_AA',{voltage:12},1.5]])('%s round trip and actual DC analysis use %j => %s volts', (type,parameters,voltage) => {
    const source = normalizeComponent({ ...base,type,...(parameters ? {parameters} : {}) })
    const terminals = getDcSource(source)
    const document = { version:1,components:[source,{uid:'r',type:'RESISTOR',x:200,y:100}],wires:[
      {id:'a',fromUid:'s',fromPin:terminals.positivePin,toUid:'r',toPin:'A'},
      {id:'b',fromUid:'s',fromPin:terminals.negativePin,toUid:'r',toPin:'B'},
    ] }
    const roundTrip = JSON.parse(JSON.stringify(ReactDocumentMapper.toReact(ReactDocumentMapper.toCore(document))))
    roundTrip.components = roundTrip.components.map(normalizeComponent)
    const engine = toEngineInput(ReactDocumentMapper.toCore(roundTrip))
    expect(getDcSource(engine.components[0]).voltage).toBe(voltage)
    const result = resolveSignals(engine.components,prepareCircuit(engine.components,engine.wires))
    expect(result.dcAnalysis.get('r').voltage).toBe(voltage)
    expect(result.dcAnalysis.get('r').current).toBeCloseTo(voltage/220,10)
  })
})
