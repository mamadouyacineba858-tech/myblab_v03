/**
 * breadboardContactTopology.test.js — FT-B-001-S3 (§11).
 *
 * RÈGLE ÉLECTRIQUE CRITIQUE : quand plusieurs contacts physiques d'une MÊME
 * pin canonique s'enfichent dans des groupes de breadboard DISTINCTS, ces
 * groupes deviennent électriquement continus à travers cette pin — et
 * l'endpoint électrique émis reste STRICTEMENT canonique (componentId + pinId),
 * jamais un identifiant de contact.
 *
 * Prouve :
 *  - TEST S3-I : union multi-groupes par pin canonique (BUTTON.pin1) ;
 *  - TEST S3-J : les DEUX côtés du BUTTON restent des nœuds distincts — pin1 et
 *    pin2 ne sont JAMAIS unis par cette règle ;
 *  - TEST S3-K : aucun `contactId` dans le contrat solveur (arêtes virtuelles).
 *
 * Fixtures dérivées d'une exécution réelle de computeBreadboardPlacement() /
 * resolveComponentContactHoles() (probe S3, breadboard à l'origine) :
 *   BUTTON @ {x:0,y:48}  -> pin1: 1a=col1/row9 (strip col1 bottom),
 *                                 1b=col1/row4 (strip col1 top)
 *                          -> pin2: 2a=col4/row9 (strip col4 bottom),
 *                                 2b=col4/row4 (strip col4 top)
 *   RESISTOR @ {x:12,y:34} -> A = col1/row4  (strip col1 TOP)
 *   RESISTOR @ {x:12,y:94} -> A = col1/row9  (strip col1 BOTTOM)
 */
import { describe, it, expect } from 'vitest'
import { deriveBreadboardVirtualWires } from '../breadboardConnectivity.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

const button = { id: 'BTN', type: 'BUTTON', position: { x: 0, y: 48 } }
const rTop = { id: 'RT', type: 'RESISTOR', position: { x: 12, y: 34 } } // pin A -> strip col1 TOP
const rBot = { id: 'RB', type: 'RESISTOR', position: { x: 12, y: 94 } } // pin A -> strip col1 BOTTOM

describe('FT-B-001-S3 — TEST S3-I : union multi-groupes par pin canonique', () => {
  it('sans le BUTTON, les deux groupes de strip (col1 top / col1 bottom) restent électriquement SÉPARÉS', () => {
    const vw = deriveBreadboardVirtualWires({ breadboard, components: [rTop, rBot], wires: [] })
    // rTop.A (col1 top) et rBot.A (col1 bottom) ne partagent aucun groupe :
    // la rainure centrale les sépare -> aucune arête virtuelle.
    expect(vw).toEqual([])
  })

  it('avec le BUTTON, pin1 unit strip:col1:top et strip:col1:bottom -> rTop.A et rBot.A deviennent continus À TRAVERS BUTTON.pin1', () => {
    const vw = deriveBreadboardVirtualWires({ breadboard, components: [button, rTop, rBot], wires: [] })
    // Les deux résistances sont désormais reliées à BUTTON.pin1 (star topology
    // du groupe unifié) — donc électriquement entre elles via le solveur.
    expect(vw).toContainEqual({
      pinA: { componentId: 'BTN', pinId: 'pin1' },
      pinB: { componentId: 'RT', pinId: 'A' },
    })
    expect(vw).toContainEqual({
      pinA: { componentId: 'BTN', pinId: 'pin1' },
      pinB: { componentId: 'RB', pinId: 'A' },
    })
  })

  it('l\'union est causée par la pin canonique, PAS par un contact : les endpoints émis n\'exposent que componentId + pinId', () => {
    const vw = deriveBreadboardVirtualWires({ breadboard, components: [button, rTop, rBot], wires: [] })
    for (const wire of vw) {
      expect(Object.keys(wire.pinA).sort()).toEqual(['componentId', 'pinId'])
      expect(Object.keys(wire.pinB).sort()).toEqual(['componentId', 'pinId'])
      expect(wire.pinA).not.toHaveProperty('contactId')
      expect(wire.pinB).not.toHaveProperty('contactId')
    }
  })
})

