/**
 * resolveComponentPinHoles.test.js — FT-B-001-S1.
 *
 * Primitive générique de classification pin -> trou. Delta ZÉRO : prouve que
 * `resolveComponentPinHoles()` reproduit exactement, pin par pin, le motif
 * `holeAt(breadboard, origin.x + pin.dx, origin.y + pin.dy)` dupliqué
 * jusqu'ici dans les 4 consommateurs breadboard, en préservant :
 *  - les résultats PARTIELS (une pin non résolue n'invalide pas les autres) ;
 *  - l'ORDRE des pins ;
 *  - le comportement exact de `holeAt()` (arrondi, tolérance ±2 inclusive,
 *    limites, rainure, groupKey).
 */
import { describe, it, expect } from 'vitest'
import {
  holeAt,
  resolveComponentPinHoles,
  BREADBOARD_PITCH,
} from '../breadboardGeometry.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

const P = BREADBOARD_PITCH // 12
const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }

// Référence "ancienne" : le motif exact tel qu'écrit dans chaque consommateur
// avant FT-B-001-S1.
function legacyClassify(bb, pins, origin) {
  return pins.map((pin) => holeAt(bb, origin.x + pin.dx, origin.y + pin.dy))
}

describe('resolveComponentPinHoles — contrat de la primitive', () => {
  it('A — toutes les pins résolues : allResolved, anyResolved, holes non nuls', () => {
    // 2 pins écartées d'un multiple exact du pas, posées sur des trous de strip.
    const pins = [
      { id: 'A', dx: 0, dy: 3 * P },
      { id: 'B', dx: 5 * P, dy: 3 * P },
    ]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results).toHaveLength(2)
    expect(out.allResolved).toBe(true)
    expect(out.anyResolved).toBe(true)
    expect(out.results.every((r) => r.resolved && r.hole)).toBe(true)
    expect(out.results.map((r) => r.pinId)).toEqual(['A', 'B'])
  })

  it('B — résolution PARTIELLE : la pin hors grille n\'invalide pas l\'autre', () => {
    const pins = [
      { id: 'onhole', dx: 0, dy: 3 * P }, // strip top col 0
      { id: 'offgrid', dx: 3, dy: 3 }, // 3px des deux axes -> hors tolérance
    ]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results[0].resolved).toBe(true)
    expect(out.results[0].hole).not.toBeNull()
    expect(out.results[1].resolved).toBe(false)
    expect(out.results[1].hole).toBeNull()
    expect(out.allResolved).toBe(false)
    expect(out.anyResolved).toBe(true)
  })

  it('C — aucune pin résolue : allResolved=false, anyResolved=false', () => {
    const pins = [
      { id: 'A', dx: 3, dy: 3 },
      { id: 'B', dx: 5, dy: 7 },
    ]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results.every((r) => !r.resolved && r.hole === null)).toBe(true)
    expect(out.allResolved).toBe(false)
    expect(out.anyResolved).toBe(false)
  })

  it('D — entrées invalides : jamais d\'exception, tout non résolu', () => {
    const pins = [{ id: 'A', dx: 0, dy: 0 }]
    expect(resolveComponentPinHoles(null, pins, { x: 0, y: 0 }).anyResolved).toBe(false)
    expect(resolveComponentPinHoles(breadboard, pins, null).anyResolved).toBe(false)
    expect(resolveComponentPinHoles(breadboard, pins, { x: NaN, y: 0 }).anyResolved).toBe(false)
    expect(resolveComponentPinHoles(breadboard, null, { x: 0, y: 0 })).toEqual({
      results: [],
      allResolved: false,
      anyResolved: false,
    })
    expect(resolveComponentPinHoles(breadboard, [], { x: 0, y: 0 })).toEqual({
      results: [],
      allResolved: false,
      anyResolved: false,
    })
  })

  it('E — ordre des pins strictement préservé', () => {
    const pins = [
      { id: 'p3', dx: 2 * P, dy: 3 * P },
      { id: 'p1', dx: 0, dy: 3 * P },
      { id: 'p2', dx: 1 * P, dy: 3 * P },
    ]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results.map((r) => r.pinId)).toEqual(['p3', 'p1', 'p2'])
  })

  it('F — frontière holeAt : résidu exactement ±2 par axe reste résolu (tolérance inclusive)', () => {
    const pins = [{ id: 'A', dx: 0, dy: 3 * P }]
    // +2 sur x et +2 sur y : Math.abs(rel - col*P) === 2 -> NON rejeté ( > 2 seulement)
    const out = resolveComponentPinHoles(breadboard, pins, { x: 2, y: 2 })
    expect(out.results[0].resolved).toBe(true)
    // parité stricte avec holeAt
    expect(out.results[0].hole).toEqual(holeAt(breadboard, 2, 3 * P + 2))
  })

  it('G — juste au-delà de ±2 : rejeté (comme holeAt)', () => {
    const pins = [{ id: 'A', dx: 0, dy: 3 * P }]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 3, y: 0 })
    expect(out.results[0].resolved).toBe(false)
    expect(holeAt(breadboard, 3, 3 * P)).toBeNull()
  })

  it('H — rangée interdite / rainure centrale : non résolue', () => {
    // rainure centrale : row 8 (8*P) col 5 -> holeAt null
    const pins = [{ id: 'A', dx: 5 * P, dy: 8 * P }]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results[0].resolved).toBe(false)
    expect(holeAt(breadboard, 5 * P, 8 * P)).toBeNull()
  })

  it('I — hors limites du breadboard : non résolue', () => {
    const pins = [{ id: 'A', dx: 999 * P, dy: 0 }]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results[0].resolved).toBe(false)
  })

  it('J — groupKey / kind / column / row identiques à holeAt', () => {
    const pins = [
      { id: 'rail', dx: 0, dy: 0 },
      { id: 'strip', dx: 5 * P, dy: 3 * P },
    ]
    const out = resolveComponentPinHoles(breadboard, pins, { x: 0, y: 0 })
    expect(out.results[0].hole).toEqual(holeAt(breadboard, 0, 0))
    expect(out.results[1].hole).toEqual(holeAt(breadboard, 5 * P, 3 * P))
    expect(out.results[0].hole.groupKey).toBe('bb1:rail:top:+')
  })

  it('breadboard à origine non nulle : parité avec holeAt', () => {
    const bb2 = { id: 'bb2', position: { x: 100, y: 200 } }
    const pins = [{ id: 'A', dx: 0, dy: 0 }, { id: 'B', dx: 5 * P, dy: 3 * P }]
    const out = resolveComponentPinHoles(bb2, pins, { x: 100, y: 200 })
    expect(out.results[0].hole).toEqual(holeAt(bb2, 100, 200))
    expect(out.results[1].hole).toEqual(holeAt(bb2, 100 + 5 * P, 200 + 3 * P))
  })
})

