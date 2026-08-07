import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactCoreBridge } from '../ReactCoreBridge.js';
import { ReactDocumentMapper } from '../ReactDocumentMapper.js';
import { DiffEngine } from '../DiffEngine.js';

describe('ReactCoreBridge', () => {
  let commandBus;
  let documentApi;
  let historyManager;
  let bridge;

  beforeEach(() => {
    // Mock CommandBus
    commandBus = {
      dispatch: vi.fn().mockReturnValue({
        success: true,
        commandId: 'cmd_123',
        result: {
          document: {
            components: [{ id: 'C1', type: 'typeA', position: { x: 30, y: 40 } }],
            wires: [],
          },
        },
      }),
    };

    // Mock DocumentApi
    documentApi = {
      getDocument: vi.fn().mockReturnValue({
        components: [{ uid: 'C1', type: 'typeA', x: 10, y: 20 }],
        wires: [],
      }),
      removeWires: vi.fn(),
      removeComponents: vi.fn(),
      updateComponentState: vi.fn(),
      updateComponentPositions: vi.fn(),
      restoreComponents: vi.fn(),
      restoreWires: vi.fn(),
    };

    // Mock HistoryManager
    historyManager = {
      undo: vi.fn().mockReturnValue({
        document: {
          components: [{ id: 'C1', type: 'typeA', position: { x: 10, y: 20 } }],
          wires: [],
        },
      }),
      redo: vi.fn().mockReturnValue({
        document: {
          components: [{ id: 'C1', type: 'typeA', position: { x: 30, y: 40 } }],
          wires: [],
        },
      }),
      canUndo: vi.fn().mockReturnValue(true),
      canRedo: vi.fn().mockReturnValue(false),
    };

    bridge = new ReactCoreBridge({
      commandBus,
      documentApi,
      historyManager,
    });
  });

  // ============================================================
  // T1 : Dispatch avec succès
  // ============================================================

  it('T1: should dispatch a command successfully', () => {
    const result = bridge.dispatch('ADD_COMPONENT', {
      componentType: 'typeA',
      position: { x: 10, y: 20 },
    });

    expect(commandBus.dispatch).toHaveBeenCalled();
    expect(documentApi.getDocument).toHaveBeenCalled();
    expect(documentApi.updateComponentPositions).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.commandType).toBe('ADD_COMPONENT');
  });

  // ============================================================
  // T2 : Dispatch avec commande sans changement
  // ============================================================

  it('T2: should handle dispatch without changes', () => {
    const result = bridge.dispatch('NOOP', {});
    expect(result.success).toBe(false);
  });

  // ============================================================
  // T3 : Undo avec succès
  // ============================================================

  it('T3: should undo successfully', () => {
    const result = bridge.undo();

    expect(historyManager.undo).toHaveBeenCalled();
    expect(documentApi.getDocument).toHaveBeenCalled();
    expect(documentApi.updateComponentPositions).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // ============================================================
  // T4 : Redo avec succès
  // ============================================================

  it('T4: should redo successfully', () => {
    const result = bridge.redo();

    expect(historyManager.redo).toHaveBeenCalled();
    expect(documentApi.getDocument).toHaveBeenCalled();
    expect(documentApi.updateComponentPositions).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  // ============================================================
  // T5 : canUndo / canRedo
  // ============================================================

  it('T5: should return correct undo/redo state', () => {
    expect(bridge.canUndo()).toBe(true);
    expect(bridge.canRedo()).toBe(false);
    expect(historyManager.canUndo).toHaveBeenCalled();
    expect(historyManager.canRedo).toHaveBeenCalled();
  });

  // ============================================================
  // T6 : Validation des paramètres du constructeur
  // ============================================================

  it('T6: should throw if required parameters are missing', () => {
    expect(() => new ReactCoreBridge({ commandBus, documentApi })).toThrow(
      'ReactCoreBridge: historyManager is required'
    );

    expect(() => new ReactCoreBridge({ commandBus, historyManager })).toThrow(
      'ReactCoreBridge: documentApi is required'
    );

    expect(() => new ReactCoreBridge({ documentApi, historyManager })).toThrow(
      'ReactCoreBridge: commandBus is required'
    );
  });
 // ============================================================
  // T7 : Dispatch avec chemins ignorés
  // ============================================================
  it('T7: should pass ignoredPaths to DiffEngine.compare', () => {
  const compareSpy = vi.spyOn(DiffEngine, 'compare');

  const initialDocument = {
    components: [
      {
        uid: 'C1',
        type: 'typeA',
        x: 10,
        y: 20,
        metadata: { timestamp: 1000 },
      },
    ],
    wires: [],
  };

  documentApi.getDocument.mockReturnValue(initialDocument);

  commandBus.dispatch.mockReturnValue({
    success: true,
    commandId: 'cmd_123',
    result: {
      document: {
        components: [
          {
            id: 'C1',
            type: 'typeA',
            position: { x: 10, y: 20 },
            metadata: { timestamp: 2000 },
          },
        ],
        wires: [],
      },
    },
  });

  const ignoredPaths = ['metadata.timestamp'];

  const result = bridge.dispatch(
    'UPDATE_COMPONENT',
    { componentId: 'C1', parameters: { value: 200 } },
    { ignoredPaths }
  );

  expect(result.success).toBe(true);

  expect(compareSpy).toHaveBeenCalledTimes(1);

  expect(compareSpy).toHaveBeenCalledWith(
    expect.any(Object),
    expect.any(Object),
    expect.objectContaining({
      ignoredPaths,
    })
  );

  compareSpy.mockRestore();
});
// ============================================================
// ============================================================
// T8 : Dispatch sans diff (document inchangé)
// ============================================================

it('T8: should handle dispatch with no document change', () => {
  const updatePositionsSpy = documentApi.updateComponentPositions;
  const updateStateSpy = documentApi.updateComponentState;
  const restoreComponentsSpy = documentApi.restoreComponents;

  const initialDocument = {
    components: [{ uid: 'C1', type: 'typeA', x: 10, y: 20 }],
    wires: [],
  };

  documentApi.getDocument.mockReturnValue(initialDocument);

  const unchangedDocument = {
    components: [
      {
        id: 'C1',
        type: 'typeA',
        position: { x: 10, y: 20 },
      },
    ],
    wires: [],
  };

  commandBus.dispatch.mockReturnValue({
    success: true,
    commandId: 'cmd_456',
    result: {
      document: unchangedDocument,
    },
  });

  const noChangeBridge = new ReactCoreBridge({
    commandBus,
    documentApi,
    historyManager,
  });

  const result = noChangeBridge.dispatch('NOOP_COMMAND', {});

  expect(result.success).toBe(true);
  expect(result.diff.hasChanges).toBe(false);

  expect(updatePositionsSpy).not.toHaveBeenCalled();
  expect(updateStateSpy).not.toHaveBeenCalled();
  expect(restoreComponentsSpy).not.toHaveBeenCalled();
});

  // ============================================================
  // T9 : Bridge ne connaît pas React
  // ============================================================

  it('T9: should not import React', () => {
    // Vérification statique : le fichier ne contient pas d'import React
    const fs = require('fs');
    const content = fs.readFileSync('src/bridge/ReactCoreBridge.js', 'utf8');
    expect(content).not.toContain("from 'react'");
    expect(content).not.toContain('import React');
  });

  // ============================================================
  // T10 : Bridge ne connaît pas le métier électronique
  // ============================================================

  it('T10: should not contain business knowledge', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/bridge/ReactCoreBridge.js', 'utf8');
    expect(content).not.toContain('resistor');
    expect(content).not.toContain('capacitor');
    expect(content).not.toContain('LED');
    expect(content).not.toContain('voltage');
  });
});