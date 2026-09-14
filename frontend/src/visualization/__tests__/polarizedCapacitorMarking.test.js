import { describe, it, expect } from 'vitest'
import { formatPolarizedCapacitanceMarking } from '../polarizedCapacitorMarking.js'

describe('MB-L1-PROP-010 — polarized capacitor dynamic capacitance marking', () => {
  it.each([
    [100e-6, '100µF'],
    [47e-6, '47µF'],
    [10e-6, '10µF'],
    [1e-6, '1µF'],
    [2.2e-6, '2.2µF'],
  ])('%s F -> %s', (farads, expected) => {
    const result = formatPolarizedCapacitanceMarking(farads)
    expect(result.exact).toBe(true)
    expect(result.marking).toBe(expected)
  })

  it('utilise des unités d’ingénierie pour toute la plage canonique', () => {
    expect(formatPolarizedCapacitanceMarking(1).marking).toBe('1F')
    expect(formatPolarizedCapacitanceMarking(470e-9).marking).toBe('470nF')
    expect(formatPolarizedCapacitanceMarking(100e-12).marking).toBe('100pF')
  })

  it('refuse les entrées invalides au lieu d’inventer un marquage', () => {
    for (const value of [undefined, null, NaN, Infinity, 0, -1]) {
      const result = formatPolarizedCapacitanceMarking(value)
      expect(result.exact).toBe(false)
      expect(result.marking).toBeNull()
    }
  })
})
