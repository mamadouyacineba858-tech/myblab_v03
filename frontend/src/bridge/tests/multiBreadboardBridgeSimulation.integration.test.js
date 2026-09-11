/**
 * multiBreadboardBridgeSimulation.integration.test.js — FT-C-BREAD-MULTI-001-E
 *
 * Preuve E2E que la vérité canonique `document.breadboards[]` traverse
 * TOUTES les frontières documentaires puis revient sans perte :
 *
 *   React Document
 *     → ReactDocumentMapper.toCore
 *     → normalizeDocumentBreadboards (frontière legacy UNIQUE)
 *     → ReactCoreBridge.dispatch (diff composants/wires, doc complet porté)
 *     → toEngineInput / deriveBreadboardVirtualWires (simulation)
 *     → ReactDocumentMapper.toReact (round-trip)
 *
 * Aucune réimplémentation de la physique B/C : réutilise
 * deriveBreadboardVirtualWires (001-B) et l'ownership D1 (001-C).
 *
 * Capacités E2, E3, E6, E8, E9.
 */
import { describe, it, expect, vi } from 'vitest'
import { ReactDocumentMapper } from '../ReactDocumentMapper.js'
import { ReactCoreBridge } from '../ReactCoreBridge.js'
import {
  normalizeDocumentBreadboards,
  toCanonicalBreadboards,
} from '../../utils/normalizeDocumentBreadboards.js'
import { toEngineInput } from '../../simulator/engineAdapter.js'
import { deriveBreadboardVirtualWires } from '../../utils/breadboardConnectivity.js'
import { makeBreadboardHoleEndpoint } from '../../utils/breadboardWireEndpoint.js'

