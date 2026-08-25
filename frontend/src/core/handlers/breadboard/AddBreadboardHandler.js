import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { snapToBreadboardPitch } from '../../../utils/breadboardGeometry.js';

/**
 * AddBreadboardHandler — MB-BREADBOARD-002.
 *
 * Seule commande nouvelle introduite par ce ticket (Blueprint §6) : place
 * l'entité document.breadboard. Aucune commande d'insertion/retrait
 * dédiée n'est ajoutée — l'insertion d'un composant sur le breadboard
 * réutilise ADD_COMPONENT/MOVE_COMPONENT déjà gouvernés CF3, l'occupation
 * d'un trou étant entièrement dérivée de la position (LOCK-02, LOCK-07,
 * voir frontend/src/utils/breadboardConnectivity.js).
 *
 * LOCK-01 (un seul breadboard par Document) : un second ADD_BREADBOARD sur
 * un Document qui en possède déjà un est refusé explicitement (HandlerError),
 * jamais silencieusement ignoré ni remplacé.
 *
 * Suit le même patron que AddComponentHandler/RemoveComponentHandler :
 * _applyMutation/_applyRedo/_applyInverse opèrent sur le Document Core,
 * execute() délègue à BaseCommandHandler._executeWithHistory().
 */
export class AddBreadboardHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, []);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    if (document.breadboard) {
      throw new HandlerError(
        'Un breadboard existe déjà dans ce Document (LOCK-01 : un seul breadboard par Document).',
        'BREADBOARD_ALREADY_EXISTS'
      );
    }

    const { position = { x: 0, y: 0 } } = command.payload || {};
    const id = command.payload?.breadboardId || this._generateBreadboardId();
    command.payload = { ...command.payload, breadboardId: id, position };

    const newBreadboard = {
      id,
      position: snapToBreadboardPitch(position),
      layout: 'STANDARD_V1',
    };

    const newDocument = {
      ...document,
      breadboard: newBreadboard,
    };

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

    if (document.breadboard && document.breadboard.id === breadboardId) {
      return { success: true, document, breadboardId };
    }

    const { position } = command.payload;
    const newBreadboard = {
      id: breadboardId,
      position: snapToBreadboardPitch(position),
      layout: 'STANDARD_V1',
    };

    const newDocument = {
      ...document,
      breadboard: newBreadboard,
    };

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

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      return { success: true, document };
    }

    const newDocument = {
      ...document,
      breadboard: null,
    };

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
