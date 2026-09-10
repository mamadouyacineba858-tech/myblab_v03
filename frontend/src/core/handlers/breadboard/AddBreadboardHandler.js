import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { snapToBreadboardPitch } from '../../../utils/breadboardGeometry.js';
import { normalizeDocumentBreadboards } from '../../../utils/normalizeDocumentBreadboards.js';

/**
 * AddBreadboardHandler — MB-BREADBOARD-002, généralisé multi-breadboard par
 * FT-C-BREAD-MULTI-001-A.
 *
 * Ajoute une entrée dans la collection canonique `document.breadboards[]`
 * SANS remplacer les précédentes. LOCK-01 (un seul breadboard par Document)
 * est LEVÉ : `[] -> [A] -> [A,B] -> [A,B,C]`, ordre déterministe (append).
 *
 * Chaque entrée conserve : `id` unique, `position` snapée
 * (snapToBreadboardPitch, inchangé), `layout` STANDARD_V1. Undo retire
 * l'entrée d'`id` correspondant sans toucher aux autres ; redo la ré-ajoute
 * avec le même `id` et les mêmes données.
 *
 * Le document entrant est normalisé (normalizeDocumentBreadboards, frontière
 * UNIQUE — CSA D3) : accepte indifféremment l'ancienne forme `{ breadboard }`
 * ou la forme canonique `{ breadboards }`. Aucune branche `if/else` legacy
 * ici.
 *
 * Suit le même patron que AddComponentHandler : _applyMutation/_applyRedo/
 * _applyInverse opèrent sur le Document Core, execute() délègue à
 * BaseCommandHandler._executeWithHistory().
 */
export class AddBreadboardHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, []);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const doc = normalizeDocumentBreadboards(document);

    const { position = { x: 0, y: 0 } } = command.payload || {};
    const id = command.payload?.breadboardId || this._generateBreadboardId();
    command.payload = { ...command.payload, breadboardId: id, position };

    if (doc.breadboards.some((b) => b.id === id)) {
      throw new HandlerError(
        `Un breadboard "${id}" existe déjà dans ce Document.`,
        'BREADBOARD_ALREADY_EXISTS'
      );
    }

    const newBreadboard = {
      id,
      position: snapToBreadboardPitch(position),
      layout: 'STANDARD_V1',
    };

    const newDocument = normalizeDocumentBreadboards({
      ...doc,
      breadboards: [...doc.breadboards, newBreadboard],
    });

    return {
      success: true,
      document: newDocument,
      breadboardId: id,
      newBreadboard,
      change: this._createChange('ADD_BREADBOARD', {
        breadboardId: id,
        breadboard: newBreadboard,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const breadboardId = command.payload.breadboardId;

    if (!breadboardId) {
      throw new HandlerError('Cannot redo AddBreadboard: missing breadboardId');
    }

    const doc = normalizeDocumentBreadboards(document);

    if (doc.breadboards.some((b) => b.id === breadboardId)) {
      // Déjà présent : idempotent, même patron qu'AddComponentHandler._applyRedo.
      return { success: true, document: doc, breadboardId };
    }

    const { position } = command.payload;
    const newBreadboard = {
      id: breadboardId,
      position: snapToBreadboardPitch(position),
      layout: 'STANDARD_V1',
    };

    const newDocument = normalizeDocumentBreadboards({
      ...doc,
      breadboards: [...doc.breadboards, newBreadboard],
    });

    return {
      success: true,
      document: newDocument,
      breadboardId,
      newBreadboard,
      change: this._createChange('ADD_BREADBOARD', {
        breadboardId,
        breadboard: newBreadboard,
      }),
    };
  }

  _applyInverse(command, document, lastResult) {
    const { breadboardId } = lastResult;

    if (!breadboardId) {
      throw new HandlerError('Cannot undo AddBreadboard: missing breadboardId in lastResult');
    }

    const doc = normalizeDocumentBreadboards(document);

    if (!doc.breadboards.some((b) => b.id === breadboardId)) {
      return { success: true, document: doc };
    }

    const newDocument = normalizeDocumentBreadboards({
      ...doc,
      breadboards: doc.breadboards.filter((b) => b.id !== breadboardId),
    });

    return {
      success: true,
      document: newDocument,
      removedBreadboardId: breadboardId,
    };
  }

  _generateBreadboardId() {
    return this._generateComponentId('breadboard');
  }
}
