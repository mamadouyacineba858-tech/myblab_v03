import { describe, it, expect } from 'vitest';
import { MoveComponentHandler } from '../component/MoveComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';

describe('MoveComponentHandler', () => {
  const handler = new MoveComponentHandler();

  it('should move a component to a new position', () => {
    const document = createTestDocument();
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const result = handler.execute(command, document);
    expect(result.success).toBe(true);
    const moved = result.document.components.find(c => c.id === 'R1');
    expect(moved.position).toEqual({ x: 500, y: 600 });
  });

  it('should not mutate the original document', () => {
    const document = createTestDocument();
    const originalPosition = { ...document.components.find(c => c.id === 'R1').position };
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, document);
    expect(document.components.find(c => c.id === 'R1').position).toEqual(originalPosition);
  });

  it('should throw if component does not exist', () => {
    const document = createTestDocument();
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
        position: { x: 500, y: 600 },
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if position is missing', () => {
    const document = createTestDocument();
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Missing required field: "position"');
  });

  it('should throw if position has invalid format', () => {
    const document = createTestDocument();
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 'invalid', y: 600 },
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Position must have x and y numbers');
  });

  it('should create a change object for HistoryManager', () => {
    const document = createTestDocument();
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const result = handler.execute(command, document);
    expect(result.change).toBeDefined();
    expect(result.change.type).toBe('MOVE_COMPONENT');
    expect(result.change.componentId).toBe('R1');
    expect(result.change.oldPosition).toEqual({ x: 100, y: 100 });
    expect(result.change.newPosition).toEqual({ x: 500, y: 600 });
  });

  it('should preserve other component properties', () => {
    const document = createTestDocument();
    const oldComponent = document.components.find(c => c.id === 'R1');
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const result = handler.execute(command, document);
    const moved = result.document.components.find(c => c.id === 'R1');
    expect(moved.type).toBe(oldComponent.type);
    expect(moved.parameters).toEqual(oldComponent.parameters);
    expect(moved.id).toBe(oldComponent.id);
  });
});
