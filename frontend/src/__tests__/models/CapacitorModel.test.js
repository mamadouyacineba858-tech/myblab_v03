import { describe, it, expect } from 'vitest'
import { CapacitorModel } from '../../simulator/models/CapacitorModel.js'

describe('CapacitorModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "CAPACITOR"', () => {
      expect(CapacitorModel.type).toBe('CAPACITOR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof CapacitorModel.validate).toBe('function')
      expect(CapacitorModel.defaultParameters).toBeUndefined()
      expect(CapacitorModel.parameterSchema).toBeUndefined()
      expect(CapacitorModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(CapacitorModel.validate({ capacitance: 0.0001 })).toBe(true)
      expect(CapacitorModel.validate({ capacitance: 1e-12 })).toBe(true)
    })

    it('devrait rejeter une capacité négative ou nulle', () => {
      expect(CapacitorModel.validate({ capacitance: -0.0001 })).toBe(false)
      expect(CapacitorModel.validate({ capacitance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(CapacitorModel.validate({})).toBe(false)
      expect(CapacitorModel.validate({ capacitance: '0.0001' })).toBe(false)
      expect(CapacitorModel.validate(null)).toBe(false)
      expect(CapacitorModel.validate({ capacitance: Number.NaN })).toBe(false)
      expect(CapacitorModel.validate({ capacitance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(CapacitorModel.defaultParameters).toBeUndefined()
      expect(CapacitorModel.parameterSchema).toBeUndefined()
      expect(CapacitorModel.capabilities).toBeUndefined()
    })
  })
})
