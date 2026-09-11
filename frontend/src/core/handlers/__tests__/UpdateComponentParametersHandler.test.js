import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateComponentParametersHandler } from '../component/UpdateComponentParametersHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';

describe('MB-L1-CVE-001 — UpdateComponentParametersHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new UpdateComponentParametersHandler({ historyService, documentApi });
  });

  it('T8 — met à jour component.parameters, sans modifier aucun autre champ', () => {
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 220 } },
    };
    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);

    const updated = documentApi.getDocument().components.find((c) => c.id === 'R1');
    expect(updated.parameters).toEqual({ resistance: 220 });
    expect(updated.position).toEqual({ x: 100, y: 100 });
    expect(updated.type).toBe('resistor');
    expect(updated.id).toBe('R1');
  });

  it('ne mute pas le document snapshot passé à execute()', () => {
    const snapshot = documentApi.getDocument();
    const originalParameters = { ...snapshot.components.find((c) => c.id === 'R1').parameters };
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: originalParameters, afterParameters: { resistance: 5000 } },
    };
    handler.execute(command, snapshot);
    expect(snapshot.components.find((c) => c.id === 'R1').parameters).toEqual(originalParameters);
  });

  it('throws si le composant n\'existe pas', () => {
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'NONEXISTENT', beforeParameters: {}, afterParameters: { resistance: 1 } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow();
  });

  it('throws si beforeParameters/afterParameters ne sont pas des objets', () => {
    expect(() => handler.execute({
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: null, afterParameters: { resistance: 1 } },
    }, documentApi.getDocument())).toThrow();
    expect(() => handler.execute({
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: {}, afterParameters: 'not-an-object' },
    }, documentApi.getDocument())).toThrow();
  });

  it('CV-12 — une valeur invalide (validateParameters injecté, rejet) n\'atteint jamais le Document persistant', () => {
    const rejectingHandler = new UpdateComponentParametersHandler({
      historyService,
      documentApi,
      validateParameters: () => ({ valid: false, errors: ['forced rejection'] }),
    });
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 999999 } },
    };
    expect(() => rejectingHandler.execute(command, documentApi.getDocument())).toThrow();
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 1000 });
  });

  it('T9 — Undo restaure exactement beforeParameters', () => {
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 220 } },
    };
    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 220 });

    historyService.undo();
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 1000 });
  });

  it('T10 — Redo réapplique exactement afterParameters', () => {
    const command = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 220 } },
    };
    handler.execute(command, documentApi.getDocument());
    historyService.undo();
    historyService.redo();
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 220 });
  });

  it('T11 — un nouveau dispatch après Undo invalide l\'ancien Redo (invariant History existant, non spécifique à ce Handler)', () => {
    const first = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 220 } },
    };
    handler.execute(first, documentApi.getDocument());
    historyService.undo();
    expect(historyService.canRedo()).toBe(true);

    const second = {
      type: 'UPDATE_COMPONENT_PARAMETERS',
      payload: { componentId: 'R1', beforeParameters: { resistance: 1000 }, afterParameters: { resistance: 4700 } },
    };
    handler.execute(second, documentApi.getDocument());
    expect(historyService.canRedo()).toBe(false);
    expect(documentApi.getDocument().components.find((c) => c.id === 'R1').parameters).toEqual({ resistance: 4700 });
  });
});
