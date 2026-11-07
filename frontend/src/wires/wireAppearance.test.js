import { describe, expect, it } from 'vitest'
import { normalizeWire } from '../utils/circuitModel.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { resolveWireDisplayColor, resolveWireInsulationColor, WIRE_INSULATION_COLORS, WIRE_INSULATION_OPTIONS } from './wireAppearance.js'

describe('WIRE-006 physical insulation color contract', () => {
  it('exposes eight stable and unique palette options for UI controls', () => {
    expect(WIRE_INSULATION_OPTIONS).toHaveLength(8)
    expect(new Set(WIRE_INSULATION_OPTIONS.map(option => option.hex)).size).toBe(8)
    expect(WIRE_INSULATION_OPTIONS.every(option => resolveWireInsulationColor(option.name) === option.hex)).toBe(true)
  })
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

describe('WIRE-007 — insulation import and normalization', () => {
  const wire = { id: 'w1', fromUid: 'A', fromPin: '1', toUid: 'B', toPin: '2' }
  it('retains canonical insulation in normalized circuits', () => {
    expect(normalizeWire({ ...wire, color: 'RED' }).color).toBe('#dc2626')
  })
  it('ignores invalid colors without removing the wire', () => {
    const normalized = normalizeWire({ ...wire, color: 'url(#unsafe)' })
    expect(normalized).not.toBeNull()
    expect(normalized).not.toHaveProperty('color')
  })
  it('keeps legacy wire normalization unchanged without a color', () => {
    expect(normalizeWire(wire)).not.toHaveProperty('color')
  })
})

describe('WIRE-008 — document round-trip insulation persistence', () => {
  const reactDocument = {
    components: [],
    wires: [{
      id: 'wire-color-1',
      fromUid: 'arduino-1',
      fromPin: 'D13',
      toUid: 'led-1',
      toPin: 'anode',
      color: '#2563eb',
      waypoints: [{ x: 10, y: 20 }],
    }],
  }
  it('preserves insulation through React → Core → React mapping', () => {
    const core = ReactDocumentMapper.toCore(reactDocument)
    const restored = ReactDocumentMapper.toReact(core)
    expect(restored.wires[0].color).toBe('#2563eb')
    expect(restored.wires[0].waypoints).toEqual([{ x: 10, y: 20 }])
    expect(restored.wires[0].fromUid).toBe('arduino-1')
    expect(restored.wires[0].toUid).toBe('led-1')
  })
  it('keeps insulation after normalizing the restored document', () => {
    const restored = ReactDocumentMapper.toReact(ReactDocumentMapper.toCore(reactDocument))
    expect(normalizeWire(restored.wires[0]).color).toBe('#2563eb')
  })
})
