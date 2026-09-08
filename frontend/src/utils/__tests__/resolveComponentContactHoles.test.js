/**
 * resolveComponentContactHoles.test.js — FT-B-001-S3.
 *
 * Primitive générique de classification CONTACT PHYSIQUE -> trou. Extension
 * stricte de `resolveComponentPinHoles()` (FT-B-001-S1) : une pin canonique
 * peut exposer 1..N contacts physiques (modèle S2, `contactModel.js`).
 *
 * Prouve :
 *  - TEST S3-A : contrat de la primitive (implicite mono-contact, multi-contacts
 *    explicites, ordre stable pin puis contact, parité holeAt, résolution
 *    partielle, allResolved / anyResolved, entrées invalides, filtre
 *    breadboardInsertable) ;
 *  - TEST S3-B : modèle physique BUTTON / BUTTON_LATCHING (4 contacts
 *    enfichables résolus, 4 identités de contact, identités canoniques =
 *    pin1 / pin2 uniquement) ;
 *  - TEST S3-C : delta legacy — pour tout composant mono-contact réel,
 *    `resolveComponentContactHoles()` reproduit exactement
 *    `resolveComponentPinHoles()` au champ additif `contactId` (=== pinId) près.
 */
import { describe, it, expect } from 'vitest'
import {
  holeAt,
  resolveComponentPinHoles,
  resolveComponentContactHoles,
  BREADBOARD_PITCH,
} from '../breadboardGeometry.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

const P = BREADBOARD_PITCH // 12
const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }

