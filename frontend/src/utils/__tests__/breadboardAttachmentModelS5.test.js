/**
 * breadboardAttachmentModelS5.test.js — FT-B-001-S5
 * "Breadboard Attachment Model Reconciliation".
 *
 * Preuves déterministes de la classification finale d'attachement breadboard
 * et de la migration des scénarios historiques (POWER/ARDUINO câblés au
 * breadboard PAR FIL au lieu d'être enfichés) :
 *
 *  - NPN_TRANSISTOR : insertion directe des 3 contacts probe-validés B/C/E,
 *    occupation, collision, ABSENCE d'union électrique automatique entre
 *    B/C/E ;
 *  - POWER / ARDUINO / DC_MOTOR / SERVO : insertion directe INCOMPATIBLE,
 *    aucune occupation / collision / connectivité par le CORPS ;
 *  - POWER.5V --wire--> trou de rail -> continuité électrique (contrat
 *    MB-BREADBOARD-005/007 migré) ;
 *  - ARDUINO.5V --wire--> trou -> connectivité (contrat MB-BREADBOARD-008
 *    migré) ;
 *  - contact.id n'entre JAMAIS dans l'identité électrique (arêtes virtuelles
 *    canoniques componentId + pinId).
 */
import { describe, it, expect } from 'vitest'
import { computeBreadboardPlacement } from '../breadboardPlacementAdapter.js'
import { deriveBreadboardVirtualWires } from '../breadboardConnectivity.js'
import { resolveComponentContactHoles } from '../breadboardGeometry.js'
import { makeBreadboardHoleEndpoint } from '../breadboardWireEndpoint.js'
import { resolveSolidaryComponentIds } from '../../core/handlers/breadboard/breadboardSolidarity.js'
import { BreadboardHoleCollisionRule } from '../../core/validation/rules/structural/BreadboardHoleCollisionRule.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

const bb = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

// ---------------------------------------------------------------------------
// NPN_TRANSISTOR — insertion directe (AC-S5-13, AC-S5-14, §14)
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — NPN_TRANSISTOR : insertion breadboard directe', () => {
  // Origine probe S5 : B/C/E -> strip top, 3 colonnes consécutives.
  const NPN_POS = { x: 5, y: 3 }

  it('computeBreadboardPlacement : valid, 3 trous consécutifs distincts, contactIds B/C/E', () => {
    const r = computeBreadboardPlacement(bb, 'NPN_TRANSISTOR', NPN_POS, [])
    expect(r.compatible).toBe(true)
    expect(r.valid).toBe(true)
    expect(r.holes).toHaveLength(3)
    expect(new Set(r.holes.map((h) => h.contactId))).toEqual(new Set(['B', 'C', 'E']))
    expect(new Set(r.holes.map((h) => h.pinId))).toEqual(new Set(['collector', 'base', 'emitter']))
    const cols = r.holes.map((h) => h.column).sort((a, z) => a - z)
    expect(cols[1] - cols[0]).toBe(1)
    expect(cols[2] - cols[1]).toBe(1)
  })

  it('occupation : un NPN enfiché occupe 3 trous ; identités canoniques restent 3 pins', () => {
    const { results } = resolveComponentContactHoles(bb, getComponentDef('NPN_TRANSISTOR').pins, { x: 5, y: 0 })
    expect(results.filter((x) => x.resolved)).toHaveLength(3)
    expect(new Set(results.map((x) => x.pinId))).toEqual(new Set(['collector', 'base', 'emitter']))
  })

  it('AUCUNE union électrique automatique entre B/C/E : NPN seul -> aucune arête virtuelle', () => {
    const npn = { id: 'Q1', type: 'NPN_TRANSISTOR', position: { x: 5, y: 0 } }
    expect(deriveBreadboardVirtualWires({ breadboard: bb, components: [npn], wires: [] })).toEqual([])
  })

  it('collision : un NPN + un RESISTOR dont une pin tombe sur le trou de la base -> ERROR STR-007', () => {
    // NPN @ {x:5,y:0} : base (dx 31.5) -> col3/row5 (strip top). RESISTOR dont
    // pin A tombe exactement sur col3/row5 : A abs = (36, 60) -> x=36, y=46.
    const doc = {
      breadboard: bb,
      components: [
        { id: 'Q1', type: 'NPN_TRANSISTOR', position: { x: 5, y: 0 } },
        { id: 'R1', type: 'RESISTOR', position: { x: 36, y: 46 } },
      ],
      wires: [],
    }
    const problem = BreadboardHoleCollisionRule.validate(doc, null)
    expect(problem).not.toBeNull()
    expect(problem.id).toBe('STR-007')
  })

  it('solidarité : un NPN enfiché est solidaire du breadboard (au moins un contact résolu)', () => {
    const solidary = resolveSolidaryComponentIds(bb, [{ id: 'Q1', type: 'NPN_TRANSISTOR', position: { x: 5, y: 0 } }])
    expect(solidary).toEqual(new Set(['Q1']))
  })
})

