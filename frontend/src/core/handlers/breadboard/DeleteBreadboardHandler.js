import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { normalizeDocumentBreadboards } from '../../../utils/normalizeDocumentBreadboards.js';

/**
 * DeleteBreadboardHandler — MB-BREADBOARD-006, généralisé multi-breadboard par
 * FT-C-BREAD-MULTI-001-A.
 *
 * Supprime UNIQUEMENT l'entrée d'`id` correspondant dans la collection
 * canonique `document.breadboards[]` : `[A,B,C]` -DELETE B-> `[A,C]`, A et C
 * strictement intacts. Ne touche NI `document.components` NI `document.wires`
 * (« aucune suppression silencieuse de données » — CSA §10) : les composants
 * qui étaient posés dessus restent présents, à leur position telle quelle ;
 * leurs wires explicites restent intacts. Les arêtes virtuelles dérivées du
 * breadboard supprimé disparaissent naturellement au prochain calcul de
 * deriveBreadboardVirtualWires() (non modifié par cette unité).
 *
 * Undo restaure l'entrée à sa position d'origine dans la collection (même
 * `id`, `position`, `layout`), sans écraser les autres. LOCK-01 n'existe plus :
 * la restauration n'est jamais refusée au motif « un breadboard existe déjà ».
 */
export class DeleteBreadboardHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['breadboardId']);
    return this._executeWithHistory(command, document);
  }

  _findBreadboard(doc, breadboardId) {
    const index = (doc.breadboards || []).findIndex((b) => b.id === breadboardId);
    if (index < 0) {
      throw new HandlerError(
        `Aucun breadboard "${breadboardId}" dans ce Document.`,
        'BREADBOARD_NOT_FOUND'
      );
    }
    return { index, breadboard: doc.breadboards[index] };
  }

  _applyMutation(command, document) {
    const { breadboardId } = command.payload;
    const doc = normalizeDocumentBreadboards(document);
    const { index, breadboard } = this._findBreadboard(doc, breadboardId);

    const newDocument = normalizeDocumentBreadboards({
      ...doc,
      breadboards: doc.breadboards.filter((b) => b.id !== breadboardId),
    });

    return {
      success: true,
      document: newDocument,
      breadboardId,
      removedBreadboard: { ...breadboard },
      removedIndex: index,
      change: this._createChange('DELETE_BREADBOARD', { breadboardId }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { breadboardId } = lastResult || {};
    if (!breadboardId) {
      throw new HandlerError('Cannot redo DeleteBreadboard: missing breadboardId');
    }

    const doc = normalizeDocumentBreadboards(document);
    if (!doc.breadboards.some((b) => b.id === breadboardId)) {
      // Déjà absent : idempotent.
      return {
        success: true,
        document: doc,
        breadboardId,
        removedBreadboard: lastResult.removedBreadboard,
        removedIndex: lastResult.removedIndex,
      };
    }

    return {
      success: true,
      document: normalizeDocumentBreadboards({
        ...doc,
        breadboards: doc.breadboards.filter((b) => b.id !== breadboardId),
      }),
      breadboardId,
      removedBreadboard: lastResult.removedBreadboard,
      removedIndex: lastResult.removedIndex,
    };
  }

  _applyInverse(command, document, lastResult) {
    const { removedBreadboard, removedIndex } = lastResult || {};
    if (!removedBreadboard) {
      throw new HandlerError('Cannot undo DeleteBreadboard: missing removedBreadboard in lastResult');
    }

    const doc = normalizeDocumentBreadboards(document);

    if (doc.breadboards.some((b) => b.id === removedBreadboard.id)) {
      // Déjà présent (ne devrait pas arriver) : idempotent plutôt qu'écrasement.
      return { success: true, document: doc, restored: false, breadboardId: removedBreadboard.id };
    }

    const restored = [...doc.breadboards];
    const at = Number.isInteger(removedIndex)
      ? Math.min(Math.max(removedIndex, 0), restored.length)
      : restored.length;
    restored.splice(at, 0, { ...removedBreadboard });

    return {
      success: true,
      document: normalizeDocumentBreadboards({ ...doc, breadboards: restored }),
      restored: true,
      breadboardId: removedBreadboard.id,
    };
  }
}
