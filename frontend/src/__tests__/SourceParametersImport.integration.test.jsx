import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { toEngineInput } from '../simulator/engineAdapter.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { resolveSignals } from '../simulator/resolution.js'

const wrapper = ({children}) => React.createElement(CircuitProvider,null,children)
describe('FT-C-BAT-001-R2 real application import/export', () => {
  it('retains POWER 12V through import, export, reimport and the engine adapter', () => {
    const {result,unmount} = renderHook(() => useCircuit(),{wrapper})
    const document = {version:1,components:[
      {uid:'s',type:'POWER',x:100,y:100,parameters:{voltage:12}},
      {uid:'r',type:'RESISTOR',x:300,y:100},
    ],wires:[
      {id:'a',fromUid:'s',fromPin:'5V',toUid:'r',toPin:'A'},
      {id:'b',fromUid:'s',fromPin:'GND',toUid:'r',toPin:'B'},
    ]}
    act(() => result.current.importCircuit(document))
    const exported = result.current.exportCircuit()
    expect(exported.components[0].parameters).toEqual({voltage:12})
    act(() => result.current.importCircuit(JSON.parse(JSON.stringify(exported))))
    const engine = toEngineInput(ReactDocumentMapper.toCore(result.current.exportCircuit()))
    const resolved = resolveSignals(engine.components,prepareCircuit(engine.components,engine.wires))
    expect(resolved.dcAnalysis.get('r').voltage).toBe(12)
    expect(resolved.dcAnalysis.get('r').current).toBeCloseTo(12/220,10)
    expect(document.components[0].parameters).toEqual({voltage:12})
    unmount()
    cleanup()
  })
})
