/**
 * DeleteCommand.integration.test.jsx
 * MB-004.6 — Tests d'intégration réels avec useCircuitState
 * 
 * Ces tests valident le cycle complet de suppression avec historique :
 * - Suppression simple avec Undo/Redo
 * - Suppression groupée (une seule commande)
 * - Suppression de wire seul
 * - Pas de duplication de wire (vérifié)
 * 
 * Test 5 (I-H5) reporté : moveComponent() n'est pas encore historisé
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider, useCircuit } from '../context/CircuitContext.jsx'

const wrapper = ({ children }) => (
    <CircuitProvider>{children}</CircuitProvider>
)

describe('MB-004.6 — Intégration DeleteCommand (réel)', () => {
    // ============================================
    // TEST 1 — Suppression simple avec Undo/Redo
    // ============================================
    it('TEST 1: Delete → Undo → Redo avec composant + wire connecté', async () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        // 1. Créer deux composants
        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 200, 100)
        })

        const components = result.current.components
        const led = components.find(c => c.type === 'LED')
        const resistor = components.find(c => c.type === 'RESISTOR')
        
        // 2. Créer un wire entre eux
        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })

        expect(result.current.components.length).toBe(2)
        expect(result.current.wires.length).toBe(1)

        // 3. Sélectionner LED
        act(() => {
            result.current.toggleSelection({ type: 'component', id: led.uid })
        })

        // 4. DELETE
        act(() => {
            result.current.deleteSelection()
        })

        // 5. Vérifier après suppression
        expect(result.current.components.length).toBe(1)
        expect(result.current.components[0].type).toBe('RESISTOR')
        expect(result.current.wires.length).toBe(0)

        // 6. UNDO
        act(() => {
            result.current.undo()
        })

        // 7. Vérifier après Undo
        expect(result.current.components.length).toBe(2)
        expect(result.current.wires.length).toBe(1)
        expect(result.current.components.find(c => c.type === 'LED')).toBeDefined()

        // 8. REDO
        act(() => {
            result.current.redo()
        })

        // 9. Vérifier après Redo
        expect(result.current.components.length).toBe(1)
        expect(result.current.wires.length).toBe(0)
    })

    // ============================================
    // TEST 2 — Suppression groupée (A + B → C)
    // Vérifie qu'une suppression groupée crée UNE seule commande
    // ============================================
    it('TEST 2: Suppression groupée — une seule commande', async () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        // 1. Créer A, B, C
        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 200, 100)
            result.current.addComponent('LED', 300, 100)
        })

        const components = result.current.components
        const A = components.find(c => c.x === 100)
        const B = components.find(c => c.x === 200)
        const C = components.find(c => c.x === 300)

        // 2. Créer wires A-B et B-C
        act(() => {
            result.current.addWire(A.uid, 'anode', B.uid, 'A')
            result.current.addWire(B.uid, 'B', C.uid, 'anode')
        })

        expect(result.current.components.length).toBe(3)
        expect(result.current.wires.length).toBe(2)

        // 3. Multi-sélection via toggleSelection (A + B)
        act(() => {
            result.current.toggleSelection({ type: 'component', id: A.uid })
            result.current.toggleSelection({ type: 'component', id: B.uid })
        })

        // 4. Vérifier qu'une seule commande est créée
        const undoCountBefore = result.current.getUndoCount()

        act(() => {
            result.current.deleteSelection()
        })

        const undoCountAfter = result.current.getUndoCount()
        expect(undoCountAfter - undoCountBefore).toBe(1)

        // 5. Vérifier l'état après suppression
        expect(result.current.components.length).toBe(1)
        expect(result.current.components[0].uid).toBe(C.uid)
        expect(result.current.wires.length).toBe(0)

        // 6. UNDO — vérifier restauration complète
        act(() => {
            result.current.undo()
        })

        expect(result.current.components.length).toBe(3)
        expect(result.current.wires.length).toBe(2)
        expect(result.current.components.find(c => c.uid === A.uid)).toBeDefined()
        expect(result.current.components.find(c => c.uid === B.uid)).toBeDefined()
    })

    // ============================================
    // TEST 3 — Wire seul
    // ============================================
    it('TEST 3: Suppression d\'un wire seul', async () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 200, 100)
        })

        const components = result.current.components
        const led = components.find(c => c.type === 'LED')
        const resistor = components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })

        const wire = result.current.wires[0]

        // Sélectionner le wire via toggleSelection
        act(() => {
            result.current.toggleSelection({ type: 'wire', id: wire.id })
        })

        expect(result.current.wires.length).toBe(1)

        // DELETE
        act(() => {
            result.current.deleteSelection()
        })

        expect(result.current.wires.length).toBe(0)
        expect(result.current.components.length).toBe(2)

        // UNDO
        act(() => {
            result.current.undo()
        })

        expect(result.current.wires.length).toBe(1)

        // REDO
        act(() => {
            result.current.redo()
        })

        expect(result.current.wires.length).toBe(0)
    })

    // ============================================
    // TEST 4 — Pas de duplication de wire
    // Vérifie qu'un wire sélectionné ET connecté n'est pas capturé deux fois
    // ============================================
    it('TEST 4: Wire déjà sélectionné + connecté = pas de duplication', async () => {
        const { result } = renderHook(() => useCircuit(), { wrapper })

        act(() => {
            result.current.addComponent('LED', 100, 100)
            result.current.addComponent('RESISTOR', 200, 100)
        })

        const components = result.current.components
        const led = components.find(c => c.type === 'LED')
        const resistor = components.find(c => c.type === 'RESISTOR')

        act(() => {
            result.current.addWire(led.uid, 'anode', resistor.uid, 'A')
        })

        const wire = result.current.wires[0]

        // Multi-sélection via toggleSelection (LED + wire)
        act(() => {
            result.current.toggleSelection({ type: 'component', id: led.uid })
            result.current.toggleSelection({ type: 'wire', id: wire.id })
        })

        // Vérifier qu'une seule commande est créée
        const undoCountBefore = result.current.getUndoCount()

        act(() => {
            result.current.deleteSelection()
        })

        const undoCountAfter = result.current.getUndoCount()
        expect(undoCountAfter - undoCountBefore).toBe(1)

        // Vérifier l'état après suppression
        expect(result.current.wires.length).toBe(0)
        expect(result.current.components.length).toBe(1)

        // UNDO — vérifier que le wire est restauré une seule fois
        act(() => {
            result.current.undo()
        })

        // Preuve explicite de non-duplication : le wire n'est présent qu'une seule fois
        expect(result.current.wires.length).toBe(1)
        expect(result.current.wires.filter(w => w.id === wire.id)).toHaveLength(1)
        expect(result.current.components.length).toBe(2)
    })

    // ============================================
    // TEST 5 — Redo invalidé après nouvelle commande (I-H5)
    // ⏸️ REPORTÉ — moveComponent() n'est pas encore historisé
    // 
    // Ce test sera activé lorsque moveComponent() créera une MoveCommand
    // et invalidera le redoStack conformément à I-H5.
    // Ticket séparé à créer pour l'historisation de moveComponent().
    // ============================================
    it.skip('TEST 5: Redo invalidé après nouvelle action (I-H5)', async () => {
        // Ce test vérifiera que :
        // 1. Delete → Undo → redoStack contient la commande
        // 2. Une nouvelle action (moveComponent) est exécutée
        // 3. redoStack est vidé (I-H5)
        // 4. canRedo() retourne false
        
        // À activer lorsque moveComponent() sera historisé.
        // Voir ticket : MB-XXXX — Historisation des actions directes
    })
})