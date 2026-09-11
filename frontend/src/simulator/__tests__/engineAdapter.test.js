/**
 * engineAdapter.test.js — MB-BREADBOARD-002.
 *
 * Aucune couverture de test n'existait pour toEngineInput() avant ce
 * ticket. Ce fichier couvre la conversion Core → bridge de base (régression,
 * TB-14/TB-15) et l'ajout des arêtes virtuelles breadboard (TB-01, TB-06).
 */
import { describe, it, expect } from 'vitest'
import { toEngineInput } from '../engineAdapter.js'

describe('toEngineInput — régression (sans breadboard)', () => {
  it('retourne des tableaux vides pour une entrée invalide', () => {
    expect(toEngineInput(null)).toEqual({ components: [], wires: [] })
    expect(toEngineInput(undefined)).toEqual({ components: [], wires: [] })
  })

  it('convertit components/wires Core vers la forme bridge, sans breadboard (TB-14)', () => {
    const coreDocument = {
      components: [
        { id: 'R1', type: 'RESISTOR', position: { x: 10, y: 20 }, parameters: { resistance: 220 } },
      ],
      wires: [
        { id: 'W1', pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'LED1', pinId: 'anode' } },
      ],
    }
    const result = toEngineInput(coreDocument)
    expect(result.components).toEqual([
      { uid: 'R1', type: 'RESISTOR', x: 10, y: 20, parameters: { resistance: 220 }, state: undefined, pins: undefined },
    ])
    expect(result.wires).toEqual([{ fromUid: 'R1', fromPin: 'A', toUid: 'LED1', toPin: 'anode' }])
  })

  it('ignore des composants/wires incomplets (comportement historique inchangé)', () => {
    const coreDocument = {
      components: [{ id: 'R1', type: 'RESISTOR' }], // pas de position
      wires: [{ id: 'W1', pinA: { pinId: 'A' } }], // pas de componentId
    }
    expect(toEngineInput(coreDocument)).toEqual({ components: [], wires: [] })
  })
})

describe('toEngineInput — breadboard (MB-BREADBOARD-002)', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }
  // RESISTOR.A à dx:0,dy:14 ; position {60,22} -> pin A absolu (60,36) = col5,row3 (strip top).
  const R1 = { id: 'R1', type: 'RESISTOR', position: { x: 60, y: 22 } }
  const R2 = { id: 'R2', type: 'RESISTOR', position: { x: 60, y: 22 } }

  it('ajoute les arêtes virtuelles breadboard aux wires explicites (TB-01)', () => {
    // MB-BREADBOARD-003 : dx du pin B (84) est désormais un multiple exact de
    // BREADBOARD_PITCH. R1/R2 partageant leur position, pin A ET pin B
    // atterrissent chacun sur un trou valide → 2 arêtes virtuelles.
    const result = toEngineInput({ breadboard, components: [R1, R2], wires: [] })
    expect(result.wires).toEqual([
      { fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' },
      { fromUid: 'R1', fromPin: 'B', toUid: 'R2', toPin: 'B' },
    ])
  })

  it('combine wire explicite et connexion breadboard (TB-06)', () => {
    const explicitWire = { id: 'W1', pinA: { componentId: 'R1', pinId: 'B' }, pinB: { componentId: 'LED1', pinId: 'anode' } }
    const result = toEngineInput({ breadboard, components: [R1, R2], wires: [explicitWire] })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'B', toUid: 'LED1', toPin: 'anode' })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'B', toUid: 'R2', toPin: 'B' })
    expect(result.wires).toHaveLength(3)
  })

  it('sans breadboard sur le Document, aucune arête virtuelle ajoutée (TB-15, canevas libre inchangé)', () => {
    const result = toEngineInput({ components: [R1, R2], wires: [] })
    expect(result.wires).toEqual([])
  })
})

/**
 * FT-C-BREAD-MULTI-001-E — E7 : l'adapter de simulation consomme la
 * collection canonique `breadboards[]` (via deriveBreadboardVirtualWires,
 * 001-B — NON réimplémenté ici). Toutes les cartes participent, mais restent
 * électriquement isolées tant qu'aucun wire explicite ne les relie.
 * localGroupKey homonyme A/B => réseaux distincts (001-B, namespacé par id).
 */
import { makeBreadboardHoleEndpoint } from '../../utils/breadboardWireEndpoint.js'

