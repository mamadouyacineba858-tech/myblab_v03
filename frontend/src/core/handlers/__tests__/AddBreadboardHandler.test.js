import { describe, it, expect, beforeEach } from 'vitest';
import { AddBreadboardHandler } from '../breadboard/AddBreadboardHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('AddBreadboardHandler — MB-BREADBOARD-002', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new AddBreadboardHandler({ historyService, documentApi });
  });

  it('ajoute un breadboard au Document', () => {
    const command = { type: 'ADD_BREADBOARD', payload: { position: { x: 100, y: 100 } } };
    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);
    expect(outcome.result.breadboardId).toBeDefined();

    const document = documentApi.getDocument();
    expect(document.breadboard).toMatchObject({ layout: 'STANDARD_V1' });
  });

  it('aligne la position sur le pas dédié du breadboard (AC-02)', () => {
    const command = { type: 'ADD_BREADBOARD', payload: { position: { x: 5, y: 7 } } };
    handler.execute(command, documentApi.getDocument());
    const document = documentApi.getDocument();
    expect(document.breadboard.position).toEqual({ x: 0, y: 12 });
  });

  it('utilise la position par défaut {0,0} sans payload', () => {
    const command = { type: 'ADD_BREADBOARD', payload: {} };
    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().breadboard.position).toEqual({ x: 0, y: 0 });
  });

  it('refuse un second breadboard sur le même Document (LOCK-01)', () => {
    handler.execute({ type: 'ADD_BREADBOARD', payload: {} }, documentApi.getDocument());
    expect(() =>
      handler.execute({ type: 'ADD_BREADBOARD', payload: { position: { x: 200, y: 200 } } }, documentApi.getDocument())
    ).toThrow(/LOCK-01|un seul breadboard/i);

    // Le premier breadboard n'a pas été altéré par la tentative refusée.
    expect(documentApi.getDocument().breadboard.position).toEqual({ x: 0, y: 0 });
  });

  it('undo retire le breadboard, redo le restaure (LOCK-01 respecté après undo/redo)', () => {
    handler.execute({ type: 'ADD_BREADBOARD', payload: { position: { x: 24, y: 24 } } }, documentApi.getDocument());
    expect(documentApi.getDocument().breadboard).not.toBeNull();

    historyService.undo();
    expect(documentApi.getDocument().breadboard).toBeFalsy();

    historyService.redo();
    expect(documentApi.getDocument().breadboard).toMatchObject({ position: { x: 24, y: 24 } });
  });
});
