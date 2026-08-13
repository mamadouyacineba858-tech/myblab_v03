import { describe, it, expect } from 'vitest'
import { getSimulationModel, isSimulationModelAvailable } from '../simulationRegistry.js'

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
})
