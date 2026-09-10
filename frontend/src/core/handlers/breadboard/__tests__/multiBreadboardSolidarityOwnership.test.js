/**
 * multiBreadboardSolidarityOwnership.test.js — FT-C-BREAD-MULTI-001-C
 *
 * La solidarité (MOVE_BREADBOARD) suit l'OWNERSHIP CANONIQUE D1 :
 *  - `resolveSolidaryComponentIds(bb, comps)` — 2 args : comportement legacy
 *    « au moins un contact résout un trou de bb » (mono-breadboard, inchangé) ;
 *  - `resolveSolidaryComponentIds(bb, comps, breadboards)` — 3 args : un
 *    composant est solidaire de `bb` SEULEMENT si son owner D1 est `bb`
 *    (un seul propriétaire, même en cas de chevauchement).
 *
 * Puis MoveBreadboardHandler ne déplace QUE les composants owned (C21–C25).
 */
import { describe, it, expect } from 'vitest'
import { resolveSolidaryComponentIds } from '../breadboardSolidarity.js'
import { AddBreadboardHandler } from '../AddBreadboardHandler.js'
import { MoveBreadboardHandler } from '../MoveBreadboardHandler.js'
import { createHandlerTestContext } from '../../__tests__/fixtures/testHistoryContext.js'
import { normalizeDocumentBreadboards } from '../../../../utils/normalizeDocumentBreadboards.js'

const bb = (id, x, y = 0) => ({ id, position: { x, y }, layout: 'STANDARD_V1' })
// RESISTOR pin A(0,14)/B(84,14) ; à {x:-24+ox, y:22} -> pin B sur col5/row3 de
// board@(ox,0). Boards A=0 / B=480 : zones de trous DISJOINTES.
const resAt = (id, ox) => ({ id, type: 'RESISTOR', position: { x: -24 + ox, y: 22 } })

describe('FT-C-BREAD-MULTI-001-C — resolveSolidaryComponentIds ownership D1 (C21–C23)', () => {
  it('legacy 2 arguments : comportement historique préservé (au moins un contact)', () => {
    const A = bb('A', 0)
    expect(resolveSolidaryComponentIds(A, [resAt('r', 0)])).toEqual(new Set(['r']))
    expect(resolveSolidaryComponentIds(A, [resAt('r', 5000)])).toEqual(new Set())
  })

  it('C21/C23 — [A,B] disjoints : LED sur A, resistor sur B -> chacun solidaire de son board', () => {
    const A = bb('A', 0)
    const B = bb('B', 480)
    const boards = [A, B]
    const comps = [
      { id: 'led', type: 'LED', position: { x: -2, y: 12 } },        // sur A (fixture connue)
      { id: 'res', type: 'RESISTOR', position: { x: -24 + 480, y: 22 } }, // sur B
    ]
    expect(resolveSolidaryComponentIds(A, comps, boards)).toEqual(new Set(['led']))
    expect(resolveSolidaryComponentIds(B, comps, boards)).toEqual(new Set(['res']))
  })

  it('C23 — composant qui chevauche A/B (boards superposés) : owner unique -> présent dans UN seul Set', () => {
    const A = bb('A', 0)
    const B = bb('B', 0) // superposé
    const boards = [A, B]
    const comps = [{ id: 'pot', type: 'POTENTIOMETER', position: { x: 0, y: 0 } }]
    const inA = resolveSolidaryComponentIds(A, comps, boards)
    const inB = resolveSolidaryComponentIds(B, comps, boards)
    // exactement un des deux contient 'pot'
    expect(inA.has('pot') !== inB.has('pot')).toBe(true)
    // D1.5 : dernier de breadboards[] = B
    expect(inB.has('pot')).toBe(true)
  })

  it('C24 — l\'ordre du tableau suit la règle D1 (dernier gagne à égalité)', () => {
    const A = bb('A', 0)
    const B = bb('B', 0)
    const comps = [{ id: 'pot', type: 'POTENTIOMETER', position: { x: 0, y: 0 } }]
    expect(resolveSolidaryComponentIds(A, comps, [B, A]).has('pot')).toBe(true) // A dernier -> A
    expect(resolveSolidaryComponentIds(B, comps, [A, B]).has('pot')).toBe(true) // B dernier -> B
  })
})

describe('FT-C-BREAD-MULTI-001-C — MoveBreadboardHandler respecte l\'ownership D1 (C21, C22, C25)', () => {
  function setup() {
    const doc = normalizeDocumentBreadboards({
      components: [
        { id: 'led', type: 'LED', position: { x: -2, y: 12 } },              // sur A@(0,0)
        { id: 'res', type: 'RESISTOR', position: { x: -24 + 480, y: 22 } },  // sur B@(480,0)
      ],
      wires: [],
    })
    const ctx = createHandlerTestContext(doc)
    const add = new AddBreadboardHandler(ctx)
    const move = new MoveBreadboardHandler(ctx)
    add.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'A', position: { x: 0, y: 0 } } }, ctx.documentApi.getDocument())
    add.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'B', position: { x: 480, y: 0 } } }, ctx.documentApi.getDocument())
    return { ctx, move, doc: () => ctx.documentApi.getDocument() }
  }
  const posOf = (d, id) => d.components.find((c) => c.id === id).position

  it('C21 — MOVE A : le composant owned par A (led) suit ; celui owned par B (res) ne bouge pas', () => {
    const h = setup()
    const resBefore = posOf(h.doc(), 'res')
    h.move.execute(
      { type: 'MOVE_BREADBOARD', payload: { breadboardId: 'A', fromPosition: { x: 0, y: 0 }, toPosition: { x: 0, y: 120 } } },
      h.doc()
    )
    expect(posOf(h.doc(), 'led')).toEqual({ x: -2, y: 132 })  // suivi +120
    expect(posOf(h.doc(), 'res')).toEqual(resBefore)          // inchangé
  })

  it('C22 — MOVE B : res suit, led ne bouge pas', () => {
    const h = setup()
    const ledBefore = posOf(h.doc(), 'led')
    h.move.execute(
      { type: 'MOVE_BREADBOARD', payload: { breadboardId: 'B', fromPosition: { x: 480, y: 0 }, toPosition: { x: 540, y: 0 } } },
      h.doc()
    )
    expect(posOf(h.doc(), 'res')).toEqual({ x: -24 + 540, y: 22 }) // suivi +60
    expect(posOf(h.doc(), 'led')).toEqual(ledBefore)
  })

  it('C25 — undo/redo MOVE_BREADBOARD conserve la solidarité correcte', () => {
    const h = setup()
    h.move.execute(
      { type: 'MOVE_BREADBOARD', payload: { breadboardId: 'A', fromPosition: { x: 0, y: 0 }, toPosition: { x: 0, y: 120 } } },
      h.doc()
    )
    expect(posOf(h.doc(), 'led')).toEqual({ x: -2, y: 132 })
    h.ctx.historyService.undo()
    expect(posOf(h.doc(), 'led')).toEqual({ x: -2, y: 12 })
    expect(posOf(h.doc(), 'res')).toEqual({ x: -24 + 480, y: 22 })
    h.ctx.historyService.redo()
    expect(posOf(h.doc(), 'led')).toEqual({ x: -2, y: 132 })
    expect(posOf(h.doc(), 'res')).toEqual({ x: -24 + 480, y: 22 })
  })
})
