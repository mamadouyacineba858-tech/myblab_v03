/**
 * multiBreadboardConnectivity.test.js — FT-C-BREAD-MULTI-001-B
 *
 * Connectivité électrique multi-breadboard. `deriveBreadboardVirtualWires`
 * consomme `document.breadboards[]` (canonique), namespacе chaque groupe par
 * `breadboard.id` (isolation), et n'unit deux breadboards QUE via un wire
 * explicite trou<->trou.
 *
 * Capacités B1–B22 du ticket (numéros = capacités, pas fichiers).
 *
 * Géométrie : un breadboard = 30 colonnes (x local 0..348). Board A en (0,0),
 * board B en (480,0) : zones de trous DISJOINTES. RESISTOR pin A(0,14) /
 * B(84,14) ; un RESISTOR en {x:60+ox, y:22} place pin A sur col5/row3
 * (strip haut) et pin B sur col12/row3 du breadboard local.
 */
import { describe, it, expect } from 'vitest'
import {
  deriveBreadboardVirtualWires,
  deriveBreadboardVirtualWiresBridge,
} from '../breadboardConnectivity.js'
import { makeBreadboardHoleEndpoint } from '../breadboardWireEndpoint.js'

const A = { id: 'A', position: { x: 0, y: 0 } }
const B = { id: 'B', position: { x: 480, y: 0 } }
const C = { id: 'C', position: { x: 960, y: 0 } }

const resOn = (id, board, col5 = true) => ({
  id,
  type: 'RESISTOR',
  // col5/row3 strip-top du breadboard `board` ; col5 false => col6 (groupe voisin)
  position: { x: board.position.x + (col5 ? 60 : 72), y: 22 },
})
const holeEp = (bbId, col, row) => {
  const ep = makeBreadboardHoleEndpoint(bbId, col, row)
  return { componentId: ep.uid, pinId: ep.pinId }
}
const sortWires = (ws) =>
  [...ws].map((w) => [w.pinA.componentId, w.pinA.pinId, w.pinB.componentId, w.pinB.pinId].join('|')).sort()

describe('FT-C-BREAD-MULTI-001-B — source canonique & cas dégénérés', () => {
  it('B1 — 0 breadboard => []', () => {
    expect(deriveBreadboardVirtualWires({ breadboards: [], components: [resOn('r1', A), resOn('r2', A)] })).toEqual([])
  })

  it('B21 / B25 — legacy { breadboard } normalisé => traité comme breadboards:[X]', () => {
    const legacy = { breadboard: A, components: [resOn('r1', A), resOn('r2', A)] }
    const canonical = { breadboards: [A], components: [resOn('r1', A), resOn('r2', A)] }
    expect(deriveBreadboardVirtualWires(legacy)).toEqual(deriveBreadboardVirtualWires(canonical))
  })

  it('B2 — 1 breadboard : connectivité historique inchangée (2 résistances superposées => 2 arêtes A/A et B/B)', () => {
    const wires = deriveBreadboardVirtualWires({ breadboards: [A], components: [resOn('r1', A), resOn('r2', A)] })
    expect(wires).toHaveLength(2)
    expect(sortWires(wires)).toEqual(sortWires([
      { pinA: { componentId: 'r1', pinId: 'A' }, pinB: { componentId: 'r2', pinId: 'A' } },
      { pinA: { componentId: 'r1', pinId: 'B' }, pinB: { componentId: 'r2', pinId: 'B' } },
    ]))
  })
})

describe('FT-C-BREAD-MULTI-001-B — isolation électrique A / B (B3, B4, B14, B22)', () => {
  it('B3 — deux breadboards, composants sur chacun, aucun wire : chaque breadboard connecte SES pins seulement', () => {
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B],
      components: [resOn('a1', A), resOn('a2', A), resOn('b1', B), resOn('b2', B)],
    })
    // a1/a2 partagent col5 & col12 de A -> 2 arêtes ; idem b1/b2 sur B -> 2 arêtes.
    expect(wires).toHaveLength(4)
    const keys = sortWires(wires)
    expect(keys).toContain('a1|A|a2|A')
    expect(keys).toContain('a1|B|a2|B')
    expect(keys).toContain('b1|A|b2|A')
    expect(keys).toContain('b1|B|b2|B')
    // AUCUNE arête ne relie un composant de A à un composant de B.
    for (const k of keys) {
      const [ca, , cb] = k.split('|')
      expect((ca[0] === 'a') === (cb[0] === 'a')).toBe(true)
    }
  })

  it('B4 / B14 / B22 — même groupKey LOCAL (strip col5 top) sur A et sur B => JAMAIS relié (pas de fallback breadboards[0])', () => {
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B],
      components: [resOn('onA', A), resOn('onB', B)],
    })
    // onA.A et onB.A ont tous deux le groupe local "strip:col5:top" mais sur
    // des breadboards différents -> aucune arête.
    expect(wires).toEqual([])
  })

  it('B3 (3 breadboards) — C reste indépendant de A et B', () => {
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B, C],
      components: [resOn('a1', A), resOn('a2', A), resOn('c1', C), resOn('c2', C)],
    })
    const keys = sortWires(wires)
    expect(keys).toEqual(['a1|A|a2|A', 'a1|B|a2|B', 'c1|A|c2|A', 'c1|B|c2|B'].sort())
  })
})

