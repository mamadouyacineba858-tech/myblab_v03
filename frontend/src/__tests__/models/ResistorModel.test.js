import { describe, it, expect } from 'vitest'
import { ResistorModel } from '../../simulator/models/ResistorModel.js'

describe('ResistorModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "RESISTOR"', () => {
      expect(ResistorModel.type).toBe('RESISTOR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof ResistorModel.validate).toBe('function')
      expect(ResistorModel.defaultParameters).toBeUndefined()
      expect(ResistorModel.parameterSchema).toBeUndefined()
      expect(ResistorModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(ResistorModel.validate({ resistance: 220 })).toBe(true)
      expect(ResistorModel.validate({ resistance: 1000 })).toBe(true)
      expect(ResistorModel.validate({ resistance: 0.001 })).toBe(true)
    })

    it('devrait rejeter une résistance négative', () => {
      expect(ResistorModel.validate({ resistance: -100 })).toBe(false)
    })

    it('devrait rejeter une résistance nulle', () => {
      expect(ResistorModel.validate({ resistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(ResistorModel.validate({})).toBe(false)
      expect(ResistorModel.validate({ resistance: '220' })).toBe(false)
      expect(ResistorModel.validate(null)).toBe(false)
      expect(ResistorModel.validate({ resistance: Number.NaN })).toBe(false)
      expect(ResistorModel.validate({ resistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('Conformité au contrat MB-SIM-001 / ADR-012', () => {
    it('ne devrait pas contenir de logique de résolution ou de calcul', () => {
      expect(typeof ResistorModel.solve).toBe('undefined')
      expect(typeof ResistorModel.compute).toBe('undefined')
    })

    it('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
      expect(ResistorModel.defaultParameters).toBeUndefined()
      expect(ResistorModel.parameterSchema).toBeUndefined()
      expect(ResistorModel.capabilities).toBeUndefined()
    })
  })
})
