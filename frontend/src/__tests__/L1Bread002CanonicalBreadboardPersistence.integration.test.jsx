/**
 * L1Bread002CanonicalBreadboardPersistence.integration.test.jsx — L1-BREAD-002
 * "Canonical Breadboard Persistence & Assembly Round-Trip Integrity".
 *
 * Pipeline RÉEL (CircuitProvider, vrai CommandBus/CommandRegistry/
 * ValidationEngine/HistoryService, vrai exportCircuit/importCircuit, vrais
 * utilitaires de placement/connectivité/simulation déjà existants). Aucun
 * Document construit à la main pour les assertions de persistance/mutation —
 * seules les primitives de lecture dérivée (deriveBreadboardVirtualWires,
 * toEngineInput, resolveComponentBreadboardAssociation) sont appelées
 * directement sur le document RÉELLEMENT exporté, exactement comme le fait
 * déjà multiBreadboardBridgeSimulation.integration.test.js (FT-C-BREAD-MULTI-001-E).
 *
 * Portée : le SEUL delta de production de ce ticket est exportCircuit()
 * (useCircuitState.js) qui n'émet plus la projection transitoire
 * `breadboard` — `breadboards[]` devient l'unique champ persisté. L'import
 * (normalizeDocumentBreadboards.js, INCHANGÉ) continue d'accepter les deux
 * formes.
 *
 * Note d'architecture (T13/T16) : WirePinsExistRule (STR-003, Validation
 * architecture — verrouillée pour ce ticket) résout encore un endpoint-trou
 * contre le SEUL `document.breadboard` (projection singulière = breadboards[0]),
 * pas contre `breadboards[]`. Un endpoint-trou sur le board[0] est donc
 * validable via le canal de mutation réel (addWire) — utilisé ici pour T13.
 * Un endpoint-trou sur un board qui n'est PAS boards[0] serait rejeté par
 * cette règle pré-existante (hors scope, fichier de Validation verrouillé) ;
 * T16 utilise donc la forme d'interconnexion explicite inter-cartes qui EST
 * supportée par le canal réel : un wire composant-à-composant entre deux
 * composants possédés mécaniquement par deux cartes différentes.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { deriveBreadboardVirtualWires } from '../utils/breadboardConnectivity.js'
import { resolveComponentBreadboardAssociation } from '../utils/breadboardAssociation.js'
import { toEngineInput } from '../simulator/engineAdapter.js'
import { getLedState } from '../simulator/engine.js'
import {
  makeBreadboardHoleEndpoint,
  parseBreadboardHoleEndpoint,
  BREADBOARD_HOLE_PIN_ID,
} from '../utils/breadboardWireEndpoint.js'

const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

function renderApi() {
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

function coreOf(exported) {
  return ReactDocumentMapper.toCore(exported)
}

/** Arêtes de bus dérivées (deriveBreadboardVirtualWires, moteur existant, inchangé). */
function busEdges(exported) {
  const core = coreOf(exported)
  const edges = deriveBreadboardVirtualWires({
    breadboards: core.breadboards,
    components: core.components,
    wires: core.wires,
  })
  return edges
    .map((w) => [w.pinA.componentId, w.pinA.pinId, w.pinB.componentId, w.pinB.pinId].join('|'))
    .sort()
}

/** Connectivité effective (bus + wires explicites) via l'adaptateur réellement consommé par le moteur de simulation. */
function engineEdges(exported) {
  const core = coreOf(exported)
  const adapted = toEngineInput(core)
  return adapted.wires.map((w) => `${w.fromUid}.${w.fromPin}<->${w.toUid}.${w.toPin}`).sort()
}

/** Propriétaire mécanique DÉRIVÉ (jamais un champ persisté) d'un composant après import. */
function ownerOf(exported, uid) {
  const core = coreOf(exported)
  const component = core.components.find((c) => c.id === uid)
  const assoc = resolveComponentBreadboardAssociation({
    breadboards: core.breadboards,
    componentType: component.type,
    position: component.position,
    otherComponents: core.components.filter((c) => c.id !== uid),
    mode: 'ownership',
  })
  return assoc.breadboardId
}

