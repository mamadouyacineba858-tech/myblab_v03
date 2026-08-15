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

  /**
   * MB-SIM-008 v2 : CAPACITOR et DIODE (ainsi que DC_MOTOR, POTENTIOMETER,
   * NPN_TRANSISTOR) sont désormais des modèles disponibles — cette
   * assertion, écrite avant leur intégration, est mise à jour pour refléter
   * l'état réel du dépôt. SERVO reste explicitement hors périmètre
   * (MB-SIM-009, dépendance PWM/Scheduler) et sert désormais d'exemple de
   * type déclaré sans modèle disponible, avec LED (jamais modélisé).
   */
  it('reports unavailable declared models', () => {
    expect(isSimulationModelAvailable('SERVO')).toBe(false)
    expect(isSimulationModelAvailable('LED')).toBe(false)
  })

  it('MB-SIM-008 v2 : resolves the five newly integrated models', () => {
    expect(getSimulationModel('CAPACITOR').type).toBe('CAPACITOR')
    expect(getSimulationModel('POTENTIOMETER').type).toBe('POTENTIOMETER')
    expect(getSimulationModel('DIODE').type).toBe('DIODE')
    expect(getSimulationModel('NPN_TRANSISTOR').type).toBe('NPN_TRANSISTOR')
    expect(getSimulationModel('DC_MOTOR').type).toBe('DC_MOTOR')
    expect(isSimulationModelAvailable('CAPACITOR')).toBe(true)
    expect(isSimulationModelAvailable('POTENTIOMETER')).toBe(true)
    expect(isSimulationModelAvailable('DIODE')).toBe(true)
    expect(isSimulationModelAvailable('NPN_TRANSISTOR')).toBe(true)
    expect(isSimulationModelAvailable('DC_MOTOR')).toBe(true)
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

  it('MB-SIM-008 v2 : resolves default parameters for the five newly integrated models', () => {
    expect(getSimulationDefaultParameters('DIODE')).toEqual({ forwardVoltage: 0.7, onResistance: 10 })
    expect(getSimulationDefaultParameters('DC_MOTOR')).toEqual({ resistance: 20 })
    expect(getSimulationDefaultParameters('CAPACITOR')).toEqual({ capacitance: 0.0001 })
    expect(getSimulationDefaultParameters('POTENTIOMETER')).toEqual({ resistance: 10000, position: 0.5 })
    expect(getSimulationDefaultParameters('NPN_TRANSISTOR')).toEqual({ onResistance: 1 })
  })
})
