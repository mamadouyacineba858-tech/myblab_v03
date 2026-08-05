import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryCommandAdapter } from '../HistoryCommandAdapter.js';
import { AddComponentHandler } from '../../handlers/component/AddComponentHandler.js';

/**
 * Mock Document API avec deep clone pour les tests.
 * Utilise JSON.parse(JSON.stringify()) pour des copies profondes.
 */
class MockDocumentApi {
  constructor(initialDocument) {
    this._document = this._deepClone(initialDocument);
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  getDocument() {
    return this._deepClone(this._document);
  }

  setDocument(document) {
    this._document = this._deepClone(document);
  }

  applyDocument(newDocument) {
    this._document = this._deepClone(newDocument);
  }
}

/**
 * Mock HistoryManager pour test invariant.
 * Appelle applyDocument() après chaque opération.
 *
 * CORRECTION : le mock original utilisait une seule pile `_commands` et
 * retirait la commande lors de l'undo, ce qui rendait le redo() impossible
 * ("Nothing to redo"). On reproduit ici le vrai contrat du HistoryManager
 * du dépôt : deux piles distinctes (undoStack / redoStack), undo() déplace
 * la commande vers redoStack, redo() la ramène vers undoStack.
 */
class TestHistoryManager {
  constructor(documentApi) {
    this._documentApi = documentApi;
    this._undoStack = [];
    this._redoStack = [];
  }

  execute(command) {
    const result = command.apply();
    if (result.document) {
      this._documentApi.applyDocument(result.document);
    }
    this._undoStack.push(command);
    this._redoStack = [];
    return result;
  }

  undo() {
    const command = this._undoStack.pop();
    if (!command || typeof command.undo !== 'function') {
      throw new Error('Nothing to undo');
    }
    const result = command.undo();
    if (result.document) {
      this._documentApi.applyDocument(result.document);
    }
    this._redoStack.push(command);
    return result;
  }

  redo() {
    const command = this._redoStack.pop();
    if (!command || typeof command.redo !== 'function') {
      throw new Error('Nothing to redo');
    }
    const result = command.redo();
    if (result.document) {
      this._documentApi.applyDocument(result.document);
    }
    this._undoStack.push(command);
    return result;
  }
}

describe('HistoryCommand Invariant — apply → undo → redo', () => {
  let documentApi;
  let handler;
  let historyManager;

  beforeEach(() => {
    const initialDocument = {
      components: [],
      wires: [],
    };
    documentApi = new MockDocumentApi(initialDocument);
    handler = new AddComponentHandler({
      historyService: null,
      documentApi: documentApi,
    });
    historyManager = new TestHistoryManager(documentApi);
  });

  it('should return to same state after apply → undo → redo', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
        position: { x: 10, y: 20 },
        parameters: { resistance: 1000 },
      },
    };

    // 1. APPLY
    const historyCommand = HistoryCommandAdapter.toHistoryCommand(
      command,
      handler,
      documentApi
    );

    const applyResult = historyManager.execute(historyCommand);
    const afterApply = documentApi.getDocument();

    // 2. UNDO
    historyManager.undo();
    const afterUndo = documentApi.getDocument();

    // 3. REDO
    historyManager.redo();
    const afterRedo = documentApi.getDocument();

    // Comparaison complète des documents (deep clone déjà fait par MockDocumentApi)
    expect(afterRedo).toEqual(afterApply);
  });

  it('should restore initial state after undo', () => {
    const command = {
      type: 'ADD_COMPONENT',
      payload: {
        componentType: 'resistor',
        position: { x: 10, y: 20 },
        parameters: { resistance: 1000 },
      },
    };

    const initialState = documentApi.getDocument();

    const historyCommand = HistoryCommandAdapter.toHistoryCommand(
      command,
      handler,
      documentApi
    );

    historyManager.execute(historyCommand);
    historyManager.undo();
    const afterUndo = documentApi.getDocument();

    expect(afterUndo).toEqual(initialState);
  });

  it('should handle multiple commands with undo/redo', () => {
    const cmd1 = {
      type: 'ADD_COMPONENT',
      payload: { componentType: 'resistor', position: { x: 10, y: 20 } },
    };
    const cmd2 = {
      type: 'ADD_COMPONENT',
      payload: { componentType: 'capacitor', position: { x: 30, y: 40 } },
    };

    const hc1 = HistoryCommandAdapter.toHistoryCommand(cmd1, handler, documentApi);
    historyManager.execute(hc1);

    const hc2 = HistoryCommandAdapter.toHistoryCommand(cmd2, handler, documentApi);
    historyManager.execute(hc2);
    const afterApply2 = documentApi.getDocument();

    historyManager.undo();
    historyManager.redo();
    const afterRedo = documentApi.getDocument();

    expect(afterRedo).toEqual(afterApply2);
  });
});
