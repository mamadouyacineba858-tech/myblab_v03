import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { resolveSolidaryComponentIds } from './breadboardSolidarity.js';
import { normalizeDocumentBreadboards } from '../../../utils/normalizeDocumentBreadboards.js';

// MB-BREADBOARD-006 — MOVE_BREADBOARD, généralisé multi-breadboard par
// FT-C-BREAD-MULTI-001-A : cible EXACTEMENT `payload.breadboardId` dans la
// collection canonique `document.breadboards[]`. Déplacer B ne déplace jamais
// A ou C ; seuls les composants solidaires de B (resolveSolidaryComponentIds,
// primitive centrale INCHANGÉE — CSA §9) suivent B.
//
// Le Core document utilise {id, position:{x,y}} pour les composants ; la
// présentation React utilise {uid, x, y} — ReactDocumentMapper fait la
// traduction. Ce handler ne mute que la forme Core.
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

  _requireBreadboard(doc, breadboardId) {
    const breadboard = (doc.breadboards || []).find((b) => b.id === breadboardId);
    if (!breadboard) {
      throw new HandlerError(
        `Aucun breadboard "${breadboardId}" dans ce Document.`,
        'BREADBOARD_NOT_FOUND'
      );
    }
    return breadboard;
  }

  _applyMutation(command, document) {
    const { breadboardId, fromPosition, toPosition } = command.payload;
    const doc = normalizeDocumentBreadboards(document);
    const breadboard = this._requireBreadboard(doc, breadboardId);

    if (breadboard.position.x !== fromPosition.x || breadboard.position.y !== fromPosition.y) {
      throw new HandlerError(
        'MOVE_BREADBOARD: fromPosition ne correspond pas à la position courante du breadboard.',
        'BREADBOARD_POSITION_MISMATCH'
      );
    }

    const deltaX = toPosition.x - fromPosition.x;
    const deltaY = toPosition.y - fromPosition.y;

    // Solidarité résolue contre le Document Core AVANT mutation, pour CE
    // breadboard uniquement (jamais un autre).
    const solidaryIds = resolveSolidaryComponentIds(breadboard, doc.components);
    const componentMoves = [];

    const newComponents = (doc.components || []).map((component) => {
      if (!solidaryIds.has(component.id)) return component;

      const oldPosition = { x: component.position.x, y: component.position.y };
      const newPosition = { x: oldPosition.x + deltaX, y: oldPosition.y + deltaY };

      componentMoves.push({ componentId: component.id, oldPosition, newPosition });

      return { ...component, position: newPosition };
    });

    const newDocument = normalizeDocumentBreadboards({
      ...doc,
      breadboards: doc.breadboards.map((b) =>
        b.id === breadboardId ? { ...b, position: { ...toPosition } } : b
      ),
      components: newComponents,
    });

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

    const doc = normalizeDocumentBreadboards(document);
    if (!doc.breadboards.some((b) => b.id === breadboardId)) {
      return { success: true, document: doc };
    }

    const movesByComponentId = new Map(componentMoves.map((move) => [move.componentId, move]));
    const newComponents = (doc.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return { ...component, position: { ...move.newPosition } };
    });

    return {
      success: true,
      document: normalizeDocumentBreadboards({
        ...doc,
        breadboards: doc.breadboards.map((b) =>
          b.id === breadboardId ? { ...b, position: { ...newBreadboardPosition } } : b
        ),
        components: newComponents,
      }),
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

    const doc = normalizeDocumentBreadboards(document);
    if (!doc.breadboards.some((b) => b.id === breadboardId)) {
      return { success: true, document: doc };
    }

    const movesByComponentId = new Map(componentMoves.map((move) => [move.componentId, move]));
    const newComponents = (doc.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return { ...component, position: { ...move.oldPosition } };
    });

    return {
      success: true,
      document: normalizeDocumentBreadboards({
        ...doc,
        breadboards: doc.breadboards.map((b) =>
          b.id === breadboardId ? { ...b, position: { ...oldBreadboardPosition } } : b
        ),
        components: newComponents,
      }),
      restored: true,
      breadboardId,
      componentMoves,
    };
  }
}
