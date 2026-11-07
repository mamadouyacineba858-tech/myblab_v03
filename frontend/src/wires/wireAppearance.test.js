import { describe, expect, it } from 'vitest'
import { resolveWireDisplayColor, resolveWireInsulationColor, WIRE_INSULATION_COLORS } from './wireAppearance.js'

describe('WIRE-006 physical insulation color contract', () => {
  it('accepts named colors and canonical palette hex values', () => {
    expect(resolveWireInsulationColor(' red ')).toBe(WIRE_INSULATION_COLORS.red)
    expect(resolveWireInsulationColor('#DC2626')).toBe(WIRE_INSULATION_COLORS.red)
  })
  it('rejects arbitrary CSS and untrusted color strings', () => {
    for (const input of ['url(#bad)', 'var(--x)', '#123456', '', null, 42]) {
      expect(resolveWireInsulationColor(input)).toBeNull()
    }
  })
  it('uses physical insulation without changing electrical fallback', () => {
    expect(resolveWireDisplayColor({ color: 'black', fallback: '#ef4444' })).toBe(WIRE_INSULATION_COLORS.black)
    expect(resolveWireDisplayColor({ color: undefined, fallback: '#ef4444' })).toBe('#ef4444')
    expect(resolveWireDisplayColor({ color: 'bad', fallback: '#ef4444' })).toBe('#ef4444')
  })
  it('preserves the selected-wire highlight', () => {
    expect(resolveWireDisplayColor({ color: 'black', selected: true, fallback: '#22c55e' })).toBe('#22c55e')
  })
})
