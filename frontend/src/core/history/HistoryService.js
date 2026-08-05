/**
 * Service d'accès au HistoryManager depuis le Core.
 * Fournit une interface propre et testable.
 *
 * POINT D'APPLICATION UNIQUE DU DOCUMENT :
 * - execute() applique le résultat au Document API
 * - undo() applique le résultat au Document API
 * - redo() applique le résultat au Document API
 *
 * Le Document API est la source unique de vérité (ADR-001).
 *
 * ADAPTATION — CORRECTION D'INTÉGRATION :
 * Le vrai HistoryManager (frontend/src/history/HistoryManager.js) :
 * - execute(command) retourne la commande elle-même (ou la commande
 *   fusionnée), PAS un objet { document }.
 * - undo() / redo() retournent un booléen (true si l'opération a eu lieu),
 *   pas un objet { document }.
 * Le résultat réel de la mutation (contenant .document) est donc récupéré
 * depuis l'AdaptedHistoryCommand elle-même via getLastResult() /
 * getLastUndoResult(), et non depuis la valeur de retour du HistoryManager.
 */
export class HistoryService {
  constructor(historyManager, documentApi) {
    if (!historyManager) {
      throw new Error('HistoryService: historyManager is required');
    }
    if (!documentApi) {
      throw new Error('HistoryService: documentApi is required');
    }
    this._historyManager = historyManager;
    this._documentApi = documentApi;
  }

  /**
   * Obtient le Document courant via l'API.
   */
  getCurrentDocument() {
    return this._documentApi.getDocument();
  }

  /**
   * Exécute une commande via le HistoryManager.
   * Applique automatiquement le résultat au Document API.
   */
  execute(historyCommand) {
    if (!historyCommand) {
      throw new Error('HistoryService: historyCommand is required');
    }

    // Le vrai HistoryManager.execute() retourne la commande (ou sa fusion),
    // pas le résultat de la mutation.
    const executedCommand = this._historyManager.execute(historyCommand);

    // Le résultat réel (avec .document) est porté par l'adaptateur.
    const result = typeof executedCommand.getLastResult === 'function'
      ? executedCommand.getLastResult()
      : null;

    if (result && result.document) {
      this._documentApi.applyDocument(result.document);
    }

    return {
      success: true,
      commandId: historyCommand.id || 'unknown',
      result,
    };
  }

  /**
   * Annule la dernière action.
   * Applique automatiquement le résultat au Document API.
   */
  undo() {
    const didUndo = this._historyManager.undo();

    if (!didUndo) {
      return { success: false, result: null };
    }

    // Après undo(), le vrai HistoryManager place la commande annulée
    // au sommet de redoStack.
    const redoStack = this._historyManager.redoStack || [];
    const undoneCommand = redoStack[redoStack.length - 1];
    const result = undoneCommand && typeof undoneCommand.getLastUndoResult === 'function'
      ? undoneCommand.getLastUndoResult()
      : null;

    if (result && result.document) {
      this._documentApi.applyDocument(result.document);
    }

    return { success: true, result };
  }

  /**
   * Rétablit la dernière action annulée.
   * Applique automatiquement le résultat au Document API.
   */
  redo() {
    const didRedo = this._historyManager.redo();

    if (!didRedo) {
      return { success: false, result: null };
    }

    // Après redo(), le vrai HistoryManager place la commande rétablie
    // au sommet de undoStack.
    const undoStack = this._historyManager.undoStack || [];
    const redoneCommand = undoStack[undoStack.length - 1];
    const result = redoneCommand && typeof redoneCommand.getLastResult === 'function'
      ? redoneCommand.getLastResult()
      : null;

    if (result && result.document) {
      this._documentApi.applyDocument(result.document);
    }

    return { success: true, result };
  }

  canUndo() {
    return this._historyManager.canUndo ? this._historyManager.canUndo() : false;
  }

  canRedo() {
    return this._historyManager.canRedo ? this._historyManager.canRedo() : false;
  }
}
