import { describe, it, expect } from 'vitest'
import { ComponentTypeRule } from '../../rules/structural/ComponentTypeRule.js'
import { ComponentPinsRule } from '../../rules/structural/ComponentPinsRule.js'
import { WirePinsExistRule } from '../../rules/structural/WirePinsExistRule.js'
import { SelfLoopRule } from '../../rules/structural/SelfLoopRule.js'
import { ReferenceCoherenceRule } from '../../rules/structural/ReferenceCoherenceRule.js'

const component = (id, type, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, parameters: {}, ...extra })
const wire = (id, fromId, fromPin, toId, toPin) => ({
  id,
  pinA: { componentId: fromId, pinId: fromPin },
  pinB: { componentId: toId, pinId: toPin },
})

describe('STR-001 ComponentTypeRule', () => {
  it('ne signale rien pour un type canonique connu', () => {
    const document = { components: [component('R1', 'RESISTOR')], wires: [] }
    expect(ComponentTypeRule.validate(document, null)).toBeNull()
  })

  it('signale ERROR pour un type inconnu dans le Document existant', () => {
    const document = { components: [component('X1', 'NOT_A_TYPE')], wires: [] }
    const problem = ComponentTypeRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(ComponentTypeRule.level).toBe('ERROR')
    expect(problem.context.componentIds).toContain('X1')
  })

  it('valide aussi le type proposé par une commande ADD_COMPONENT en attente', () => {
    const document = { components: [], wires: [] }
    const command = { type: 'ADD_COMPONENT', payload: { componentType: 'NOT_A_TYPE' } }
    const problem = ComponentTypeRule.validate(document, command)
    expect(problem).not.toBeNull()
  })

  it("n'échoue pas sur une commande ADD_COMPONENT valide", () => {
    const document = { components: [], wires: [] }
    const command = { type: 'ADD_COMPONENT', payload: { componentType: 'LED' } }
    expect(ComponentTypeRule.validate(document, command)).toBeNull()
  })
})

describe('STR-002 ComponentPinsRule', () => {
  it('ne signale rien pour les types canoniques réels (tous possèdent des pins)', () => {
    const document = { components: [component('R1', 'RESISTOR'), component('L1', 'LED')], wires: [] }
    expect(ComponentPinsRule.validate(document, null)).toBeNull()
    expect(ComponentPinsRule.level).toBe('ERROR')
  })

  it('ignore les types déjà invalides (couverts par STR-001)', () => {
    const document = { components: [component('X1', 'NOT_A_TYPE')], wires: [] }
    expect(ComponentPinsRule.validate(document, null)).toBeNull()
  })
})

describe('STR-003 WirePinsExistRule', () => {
  it('ne signale rien pour un wire valide entre pins existants', () => {
    const document = {
      components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'L1', 'anode', 'R1', 'A')],
    }
    expect(WirePinsExistRule.validate(document, null)).toBeNull()
  })

  it('signale ERROR si un pin référencé n\'existe pas pour le composant', () => {
    const document = {
      components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'L1', 'pin_inexistant', 'R1', 'A')],
    }
    const problem = WirePinsExistRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(WirePinsExistRule.level).toBe('ERROR')
  })

  it('signale ERROR si un wire référence un composant inexistant', () => {
    const document = {
      components: [component('L1', 'LED')],
      wires: [wire('W1', 'L1', 'anode', 'GHOST', 'A')],
    }
    expect(WirePinsExistRule.validate(document, null)).not.toBeNull()
  })
})

describe('STR-004 SelfLoopRule', () => {
  it('ne signale rien en l\'absence de boucle', () => {
    const document = {
      components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'L1', 'anode', 'R1', 'A')],
    }
    expect(SelfLoopRule.validate(document)).toBeNull()
  })

  it('signale WARNING pour un wire bouclant sur le même composant/pin', () => {
    const document = { components: [component('L1', 'LED')], wires: [wire('W1', 'L1', 'anode', 'L1', 'anode')] }
    const problem = SelfLoopRule.validate(document)
    expect(problem).not.toBeNull()
    expect(SelfLoopRule.level).toBe('WARNING')
  })
})

describe('STR-005 ReferenceCoherenceRule', () => {
  it('ne signale rien si tous les componentId des wires existent', () => {
    const document = {
      components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'L1', 'anode', 'R1', 'A')],
    }
    expect(ReferenceCoherenceRule.validate(document, null)).toBeNull()
  })

  it('signale ERROR pour un componentId orphelin dans un wire', () => {
    const document = { components: [component('L1', 'LED')], wires: [wire('W1', 'L1', 'anode', 'GHOST', 'A')] }
    const problem = ReferenceCoherenceRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(ReferenceCoherenceRule.level).toBe('ERROR')
    expect(problem.context.dangling[0].componentId).toBe('GHOST')
  })
})