// ---------------------------------------------------------------------------
// POWER / ARDUINO / DC_MOTOR / SERVO — insertion directe INCOMPATIBLE
// (AC-S5-08..11, AC-S5-19)
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — POWER / ARDUINO / DC_MOTOR / SERVO : insertion directe incompatible', () => {
  for (const type of ['POWER', 'ARDUINO', 'DC_MOTOR', 'SERVO']) {
    it(`${type} : computeBreadboardPlacement -> compatible:false, valid:false, holes:[] (jamais valid:true fantôme)`, () => {
      for (const cand of [{ x: 60, y: 22 }, { x: 2, y: 155 }, { x: 5000, y: 5000 }]) {
        const r = computeBreadboardPlacement(bb, type, cand, [])
        expect(r.compatible).toBe(false)
        expect(r.valid).toBe(false)
        expect(r.holes).toEqual([])
      }
    })

    it(`${type} : posé sur l'empreinte du breadboard -> AUCUNE occupation de trou, aucune arête virtuelle, non solidaire`, () => {
      const comp = { id: 'X', type, position: { x: 2, y: 20 } }
      expect(resolveComponentContactHoles(bb, getComponentDef(type).pins, comp.position).results).toEqual([])
      expect(deriveBreadboardVirtualWires({ breadboard: bb, components: [comp], wires: [] })).toEqual([])
      expect(resolveSolidaryComponentIds(bb, [comp])).toEqual(new Set())
    })

    it(`${type} : deux exemplaires superposés sur le même endroit -> AUCUNE collision de trou (pas d'occupation par le corps)`, () => {
      const doc = {
        breadboard: bb,
        components: [
          { id: 'X1', type, position: { x: 2, y: 20 } },
          { id: 'X2', type, position: { x: 2, y: 20 } },
        ],
        wires: [],
      }
      expect(BreadboardHoleCollisionRule.validate(doc, null)).toBeNull()
    })
  }
})

// ---------------------------------------------------------------------------
// POWER / ARDUINO — reliés au breadboard PAR FIL (AC-S5-15, AC-S5-16)
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — POWER / ARDUINO reliés au breadboard PAR FIL', () => {
  const RESISTOR_RAIL = { id: 'r1', type: 'RESISTOR', position: { x: 288, y: 178 } } // A -> col24/row16 (rail bas +)

  it('POWER.5V --wire--> trou rail (col6) + RESISTOR.A (col24) même rangée -> arête virtuelle canonique', () => {
    const power = { id: 'p1', type: 'POWER', position: { x: -500, y: -500 } }
    const hole = makeBreadboardHoleEndpoint('bb1', 6, 16)
    const vw = deriveBreadboardVirtualWires({
      breadboard: bb,
      components: [power, RESISTOR_RAIL],
      wires: [{ id: 'w', pinA: { componentId: 'p1', pinId: '5V' }, pinB: { componentId: hole.uid, pinId: hole.pinId } }],
    })
    expect(vw).toContainEqual({ pinA: { componentId: 'r1', pinId: 'A' }, pinB: { componentId: 'p1', pinId: '5V' } })
    // identité électrique canonique uniquement — jamais de contactId
    for (const w of vw) {
      expect(Object.keys(w.pinA).sort()).toEqual(['componentId', 'pinId'])
      expect(Object.keys(w.pinB).sort()).toEqual(['componentId', 'pinId'])
    }
  })

  it('ARDUINO.5V --wire--> trou (strip col5) + RESISTOR.A même colonne -> arête virtuelle canonique', () => {
    const arduino = { id: 'a1', type: 'ARDUINO', position: { x: -500, y: -500 } }
    const res = { id: 'r2', type: 'RESISTOR', position: { x: 60, y: 22 } } // A -> col5/row3 (strip top)
    const hole = makeBreadboardHoleEndpoint('bb1', 5, 3)
    const vw = deriveBreadboardVirtualWires({
      breadboard: bb,
      components: [arduino, res],
      wires: [{ id: 'w', pinA: { componentId: 'a1', pinId: '5V' }, pinB: { componentId: hole.uid, pinId: hole.pinId } }],
    })
    expect(vw).toContainEqual({ pinA: { componentId: 'r2', pinId: 'A' }, pinB: { componentId: 'a1', pinId: '5V' } })
  })
})
