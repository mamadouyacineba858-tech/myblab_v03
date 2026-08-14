import { describe, it, expect } from 'vitest'
import { LdrModel } from '../../simulator/models/LdrModel.js'

describe('LdrModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "LDR"', () => {
      expect(LdrModel.type).toBe('LDR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof LdrModel.validate).toBe('function')
      expect(LdrModel.defaultParameters).toBeUndefined()
      expect(LdrModel.parameterSchema).toBeUndefined()
      expect(LdrModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(LdrModel.validate({ resistance: 10000 })).toBe(true)
      expect(LdrModel.validate({ resistance: 100 })).toBe(true)
      expect(LdrModel.validate({ resistance: 10000000 })).toBe(true)
    })

    it('devrait rejeter une résistance négative', () => {
      expect(LdrModel.validate({ resistance: -100 })).toBe(false)
    })

    it('devrait rejeter une résistance nulle', () => {
      expect(LdrModel.validate({ resistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(LdrModel.validate({})).toBe(false)
      expect(LdrModel.validate({ resistance: '10000' })).toBe(false)
      expect(LdrModel.validate(null)).toBe(false)
      expect(LdrModel.validate({ resistance: Number.NaN })).toBe(false)
      expect(LdrModel.validate({ resistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('Conformité au contrat MB-SIM-001 / MB-SIM-008 / ADR-012', () => {
    it('ne devrait pas contenir de logique de résolution ou de calcul', () => {
      expect(typeof LdrModel.solve).toBe('undefined')
      expect(typeof LdrModel.compute).toBe('undefined')
    })

    it('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
      expect(LdrModel.defaultParameters).toBeUndefined()
      expect(LdrModel.parameterSchema).toBeUndefined()
      expect(LdrModel.capabilities).toBeUndefined()
    })
  })
})
