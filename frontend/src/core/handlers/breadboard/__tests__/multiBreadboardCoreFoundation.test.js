/**
 * multiBreadboardCoreFoundation.test.js — FT-C-BREAD-MULTI-001-A
 *
 * Unité A « Canonical Document + Core Mutation » de la capability mission
 * FT-C-BREAD-MULTI-001. Prouve, au niveau Core (handlers + History, sans
 * Presentation ni connectivité), les capacités T1–T18 + T42–T45 du ticket :
 *
 *   - `document.breadboards[]` est la SOURCE DE VÉRITÉ canonique ;
 *   - ADD empile des entrées adressables par id (LOCK-01 levé) ;
 *   - MOVE / DELETE ciblent EXACTEMENT `payload.breadboardId` ;
 *   - solidarité résolue par breadboard (primitive centrale inchangée) ;
 *   - undo / redo par identité, sans effet de bord sur les autres entrées ;
 *   - DELETE ne cascade jamais sur components / wires ;
 *   - aucune double source de vérité runtime (les handlers ne muent que
 *     `breadboards[]` ; `breadboard` est une projection dérivée).
 *
 * Connectivité électrique multi-breadboard, placement multi-candidats,
 * rendu N-instances et Bridge/import-export = unités 001-B / 001-C / 001-D /
 * 001-E (hors scope ici).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { AddBreadboardHandler } from '../AddBreadboardHandler.js'
import { MoveBreadboardHandler } from '../MoveBreadboardHandler.js'
import { DeleteBreadboardHandler } from '../DeleteBreadboardHandler.js'
import { createHandlerTestContext } from '../../__tests__/fixtures/testHistoryContext.js'
import { normalizeDocumentBreadboards } from '../../../../utils/normalizeDocumentBreadboards.js'

// RESISTOR pins A(0,14) / B(84,14). À x=-24+ox, y=22 (breadboard en (ox,0)),
// la pin B tombe sur (60+ox, 36) => col5/row3 du breadboard local -> solidaire.
// Un breadboard fait 30 colonnes (x 0..348) : les origines A=0 / B=480 sont
// choisies pour que les deux zones de trous ne se chevauchent JAMAIS, sinon un
// composant "sur B" pourrait aussi résoudre un trou de A (col > 30 hors grille).
const resistorOnBoardAt = (id, ox) => ({
  id,
  type: 'RESISTOR',
  position: { x: -24 + ox, y: 22 },
  parameters: { resistance: 1000 },
})
const BOARD_A_X = 0
const BOARD_B_X = 480

function setup(initialDoc = { components: [], wires: [] }) {
  const ctx = createHandlerTestContext(normalizeDocumentBreadboards(initialDoc))
  return {
    ...ctx,
    add: new AddBreadboardHandler(ctx),
    move: new MoveBreadboardHandler(ctx),
    del: new DeleteBreadboardHandler(ctx),
    doc: () => ctx.documentApi.getDocument(),
  }
}
function addBoard(h, id, x, y) {
  return h.add.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: id, position: { x, y } } }, h.doc())
}

describe('FT-C-BREAD-MULTI-001-A — Canonical Document', () => {
  it('T1 — Document sans breadboard : breadboards = [] (projection null)', () => {
    const h = setup()
    expect(h.doc().breadboards).toEqual([])
    expect(h.doc().breadboard).toBeNull()
  })

  it('T2 — Document à 1 breadboard : breadboards a exactement 1 entrée', () => {
    const h = setup()
    addBoard(h, 'A', 0, 0)
    expect(h.doc().breadboards).toHaveLength(1)
    expect(h.doc().breadboards[0].id).toBe('A')
  })

  it('T44 — aucune double source : ADD ne mute que breadboards[] ; breadboard est dérivé (= breadboards[0])', () => {
    const h = setup()
    addBoard(h, 'A', 0, 0)
    addBoard(h, 'B', 240, 0)
    const d = h.doc()
    expect(d.breadboards.map((b) => b.id)).toEqual(['A', 'B'])
    expect(d.breadboard).toEqual(d.breadboards[0])
  })
})

describe('FT-C-BREAD-MULTI-001-A — ADD_BREADBOARD multi (T3–T6, T13–T14, T45)', () => {
  let h
  beforeEach(() => { h = setup() })

  it('T3 / T4 — ADD deuxième puis troisième breadboard : [A] -> [A,B] -> [A,B,C]', () => {
    addBoard(h, 'A', 0, 0)
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A'])
    addBoard(h, 'B', 240, 0)
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B'])
    addBoard(h, 'C', 480, 0)
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
  })

  it('T5 — IDs uniques ; un id déjà présent est refusé sans altérer la collection', () => {
    addBoard(h, 'A', 0, 0)
    addBoard(h, 'B', 240, 0)
    expect(() => addBoard(h, 'A', 999, 999)).toThrow(/existe déjà|ALREADY_EXISTS/i)
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B'])
  })

  it('T6 — positions indépendantes et snapées, une par entrée', () => {
    addBoard(h, 'A', 5, 7)
    addBoard(h, 'B', 250, 0)
    expect(h.doc().breadboards.map((b) => b.position)).toEqual([
      { x: 0, y: 12 },
      { x: 252, y: 0 },
    ])
  })

  it('T13 / T14 / T45 — undo retire la dernière entrée ; redo la restaure avec le même id', () => {
    addBoard(h, 'A', 0, 0)
    addBoard(h, 'B', 240, 0)
    h.historyService.undo()
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A'])
    h.historyService.redo()
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B'])
    expect(h.doc().breadboards[1]).toMatchObject({ id: 'B', position: { x: 240, y: 0 } })
  })

  it('T13 — undo de l\'ADD du milieu ne touche ni A ni C (ciblage par id)', () => {
    const r1 = addBoard(h, 'A', 0, 0)
    void r1
    addBoard(h, 'B', 240, 0)
    addBoard(h, 'C', 480, 0)
    // rejoue l\'undo de B : l\'historique dépile dans l\'ordre inverse, donc on
    // annule d\'abord C, puis B.
    h.historyService.undo() // annule C
    h.historyService.undo() // annule B
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A'])
    h.historyService.redo() // rétablit B
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B'])
  })
})

describe('FT-C-BREAD-MULTI-001-A — MOVE_BREADBOARD ciblé (T7–T10, T15–T16)', () => {
  let h
  beforeEach(() => {
    h = setup({
      components: [resistorOnBoardAt('rA', BOARD_A_X), resistorOnBoardAt('rB', BOARD_B_X)],
      wires: [],
    })
    addBoard(h, 'A', BOARD_A_X, 0)
    addBoard(h, 'B', BOARD_B_X, 0)
  })

  const moveBoard = (id, from, to) =>
    h.move.execute({ type: 'MOVE_BREADBOARD', payload: { breadboardId: id, fromPosition: from, toPosition: to } }, h.doc())

  it('T7 — MOVE A ne déplace pas B', () => {
    moveBoard('A', { x: 0, y: 0 }, { x: 0, y: 120 })
    const byId = Object.fromEntries(h.doc().breadboards.map((b) => [b.id, b.position]))
    expect(byId.A).toEqual({ x: 0, y: 120 })
    expect(byId.B).toEqual({ x: BOARD_B_X, y: 0 })
  })

  it('T8 — MOVE B ne déplace pas A', () => {
    moveBoard('B', { x: BOARD_B_X, y: 0 }, { x: BOARD_B_X + 120, y: 0 })
    const byId = Object.fromEntries(h.doc().breadboards.map((b) => [b.id, b.position]))
    expect(byId.A).toEqual({ x: 0, y: 0 })
    expect(byId.B).toEqual({ x: BOARD_B_X + 120, y: 0 })
  })

  it('T9 / T10 — solidarité par breadboard : MOVE A déplace rA seulement ; MOVE B déplace rB seulement', () => {
    moveBoard('A', { x: 0, y: 0 }, { x: 0, y: 120 })
    let byC = Object.fromEntries(h.doc().components.map((c) => [c.id, c.position]))
    expect(byC.rA).toEqual({ x: -24, y: 142 })                 // suivi +120 en y
    expect(byC.rB).toEqual({ x: -24 + BOARD_B_X, y: 22 })      // inchangé

    moveBoard('B', { x: BOARD_B_X, y: 0 }, { x: BOARD_B_X + 60, y: 0 })
    byC = Object.fromEntries(h.doc().components.map((c) => [c.id, c.position]))
    expect(byC.rA).toEqual({ x: -24, y: 142 })                 // inchangé par le MOVE B
    expect(byC.rB).toEqual({ x: -24 + BOARD_B_X + 60, y: 22 }) // suivi +60 en x
  })

  it('MOVE d\'un id inconnu -> BREADBOARD_NOT_FOUND, aucune mutation', () => {
    expect(() => moveBoard('ZZZ', { x: 0, y: 0 }, { x: 12, y: 0 })).toThrow(/NOT_FOUND|Aucun breadboard/i)
  })

  it('T15 / T16 — undo/redo MOVE B : B revient / repart, A jamais affecté', () => {
    moveBoard('B', { x: BOARD_B_X, y: 0 }, { x: BOARD_B_X + 120, y: 0 })
    h.historyService.undo()
    let byId = Object.fromEntries(h.doc().breadboards.map((b) => [b.id, b.position]))
    expect(byId.B).toEqual({ x: BOARD_B_X, y: 0 })
    expect(byId.A).toEqual({ x: 0, y: 0 })
    expect(h.doc().components.find((c) => c.id === 'rB').position).toEqual({ x: -24 + BOARD_B_X, y: 22 })

    h.historyService.redo()
    byId = Object.fromEntries(h.doc().breadboards.map((b) => [b.id, b.position]))
    expect(byId.B).toEqual({ x: BOARD_B_X + 120, y: 0 })
    expect(byId.A).toEqual({ x: 0, y: 0 })
  })
})

describe('FT-C-BREAD-MULTI-001-A — DELETE_BREADBOARD ciblé (T11–T12, T17–T18, T42–T43)', () => {
  let h
  beforeEach(() => {
    h = setup({
      components: [resistorOnBoardAt('rA', BOARD_A_X), resistorOnBoardAt('rB', BOARD_B_X)],
      wires: [{ id: 'w1', pinA: { componentId: 'rA', pinId: 'A' }, pinB: { componentId: 'rB', pinId: 'B' } }],
    })
    addBoard(h, 'A', BOARD_A_X, 0)
    addBoard(h, 'B', BOARD_B_X, 0)
    addBoard(h, 'C', BOARD_B_X + 480, 0)
  })
  const delBoard = (id) => h.del.execute({ type: 'DELETE_BREADBOARD', payload: { breadboardId: id } }, h.doc())

  it('T11 / T12 — DELETE B retire uniquement B ; A et C intacts', () => {
    delBoard('B')
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'C'])
  })

  it('T42 — DELETE ne supprime aucun composant', () => {
    delBoard('B')
    expect(h.doc().components.map((c) => c.id).sort()).toEqual(['rA', 'rB'])
  })

  it('T43 — DELETE ne supprime aucun wire explicite', () => {
    delBoard('B')
    expect(h.doc().wires.map((w) => w.id)).toEqual(['w1'])
  })

  it('T17 / T18 — undo DELETE B restaure B à sa place (id/position/layout) ; redo le retire', () => {
    delBoard('B')
    h.historyService.undo()
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(h.doc().breadboards[1]).toMatchObject({ id: 'B', position: { x: BOARD_B_X, y: 0 }, layout: 'STANDARD_V1' })

    h.historyService.redo()
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'C'])
  })

  it('undo DELETE A restaure A en tête, B et C jamais touchés', () => {
    delBoard('A')
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['B', 'C'])
    h.historyService.undo()
    expect(h.doc().breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
  })

  it('DELETE d\'un id inconnu -> BREADBOARD_NOT_FOUND', () => {
    expect(() => delBoard('nope')).toThrow(/NOT_FOUND|Aucun breadboard/i)
  })
})

describe('FT-C-BREAD-MULTI-001-A — mono-breadboard non régressé (T40)', () => {
  it('ADD unique -> MOVE -> DELETE -> undo : mêmes effets observables que le modèle singleton', () => {
    const h = setup()
    addBoard(h, 'only', 0, 0)
    expect(h.doc().breadboard).toMatchObject({ id: 'only', layout: 'STANDARD_V1' })

    h.move.execute(
      { type: 'MOVE_BREADBOARD', payload: { breadboardId: 'only', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } } },
      h.doc()
    )
    expect(h.doc().breadboard.position).toEqual({ x: 24, y: 24 })

    h.del.execute({ type: 'DELETE_BREADBOARD', payload: { breadboardId: 'only' } }, h.doc())
    expect(h.doc().breadboard).toBeNull()
    expect(h.doc().breadboards).toEqual([])

    h.historyService.undo() // annule DELETE
    expect(h.doc().breadboard).toMatchObject({ id: 'only', position: { x: 24, y: 24 } })
  })
})