describe('L1-BREAD-002 — canonical export shape (T1-T5, T18)', () => {
  it('T1/T3/T4/T5 — deux breadboards : ids/positions/layouts exacts, ordre préservé', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const exported = result.current.exportCircuit()
    expect(exported.breadboards).toHaveLength(2)
    const [A, B] = result.current.breadboards
    expect(exported.breadboards.map((b) => b.id)).toEqual([A.id, B.id])
    expect(exported.breadboards.map((b) => b.position)).toEqual([A.position, B.position])
    expect(exported.breadboards.map((b) => b.layout)).toEqual([A.layout, B.layout])
    expect(A.position).not.toEqual(B.position)
  })

  it('T2 — un nouvel export ne porte JAMAIS le singleton legacy `breadboard`', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const exported = result.current.exportCircuit()
    expect(Object.prototype.hasOwnProperty.call(exported, 'breadboard')).toBe(false)
  })

  it('T2bis — vrai même sans aucun breadboard posé', () => {
    const { result } = renderApi()
    const exported = result.current.exportCircuit()
    expect(exported.breadboards).toEqual([])
    expect(Object.prototype.hasOwnProperty.call(exported, 'breadboard')).toBe(false)
  })

  it('T18 — exportCircuit() est une lecture pure : aucune mutation, aucune entrée d\'historique, aucun changement de sélection/simulation', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('LED', 200, 150)
    })
    act(() => { result.current.selectOnly({ type: 'component', id: result.current.components[0].uid }) })

    const undoCountBefore = result.current.getUndoCount()
    const selectionBefore = new Set(result.current.selection)
    const simActiveBefore = result.current.simulationActive
    const breadboardsBefore = result.current.breadboards
    const componentsBefore = result.current.components
    const wiresBefore = result.current.wires

    result.current.exportCircuit()
    result.current.exportCircuit()

    expect(result.current.getUndoCount()).toBe(undoCountBefore)
    expect(result.current.selection).toEqual(selectionBefore)
    expect(result.current.simulationActive).toBe(simActiveBefore)
    expect(result.current.breadboards).toBe(breadboardsBefore)
    expect(result.current.components).toBe(componentsBefore)
    expect(result.current.wires).toBe(wiresBefore)
  })
})

describe('L1-BREAD-002 — legacy import compatibility (T6, T7)', () => {
  it('T6 — un document legacy `{ breadboard: B }` (sans breadboards[]) importe runtime breadboards === [B]', () => {
    const { result } = renderApi()
    const LEGACY_B = { id: 'legacy-b', position: { x: 24, y: 36 }, layout: 'STANDARD_V1' }
    act(() => {
      result.current.importCircuit({ version: 1, components: [], wires: [], breadboard: LEGACY_B })
    })
    expect(result.current.breadboards).toHaveLength(1)
    expect(result.current.breadboards[0].id).toBe(LEGACY_B.id)
    expect(result.current.breadboards[0].position).toEqual(LEGACY_B.position)
  })

  it('T7 — une propriété compatible inconnue d\'une entrée breadboard legacy survit à la normalisation/import/export', () => {
    const { result } = renderApi()
    const LEGACY_WITH_EXTRA = {
      id: 'legacy-extra',
      position: { x: 0, y: 0 },
      layout: 'STANDARD_V1',
      colorTag: 'blue-ok-benign',
    }
    act(() => {
      result.current.importCircuit({ version: 1, components: [], wires: [], breadboard: LEGACY_WITH_EXTRA })
    })
    const reexported = result.current.exportCircuit()
    expect(reexported.breadboards[0].colorTag).toBe('blue-ok-benign')
  })
})

