import { describe, it, expect } from 'vitest'
import {
  STANDARD_CAPABILITIES,
  getAllStandardCapabilities,
  isValidCapability
} from '../simulator/capabilities.js'

describe('capabilities.js', () => {
  describe('STANDARD_CAPABILITIES', () => {
    it('devrait contenir les capacités fondamentales', () => {
      expect(STANDARD_CAPABILITIES.DIGITAL).toBe('digital')
      expect(STANDARD_CAPABILITIES.DC).toBe('dc')
      expect(STANDARD_CAPABILITIES.AC).toBe('ac')
      expect(STANDARD_CAPABILITIES.TIMING).toBe('timing')
      expect(STANDARD_CAPABILITIES.THERMAL).toBe('thermal')
    })

    it('devrait contenir les capacités physiques', () => {
      expect(STANDARD_CAPABILITIES.MECHANICAL).toBe('mechanical')
      expect(STANDARD_CAPABILITIES.OPTICAL).toBe('optical')
    })

    it('ne devrait pas contenir de doublons', () => {
      const values = Object.values(STANDARD_CAPABILITIES)
      const uniqueValues = new Set(values)
      expect(values.length).toBe(uniqueValues.size)
    })

    it('devrait avoir des clés en MAJUSCULES et des valeurs en minuscules', () => {
      for (const [key, value] of Object.entries(STANDARD_CAPABILITIES)) {
        expect(key).toBe(key.toUpperCase())
        expect(value).toBe(value.toLowerCase())
      }
    })
  })

  describe('getAllStandardCapabilities()', () => {
    it('devrait retourner un tableau de toutes les capacités', () => {
      const all = getAllStandardCapabilities()
      expect(Array.isArray(all)).toBe(true)
      expect(all.length).toBeGreaterThan(0)
      expect(all).toContain('digital')
      expect(all).toContain('dc')
    })

    it('ne devrait pas contenir de doublons', () => {
      const all = getAllStandardCapabilities()
      const unique = new Set(all)
      expect(all.length).toBe(unique.size)
    })
  })

  describe('isValidCapability()', () => {
    it('devrait retourner true pour une capacité standard', () => {
      expect(isValidCapability('digital')).toBe(true)
      expect(isValidCapability('dc')).toBe(true)
      expect(isValidCapability('thermal')).toBe(true)
    })

    it('devrait retourner true pour une capacité custom (extensibilité)', () => {
      // ADR #3 : capabilities ouvertes
      expect(isValidCapability('pwm')).toBe(true)
      expect(isValidCapability('uart')).toBe(true)
      expect(isValidCapability('customCapability')).toBe(true)
    })

    it('devrait retourner false pour une valeur invalide', () => {
      expect(isValidCapability('')).toBe(false)
      expect(isValidCapability(null)).toBe(false)
      expect(isValidCapability(undefined)).toBe(false)
      expect(isValidCapability(123)).toBe(false)
    })
  })
})