const A = { id: 'A', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
const B = { id: 'B', position: { x: 480, y: 0 }, layout: 'STANDARD_V1' }
const C = { id: 'C', position: { x: 960, y: 0 }, layout: 'STANDARD_V1' }
// RESISTOR pin A(0,14) / B(84,14) ; à {x:60+ox, y:22} → pin A col5/row3, pin B col12/row3 du board (ox,0).
const res = (id, ox) => ({ uid: id, type: 'RESISTOR', x: 60 + ox, y: 22 })
const resCore = (id, ox) => ({ id, type: 'RESISTOR', position: { x: 60 + ox, y: 22 } })
const edgeKeys = (ws) =>
  ws.map((w) => [w.pinA.componentId, w.pinA.pinId, w.pinB.componentId, w.pinB.pinId].join('|')).sort()

describe('FT-C-BREAD-MULTI-001-E — E2 : normalisation legacy centralisée', () => {
  it('E2 LEGACY 1 — { breadboard: null } → { breadboards: [] }', () => {
    expect(normalizeDocumentBreadboards({ breadboard: null }).breadboards).toEqual([])
  })
  it('E2 LEGACY 2 — { breadboard: A } → { breadboards: [A] }', () => {
    expect(normalizeDocumentBreadboards({ breadboard: A }).breadboards.map((b) => b.id)).toEqual(['A'])
  })
  it('E2 CANONIQUE — { breadboards: [A,B,C] } → conservé, ordre intact', () => {
    expect(normalizeDocumentBreadboards({ breadboards: [A, B, C] }).breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
  })
  it('E2 PRIORITÉ — une collection canonique valide n\'est jamais écrasée par la projection singulière', () => {
    const out = normalizeDocumentBreadboards({ breadboard: { id: 'legacy-ignored' }, breadboards: [A, B] })
    expect(out.breadboards.map((b) => b.id)).toEqual(['A', 'B'])
  })
  it('E2 E8-10 — une collection N n\'est jamais tronquée à son premier élément', () => {
    expect(toCanonicalBreadboards({ breadboards: [A, B, C] })).toHaveLength(3)
  })
})

describe('FT-C-BREAD-MULTI-001-E — E1 pipeline : React → Core → React', () => {
  const reactDoc = {
    components: [res('rA', 0), res('rA2', 0), res('rB', 480), res('rC', 960)],
    wires: [],
    breadboards: [A, B, C],
  }

  it('E9.1 — toCore conserve les 3 cartes (id / position / ordre) + composants', () => {
    const core = ReactDocumentMapper.toCore(reactDoc)
    expect(core.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(core.breadboards.map((b) => b.position)).toEqual([A.position, B.position, C.position])
    expect(core.components.map((c) => c.id).sort()).toEqual(['rA', 'rA2', 'rB', 'rC'])
  })

  it('E9.6 — round-trip React → Core → React : 3 cartes intactes, aucune mutation source', () => {
    const frozen = JSON.stringify(reactDoc)
    const back = ReactDocumentMapper.toReact(ReactDocumentMapper.toCore(reactDoc))
    expect(back.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(back.breadboards.map((b) => b.position)).toEqual([A.position, B.position, C.position])
    expect(back.components).toHaveLength(4)
    expect(JSON.stringify(reactDoc)).toBe(frozen)
  })
})

describe('FT-C-BREAD-MULTI-001-E — E3 : ReactCoreBridge transporte l\'état multi-breadboard', () => {
  function makeBridge(resultDocument) {
    const commandBus = {
      dispatch: vi.fn().mockReturnValue({ success: true, commandId: 'c1', result: { document: resultDocument } }),
    }
    const documentApi = {
      getDocument: vi.fn().mockReturnValue({ components: [], wires: [], breadboards: [A, B, C] }),
      removeWires: vi.fn(), removeComponents: vi.fn(), updateComponentState: vi.fn(),
      updateComponentPositions: vi.fn(), restoreComponents: vi.fn(), restoreWires: vi.fn(),
    }
    const historyManager = { undo: vi.fn(), redo: vi.fn(), canUndo: () => true, canRedo: () => false }
    return { bridge: new ReactCoreBridge({ commandBus, documentApi, historyManager }), commandBus }
  }

  it('E3-01 — 0 board : dispatch ne fabrique aucun board', () => {
    const { bridge } = makeBridge({ components: [], wires: [], breadboards: [] })
    const out = bridge.dispatch('NOOP', {})
    expect(out.document.breadboards).toEqual([])
  })

  it('E3-02 / E3-03 — le document résultat porte 1 puis 3 boards intacts', () => {
    expect(makeBridge({ components: [], wires: [], breadboards: [A] }).bridge.dispatch('X', {}).document.breadboards.map((b) => b.id)).toEqual(['A'])
    expect(makeBridge({ components: [], wires: [], breadboards: [A, B, C] }).bridge.dispatch('X', {}).document.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
  })

  it('E3-04 / E3-05 — modifier/supprimer B laisse A et C, dans l\'ordre relatif', () => {
    const movedB = { ...B, position: { x: 600, y: 0 } }
    expect(makeBridge({ components: [], wires: [], breadboards: [A, movedB, C] }).bridge.dispatch('MOVE', {}).document.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(makeBridge({ components: [], wires: [], breadboards: [A, C] }).bridge.dispatch('DELETE', {}).document.breadboards.map((b) => b.id)).toEqual(['A', 'C'])
  })

  it('E3-06 — le bridge ne reconstruit jamais un singleton comme source de vérité', () => {
    const out = makeBridge({ components: [], wires: [], breadboards: [A, B, C] }).bridge.dispatch('X', {}).document
    expect(Array.isArray(out.breadboards)).toBe(true)
    expect(out.breadboards).toHaveLength(3)
  })

  it('E5 — DiffEngine (composants/wires) ignore breadboards[] sans les perdre : le doc complet reste porté par result.document', () => {
    const { bridge } = makeBridge({ components: [{ id: 'newC', type: 'RESISTOR', position: { x: 1, y: 2 } }], wires: [], breadboards: [A, B, C] })
    const out = bridge.dispatch('ADD_COMPONENT', {})
    // le diff a bien détecté le composant ajouté...
    expect(out.diff.componentsAdded.map((c) => c.id)).toEqual(['newC'])
    // ...et les 3 breadboards sont dans le document résultat.
    expect(out.document.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
  })
})

describe('FT-C-BREAD-MULTI-001-E — E7/E9 : simulation multi-breadboard end-to-end', () => {
  it('E9 — Document React A+B+C → Core → simulation : isolation A/B/C, wire explicite cross-board fonctionne', () => {
    const reactDoc = {
      components: [res('rA', 0), res('rB', 480), res('rC1', 960), res('rC2', 960)],
      wires: [],
      breadboards: [A, B, C],
    }
    // 1-3. React → Core (mapper) + frontière de normalisation
    const core = normalizeDocumentBreadboards(ReactDocumentMapper.toCore(reactDoc))
    expect(core.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    // Le mapper produit des composants Core {id, position} — reconstruits ici
    // pour deriveBreadboardVirtualWires (qui lit component.position).
    const coreComponents = [resCore('rA', 0), resCore('rB', 480), resCore('rC1', 960), resCore('rC2', 960)]

    // 4-5. Entrée simulation SANS wire cross-board : A / B / C isolés.
    const isolated = deriveBreadboardVirtualWires({ breadboards: core.breadboards, components: coreComponents, wires: [] })
    const isoK = edgeKeys(isolated)
    // seuls rC1/rC2 (même carte C, même colonne) sont reliés ; jamais A<->B, A<->C, B<->C
    expect(isoK).toContain('rC1|A|rC2|A')
    for (const s of isoK) {
      const [l, , r] = s.split('|')
      const boardOf = (id) => id.replace(/[0-9]+$/, '').slice(1) // 'rA'->'A', 'rC1'->'C'
      expect(boardOf(l)).toBe(boardOf(r))
    }

    // 5bis. Avec un wire explicite trou(A) ↔ trou(B) : les réseaux de A et B fusionnent.
    const link = makeBreadboardHoleEndpoint('A', 5, 3)
    const link2 = makeBreadboardHoleEndpoint('B', 5, 3)
    const linked = deriveBreadboardVirtualWires({
      breadboards: core.breadboards,
      components: coreComponents,
      wires: [{ id: 'x', pinA: { componentId: link.uid, pinId: link.pinId }, pinB: { componentId: link2.uid, pinId: link2.pinId } }],
    })
    expect(edgeKeys(linked)).toContain('rA|A|rB|A')
    // ...mais C reste indépendant.
    for (const s of edgeKeys(linked)) {
      const parts = s.split('|')
      const involvesC = parts[0].startsWith('rC') || parts[2].startsWith('rC')
      const involvesAB = ['rA', 'rB'].includes(parts[0]) || ['rA', 'rB'].includes(parts[2])
      expect(involvesC && involvesAB).toBe(false)
    }

    // 6-8. Round-trip documentaire : A+B+C existent toujours, mêmes ids/positions/ordre.
    const back = ReactDocumentMapper.toReact(ReactDocumentMapper.toCore(reactDoc))
    expect(back.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(back.breadboards.map((b) => b.position)).toEqual([A.position, B.position, C.position])
    expect(back.components).toHaveLength(4)
    expect(back.wires).toEqual([])
  })

  it('E8-09 — un document ancien { breadboard: A } traverse la frontière et devient canonique', () => {
    const legacyReact = { components: [res('r1', 0)], wires: [], breadboard: A }
    const core = normalizeDocumentBreadboards(ReactDocumentMapper.toCore(legacyReact))
    expect(core.breadboards.map((b) => b.id)).toEqual(['A'])
    // la simulation le traite comme la forme canonique
    const viaLegacy = toEngineInput({ breadboard: A, components: [resCore('r1', 0), resCore('r2', 0)], wires: [] })
    const viaCanonical = toEngineInput({ breadboards: [A], components: [resCore('r1', 0), resCore('r2', 0)], wires: [] })
    expect(edgeKeysBridge(viaLegacy.wires)).toEqual(edgeKeysBridge(viaCanonical.wires))
  })
})

function edgeKeysBridge(ws) {
  return ws.map((w) => `${w.fromUid}.${w.fromPin}<->${w.toUid}.${w.toPin}`).sort()
}
