import { describe, it, expect } from 'vitest'
import { PotentiometerModel } from '../../simulator/models/PotentiometerModel.js'

describe('PotentiometerModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "POTENTIOMETER"', () => {
      expect(PotentiometerModel.type).toBe('POTENTIOMETER')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof PotentiometerModel.validate).toBe('function')
      expect(PotentiometerModel.defaultParameters).toBeUndefined()
      expect(PotentiometerModel.parameterSchema).toBeUndefined()
      expect(PotentiometerModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(PotentiometerModel.validate({ resistance: 10000, position: 0.5 })).toBe(true)
      expect(PotentiometerModel.validate({ resistance: 10000, position: 0 })).toBe(true)
      expect(PotentiometerModel.validate({ resistance: 10000, position: 1 })).toBe(true)
    })

    it('devrait rejeter une résistance négative ou nulle', () => {
      expect(PotentiometerModel.validate({ resistance: -10000, position: 0.5 })).toBe(false)
      expect(PotentiometerModel.validate({ resistance: 0, position: 0.5 })).toBe(false)
    })

    it('devrait rejeter une position hors de [0, 1]', () => {
      expect(PotentiometerModel.validate({ resistance: 10000, position: -0.1 })).toBe(false)
      expect(PotentiometerModel.validate({ resistance: 10000, position: 1.1 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(PotentiometerModel.validate({})).toBe(false)
      expect(PotentiometerModel.validate({ resistance: 10000 })).toBe(false)
      expect(PotentiometerModel.validate({ position: 0.5 })).toBe(false)
      expect(PotentiometerModel.validate(null)).toBe(false)
      expect(PotentiometerModel.validate({ resistance: Number.NaN, position: 0.5 })).toBe(false)
      expect(PotentiometerModel.validate({ resistance: 10000, position: Number.NaN })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(PotentiometerModel.defaultParameters).toBeUndefined()
      expect(PotentiometerModel.parameterSchema).toBeUndefined()
      expect(PotentiometerModel.capabilities).toBeUndefined()
    })
  })
})
