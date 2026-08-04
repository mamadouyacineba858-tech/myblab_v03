import { describe, it, expect } from 'vitest';
import { RemoveComponentHandler } from '../component/RemoveComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';

describe('RemoveComponentHandler', () => {
  const handler = new RemoveComponentHandler();

  it('should remove a component from the document', () => {
    const document = createTestDocument();
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const result = handler.execute(command, document);
    expect(result.success).toBe(true);
    expect(result.document.components).toHaveLength(2);
    expect(result.document.components.find(c => c.id === 'R1')).toBeUndefined();
  });

  it('should remove wires associated with the component', () => {
    const document = createTestDocument();
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const result = handler.execute(command, document);
    expect(result.removedWireIds).toHaveLength(2);
    expect(result.document.wires).toHaveLength(0);
  });

  it('should not mutate the original document', () => {
    const document = createTestDocument();
    const originalLength = document.components.length;
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    handler.execute(command, document);
    expect(document.components).toHaveLength(originalLength);
  });

  it('should throw if component does not exist', () => {
    const document = createTestDocument();
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if componentId is missing', () => {
    const document = createTestDocument();
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {},
    };

    expect(() => handler.execute(command, document)).toThrow('Missing required field: "componentId"');
  });

  it('should create a change object for HistoryManager', () => {
    const document = createTestDocument();
    const command = {
      type: 'REMOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    const result = handler.execute(command, document);
    expect(result.change).toBeDefined();
    expect(result.change.type).toBe('REMOVE_COMPONENT');
    expect(result.change.componentId).toBe('R1');
  });
});