describe('FT-C-BREAD-MULTI-001-B — wires composant -> trou (B7, B8)', () => {
  it('B7 — pin composant -> trou de A rejoint le groupe de A', () => {
    // rA occupe A:strip:col5:top (pin A). Un LED câblé à A.hole(5,3) rejoint
    // le même groupe -> arête rA.A <-> led.anode.
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B],
      components: [resOn('rA', A), { id: 'led', type: 'LED', position: { x: -999, y: -999 } }],
      wires: [{ id: 'w', pinA: { componentId: 'led', pinId: 'anode' }, pinB: holeEp('A', 5, 3) }],
    })
    expect(sortWires(wires)).toEqual(sortWires([
      { pinA: { componentId: 'rA', pinId: 'A' }, pinB: { componentId: 'led', pinId: 'anode' } },
    ]))
  })

  it('B8 — pin composant -> trou de B rejoint le groupe de B (et pas celui de A à la même colonne)', () => {
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B],
      components: [
        resOn('rA', A),                                       // A:strip:col5:top
        resOn('rB', B),                                       // B:strip:col5:top
        { id: 'led', type: 'LED', position: { x: -999, y: -999 } },
      ],
      wires: [{ id: 'w', pinA: { componentId: 'led', pinId: 'anode' }, pinB: holeEp('B', 5, 3) }],
    })
    // led.anode rejoint B:strip:col5:top -> relié à rB.A, PAS à rA.A.
    expect(sortWires(wires)).toEqual(sortWires([
      { pinA: { componentId: 'rB', pinId: 'A' }, pinB: { componentId: 'led', pinId: 'anode' } },
    ]))
  })
})

