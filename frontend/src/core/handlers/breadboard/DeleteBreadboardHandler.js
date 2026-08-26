import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';

/**
 * DeleteBreadboardHandler — MB-BREADBOARD-006 (CSA Ruling §7/§8).
 *
 * Volontairement minimal : supprime UNIQUEMENT document.breadboard. Ne
 * touche NI document.components NI document.wires (« aucune suppression
 * silencieuse de données » — CSA Ruling §7) : les composants qui étaient
 * posés dessus restent présents, à leur position telle quelle ; leurs wires
 * explicites, s'il y en a, restent intacts (ils ne référencent jamais le
 * breadboard lui-même).
 *
 * Les arêtes virtuelles dérivées du breadboard (breadboardConnectivity.js,
 * non modifié) disparaissent naturellement au prochain calcul, puisque
 * deriveBreadboardVirtualWires() retourne [] dès que document.breadboard
 * est null — comportement déjà garanti par cette fonction existante,
 * jamais dupliqué ici.
 *
 * N'étend PAS RemoveComponentHandler et ne le réutilise pas (CSA Ruling §8) :
 * la sémantique de suppression d'un breadboard (aucune cascade sur
 * composants/wires) est fondamentalement différente de celle d'un composant
 * (cascade sur ses wires connectés, RemoveComponentHandler._applyMutation).
 *
 * Même patron que AddBreadboardHandler (execute/_applyMutation/_applyRedo/
 * _applyInverse), en sens inverse.
 */
export class DeleteBreadboardHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['breadboardId']);
    return this._executeWithHistory(command, document);
  }

  _requireBreadboard(document, breadboardId) {
    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      throw new HandlerError(
        `Aucun breadboard "${breadboardId}" dans ce Document.`,
        'BREADBOARD_NOT_FOUND'
      );
    }
    return document.breadboard;
  }

  _applyMutation(command, document) {
    const { breadboardId } = command.payload;
    const removedBreadboard = this._requireBreadboard(document, breadboardId);

    const newDocument = {
      ...document,
      breadboard: null,
    };

    return {
      success: true,
      document: newDocument,
      breadboardId,
      removedBreadboard: { ...removedBreadboard },
      change: this._createChange('DELETE_BREADBOARD', { breadboardId }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { breadboardId } = lastResult || {};
    if (!breadboardId) {
      throw new HandlerError('Cannot redo DeleteBreadboard: missing breadboardId');
    }

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      // Déjà absent : idempotent, même patron que AddBreadboardHandler._applyRedo.
      return { success: true, document, breadboardId, removedBreadboard: lastResult.removedBreadboard };
    }

    return {
      success: true,
      document: { ...document, breadboard: null },
      breadboardId,
      removedBreadboard: lastResult.removedBreadboard,
    };
  }

  _applyInverse(command, document, lastResult) {
    const { removedBreadboard } = lastResult || {};
    if (!removedBreadboard) {
      throw new HandlerError('Cannot undo DeleteBreadboard: missing removedBreadboard in lastResult');
    }

    if (document.breadboard) {
      // Un breadboard existe déjà (ne devrait pas arriver — LOCK-01) :
      // refus explicite plutôt qu'écrasement silencieux, même politique
      // qu'AddBreadboardHandler._applyMutation.
      throw new HandlerError(
        'Impossible de restaurer le breadboard : un breadboard existe déjà (LOCK-01).',
        'BREADBOARD_ALREADY_EXISTS'
      );
    }

    return {
      success: true,
      document: { ...document, breadboard: { ...removedBreadboard } },
      restored: true,
      breadboardId: removedBreadboard.id,
    };
  }
}
