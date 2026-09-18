import { describe, it, expect } from 'vitest'
import { ZenerDiodeModel } from '../../simulator/models/ZenerDiodeModel.js'

describe('ZenerDiodeModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "ZENER_DIODE"', () => {
      expect(ZenerDiodeModel.type).toBe('ZENER_DIODE')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof ZenerDiodeModel.validate).toBe('function')
      expect(ZenerDiodeModel.defaultParameters).toBeUndefined()
      expect(ZenerDiodeModel.parameterSchema).toBeUndefined()
      expect(ZenerDiodeModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    const valid = { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 }

    it('devrait accepter des paramètres valides', () => {
      expect(ZenerDiodeModel.validate(valid)).toBe(true)
      expect(ZenerDiodeModel.validate({ forwardVoltage: 0, onResistance: 0.001, breakdownVoltage: 0, breakdownResistance: 0.001 })).toBe(true)
    })

    it('devrait rejeter une résistance de conduction directe négative ou nulle', () => {
      expect(ZenerDiodeModel.validate({ ...valid, onResistance: -10 })).toBe(false)
      expect(ZenerDiodeModel.validate({ ...valid, onResistance: 0 })).toBe(false)
    })

    it('devrait rejeter une tension de seuil directe négative', () => {
      expect(ZenerDiodeModel.validate({ ...valid, forwardVoltage: -0.1 })).toBe(false)
    })

    it('devrait rejeter une tension de breakdown négative', () => {
      expect(ZenerDiodeModel.validate({ ...valid, breakdownVoltage: -0.1 })).toBe(false)
    })

    it('devrait rejeter une résistance de breakdown négative ou nulle', () => {
      expect(ZenerDiodeModel.validate({ ...valid, breakdownResistance: -10 })).toBe(false)
      expect(ZenerDiodeModel.validate({ ...valid, breakdownResistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres manquants ou invalides', () => {
      expect(ZenerDiodeModel.validate({})).toBe(false)
      expect(ZenerDiodeModel.validate(null)).toBe(false)
      expect(ZenerDiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10 })).toBe(false)
      expect(ZenerDiodeModel.validate({ ...valid, breakdownVoltage: Number.NaN })).toBe(false)
      expect(ZenerDiodeModel.validate({ ...valid, breakdownResistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(ZenerDiodeModel.defaultParameters).toBeUndefined()
      expect(ZenerDiodeModel.parameterSchema).toBeUndefined()
      expect(ZenerDiodeModel.capabilities).toBeUndefined()
    })
  })
})
