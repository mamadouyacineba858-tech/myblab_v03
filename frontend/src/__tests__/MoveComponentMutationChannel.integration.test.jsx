/**
 * MoveComponentMutationChannel.integration.test.jsx
 * MB-CF3-003 (ruling CSA-CF3-003-MOVE-001, 2026-08-22, traçable dans
 * docs/pmo/tickets/MB-CF3-003.md §R) — Tests d'intégration réels du canal
 * de mutation cible pour le déplacement de composant(s) : useCircuitState ->
 * documentApi(getDocument/applyDocument) -> CommandBus -> MoveComponentHandler
 * -> HistoryService -> HistoryManager (historyManagerRef.current, instance
 * partagée avec les canaux ADD_COMPONENT/ADD_WIRE/UPDATE_WIRE_WAYPOINTS et
 * avec le canal legacy deleteSelection).
 *
 * Même patron que UpdateWireWaypointsMutationChannel.integration.test.jsx :
 * exerce le VRAI CommandRegistry de production (useCircuitState.js), pas un
 * registre local au test. Le drag est simulé via le VRAI flux pointer
 * (startDrag / window pointermove / window pointerup), sur le même patron
 * que le test drag de DeleteCommand.integration.test.jsx (wrapper avec
 * canvasRef réel attaché à un noeud DOM — startDrag no-op sans canvasRef).
 *
 * Contrat canonique de production (ruling §2/§6) : { moves: [{componentId,
 * fromPosition, toPosition}] }, toujours sous forme tableau (N=1 ET N>1).
 * Architecture dragPreview ≠ Document persistant (ruling §4) : pendant
 * pointermove, seul un aperçu Presentation (dragPreview/componentsForRender)
 * est mis à jour — le Document réel (exposé ici via exportCircuit(), qui lit
 * safeComponents/safeWires, jamais componentsForRender) ne doit subir aucune
 * mutation avant le dispatch MOVE_COMPONENT au pointerup.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { GRID_SIZE } from '../utils/grid.js'

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => useCircuit(), { wrapper })
}

function pointerDown(component) {
  const pointerDownEvent = {
    button: 0,
    clientX: component.x + 10,
    clientY: component.y + 10,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => {
    lastResult().startDrag(pointerDownEvent, component.uid)
  })
}

function pointerMove(component, { dx, dy = 0 }) {
  const pointerMoveEvent = new PointerEvent('pointermove', {
    clientX: component.x + 10 + dx,
    clientY: component.y + 10 + dy,
  })
  act(() => {
    window.dispatchEvent(pointerMoveEvent)
  })
}

function drag(component, { dx, dy = 0 }) {
  pointerDown(component)
  pointerMove(component, { dx, dy })
}

function pointerUp() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
}

// Helper indirection : `result` est capturé par référence dans les tests
// eux-mêmes (renderHook), ce petit module-level holder évite d'avoir à
// passer `result` à `drag()` explicitement à chaque appel.
let _result = null
function lastResult() {
  return _result.current
}

describe('MB-CF3-003 (CSA RULING CSA-CF3-003-MOVE-001 du 2026-08-22) — canal de mutation cible réel : MOVE_COMPONENT', () => {
  it('TEST 1 : un drag simple (composant unique) persiste via CommandBus — une seule entrée d\'historique', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]
    const undoCountBefore = result.current.getUndoCount()

    drag(component, { dx: 60, dy: 40 })
    pointerUp()

    const moved = result.current.components.find(c => c.uid === component.uid)
    expect(moved.x).not.toBe(component.x)
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
    expect(result.current.canUndo()).toBe(true)
  })

  it('TEST 2 : Undo restaure la position précédente, Redo restaure la position suivante', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]
    const initial = { x: component.x, y: component.y }

    drag(component, { dx: 80, dy: 20 })
    pointerUp()
    const afterDrag = { ...result.current.components.find(c => c.uid === component.uid) }
    expect(afterDrag).not.toEqual(initial)

    act(() => {
      result.current.undo()
    })
    const afterUndo = result.current.components.find(c => c.uid === component.uid)
    expect({ x: afterUndo.x, y: afterUndo.y }).toEqual(initial)

    act(() => {
      result.current.redo()
    })
    const afterRedo = result.current.components.find(c => c.uid === component.uid)
    expect({ x: afterRedo.x, y: afterRedo.y }).toEqual({ x: afterDrag.x, y: afterDrag.y })
  })

  it('TEST 3 (multi-sélection) : un drag groupé de N composants produit UNE SEULE entrée d\'historique — un seul Undo restaure toutes les positions, un seul Redo les réapplique toutes', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
      result.current.addComponent('CAPACITOR', 500, 100)
    })
    const [led, resistor, capacitor] = result.current.components
    const initialPositions = new Map(
      result.current.components.map(c => [c.uid, { x: c.x, y: c.y }])
    )

    // Sélectionner les trois composants (multi-sélection réelle).
    act(() => {
      result.current.toggleSelection({ type: 'component', id: led.uid })
      result.current.toggleSelection({ type: 'component', id: resistor.uid })
      result.current.toggleSelection({ type: 'component', id: capacitor.uid })
    })

    const undoCountBefore = result.current.getUndoCount()
    const selectionBefore = new Set(result.current.selection)

    // Démarrer le drag depuis un composant appartenant à la sélection : par
    // le contrat existant de startDrag (idsToDrag = sélection courante), les
    // trois composants sont déplacés ensemble.
    drag(led, { dx: 70, dy: 30 })
    pointerUp()

    // Une seule mutation persistante pour les trois déplacements.
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)

    const afterDrag = new Map(
      result.current.components.map(c => [c.uid, { x: c.x, y: c.y }])
    )
    // Les trois composants ont effectivement bougé.
    for (const [uid, pos] of afterDrag) {
      expect(pos).not.toEqual(initialPositions.get(uid))
    }

    // La sélection est préservée après le drag (aucun effet de bord sur la
    // sélection courante).
    expect(result.current.selection).toEqual(selectionBefore)

    // Un seul Undo suffit à tout restaurer.
    act(() => {
      result.current.undo()
    })
    for (const c of result.current.components) {
      expect({ x: c.x, y: c.y }).toEqual(initialPositions.get(c.uid))
    }
    // Un seul Undo a suffi (pas trois) : le compteur retombe exactement à sa
    // valeur d'avant le drag groupé (les 3 ADD_COMPONENT restent, eux,
    // annulables séparément — non concerné par ce test).
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
    expect(result.current.canRedo()).toBe(true)

    // Un seul Redo suffit à tout réappliquer.
    act(() => {
      result.current.redo()
    })
    for (const c of result.current.components) {
      expect({ x: c.x, y: c.y }).toEqual(afterDrag.get(c.uid))
    }
    expect(result.current.canRedo()).toBe(false)
  })

  it('TEST 4 : aucun dispatch persistant pendant pointermove — seul un aperçu local (déjà visible) existe avant le pointerup', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]
    const undoCountBefore = result.current.getUndoCount()

    // startDrag + pointermove uniquement, PAS de pointerup.
    drag(component, { dx: 90, dy: 10 })

    // L'aperçu local (dragPreview -> componentsForRender, non historisé) a
    // déjà bougé le composant visuellement...
    const preview = result.current.components.find(c => c.uid === component.uid)
    expect(preview.x).not.toBe(component.x)

    // ...mais aucune commande MOVE_COMPONENT n'a été dispatchée : aucune
    // nouvelle entrée d'historique tant que pointerup n'a pas eu lieu.
    expect(result.current.getUndoCount()).toBe(undoCountBefore)

    // Le pointerup, lui, doit déclencher le dispatch unique attendu.
    pointerUp()
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
  })

  it('TEST 5 : un drag sans déplacement net (position finale identique) ne dispatche rien — aucune entrée d\'historique fantôme', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]
    const undoCountBefore = result.current.getUndoCount()

    drag(component, { dx: 0, dy: 0 })
    pointerUp()

    expect(result.current.getUndoCount()).toBe(undoCountBefore)
  })

  it("TEST 6 (I-H5) : une nouvelle mutation après Undo invalide le redoStack", () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]

    drag(component, { dx: 60, dy: 60 })
    pointerUp()

    act(() => {
      result.current.undo()
    })
    expect(result.current.canRedo()).toBe(true)

    const afterUndo = result.current.components.find(c => c.uid === component.uid)
    drag(afterUndo, { dx: 20, dy: 20 })
    pointerUp()

    expect(result.current.canRedo()).toBe(false)
  })

  it('TEST 7 : MOVE_COMPONENT partage la même pile Undo/Redo que addComponent (CommandBus) et deleteSelection (canal legacy)', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
    })
    const [led, resistor] = result.current.components

    // 1. Déplacement (canal CommandBus, MOVE_COMPONENT)
    drag(led, { dx: 50, dy: 50 })
    pointerUp()
    const movedLed = { ...result.current.components.find(c => c.uid === led.uid) }
    expect(movedLed).not.toEqual({ ...led })

    // 2. Suppression via le canal legacy (deleteSelection/DeleteCommand)
    act(() => {
      result.current.toggleSelection({ type: 'component', id: resistor.uid })
    })
    act(() => {
      result.current.deleteSelection()
    })
    expect(result.current.components.length).toBe(1)

    // 3. Un premier Undo (pile partagée) annule la suppression (legacy).
    act(() => {
      result.current.undo()
    })
    expect(result.current.components.length).toBe(2)

    // 4. Un second Undo annule le déplacement (canal CommandBus).
    act(() => {
      result.current.undo()
    })
    const restoredLed = result.current.components.find(c => c.uid === led.uid)
    expect({ x: restoredLed.x, y: restoredLed.y }).toEqual({ x: led.x, y: led.y })

    // 5. Un troisième Undo annule l'ajout du RESISTOR (ADD_COMPONENT).
    act(() => {
      result.current.undo()
    })
    expect(result.current.components.length).toBe(1)
  })

  // ==========================================================================
  // TEST CRITIQUE (mandaté explicitement par le ruling CSA-CF3-003-MOVE-001,
  // §7) : « protège l'architecture contre une réintroduction future du bug ».
  // Prouve que pendant pointermove, le Document RÉEL (exportCircuit(), qui
  // lit safeComponents — jamais componentsForRender/dragPreview) reste
  // strictement inchangé, alors que l'aperçu (components, qui lit
  // componentsForRender) a, lui, changé visuellement. Seul le pointerup fait
  // réellement muter le Document.
  // ==========================================================================
  it('TEST 8 (test critique, ruling §7) : pointermove -> Document réel inchangé, dragPreview modifié ; pointerup -> Document réel effectivement modifié', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]
    const realBefore = result.current.exportCircuit().components.find(c => c.uid === component.uid)
    const realPositionBefore = { x: realBefore.x, y: realBefore.y }
    const undoCountBefore = result.current.getUndoCount()

    drag(component, { dx: 60, dy: 40 })

    // Pendant pointermove (avant pointerup) :
    // 1. Le Document réel (exportCircuit -> safeComponents) est STRICTEMENT
    //    inchangé.
    const realDuring = result.current.exportCircuit().components.find(c => c.uid === component.uid)
    expect({ x: realDuring.x, y: realDuring.y }).toEqual(realPositionBefore)

    // 2. L'aperçu (components -> componentsForRender) a, lui, changé.
    const previewDuring = result.current.components.find(c => c.uid === component.uid)
    expect({ x: previewDuring.x, y: previewDuring.y }).not.toEqual(realPositionBefore)

    // 3. Aucune nouvelle entrée d'historique n'a été créée (aucun dispatch).
    expect(result.current.getUndoCount()).toBe(undoCountBefore)

    pointerUp()

    // Après pointerup : le Document réel a maintenant réellement changé, et
    // correspond exactement à la position de l'aperçu observée pendant le
    // drag.
    const realAfter = result.current.exportCircuit().components.find(c => c.uid === component.uid)
    expect({ x: realAfter.x, y: realAfter.y }).toEqual({ x: previewDuring.x, y: previewDuring.y })
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
  })

  it('TEST 9 : le snap-to-grid est préservé pendant l\'aperçu de drag (dragPreview), identique au comportement pré-MB-CF3-003', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
    })
    const component = result.current.components[0]

    // Déplacement d'un delta volontairement non multiple de la grille.
    drag(component, { dx: 23, dy: 17 })

    const preview = result.current.components.find(c => c.uid === component.uid)
    // La position affichée doit être alignée sur la grille (snapToGrid),
    // exactement comme l'ancien chemin updateComponentPositions().
    expect(preview.x % GRID_SIZE).toBe(0)
    expect(preview.y % GRID_SIZE).toBe(0)

    pointerUp()
    const committed = result.current.components.find(c => c.uid === component.uid)
    // La position persistée après dispatch reste alignée sur la grille et
    // identique à l'aperçu observé juste avant le pointerup.
    expect({ x: committed.x, y: committed.y }).toEqual({ x: preview.x, y: preview.y })
  })

  it('TEST 10 : les wires suivent visuellement le composant déplacé pendant pointermove (wirePaths reflète l\'aperçu), sans muter le Document réel', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
    })
    const [led, resistor] = result.current.components
    act(() => {
      result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
    })

    const wirePathsBefore = result.current.wirePaths
    expect(wirePathsBefore.length).toBeGreaterThan(0)
    const pathBefore = wirePathsBefore[0]
    const undoCountBefore = result.current.getUndoCount()

    drag(led, { dx: 60, dy: 40 })

    // Pendant pointermove : la géométrie du wire a changé visuellement
    // (calculée à partir de componentsForRender)...
    const wirePathsDuring = result.current.wirePaths
    const pathDuring = wirePathsDuring[0]
    expect(pathDuring.d).not.toBe(pathBefore.d)

    // ...alors qu'aucune mutation persistante n'a encore eu lieu (aucune
    // nouvelle entrée d'historique).
    expect(result.current.getUndoCount()).toBe(undoCountBefore)

    pointerUp()
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
  })

  it('TEST 11 : un drag de composant n\'affecte pas un waypoint de wire existant (aucune interférence entre dragPreview et waypointPreview)', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
    })
    const [led, resistor] = result.current.components
    act(() => {
      result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
    })
    const wireId = result.current.wires[0].id
    act(() => {
      result.current.updateWireWaypoints(wireId, [{ x: 200, y: 150 }])
    })
    const waypointsBefore = result.current.wires.find(w => w.id === wireId).waypoints

    drag(led, { dx: 40, dy: 20 })
    pointerUp()

    const waypointsAfter = result.current.wires.find(w => w.id === wireId).waypoints
    expect(waypointsAfter).toEqual(waypointsBefore)
  })

  // ==========================================================================
  // TEST 12 (CSA FINAL AUDIT §6) : combinaison exacte demandée — pour N=3,
  // pointerup -> exactement 1 entrée History ; Undo -> les 3 composants
  // reviennent exactement à fromPosition ; Redo -> les 3 composants
  // reviennent exactement à toPosition ; puis Undo -> nouvelle action ->
  // canRedo() === false (I-H5, vérifié ici spécifiquement pour N=3, et non
  // seulement pour N=1 comme dans TEST 6).
  // ==========================================================================
  it('TEST 12 (CSA FINAL AUDIT §6, N=3) : 1 entrée History pour le drag groupé, Undo/Redo exacts sur les 3 composants, puis une nouvelle action après Undo invalide canRedo()', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addComponent('LED', 100, 100)
      result.current.addComponent('RESISTOR', 300, 100)
      result.current.addComponent('CAPACITOR', 500, 100)
    })
    const [led, resistor, capacitor] = result.current.components
    const fromPositions = new Map(
      result.current.components.map(c => [c.uid, { x: c.x, y: c.y }])
    )
    act(() => {
      result.current.toggleSelection({ type: 'component', id: led.uid })
      result.current.toggleSelection({ type: 'component', id: resistor.uid })
      result.current.toggleSelection({ type: 'component', id: capacitor.uid })
    })
    const undoCountBefore = result.current.getUndoCount()

    drag(led, { dx: 70, dy: 30 })
    pointerUp()

    // Exactement 1 entrée History pour les 3 déplacements.
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
    const toPositions = new Map(
      result.current.components.map(c => [c.uid, { x: c.x, y: c.y }])
    )

    // Undo -> les 3 composants reviennent EXACTEMENT à fromPosition.
    act(() => {
      result.current.undo()
    })
    for (const c of result.current.components) {
      expect({ x: c.x, y: c.y }).toEqual(fromPositions.get(c.uid))
    }
    expect(result.current.canRedo()).toBe(true)

    // Redo -> les 3 composants reviennent EXACTEMENT à toPosition.
    act(() => {
      result.current.redo()
    })
    for (const c of result.current.components) {
      expect({ x: c.x, y: c.y }).toEqual(toPositions.get(c.uid))
    }

    // Undo à nouveau, puis une nouvelle action (nouveau drag du groupe) ->
    // canRedo() === false (I-H5, pour N=3).
    act(() => {
      result.current.undo()
    })
    expect(result.current.canRedo()).toBe(true)

    const afterSecondUndo = result.current.components.find(c => c.uid === led.uid)
    drag(afterSecondUndo, { dx: 15, dy: 5 })
    pointerUp()

    expect(result.current.canRedo()).toBe(false)
  })
})
