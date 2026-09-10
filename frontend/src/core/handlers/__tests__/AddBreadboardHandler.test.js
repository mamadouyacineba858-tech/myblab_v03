import { describe, it, expect, beforeEach } from 'vitest';
import { AddBreadboardHandler } from '../breadboard/AddBreadboardHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('AddBreadboardHandler — MB-BREADBOARD-002 ; multi-breadboard FT-C-BREAD-MULTI-001-A', () => {
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

  it('FT-C-BREAD-MULTI-001-A : ADD successifs empilent des entrées distinctes dans breadboards[] (LOCK-01 levé)', () => {
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'bb-A', position: { x: 0, y: 0 } } }, documentApi.getDocument());
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'bb-B', position: { x: 200, y: 0 } } }, documentApi.getDocument());
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'bb-C', position: { x: 400, y: 0 } } }, documentApi.getDocument());

    const doc = documentApi.getDocument();
    expect(doc.breadboards.map((b) => b.id)).toEqual(['bb-A', 'bb-B', 'bb-C']);
    expect(new Set(doc.breadboards.map((b) => b.id)).size).toBe(3);
    expect(doc.breadboards.map((b) => b.position)).toEqual([
      { x: 0, y: 0 }, { x: 204, y: 0 }, { x: 396, y: 0 },
    ]);
    // Projection transitoire = première entrée.
    expect(doc.breadboard.id).toBe('bb-A');
  });

  it('FT-C-BREAD-MULTI-001-A : refuse un id déjà présent, sans altérer les autres', () => {
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'dup', position: { x: 0, y: 0 } } }, documentApi.getDocument());
    expect(() =>
      handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'dup', position: { x: 200, y: 200 } } }, documentApi.getDocument())
    ).toThrow(/existe déjà|ALREADY_EXISTS/i);
    expect(documentApi.getDocument().breadboards).toHaveLength(1);
    expect(documentApi.getDocument().breadboards[0].position).toEqual({ x: 0, y: 0 });
  });

  it('undo retire uniquement l\'entrée ajoutée, redo la restaure (par id, sans toucher aux autres)', () => {
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'keep', position: { x: 0, y: 0 } } }, documentApi.getDocument());
    handler.execute({ type: 'ADD_BREADBOARD', payload: { breadboardId: 'tmp', position: { x: 24, y: 24 } } }, documentApi.getDocument());
    expect(documentApi.getDocument().breadboards.map((b) => b.id)).toEqual(['keep', 'tmp']);

    historyService.undo();
    expect(documentApi.getDocument().breadboards.map((b) => b.id)).toEqual(['keep']);

    historyService.redo();
    expect(documentApi.getDocument().breadboards.map((b) => b.id)).toEqual(['keep', 'tmp']);
    expect(documentApi.getDocument().breadboards[1]).toMatchObject({ position: { x: 24, y: 24 } });
  });
});
