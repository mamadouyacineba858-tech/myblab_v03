import { describe, it, expect } from 'vitest'
import { ThermistorModel } from '../../simulator/models/ThermistorModel.js'

describe('ThermistorModel', () => {
  describe('Structure du modèle', () => {
    it('devrait avoir un type "THERMISTOR"', () => {
      expect(ThermistorModel.type).toBe('THERMISTOR')
    })

    it('devrait avoir des defaultParameters', () => {
      expect(ThermistorModel.defaultParameters).toBeDefined()
      expect(ThermistorModel.defaultParameters.resistance).toBe(10000)
    })

    it('devrait avoir un parameterSchema valide', () => {
      expect(Array.isArray(ThermistorModel.parameterSchema)).toBe(true)
      expect(ThermistorModel.parameterSchema.length).toBeGreaterThan(0)
    })

    it('devrait avoir des capabilities', () => {
      expect(Array.isArray(ThermistorModel.capabilities)).toBe(true)
      expect(ThermistorModel.capabilities).toContain('digital')
      expect(ThermistorModel.capabilities).toContain('dc')
    })

    it('devrait avoir une fonction validate', () => {
      expect(typeof ThermistorModel.validate).toBe('function')
    })
  })

  describe('parameterSchema', () => {
    it('devrait définir le paramètre "resistance"', () => {
      const resistanceParam = ThermistorModel.parameterSchema.find(p => p.key === 'resistance')
      expect(resistanceParam).toBeDefined()
      expect(resistanceParam.parameterType).toBe('resistance')
      expect(resistanceParam.unit).toBe('Ω')
      expect(resistanceParam.defaultValue).toBe(10000)
      expect(resistanceParam.minimum).toBe(100)
      expect(resistanceParam.maximum).toBe(1000000)
    })

    it('devrait avoir une description pour chaque paramètre', () => {
      for (const param of ThermistorModel.parameterSchema) {
        expect(typeof param.description).toBe('string')
        expect(param.description.length).toBeGreaterThan(0)
      }
    })

    it('la description devrait indiquer explicitement le mode simplifié, NTC et l\'absence de dépendance à la température', () => {
      const resistanceParam = ThermistorModel.parameterSchema.find(p => p.key === 'resistance')
      expect(resistanceParam.description).toMatch(/simplifi/i)
      expect(resistanceParam.description).toMatch(/résistance fixe|constante/i)
      expect(resistanceParam.description).toMatch(/NTC/)
      expect(resistanceParam.description).toMatch(/température/i)
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
    })
  })

  describe('Conformité au contrat MB-SIM-001 / MB-SIM-008', () => {
    it('devrait être un annuaire pur (pas de logique métier)', () => {
      expect(typeof ThermistorModel.solve).toBe('undefined')
      expect(typeof ThermistorModel.compute).toBe('undefined')
    })
     it('ne doit pas interpréter les parameterType', () => {
      expect(ThermistorModel.parameterSchema[0].parameterType).toBe('resistance')
    })
    it('doit déclarer ses capabilitiees explicitement', () => {
      expect(ThermistorModel.capabilities).toBeDefined()
      expect(ThermistorModel.capabilities.length).toBeGreaterThan(0)
    })
  })
})
