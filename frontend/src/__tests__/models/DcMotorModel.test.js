import { describe, it, expect } from 'vitest'
import { DcMotorModel } from '../../simulator/models/DcMotorModel.js'

describe('DcMotorModel', () => {
  describe('Structure du modèle exécutable', () => {
    it('devrait avoir un type "DC_MOTOR"', () => {
      expect(DcMotorModel.type).toBe('DC_MOTOR')
    })

    it('devrait exposer uniquement son comportement exécutable', () => {
      expect(typeof DcMotorModel.validate).toBe('function')
      expect(DcMotorModel.defaultParameters).toBeUndefined()
      expect(DcMotorModel.parameterSchema).toBeUndefined()
      expect(DcMotorModel.capabilities).toBeUndefined()
    })
  })

  describe('validate()', () => {
    it('devrait accepter des paramètres valides', () => {
      expect(DcMotorModel.validate({ resistance: 20 })).toBe(true)
      expect(DcMotorModel.validate({ resistance: 0.5 })).toBe(true)
    })

    it('devrait rejeter une résistance négative ou nulle', () => {
      expect(DcMotorModel.validate({ resistance: -20 })).toBe(false)
      expect(DcMotorModel.validate({ resistance: 0 })).toBe(false)
    })

    it('devrait rejeter des paramètres invalides', () => {
      expect(DcMotorModel.validate({})).toBe(false)
      expect(DcMotorModel.validate({ resistance: '20' })).toBe(false)
      expect(DcMotorModel.validate(null)).toBe(false)
      expect(DcMotorModel.validate({ resistance: Number.NaN })).toBe(false)
      expect(DcMotorModel.validate({ resistance: Number.POSITIVE_INFINITY })).toBe(false)
    })
  })

  describe('ne devrait pas porter les métadonnées déclaratives du Registry canonique', () => {
    it('pas de defaultParameters/parameterSchema/capabilities sur le modèle exécutable', () => {
      expect(DcMotorModel.defaultParameters).toBeUndefined()
      expect(DcMotorModel.parameterSchema).toBeUndefined()
      expect(DcMotorModel.capabilities).toBeUndefined()
    })
  })
})
