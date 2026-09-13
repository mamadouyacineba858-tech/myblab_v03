/**
 * L1Wire001MultiBreadboardWireValidation.integration.test.jsx — L1-WIRE-001
 * "Canonical Multi-Breadboard Wire Endpoint Validation & Product-Path
 * Integrity".
 *
 * Pipeline RÉEL (CircuitProvider, vrai CommandBus/CommandRegistry/
 * ValidationEngine/HistoryService, vrai exportCircuit/importCircuit, vrai
 * onPinClick, vrai rendu <SimulationCanvas> pour le test produit T16/W5).
 * Les tests de matrice unitaire STR-003/STR-005 (Gates W2/W3) vivent dans
 * structuralRules.test.js (déjà le fichier conventionnel pour ces règles) ;
 * ce fichier couvre exclusivement ce qu'un appel direct à
 * WirePinsExistRule.validate(...) ne peut pas prouver : le chemin produit
 * (W4-W9), notamment le gap fermé par ce ticket (T16, ex L1-BREAD-002 N/A).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { SimulationCanvas } from '../canvas/SimulationCanvas.jsx'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'
import { deriveBreadboardVirtualWires } from '../utils/breadboardConnectivity.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from '../utils/breadboardWireEndpoint.js'

const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

function renderApi() {
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

function renderCanvas() {
  const canvasRef = React.createRef()
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const wrapperCanvas = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(n) => { canvasRef.current = n }}>{children}</div>
    </CircuitProvider>
  )
  const utils = render(<><Probe /><SimulationCanvas /></>, { wrapper: wrapperCanvas })
  return { ...utils, getApi: () => api }
}

/** Localise le <circle> réel (BreadboardWireEndpoints.jsx, non modifié) du trou (column,row) d'un breadboard donné. */
function findHoleCircle(container, breadboard, column, row) {
  const svgs = [...container.querySelectorAll('svg.breadboard-wire-endpoints')]
  const svg = svgs.find((el) => parseFloat(el.style.left) === breadboard.position.x - BREADBOARD_PITCH)
  if (!svg) return null
  const cx = column * BREADBOARD_PITCH + BREADBOARD_PITCH
  const cy = row * BREADBOARD_PITCH + BREADBOARD_PITCH
  return [...svg.querySelectorAll('circle')].find(
    (c) => Number(c.getAttribute('cx')) === cx && Number(c.getAttribute('cy')) === cy
  ) || null
}

function busEdges(exported) {
  const core = ReactDocumentMapper.toCore(exported)
  const edges = deriveBreadboardVirtualWires({
    breadboards: core.breadboards,
    components: core.components,
    wires: core.wires,
  })
  return edges
    .map((w) => [w.pinA.componentId, w.pinA.pinId, w.pinB.componentId, w.pinB.pinId].join('|'))
    .sort()
}

