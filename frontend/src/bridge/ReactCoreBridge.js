import { ReactDocumentMapper } from './ReactDocumentMapper.js';
import { DiffEngine } from './DiffEngine.js';
import { DocumentAdapter } from './DocumentAdapter.js';

/**
 * ReactCoreBridge
 *
 * Façade qui assemble les briques du Bridge Layer
 * et les expose à useCircuitState.
 *
 * FLUX COMPLET :
 * 1. Traduit React → Core (ReactDocumentMapper)
 * 2. Exécute commande via CommandBus
 * 3. Reçoit nouveau document Core
 * 4. Calcule le diff (DiffEngine)
 * 5. Applique le diff à l'UI (DocumentAdapter)
 *
 * RESPONSABILITÉS :
 * - Orchestrer le flux complet
 * - Ne modifie pas les documents
 * - Ne stocke pas d'état
 * - Ne connaît pas React
 *
 * RÉFÉRENCES : MB-CORE-ADAPTER-ADR V4, MB-BRIDGE-004
 */
export class ReactCoreBridge {
  /**
   * @param {Object} params
   * @param {Object} params.commandBus - Instance de CommandBus
   * @param {Object} params.documentApi - API de manipulation du document (UI)
   * @param {Object} params.historyManager - Instance de HistoryManager
   */
  constructor({ commandBus, documentApi, historyManager }) {
    if (!commandBus) {
      throw new Error('ReactCoreBridge: commandBus is required');
    }
    if (!documentApi) {
      throw new Error('ReactCoreBridge: documentApi is required');
    }
    if (!historyManager) {
      throw new Error('ReactCoreBridge: historyManager is required');
    }

    this._commandBus = commandBus;
    this._historyManager = historyManager;
    this._documentAdapter = new DocumentAdapter(documentApi);
    this._documentApi = documentApi;
  }

  /**
   * Exécute une commande via le CommandBus.
   * @param {string} commandType - Type de la commande (ex: 'ADD_COMPONENT')
   * @param {Object} payload - Paramètres de la commande
   * @param {Object} commandOptions - Options supplémentaires
   * @param {Array} commandOptions.ignoredPaths - Chemins à ignorer dans le diff
   * @returns {Object} Résultat de l'exécution
   */
  dispatch(commandType, payload, commandOptions = {}) {
    // 1. Récupérer le document React actuel
    const reactDocument = this._documentApi.getDocument();

    // 2. Traduire React → Core
    const coreDocument = ReactDocumentMapper.toCore(reactDocument);

    // 3. Construire la commande Core
    const command = {
      type: commandType,
      payload: payload || {},
    };

    // 4. Exécuter via CommandBus
    const result = this._commandBus.dispatch(command, coreDocument);

    // 5. Si la commande a retourné un nouveau document
    if (result && result.result && result.result.document) {
      const newCoreDocument = result.result.document;

      // 6. Calculer le diff
      const diff = DiffEngine.compare(coreDocument, newCoreDocument, {
        ignoredPaths: commandOptions.ignoredPaths || [],
      });

      // 7. Appliquer le diff à l'UI
      if (diff.hasChanges) {
        this._documentAdapter.apply(diff);
      }

      return {
        success: true,
        commandId: result.commandId,
        commandType,
        diff,
        document: newCoreDocument,
      };
    }

    return {
      success: false,
      commandType,
      result,
    };
  }

  /**
   * Annule la dernière action.
   * @param {Object} options - Options
   * @param {Array} options.ignoredPaths - Chemins à ignorer dans le diff
   * @returns {Object} Résultat de l'undo
   */
  undo(options = {}) {
    // 1. Récupérer le document React actuel
    const reactDocument = this._documentApi.getDocument();
    const beforeDocument = ReactDocumentMapper.toCore(reactDocument);

    // 2. Exécuter undo via HistoryManager
    const result = this._historyManager.undo();

    // 3. Si l'undo a produit un nouveau document
    if (result && result.document) {
      const afterDocument = result.document;

      // 4. Calculer le diff
      const diff = DiffEngine.compare(beforeDocument, afterDocument, {
        ignoredPaths: options.ignoredPaths || [],
      });

      // 5. Appliquer le diff à l'UI
      if (diff.hasChanges) {
        this._documentAdapter.apply(diff);
      }

      return {
        success: true,
        diff,
        document: afterDocument,
      };
    }

    return {
      success: false,
      result,
    };
  }

  /**
   * Rétablit la dernière action annulée.
   * @param {Object} options - Options
   * @param {Array} options.ignoredPaths - Chemins à ignorer dans le diff
   * @returns {Object} Résultat du redo
   */
  redo(options = {}) {
    const reactDocument = this._documentApi.getDocument();
    const beforeDocument = ReactDocumentMapper.toCore(reactDocument);

    const result = this._historyManager.redo();

    if (result && result.document) {
      const afterDocument = result.document;

      const diff = DiffEngine.compare(beforeDocument, afterDocument, {
        ignoredPaths: options.ignoredPaths || [],
      });

      if (diff.hasChanges) {
        this._documentAdapter.apply(diff);
      }

      return {
        success: true,
        diff,
        document: afterDocument,
      };
    }

    return {
      success: false,
      result,
    };
  }

  /**
   * Vérifie si undo est possible.
   */
  canUndo() {
    return this._historyManager.canUndo ? this._historyManager.canUndo() : false;
  }

  /**
   * Vérifie si redo est possible.
   */
  canRedo() {
    return this._historyManager.canRedo ? this._historyManager.canRedo() : false;
  }
}