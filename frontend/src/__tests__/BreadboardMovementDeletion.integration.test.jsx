/**
 * BreadboardMovementDeletion.integration.test.jsx — MB-BREADBOARD-006
 * (CSA Ruling — Option B, traçable dans docs/pmo/tickets/MB-BREADBOARD-006.md).
 *
 * Pipeline RÉEL (CircuitProvider, VRAI CommandRegistry de production, VRAI
 * ValidationEngine, VRAI flux pointer) — même patron que
 * PowerRailPhysicalPlacement.integration.test.jsx (MB-BREADBOARD-005) et
 * BreadboardInsertionMutationChannel.integration.test.jsx (MB-BREADBOARD-003),
 * réutilisé ici pour prouver que le breadboard lui-même est désormais un
 * objet Canvas gouverné : sélectionnable, déplaçable (avec translation
 * solidaire des composants insérés — Ruling §1/§4), supprimable (Ruling
 * §7), le tout intégré au SEUL CommandBus/History/sélection existants
 * (Ruling §11/§12 — aucun second système).
 *
 * Composants de référence : POWER (rail bas, géométrie MB-BREADBOARD-005),
 * RESISTOR et LED (bande haute, mêmes coordonnées cibles que
 * PowerRailPhysicalPlacement.integration.test.jsx POWER-07/08/09) — repris
 * tels quels pour bénéficier d'une géométrie déjà prouvée, plutôt que
 * déduits à la main pour ce nouveau fichier.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { getLedState } from '../simulator/engine.js'

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

// Même patron que PowerRailPhysicalPlacement.integration.test.jsx : le
// noeud canvas de test n'a pas de position CSS (getBoundingClientRect ->
// tout à zéro sous jsdom), donc la coordonnée canvas d'un pointeur est
// directement son clientX/clientY.
let _result = null
function lastResult() {
  return _result.current
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

function pointerMoveAt(x, y, { dx, dy = 0 }) {
  const pointerMoveEvent = new PointerEvent('pointermove', {
    clientX: x + 10 + dx,
    clientY: y + 10 + dy,
  })
  act(() => {
    window.dispatchEvent(pointerMoveEvent)
  })
}

function drag(component, { dx, dy = 0 }) {
  pointerDown(component)
  pointerMoveAt(component.x, component.y, { dx, dy })
}

function pointerUp() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
}

// MB-BREADBOARD-006 : équivalents de pointerDown/drag ci-dessus, pour le
// breadboard lui-même (position.x/position.y, pas x/y — startBreadboardDrag,
// pas startDrag). Même modèle delta que le drag de composant (useCircuitState.js
// handlePointerMove : raw = startX + deltaX).
function pointerDownOnBreadboard(breadboard) {
  const pointerDownEvent = {
    button: 0,
    clientX: breadboard.position.x + 10,
    clientY: breadboard.position.y + 10,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => {
    lastResult().startBreadboardDrag(pointerDownEvent)
  })
}

function dragBreadboard(breadboard, { dx, dy = 0 }) {
  pointerDownOnBreadboard(breadboard)
  pointerMoveAt(breadboard.position.x, breadboard.position.y, { dx, dy })
}

function isLedOn(result, ledUid) {
  const pinSignals = result.current.pinSignals
  return getLedState(ledUid, pinSignals).on
}

describe('MB-BREADBOARD-006 — Breadboard objet Canvas gouverné (CSA Ruling — Option B)', () => {
  it('Scénario A : sélection + drag du breadboard seul (aucun composant) — position, Undo, Redo (§10.A du Ruling)', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addBreadboard(0, 0)
    })
    const breadboardBefore = result.current.breadboard
    expect(breadboardBefore.position).toEqual({ x: 0, y: 0 })

    act(() => {
      result.current.selectOnly({ type: 'breadboard', id: breadboardBefore.id })
    })
    expect(result.current.selection.has(`breadboard:${breadboardBefore.id}`)).toBe(true)

    dragBreadboard(breadboardBefore, { dx: 24, dy: 24 })
    pointerUp()

    const afterDrag = result.current.breadboard
    expect(afterDrag.position).toEqual({ x: 24, y: 24 })
    expect(afterDrag.id).toBe(breadboardBefore.id)

    act(() => {
      result.current.undo()
    })
    expect(result.current.breadboard.position).toEqual({ x: 0, y: 0 })

    act(() => {
      result.current.redo()
    })
    expect(result.current.breadboard.position).toEqual({ x: 24, y: 24 })
  })

  it('Scénario B : POWER (rail) + RESISTOR + LED montés sur le breadboard — le drag du breadboard les translate TOUS solidairement, mêmes trous relatifs, mêmes nets, simulation identique (§10.B/§11 du Ruling)', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addBreadboard(0, 0)
      // Géométrie reprise telle quelle de PowerRailPhysicalPlacement.
      // integration.test.jsx (POWER-07/08/09), déjà prouvée : POWER sur le
      // rail bas, RESISTOR/LED sur la bande haute.
      result.current.addComponent('POWER', 2, 155)
      result.current.addComponent('RESISTOR', 58, 21)
      result.current.addComponent('LED', 144, 28)
    })

    const power = result.current.components.find((c) => c.type === 'POWER')
    const resistor = result.current.components.find((c) => c.type === 'RESISTOR')
    const led = result.current.components.find((c) => c.type === 'LED')

    act(() => {
      result.current.addWire(power.uid, '5V', resistor.uid, 'A')
      result.current.addWire(led.uid, 'cathode', power.uid, 'GND')
    })

    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(true)
    act(() => {
      result.current.stopSimulation()
    })

    const breadboardBefore = result.current.breadboard
    const DELTA = 36 // multiple de BREADBOARD_PITCH (12), non ambigu.

    act(() => {
      result.current.selectOnly({ type: 'breadboard', id: breadboardBefore.id })
    })
    dragBreadboard(breadboardBefore, { dx: DELTA, dy: DELTA })
    pointerUp()

    // Breadboard ET les trois composants translatés du MÊME delta —
    // topologie relative inchangée (AC-06).
    expect(result.current.breadboard.position).toEqual({ x: DELTA, y: DELTA })
    const powerAfter = result.current.components.find((c) => c.uid === power.uid)
    const resistorAfter = result.current.components.find((c) => c.uid === resistor.uid)
    const ledAfter = result.current.components.find((c) => c.uid === led.uid)
    expect({ x: powerAfter.x, y: powerAfter.y }).toEqual({ x: power.x + DELTA, y: power.y + DELTA })
    expect({ x: resistorAfter.x, y: resistorAfter.y }).toEqual({ x: resistor.x + DELTA, y: resistor.y + DELTA })
    expect({ x: ledAfter.x, y: ledAfter.y }).toEqual({ x: led.x + DELTA, y: led.y + DELTA })

    // Les wires explicites (non liés à la position) sont toujours là —
    // aucune donnée perdue par la translation.
    expect(result.current.wires.length).toBe(2)

    // Simulation après déplacement : résultat identique (§11 du Ruling —
    // critère absolu). Le bus breadboard RESISTOR.B<->LED.anode (aucun wire
    // explicite) doit toujours fonctionner, preuve que la connectivité
    // relative n'a pas été cassée par le déplacement.
    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(true)
  })

  it('Scénario B (bis) : un composant NON inséré sur le breadboard ne bouge PAS quand le breadboard est déplacé (INV-04)', () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('POWER', 700, 200) // hors empreinte (AC-05).
    })
    const power = result.current.components[0]
    const breadboard = result.current.breadboard

    act(() => {
      result.current.selectOnly({ type: 'breadboard', id: breadboard.id })
    })
    dragBreadboard(breadboard, { dx: 24, dy: 24 })
    pointerUp()

    expect(result.current.breadboard.position).toEqual({ x: 24, y: 24 })
    const powerAfter = result.current.components.find((c) => c.uid === power.uid)
    expect({ x: powerAfter.x, y: powerAfter.y }).toEqual({ x: power.x, y: power.y })
  })

  it("Scénario C : sélection du breadboard + suppression — disparition, composants/wires intacts, Undo restaure, Redo re-supprime (§10.C du Ruling)", () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('RESISTOR', 58, 21)
    })
    const resistor = result.current.components[0]
    const breadboard = result.current.breadboard

    act(() => {
      result.current.selectOnly({ type: 'breadboard', id: breadboard.id })
    })
    act(() => {
      result.current.deleteSelection()
    })

    expect(result.current.breadboard).toBeNull()
    // Aucune suppression silencieuse (§7 du Ruling) : le composant qui
    // était posé dessus reste présent, à sa position telle quelle.
    const resistorAfterDelete = result.current.components.find((c) => c.uid === resistor.uid)
    expect(resistorAfterDelete).toBeDefined()
    expect({ x: resistorAfterDelete.x, y: resistorAfterDelete.y }).toEqual({ x: resistor.x, y: resistor.y })
    // Sélection vidée après suppression.
    expect(result.current.selection.size).toBe(0)

    act(() => {
      result.current.undo()
    })
    expect(result.current.breadboard).not.toBeNull()
    expect(result.current.breadboard.id).toBe(breadboard.id)
    expect(result.current.breadboard.position).toEqual(breadboard.position)

    act(() => {
      result.current.redo()
    })
    expect(result.current.breadboard).toBeNull()
  })

  it("une seule entrée d'historique pour le drag solidaire (breadboard + 2 composants) — un seul Undo suffit à tout restaurer (§2 du Ruling)", () => {
    const { result } = renderWithCanvas()
    _result = result

    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('RESISTOR', 58, 21)
      result.current.addComponent('LED', 144, 28)
    })
    // Positions RÉELLES lues après résolution par computeBreadboardPlacement()
    // (jamais déduites à la main — même discipline que
    // PowerRailPhysicalPlacement.integration.test.jsx).
    const resistorBefore = { ...result.current.components.find((c) => c.type === 'RESISTOR') }
    const ledBefore = { ...result.current.components.find((c) => c.type === 'LED') }
    const undoCountBefore = result.current.getUndoCount()
    const breadboard = result.current.breadboard

    act(() => {
      result.current.selectOnly({ type: 'breadboard', id: breadboard.id })
    })
    dragBreadboard(breadboard, { dx: 24, dy: 24 })
    pointerUp()

    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)

    act(() => {
      result.current.undo()
    })
    expect(result.current.breadboard.position).toEqual({ x: 0, y: 0 })
    expect(result.current.components.find((c) => c.type === 'RESISTOR')).toMatchObject({ x: resistorBefore.x, y: resistorBefore.y })
    expect(result.current.components.find((c) => c.type === 'LED')).toMatchObject({ x: ledBefore.x, y: ledBefore.y })
  })
})
