import { describe, it, expect, beforeEach } from 'vitest';
import { MoveComponentHandler } from '../component/MoveComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('MoveComponentHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new MoveComponentHandler({ historyService, documentApi });
  });

  it('should move a component to a new position', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    const moved = documentApi.getDocument().components.find(c => c.id === 'R1');
    expect(moved.position).toEqual({ x: 500, y: 600 });
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    const documentSnapshot = documentApi.getDocument();
    const originalPosition = { ...documentSnapshot.components.find(c => c.id === 'R1').position };
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentSnapshot);
    expect(documentSnapshot.components.find(c => c.id === 'R1').position).toEqual(originalPosition);
  });

  it('should throw if component does not exist', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
        position: { x: 500, y: 600 },
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if position is missing', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "position"');
  });

  it('should throw if position has invalid format', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 'invalid', y: 600 },
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Position must have x and y numbers');
  });

  it('should create a change object for HistoryManager', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('MOVE_COMPONENT');
    expect(outcome.result.change.componentId).toBe('R1');
    expect(outcome.result.change.oldPosition).toEqual({ x: 100, y: 100 });
    expect(outcome.result.change.newPosition).toEqual({ x: 500, y: 600 });
  });

  it('should preserve other component properties', () => {
    const oldComponent = documentApi.getDocument().components.find(c => c.id === 'R1');
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    const moved = documentApi.getDocument().components.find(c => c.id === 'R1');
    expect(moved.type).toBe(oldComponent.type);
    expect(moved.parameters).toEqual(oldComponent.parameters);
    expect(moved.id).toBe(oldComponent.id);
  });

  it('should support undo/redo through the real HistoryManager', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });

    historyService.undo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 100, y: 100 });

    historyService.redo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });
  });
});