describe('L1-BREAD-002 — canonical precedence (T8)', () => {
  it('T8 — breadboards[] gagne toujours quand les deux formes sont présentes ; le singleton n\'est ni ajouté ni substitué', () => {
    const { result } = renderApi()
    const A = { id: 'canon-a', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const B = { id: 'canon-b', position: { x: 480, y: 0 }, layout: 'STANDARD_V1' }
    const LEGACY_DIFFERENT = { id: 'should-be-ignored', position: { x: 999, y: 999 }, layout: 'STANDARD_V1' }
    act(() => {
      result.current.importCircuit({
        version: 1,
        components: [],
        wires: [],
        breadboards: [A, B],
        breadboard: LEGACY_DIFFERENT,
      })
    })
    expect(result.current.breadboards.map((b) => b.id)).toEqual(['canon-a', 'canon-b'])
    expect(result.current.breadboards.map((b) => b.id)).not.toContain('should-be-ignored')
  })
})

describe('L1-BREAD-002 — round-trip idempotence & assembly integrity (T9-T15, T20)', () => {
  function buildAssembly() {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const [A, B] = result.current.breadboards
    act(() => {
      // Positions dérivées de multiBreadboardPresentation.integration.test.jsx
      // (D15/D21-D27) : ancrage mécanique réel sur chaque carte via
      // computeMultiBreadboardPlacement (addComponent), pas de simulation
      // manuelle de l'ownership.
      result.current.addComponent('RESISTOR', A.position.x - 24 + 60, A.position.y + 22)
      result.current.addComponent('RESISTOR', B.position.x - 24 + 60, B.position.y + 22)
    })
    const onA = result.current.components[0]
    const onB = result.current.components[1]
    return { result, A, B, onA, onB }
  }

  it('T9/T20 — round-trip canonique à deux cartes : E2 === E1 (version, components, wires, breadboards)', () => {
    const { result } = buildAssembly()
    const E1 = result.current.exportCircuit()

    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()

    expect(E2.version).toBe(E1.version)
    expect(E2.components).toEqual(E1.components)
    expect(E2.wires).toEqual(E1.wires)
    expect(E2.breadboards).toEqual(E1.breadboards)
    expect(Object.prototype.hasOwnProperty.call(E2, 'breadboard')).toBe(false)
  })

  it('T10/T12 — composants et wire survivent exactement ; aucun component.breadboardId introduit', () => {
    const { result, onA, onB } = buildAssembly()
    act(() => { result.current.addWire(onA.uid, 'B', onB.uid, 'A') })
    const E1 = result.current.exportCircuit()

    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })

    expect(fresh.result.current.components).toEqual(E1.components)
    expect(fresh.result.current.wires).toEqual(E1.wires)
    expect(fresh.result.current.wires).toHaveLength(1)
    for (const c of fresh.result.current.components) {
      expect(Object.prototype.hasOwnProperty.call(c, 'breadboardId')).toBe(false)
    }
  })

  it('T11 — ownership mécanique après import reste DÉRIVÉ : chaque composant résout à sa vraie carte', () => {
    const { result, A, B, onA, onB } = buildAssembly()
    const E1 = result.current.exportCircuit()
    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()

    expect(ownerOf(E2, onA.uid)).toBe(A.id)
    expect(ownerOf(E2, onB.uid)).toBe(B.id)
  })

  it('T13 — un wire terminé sur un trou physique du breadboard[0] survit exactement (id/colonne/rangée, aucune conversion synthétique)', () => {
    const { result, A, onA } = buildAssembly()
    const hole = makeBreadboardHoleEndpoint(A.id, 5, 3)
    expect(hole).not.toBeNull()
    act(() => { result.current.addWire(hole.uid, BREADBOARD_HOLE_PIN_ID, onA.uid, 'A') })
    expect(result.current.wires).toHaveLength(1)

    const E1 = result.current.exportCircuit()
    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()

    const wire = E2.wires.find((w) => w.toUid === onA.uid || w.fromUid === onA.uid)
    expect(wire).toBeTruthy()
    const holeSide = wire.fromPin === BREADBOARD_HOLE_PIN_ID ? wire.fromUid : wire.toUid
    const parsed = parseBreadboardHoleEndpoint(holeSide, BREADBOARD_HOLE_PIN_ID)
    expect(parsed).toEqual({ breadboardId: A.id, column: 5, row: 3 })
  })

  it('T14 — connectivité électrique dérivée (bus) équivalente avant/après round-trip', () => {
    const { result } = buildAssembly()
    const E1 = result.current.exportCircuit()
    const edgesBefore = busEdges(E1)

    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()
    const edgesAfter = busEdges(E2)

    expect(edgesAfter).toEqual(edgesBefore)
  })

  it('T15 — deux cartes isolées restent isolées (bus) en l\'absence de wire explicite, avant et après round-trip', () => {
    const { result, A, B, onA, onB } = buildAssembly()
    const E1 = result.current.exportCircuit()
    for (const doc of [E1, (() => {
      const fresh = renderApi()
      act(() => { fresh.result.current.importCircuit(E1) })
      return fresh.result.current.exportCircuit()
    })()]) {
      const edges = busEdges(doc)
      for (const key of edges) {
        const [leftId, , rightId] = key.split('|')
        expect(ownerOf(doc, leftId)).toBe(ownerOf(doc, rightId))
      }
      expect(ownerOf(doc, onA.uid)).toBe(A.id)
      expect(ownerOf(doc, onB.uid)).toBe(B.id)
    }
  })

  it('T16 — une interconnexion explicite inter-cartes (wire composant-à-composant, forme supportée par le canal réel) reste effective après round-trip', () => {
    const { result, onA, onB } = buildAssembly()
    act(() => { result.current.addWire(onA.uid, 'B', onB.uid, 'A') })
    const E1 = result.current.exportCircuit()
    const edgesBefore = engineEdges(E1)
    expect(edgesBefore).toContain(`${onA.uid}.B<->${onB.uid}.A`)

    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()
    const edgesAfter = engineEdges(E2)

    expect(edgesAfter).toEqual(edgesBefore)
    expect(edgesAfter).toContain(`${onA.uid}.B<->${onB.uid}.A`)
  })
})

