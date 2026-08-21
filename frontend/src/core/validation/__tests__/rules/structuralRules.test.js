import { describe, it, expect } from 'vitest'
import { ComponentTypeRule } from '../../rules/structural/ComponentTypeRule.js'
import { ComponentPinsRule } from '../../rules/structural/ComponentPinsRule.js'
import { WirePinsExistRule } from '../../rules/structural/WirePinsExistRule.js'
import { SelfLoopRule } from '../../rules/structural/SelfLoopRule.js'
import { ReferenceCoherenceRule } from '../../rules/structural/ReferenceCoherenceRule.js'
import { WireWaypointsStructureRule } from '../../rules/structural/WireWaypointsStructureRule.js'

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

describe('STR-006 WireWaypointsStructureRule (MB-VIS-005)', () => {
  it('ne signale rien en l\'absence de commande (Wire existant sans waypoints, rétrocompatibilité)', () => {
    const document = { components: [], wires: [wire('W1', 'L1', 'anode', 'R1', 'A')] }
    expect(WireWaypointsStructureRule.validate(document, null)).toBeNull()
  })

  it('ne signale rien pour une commande étrangère (ADD_COMPONENT, ADD_WIRE...)', () => {
    const document = { components: [], wires: [] }
    const command = { type: 'ADD_WIRE', payload: { fromUid: 'L1', fromPin: 'anode', toUid: 'R1', toPin: 'A' } }
    expect(WireWaypointsStructureRule.validate(document, command)).toBeNull()
  })

  it('ne signale rien pour une mutation UPDATE_WIRE_WAYPOINTS valide (tableau vide)', () => {
    const document = { components: [], wires: [] }
    const command = { type: 'UPDATE_WIRE_WAYPOINTS', payload: { wireId: 'W1', waypoints: [] } }
    expect(WireWaypointsStructureRule.validate(document, command)).toBeNull()
    expect(WireWaypointsStructureRule.level).toBe('ERROR')
  })

  it('ne signale rien pour une mutation UPDATE_WIRE_WAYPOINTS valide (plusieurs points finis)', () => {
    const document = { components: [], wires: [] }
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 10, y: 20 }, { x: -5, y: 0 }] },
    }
    expect(WireWaypointsStructureRule.validate(document, command)).toBeNull()
  })

  it('signale ERROR si waypoints n\'est pas un tableau', () => {
    const document = { components: [], wires: [] }
    const command = { type: 'UPDATE_WIRE_WAYPOINTS', payload: { wireId: 'W1', waypoints: 'nope' } }
    const problem = WireWaypointsStructureRule.validate(document, command)
    expect(problem).not.toBeNull()
    expect(problem.context.wireId).toBe('W1')
  })

  it('signale ERROR pour des coordonnées non numériques', () => {
    const document = { components: [], wires: [] }
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 'a', y: 1 }] },
    }
    const problem = WireWaypointsStructureRule.validate(document, command)
    expect(problem).not.toBeNull()
    expect(problem.context.invalidIndexes).toEqual([0])
  })

  it('signale ERROR pour NaN', () => {
    const document = { components: [], wires: [] }
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: NaN, y: 1 }] },
    }
    expect(WireWaypointsStructureRule.validate(document, command)).not.toBeNull()
  })

  it('signale ERROR pour Infinity', () => {
    const document = { components: [], wires: [] }
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 1, y: Infinity }] },
    }
    expect(WireWaypointsStructureRule.validate(document, command)).not.toBeNull()
  })

  it('signale ERROR pour une structure de waypoint malformée', () => {
    const document = { components: [], wires: [] }
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [null, 'x', 42] },
    }
    const problem = WireWaypointsStructureRule.validate(document, command)
    expect(problem).not.toBeNull()
    expect(problem.context.invalidIndexes).toEqual([0, 1, 2])
  })
})
