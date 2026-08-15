import { describe, it, expect } from 'vitest'
import { NpnTransistorModel } from '../../simulator/models/NpnTransistorModel.js'

describe('NpnTransistorModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "NPN_TRANSISTOR"', () => {
      expect(NpnTransistorModel.type).toBe('NPN_TRANSISTOR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof NpnTransistorModel.validate).toBe('function')
      expect(NpnTransistorModel.defaultParameters).toBeUndefined()
      expect(NpnTransistorModel.parameterSchema).toBeUndefined()
      expect(NpnTransistorModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(NpnTransistorModel.validate({ onResistance: 1 })).toBe(true)
      expect(NpnTransistorModel.validate({ onResistance: 0.001 })).toBe(true)
    })

    it('devrait rejeter une résistance de conduction négative ou nulle', () => {
      expect(NpnTransistorModel.validate({ onResistance: -1 })).toBe(false)
      expect(NpnTransistorModel.validate({ onResistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(NpnTransistorModel.validate({})).toBe(false)
      expect(NpnTransistorModel.validate({ onResistance: '1' })).toBe(false)
      expect(NpnTransistorModel.validate(null)).toBe(false)
      expect(NpnTransistorModel.validate({ onResistance: Number.NaN })).toBe(false)
      expect(NpnTransistorModel.validate({ onResistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(NpnTransistorModel.defaultParameters).toBeUndefined()
      expect(NpnTransistorModel.parameterSchema).toBeUndefined()
      expect(NpnTransistorModel.capabilities).toBeUndefined()
    })
  })
})
