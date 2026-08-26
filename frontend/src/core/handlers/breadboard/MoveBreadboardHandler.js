import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { resolveSolidaryComponentIds } from './breadboardSolidarity.js';

// MB-BREADBOARD-006 — MOVE_BREADBOARD, Option B.
// The Core document uses {id, position:{x,y}} for components. The React
// presentation uses {uid, x, y}; ReactDocumentMapper performs that translation.
// This handler MUST therefore mutate the Core shape only.
export class MoveBreadboardHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateMovePayload(command);
    return this._executeWithHistory(command, document);
  }

  _validateMovePayload(command) {
    this._validateCommandPayload(command, ['breadboardId', 'fromPosition', 'toPosition']);
    const { fromPosition, toPosition } = command.payload;
    for (const [label, pos] of [['fromPosition', fromPosition], ['toPosition', toPosition]]) {
      if (!pos || typeof pos !== 'object' || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        throw new HandlerError(`${label} must be an object with numeric x and y`);
      }
    }
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
    const { breadboardId, fromPosition, toPosition } = command.payload;
    const breadboard = this._requireBreadboard(document, breadboardId);

    if (breadboard.position.x !== fromPosition.x || breadboard.position.y !== fromPosition.y) {
      throw new HandlerError(
        'MOVE_BREADBOARD: fromPosition ne correspond pas à la position courante du breadboard.',
        'BREADBOARD_POSITION_MISMATCH'
      );
    }

    const deltaX = toPosition.x - fromPosition.x;
    const deltaY = toPosition.y - fromPosition.y;

    // Solidarity is resolved against the Core document BEFORE mutation.
    const solidaryIds = resolveSolidaryComponentIds(breadboard, document.components);
    const componentMoves = [];

    const newComponents = (document.components || []).map((component) => {
      if (!solidaryIds.has(component.id)) return component;

      const oldPosition = {
        x: component.position.x,
        y: component.position.y,
      };
      const newPosition = {
        x: oldPosition.x + deltaX,
        y: oldPosition.y + deltaY,
      };

      componentMoves.push({
        componentId: component.id,
        oldPosition,
        newPosition,
      });

      return {
        ...component,
        position: newPosition,
      };
    });

    const newDocument = {
      ...document,
      breadboard: {
        ...breadboard,
        position: { ...toPosition },
      },
      components: newComponents,
    };

    return {
      success: true,
      document: newDocument,
      breadboardId,
      oldBreadboardPosition: { ...fromPosition },
      newBreadboardPosition: { ...toPosition },
      componentMoves,
      change: this._createChange('MOVE_BREADBOARD', {
        breadboardId,
        oldPosition: { ...fromPosition },
        newPosition: { ...toPosition },
        componentMoves,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { breadboardId, newBreadboardPosition, componentMoves } = lastResult || {};
    if (!breadboardId || !newBreadboardPosition || !Array.isArray(componentMoves)) {
      throw new HandlerError('Cannot redo MoveBreadboard: missing data');
    }

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      return { success: true, document };
    }

    const movesByComponentId = new Map(componentMoves.map((move) => [move.componentId, move]));
    const newComponents = (document.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return {
        ...component,
        position: { ...move.newPosition },
      };
    });

    return {
      success: true,
      document: {
        ...document,
        breadboard: {
          ...document.breadboard,
          position: { ...newBreadboardPosition },
        },
        components: newComponents,
      },
      breadboardId,
      oldBreadboardPosition: lastResult.oldBreadboardPosition,
      newBreadboardPosition: { ...newBreadboardPosition },
      componentMoves,
    };
  }

  _applyInverse(command, document, lastResult) {
    const { breadboardId, oldBreadboardPosition, componentMoves } = lastResult || {};
    if (!breadboardId || !oldBreadboardPosition || !Array.isArray(componentMoves)) {
      throw new HandlerError('Cannot undo MoveBreadboard: missing data');
    }

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      return { success: true, document };
    }

    const movesByComponentId = new Map(componentMoves.map((move) => [move.componentId, move]));
    const newComponents = (document.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return {
        ...component,
        position: { ...move.oldPosition },
      };
    });

    return {
      success: true,
      document: {
        ...document,
        breadboard: {
          ...document.breadboard,
          position: { ...oldBreadboardPosition },
        },
        components: newComponents,
      },
      restored: true,
      breadboardId,
      componentMoves,
    };
  }
}