describe('resolveComponentPinHoles — différentiel ANCIEN vs NOUVEAU (composants réels)', () => {
  const bb = { id: 'bbD', position: { x: 24, y: 36 } }
  const types = ['RESISTOR', 'LED', 'RGB_LED', 'NPN_TRANSISTOR', 'BUTTON', 'SERVO']

  // Origines représentatives : alignée sur pin0, décalée de 1px, de 3px, très
  // loin (aucune pin), et un décalage vertical partiel.
  const origins = [
    { label: 'pin0-aligné', mk: (def) => ({ x: bb.position.x - def.pins[0].dx, y: bb.position.y - def.pins[0].dy }) },
    { label: '+1px', mk: (def) => ({ x: bb.position.x - def.pins[0].dx + 1, y: bb.position.y - def.pins[0].dy + 1 }) },
    { label: '+3px', mk: (def) => ({ x: bb.position.x - def.pins[0].dx + 3, y: bb.position.y - def.pins[0].dy + 3 }) },
    { label: 'loin', mk: () => ({ x: 5000, y: 5000 }) },
    { label: 'pin0 sur strip col10', mk: (def) => ({ x: bb.position.x + 10 * P - def.pins[0].dx, y: bb.position.y + 3 * P - def.pins[0].dy }) },
  ]

  for (const type of types) {
    for (const o of origins) {
      it(`${type} @ ${o.label} : holes / resolved / ordre / groupKey identiques`, () => {
        const def = getComponentDef(type)
        const origin = o.mk(def)

        const legacy = legacyClassify(bb, def.pins, origin)
        const next = resolveComponentPinHoles(bb, def.pins, origin)

        // même nombre, même ordre de pinId
        expect(next.results.map((r) => r.pinId)).toEqual(def.pins.map((p) => p.id))
        // trou par trou : deep-equal (null compris), donc column/row/kind/groupKey inclus
        expect(next.results.map((r) => r.hole)).toEqual(legacy)
        // resolved cohérent avec legacy
        expect(next.results.map((r) => r.resolved)).toEqual(legacy.map((h) => h != null))
        // agrégats cohérents avec la sémantique de chaque consommateur
        expect(next.allResolved).toBe(legacy.length > 0 && legacy.every((h) => h != null))
        expect(next.anyResolved).toBe(legacy.some((h) => h != null))
      })
    }
  }
})
