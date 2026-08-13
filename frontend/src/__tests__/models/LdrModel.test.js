import { describe, it, expect } from 'vitest'
import { LdrModel } from '../../simulator/models/LdrModel.js'

describe('LdrModel', () => {
  describe('Structure du modèle', () => {
    it('devrait avoir un type "LDR"', () => {
      expect(LdrModel.type).toBe('LDR')
    })

    it('devrait avoir des defaultParameters', () => {
      expect(LdrModel.defaultParameters).toBeDefined()
      expect(LdrModel.defaultParameters.resistance).toBe(10000)
    })

    it('devrait avoir un parameterSchema valide', () => {
      expect(Array.isArray(LdrModel.parameterSchema)).toBe(true)
      expect(LdrModel.parameterSchema.length).toBeGreaterThan(0)
    })

    it('devrait avoir des capabilities', () => {
      expect(Array.isArray(LdrModel.capabilities)).toBe(true)
      expect(LdrModel.capabilities).toContain('digital')
      expect(LdrModel.capabilities).toContain('dc')
    })

    it('devrait avoir une fonction validate', () => {
      expect(typeof LdrModel.validate).toBe('function')
    })
  })

  describe('parameterSchema', () => {
    it('devrait définir cle parametre "resistance"', () => {
      const resistanceParam = LdrModel.parameterSchema.find(p => p.key === 'resistance')
      expect(resistanceParam).toBeDefined()
      expect(resistanceParam.parameterType).toBe('resistance')
      expect(resistanceParam.unit).toBe('Ω')
      expect(resistanceParam.defaultValue).toBe(10000)
      expect(resistanceParam.minimum).toBe(100)
      expect(resistanceParam.maximum).toBe(10000000)
    })

    it('devrait avoir une description pour chaque paramètre', () => {
      for (const param of LdrModel.parameterSchema) {
        expect(typeof param.description).toBe('string')
        expect(param.description.length).toBeGreaterThan(0)
      }
    })

    it('la description devrait indiquer explicitement le mode simplifié et l\'absence de dépendance à la lumière', () => {
      const resistanceParam = LdrModel.parameterSchema.find(p => p.key === 'resistance')
      expect(resistanceParam.description).toMatch(/simplifi/i)
      expect(resistanceParam.description).toMatch(/résistance fixe|constante/i)
      expect(resistanceParam.description).toMatch(/lumière/i)
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(LdrModel.validate({ resistance: 10000 })).toBe(true)
      expect(LdrModel.validate({ resistance: 100 })).toBe(true)
      expect(LdrModel.validate({ resistance: 10000000 })).toBe(true)
    })

    it('devrait rejeter une résistance negative', () => {
      expect(LdrModel.validate({ resistance: -100 })).toBe(false)
    })

    it('devrait rejeter une résistance nulle', () => {
      expect(LdrModel.validate({ resistance: 0 })).toBe(false)
    })

    it('devrait rejeter des parametres invalides', () => {
      expect(LdrModel.validate({})).toBe(false)
      expect(LdrModel.validate({ resistance: '10000' })).toBe(false)
      expect(LdrModel.validate(null)).toBe(false)
    })
  })

  describe('Conformité au contrat MB-SIM-001 / MB-SIM-008', () => {
    it('devrait être un annuaire pur (pas de logique métier)', () => {
      expect(typeof LdrModel.solve).toBe('undefined')
      expect(typeof LdrModel.compute).toBe('undefined')
    })

    it('ne doit pas interpréter les parameterType', () => {
      expect(LdrModel.parameterSchema[0].parameterType).toBe('resistance')
    })

    it('doit déclarer ses capabilities explicitement', () => {
      expect(LdrModel.capabilities).toBeDefined()
      expect(LdrModel.capabilities.length).toBeGreaterThan(0)
    })
  })
})
