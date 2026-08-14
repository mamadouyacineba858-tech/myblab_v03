import { describe, it, expect } from 'vitest'
import {
  getSimulationModel,
  isSimulationModelAvailable,
  getSimulationDefaultParameters,
} from '../simulationRegistry.js'
import { UnsupportedSimulationCapabilityError } from '../errors/index.js'

describe('MB-CF2-SIM-001 simulation registry', () => {
  it('resolves the four available models', () => {
    expect(getSimulationModel('POWER').type).toBe('POWER')
    expect(getSimulationModel('RESISTOR').type).toBe('RESISTOR')
    expect(getSimulationModel('LDR').type).toBe('LDR')
    expect(getSimulationModel('THERMISTOR').type).toBe('THERMISTOR')
  })

  it('reports unavailable declared models', () => {
    expect(isSimulationModelAvailable('CAPACITOR')).toBe(false)
    expect(isSimulationModelAvailable('DIODE')).toBe(false)
  })

  it('resolves capabilities from the canonical Registry', () => {
    expect(getSimulationModel('POWER', { requireCapability: 'dc' }).type).toBe('POWER')
    expect(() => getSimulationModel('POWER', { requireCapability: 'analog' })).toThrow(UnsupportedSimulationCapabilityError)
  })

  it('resolves default parameters from the canonical Registry', () => {
    expect(getSimulationDefaultParameters('POWER')).toEqual({ voltage: 5 })
    expect(getSimulationDefaultParameters('RESISTOR')).toEqual({ resistance: 220 })
    expect(getSimulationDefaultParameters('LDR')).toEqual({ resistance: 10000 })
    expect(getSimulationDefaultParameters('THERMISTOR')).toEqual({ resistance: 10000 })
  })
})
