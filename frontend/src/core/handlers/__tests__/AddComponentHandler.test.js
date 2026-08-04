import { describe, it, expect } from 'vitest';
import { AddComponentHandler } from '../component/AddComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';

describe('AddComponentHandler', () => {
  const handler = new AddComponentHandler();

  it('should add a component to the document', () => {
    const document = createTestDocument();
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
        position: { x: 50, y: 50 },
        parameters: { resistance: 2000 },
      },
    };

    const result = handler.execute(command, document);
    expect(result.success).toBe(true);
    expect(result.document.components).toHaveLength(4);
    expect(result.componentId).toBeDefined();
    expect(result.componentId).toContain('resistor_');

    const added = result.document.components.find(c => c.id === result.componentId);
    expect(added.type).toBe('resistor');
    expect(added.position).toEqual({ x: 50, y: 50 });
    expect(added.parameters).toEqual({ resistance: 2000 });
  });

  it('should add a component with default position and parameters', () => {
    const document = createTestDocument();
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'LED',
      },
    };

    const result = handler.execute(command, document);
    const added = result.document.components.find(c => c.id === result.componentId);
    expect(added.position).toEqual({ x: 0, y: 0 });
    expect(added.parameters).toEqual({});
  });

  it('should not mutate the original document', () => {
    const document = createTestDocument();
    const originalLength = document.components.length;
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
      },
    };

    handler.execute(command, document);
    expect(document.components).toHaveLength(originalLength);
  });

  it('should throw if componentType is missing', () => {
    const document = createTestDocument();
    const command = {
      type: 'ADD_COMPONENT',
      payload: {},
    };

    expect(() => handler.execute(command, document)).toThrow('Missing required field: "componentType"');
  });

  it('should create a change object for HistoryManager', () => {
    const document = createTestDocument();
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
      },
    };

    const result = handler.execute(command, document);
    expect(result.change).toBeDefined();
    expect(result.change.type).toBe('ADD_COMPONENT');
    expect(result.change.componentId).toBe(result.componentId);
    expect(result.change.component).toBeDefined();
    expect(result.change.component.type).toBe('resistor');
  });
});