describe('FT-B-001-S3 — TEST S3-J : pin1 et pin2 restent des nœuds DISTINCTS', () => {
  it('aucune arête virtuelle ne relie BUTTON.pin1 à BUTTON.pin2 (pas de fermeture d\'interrupteur câblée)', () => {
    const rP2top = { id: 'RP2T', type: 'RESISTOR', position: { x: 48, y: 34 } } // pin A -> strip col4 TOP
    const rP2bot = { id: 'RP2B', type: 'RESISTOR', position: { x: 48, y: 94 } } // pin A -> strip col4 BOTTOM
    const vw = deriveBreadboardVirtualWires({
      breadboard,
      components: [button, rTop, rBot, rP2top, rP2bot],
      wires: [],
    })
    const bridgesPin1Pin2 = vw.some(
      (w) =>
        (w.pinA.componentId === 'BTN' && w.pinB.componentId === 'BTN') &&
        ((w.pinA.pinId === 'pin1' && w.pinB.pinId === 'pin2') ||
          (w.pinA.pinId === 'pin2' && w.pinB.pinId === 'pin1'))
    )
    expect(bridgesPin1Pin2).toBe(false)
  })

  it('pin2 unit ses PROPRES groupes (col4 top / col4 bottom) sans jamais toucher les groupes de pin1', () => {
    const rP2top = { id: 'RP2T', type: 'RESISTOR', position: { x: 48, y: 34 } } // strip col4 TOP
    const rP2bot = { id: 'RP2B', type: 'RESISTOR', position: { x: 48, y: 94 } } // strip col4 BOTTOM
    const vw = deriveBreadboardVirtualWires({
      breadboard,
      components: [button, rP2top, rP2bot],
      wires: [],
    })
    // pin2 relie RP2T.A et RP2B.A ; aucune de ces arêtes ne mentionne pin1 ni
    // les résistances côté pin1.
    expect(vw).toContainEqual({ pinA: { componentId: 'BTN', pinId: 'pin2' }, pinB: { componentId: 'RP2T', pinId: 'A' } })
    expect(vw).toContainEqual({ pinA: { componentId: 'BTN', pinId: 'pin2' }, pinB: { componentId: 'RP2B', pinId: 'A' } })
    expect(vw.every((w) => w.pinA.pinId !== 'pin1' && w.pinB.pinId !== 'pin1')).toBe(true)
  })
})

describe('FT-B-001-S3 — TEST S3-K : aucun contactId dans le contrat solveur', () => {
  it('toute arête virtuelle émise n\'a que { pinA:{componentId,pinId}, pinB:{componentId,pinId} }', () => {
    const rP2top = { id: 'RP2T', type: 'RESISTOR', position: { x: 48, y: 34 } }
    const rP2bot = { id: 'RP2B', type: 'RESISTOR', position: { x: 48, y: 94 } }
    const vw = deriveBreadboardVirtualWires({
      breadboard,
      components: [button, rTop, rBot, rP2top, rP2bot],
      wires: [],
    })
    expect(vw.length).toBeGreaterThan(0)
    for (const wire of vw) {
      expect(Object.keys(wire).sort()).toEqual(['pinA', 'pinB'])
      expect(Object.keys(wire.pinA).sort()).toEqual(['componentId', 'pinId'])
      expect(Object.keys(wire.pinB).sort()).toEqual(['componentId', 'pinId'])
    }
  })

  it('un BUTTON mono-inséré (aucun co-occupant) n\'émet aucune arête', () => {
    const vw = deriveBreadboardVirtualWires({ breadboard, components: [button], wires: [] })
    expect(vw).toEqual([])
  })
})

describe('FT-B-001-S3 — legacy : composant mono-contact inchangé', () => {
  it('deux RESISTOR partageant une colonne de strip restent connectés comme avant S3', () => {
    const r1 = { id: 'R1', type: 'RESISTOR', position: { x: 60, y: 22 } }
    const r2 = { id: 'R2', type: 'RESISTOR', position: { x: 60, y: 22 } }
    const vw = deriveBreadboardVirtualWires({ breadboard, components: [r1, r2], wires: [] })
    expect(vw).toEqual([
      { pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'R2', pinId: 'A' } },
      { pinA: { componentId: 'R1', pinId: 'B' }, pinB: { componentId: 'R2', pinId: 'B' } },
    ])
  })
})
