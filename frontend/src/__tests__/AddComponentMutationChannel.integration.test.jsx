/**
 * AddComponentMutationChannel.integration.test.jsx
 * MB-CF3-001 (GATE 4) — Tests d'intégration réels du canal de mutation cible
 * pour addComponent : useCircuitState -> documentApi(getDocument/applyDocument)
 * -> CommandBus -> AddComponentHandler -> HistoryService -> HistoryManager
 * (historyManagerRef.current, instance partagée avec le canal legacy).
 *
 * Portée : addComponent uniquement (arbitrage CSA-CF3-001 / CSA-CF3-001-A).
 * Aucune invention d'API — dérivé exclusivement de ReactDocumentMapper,
 * CommandBus, CommandRegistry, AddComponentHandler, HistoryService déjà
 * existants.
 *
 * Couvre : exécution, undo, redo, invalidation du redo après une nouvelle
 * action, conservation des données par round-trip (INV-CF3-006), et la
 * régression corrigée (deux addComponent() consécutifs dans le même batch
 * React ne doivent pas s'écraser mutuellement).
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

describe('MB-CF3-001 (GATE 4) — canal de mutation cible : addComponent', () => {
    it('TEST 1 : addComponent (canal CommandBus) crée un composant valide, au bon type et à la bonne position', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addComponent('LED', 140, 220)
        })

        expect(result.current.components.length).toBe(1)
        const led = result.current.components[0]
        expect(led.type).toBe('LED')
        expect(led.x).toBe(140)
        expect(led.y).toBe(220)
        expect(typeof led.uid).toBe('string')
        expect(led.uid.length).toBeGreaterThan(0)
    })

    it("TEST 2 : deux addComponent() consécutifs dans le même batch React ne s'écrasent pas mutuellement (régression corrigée)", () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 200, 100)
            result.current.addComponent('LED', 300, 100)
        })

        expect(result.current.components.length).toBe(3)
        expect(result.current.components.filter(c => c.type === 'LED').length).toBe(2)
        expect(result.current.components.filter(c => c.type === 'RESISTOR').length).toBe(1)
        // uids distincts (pas de collision/écrasement).
        const uids = new Set(result.current.components.map(c => c.uid))
        expect(uids.size).toBe(3)
    })

    it('TEST 3 : addComponent est historisé — Undo retire le composant ajouté, Redo le restaure', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addComponent('RESISTOR', 160, 160)
        })
        expect(result.current.components.length).toBe(1)
        expect(result.current.canUndo()).toBe(true)

        act(() => {
            result.current.undo()
        })
        expect(result.current.components.length).toBe(0)
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.redo()
        })
        expect(result.current.components.length).toBe(1)
        expect(result.current.components[0].type).toBe('RESISTOR')
        expect(result.current.components[0].x).toBe(160)
        expect(result.current.components[0].y).toBe(160)
    })

    it('TEST 4 : addComponent partage la même pile Undo/Redo que le canal legacy (DeleteCommand)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        // 1. Ajout via le nouveau canal (CommandBus)
        act(() => {
            result.current.addComponent('LED', 100, 100)
        })
        const led = result.current.components[0]

        // 2. Suppression via le canal legacy (DeleteCommand/HistoryManager)
        act(() => {
            result.current.toggleSelection({ type: 'component', id: led.uid })
        })
        act(() => {
            result.current.deleteSelection()
        })
        expect(result.current.components.length).toBe(0)

        // 3. Un seul Undo (pile partagée) doit annuler la suppression (legacy),
        // le composant réapparaît.
        act(() => {
            result.current.undo()
        })
        expect(result.current.components.length).toBe(1)
        expect(result.current.components[0].type).toBe('LED')

        // 4. Un second Undo doit annuler l'ajout (canal CommandBus).
        act(() => {
            result.current.undo()
        })
        expect(result.current.components.length).toBe(0)
        expect(result.current.canUndo()).toBe(false)
    })

    it("TEST 5 (I-H5) : une nouvelle action après Undo invalide le redoStack", () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
        })
        act(() => {
            result.current.undo()
        })
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.addComponent('RESISTOR', 200, 200)
        })
        expect(result.current.canRedo()).toBe(false)
        expect(result.current.components.length).toBe(1)
        expect(result.current.components[0].type).toBe('RESISTOR')
    })

    it('TEST 6 (INV-CF3-006) : conservation des données par round-trip — Undo restaure exactement les données persistantes préexistantes', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        // Document initial avec des composants et un wire, construits par le
        // canal existant (createComponent/addWire), pour vérifier que le
        // round-trip Core (déclenché par un addComponent ultérieur) ne les
        // altère pas.
        act(() => {
            result.current.addComponent('LED', 111, 222)
            result.current.addComponent('RESISTOR', 333, 444)
        })
        const before = result.current.components
        const led = before.find(c => c.type === 'LED')
        const resistor = before.find(c => c.type === 'RESISTOR')

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
            result.current.addComponent('LED', 500, 500)
        })
        expect(result.current.components.length).toBe(3)

        // Undo de cet ajout : les données préexistantes (LED, RESISTOR, wire)
        // doivent être conservées à l'identique (round-trip Core -> React ->
        // Core -> React ne doit perdre ni altérer aucune donnée persistante).
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

    it('TEST 7 : un type de composant inconnu ne dispatche rien (comportement préservé, aucune commande fantôme dans l\'historique)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addComponent('NOT_A_REAL_TYPE', 100, 100)
        })

        expect(result.current.components.length).toBe(0)
        expect(result.current.canUndo()).toBe(false)
    })
})
