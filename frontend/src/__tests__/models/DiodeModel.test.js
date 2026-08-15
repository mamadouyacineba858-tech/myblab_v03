import { describe, it, expect } from 'vitest'
import { DiodeModel } from '../../simulator/models/DiodeModel.js'

describe('DiodeModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "DIODE"', () => {
      expect(DiodeModel.type).toBe('DIODE')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof DiodeModel.validate).toBe('function')
      expect(DiodeModel.defaultParameters).toBeUndefined()
      expect(DiodeModel.parameterSchema).toBeUndefined()
      expect(DiodeModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(DiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10 })).toBe(true)
      expect(DiodeModel.validate({ forwardVoltage: 0, onResistance: 0.001 })).toBe(true)
    })

    it('devrait rejeter une résistance de conduction négative ou nulle', () => {
      expect(DiodeModel.validate({ forwardVoltage: 0.7, onResistance: -10 })).toBe(false)
      expect(DiodeModel.validate({ forwardVoltage: 0.7, onResistance: 0 })).toBe(false)
    })

    it('devrait rejeter une tension de seuil négative', () => {
      expect(DiodeModel.validate({ forwardVoltage: -0.1, onResistance: 10 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(DiodeModel.validate({})).toBe(false)
      expect(DiodeModel.validate({ forwardVoltage: 0.7 })).toBe(false)
      expect(DiodeModel.validate({ onResistance: 10 })).toBe(false)
      expect(DiodeModel.validate(null)).toBe(false)
      expect(DiodeModel.validate({ forwardVoltage: Number.NaN, onResistance: 10 })).toBe(false)
      expect(DiodeModel.validate({ forwardVoltage: 0.7, onResistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(DiodeModel.defaultParameters).toBeUndefined()
      expect(DiodeModel.parameterSchema).toBeUndefined()
      expect(DiodeModel.capabilities).toBeUndefined()
    })
  })
})
