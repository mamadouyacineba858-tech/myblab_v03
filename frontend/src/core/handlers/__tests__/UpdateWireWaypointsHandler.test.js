import { describe, it, expect } from 'vitest';
import { UpdateWireWaypointsHandler } from '../wire/UpdateWireWaypointsHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

/**
 * MB-VIS-005.
 *
 * Même patron de test que UpdateComponentHandler.test.js (remplacement
 * atomique d'une propriété + snapshot ancien/nouveau pour Undo/Redo), et
 * que AddWireHandler.test.js pour tout ce qui concerne le Document réel du
 * documentApi. Ce Handler n'est PAS enregistré dans le CommandRegistry de
 * production (voir en-tête de UpdateWireWaypointsHandler.js) : ces tests
 * l'exercent directement, exactement comme UpdateComponentHandler/
 * MoveComponentHandler/RemoveComponentHandler le sont déjà aujourd'hui.
 */
describe('UpdateWireWaypointsHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  const setup = () => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new UpdateWireWaypointsHandler({ historyService, documentApi });
  };

  it('replaces the waypoints array of an existing wire', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);

    const document = documentApi.getDocument();
    const wire = document.wires.find((w) => w.id === 'W1');
    expect(wire.waypoints).toEqual([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
  });

  it('accepts an empty waypoints array (removing all waypoints)', () => {
    setup();
    const first = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 1, y: 1 }] },
    };
    handler.execute(first, documentApi.getDocument());

    const clear = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [] },
    };
    handler.execute(clear, documentApi.getDocument());

    const wire = documentApi.getDocument().wires.find((w) => w.id === 'W1');
    expect(wire.waypoints).toEqual([]);
  });

  it('never modifies pinA/pinB (topology stays out of scope of this mutation)', () => {
    setup();
    const before = documentApi.getDocument().wires.find((w) => w.id === 'W1');
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 5, y: 5 }] },
    };

    handler.execute(command, documentApi.getDocument());

    const after = documentApi.getDocument().wires.find((w) => w.id === 'W1');
    expect(after.pinA).toEqual(before.pinA);
    expect(after.pinB).toEqual(before.pinB);
  });

  it('does not affect other wires in the document', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 5, y: 5 }] },
    };

    handler.execute(command, documentApi.getDocument());

    const document = documentApi.getDocument();
    expect(document.wires).toHaveLength(2);
    const untouched = document.wires.find((w) => w.id === 'W2');
    expect(untouched.waypoints).toBeUndefined();
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    setup();
    const documentSnapshot = documentApi.getDocument();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 9, y: 9 }] },
    };

    handler.execute(command, documentSnapshot);
    expect(documentSnapshot.wires.find((w) => w.id === 'W1').waypoints).toBeUndefined();
  });

  it('should throw if the wire does not exist', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'NONEXISTENT', waypoints: [] },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(
      'Wire with id "NONEXISTENT" not found in document'
    );
  });

  it('should throw if wireId is missing', () => {
    setup();
    const command = { type: 'UPDATE_WIRE_WAYPOINTS', payload: { waypoints: [] } };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(
      'Missing required field: "wireId"'
    );
  });

  it('should throw if waypoints is missing', () => {
    setup();
    const command = { type: 'UPDATE_WIRE_WAYPOINTS', payload: { wireId: 'W1' } };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(
      'Missing required field: "waypoints"'
    );
  });

  it('should throw if waypoints is not an array', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: 'not-an-array' },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(
      'waypoints must be an array'
    );
  });

  it('should throw if historyService is not configured', () => {
    setup();
    const bareHandler = new UpdateWireWaypointsHandler();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [] },
    };

    expect(() => bareHandler.execute(command, createTestDocument())).toThrow(
      'HistoryService not configured for this handler'
    );
  });

  it('should create a change object for HistoryManager', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 1, y: 2 }] },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('UPDATE_WIRE_WAYPOINTS');
    expect(outcome.result.change.wireId).toBe('W1');
    expect(outcome.result.change.oldWaypoints).toEqual([]);
    expect(outcome.result.change.newWaypoints).toEqual([{ x: 1, y: 2 }]);
  });

  it('should support undo/redo through the real HistoryManager', () => {
    setup();
    const command = {
      type: 'UPDATE_WIRE_WAYPOINTS',
      payload: { wireId: 'W1', waypoints: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
    };

    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);

    historyService.undo();
    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([]);

    historyService.redo();
    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it('supports several successive waypoint mutations with correct undo chaining', () => {
    setup();
    handler.execute(
      { type: 'UPDATE_WIRE_WAYPOINTS', payload: { wireId: 'W1', waypoints: [{ x: 1, y: 1 }] } },
      documentApi.getDocument()
    );
    handler.execute(
      { type: 'UPDATE_WIRE_WAYPOINTS', payload: { wireId: 'W1', waypoints: [{ x: 2, y: 2 }] } },
      documentApi.getDocument()
    );

    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([
      { x: 2, y: 2 },
    ]);

    historyService.undo();
    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([
      { x: 1, y: 1 },
    ]);

    historyService.undo();
    expect(documentApi.getDocument().wires.find((w) => w.id === 'W1').waypoints).toEqual([]);
  });
});
