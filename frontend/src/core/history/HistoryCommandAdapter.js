import { HistoryCommand } from '../../history/HistoryCommand.js';
import { createUid } from '../../utils/ids.js';

/**
 * Adaptateur qui convertit une commande du CommandBus
 * en commande historisable étendant la vraie classe HistoryCommand.
 *
 * NOTE ARCHITECTURE — MB-HISTORY-001-A
 * - Ce HistoryCommand garde une référence au Handler en mémoire.
 * - Pour la persistance (sérialisation, collaboration, reload),
 *   voir MB-HISTORY-002.
 * - Le Document est accessible via l'API, pas stocké en interne.
 * - Le paramètre 'document' a été supprimé car non utilisé.
 */
export class HistoryCommandAdapter {
  /**
   * Crée une commande historisable.
   * @param {object} command - Commande du CommandBus
   * @param {object} handler - Handler associé
   * @param {object} documentApi - API de manipulation du Document
   * @returns {HistoryCommand} Instance de HistoryCommand
   */
  static toHistoryCommand(command, handler, documentApi) {
    return new AdaptedHistoryCommand(
      documentApi,
      command,
      handler
    );
  }
}

/**
 * Classe interne qui étend la vraie HistoryCommand.
 */
class AdaptedHistoryCommand extends HistoryCommand {
  constructor(documentApi, command, handler) {
    // Appel au constructeur parent avec l'API Document
    super(documentApi);

    this._command = command;
    this._handler = handler;
    this._documentApi = documentApi;
    this._id = createUid('history');
    this._timestamp = new Date().toISOString();
    this._type = command.type;
    this._lastResult = null;
    this._lastUndoResult = null;
    this._hasBeenApplied = false;
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }

  get timestamp() {
    return this._timestamp;
  }

  /**
   * Retourne le dernier résultat produit par apply()/redo() (contient .document).
   * Nécessaire car le vrai HistoryManager n'expose pas la valeur de retour
   * de command.do()/apply() : c'est donc l'adaptateur qui la conserve.
   */
  getLastResult() {
    return this._lastResult;
  }

  /**
   * Retourne le dernier résultat produit par undo() (contient .document).
   */
  getLastUndoResult() {
    return this._lastUndoResult;
  }

  /**
   * Obtient le Document courant via l'API.
   * Évite de stocker une référence mutable.
   */
  _getCurrentDocument() {
    return this._documentApi.getDocument();
  }

  /**
   * Applique la commande (REDO ou première exécution).
   * Utilise _hasBeenApplied pour déterminer le mode.
   */
  apply() {
    const currentDocument = this._getCurrentDocument();

    let result;

    if (this._hasBeenApplied) {
      // REDO : utiliser les données stockées
      result = this._handler._applyRedo(
        this._command,
        currentDocument,
        this._lastResult
      );
    } else {
      // PREMIÈRE EXÉCUTION
      result = this._handler._applyMutation(
        this._command,
        currentDocument
      );
    }

    this._lastResult = result;
    this._hasBeenApplied = true;

    return result;
  }

  /**
   * Annule la commande (UNDO).
   */
  undo() {
    if (!this._lastResult) {
      throw new Error('Cannot undo: no result from apply()');
    }

    const currentDocument = this._getCurrentDocument();

    const result = this._handler._applyInverse(
      this._command,
      currentDocument,
      this._lastResult
    );

    this._lastUndoResult = result;

    return result;
  }

  /**
   * Rétablit la commande (REDO).
   */
  redo() {
    return this.apply();
  }

  canMerge(other) {
    return false;
  }

  merge(other) {
    throw new Error('Merge not implemented for this command type');
  }

  toJSON() {
    return {
      id: this._id,
      type: this._type,
      timestamp: this._timestamp,
      payload: this._command.payload,
    };
  }
}
