import { describe, it, expect, beforeEach } from 'vitest'
import { ComponentRegistry } from '../simulator/registry.js'

describe('ComponentRegistry', () => {
  let registry

  beforeEach(() => {
    registry = new ComponentRegistry()
  })

  describe('register()', () => {
    it('devrait enregistrer un modèle valide', () => {
      const model = {
        type: 'RESISTOR',
        defaultParameters: { resistance: 220 },
        parameterSchema: [
          {
            key: 'resistance',
            parameterType: 'resistance',
            unit: 'Ω',
            minimum: 0.001,
            maximum: 1e9,
            defaultValue: 220,
            description: 'Valeur de la résistance'
          }
        ],
        capabilities: ['digital', 'dc'],
        validate: (params) => typeof params.resistance === 'number' && params.resistance > 0
      }

      registry.register(model)

      expect(registry.getModel('RESISTOR')).toBe(model)
    })

    it('devrait lever une erreur si le modèle est invalide', () => {
      expect(() => registry.register(null)).toThrow()
      expect(() => registry.register({})).toThrow()
      expect(() => registry.register({ type: 'TEST' })).toThrow()
    })

    it('devrait lever une erreur si le type est déjà enregistré', () => {
      const model1 = {
        type: 'RESISTOR',
        defaultParameters: {},
        parameterSchema: [],
        capabilities: [],
        validate: () => true
      }
      const model2 = { ...model1 }

      registry.register(model1)
      expect(() => registry.register(model2)).toThrow()
    })
  })

  describe('getModel()', () => {
    it('devrait retourner null pour un type inexistant', () => {
      expect(registry.getModel('UNKNOWN')).toBeNull()
    })

    it('devrait retourner le modèle enregistré', () => {
      const model = {
        type: 'LED',
        defaultParameters: { forwardVoltage: 2.1 },
        parameterSchema: [],
        capabilities: ['digital', 'dc', 'optical'],
        validate: () => true
      }

      registry.register(model)
      expect(registry.getModel('LED')).toBe(model)
    })
  })

  describe('getAllModels()', () => {
    it('devrait retourner un tableau vide si aucun modèle enregistré', () => {
      expect(registry.getAllModels()).toEqual([])
    })

    it('devrait retourner tous les modèles enregistrés', () => {
      const model1 = {
        type: 'RESISTOR',
        defaultParameters: {},
        parameterSchema: [],
        capabilities: [],
        validate: () => true
      }
      const model2 = {
        type: 'LED',
        defaultParameters: {},
        parameterSchema: [],
        capabilities: [],
        validate: () => true
      }

      registry.register(model1)
      registry.register(model2)

      const allModels = registry.getAllModels()
      expect(allModels).toHaveLength(2)
      expect(allModels).toContain(model1)
      expect(allModels).toContain(model2)
    })
  })

  describe('Annuaire pur (ADR #1)', () => {
    it('ne devrait PAS filtrer par capability', () => {
      expect(typeof registry.getModelsByCapability).toBe('undefined')
    })

    it('ne devrait PAS connaître les solveurs', () => {
      expect(typeof registry.getSolvers).toBe('undefined')
      expect(typeof registry.registerSolver).toBe('undefined')
    })

    it('ne devrait PAS interpréter les parameterType', () => {
      const model = {
        type: 'CUSTOM',
        defaultParameters: { customParam: 42 },
        parameterSchema: [
          {
            key: 'customParam',
            parameterType: 'customType',
            defaultValue: 42,
            description: 'Paramètre custom'
          }
        ],
        capabilities: ['custom'],
        validate: () => true
      }

      expect(() => registry.register(model)).not.toThrow()
      expect(registry.getModel('CUSTOM')).toBe(model)
    })
  })
})