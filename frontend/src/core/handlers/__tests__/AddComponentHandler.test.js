import { describe, it, expect, beforeEach } from 'vitest';
import { AddComponentHandler } from '../component/AddComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

/**
 * NOTE MB-HISTORY-001-A : depuis l'intégration du HistoryService,
 * handler.execute() exige un historyService + documentApi configurés
 * (via le constructeur). Le Document manipulé est celui du documentApi,
 * pas le second argument de execute() (conservé pour compatibilité de
 * signature avec CommandHandler, mais ignoré par _executeWithHistory).
 */
describe('AddComponentHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new AddComponentHandler({ historyService, documentApi });
  });

  it('should add a component to the document', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
        position: { x: 50, y: 50 },
        parameters: { resistance: 2000 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);
    expect(outcome.result.componentId).toBeDefined();

    const document = documentApi.getDocument();
    expect(document.components).toHaveLength(4);

    const added = document.components.find(c => c.id === outcome.result.componentId);
    expect(added.type).toBe('resistor');
    expect(added.position).toEqual({ x: 50, y: 50 });
    expect(added.parameters).toEqual({ resistance: 2000 });
  });

  it('should add a component with default position and parameters', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'LED',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    const document = documentApi.getDocument();
    const added = document.components.find(c => c.id === outcome.result.componentId);
    expect(added.position).toEqual({ x: 0, y: 0 });
    expect(added.parameters).toEqual({});
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    const documentSnapshot = documentApi.getDocument();
    const originalLength = documentSnapshot.components.length;
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
      },
    };

    handler.execute(command, documentSnapshot);
    // Le snapshot passé en argument (ignoré par _executeWithHistory) ne doit pas être muté.
    expect(documentSnapshot.components).toHaveLength(originalLength);
  });

  it('should throw if componentType is missing', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {},
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "componentType"');
  });

  it('should throw if historyService is not configured', () => {
    const bareHandler = new AddComponentHandler();
    const command = {
      type: 'ADD_COMPONENT',
      payload: { componentType: 'resistor' },
    };

    expect(() => bareHandler.execute(command, createTestDocument())).toThrow('HistoryService not configured for this handler');
  });

  it('should create a change object for HistoryManager', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('ADD_COMPONENT');
    expect(outcome.result.change.componentId).toBe(outcome.result.componentId);
    expect(outcome.result.change.component).toBeDefined();
    expect(outcome.result.change.component.type).toBe('resistor');
  });

  it('should support undo/redo through the real HistoryManager', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
        position: { x: 5, y: 5 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    const componentId = outcome.result.componentId;

    expect(documentApi.getDocument().components.some(c => c.id === componentId)).toBe(true);

    historyService.undo();
    expect(documentApi.getDocument().components.some(c => c.id === componentId)).toBe(false);

    historyService.redo();
    expect(documentApi.getDocument().components.some(c => c.id === componentId)).toBe(true);
  });
});
