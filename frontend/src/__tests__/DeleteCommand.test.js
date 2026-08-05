/**
 * DeleteCommand.test.js
 * MB-004.6 — Tests unitaires de DeleteCommand
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeleteCommand } from '../history/commands/DeleteCommand.js'

describe('DeleteCommand', () => {
    let documentApi
    let mockComponents
    let mockWires

    beforeEach(() => {
        documentApi = {
            removeComponents: vi.fn(),
            removeWires: vi.fn(),
            restoreComponents: vi.fn(),
            restoreWires: vi.fn()
        }

        mockComponents = new Map([
            ['comp1', { uid: 'comp1', type: 'LED', x: 100, y: 100 }],
            ['comp2', { uid: 'comp2', type: 'RESISTOR', x: 200, y: 200 }]
        ])

        mockWires = new Map([
            ['wire1', { id: 'wire1', fromUid: 'comp1', fromPin: 'anode', toUid: 'comp2', toPin: 'A' }],
            ['wire2', { id: 'wire2', fromUid: 'comp1', fromPin: 'cathode', toUid: 'gnd', toPin: 'GND' }]
        ])
    })

    // ============================================
    // TEST A — do() supprime fils puis composants
    // ============================================
    it('TEST A: do() supprime fils puis composants', () => {
        const cmd = new DeleteCommand(documentApi, mockComponents, mockWires)
        cmd.do()
        expect(documentApi.removeWires).toHaveBeenCalledWith(['wire1', 'wire2'])
        expect(documentApi.removeComponents).toHaveBeenCalledWith(['comp1', 'comp2'])
        expect(documentApi.removeWires.mock.invocationCallOrder[0])
         .toBeLessThan(documentApi.removeComponents.mock.invocationCallOrder[0])
    })

    // ============================================
    // TEST B — undo() restaure composants puis fils
    // ============================================
    it('TEST B: undo() restaure composants puis fils', () => {
        const cmd = new DeleteCommand(documentApi, mockComponents, mockWires)
        cmd.do()
        cmd.undo()
        expect(documentApi.restoreComponents).toHaveBeenCalled()
        expect(documentApi.restoreWires).toHaveBeenCalled()
        expect(documentApi.restoreComponents.mock.invocationCallOrder[0])
          .toBeLessThan(documentApi.restoreWires.mock.invocationCallOrder[0])
    })

    // ============================================
    // TEST C — redo() supprime à nouveau
    // ============================================
    it('TEST C: redo() supprime à nouveau', () => {
        const cmd = new DeleteCommand(documentApi, mockComponents, mockWires)
        cmd.do()
        cmd.undo()
        documentApi.removeWires.mockClear()
        documentApi.removeComponents.mockClear()
        cmd.redo()
        expect(documentApi.removeWires).toHaveBeenCalled()
        expect(documentApi.removeComponents).toHaveBeenCalled()
    })

    // ============================================
    // TEST D — Immuabilité
    // ============================================
    it('TEST D: immuabilité des données', () => {
        const orig = new Map([['comp1', { uid: 'comp1', x: 100 }]])
        const cmd = new DeleteCommand(documentApi, orig, new Map())
        orig.get('comp1').x = 999
        cmd.do()
        cmd.undo()
        const restored = documentApi.restoreComponents.mock.calls[0][0]
        expect(restored[0].x).toBe(100)
    })

    // ============================================
    // TEST E — Suppression vide refusée
    // ============================================
    it('TEST E: suppression vide refusée', () => {
        expect(() => {
            new DeleteCommand(documentApi, new Map(), new Map())
        }).toThrow('DeleteCommand: au moins un composant ou un fil doit être présent')
    })

    // ============================================
    // TEST F — Composants seuls
    // ============================================
    it('TEST F: composants seuls', () => {
        const cmd = new DeleteCommand(documentApi, mockComponents, new Map())
        expect(cmd._componentIds).toEqual(['comp1', 'comp2'])
        expect(cmd._wireIds).toEqual([])
        cmd.do()
        expect(documentApi.removeComponents).toHaveBeenCalled()
        expect(documentApi.removeWires).not.toHaveBeenCalled()
    })

    // ============================================
    // TEST G — Wires seuls
    // ============================================
    it('TEST G: wires seuls', () => {
        const cmd = new DeleteCommand(documentApi, new Map(), mockWires)
        expect(cmd._componentIds).toEqual([])
        expect(cmd._wireIds).toEqual(['wire1', 'wire2'])
        cmd.do()
        expect(documentApi.removeWires).toHaveBeenCalled()
        expect(documentApi.removeComponents).not.toHaveBeenCalled()
    })

    // ============================================
    // TEST H — Composants + wires
    // ============================================
    it('TEST H: composants + wires', () => {
        const cmd = new DeleteCommand(documentApi, mockComponents, mockWires)
        expect(cmd._componentIds).toEqual(['comp1', 'comp2'])
        expect(cmd._wireIds).toEqual(['wire1', 'wire2'])
    })

    // ============================================
    // TEST I — getDescription()
    // ============================================
    it('TEST I: getDescription() retourne une description claire', () => {
        let cmd = new DeleteCommand(documentApi, mockComponents, mockWires)
        expect(cmd.getDescription()).toBe('Suppression de 2 composants et 2 fils')
        cmd = new DeleteCommand(documentApi, mockComponents, new Map())
        expect(cmd.getDescription()).toBe('Suppression de 2 composants')
        cmd = new DeleteCommand(documentApi, new Map(), mockWires)
        expect(cmd.getDescription()).toBe('Suppression de 2 fils')
    })

    // ============================================
    // TEST J — Validation des paramètres
    // ============================================
    it('TEST J: validation des paramètres', () => {
        expect(() => new DeleteCommand(null, mockComponents, mockWires))
            .toThrow('DeleteCommand: documentApi est obligatoire')
        expect(() => new DeleteCommand(documentApi, {}, mockWires))
            .toThrow('DeleteCommand: deletedComponents doit être un Map')
        expect(() => new DeleteCommand(documentApi, mockComponents, {}))
            .toThrow('DeleteCommand: deletedWires doit être un Map')
    })
})