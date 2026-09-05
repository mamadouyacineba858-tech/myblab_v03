/**
 * UpdateWireWaypointsMutationChannel.integration.test.jsx
 * MB-VIS-005 (CSA RULING — AUTORISATION DE REPRISE MB-VIS-005, 2026-08-21) —
 * Tests d'intégration réels du canal de mutation cible pour
 * updateWireWaypoints : useCircuitState -> documentApi(getDocument/
 * applyDocument) -> CommandBus -> UpdateWireWaypointsHandler ->
 * HistoryService -> HistoryManager (historyManagerRef.current, instance
 * partagée avec les canaux ADD_COMPONENT/ADD_WIRE et avec le canal legacy).
 *
 * Portée : updateWireWaypoints uniquement (ce ruling). Aucune invention
 * d'API — dérivé exclusivement de ReactDocumentMapper, CommandBus,
 * CommandRegistry, UpdateWireWaypointsHandler déjà existants (Mission
 * MB-VIS-005-IMPLEMENTATION, commit ab8f1bf). Même patron que
 * AddWireMutationChannel.integration.test.jsx (MB-CF3-002), à la différence
 * IMPORTANTE que ce test-ci exerce le VRAI CommandRegistry de production
 * (useCircuitState.js) et non un registre local au test — c'est précisément
 * ce que ce ruling autorise et que MBVIS005WaypointsMutationChannel.
 * integration.test.js (Mission A) ne pouvait pas encore prouver.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'

const wrapper = ({ children }) => (
    <CircuitProvider>{children}</CircuitProvider>
)

function addTwoComponentsAndWire(result) {
    act(() => {
        result.current.addComponent('LED', 100, 100)
        result.current.addComponent('RESISTOR', 300, 100)
    })
    const led = result.current.components.find(c => c.type === 'LED')
    const resistor = result.current.components.find(c => c.type === 'RESISTOR')

    act(() => {
        result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
    })
    const wire = result.current.wires[0]
    return { led, resistor, wire }
}

describe('MB-VIS-005 (CSA RULING du 2026-08-21) — canal de mutation cible réel : updateWireWaypoints', () => {
    it('TEST 1 : updateWireWaypoints (canal CommandBus de production) remplace atomiquement le tableau waypoints du wire ciblé', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)

        expect(wire.waypoints).toEqual([])

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 10, y: 20 }, { x: 30, y: 40 }])
        })

        const updated = result.current.wires.find(w => w.id === wire.id)
        expect(updated.waypoints).toEqual([{ x: 10, y: 20 }, { x: 30, y: 40 }])
        // pinA/pinB (fromUid/fromPin/toUid/toPin côté React) ne sont pas affectés.
        expect(updated.fromUid).toBe(wire.fromUid)
        expect(updated.toUid).toBe(wire.toUid)
    })

    it('TEST 2 : updateWireWaypoints est historisé — Undo restaure le tableau précédent, Redo le tableau suivant', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 1, y: 1 }])
        })
        expect(result.current.wires.find(w => w.id === wire.id).waypoints).toEqual([{ x: 1, y: 1 }])
        expect(result.current.canUndo()).toBe(true)

        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.find(w => w.id === wire.id).waypoints).toEqual([])
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.redo()
        })
        expect(result.current.wires.find(w => w.id === wire.id).waypoints).toEqual([{ x: 1, y: 1 }])
    })

    it('TEST 3 : updateWireWaypoints partage la même pile Undo/Redo que addComponent/addWire (CommandBus) et deleteSelection (canal legacy)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)

        // 1. Une mutation de waypoints (canal CommandBus, UPDATE_WIRE_WAYPOINTS)
        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 5, y: 5 }])
        })
        expect(result.current.wires[0].waypoints).toEqual([{ x: 5, y: 5 }])

        // 2. Suppression du fil via le canal legacy (deleteSelection/DeleteCommand)
        act(() => {
            result.current.toggleSelection({ type: 'wire', id: result.current.wires[0].id })
        })
        act(() => {
            result.current.deleteSelection()
        })
        expect(result.current.wires.length).toBe(0)

        // 3. Un premier Undo (pile partagée) annule la suppression (legacy) —
        // le fil réapparaît avec ses waypoints intacts.
        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.length).toBe(1)
        expect(result.current.wires[0].waypoints).toEqual([{ x: 5, y: 5 }])

        // 4. Un second Undo annule la mutation de waypoints (canal CommandBus).
        act(() => {
            result.current.undo()
        })
        expect(result.current.wires[0].waypoints).toEqual([])

        // 5. Un troisième Undo annule l'ajout du fil (ADD_WIRE).
        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.length).toBe(0)
        expect(result.current.components.length).toBe(2)
    })

    it("TEST 4 (I-H5) : une nouvelle mutation après Undo invalide le redoStack", () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 1, y: 1 }])
        })
        act(() => {
            result.current.undo()
        })
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 2, y: 2 }])
        })
        expect(result.current.canRedo()).toBe(false)
        expect(result.current.wires[0].waypoints).toEqual([{ x: 2, y: 2 }])
    })

    it('TEST 5 : un wireId inconnu ne dispatche rien (garde côté hook) — aucune commande fantôme dans l\'historique', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        addTwoComponentsAndWire(result)
        const undoCountBefore = result.current.getUndoCount()

        act(() => {
            result.current.updateWireWaypoints('wire-inexistant', [{ x: 1, y: 1 }])
        })

        expect(result.current.getUndoCount()).toBe(undoCountBefore)
        expect(result.current.wires[0].waypoints).toEqual([])
    })

    it('TEST 6 : des arguments incomplets ne dispatchent rien (wireId manquant, waypoints non-tableau)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)
        const undoCountBefore = result.current.getUndoCount()

        act(() => {
            result.current.updateWireWaypoints(null, [{ x: 1, y: 1 }])
        })
        act(() => {
            result.current.updateWireWaypoints(wire.id, 'not-an-array')
        })

        expect(result.current.getUndoCount()).toBe(undoCountBefore)
        expect(result.current.wires[0].waypoints).toEqual([])
    })

    it('TEST 7 : une structure de waypoint invalide (STR-006) est rejetée par ValidationEngine — aucune mutation, aucune entrée d\'historique', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)
        const undoCountBefore = result.current.getUndoCount()

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: NaN, y: 1 }])
        })

        expect(result.current.getUndoCount()).toBe(undoCountBefore)
        expect(result.current.wires[0].waypoints).toEqual([])
    })

    it('TEST 8 (round-trip) : conservation des données préexistantes — Undo restaure exactement composants et fils, waypoints inclus', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const { wire } = addTwoComponentsAndWire(result)

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 9, y: 9 }])
        })

        const documentBefore = {
            components: result.current.components.map(c => ({ uid: c.uid, type: c.type, x: c.x, y: c.y })),
            wires: result.current.wires.map(w => ({ id: w.id, fromUid: w.fromUid, toUid: w.toUid, waypoints: w.waypoints })),
        }

        act(() => {
            result.current.updateWireWaypoints(wire.id, [{ x: 9, y: 9 }, { x: 12, y: 12 }])
        })
        expect(result.current.wires[0].waypoints).toEqual([{ x: 9, y: 9 }, { x: 12, y: 12 }])

        act(() => {
            result.current.undo()
        })

        const documentAfter = {
            components: result.current.components.map(c => ({ uid: c.uid, type: c.type, x: c.x, y: c.y })),
            wires: result.current.wires.map(w => ({ id: w.id, fromUid: w.fromUid, toUid: w.toUid, waypoints: w.waypoints })),
        }

        expect(documentAfter.components).toEqual(documentBefore.components)
        expect(documentAfter.wires).toEqual(documentBefore.wires)
    })
})
