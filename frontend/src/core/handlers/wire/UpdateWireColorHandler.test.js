import { describe, expect, it } from 'vitest'
import { UpdateWireColorHandler } from './UpdateWireColorHandler.js'

const document = {
  wires: [
    { id: 'w1', pinA: { componentId: 'a', pinId: '1' }, pinB: { componentId: 'b', pinId: '2' }, waypoints: [{ x: 3, y: 4 }] },
    { id: 'w2', pinA: { componentId: 'c' }, pinB: { componentId: 'd' } },
  ],
}

describe('WIRE-009 — physical wire color command invariants', () => {
  const handler = new UpdateWireColorHandler({})
  it('updates only selected wire insulation, keeping topology and waypoints', () => {
    const result = handler._applyMutation({ payload: { wireId: 'w1', color: 'blue' } }, document)
    expect(result.document.wires[0]).toEqual({ ...document.wires[0], color: '#2563eb' })
    expect(result.document.wires[1]).toBe(document.wires[1])
    expect(document.wires[0]).not.toHaveProperty('color')
    expect(result.change).toBeDefined()
  })
  it('undo restores absent color and redo reapplies selected color', () => {
    const command = { payload: { wireId: 'w1', color: 'red' } }
    const first = handler._applyMutation(command, document)
    const undone = handler._applyInverse(command, first.document, first)
    expect(undone.document.wires[0]).toEqual(document.wires[0])
    const redone = handler._applyRedo(command, undone.document, first)
    expect(redone.document.wires[0].color).toBe('#dc2626')
  })
  it('supports removing a physical override', () => {
    const colored = { ...document, wires: [{ ...document.wires[0], color: '#2563eb' }, document.wires[1]] }
    const result = handler._applyMutation({ payload: { wireId: 'w1', color: null } }, colored)
    expect(result.document.wires[0]).not.toHaveProperty('color')
  })
  it('rejects unsupported colors and missing wires without mutation', () => {
    expect(() => handler._applyMutation({ payload: { wireId: 'w1', color: 'url(#unsafe)' } }, document)).toThrow()
    expect(() => handler._applyMutation({ payload: { wireId: 'missing', color: 'red' } }, document)).toThrow()
    expect(document.wires[0]).not.toHaveProperty('color')
  })
})