describe('FT-C-BREAD-MULTI-001-B — wires trou -> trou (B9, B10, B11, B12, B13, B15)', () => {
  it('B9 — A.hole -> A.hole unit deux groupes de A', () => {
    // rA1 sur A:strip:col5:top (pin A) ; rA2 sur A:strip:col12:top (pin B, dx84).
    const rA1 = { id: 'rA1', type: 'RESISTOR', position: { x: 60, y: 22 } }   // A col5 (pinA), col12 (pinB)
    const rA2 = { id: 'rA2', type: 'RESISTOR', position: { x: -84 + 60 * 2, y: 22 } } // pinB dx84 -> col? keep simple below
    void rA2
    // Plus simple : un seul RESISTOR rA1 (pinA col5, pinB col12) + un wire
    // A.hole(5,3) -> A.hole(12,3) qui unit col5 et col12 de A -> rA1.A <-> rA1.B
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A],
      components: [rA1],
      wires: [{ id: 'w', pinA: holeEp('A', 5, 3), pinB: holeEp('A', 12, 3) }],
    })
    expect(sortWires(wires)).toEqual(sortWires([
      { pinA: { componentId: 'rA1', pinId: 'A' }, pinB: { componentId: 'rA1', pinId: 'B' } },
    ]))
  })

  it('B10 — B.hole -> B.hole unit deux groupes de B', () => {
    const rB1 = { id: 'rB1', type: 'RESISTOR', position: { x: 480 + 60, y: 22 } }
    const wires = deriveBreadboardVirtualWires({
      breadboards: [A, B],
      components: [rB1],
      wires: [{ id: 'w', pinA: holeEp('B', 5, 3), pinB: holeEp('B', 12, 3) }],
    })
    expect(sortWires(wires)).toEqual(sortWires([
      { pinA: { componentId: 'rB1', pinId: 'A' }, pinB: { componentId: 'rB1', pinId: 'B' } },
    ]))
  })

  it('B11 / B13 — A.hole -> B.hole : SEUL cas de fusion inter-breadboards ; crée l\'union', () => {
    const doc = {
      breadboards: [A, B],
      components: [resOn('rA', A), resOn('rB', B)],   // rA.A sur A:col5 ; rB.A sur B:col5
      wires: [{ id: 'link', pinA: holeEp('A', 5, 3), pinB: holeEp('B', 5, 3) }],
    }
    const wires = deriveBreadboardVirtualWires(doc)
    // rA.A et rB.A sont désormais dans le même réseau -> une arête les relie.
    const keys = sortWires(wires)
    expect(keys).toContain('rA|A|rB|A')
  })

  it('B12 — B.hole -> A.hole : symétrique, crée l\'union', () => {
    const doc = {
      breadboards: [A, B],
      components: [resOn('rA', A), resOn('rB', B)],
      wires: [{ id: 'link', pinA: holeEp('B', 5, 3), pinB: holeEp('A', 5, 3) }],
    }
    expect(sortWires(deriveBreadboardVirtualWires(doc))).toContain('rA|A|rB|A')
  })

  it('B14 / B15 — sans le wire inter-breadboard : isolation ; en le retirant : l\'union disparaît', () => {
    const withLink = {
      breadboards: [A, B],
      components: [resOn('rA', A), resOn('rB', B)],
      wires: [{ id: 'link', pinA: holeEp('A', 5, 3), pinB: holeEp('B', 5, 3) }],
    }
    const withoutLink = { ...withLink, wires: [] }
    expect(sortWires(deriveBreadboardVirtualWires(withLink))).toContain('rA|A|rB|A')
    expect(deriveBreadboardVirtualWires(withoutLink)).toEqual([])
  })

  it('B13 (isolation de C) — union A<->B par wire ne touche pas C', () => {
    const doc = {
      breadboards: [A, B, C],
      components: [resOn('rA', A), resOn('rB', B), resOn('rC1', C), resOn('rC2', C)],
      wires: [{ id: 'link', pinA: holeEp('A', 5, 3), pinB: holeEp('B', 5, 3) }],
    }
    const keys = sortWires(deriveBreadboardVirtualWires(doc))
    expect(keys).toContain('rA|A|rB|A')                 // union A<->B
    expect(keys).toContain('rC1|A|rC2|A')               // C interne
    // aucune arête rA/rB <-> rC*
    for (const k of keys) {
      const parts = k.split('|')
      const involvesC = parts[0].startsWith('rC') || parts[2].startsWith('rC')
      const involvesAB = ['rA', 'rB'].includes(parts[0]) || ['rA', 'rB'].includes(parts[2])
      expect(involvesC && involvesAB).toBe(false)
    }
  })
})

describe('FT-C-BREAD-MULTI-001-B — endpoints invalides (B16)', () => {
  it('B16 — endpoint dont le breadboardId est inconnu est ignoré proprement (aucune exception, aucune arête)', () => {
    const doc = {
      breadboards: [A],
      components: [resOn('rA', A), { id: 'led', type: 'LED', position: { x: -999, y: -999 } }],
      wires: [{ id: 'w', pinA: { componentId: 'led', pinId: 'anode' }, pinB: holeEp('DOES_NOT_EXIST', 5, 3) }],
    }
    expect(() => deriveBreadboardVirtualWires(doc)).not.toThrow()
    expect(deriveBreadboardVirtualWires(doc)).toEqual([])
  })

  it('B16 — endpoint sur un trou hors grille est ignoré', () => {
    const doc = {
      breadboards: [A],
      components: [resOn('rA', A), { id: 'led', type: 'LED', position: { x: -999, y: -999 } }],
      wires: [{ id: 'w', pinA: { componentId: 'led', pinId: 'anode' }, pinB: holeEp('A', 999, 999) }],
    }
    expect(deriveBreadboardVirtualWires(doc)).toEqual([])
  })
})

describe('FT-C-BREAD-MULTI-001-B — Bridge (B19)', () => {
  it('B19 — deriveBreadboardVirtualWiresBridge reste { fromUid, fromPin, toUid, toPin }', () => {
    const bridge = deriveBreadboardVirtualWiresBridge({
      breadboards: [A],
      components: [resOn('r1', A), resOn('r2', A)],
    })
    expect(bridge).toEqual(expect.arrayContaining([
      { fromUid: 'r1', fromPin: 'A', toUid: 'r2', toPin: 'A' },
      { fromUid: 'r1', fromPin: 'B', toUid: 'r2', toPin: 'B' },
    ]))
  })
})
