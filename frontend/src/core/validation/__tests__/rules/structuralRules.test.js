import { describe, it, expect } from 'vitest'
import { ComponentTypeRule } from '../../rules/structural/ComponentTypeRule.js'
import { ComponentPinsRule } from '../../rules/structural/ComponentPinsRule.js'
import { WirePinsExistRule } from '../../rules/structural/WirePinsExistRule.js'
import { SelfLoopRule } from '../../rules/structural/SelfLoopRule.js'
import { ReferenceCoherenceRule } from '../../rules/structural/ReferenceCoherenceRule.js'
import { WireWaypointsStructureRule } from '../../rules/structural/WireWaypointsStructureRule.js'
import { makeBreadboardHoleEndpoint } from '../../../../utils/breadboardWireEndpoint.js'

const component = (id, type, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, parameters: {}, ...extra })
const wire = (id, fromId, fromPin, toId, toPin) => ({
  id,
  pinA: { componentId: fromId, pinId: fromPin },
  pinB: { componentId: toId, pinId: toPin },
})

// L1-WIRE-001 : fixtures multi-breadboard partagées par STR-003/STR-005.
// col5/row3 est une position déjà validée réelle (STANDARD_V1) par
// multiBreadboardBridgeSimulation.integration.test.js (FT-C-BREAD-MULTI-001-E).
const BOARD_A = { id: 'board-a', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
const BOARD_B = { id: 'board-b', position: { x: 480, y: 0 }, layout: 'STANDARD_V1' }
const holeWireEndpoint = (id, hole, componentId, pinId) => ({
  id,
  pinA: { componentId: hole.uid, pinId: hole.pinId },
  pinB: { componentId, pinId },
})
const holeToHoleWire = (id, holeLeft, holeRight) => ({
  id,
  pinA: { componentId: holeLeft.uid, pinId: holeLeft.pinId },
  pinB: { componentId: holeRight.uid, pinId: holeRight.pinId },
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

  // L1-WIRE-001 (Gate W2) : résolution canonique multi-breadboard —
  // breadboards[] est l'oracle, jamais document.breadboard (singleton).
  describe('L1-WIRE-001 — Gate W2 : endpoints trou multi-breadboard (breadboards[])', () => {
    const holeA = makeBreadboardHoleEndpoint(BOARD_A.id, 5, 3)
    const holeB = makeBreadboardHoleEndpoint(BOARD_B.id, 5, 3)

    it('W2.1 component↔component valide → PASS', () => {
      const document = {
        components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [wire('W1', 'L1', 'anode', 'R1', 'A')],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.2 component↔hole board A → PASS', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', holeA, 'R1', 'A')],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.3 component↔hole board B (n\'est PAS breadboards[0]) → PASS', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', holeB, 'R1', 'A')],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.4 hole board A↔component → PASS (ordre pinA/pinB inversé)', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [{ id: 'W1', pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: holeA.uid, pinId: holeA.pinId } }],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.5 hole A↔hole A (même carte) → PASS', () => {
      const holeA2 = makeBreadboardHoleEndpoint(BOARD_A.id, 6, 3)
      const document = {
        components: [],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeToHoleWire('W1', holeA, holeA2)],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.6 hole A↔hole B (inter-cartes) → PASS', () => {
      const document = {
        components: [],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeToHoleWire('W1', holeA, holeB)],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })

    it('W2.7 endpoint vers un breadboard inconnu → ERROR (breadboard_not_found)', () => {
      const ghostHole = makeBreadboardHoleEndpoint('no-such-board', 5, 3)
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', ghostHole, 'R1', 'A')],
      }
      const problem = WirePinsExistRule.validate(document, null)
      expect(problem).not.toBeNull()
      expect(problem.context.invalidEndpoints[0].reason).toBe('breadboard_not_found')
    })

    it('W2.8 endpoint vers un trou inexistant (hors géométrie réelle) → ERROR (breadboard_hole_not_found)', () => {
      const outOfBounds = makeBreadboardHoleEndpoint(BOARD_A.id, 999, 999)
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', outOfBounds, 'R1', 'A')],
      }
      const problem = WirePinsExistRule.validate(document, null)
      expect(problem).not.toBeNull()
      expect(problem.context.invalidEndpoints[0].reason).toBe('breadboard_hole_not_found')
    })

    it('W2.9 endpoint trou malformé → ERROR appropriée (traité comme composant introuvable)', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [{ id: 'W1', pinA: { componentId: '__breadboard_hole__:malformed', pinId: '__BREADBOARD_HOLE__' }, pinB: { componentId: 'R1', pinId: 'A' } }],
      }
      const problem = WirePinsExistRule.validate(document, null)
      expect(problem).not.toBeNull()
      expect(problem.context.invalidEndpoints[0].reason).toBe('component_not_found')
    })

    it('legacy : un document singleton {breadboard} continue de résoudre son unique trou (frontière de normalisation)', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboard: BOARD_A,
        wires: [holeWireEndpoint('W1', holeA, 'R1', 'A')],
      }
      expect(WirePinsExistRule.validate(document, null)).toBeNull()
    })
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

  // L1-WIRE-001 (Gate W3) : cohérence de référence multi-breadboard —
  // breadboards[] est l'oracle, jamais document.breadboard (singleton).
  describe('L1-WIRE-001 — Gate W3 : cohérence multi-breadboard (breadboards[])', () => {
    const holeA = makeBreadboardHoleEndpoint(BOARD_A.id, 5, 3)
    const holeB = makeBreadboardHoleEndpoint(BOARD_B.id, 5, 3)

    it('W3.1 endpoint composant réel → PASS', () => {
      const document = {
        components: [component('L1', 'LED'), component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [wire('W1', 'L1', 'anode', 'R1', 'A')],
      }
      expect(ReferenceCoherenceRule.validate(document, null)).toBeNull()
    })

    it('W3.2 trou board A réel → PASS (cohérent, pas de composant fictif requis)', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', holeA, 'R1', 'A')],
      }
      expect(ReferenceCoherenceRule.validate(document, null)).toBeNull()
    })

    it('W3.3 trou board B réel (n\'est PAS breadboards[0]) → PASS', () => {
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', holeB, 'R1', 'A')],
      }
      expect(ReferenceCoherenceRule.validate(document, null)).toBeNull()
    })

    it('W3.4 trou inter-board (A↔B) valide → pas de dangling', () => {
      const document = {
        components: [],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeToHoleWire('W1', holeA, holeB)],
      }
      expect(ReferenceCoherenceRule.validate(document, null)).toBeNull()
    })

    it('W3.5 board inexistant → incohérent (dangling, sauf composant réel du même id)', () => {
      const ghostHole = makeBreadboardHoleEndpoint('no-such-board', 5, 3)
      const document = {
        components: [component('R1', 'RESISTOR')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [holeWireEndpoint('W1', ghostHole, 'R1', 'A')],
      }
      const problem = ReferenceCoherenceRule.validate(document, null)
      expect(problem).not.toBeNull()
      expect(problem.context.dangling[0].componentId).toBe(ghostHole.uid)
    })

    it('W3.6 composant inexistant (comportement historique) → ERROR conservée', () => {
      const document = {
        components: [component('L1', 'LED')],
        breadboards: [BOARD_A, BOARD_B],
        wires: [wire('W1', 'L1', 'anode', 'GHOST', 'A')],
      }
      const problem = ReferenceCoherenceRule.validate(document, null)
      expect(problem).not.toBeNull()
      expect(problem.context.dangling[0].componentId).toBe('GHOST')
    })
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