// ---------------------------------------------------------------------------
// TEST S3-A — contrat de la primitive
// ---------------------------------------------------------------------------
describe('resolveComponentContactHoles — TEST S3-A (contrat)', () => {
  it('A1 — pin SANS contacts : un contact implicite en pin.dx/dy, contactId === pin.id', () => {
    const pins = [{ id: 'A', dx: 0, dy: 3 * P }, { id: 'B', dx: 5 * P, dy: 3 * P }]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results).toHaveLength(2)
    expect(out.results.map((r) => [r.pinId, r.contactId])).toEqual([['A', 'A'], ['B', 'B']])
    expect(out.allResolved).toBe(true)
    expect(out.anyResolved).toBe(true)
    // parité stricte avec holeAt()
    expect(out.results[0].hole).toEqual(holeAt(breadboard, 0, 3 * P))
    expect(out.results[1].hole).toEqual(holeAt(breadboard, 5 * P, 3 * P))
  })

  it('A2 — pin AVEC contacts explicites : une entrée par contact, ordre de déclaration préservé', () => {
    const pins = [
      { id: 'pinX', dx: 10, dy: 10, contacts: [
        { id: 'xa', dx: 0, dy: 3 * P },
        { id: 'xb', dx: 5 * P, dy: 3 * P },
      ] },
    ]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results.map((r) => [r.pinId, r.contactId])).toEqual([['pinX', 'xa'], ['pinX', 'xb']])
    expect(out.allResolved).toBe(true)
    expect(out.results[0].hole).toEqual(holeAt(breadboard, 0, 3 * P))
    expect(out.results[1].hole).toEqual(holeAt(breadboard, 5 * P, 3 * P))
  })

  it('A3 — ordre (pin, puis contact) strictement préservé sur plusieurs pins multi-contacts', () => {
    const pins = [
      { id: 'p2', dx: 0, dy: 0, contacts: [{ id: '2a', dx: 0, dy: 0 }, { id: '2b', dx: 1, dy: 1 }] },
      { id: 'p1', dx: 0, dy: 0, contacts: [{ id: '1a', dx: 2, dy: 2 }] },
    ]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results.map((r) => `${r.pinId}/${r.contactId}`)).toEqual(['p2/2a', 'p2/2b', 'p1/1a'])
  })

  it('A4 — résolution PARTIELLE : un contact hors grille n\'invalide pas les autres', () => {
    const pins = [
      { id: 'pinX', dx: 0, dy: 0, contacts: [
        { id: 'onhole', dx: 0, dy: 3 * P },
        { id: 'offgrid', dx: 3, dy: 3 },
      ] },
    ]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results[0].resolved).toBe(true)
    expect(out.results[1].resolved).toBe(false)
    expect(out.results[1].hole).toBeNull()
    expect(out.allResolved).toBe(false)
    expect(out.anyResolved).toBe(true)
  })

  it('A5 — aucun contact résolu : allResolved=false, anyResolved=false', () => {
    const pins = [{ id: 'A', dx: 3, dy: 3 }, { id: 'B', dx: 5, dy: 7 }]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.allResolved).toBe(false)
    expect(out.anyResolved).toBe(false)
  })

  it('A6 — entrées invalides : jamais d\'exception', () => {
    const pins = [{ id: 'A', dx: 0, dy: 0 }]
    expect(resolveComponentContactHoles(null, pins, { x: 0, y: 0 }).anyResolved).toBe(false)
    expect(resolveComponentContactHoles(breadboard, pins, null).anyResolved).toBe(false)
    expect(resolveComponentContactHoles(breadboard, pins, { x: NaN, y: 0 }).anyResolved).toBe(false)
    expect(resolveComponentContactHoles(breadboard, null, { x: 0, y: 0 })).toEqual({
      results: [], allResolved: false, anyResolved: false,
    })
    expect(resolveComponentContactHoles(breadboard, [], { x: 0, y: 0 })).toEqual({
      results: [], allResolved: false, anyResolved: false,
    })
  })

  it('A7 — holeAt reste l\'unique oracle : frontière ±2 inclusive, au-delà rejetée', () => {
    const pins = [{ id: 'pinX', dx: 0, dy: 0, contacts: [
      { id: 'edge', dx: 0, dy: 3 * P },
      { id: 'past', dx: 0, dy: 3 * P },
    ] }]
    // origine +2 : résidu exactement 2 -> résolu ; +3 -> rejeté
    expect(resolveComponentContactHoles(breadboard, pins, { x: 2, y: 3 * P + 2 }).results.every((r) => r.resolved)).toBe(true)
    expect(resolveComponentContactHoles(breadboard, pins, { x: 3, y: 0 }).results.every((r) => !r.resolved)).toBe(true)
  })

  it('A8 — filtre breadboardInsertable : un contact non enfichable est absent des résultats', () => {
    const pins = [{ id: 'pinX', dx: 0, dy: 0, contacts: [
      { id: 'ins', dx: 0, dy: 3 * P, breadboardInsertable: true },
      { id: 'noins', dx: 5 * P, dy: 3 * P, breadboardInsertable: false },
    ] }]
    const out = resolveComponentContactHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results.map((r) => r.contactId)).toEqual(['ins'])
    // le contact non enfichable ne compte NI pour allResolved NI pour l'occupation
    expect(out.allResolved).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TEST S3-B — modèle physique BUTTON / BUTTON_LATCHING
// ---------------------------------------------------------------------------
describe('resolveComponentContactHoles — TEST S3-B (BUTTON / BUTTON_LATCHING)', () => {
  for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
    it(`${type} : 4 contacts physiques enfichables, 2 identités canoniques (pin1 / pin2)`, () => {
      const def = getComponentDef(type)
      // origine choisie pour que les 4 pattes tombent sur des trous (probe S3)
      const out = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 48 })
      expect(out.results).toHaveLength(4)
      expect(out.results.every((r) => r.resolved)).toBe(true)
      // 4 identités de contact distinctes
      expect(new Set(out.results.map((r) => r.contactId))).toEqual(new Set(['1a', '1b', '2a', '2b']))
      // mais SEULEMENT 2 identités canoniques
      expect(new Set(out.results.map((r) => r.pinId))).toEqual(new Set(['pin1', 'pin2']))
      // cartographie contact -> pin canonique
      const pinOf = Object.fromEntries(out.results.map((r) => [r.contactId, r.pinId]))
      expect(pinOf['1a']).toBe('pin1')
      expect(pinOf['1b']).toBe('pin1')
      expect(pinOf['2a']).toBe('pin2')
      expect(pinOf['2b']).toBe('pin2')
    })
  }

  it('BUTTON : pin1 atteint 2 groupes de breadboard DISTINCTS (patte basse / patte haute)', () => {
    const def = getComponentDef('BUTTON')
    const out = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 48 })
    const groupsOfPin1 = new Set(
      out.results.filter((r) => r.pinId === 'pin1').map((r) => r.hole.groupKey)
    )
    expect(groupsOfPin1.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// TEST S3-C — delta legacy (mono-contact) vs resolveComponentPinHoles
// ---------------------------------------------------------------------------
describe('resolveComponentContactHoles — TEST S3-C (delta legacy mono-contact)', () => {
  const bb = { id: 'bbD', position: { x: 24, y: 36 } }
  const monoContactTypes = [
    'RESISTOR', 'LED', 'RGB_LED', 'NPN_TRANSISTOR', 'SERVO', 'POWER', 'CAPACITOR',
    'BUZZER', 'POTENTIOMETER', 'LDR', 'THERMISTOR', 'DIODE', 'DC_MOTOR', 'ARDUINO',
  ]
  const origins = [
    { label: 'pin0-aligné', mk: (def) => ({ x: bb.position.x - def.pins[0].dx, y: bb.position.y - def.pins[0].dy }) },
    { label: '+1px', mk: (def) => ({ x: bb.position.x - def.pins[0].dx + 1, y: bb.position.y - def.pins[0].dy + 1 }) },
    { label: '+3px', mk: (def) => ({ x: bb.position.x - def.pins[0].dx + 3, y: bb.position.y - def.pins[0].dy + 3 }) },
    { label: 'loin', mk: () => ({ x: 5000, y: 5000 }) },
    { label: 'pin0 strip col10', mk: (def) => ({ x: bb.position.x + 10 * P - def.pins[0].dx, y: bb.position.y + 3 * P - def.pins[0].dy }) },
  ]

  for (const type of monoContactTypes) {
    for (const o of origins) {
      it(`${type} @ ${o.label} : holes / resolved / ordre identiques à resolveComponentPinHoles, contactId === pinId`, () => {
        const def = getComponentDef(type)
        const origin = o.mk(def)
        const legacy = resolveComponentPinHoles(bb, def.pins, origin)
        const next = resolveComponentContactHoles(bb, def.pins, origin)

        // même cardinalité, même ordre de pinId
        expect(next.results.map((r) => r.pinId)).toEqual(legacy.results.map((r) => r.pinId))
        // contactId === pinId pour tout type mono-contact
        expect(next.results.every((r) => r.contactId === r.pinId)).toBe(true)
        // trou par trou : deep-equal (null compris) -> column/row/kind/groupKey inclus
        expect(next.results.map((r) => r.hole)).toEqual(legacy.results.map((r) => r.hole))
        expect(next.results.map((r) => r.resolved)).toEqual(legacy.results.map((r) => r.resolved))
        expect(next.allResolved).toBe(legacy.allResolved)
        expect(next.anyResolved).toBe(legacy.anyResolved)
      })
    }
  }
})
