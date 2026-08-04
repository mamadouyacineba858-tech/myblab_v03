import { describe, it, expect } from 'vitest';
import { UpdateComponentHandler } from '../component/UpdateComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';

describe('UpdateComponentHandler', () => {
  const handler = new UpdateComponentHandler();

  it('should update component parameters', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    const result = handler.execute(command, document);
    expect(result.success).toBe(true);
    const updated = result.document.components.find(c => c.id === 'R1');
    expect(updated.parameters.resistance).toBe(2000);
  });

  it('should update multiple parameters', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'LED1',
        parameters: { color: 'blue', intensity: 80 },
      },
    };

    const result = handler.execute(command, document);
    const updated = result.document.components.find(c => c.id === 'LED1');
    expect(updated.parameters.color).toBe('blue');
    expect(updated.parameters.intensity).toBe(80);
  });

  it('should preserve existing parameters', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'LED1',
        parameters: { intensity: 80 },
      },
    };

    const result = handler.execute(command, document);
    const updated = result.document.components.find(c => c.id === 'LED1');
    expect(updated.parameters.color).toBe('red');
    expect(updated.parameters.intensity).toBe(80);
  });

  it('should not mutate the original document', () => {
    const document = createTestDocument();
    const originalParams = document.components.find(c => c.id === 'R1').parameters.resistance;
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    handler.execute(command, document);
    expect(document.components.find(c => c.id === 'R1').parameters.resistance).toBe(originalParams);
  });

  it('should throw if component does not exist', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
        parameters: { resistance: 2000 },
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if parameters is missing', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    expect(() => handler.execute(command, document)).toThrow('Missing required field: "parameters"');
  });

  it('should create a change object for HistoryManager', () => {
    const document = createTestDocument();
    const command = {
      type: 'UPDATE_COMPONENT',
      payload: {
        componentId: 'R1',
        parameters: { resistance: 2000 },
      },
    };

    const result = handler.execute(command, document);
    expect(result.change).toBeDefined();
    expect(result.change.type).toBe('UPDATE_COMPONENT');
    expect(result.change.componentId).toBe('R1');
    expect(result.change.oldParameters).toEqual({ resistance: 1000 });
    expect(result.change.newParameters).toEqual({ resistance: 2000 });
  });
});
