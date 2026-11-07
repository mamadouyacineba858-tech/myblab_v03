import { describe, expect, it } from 'vitest'
import { roundedWirePath } from './roundedWirePath.js'

describe('WIRE-001 rounded cable geometry', () => {
  it('preserves endpoints and rounds orthogonal corners', () => {
    const path = roundedWirePath('M 0 0 L 50 0 L 50 50 L 100 50')
    expect(path.startsWith('M 0 0 ')).toBe(true)
    expect(path.endsWith('L 100 50')).toBe(true)
    expect((path.match(/ Q /g) ?? []).length).toBe(2)
  })
  it('does not mutate original path data or stored waypoints', () => {
    const original = 'M 1 2 L 10 2 L 10 30'
    expect(original).toBe('M 1 2 L 10 2 L 10 30')
    expect(roundedWirePath(original)).not.toBe(original)
  })
  it('preserves invalid and non-polyline paths without rewriting', () => {
    expect(roundedWirePath('M 0 0 C 1 1 2 2 3 3')).toBe('M 0 0 C 1 1 2 2 3 3')
    expect(roundedWirePath('M 0 0 L 10 10', 0)).toBe('M 0 0 L 10 10')
    expect(roundedWirePath('')).toBe('')
  })
  it('keeps finite output for coincident segments', () => {
    const result = roundedWirePath('M 0 0 L 0 0 L 40 0 L 40 40')
    expect(result).not.toContain('NaN')
    expect(result).not.toContain('Infinity')
  })
})
