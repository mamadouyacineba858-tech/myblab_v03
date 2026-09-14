import { describe, it, expect } from 'vitest'
import { encodeThermistorMarking } from '../thermistorMarking.js'

describe('MB-L1-PROP-006 — encodeThermistorMarking', () => {
  const exactCases = [
    [100, '101'],
    [1000, '102'],
    [10000, '103'],
    [47000, '473'],
    [100000, '104'],
    [220000, '224'],
    [470000, '474'],
    [1000000, '105'],
  ]

  for (const [ohms, marking] of exactCases) {
    it(`${ohms} Ω -> ${marking}`, () => {
      expect(encodeThermistorMarking(ohms)).toEqual({
        exact: true,
        marking,
        ohms,
        reason: null,
      })
    })
  }

  const neutralCases = [0, -1, 99, 12_345, 1_000_001, NaN, Infinity, null, undefined, '10000']
  for (const value of neutralCases) {
    it(`neutralise ${String(value)}`, () => {
      const result = encodeThermistorMarking(value)
      expect(result.exact).toBe(false)
      expect(result.marking).toBeNull()
    })
  }
})
