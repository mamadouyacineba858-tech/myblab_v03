import { describe, it, expect } from 'vitest'
import { FloatingInputPinRule } from '../../rules/pedagogical/FloatingInputPinRule.js'

const component = (id, type) => ({ id, type, position: { x: 0, y: 0 }, parameters: {} })
const wire = (id, fromId, fromPin, toId, toPin) => ({
  id,
  pinA: { componentId: fromId, pinId: fromPin },
  pinB: { componentId: toId, pinId: toPin },
})

describe('PED-001 FloatingInputPinRule', () => {
  it('signale WARNING pour un pin input non connecté', () => {
    // LED.anode et LED.cathode sont tous deux role "input", aucun wire.
    const document = { components: [component('L1', 'LED')], wires: [] }
    const problem = FloatingInputPinRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(FloatingInputPinRule.level).toBe('WARNING')
    expect(problem.context.floating.length).toBe(2)
  })

  it('ne signale rien si tous les pins input sont connectés', () => {
    const document = {
      components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'L1', 'anode', 'R1', 'A'), wire('W2', 'L1', 'cathode', 'R1', 'B')],
    }
    expect(FloatingInputPinRule.validate(document, null)).toBeNull()
  })

  it('ne considère pas un pin non-input non connecté comme flottant', () => {
    // RESISTOR.A et .B sont role "passive", pas "input" : jamais signalés.
    const document = { components: [component('R1', 'RESISTOR')], wires: [] }
    expect(FloatingInputPinRule.validate(document, null)).toBeNull()
  })

  it('ne bloque jamais (niveau WARNING, jamais ERROR)', () => {
    expect(FloatingInputPinRule.level).not.toBe('ERROR')
  })
})