describe('toEngineInput — multi-breadboard (FT-C-BREAD-MULTI-001-E, E7)', () => {
  // Cartes DISJOINTES (une carte = 30 colonnes, x local 0..348) : A=0, B=480, C=960.
  const A = { id: 'A', position: { x: 0, y: 0 } }
  const B = { id: 'B', position: { x: 480, y: 0 } }
  const C = { id: 'C', position: { x: 960, y: 0 } }
  // RESISTOR pin A(0,14)/B(84,14). À {x:60+ox, y:22} : pin A -> col5/row3, pin B -> col12/row3 du board (ox,0).
  const res = (id, ox) => ({ id, type: 'RESISTOR', position: { x: 60 + ox, y: 22 } })
  const holeWire = (id, a, b) => {
    const ea = makeBreadboardHoleEndpoint(a.bb, a.c, a.r)
    const eb = makeBreadboardHoleEndpoint(b.bb, b.c, b.r)
    return { id, pinA: { componentId: ea.uid, pinId: ea.pinId }, pinB: { componentId: eb.uid, pinId: eb.pinId } }
  }
  const key = (w) => `${w.fromUid}.${w.fromPin}<->${w.toUid}.${w.toPin}`
  const keys = (ws) => ws.map(key).sort()

  it('E7-01 — 0 breadboard : comportement canvas libre inchangé', () => {
    expect(toEngineInput({ breadboards: [], components: [res('r1', 0), res('r2', 0)], wires: [] }).wires).toEqual([])
  })

  it('E7-02 — breadboards:[A] : arêtes virtuelles correctes (parité avec le chemin mono historique)', () => {
    const out = toEngineInput({ breadboards: [A], components: [res('r1', 0), res('r2', 0)], wires: [] })
    expect(keys(out.wires)).toEqual(keys([
      { fromUid: 'r1', fromPin: 'A', toUid: 'r2', toPin: 'A' },
      { fromUid: 'r1', fromPin: 'B', toUid: 'r2', toPin: 'B' },
    ]))
  })

  it('E7-03 / E7-04 / E7-05 — 2 breadboards : arêtes calculées pour A ET B, chaque composant selon SA carte', () => {
    const out = toEngineInput({
      breadboards: [A, B],
      components: [res('aA', 0), res('aB', 0), res('bA', 480), res('bB', 480)],
      wires: [],
    })
    const k = keys(out.wires)
    expect(k).toContain('aA.A<->aB.A')
    expect(k).toContain('bA.A<->bB.A')
    // aucune arête ne relie un composant de A à un composant de B
    for (const s of k) {
      const [l, r] = s.split('<->').map((p) => p.split('.')[0])
      expect((l[0] === 'a') === (r[0] === 'a')).toBe(true)
    }
  })

  it('E7-06 — groupe local homonyme (strip col5) sur A et B reste isolé sans wire explicite', () => {
    const out = toEngineInput({
      breadboards: [A, B],
      components: [res('onA', 0), res('onB', 480)], // même localGroupKey "strip:col5:top" sur des cartes différentes
      wires: [],
    })
    expect(out.wires).toEqual([])
  })

  it('E7-07 — wire explicite trou A ↔ trou B relie les deux réseaux', () => {
    const out = toEngineInput({
      breadboards: [A, B],
      components: [res('onA', 0), res('onB', 480)],
      wires: [holeWire('link', { bb: 'A', c: 5, r: 3 }, { bb: 'B', c: 5, r: 3 })],
    })
    expect(keys(out.wires)).toContain('onA.A<->onB.A')
  })

  it('E7-08 / E7-09 — 3 breadboards supportées ; l\'ordre ne fait perdre aucune carte', () => {
    const build = (order) => keys(toEngineInput({
      breadboards: order,
      components: [res('aA', 0), res('aB', 0), res('bA', 480), res('bB', 480), res('cA', 960), res('cB', 960)],
      wires: [],
    }).wires)
    const abc = build([A, B, C])
    const cba = build([C, B, A])
    expect(abc).toEqual(cba) // ordre du tableau -> même connectivité
    expect(abc).toContain('aA.A<->aB.A')
    expect(abc).toContain('bA.A<->bB.A')
    expect(abc).toContain('cA.A<->cB.A')
  })

  it('E7-10 — legacy `{ breadboard: A }` entrant reste compatible à la frontière (toCanonicalBreadboards)', () => {
    const legacy = toEngineInput({ breadboard: A, components: [res('r1', 0), res('r2', 0)], wires: [] })
    const canonical = toEngineInput({ breadboards: [A], components: [res('r1', 0), res('r2', 0)], wires: [] })
    expect(keys(legacy.wires)).toEqual(keys(canonical.wires))
  })
})
