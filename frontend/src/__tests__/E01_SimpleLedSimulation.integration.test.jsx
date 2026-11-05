/**
 * E01 — Lot E01 Functional Demonstration Test
 * 
 * Tests a simple LED circuit with power supply, resistor, and ammeter.
 * Demonstrates:
 * - Component catalog working (POWER, RESISTOR, LED)
 * - Circuit wiring preservation
 * - LED illumination (simulation result)
 * - Current measurement (ammeter reading)
 * - Instrument configuration
 */

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { toEngineInput } from '../simulator/engineAdapter.js'
import { runSimulation, getLedState } from '../simulator/engine.js'
import { getInstruments, updateInstruments, resetInstruments } from '../instruments/instrumentsStore.js'

const wrapper = ({ children }) => React.createElement(CircuitProvider, null, children)

describe('E01 — Simple LED Simulation with Ammeter', () => {
  beforeEach(() => resetInstruments())

  it('E01-001: Creates and simulates a 5V LED circuit with 220Ω resistor and ammeter', () => {
    // E01-A: Component catalog and placement
    const ledCircuit = {
      version: 1,
      components: [
        {
          uid: 'power-1',
          type: 'POWER',
          x: 120,
          y: 140,
          parameters: { voltage: 5 },
          properties: { name: 'Power Supply 5V' }
        },
        {
          uid: 'resistor-220',
          type: 'RESISTOR',
          x: 360,
          y: 160,
          parameters: { resistance: 220 },
          properties: { name: 'Current Limiting Resistor' }
        },
        {
          uid: 'led-red',
          type: 'LED',
          x: 620,
          y: 140,
          parameters: {},
          properties: { name: 'Red LED', color: 'red' }
        }
      ],
      // E01-B: Wiring
      wires: [
        {
          id: 'wire-1',
          fromUid: 'power-1',
          fromPin: '5V',
          toUid: 'resistor-220',
          toPin: 'A',
          waypoints: []
        },
        {
          id: 'wire-2',
          fromUid: 'resistor-220',
          fromPin: 'B',
          toUid: 'led-red',
          toPin: 'anode',
          waypoints: []
        },
        {
          id: 'wire-3',
          fromUid: 'led-red',
          fromPin: 'cathode',
          toUid: 'power-1',
          toPin: 'GND',
          waypoints: []
        }
      ],
      breadboards: [],
      instruments: {
        generator: {
          id: 'gen1',
          enabled: false,
          waveform: 'sine',
          frequencyHz: 100,
          amplitude: 2,
          offset: 0,
          duty: 0.5,
          plus: null,
          minus: null
        },
        scope: {
          windowMs: 20,
          ch1: { plus: null, minus: null },
          ch2: { plus: null, minus: null }
        },
        voltmeter: {
          plus: null,
          minus: null
        },
        ammeter: {
          a: { uid: 'led-red', pin: 'cathode' },
          b: { uid: 'power-1', pin: 'GND' }
        }
      }
    }

    // Setup: import circuit
    const hook = renderHook(() => useCircuit(), { wrapper })
    
    act(() => {
      hook.result.current.importCircuit(ledCircuit)
    })

    // Verify component import
    const exported = hook.result.current.exportCircuit()
    expect(exported.components).toHaveLength(3)
    expect(exported.components.map((c) => c.type)).toEqual(['POWER', 'RESISTOR', 'LED'])
    expect(exported.wires).toHaveLength(3)

    // E01-C: Electrical simulation
    const engine = toEngineInput(ReactDocumentMapper.toCore(exported))
    const simResults = runSimulation(engine.components, engine.wires)

    // E01-D: Verify LED is ON
    const ledState = getLedState('led-red', simResults)
    expect(ledState.on).toBe(true)
    expect(ledState.vled).toBeGreaterThan(1.5) // Red LED forward voltage ~2.1V
    expect(ledState.vled).toBeLessThan(3) // But less than 3V

    // E01-E: Verify current through circuit
    // 5V supply, 2.1V across LED, 220Ω resistor
    // Expected current ≈ (5 - 2.1) / 220 ≈ 13.2 mA
    expect(ledState.current).toBeGreaterThan(0.010) // > 10 mA
    expect(ledState.current).toBeLessThan(0.020) // < 20 mA
    
    // More precise check (like in lot D reports: 13.043 mA)
    const expectedCurrent = (5 - 2.1) / 220
    expect(Math.abs(ledState.current - expectedCurrent)).toBeLessThan(0.002) // Within 2 mA

    // Instrument configuration persistence
    const instruments = getInstruments()
    expect(instruments.ammeter.a.uid).toBe('led-red')
    expect(instruments.ammeter.a.pin).toBe('cathode')
    expect(instruments.ammeter.b.uid).toBe('power-1')
    expect(instruments.ammeter.b.pin).toBe('GND')

    hook.unmount()
    cleanup()
  })

  it('E01-002: LED off when circuit is not wired', () => {
    // Test that unwired LED does not light up
    const unconnectedCircuit = {
      version: 1,
      components: [
        { uid: 'power-1', type: 'POWER', x: 120, y: 140, parameters: { voltage: 5 } },
        { uid: 'led-red', type: 'LED', x: 620, y: 140, parameters: {} }
      ],
      wires: [], // No wiring
      breadboards: [],
      instruments: {
        generator: {
          id: 'gen1', enabled: false, waveform: 'sine', frequencyHz: 100,
          amplitude: 2, offset: 0, duty: 0.5, plus: null, minus: null
        },
        scope: { windowMs: 20, ch1: { plus: null, minus: null }, ch2: { plus: null, minus: null } },
        voltmeter: { plus: null, minus: null },
        ammeter: { a: null, b: null }
      }
    }

    const hook = renderHook(() => useCircuit(), { wrapper })
    
    act(() => {
      hook.result.current.importCircuit(unconnectedCircuit)
    })

    const exported = hook.result.current.exportCircuit()
    const engine = toEngineInput(ReactDocumentMapper.toCore(exported))
    const simResults = runSimulation(engine.components, engine.wires)
    
    const ledState = getLedState('led-red', simResults)
    expect(ledState.on).toBe(false)
    expect(ledState.current).toBe(0)

    hook.unmount()
    cleanup()
  })

  it('E01-003: Circuit preserves component catalog throughout workflow', () => {
    // Verify all three component types from catalog are available
    const hook = renderHook(() => useCircuit(), { wrapper })
    
    const testCircuit = {
      version: 1,
      components: [
        { uid: 'p1', type: 'POWER', x: 100, y: 100, parameters: { voltage: 5 } },
        { uid: 'r1', type: 'RESISTOR', x: 200, y: 100, parameters: { resistance: 100 } },
        { uid: 'l1', type: 'LED', x: 300, y: 100, parameters: {} }
      ],
      wires: [],
      breadboards: [],
      instruments: { generator: null, scope: null, voltmeter: null, ammeter: null }
    }

    act(() => {
      hook.result.current.importCircuit(testCircuit)
    })

    const exported = hook.result.current.exportCircuit()
    
    // Verify catalog components loaded
    const componentTypes = new Set(exported.components.map((c) => c.type))
    expect(componentTypes).toContain('POWER')
    expect(componentTypes).toContain('RESISTOR')
    expect(componentTypes).toContain('LED')

    hook.unmount()
    cleanup()
  })
})
