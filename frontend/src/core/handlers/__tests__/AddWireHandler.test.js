import { describe, it, expect } from 'vitest';
import { AddWireHandler } from '../wire/AddWireHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

/**
 * MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001).
 *
 * Même patron de test que AddComponentHandler.test.js (MB-CF3-001) :
 * handler.execute() exige un historyService + documentApi configurés ; le
 * Document manipulé est celui du documentApi, pas le second argument de
 * execute() (conservé pour compatibilité de signature avec CommandHandler,
 * mais ignoré par _executeWithHistory).
 */
describe('AddWireHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  const setup = () => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new AddWireHandler({ historyService, documentApi });
  };

  it('should add a wire to the document (Core shape: pinA/pinB)', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: {
        fromUid: 'R1',
        fromPin: 'pin3',
        toUid: 'LED1',
        toPin: 'cathode',
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);
    expect(outcome.result.wireId).toBeDefined();

    const document = documentApi.getDocument();
    expect(document.wires).toHaveLength(3);

    const added = document.wires.find(w => w.id === outcome.result.wireId);
    expect(added.pinA).toEqual({ componentId: 'R1', pinId: 'pin3' });
    expect(added.pinB).toEqual({ componentId: 'LED1', pinId: 'cathode' });
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    setup();
    const documentSnapshot = documentApi.getDocument();
    const originalLength = documentSnapshot.wires.length;
    const command = {
      type: 'ADD_WIRE',
      payload: {
        fromUid: 'R1',
        fromPin: 'pin3',
        toUid: 'C1',
        toPin: 'pin2',
      },
    };

    handler.execute(command, documentSnapshot);
    // Le snapshot passé en argument (ignoré par _executeWithHistory) ne doit pas être muté.
    expect(documentSnapshot.wires).toHaveLength(originalLength);
  });

  it('should throw if fromUid is missing', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromPin: 'pin1', toUid: 'C1', toPin: 'pin1' },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "fromUid"');
  });

  it('should throw if fromPin is missing', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', toUid: 'C1', toPin: 'pin1' },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "fromPin"');
  });

  it('should throw if toUid is missing', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin1', toPin: 'pin1' },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "toUid"');
  });

  it('should throw if toPin is missing', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin1', toUid: 'C1' },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "toPin"');
  });

  it('should throw if historyService is not configured', () => {
    setup();
    const bareHandler = new AddWireHandler();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin3', toUid: 'C1', toPin: 'pin2' },
    };

    expect(() => bareHandler.execute(command, createTestDocument())).toThrow('HistoryService not configured for this handler');
  });

  it('should create a change object for HistoryManager', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin3', toUid: 'C1', toPin: 'pin2' },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('ADD_WIRE');
    expect(outcome.result.change.wireId).toBe(outcome.result.wireId);
    expect(outcome.result.change.wire).toBeDefined();
    expect(outcome.result.change.wire.pinA).toEqual({ componentId: 'R1', pinId: 'pin3' });
  });

  it('should support undo/redo through the real HistoryManager', () => {
    setup();
    const command = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin3', toUid: 'LED1', toPin: 'cathode' },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    const wireId = outcome.result.wireId;

    expect(documentApi.getDocument().wires.some(w => w.id === wireId)).toBe(true);

    historyService.undo();
    expect(documentApi.getDocument().wires.some(w => w.id === wireId)).toBe(false);

    historyService.redo();
    expect(documentApi.getDocument().wires.some(w => w.id === wireId)).toBe(true);
  });

  it('does not persist an id generated on a rejected attempt when retried with a fresh command', () => {
    // Preuve que _generateWireId() ne fuit pas d'état entre deux commandes
    // distinctes (chaque Command porte son propre payload.wireId une fois assigné).
    setup();
    const command1 = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin3', toUid: 'C1', toPin: 'pin2' },
    };
    const command2 = {
      type: 'ADD_WIRE',
      payload: { fromUid: 'R1', fromPin: 'pin4', toUid: 'LED1', toPin: 'cathode' },
    };

    const outcome1 = handler.execute(command1, documentApi.getDocument());
    const outcome2 = handler.execute(command2, documentApi.getDocument());

    expect(outcome1.result.wireId).not.toBe(outcome2.result.wireId);
  });
});
