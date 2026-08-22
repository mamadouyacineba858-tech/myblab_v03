import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveComponentHandler } from '../component/MoveComponentHandler.js';
import { createTestDocument } from './fixtures/testDocument.js';
import { createHandlerTestContext } from './fixtures/testHistoryContext.js';
// MB-CF3-003 (CSA FINAL AUDIT §4) : preuve que MOVE_COMPONENT passe bien par
// CommandBus -> ValidationEngine -> MoveComponentHandler, et pas seulement
// CommandBus -> Handler. Mêmes briques Core que le test comportemental
// existant "AMENDÉ par CSA-CF4-001-A" dans cf1DocumentArchitecture.test.js.
import { Command } from '../../command/Command.js';
import { CommandBus } from '../../command/CommandBus.js';
import { CommandRegistry } from '../../command/CommandRegistry.js';
import { ValidationEngine } from '../../validation/ValidationEngine.js';
import { ValidationRegistry } from '../../validation/ValidationRegistry.js';
import { createDefaultValidationRegistry } from '../../validation/createValidationRegistry.js';
import { AddComponentHandler } from '../component/AddComponentHandler.js';
import { HistoryManager } from '../../../history/HistoryManager.js';
import { HistoryService } from '../../history/HistoryService.js';

describe('MoveComponentHandler', () => {
  let documentApi;
  let historyService;
  let handler;

  beforeEach(() => {
    const ctx = createHandlerTestContext(createTestDocument());
    documentApi = ctx.documentApi;
    historyService = ctx.historyService;
    handler = new MoveComponentHandler({ historyService, documentApi });
  });

  it('should move a component to a new position', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.success).toBe(true);
    const moved = documentApi.getDocument().components.find(c => c.id === 'R1');
    expect(moved.position).toEqual({ x: 500, y: 600 });
  });

  it('should not mutate the document snapshot passed to execute()', () => {
    const documentSnapshot = documentApi.getDocument();
    const originalPosition = { ...documentSnapshot.components.find(c => c.id === 'R1').position };
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentSnapshot);
    expect(documentSnapshot.components.find(c => c.id === 'R1').position).toEqual(originalPosition);
  });

  it('should throw if component does not exist', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'NONEXISTENT',
        position: { x: 500, y: 600 },
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Component with id "NONEXISTENT" not found');
  });

  it('should throw if position is missing', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Missing required field: "position"');
  });

  it('should throw if position has invalid format', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 'invalid', y: 600 },
      },
    };

    expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Position must have x and y numbers');
  });

  it('should create a change object for HistoryManager', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    const outcome = handler.execute(command, documentApi.getDocument());
    expect(outcome.result.change).toBeDefined();
    expect(outcome.result.change.type).toBe('MOVE_COMPONENT');
    expect(outcome.result.change.componentId).toBe('R1');
    expect(outcome.result.change.oldPosition).toEqual({ x: 100, y: 100 });
    expect(outcome.result.change.newPosition).toEqual({ x: 500, y: 600 });
  });

  it('should preserve other component properties', () => {
    const oldComponent = documentApi.getDocument().components.find(c => c.id === 'R1');
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    const moved = documentApi.getDocument().components.find(c => c.id === 'R1');
    expect(moved.type).toBe(oldComponent.type);
    expect(moved.parameters).toEqual(oldComponent.parameters);
    expect(moved.id).toBe(oldComponent.id);
  });

  it('should support undo/redo through the real HistoryManager', () => {
    const command = {
      type: 'MOVE_COMPONENT',
      payload: {
        componentId: 'R1',
        position: { x: 500, y: 600 },
      },
    };

    handler.execute(command, documentApi.getDocument());
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });

    historyService.undo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 100, y: 100 });

    historyService.redo();
    expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });
  });

  // ==========================================================================
  // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001, 2026-08-22, traçable dans
  // docs/pmo/tickets/MB-CF3-003.md §R) : contrat canonique de production
  // { moves: [{componentId, fromPosition, toPosition}] }, utilisé pour N=1 ET
  // N>1. fromPosition est OBLIGATOIRE pour cette forme (fournie par
  // l'appelant, jamais dérivée du Document — c'est ce qui résout le bug
  // oldPosition===newPosition quand le Document reçu porte déjà un aperçu
  // local). Portée : ces tests couvrent exclusivement la nouvelle forme de
  // payload ; ils ne modifient aucune assertion des tests mono-composant
  // (forme héritée { componentId, position }) ci-dessus.
  // ==========================================================================
  describe('MB-CF3-003 — payload de production { moves }', () => {
    it('déplace un seul composant via { moves } (forme canonique N=1) en une seule mutation, fromPosition explicite toujours respectée', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [
            { componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } },
          ],
        },
      };

      const outcome = handler.execute(command, documentApi.getDocument());
      expect(outcome.success).toBe(true);
      expect(outcome.result.componentId).toBe('R1');
      expect(outcome.result.oldPosition).toEqual({ x: 100, y: 100 });
      expect(outcome.result.newPosition).toEqual({ x: 500, y: 600 });
      const moved = documentApi.getDocument().components.find(c => c.id === 'R1');
      expect(moved.position).toEqual({ x: 500, y: 600 });
    });

    it('déplace plusieurs composants en une seule mutation atomique', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [
            { componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } },
            { componentId: 'C1', fromPosition: { x: 200, y: 200 }, toPosition: { x: 700, y: 800 } },
          ],
        },
      };

      const outcome = handler.execute(command, documentApi.getDocument());
      expect(outcome.success).toBe(true);
      const doc = documentApi.getDocument();
      expect(doc.components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });
      expect(doc.components.find(c => c.id === 'C1').position).toEqual({ x: 700, y: 800 });
      // Le troisième composant, non concerné par le drag, reste inchangé.
      expect(doc.components.find(c => c.id === 'LED1').position).toEqual({ x: 300, y: 100 });
    });

    it("produit une seule entrée d'historique pour N composants : un seul Undo restaure toutes les positions initiales, un seul Redo réapplique toutes les positions finales", () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [
            { componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } },
            { componentId: 'C1', fromPosition: { x: 200, y: 200 }, toPosition: { x: 700, y: 800 } },
            { componentId: 'LED1', fromPosition: { x: 300, y: 100 }, toPosition: { x: 900, y: 100 } },
          ],
        },
      };

      handler.execute(command, documentApi.getDocument());
      expect(historyService.canUndo()).toBe(true);
      expect(historyService.canRedo()).toBe(false);

      historyService.undo();
      const afterUndo = documentApi.getDocument();
      expect(afterUndo.components.find(c => c.id === 'R1').position).toEqual({ x: 100, y: 100 });
      expect(afterUndo.components.find(c => c.id === 'C1').position).toEqual({ x: 200, y: 200 });
      expect(afterUndo.components.find(c => c.id === 'LED1').position).toEqual({ x: 300, y: 100 });
      // Un seul Undo a suffi à tout restaurer : rien ne doit rester à annuler
      // pour ce déplacement (une seule commande par drag, quelle que soit N).
      expect(historyService.canUndo()).toBe(false);
      expect(historyService.canRedo()).toBe(true);

      historyService.redo();
      const afterRedo = documentApi.getDocument();
      expect(afterRedo.components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });
      expect(afterRedo.components.find(c => c.id === 'C1').position).toEqual({ x: 700, y: 800 });
      expect(afterRedo.components.find(c => c.id === 'LED1').position).toEqual({ x: 900, y: 100 });
      expect(historyService.canRedo()).toBe(false);
    });

    it('change.moves contient une entrée par composant déplacé (type MOVE_COMPONENT, une seule commande conceptuelle)', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [
            { componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } },
            { componentId: 'C1', fromPosition: { x: 200, y: 200 }, toPosition: { x: 700, y: 800 } },
          ],
        },
      };

      const outcome = handler.execute(command, documentApi.getDocument());
      expect(outcome.result.change.type).toBe('MOVE_COMPONENT');
      expect(outcome.result.change.moves).toEqual([
        { componentId: 'R1', oldPosition: { x: 100, y: 100 }, newPosition: { x: 500, y: 600 } },
        { componentId: 'C1', oldPosition: { x: 200, y: 200 }, newPosition: { x: 700, y: 800 } },
      ]);
    });

    it('rejette la commande entière si un des composants du groupe est invalide (aucune mutation partielle)', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [
            { componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } },
            { componentId: 'NONEXISTENT', fromPosition: { x: 0, y: 0 }, toPosition: { x: 700, y: 800 } },
          ],
        },
      };

      expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Component with id "NONEXISTENT" not found');
      // Aucune mutation partielle : R1 (traité avant l'échec) n'a pas bougé.
      const doc = documentApi.getDocument();
      expect(doc.components.find(c => c.id === 'R1').position).toEqual({ x: 100, y: 100 });
      expect(historyService.canUndo()).toBe(false);
    });

    it('rejette un tableau moves vide', () => {
      const command = { type: 'MOVE_COMPONENT', payload: { moves: [] } };
      expect(() => handler.execute(command, documentApi.getDocument())).toThrow('moves must be a non-empty array');
    });

    it('rejette une entrée moves sans toPosition', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: { moves: [{ componentId: 'R1', fromPosition: { x: 100, y: 100 } }] },
      };
      expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Each entry of moves must have toPosition');
    });

    it('rejette une entrée moves sans fromPosition (ruling CSA-CF3-003-MOVE-001 : jamais dérivée implicitement pour cette forme)', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: { moves: [{ componentId: 'R1', toPosition: { x: 500, y: 600 } }] },
      };
      expect(() => handler.execute(command, documentApi.getDocument())).toThrow('Each entry of moves must have fromPosition (ruling CSA-CF3-003-MOVE-001)');
    });

    it("fromPosition explicite est TOUJOURS respectée pour la forme { moves }, y compris quand le Document reçu porte déjà la position finale (aperçu local) — c'est la garantie architecturale qui remplace l'ancienne dérivation depuis le Document", () => {
      // Simule le document tel qu'il pourrait arriver à _applyMutation si un
      // aperçu local avait (par erreur) déjà été appliqué : la position de R1
      // y est DÉJÀ 500,600, alors que la vraie position de départ était
      // 100,100 (capturée par startDrag). Avec l'architecture dragPreview
      // (Phase 5/6), ce cas ne doit plus se produire en production — ce test
      // vérifie que même dans ce cas dégradé, le contrat protège l'intégrité
      // de l'historique grâce à fromPosition explicite et obligatoire.
      const documentAlreadyPreviewed = { ...documentApi.getDocument() };
      documentAlreadyPreviewed.components = documentAlreadyPreviewed.components.map((c) =>
        c.id === 'R1' ? { ...c, position: { x: 500, y: 600 } } : c
      );
      documentApi.setDocument(documentAlreadyPreviewed);

      const command = {
        type: 'MOVE_COMPONENT',
        payload: {
          moves: [{ componentId: 'R1', fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } }],
        },
      };

      const outcome = handler.execute(command, documentApi.getDocument());
      expect(outcome.result.change.oldPosition).toEqual({ x: 100, y: 100 });
      expect(outcome.result.change.newPosition).toEqual({ x: 500, y: 600 });

      historyService.undo();
      expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 100, y: 100 });

      historyService.redo();
      expect(documentApi.getDocument().components.find(c => c.id === 'R1').position).toEqual({ x: 500, y: 600 });
    });

    it('préserve la rétro-compatibilité : la forme mono-composant héritée { componentId, position } continue de fonctionner à l’identique après cette extension (oldPosition dérivée du Document, comme avant)', () => {
      const command = {
        type: 'MOVE_COMPONENT',
        payload: { componentId: 'R1', position: { x: 42, y: 43 } },
      };
      const outcome = handler.execute(command, documentApi.getDocument());
      expect(outcome.result.componentId).toBe('R1');
      expect(outcome.result.oldPosition).toEqual({ x: 100, y: 100 });
      expect(outcome.result.newPosition).toEqual({ x: 42, y: 43 });
      expect(outcome.result.change.componentId).toBe('R1');
    });
  });

  // ==========================================================================
  // MB-CF3-003 — CSA FINAL AUDIT (§4) : CommandBus -> ValidationEngine ->
  // MoveComponentHandler. Contrairement aux describe blocks ci-dessus (qui
  // appellent handler.execute() directement, en contournant délibérément
  // CommandBus/ValidationEngine pour isoler le Handler), ces tests exercent
  // le VRAI CommandBus avec un VRAI ValidationEngine injecté — exactement le
  // patron de câblage utilisé en production par useCircuitState.js
  // (new CommandBus(registry, { validationEngine })).
  //
  // Document de départ : construit via de VRAIS dispatches ADD_COMPONENT
  // (registre de production complet), et non via le fixture testDocument.js
  // ci-dessus — ce fixture est un objet minimal/synthétique (types en
  // minuscules, wires au format pinA/pinB) suffisant pour tester le Handler
  // en isolation, mais qui ne correspond pas à la forme réelle qu'un
  // Document produit par ReactDocumentMapper.toCore()/AddComponentHandler
  // présente à ValidationEngine (mêmes précédent et raison que
  // CF4ValidationIntegration.test.js::buildStack()).
  // ==========================================================================
  describe('MB-CF3-003 — CommandBus -> ValidationEngine -> MoveComponentHandler (câblage réel, non contourné)', () => {
    function buildStack(validationRegistry) {
      let currentDocument = { components: [], wires: [] };
      const stackDocumentApi = {
        getDocument: () => currentDocument,
        applyDocument: (doc) => { currentDocument = doc; },
      };
      const historyManager = new HistoryManager();
      const stackHistoryService = new HistoryService(historyManager, stackDocumentApi);

      const registry = new CommandRegistry();
      registry.register('ADD_COMPONENT', new AddComponentHandler({ historyService: stackHistoryService, documentApi: stackDocumentApi }));
      registry.register('MOVE_COMPONENT', new MoveComponentHandler({ historyService: stackHistoryService, documentApi: stackDocumentApi }));

      const validationEngine = new ValidationEngine(validationRegistry);
      const bus = new CommandBus(registry, { validationEngine });

      return {
        bus,
        historyService: stackHistoryService,
        getUndoCount: () => historyManager.getUndoCount(),
        getDocument: () => currentDocument,
      };
    }

    it('une règle ERROR ciblant MOVE_COMPONENT bloque le Handler : celui-ci n\'est JAMAIS appelé, le Document reste inchangé, aucune entrée d\'historique n\'est créée', () => {
      const probeRegistry = new ValidationRegistry();
      probeRegistry.add({
        id: 'probe_move_component_blocked',
        category: 'structural',
        level: 'ERROR',
        validate: (document, command) =>
          command && command.type === 'MOVE_COMPONENT' ? { message: 'MOVE_COMPONENT bloqué par la règle sonde' } : null,
      });
      const { bus, getUndoCount, getDocument } = buildStack(probeRegistry);

      const added = bus.dispatch(new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 100, y: 100 } }), getDocument());
      const componentId = added.result.result.componentId;

      const spy = vi.spyOn(MoveComponentHandler.prototype, 'execute');
      const command = new Command('MOVE_COMPONENT', {
        moves: [{ componentId, fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } }],
      });
      const undoCountBefore = getUndoCount();
      const result = bus.dispatch(command, getDocument());

      expect(spy).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.rejected).toBe(true);
      expect(result.validationReport.hasErrors()).toBe(true);
      expect(getDocument().components.find(c => c.id === componentId).position).toEqual({ x: 100, y: 100 });
      expect(getUndoCount()).toBe(undoCountBefore);

      spy.mockRestore();
    });

    it('sans règle ERROR ciblant MOVE_COMPONENT (registre de production réel createDefaultValidationRegistry), un MOVE_COMPONENT légitime traverse ValidationEngine sans être bloqué et le Handler est bien appelé', () => {
      const { bus, getUndoCount, getDocument } = buildStack(createDefaultValidationRegistry());

      const added = bus.dispatch(new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 100, y: 100 } }), getDocument());
      const componentId = added.result.result.componentId;
      const undoCountBefore = getUndoCount();

      const spy = vi.spyOn(MoveComponentHandler.prototype, 'execute');
      const command = new Command('MOVE_COMPONENT', {
        moves: [{ componentId, fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 600 } }],
      });
      const result = bus.dispatch(command, getDocument());

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.rejected).toBeUndefined();
      expect(getDocument().components.find(c => c.id === componentId).position).toEqual({ x: 500, y: 600 });
      expect(getUndoCount()).toBe(undoCountBefore + 1);

      spy.mockRestore();
    });

    // Les cinq validations suivantes sont défendues par le Handler lui-même
    // (voir describe blocks ci-dessus, testés en isolation via
    // handler.execute()). Ici, elles sont re-vérifiées via le chemin complet
    // CommandBus -> ValidationEngine -> Handler, avec le registre de
    // production réel, pour prouver qu'aucune de ces validations n'est
    // court-circuitée par l'ajout de ValidationEngine dans la chaîne.
    describe('validations du Handler préservées via le chemin CommandBus -> ValidationEngine -> Handler complet', () => {
      let bus, getDocument, componentId

      beforeEach(() => {
        const stack = buildStack(createDefaultValidationRegistry());
        bus = stack.bus;
        getDocument = stack.getDocument;
        const added = bus.dispatch(new Command('ADD_COMPONENT', { componentType: 'LED', position: { x: 100, y: 100 } }), getDocument());
        componentId = added.result.result.componentId;
      });

      it('composant inexistant', () => {
        const command = new Command('MOVE_COMPONENT', {
          moves: [{ componentId: 'NONEXISTENT', fromPosition: { x: 0, y: 0 }, toPosition: { x: 500, y: 600 } }],
        });
        expect(() => bus.dispatch(command, getDocument())).toThrow('Component with id "NONEXISTENT" not found');
      });

      it('toPosition absente', () => {
        const command = new Command('MOVE_COMPONENT', {
          moves: [{ componentId, fromPosition: { x: 100, y: 100 } }],
        });
        expect(() => bus.dispatch(command, getDocument())).toThrow('Each entry of moves must have toPosition');
      });

      it('toPosition non objet', () => {
        const command = new Command('MOVE_COMPONENT', {
          moves: [{ componentId, fromPosition: { x: 100, y: 100 }, toPosition: 'invalid' }],
        });
        expect(() => bus.dispatch(command, getDocument())).toThrow('Position must be an object');
      });

      it('x non numérique', () => {
        const command = new Command('MOVE_COMPONENT', {
          moves: [{ componentId, fromPosition: { x: 100, y: 100 }, toPosition: { x: 'invalid', y: 600 } }],
        });
        expect(() => bus.dispatch(command, getDocument())).toThrow('Position must have x and y numbers');
      });

      it('y non numérique', () => {
        const command = new Command('MOVE_COMPONENT', {
          moves: [{ componentId, fromPosition: { x: 100, y: 100 }, toPosition: { x: 500, y: 'invalid' } }],
        });
        expect(() => bus.dispatch(command, getDocument())).toThrow('Position must have x and y numbers');
      });
    });
  });
});
