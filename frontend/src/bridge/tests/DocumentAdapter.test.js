import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentAdapter } from '../DocumentAdapter.js';
import { createDiffResult } from '../DiffResult.js';

describe('DocumentAdapter', () => {
  let documentApi;
  let adapter;
  let order;

  beforeEach(() => {
    order = [];

    documentApi = {
      removeWires: vi.fn().mockImplementation(() => order.push('removeWires')),
      removeComponents: vi.fn().mockImplementation(() => order.push('removeComponents')),
      updateComponentState: vi.fn().mockImplementation(() => order.push('updateComponentState')),
      updateComponentPositions: vi.fn().mockImplementation(() => order.push('updateComponentPositions')),
      restoreComponents: vi.fn().mockImplementation(() => order.push('restoreComponents')),
      restoreWires: vi.fn().mockImplementation(() => order.push('restoreWires')),
    };

    adapter = new DocumentAdapter(documentApi);
  });

  // ============================================================
  // T1 : DiffResult vide → rien n'est appelé
  // ============================================================

  it('T1: should not call any documentApi method for empty diff', () => {
    const diff = createDiffResult({ hasChanges: false });

    adapter.apply(diff);

    expect(documentApi.removeWires).not.toHaveBeenCalled();
    expect(documentApi.removeComponents).not.toHaveBeenCalled();
    expect(documentApi.updateComponentState).not.toHaveBeenCalled();
    expect(documentApi.updateComponentPositions).not.toHaveBeenCalled();
    expect(documentApi.restoreComponents).not.toHaveBeenCalled();
    expect(documentApi.restoreWires).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  // ============================================================
  // T2 : Ajout de composants
  // ============================================================

  it('T2: should restore added components', () => {
    const addedComponents = [
      { id: 'C1', type: 'typeA', position: { x: 10, y: 20 } },
      { id: 'C2', type: 'typeB', position: { x: 30, y: 40 } },
    ];

    const diff = createDiffResult({
      componentsAdded: addedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.restoreComponents).toHaveBeenCalledTimes(1);
    expect(documentApi.restoreComponents).toHaveBeenCalledWith(addedComponents);
  });

  // ============================================================
  // T3 : Suppression de composants
  // ============================================================

  it('T3: should remove removed components', () => {
    const removedComponents = [
      { id: 'C1', type: 'typeA', position: { x: 10, y: 20 } },
    ];

    const diff = createDiffResult({
      componentsRemoved: removedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.removeComponents).toHaveBeenCalledTimes(1);
    expect(documentApi.removeComponents).toHaveBeenCalledWith(removedComponents);
  });

  // ============================================================
  // T4 : Mise à jour de positions
  // ============================================================

  it('T4: should update component positions', () => {
    const modifiedComponents = [
      {
        id: 'C1',
        previous: { position: { x: 10, y: 20 } },
        current: { position: { x: 30, y: 40 } },
        changes: { 'position.x': { from: 10, to: 30 } },
      },
    ];

    const diff = createDiffResult({
      componentsModified: modifiedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.updateComponentPositions).toHaveBeenCalledTimes(1);
    expect(documentApi.updateComponentPositions).toHaveBeenCalledWith([
      { id: 'C1', position: { x: 30, y: 40 } },
    ]);
  });

  // ============================================================
  // T5 : Mise à jour de paramètres (state)
  // ============================================================

  it('T5: should update component state', () => {
    const modifiedComponents = [
      {
        id: 'C1',
        previous: { parameters: { value: 100 } },
        current: { parameters: { value: 200 } },
        changes: { 'parameters.value': { from: 100, to: 200 } },
      },
    ];

    const diff = createDiffResult({
      componentsModified: modifiedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.updateComponentState).toHaveBeenCalledTimes(1);
    expect(documentApi.updateComponentState).toHaveBeenCalledWith([
      { id: 'C1', state: { value: 200 } },
    ]);
  });

  // ============================================================
  // T6 : Ajout de wires
  // ============================================================

  it('T6: should restore added wires', () => {
    const addedWires = [
      { id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } },
    ];

    const diff = createDiffResult({
      wiresAdded: addedWires,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.restoreWires).toHaveBeenCalledTimes(1);
    expect(documentApi.restoreWires).toHaveBeenCalledWith(addedWires);
  });

  // ============================================================
  // T7 : Suppression de wires
  // ============================================================

  it('T7: should remove removed wires', () => {
    const removedWires = [
      { id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } },
    ];

    const diff = createDiffResult({
      wiresRemoved: removedWires,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.removeWires).toHaveBeenCalledTimes(1);
    expect(documentApi.removeWires).toHaveBeenCalledWith(removedWires);
  });

  // ============================================================
  // T8 : Ordre d'application correct (test réel)
  // ============================================================

  it('T8: should apply operations in correct order', () => {
    const diff = createDiffResult({
      componentsAdded: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
      componentsRemoved: [{ id: 'C2', type: 'typeB', position: { x: 30, y: 40 } }],
      componentsModified: [
        {
          id: 'C3',
          previous: { position: { x: 50, y: 60 }, parameters: { value: 100 } },
          current: { position: { x: 70, y: 80 }, parameters: { value: 200 } },
          changes: {
            'position.x': { from: 50, to: 70 },
            'parameters.value': { from: 100, to: 200 },
          },
        },
      ],
      wiresAdded: [{ id: 'W1', pinA: { componentId: 'A', pinId: 'p1' }, pinB: { componentId: 'B', pinId: 'p2' } }],
      wiresRemoved: [{ id: 'W2', pinA: { componentId: 'C', pinId: 'p1' }, pinB: { componentId: 'D', pinId: 'p2' } }],
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(order).toEqual([
      'removeWires',
      'removeComponents',
      'updateComponentState',
      'updateComponentPositions',
      'restoreComponents',
      'restoreWires',
    ]);
  });

  // ============================================================
  // T9 : Validation des entrées
  // ============================================================

  it('T9: should throw for invalid diffResult', () => {
    expect(() => adapter.apply(null)).toThrow(
      'DocumentAdapter.apply: diffResult is required'
    );

    expect(() => adapter.apply('not an object')).toThrow(
      'DocumentAdapter.apply: diffResult must be an object'
    );
  });

  // ============================================================
  // T10 : DocumentAdapter requiert documentApi
  // ============================================================

  it('T10: should throw if documentApi is not provided', () => {
    expect(() => new DocumentAdapter()).toThrow(
      'DocumentAdapter: documentApi is required'
    );

    expect(() => new DocumentAdapter('not an object')).toThrow(
      'DocumentAdapter: documentApi must be an object'
    );
  });

  // ============================================================
  // T11 : Validation des méthodes documentApi
  // ============================================================

  it('T11: should throw if documentApi is missing required methods', () => {
    const invalidApi = {
      removeWires: vi.fn(),
      // removeComponents est manquant
      updateComponentState: vi.fn(),
      updateComponentPositions: vi.fn(),
      restoreComponents: vi.fn(),
      restoreWires: vi.fn(),
    };

    expect(() => new DocumentAdapter(invalidApi)).toThrow(
      'DocumentAdapter: documentApi.removeComponents must be a function'
    );
  });

  // ============================================================
  // T12 : Validation du DiffResult (champs manquants)
  // ============================================================

  it('T12: should throw if diffResult is missing required fields', () => {
    const invalidDiff = { hasChanges: true };

    expect(() => adapter.apply(invalidDiff)).toThrow(
      'DocumentAdapter.apply: diffResult missing field "componentsAdded"'
    );
  });

  // ============================================================
  // T13 : Pas de mutation du diffResult
  // ============================================================

  it('T13: should not mutate the diffResult', () => {
    const addedComponents = [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }];
    const diff = createDiffResult({
      componentsAdded: addedComponents,
      hasChanges: true,
    });

    const frozenDiff = JSON.stringify(diff);
    adapter.apply(diff);

    expect(JSON.stringify(diff)).toBe(frozenDiff);
  });

  // ============================================================
  // T14 : Optimisation — ne pas appeler updateComponentState si paramètres inchangés
  // ============================================================

  it('T14: should not call updateComponentState if parameters unchanged', () => {
    const modifiedComponents = [
      {
        id: 'C1',
        previous: { position: { x: 10, y: 20 }, parameters: { value: 100 } },
        current: { position: { x: 30, y: 40 }, parameters: { value: 100 } },
        changes: { 'position.x': { from: 10, to: 30 } },
      },
    ];

    const diff = createDiffResult({
      componentsModified: modifiedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    // updateComponentState ne doit pas être appelé car parameters n'a pas changé
    expect(documentApi.updateComponentState).not.toHaveBeenCalled();
    expect(documentApi.updateComponentPositions).toHaveBeenCalledTimes(1);
  });

  // ============================================================
  // T15 : Optimisation — ne pas appeler updateComponentPositions si position inchangée
  // ============================================================

  it('T15: should not call updateComponentPositions if position unchanged', () => {
    const modifiedComponents = [
      {
        id: 'C1',
        previous: { position: { x: 10, y: 20 }, parameters: { value: 100 } },
        current: { position: { x: 10, y: 20 }, parameters: { value: 200 } },
        changes: { 'parameters.value': { from: 100, to: 200 } },
      },
    ];

    const diff = createDiffResult({
      componentsModified: modifiedComponents,
      hasChanges: true,
    });

    adapter.apply(diff);

    expect(documentApi.updateComponentPositions).not.toHaveBeenCalled();
    expect(documentApi.updateComponentState).toHaveBeenCalledTimes(1);
  });
});