import { describe, it, expect } from 'vitest';
import { DeleteBreadboardHandler } from '../breadboard/DeleteBreadboardHandler.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

// MB-BREADBOARD-006 (CSA Ruling — Option B, §7/§8) : fixture locale (même
// motivation que MoveBreadboardHandler.test.js — components/wires réalistes
// pour prouver qu'ils restent STRICTEMENT intacts après suppression, §7 du
// Ruling : "aucune suppression silencieuse de données").
function createBreadboardTestDocument(overrides = {}) {
  return {
    breadboard: { id: 'BB1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
    components: [
      { id: 'RES1', type: 'RESISTOR', position: { x: 0, y: 22 }, parameters: { resistance: 1000 } },
      { id: 'LED1', type: 'LED', position: { x: 300, y: 100 }, parameters: { color: 'red' } },
    ],
    wires: [
      { id: 'W1', pinA: { componentId: 'RES1', pinId: 'A' }, pinB: { componentId: 'LED1', pinId: 'anode' } },
    ],
    ...overrides,
  };
}

describe('DeleteBreadboardHandler — MB-BREADBOARD-006 (CSA Ruling — Option B)', () => {
  function setup(overrides) {
    const ctx = createHandlerTestContext(createBreadboardTestDocument(overrides));
    const handler = new DeleteBreadboardHandler({ historyService: ctx.historyService, documentApi: ctx.documentApi });
    return { ...ctx, handler };
  }

  it('supprime document.breadboard sans toucher components/wires (§7)', () => {
    const { handler, documentApi } = setup();
    const before = documentApi.getDocument();
    const command = { type: 'DELETE_BREADBOARD', payload: { breadboardId: 'BB1' } };

    const outcome = handler.execute(command, before);
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);

    const after = documentApi.getDocument();
    expect(after.breadboard).toBeNull();
    expect(after.components).toEqual(before.components);
    expect(after.wires).toEqual(before.wires);
  });

  it("undo restaure le breadboard à l'identique (même id, position, layout — §9)", () => {
    const { handler, documentApi, historyService } = setup();
    const command = { type: 'DELETE_BREADBOARD', payload: { breadboardId: 'BB1' } };
    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().breadboard).toBeNull();

    historyService.undo();
    expect(documentApi.getDocument().breadboard).toEqual({ id: 'BB1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' });
  });

  it('redo re-supprime après un undo', () => {
    const { handler, documentApi, historyService } = setup();
    const command = { type: 'DELETE_BREADBOARD', payload: { breadboardId: 'BB1' } };
    handler.execute(command, documentApi.getDocument());
    historyService.undo();
    historyService.redo();
    expect(documentApi.getDocument().breadboard).toBeNull();
  });

  it('undo restaure aussi components/wires inchangés (ils n\'avaient jamais été touchés)', () => {
    const { handler, documentApi, historyService } = setup();
    const before = documentApi.getDocument();
    handler.execute({ type: 'DELETE_BREADBOARD', payload: { breadboardId: 'BB1' } }, before);
    historyService.undo();
    const after = documentApi.getDocument();
    expect(after.components).toEqual(before.components);
    expect(after.wires).toEqual(before.wires);
  });

  it('rejette si breadboardId ne correspond à aucun breadboard du Document', () => {
    const { handler, documentApi } = setup();
    const command = { type: 'DELETE_BREADBOARD', payload: { breadboardId: 'WRONG' } };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/BREADBOARD_NOT_FOUND|Aucun breadboard/);
  });

  it('rejette si aucun breadboard n\'existe dans le Document', () => {
    const { handler, documentApi } = setup({ breadboard: null });
    const command = { type: 'DELETE_BREADBOARD', payload: { breadboardId: 'BB1' } };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/BREADBOARD_NOT_FOUND|Aucun breadboard/);
  });

  it('rejette un payload sans breadboardId', () => {
    const { handler, documentApi } = setup();
    expect(() =>
      handler.execute({ type: 'DELETE_BREADBOARD', payload: {} }, documentApi.getDocument())
    ).toThrow(/Missing required field/);
  });
});
