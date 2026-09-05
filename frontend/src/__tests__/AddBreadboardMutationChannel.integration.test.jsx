/**
 * AddBreadboardMutationChannel.integration.test.jsx
 * MB-BREADBOARD-002 — Tests d'intégration réels du canal de mutation cible
 * pour addBreadboard : useCircuitState -> documentApi(getDocument/applyDocument)
 * -> CommandBus -> AddBreadboardHandler -> HistoryService -> HistoryManager.
 *
 * Même patron que AddComponentMutationChannel.integration.test.jsx.
 *
 * Régression couverte (TEST 1/TEST 5) : AddBreadboardHandler.test.js
 * (Handler unitaire, MockDocumentApi) prouvait déjà la mutation du Document
 * Core, mais useCircuitState.js n'avait, avant ce correctif, aucun état React
 * dédié à `breadboard` — documentApi.getDocument() n'incluait pas
 * `breadboard: breadboardRef.current` et applyDocument() ne capturait pas
 * `reactDocument.breadboard`. Le breadboard posé par le Handler était donc
 * silencieusement perdu au tour suivant (jamais rendu, LOCK-01 inopérant).
 * Ce fichier exerce le hook réel (CircuitProvider), pas un mock, pour
 * prouver que la pose survit effectivement au cycle de rendu React.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'

const wrapper = ({ children }) => (
    <CircuitProvider>{children}</CircuitProvider>
)

describe('MB-BREADBOARD-002 — canal de mutation cible : addBreadboard', () => {
    it('TEST 1 : addBreadboard (canal CommandBus) pose document.breadboard et le state React le reflète (régression corrigée)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        expect(result.current.breadboard).toBe(null)

        act(() => {
            result.current.addBreadboard(120, 180)
        })

        expect(result.current.breadboard).not.toBe(null)
        expect(result.current.breadboard.layout).toBe('STANDARD_V1')
        expect(typeof result.current.breadboard.id).toBe('string')
        // snapToBreadboardPitch (120, 180 sont déjà des multiples de BREADBOARD_PITCH=12)
        expect(result.current.breadboard.position.x % BREADBOARD_PITCH).toBe(0)
        expect(result.current.breadboard.position.y % BREADBOARD_PITCH).toBe(0)
    })

    it('TEST 2 (LOCK-01) : un second addBreadboard() sur un Document qui en possède déjà un est refusé (breadboard inchangé)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
        })
        const firstId = result.current.breadboard.id

        act(() => {
            result.current.addBreadboard(500, 500)
        })

        expect(result.current.breadboard.id).toBe(firstId)
        expect(result.current.breadboard.position).toEqual({ x: 120, y: 180 })
    })

    it('TEST 3 : addBreadboard est historisé — Undo retire le breadboard posé, Redo le restaure', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
        })
        expect(result.current.breadboard).not.toBe(null)
        const id = result.current.breadboard.id
        expect(result.current.canUndo()).toBe(true)

        act(() => {
            result.current.undo()
        })
        expect(result.current.breadboard).toBe(null)
        expect(result.current.canRedo()).toBe(true)

        act(() => {
            result.current.redo()
        })
        expect(result.current.breadboard).not.toBe(null)
        expect(result.current.breadboard.id).toBe(id)
    })

    it('TEST 4 (INV round-trip) : addBreadboard puis addComponent (round-trip Core complet) ne perd pas le breadboard déjà posé', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
        })
        const id = result.current.breadboard.id

        // Nouvelle mutation via un autre Handler du même canal CF3 : round-trip
        // Core complet (getDocument -> Handler -> applyDocument) sur l'ensemble
        // du Document, y compris breadboard.
        act(() => {
            result.current.addComponent('LED', 100, 100)
        })

        expect(result.current.breadboard).not.toBe(null)
        expect(result.current.breadboard.id).toBe(id)
        expect(result.current.components.length).toBe(1)
    })

    it("TEST 5 : deux addBreadboard() consécutifs dans le même batch React n'entraînent qu'une seule pose (le second est refusé par LOCK-01, pas d'écrasement silencieux)", () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
            result.current.addBreadboard(500, 500)
        })

        expect(result.current.breadboard).not.toBe(null)
        expect(result.current.breadboard.position).toEqual({ x: 120, y: 180 })
    })

    // =========================================================================
    // MB-BREADBOARD-003 (Blueprint §6, AC-23, UI-15) : exportCircuit()/
    // importCircuit() incluaient/restauraient tout SAUF breadboard (lacune
    // préexistante, explicitement mise hors scope par MB-BREADBOARD-002
    // Delivery Report §5.2 faute d'AC qui l'exigeait alors — AC-23 de ce
    // ticket la rend explicitement in-scope).
    // =========================================================================
    it('TEST 6 (AC-23) : exportCircuit() inclut document.breadboard', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
        })
        const id = result.current.breadboard.id

        const exported = result.current.exportCircuit()
        expect(exported.breadboard).not.toBe(null)
        expect(exported.breadboard.id).toBe(id)
        expect(exported.breadboard.layout).toBe('STANDARD_V1')
    })

    it('TEST 7 (AC-23) : exportCircuit() sans breadboard posé exporte breadboard: null (non-régression)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        const exported = result.current.exportCircuit()
        expect(exported.breadboard).toBe(null)
    })

    it('TEST 8 (AC-23, UI-15) : importCircuit() restaure document.breadboard (round-trip export -> import)', () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
            result.current.addComponent('LED', 100, 100)
        })
        const exported = result.current.exportCircuit()
        expect(exported.breadboard).not.toBe(null)

        // Nouvelle session (hook réinitialisé) : plus aucun breadboard.
        const { result: fresh } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
        expect(fresh.current.breadboard).toBe(null)

        act(() => {
            fresh.current.importCircuit(exported)
        })

        expect(fresh.current.breadboard).not.toBe(null)
        expect(fresh.current.breadboard).toEqual(exported.breadboard)
        expect(fresh.current.components.length).toBe(1)
    })

    it("TEST 9 (AC-23) : importCircuit() d'un document sans breadboard réinitialise à null (pas de résidu d'une session précédente)", () => {
        const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

        act(() => {
            result.current.addBreadboard(120, 180)
        })
        expect(result.current.breadboard).not.toBe(null)

        act(() => {
            result.current.importCircuit({ version: 1, components: [], wires: [] })
        })

        expect(result.current.breadboard).toBe(null)
    })
})
