import { describe, it, expect, beforeEach } from 'vitest';
import { RemoveComponentHandler } from '../component/RemoveComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('RemoveComponentHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new RemoveComponentHandler({ historyService, documentApi });
  });

  it('should remove a component from the document', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);

    const document = documentApi.getDocument();
    expect(document.components).toHaveLength(2);
    expect(document.components.find(c => c.id === 'R1')).toBeUndefined();
  });

  it('should remove wires associated with the component', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.removedWireIds).toHaveLength(2);
    expect(documentApi.getDocument().wires).toHaveLength(0);
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    const documentSnapshot = documentApi.getDocument();
    const originalLength = documentSnapshot.components.length;
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    handler.execute(command, documentSnapshot);
    expect(documentSnapshot.components).toHaveLength(originalLength);
  });

  it('should throw if component does not exist', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if componentId is missing', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {},
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "componentId"');
  });

  it('should create a change object for HistoryManager', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('REMOVE_COMPONENT');
    expect(outcome.result.change.componentId).toBe('R1');
  });

  it('should support undo/redo through the real HistoryManager (component and wires restored)', () => {
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find(c => c.id === 'R1')).toBeUndefined();
    expect(documentApi.getDocument().wires).toHaveLength(0);

    historyService.undo();
    const restored = documentApi.getDocument();
    expect(restored.components.find(c => c.id === 'R1')).toBeDefined();
    expect(restored.wires).toHaveLength(2);

    historyService.redo();
    const redone = documentApi.getDocument();
    expect(redone.components.find(c => c.id === 'R1')).toBeUndefined();
    expect(redone.wires).toHaveLength(0);
  });
});
