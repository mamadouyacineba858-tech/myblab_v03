import { describe, it, expect } from 'vitest'
import { PowerModel } from '../../simulator/models/PowerModel.js'

describe('PowerModel', () => {
  describe('Structure du modèle', () => {
    it('devrait avoir un type "POWER"', () => {
      expect(PowerModel.type).toBe('POWER')
    })

    it('devrait avoir des defaultParameters', () => {
      expect(PowerModel.defaultParameters).toBeDefined()
      expect(PowerModel.defaultParameters.voltage).toBe(5)
    })

    it('devrait avoir un parameterSchema valide', () => {
      expect(Array.isArray(PowerModel.parameterSchema)).toBe(true)
      expect(PowerModel.parameterSchema.length).toBeGreaterThan(0)
    })

    it('devrait avoir des capabilities', () => {
      expect(Array.isArray(PowerModel.capabilities)).toBe(true)
      expect(PowerModel.capabilities).toContain('digital')
      expect(PowerModel.capabilities).toContain('dc')
    })

    it('devrait avoir une fonction validate', () => {
      expect(typeof PowerModel.validate).toBe('function')
    })
  })

  describe('parameterSchema', () => {
    it('devrait définir le paramètre "voltage"', () => {
      const voltageParam = PowerModel.parameterSchema.find(p => p.key === 'voltage')
      expect(voltageParam).toBeDefined()
      expect(voltageParam.parameterType).toBe('voltage')
      expect(voltageParam.unit).toBe('V')
      expect(voltageParam.defaultValue).toBe(5)
      expect(voltageParam.minimum).toBeGreaterThan(0)
    })

    it('devrait avoir une description pour chaque paramètre', () => {
      for (const param of PowerModel.parameterSchema) {
        expect(typeof param.description).toBe('string')
        expect(param.description.length).toBeGreaterThan(0)
      }
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
    })
  })

  describe('Conformité au contrat MB-SIM-001', () => {
    it('devrait être un annuaire pur (pas de logique métier)', () => {
      // Le modèle ne doit pas connaître les solveurs
      expect(typeof PowerModel.solve).toBe('undefined')
      expect(typeof PowerModel.compute).toBe('undefined')
    })

    it('ne doit pas interpréter les parameterType', () => {
      // ADR #1 : le framework n'interprète jamais la sémantique
      expect(PowerModel.parameterSchema[0].parameterType).toBe('voltage')
      // C'est juste une chaîne, pas une logique
    })

    it('doit déclarer ses capabilities explicitement', () => {
      // Le modèle déclare ce qu'il supporte
      expect(PowerModel.capabilities).toBeDefined()
      expect(PowerModel.capabilities.length).toBeGreaterThan(0)
    })
  })
})