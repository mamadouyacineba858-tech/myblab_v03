/**
 * AddWireMutationChannel.integration.test.jsx
 * MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001) — Tests d'intégration réels du
 * canal de mutation cible pour addWire : useCircuitState ->
 * documentApi(getDocument/applyDocument) -> CommandBus -> AddWireHandler ->
 * HistoryService -> HistoryManager (historyManagerRef.current, instance
 * partagée avec le canal legacy et avec le canal ADD_COMPONENT).
 *
 * Portée : addWire uniquement (ruling CSA-CF3-002-ADD-WIRE-001). Aucune
 * invention d'API — dérivé exclusivement de ReactDocumentMapper, CommandBus,
 * CommandRegistry, AddWireHandler, HistoryService déjà existants. Même
 * patron que AddComponentMutationChannel.integration.test.jsx (MB-CF3-001).
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'

const wrapper = ({ children }) => (
    <CircuitProvider>{children}</CircuitProvider>
)

describe('MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001) — canal de mutation cible : addWire', () => {
    it('TEST 1 : addWire (canal CommandBus) crée un fil valide entre les deux pins demandées', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 300, 100)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })

        expect(result.current.wires.length).toBe(1)
        const wire = result.current.wires[0]
        expect(wire.fromUid).toBe(led.uid)
        expect(wire.fromPin).toBe('anode')
        expect(wire.toUid).toBe(resistor.uid)
        expect(wire.toPin).toBe('A')
        expect(typeof wire.id).toBe('string')
        expect(wire.id.length).toBeGreaterThan(0)
    })

    it('TEST 2 : addWire est historisé — Undo retire le fil ajouté, Redo le restaure', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 300, 100)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })
        expect(result.current.wires.length).toBe(1)
        expect(result.current.canUndo()).toBe(true)

        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.length).toBe(0)
        // Les deux composants (canal CommandBus, ADD_COMPONENT) restent inchangés.
        expect(result.current.components.length).toBe(2)
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.redo()
        })
        expect(result.current.wires.length).toBe(1)
        expect(result.current.wires[0].fromUid).toBe(led.uid)
        expect(result.current.wires[0].toUid).toBe(resistor.uid)
    })

    it('TEST 3 : addWire partage la même pile Undo/Redo que addComponent (CommandBus) et deleteSelection (canal legacy)', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        // 1. Deux composants via le canal CommandBus (ADD_COMPONENT)
        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 300, 100)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        // 2. Un fil via le canal CommandBus (ADD_WIRE)
        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })
        expect(result.current.wires.length).toBe(1)

        // 3. Suppression du fil via le canal legacy (deleteSelection/DeleteCommand)
        act(() => {
            result.current.toggleSelection({ type: 'wire', id: result.current.wires[0].id })
        })
        act(() => {
            result.current.deleteSelection()
        })
        expect(result.current.wires.length).toBe(0)

        // 4. Un seul Undo (pile partagée) doit annuler la suppression (legacy),
        // le fil réapparaît.
        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.length).toBe(1)

        // 5. Un second Undo doit annuler l'ajout du fil (canal CommandBus, ADD_WIRE).
        act(() => {
            result.current.undo()
        })
        expect(result.current.wires.length).toBe(0)
        expect(result.current.components.length).toBe(2)

        // 6. Un troisième et un quatrième Undo annulent les deux ADD_COMPONENT.
        act(() => {
            result.current.undo()
            result.current.undo()
        })
        expect(result.current.components.length).toBe(0)
        expect(result.current.canUndo()).toBe(false)
    })

    it("TEST 4 (I-H5) : une nouvelle action après Undo invalide le redoStack", () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 300, 100)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })
        act(() => {
            result.current.undo()
        })
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.addWire(led.uid, 'cathode', resistor.uid, 'B')
        })
        expect(result.current.canRedo()).toBe(false)
        expect(result.current.wires.length).toBe(1)
        expect(result.current.wires[0].fromPin).toBe('cathode')
    })

    it('TEST 5 : wireAlreadyExists (garde UI, non déplacée vers le Core) bloque toujours la création d\'un doublon — aucune commande fantôme dans l\'historique', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 300, 100)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })
        expect(result.current.wires.length).toBe(1)
        const undoCountAfterFirstWire = result.current.getUndoCount()

        // Doublon exact
        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })
        expect(result.current.wires.length).toBe(1)
        expect(result.current.getUndoCount()).toBe(undoCountAfterFirstWire)

        // Doublon symétrique (B -> A équivalent à A -> B, cf. wireAlreadyExists)
        act(() => {
            result.current.addWire(resistor.uid, 'A', led.uid, 'anode')
        })
        expect(result.current.wires.length).toBe(1)
        expect(result.current.getUndoCount()).toBe(undoCountAfterFirstWire)
    })

    it('TEST 6 : une auto-connexion (même pin sur le même composant) ne dispatche rien (garde préservée, comportement inchangé)', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
        })
        const led = result.current.components[0]
        const undoCountAfterComponent = result.current.getUndoCount()

        act(() => {
            result.current.addWire(led.uid, 'anode', led.uid, 'anode')
        })

        expect(result.current.wires.length).toBe(0)
        // Aucune commande fantôme : le compte d'annulation reste celui du
        // seul addComponent (canUndo() resterait true à cause de ce dernier,
        // ce n'est donc pas le bon signal ici — voir getUndoCount()).
        expect(result.current.getUndoCount()).toBe(undoCountAfterComponent)
    })

    it('TEST 7 (round-trip) : conservation des données préexistantes — Undo restaure exactement les composants et fils persistants', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 111, 222)
            result.current.addComponent('RESISTOR', 333, 444)
        })
        const led = result.current.components.find(c => c.type === 'LED')
        const resistor = result.current.components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })

        const documentBefore = {
            components: result.current.components.map(c => ({ uid: c.uid, type: c.type, x: c.x, y: c.y })),
            wires: result.current.wires.map(w => ({ id: w.id, fromUid: w.fromUid, fromPin: w.fromPin, toUid: w.toUid, toPin: w.toPin })),
        }

        // Nouvelle mutation via le canal cible : round-trip Core complet
        // (getDocument -> Handler -> applyDocument) sur l'ensemble du document.
        act(() => {
            result.current.addWire(led.uid, 'cathode', resistor.uid, 'B')
        })
        expect(result.current.wires.length).toBe(2)

        // Undo de ce second ajout : les données préexistantes (composants + premier
        // fil) doivent être conservées à l'identique.
        act(() => {
            result.current.undo()
        })

        const documentAfter = {
            components: result.current.components.map(c => ({ uid: c.uid, type: c.type, x: c.x, y: c.y })),
            wires: result.current.wires.map(w => ({ id: w.id, fromUid: w.fromUid, fromPin: w.fromPin, toUid: w.toUid, toPin: w.toPin })),
        }

        expect(documentAfter.components).toEqual(documentBefore.components)
        expect(documentAfter.wires).toEqual(documentBefore.wires)
    })

    it('TEST 8 : des arguments incomplets ne dispatchent rien (garde préservée, comportement inchangé)', () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
        })
        const led = result.current.components[0]
        const undoCountAfterComponent = result.current.getUndoCount()

        act(() => {
            result.current.addWire(led.uid, 'anode', null, null)
        })
        act(() => {
            result.current.addWire(null, null, led.uid, 'anode')
        })

        expect(result.current.wires.length).toBe(0)
        expect(result.current.getUndoCount()).toBe(undoCountAfterComponent)
    })
})
