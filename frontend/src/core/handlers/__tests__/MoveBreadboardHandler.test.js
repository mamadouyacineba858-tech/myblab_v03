import { describe, it, expect, vi } from 'vitest';
import { MoveBreadboardHandler } from '../breadboard/MoveBreadboardHandler.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';
import { Command } from '../../command/Command.js';
import { CommandBus } from '../../command/CommandBus.js';
import { CommandRegistry } from '../../command/CommandRegistry.js';
import { ValidationEngine } from '../../validation/ValidationEngine.js';
import { createDefaultValidationRegistry } from '../../validation/createValidationRegistry.js';
import { HistoryManager } from '../../../history/HistoryManager.js';
import { HistoryService } from '../../history/HistoryService.js';

// MB-BREADBOARD-006 (CSA Ruling — Option B, §1/§2/§4) : fixture LOCALE
// dédiée (et non testDocument.js, qui utilise des types minuscules
// synthétiques 'resistor'/'capacitor' — insuffisant ici car
// resolveSolidaryComponentIds() a réellement besoin de getComponentDef()
// pour résoudre les pins réelles). RESISTOR (dx 0/84, dy 14/14 —
// componentDefinitions.js) est utilisé comme composant de référence : 84
// est un multiple exact de BREADBOARD_PITCH (12), ce qui rend les positions
// attendues déductibles sans ambiguïté de tolérance. breadboard.position =
// {0,0} pour une arithmétique directe (column = x/12, row = y/12).
//
// RES1 à {x:0,y:22} : pin A (dx0,dy14) -> (0,36) -> col0/row3 (STRIP top) ;
// pin B (dx84,dy14) -> (84,36) -> col7/row3 (STRIP top) — les deux résolvent,
// RES1 est donc SOLIDAIRE du breadboard.
// FAR1 à {x:1000,y:1000} : hors grille, jamais solidaire (témoin de non-
// régression — INV-04).
function createBreadboardTestDocument(overrides = {}) {
  return {
    breadboard: { id: 'BB1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
    components: [
      { id: 'RES1', type: 'RESISTOR', position: { x: 0, y: 22 }, parameters: { resistance: 1000 } },
      { id: 'FAR1', type: 'LED', position: { x: 1000, y: 1000 }, parameters: { color: 'red' } },
    ],
    wires: [],
    ...overrides,
  };
}

describe('MoveBreadboardHandler — MB-BREADBOARD-006 (CSA Ruling — Option B)', () => {
  function setup(overrides) {
    const ctx = createHandlerTestContext(createBreadboardTestDocument(overrides));
    const handler = new MoveBreadboardHandler({ historyService: ctx.historyService, documentApi: ctx.documentApi });
    return { ...ctx, handler };
  }

  it('déplace le breadboard ET translate le composant solidaire par le même delta, sans toucher au composant non solidaire (§1)', () => {
    const { handler, documentApi } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    expect(outcome.result.success).toBe(true);

    const doc = documentApi.getDocument();
    expect(doc.breadboard.position).toEqual({ x: 24, y: 24 });
    // RES1 solidaire : translaté du même delta (+24,+24).
    expect(doc.components.find((c) => c.id === 'RES1').position).toEqual({ x: 24, y: 46 });
    // FAR1 non solidaire : jamais touché (INV-04).
    expect(doc.components.find((c) => c.id === 'FAR1').position).toEqual({ x: 1000, y: 1000 });
  });

  it('componentMoves du résultat contient uniquement le composant solidaire', () => {
    const { handler, documentApi } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };
    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.componentMoves).toEqual([
      { componentId: 'RES1', oldPosition: { x: 0, y: 22 }, newPosition: { x: 24, y: 46 } },
    ]);
  });

  it('aucun composant solidaire : seul le breadboard bouge (translation isolée dégénérée, non une erreur)', () => {
    const { handler, documentApi } = setup({
      components: [{ id: 'FAR1', type: 'LED', position: { x: 1000, y: 1000 }, parameters: {} }],
    });
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };
    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.componentMoves).toEqual([]);
    expect(documentApi.getDocument().breadboard.position).toEqual({ x: 24, y: 24 });
  });

  it("undo restaure atomiquement breadboard ET composant solidaire ; redo réapplique tel quel sans recalculer la solidarité (§2/§9)", () => {
    const { handler, documentApi, historyService } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };
    handler.execute(command, documentApi.getDocument());

    historyService.undo();
    let doc = documentApi.getDocument();
    expect(doc.breadboard.position).toEqual({ x: 0, y: 0 });
    expect(doc.components.find((c) => c.id === 'RES1').position).toEqual({ x: 0, y: 22 });

    historyService.redo();
    doc = documentApi.getDocument();
    expect(doc.breadboard.position).toEqual({ x: 24, y: 24 });
    expect(doc.components.find((c) => c.id === 'RES1').position).toEqual({ x: 24, y: 46 });
  });

  it("une seule entrée d'historique par déplacement solidaire (§2)", () => {
    const { handler, documentApi, historyService } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };
    handler.execute(command, documentApi.getDocument());
    expect(historyService.canUndo()).toBe(true);
    historyService.undo();
    expect(historyService.canUndo()).toBe(false);
    expect(historyService.canRedo()).toBe(true);
  });

  it('rejette si breadboardId ne correspond à aucun breadboard du Document', () => {
    const { handler, documentApi } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'WRONG', fromPosition: { x: 0, y: 0 }, toPosition: { x: 24, y: 24 } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/BREADBOARD_NOT_FOUND|Aucun breadboard/);
  });

  it('rejette si fromPosition ne correspond pas à la position courante du breadboard (protection anti-rejeu incohérent)', () => {
    const { handler, documentApi } = setup();
    const command = {
      type: 'MOVE_BREADBOARD',
      payload: { breadboardId: 'BB1', fromPosition: { x: 12, y: 12 }, toPosition: { x: 24, y: 24 } },
    };
    expect(() => handler.execute(command, documentApi.getDocument())).toThrow(/BREADBOARD_POSITION_MISMATCH|fromPosition/);
  });

  it('rejette un payload sans breadboardId/fromPosition/toPosition', () => {
    const { handler, documentApi } = setup();
    expect(() =>
      handler.execute({ type: 'MOVE_BREADBOARD', payload: { breadboardId: 'BB1' } }, documentApi.getDocument())
    ).toThrow(/Missing required field/);
  });

  it('rejette toPosition/fromPosition non numériques', () => {
    const { handler, documentApi } = setup();
    expect(() =>
      handler.execute(
        { type: 'MOVE_BREADBOARD', payload: { breadboardId: 'BB1', fromPosition: { x: 0, y: 0 }, toPosition: { x: 'a', y: 0 } } },
        documentApi.getDocument()
      )
    ).toThrow(/numeric x and y/);
  });

  describe('CommandBus -> ValidationEngine -> MoveBreadboardHandler (câblage réel, §8)', () => {
    function buildStack() {
      let currentDocument = createBreadboardTestDocument();
      const stackDocumentApi = {
        getDocument: () => currentDocument,
        applyDocument: (doc) => { currentDocument = doc; },
      };
      const historyManager = new HistoryManager();
      const stackHistoryService = new HistoryService(historyManager, stackDocumentApi);

      const registry = new CommandRegistry();
      registry.register('MOVE_BREADBOARD', new MoveBreadboardHandler({ historyService: stackHistoryService, documentApi: stackDocumentApi }));

      const validationEngine = new ValidationEngine(createDefaultValidationRegistry());
      const bus = new CommandBus(registry, { validationEngine });
      return { bus, getDocument: () => currentDocument };
    }

    it('un MOVE_BREADBOARD légitime traverse ValidationEngine (registre de production réel) sans être bloqué', () => {
      const { bus, getDocument } = buildStack();
      const spy = vi.spyOn(MoveBreadboardHandler.prototype, 'execute');
      const command = new Command('MOVE_BREADBOARD', {
        breadboardId: 'BB1',
        fromPosition: { x: 0, y: 0 },
        toPosition: { x: 24, y: 24 },
      });
      const result = bus.dispatch(command, getDocument());

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(getDocument().breadboard.position).toEqual({ x: 24, y: 24 });
      spy.mockRestore();
    });
  });
});
