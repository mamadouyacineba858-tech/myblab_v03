import { describe, it, expect } from 'vitest'
import { ResistancePositiveRule } from '../../rules/electrical/ResistancePositiveRule.js'
import { CapacitancePositiveRule } from '../../rules/electrical/CapacitancePositiveRule.js'
import { VoltageDefinedRule } from '../../rules/electrical/VoltageDefinedRule.js'
import { OutputToOutputRule } from '../../rules/electrical/OutputToOutputRule.js'
import { PowerSourcePresenceRule } from '../../rules/electrical/PowerSourcePresenceRule.js'
import { PowerGroundShortCircuitRule } from '../../rules/electrical/PowerGroundShortCircuitRule.js'

const component = (id, type, parameters = {}) => ({ id, type, position: { x: 0, y: 0 }, parameters })
const wire = (id, fromId, fromPin, toId, toPin) => ({
  id,
  pinA: { componentId: fromId, pinId: fromPin },
  pinB: { componentId: toId, pinId: toPin },
})

describe('ELE-001 ResistancePositiveRule', () => {
  it('accepte une résistance absente (default canonique implicite)', () => {
    const document = { components: [component('R1', 'RESISTOR')], wires: [] }
    expect(ResistancePositiveRule.validate(document, null)).toBeNull()
  })

  it('accepte une résistance explicite positive', () => {
    const document = { components: [component('R1', 'RESISTOR', { resistance: 220 })], wires: [] }
    expect(ResistancePositiveRule.validate(document, null)).toBeNull()
  })

  it('rejette (ERROR) une résistance explicite <= 0', () => {
    const document = { components: [component('R1', 'RESISTOR', { resistance: -10 })], wires: [] }
    const problem = ResistancePositiveRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(ResistancePositiveRule.level).toBe('ERROR')
  })

  it('rejette une résistance explicite non numérique', () => {
    const document = { components: [component('R1', 'RESISTOR', { resistance: 'beaucoup' })], wires: [] }
    expect(ResistancePositiveRule.validate(document, null)).not.toBeNull()
  })
})

describe('ELE-002 CapacitancePositiveRule', () => {
  it('accepte une capacité absente', () => {
    const document = { components: [component('C1', 'CAPACITOR')], wires: [] }
    expect(CapacitancePositiveRule.validate(document, null)).toBeNull()
  })

  it('rejette (ERROR) une capacité explicite <= 0', () => {
    const document = { components: [component('C1', 'CAPACITOR', { capacitance: 0 })], wires: [] }
    const problem = CapacitancePositiveRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(CapacitancePositiveRule.level).toBe('ERROR')
  })
})

describe('ELE-003 VoltageDefinedRule', () => {
  it('accepte une tension absente', () => {
    const document = { components: [component('V1', 'POWER')], wires: [] }
    expect(VoltageDefinedRule.validate(document, null)).toBeNull()
  })

  it('rejette (ERROR) une tension explicite non numérique ou <= 0', () => {
    const document = { components: [component('V1', 'POWER', { voltage: -5 })], wires: [] }
    const problem = VoltageDefinedRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(VoltageDefinedRule.level).toBe('ERROR')
  })
})

describe('ELE-005 OutputToOutputRule', () => {
  it('ne signale rien pour une connexion output -> input normale', () => {
    // DIODE.cathode = role "output" ; LED.anode = role "input"
    const document = {
      components: [component('D1', 'DIODE'), component('L1', 'LED')],
      wires: [wire('W1', 'D1', 'cathode', 'L1', 'anode')],
    }
    expect(OutputToOutputRule.validate(document, null)).toBeNull()
  })

  it('signale WARNING pour une connexion output <-> output', () => {
    // DIODE.cathode et NPN_TRANSISTOR.emitter sont tous deux role "output"
    const document = {
      components: [component('D1', 'DIODE'), component('T1', 'NPN_TRANSISTOR')],
      wires: [wire('W1', 'D1', 'cathode', 'T1', 'emitter')],
    }
    const problem = OutputToOutputRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(OutputToOutputRule.level).toBe('WARNING')
  })
})

