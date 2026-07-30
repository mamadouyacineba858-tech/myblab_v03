import { describe, it, expect } from 'vitest'
import { ResistorModel } from '../../simulator/models/ResistorModel.js'

describe('ResistorModel', () => {
  describe('Structure du modèle', () => {
    it('devrait avoir un type "RESISTOR"', () => {
      expect(ResistorModel.type).toBe('RESISTOR')
    })

    it('devrait avoir des defaultParameters', () => {
      expect(ResistorModel.defaultParameters).toBeDefined()
      expect(ResistorModel.defaultParameters.resistance).toBe(220)
    })

    it('devrait avoir un parameterSchema valide', () => {
      expect(Array.isArray(ResistorModel.parameterSchema)).toBe(true)
      expect(ResistorModel.parameterSchema.length).toBeGreaterThan(0)
    })

    it('devrait avoir des capabilities', () => {
      expect(Array.isArray(ResistorModel.capabilities)).toBe(true)
      expect(ResistorModel.capabilities).toContain('digital')
      expect(ResistorModel.capabilities).toContain('dc')
    })

    it('devrait avoir une fonction validate', () => {
      expect(typeof ResistorModel.validate).toBe('function')
    })
  })

  describe('parameterSchema', () => {
    it('devrait définir le paramètre "resistance"', () => {
      const resistanceParam = ResistorModel.parameterSchema.find(p => p.key === 'resistance')
      expect(resistanceParam).toBeDefined()
      expect(resistanceParam.parameterType).toBe('resistance')
      expect(resistanceParam.unit).toBe('Ω')
      expect(resistanceParam.defaultValue).toBe(220)
      expect(resistanceParam.minimum).toBeGreaterThan(0)
    })

    it('devrait avoir une description pour chaque paramètre', () => {
      for (const param of ResistorModel.parameterSchema) {
        expect(typeof param.description).toBe('string')
        expect(param.description.length).toBeGreaterThan(0)
      }
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
    })
  })

  describe('Conformité au contrat MB-SIM-001', () => {
    it('devrait être un annuaire pur (pas de logique métier)', () => {
      expect(typeof ResistorModel.solve).toBe('undefined')
      expect(typeof ResistorModel.compute).toBe('undefined')
    })

    it('ne doit pas interpréter les parameterType', () => {
      expect(ResistorModel.parameterSchema[0].parameterType).toBe('resistance')
    })

    it('doit déclarer ses capabilities explicitement', () => {
      expect(ResistorModel.capabilities).toBeDefined()
      expect(ResistorModel.capabilities.length).toBeGreaterThan(0)
    })
  })
})