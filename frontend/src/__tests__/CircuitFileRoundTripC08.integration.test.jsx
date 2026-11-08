import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { toEngineInput } from '../simulator/engineAdapter.js'
import { runSimulation, getLedState } from '../simulator/engine.js'
import { getInstruments, updateInstruments, resetInstruments } from '../instruments/instrumentsStore.js'

const wrapper = ({ children }) => React.createElement(CircuitProvider, null, children)

// C08 : sauvegarde réelle sur disque (JSON) puis réouverture dans un état vierge.
describe('C08 — sauvegarde sur fichier et réouverture', () => {
  beforeEach(() => resetInstruments())

  it('conserve composants, fils, paramètres et réglages des instruments', () => {
    const document = {
      version: 1,
      components: [
        { uid: 's', type: 'POWER', x: 100, y: 100, parameters: { voltage: 9 } },
        { uid: 'r', type: 'RESISTOR', x: 300, y: 100, parameters: { resistance: 330 } },
        { uid: 'd', type: 'LED', x: 500, y: 100 },
      ],
      wires: [
        { id: 'a', fromUid: 's', fromPin: '5V', toUid: 'r', toPin: 'A' },
        { id: 'b', fromUid: 'r', fromPin: 'B', toUid: 'd', toPin: 'anode' },
        { id: 'c', fromUid: 'd', fromPin: 'cathode', toUid: 's', toPin: 'GND' },
      ],
    }
    const first = renderHook(() => useCircuit(), { wrapper })
    act(() => first.result.current.importCircuit(document))
    act(() => updateInstruments((s) => {
      Object.assign(s.generator, { enabled: true, waveform: 'square', frequencyHz: 2, amplitude: 1, offset: 1, plus: { uid: 'r', pin: 'A' }, minus: { uid: 's', pin: 'GND' } })
      s.scope.ch1 = { plus: { uid: 'r', pin: 'B' }, minus: { uid: 's', pin: 'GND' } }
      s.voltmeter = { plus: { uid: 'd', pin: 'anode' }, minus: { uid: 'd', pin: 'cathode' } }
      s.ammeter = { a: { uid: 'd', pin: 'cathode' }, b: { uid: 's', pin: 'GND' } }
    }))
    const savedInstruments = structuredClone(getInstruments())
    const saved = first.result.current.exportCircuit()

    const dir = mkdtempSync(join(tmpdir(), 'myblab-c08-'))
    const file = join(dir, 'circuit.myblab.json')
    try {
      writeFileSync(file, JSON.stringify(saved, null, 2), 'utf8')
      first.unmount()
      cleanup()
      resetInstruments()
      expect(getInstruments().ammeter.a).toBeNull()

      const loaded = JSON.parse(readFileSync(file, 'utf8'))
      const second = renderHook(() => useCircuit(), { wrapper })
      expect(second.result.current.exportCircuit().components).toHaveLength(0)
      act(() => second.result.current.importCircuit(loaded))
      const reopened = second.result.current.exportCircuit()

      expect(reopened.components.map((c) => [c.uid, c.type])).toEqual([['s', 'POWER'], ['r', 'RESISTOR'], ['d', 'LED']])
      expect(reopened.components.find((c) => c.uid === 's').parameters).toEqual({ voltage: 9 })
      expect(reopened.components.find((c) => c.uid === 'r').parameters).toEqual({ resistance: 330 })
      expect(reopened.wires.map((x) => `${x.fromUid}.${x.fromPin}>${x.toUid}.${x.toPin}`)).toEqual([
        's.5V>r.A', 'r.B>d.anode', 'd.cathode>s.GND',
      ])
      expect(getInstruments()).toEqual(savedInstruments)

      const engine = toEngineInput(ReactDocumentMapper.toCore(reopened))
      expect(getLedState('d', runSimulation(engine.components, engine.wires)).on).toBe(true)
      second.unmount()
    } finally {
      rmSync(dir, { recursive: true, force: true })
      cleanup()
    }
  })
})