describe('L1-WIRE-001 — Gate W4 : le wire ADD_WIRE proposé est vu par la Validation pré-exécution', () => {
  it('W4.1 ADD_WIRE component↔component valide → PASS', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
    })
    const led = result.current.components.find((c) => c.type === 'LED')
    const resistor = result.current.components.find((c) => c.type === 'RESISTOR')
    act(() => { result.current.addWire(led.uid, 'anode', resistor.uid, 'A') })
    expect(result.current.wires).toHaveLength(1)
  })

  it('W4.2 ADD_WIRE component↔hole (board réel) → PASS', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('RESISTOR', 36, 22)
    })
    const board = result.current.breadboards[0]
    const resistor = result.current.components[0]
    const hole = { uid: `__breadboard_hole__:${encodeURIComponent(board.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    act(() => { result.current.addWire(hole.uid, hole.pinId, resistor.uid, 'A') })
    expect(result.current.wires).toHaveLength(1)
  })

  it('W4.4 ADD_WIRE pin inexistant → REJECT avant Handler (Document inchangé)', () => {
    const { result } = renderApi()
    act(() => { result.current.addComponent('LED', 100, 100) })
    const led = result.current.components[0]
    const undoCountBefore = result.current.getUndoCount()
    act(() => { result.current.addWire(led.uid, 'anode', led.uid, 'pin_inexistant') })
    expect(result.current.wires).toHaveLength(0)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
  })

  it('W4.5 ADD_WIRE référençant un breadboard inexistant → REJECT avant Handler', () => {
    const { result } = renderApi()
    act(() => { result.current.addComponent('LED', 100, 100) })
    const led = result.current.components[0]
    const ghostHole = { uid: '__breadboard_hole__:no-such-board:5:3', pinId: '__BREADBOARD_HOLE__' }
    const undoCountBefore = result.current.getUndoCount()
    act(() => { result.current.addWire(led.uid, 'anode', ghostHole.uid, ghostHole.pinId) })
    expect(result.current.wires).toHaveLength(0)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
  })

  it('W4.6 ADD_WIRE référençant un trou hors géométrie réelle → REJECT avant Handler', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('LED', 100, 100)
    })
    const board = result.current.breadboards[0]
    const led = result.current.components[0]
    const outOfBounds = { uid: `__breadboard_hole__:${encodeURIComponent(board.id)}:999:999`, pinId: '__BREADBOARD_HOLE__' }
    const undoCountBefore = result.current.getUndoCount()
    act(() => { result.current.addWire(led.uid, 'anode', outOfBounds.uid, outOfBounds.pinId) })
    expect(result.current.wires).toHaveLength(0)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
  })

  it('W4.7/W4.8 un rejet laisse le Document et l\'historique structurellement inchangés', () => {
    const { result } = renderApi()
    act(() => { result.current.addComponent('LED', 100, 100) })
    const led = result.current.components[0]
    const before = result.current.exportCircuit()
    const undoCountBefore = result.current.getUndoCount()

    act(() => { result.current.addWire(led.uid, 'anode', 'totally-bogus-uid', 'nonexistent-pin') })

    expect(result.current.exportCircuit()).toEqual(before)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
    expect(result.current.canRedo()).toBe(false)
  })
})

describe('L1-WIRE-001 — Gate W5/T16 : chemin produit réel hole↔hole inter-breadboard', () => {
  it('T16 — deux clics réels sur les trous rendus de A puis B (BreadboardWireEndpoints.jsx, onPinClick) créent un wire A↔B persisté', () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addBreadboard(480, 0)
    })
    const [boardA, boardB] = getApi().breadboards
    expect(boardA.id).not.toBe(boardB.id)
    // Un composant réel occupe le MÊME trou (col5/row3) sur chaque carte —
    // convention déjà validée par multiBreadboardPresentation.integration.test.jsx
    // (D15/D21-D27) — pour que la connectivité dérivée (item 10) ait deux
    // groupes non vides à unir via le wire trou↔trou.
    act(() => {
      getApi().addComponent('RESISTOR', boardA.position.x + 60, boardA.position.y + 22)
      getApi().addComponent('RESISTOR', boardB.position.x + 60, boardB.position.y + 22)
    })
    const onA = getApi().components[0]
    const onB = getApi().components[1]

    const circleA = findHoleCircle(container, boardA, 5, 3)
    const circleB = findHoleCircle(container, boardB, 5, 3)
    expect(circleA).toBeTruthy()
    expect(circleB).toBeTruthy()

    const undoCountBefore = getApi().getUndoCount()
    act(() => { circleA.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    // 1. Le premier clic arme pendingPin sur le trou EXACT de A (id encodé).
    const parsedPending = parseBreadboardHoleEndpoint(getApi().pendingPin?.uid, getApi().pendingPin?.pinId)
    expect(parsedPending).toEqual({ breadboardId: boardA.id, column: 5, row: 3 })

    act(() => { circleB.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

    // 3/4. ADD_WIRE a réellement été dispatché et accepté par la Validation.
    expect(getApi().getUndoCount()).toBe(undoCountBefore + 1)
    // 5. Un seul wire persiste.
    expect(getApi().wires).toHaveLength(1)
    const persisted = getApi().wires[0]

    // 2/6. Les deux endpoints exacts (id A, id B) sont conservés.
    const endA = parseBreadboardHoleEndpoint(persisted.fromUid, persisted.fromPin)
    const endB = parseBreadboardHoleEndpoint(persisted.toUid, persisted.toPin)
    expect(endA).toEqual({ breadboardId: boardA.id, column: 5, row: 3 })
    expect(endB).toEqual({ breadboardId: boardB.id, column: 5, row: 3 })

    // 7. Aucun component.breadboardId n'a été créé.
    for (const c of getApi().components) {
      expect(Object.prototype.hasOwnProperty.call(c, 'breadboardId')).toBe(false)
    }

    // 8. Aucun réseau dérivé n'est sérialisé dans l'export.
    const exported = getApi().exportCircuit()
    expect(Object.prototype.hasOwnProperty.call(exported, 'breadboard')).toBe(false)
    expect(exported.wires).toEqual([{ id: persisted.id, fromUid: persisted.fromUid, fromPin: persisted.fromPin, toUid: persisted.toUid, toPin: persisted.toPin, waypoints: [] }])

    // 9. Le rendu du wire existe : un endpoint-trou n'est jamais un composant
    // réel (byUid.get() dans buildWirePaths/WiresLayer échoue à dessein), il
    // est donc rendu par la couche dédiée BreadboardWiresLayer.jsx (non
    // modifiée par ce ticket, F7) — vérifié ici au niveau DOM réel.
    expect(container.querySelectorAll(`svg.wires-layer--breadboard path[aria-label="${persisted.id}"]`)).toHaveLength(1)

    // 10. La connectivité dérivée relie les deux groupes UNIQUEMENT grâce à ce wire :
    // onA (carte A) et onB (carte B) apparaissent dans la même arête dérivée.
    const edges = busEdges(exported)
    const sameGroup = edges.some((key) => {
      const ids = key.split('|')
      return ids.includes(onA.uid) && ids.includes(onB.uid)
    })
    expect(sameGroup).toBe(true)
  })
})

describe('L1-WIRE-001 — Gate W6 : isolation sans wire explicite', () => {
  it('deux breadboards possédant un composant à la même position relative restent électriquement isolés', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const [boardA, boardB] = result.current.breadboards
    act(() => {
      result.current.addComponent('RESISTOR', boardA.position.x + 60, boardA.position.y + 22)
      result.current.addComponent('RESISTOR', boardB.position.x + 60, boardB.position.y + 22)
    })
    const exported = result.current.exportCircuit()
    const edges = busEdges(exported)
    // Aucune arête ne doit jamais relier un composant de A à un composant de B.
    const onA = result.current.components[0].uid
    const onB = result.current.components[1].uid
    for (const key of edges) {
      const ids = key.split('|')
      const involvesA = ids.includes(onA)
      const involvesB = ids.includes(onB)
      expect(involvesA && involvesB).toBe(false)
    }
  })
})

describe('L1-WIRE-001 — Gate W7 : connectivité avec wire explicite trou↔trou', () => {
  it('un wire explicite trou A↔trou B unit les deux groupes (union électrique), sans le sérialiser', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const [boardA, boardB] = result.current.breadboards
    act(() => {
      result.current.addComponent('RESISTOR', boardA.position.x + 60, boardA.position.y + 22)
      result.current.addComponent('RESISTOR', boardB.position.x + 60, boardB.position.y + 22)
    })
    const onA = result.current.components[0]
    const onB = result.current.components[1]
    const holeA = { uid: `__breadboard_hole__:${encodeURIComponent(boardA.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    const holeB = { uid: `__breadboard_hole__:${encodeURIComponent(boardB.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    act(() => { result.current.addWire(holeA.uid, holeA.pinId, holeB.uid, holeB.pinId) })
    expect(result.current.wires).toHaveLength(1)

    const exported = result.current.exportCircuit()
    // Le wire persisté encode les DEUX trous, jamais une topologie dérivée.
    expect(exported.wires[0].fromUid).toBe(holeA.uid)
    expect(exported.wires[0].toUid).toBe(holeB.uid)

    const edges = busEdges(exported)
    const sameGroup = edges.some((key) => {
      const ids = key.split('|')
      return ids.includes(onA.uid) && ids.includes(onB.uid)
    })
    expect(sameGroup).toBe(true)
  })
})

describe('L1-WIRE-001 — Gate W8 : undo/redo sur un wire inter-breadboard', () => {
  it('undo retire le wire, redo le restaure avec exactement les mêmes endpoints A/B ; une nouvelle action invalide le redo', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const [boardA, boardB] = result.current.breadboards
    const holeA = { uid: `__breadboard_hole__:${encodeURIComponent(boardA.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    const holeB = { uid: `__breadboard_hole__:${encodeURIComponent(boardB.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }

    const undoCountBeforeWire = result.current.getUndoCount()
    act(() => { result.current.addWire(holeA.uid, holeA.pinId, holeB.uid, holeB.pinId) })
    expect(result.current.wires).toHaveLength(1)
    expect(result.current.getUndoCount()).toBe(undoCountBeforeWire + 1)

    act(() => { result.current.undo() })
    expect(result.current.wires).toHaveLength(0)
    expect(result.current.canRedo()).toBe(true)

    act(() => { result.current.redo() })
    expect(result.current.wires).toHaveLength(1)
    expect(result.current.wires[0].fromUid).toBe(holeA.uid)
    expect(result.current.wires[0].toUid).toBe(holeB.uid)

    act(() => { result.current.undo() })
    act(() => { result.current.addBreadboard(960, 0) })
    expect(result.current.canRedo()).toBe(false)
    expect(result.current.wires).toHaveLength(0)
    expect(result.current.breadboards).toHaveLength(3)
  })
})

describe('L1-WIRE-001 — Gate W9 : round-trip export/import/export du wire inter-breadboard', () => {
  it('breadboardId/column/row des deux extrémités survivent exactement ; aucun singleton ni topologie ajoutés', () => {
    const { result } = renderApi()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(480, 0)
    })
    const [boardA, boardB] = result.current.breadboards
    const holeA = { uid: `__breadboard_hole__:${encodeURIComponent(boardA.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    const holeB = { uid: `__breadboard_hole__:${encodeURIComponent(boardB.id)}:5:3`, pinId: '__BREADBOARD_HOLE__' }
    act(() => { result.current.addWire(holeA.uid, holeA.pinId, holeB.uid, holeB.pinId) })

    const E1 = result.current.exportCircuit()
    const fresh = renderApi()
    act(() => { fresh.result.current.importCircuit(E1) })
    const E2 = fresh.result.current.exportCircuit()

    expect(E2).toEqual(E1)
    expect(Object.prototype.hasOwnProperty.call(E2, 'breadboard')).toBe(false)

    const endA = parseBreadboardHoleEndpoint(E2.wires[0].fromUid, E2.wires[0].fromPin)
    const endB = parseBreadboardHoleEndpoint(E2.wires[0].toUid, E2.wires[0].toPin)
    expect(endA).toEqual({ breadboardId: boardA.id, column: 5, row: 3 })
    expect(endB).toEqual({ breadboardId: boardB.id, column: 5, row: 3 })

    for (const c of fresh.result.current.components) {
      expect(Object.prototype.hasOwnProperty.call(c, 'breadboardId')).toBe(false)
    }
  })
})
