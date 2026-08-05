import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateComponentHandler } from '../component/UpdateComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('UpdateComponentHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new UpdateComponentHandler({ historyService, documentApi });
  });

  it('should update component parameters', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    const updated = documentApi.getDocument().components.find(c => c.id === 'R1');
    expect(updated.parameters.resistance).toBe(2000);
  });

  it('should update multiple parameters', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'LED1',
        parameters: { color: 'blue', intensity: 80 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    const updated = documentApi.getDocument().components.find(c => c.id === 'LED1');
    expect(updated.parameters.color).toBe('blue');
    expect(updated.parameters.intensity).toBe(80);
  });

  it('should preserve existing parameters', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'LED1',
        parameters: { intensity: 80 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    const updated = documentApi.getDocument().components.find(c => c.id === 'LED1');
    expect(updated.parameters.color).toBe('red');
    expect(updated.parameters.intensity).toBe(80);
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    const documentSnapshot = documentApi.getDocument();
    const originalResistance = documentSnapshot.components.find(c => c.id === 'R1').parameters.resistance;
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    handler.execute(command, documentSnapshot);
    expect(documentSnapshot.components.find(c => c.id === 'R1').parameters.resistance).toBe(originalResistance);
  });

  it('should throw if component does not exist', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
        parameters: { resistance: 2000 },
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if parameters is missing', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "parameters"');
  });

  it('should create a change object for HistoryManager', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('UPDATE_COMPONENT');
    expect(outcome.result.change.componentId).toBe('R1');
    expect(outcome.result.change.oldParameters).toEqual({ resistance: 1000 });
    expect(outcome.result.change.newParameters).toEqual({ resistance: 2000 });
  });

  it('should support undo/redo through the real HistoryManager', () => {
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').parameters.resistance).toBe(2000);

    historyService.undo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').parameters.resistance).toBe(1000);

    historyService.redo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').parameters.resistance).toBe(2000);
  });
});
