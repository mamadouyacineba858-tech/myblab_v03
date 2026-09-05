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
 *  * Test 5 (I-H5) : validation de l'invalidation du redoStack
 * après une nouvelle commande de déplacement (drag).
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

describe('MB-004.6 — Intégration DeleteCommand (réel)', () => {
    // ============================================
    // TEST 1 — Suppression simple avec Undo/Redo
    // ============================================
    it('TEST 1: Delete → Undo → Redo avec composant + wire connecté', async () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

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
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

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
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

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
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

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
          // ============================================
    // TEST 5 — Redo invalidé après nouvelle commande de déplacement
    // I-H5 : toute nouvelle commande vide le redoStack
    // ============================================
    it('TEST 5: Redo invalidé après nouvelle action de déplacement (I-H5)', async () => {
        // Canvas réel pour permettre à startDrag() de calculer
        // les coordonnées du pointeur.
        const canvasRef = { current: null }

        const wrapperWithCanvas = ({ children }) => (
            <CircuitProvider canvasRef={canvasRef}>
                <div
                    ref={(node) => {
                        canvasRef.current = node
                    }}
                >
                    {children}
                </div>
            </CircuitProvider>
        )

        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), {
            wrapper: wrapperWithCanvas,
        })

        // Vérifier que le canvas est disponible
        expect(canvasRef.current).toBeTruthy()

        // ============================================
        // 1. Créer un composant
        // ============================================
        act(() => {
            result.current.addComponent('LED', 100, 100)
        })

        const component = result.current.components[0]

        expect(component).toBeDefined()
        expect(component.type).toBe('LED')

        // ============================================
        // 2. Sélectionner le composant
        // ============================================
        act(() => {
            result.current.selectOnly({
                type: 'component',
                id: component.uid,
            })
        })

        // ============================================
        // 3. Supprimer le composant
        // ============================================
        act(() => {
            result.current.deleteSelection()
        })

        expect(result.current.components.length).toBe(0)

        // ============================================
        // 4. UNDO de la suppression
        // ============================================
        act(() => {
            result.current.undo()
        })

        expect(result.current.components.length).toBe(1)

        // Preuve : DeleteCommand est maintenant dans redoStack
        expect(result.current.canRedo()).toBe(true)

        const componentAfterUndo = result.current.components[0]

        // Vérifier que le composant restauré est bien le même
        expect(componentAfterUndo.uid).toBe(component.uid)

        // ============================================
        // 5. Démarrer le vrai drag
        // ============================================
        const pointerDownEvent = {
            button: 0,
            clientX: componentAfterUndo.x + 10,
            clientY: componentAfterUndo.y + 10,
            ctrlKey: false,
            metaKey: false,
            preventDefault: () => {},
            stopPropagation: () => {},
        }

        act(() => {
            result.current.startDrag(
                pointerDownEvent,
                componentAfterUndo.uid
            )
        })

        // ============================================
        // 6. Simuler le déplacement du pointeur
        // ============================================
        const pointerMoveEvent = new PointerEvent('pointermove', {
            clientX: componentAfterUndo.x + 60,
            clientY: componentAfterUndo.y + 60,
        })

        act(() => {
            window.dispatchEvent(pointerMoveEvent)
        })

        // ============================================
        // 7. Terminer le drag
        // ============================================
        const pointerUpEvent = new PointerEvent('pointerup')

        act(() => {
            window.dispatchEvent(pointerUpEvent)
        })

        // ============================================
        // 8. Vérifier que le déplacement a créé
        //    une nouvelle commande MoveCommand
        // ============================================
        expect(result.current.canUndo()).toBe(true)

        // ============================================
        // 9. I-H5 — Le nouveau déplacement doit
        //    invalider le redo de DeleteCommand
        // ============================================
        expect(result.current.canRedo()).toBe(false)
    })
})