describe('L1-BREAD-002 — simulation equivalence (T17)', () => {
  function wireLedLoop(getApi) {
    act(() => {
      getApi().addComponent('POWER', 100, 100)
      getApi().addComponent('RESISTOR', 300, 100)
      getApi().addComponent('LED', 500, 100)
    })
    const power = getApi().components.find((c) => c.type === 'POWER')
    const resistor = getApi().components.find((c) => c.type === 'RESISTOR')
    const led = getApi().components.find((c) => c.type === 'LED')
    act(() => {
      getApi().addWire(power.uid, '5V', resistor.uid, 'A')
      getApi().addWire(resistor.uid, 'B', led.uid, 'anode')
      getApi().addWire(led.uid, 'cathode', power.uid, 'GND')
    })
    return { power, resistor, led }
  }

  it('T17 — un circuit déterministe déjà supporté (POWER-R-LED) produit le même résultat de simulation avant/après round-trip', () => {
    const before = renderApi()
    const { led: ledBefore } = wireLedLoop(() => before.result.current)
    act(() => { before.result.current.startSimulation() })
    const stateBefore = getLedState(ledBefore.uid, before.result.current.pinSignals)
    expect(stateBefore.on).toBe(true)

    const E1 = before.result.current.exportCircuit()

    const after = renderApi()
    act(() => { after.result.current.importCircuit(E1) })
    act(() => { after.result.current.startSimulation() })
    const ledAfter = after.result.current.components.find((c) => c.type === 'LED')
    const stateAfter = getLedState(ledAfter.uid, after.result.current.pinSignals)

    expect(stateAfter.on).toBe(stateBefore.on)
  })
})

describe('L1-BREAD-002 — import cleanup contract (T19)', () => {
  it('T19 — importCircuit() réinitialise la sélection/le pin en attente selon le contrat existant (pas de nouvelle sémantique)', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('LED', 200, 150)
    })
    act(() => { result.current.selectOnly({ type: 'component', id: result.current.components[0].uid }) })
    expect(result.current.selection.size).toBeGreaterThan(0)

    act(() => { result.current.importCircuit({ version: 1, components: [], wires: [], breadboards: [] }) })

    expect(result.current.selection.size).toBe(0)
    expect(result.current.pendingPin).toBeNull()
    expect(result.current.wireGesture).toBeNull()
  })
})