describe('ELE-006 PowerSourcePresenceRule', () => {
  it('signale INFO si aucun POWER n\'est présent', () => {
    const document = { components: [component('L1', 'LED')], wires: [] }
    const problem = PowerSourcePresenceRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(PowerSourcePresenceRule.level).toBe('INFO')
  })

  it('ne signale rien si un POWER est présent', () => {
    const document = { components: [component('V1', 'POWER')], wires: [] }
    expect(PowerSourcePresenceRule.validate(document, null)).toBeNull()
  })
})

describe('ELE-007 PowerGroundShortCircuitRule', () => {
  it('ne signale rien pour un circuit sans court-circuit direct', () => {
    const document = {
      components: [component('V1', 'POWER'), component('R1', 'RESISTOR')],
      wires: [wire('W1', 'V1', '5V', 'R1', 'A')],
    }
    expect(PowerGroundShortCircuitRule.validate(document, null)).toBeNull()
  })

  it('signale ERROR pour un net reliant directement power et ground', () => {
    // POWER.5V (role power_out) relié directement à POWER.GND (role ground_out)
    const document = {
      components: [component('V1', 'POWER')],
      wires: [wire('W1', 'V1', '5V', 'V1', 'GND')],
    }
    const problem = PowerGroundShortCircuitRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(PowerGroundShortCircuitRule.level).toBe('ERROR')
  })

  it('détecte un court-circuit indirect à travers un net à 3 pins', () => {
    // V1.5V -- R1.A (passive) -- ... et R1.A -- V2.GND : même net, power + ground
    const document = {
      components: [component('V1', 'POWER'), component('V2', 'POWER'), component('R1', 'RESISTOR')],
      wires: [
        wire('W1', 'V1', '5V', 'R1', 'A'),
        wire('W2', 'R1', 'A', 'V2', 'GND'),
      ],
    }
    const problem = PowerGroundShortCircuitRule.validate(document, null)
    expect(problem).not.toBeNull()
  })

  /**
   * MB-BREADBOARD-007 — TEST A3 (Ticket §6) : court-circuit qui transite
   * PAR le breadboard, jamais couvert avant ce ticket (audit
   * MB-BREADBOARD-AUDIT-CONNECTIVITE §7 — le code (import
   * deriveBreadboardVirtualWires en tête de PowerGroundShortCircuitRule.js)
   * existait déjà, aucun test ne l'exerçait).
   *
   * Mécanisme réel : deriveBreadboardVirtualWires() n'unit JAMAIS deux
   * groupKey différents (un trou de rail+ et un trou de rail- restent deux
   * groupes électriques distincts par construction, cf. holeAt()) — un
   * court-circuit via breadboard ne peut donc survenir que si deux pins de
   * RÔLES OPPOSÉS (power/ground) se retrouvent, par erreur de placement,
   * sur le MÊME groupKey. Ici : V1.5V -> col6/row16 (rail bas +) et
   * V2.GND -> col15/row16 (MÊME rangée rail+, colonne différente) — la
   * jonction n'est portée par AUCUN wire explicite, uniquement par le bus
   * du rail.
   */
  it('détecte un court-circuit dont la seule jonction transite par le rail du breadboard (aucun wire explicite)', () => {
    const V1 = { id: 'V1', type: 'POWER', position: { x: 2, y: 155 } } // 5V -> col6/row16 (rail+)
    // dx GND=58,dy=25 ; pour atterrir sur col15/row16 : x+58=15*12=180 -> x=122 ; y+25=16*12=192 -> y=167.
    const V2 = { id: 'V2', type: 'POWER', position: { x: 122, y: 167 } } // GND -> col15/row16 (rail+, MÊME groupKey que V1.5V)
    const document = {
      breadboard: { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
      components: [V1, V2],
      wires: [], // aucune liaison explicite : uniquement le rail
    }
    const problem = PowerGroundShortCircuitRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(problem.level ?? PowerGroundShortCircuitRule.level).toBe('ERROR')
  })

  it('non-régression : le même document SANS breadboard ne signale aucun court-circuit (les pins ne sont plus reliées par rien)', () => {
    const V1 = { id: 'V1', type: 'POWER', position: { x: 2, y: 155 } }
    const V2 = { id: 'V2', type: 'POWER', position: { x: 122, y: 167 } }
    const document = { breadboard: null, components: [V1, V2], wires: [] }
    expect(PowerGroundShortCircuitRule.validate(document, null)).toBeNull()
  })
})
