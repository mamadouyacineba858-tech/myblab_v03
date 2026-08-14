import { describe, it, expect } from 'vitest'
import { ThermistorModel } from '../../simulator/models/ThermistorModel.js'

describe('ThermistorModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "THERMISTOR"', () => {
      expect(ThermistorModel.type).toBe('THERMISTOR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof ThermistorModel.validate).toBe('function')
      expect(ThermistorModel.defaultParameters).toBeUndefined()
      expect(ThermistorModel.parameterSchema).toBeUndefined()
      expect(ThermistorModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(ThermistorModel.validate({ resistance: 10000 })).toBe(true)
      expect(ThermistorModel.validate({ resistance: 100 })).toBe(true)
      expect(ThermistorModel.validate({ resistance: 1000000 })).toBe(true)
    })

    it('devrait rejeter une résistance négative', () => {
      expect(ThermistorModel.validate({ resistance: -100 })).toBe(false)
    })

    it('devrait rejeter une résistance nulle', () => {
      expect(ThermistorModel.validate({ resistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(ThermistorModel.validate({})).toBe(false)
      expect(ThermistorModel.validate({ resistance: '10000' })).toBe(false)
      expect(ThermistorModel.validate(null)).toBe(false)
      expect(ThermistorModel.validate({ resistance: Number.NaN })).toBe(false)
      expect(ThermistorModel.validate({ resistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('Conformité au contrat MB-SIM-001 / MB-SIM-008 / ADR-012', () => {
    it('ne devrait pas contenir de logique de résolution ou de calcul', () => {
      expect(typeof ThermistorModel.solve).toBe('undefined')
      expect(typeof ThermistorModel.compute).toBe('undefined')
    })

    it('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
      expect(ThermistorModel.defaultParameters).toBeUndefined()
      expect(ThermistorModel.parameterSchema).toBeUndefined()
      expect(ThermistorModel.capabilities).toBeUndefined()
    })
  })
})
