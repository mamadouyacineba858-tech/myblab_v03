import { describe, it, expect } from 'vitest'
import { PowerModel } from '../../simulator/models/PowerModel.js'

describe('PowerModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "POWER"', () => {
      expect(PowerModel.type).toBe('POWER')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof PowerModel.validate).toBe('function')
      expect(PowerModel.defaultParameters).toBeUndefined()
      expect(PowerModel.parameterSchema).toBeUndefined()
      expect(PowerModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(PowerModel.validate({ voltage: 5 })).toBe(true)
      expect(PowerModel.validate({ voltage: 3.3 })).toBe(true)
      expect(PowerModel.validate({ voltage: 12 })).toBe(true)
    })

    it('devrait rejeter une tension négative', () => {
      expect(PowerModel.validate({ voltage: -5 })).toBe(false)
    })

    it('devrait rejeter une tension nulle', () => {
      expect(PowerModel.validate({ voltage: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(PowerModel.validate({})).toBe(false)
      expect(PowerModel.validate({ voltage: '5' })).toBe(false)
      expect(PowerModel.validate(null)).toBe(false)
      expect(PowerModel.validate({ voltage: Number.NaN })).toBe(false)
      expect(PowerModel.validate({ voltage: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('Conformité au contrat MB-SIM-001 / ADR-012', () => {
    it('ne devrait pas contenir de logique de résolution ou de calcul', () => {
      expect(typeof PowerModel.solve).toBe('undefined')
      expect(typeof PowerModel.compute).toBe('undefined')
    })

    it('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
      expect(PowerModel.defaultParameters).toBeUndefined()
      expect(PowerModel.parameterSchema).toBeUndefined()
      expect(PowerModel.capabilities).toBeUndefined()
    })
  })
})
