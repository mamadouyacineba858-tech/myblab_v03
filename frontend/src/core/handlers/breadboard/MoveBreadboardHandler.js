import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { resolveSolidaryComponentIds } from './breadboardSolidarity.js';

// MB-BREADBOARD-006 (CSA Ruling — Option B, §1/§2/§4) : contrat canonique —
//
//   new Command("MOVE_BREADBOARD", {
//     breadboardId,
//     fromPosition: { x, y },   // breadboard.position AVANT translation
//     toPosition:   { x, y },   // breadboard.position APRÈS translation
//   })
//
// Déplace le breadboard ET, dans la MÊME mutation/entrée d'historique, tous
// les composants actuellement solidaires (résolus sur un de ses trous —
// resolveSolidaryComponentIds(), seul oracle, cf. breadboardSolidarity.js).
// Les composants non solidaires ne sont jamais lus au-delà du test de
// résolution, jamais mutés (INV-04).
//
// Déviation disclosed par rapport au contrat CSA-CF3-003-MOVE-001 (qui exige
// que toute position mutée soit fournie explicitement par l'appelant,
// jamais dérivée du Document au dispatch) : l'ensemble des composants
// solidaires n'est PAS fourni par l'appelant — il est déterminé par ce
// Handler via resolveSolidaryComponentIds() contre le Document, exactement
// comme l'exige le CSA Ruling §4 (proscrit toute preuve de solidarité par
// sélection UI/bounding box). Le risque que CF3-003 visait à éliminer
// (dérive du Document entre calcul UI et dispatch) reste nul ici : aucune
// autre mutation ne peut s'intercaler pendant un drag (garde I-M1).
//
// N'est PAS un cas de réutilisation de MoveComponentHandler (CSA Ruling §8
// l'interdit explicitement) : classe dédiée, même si elle mute aussi
// document.components (composants solidaires) — effet de bord documenté et
// local à ce Handler, jamais partagé.
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

    // Solidarité déterminée AVANT toute mutation, contre la position
    // courante (= fromPosition, déjà vérifié ci-dessus) — CSA Ruling §4.
    const solidaryIds = resolveSolidaryComponentIds(breadboard, document.components);

    const newBreadboard = { ...breadboard, position: { ...toPosition } };

    const componentMoves = [];
    const newComponents = (document.components || []).map((component) => {
      if (!solidaryIds.has(component.id)) return component;
      const oldPosition = { ...component.position };
      const newPosition = { x: oldPosition.x + deltaX, y: oldPosition.y + deltaY };
      componentMoves.push({ componentId: component.id, oldPosition, newPosition });
      return { ...component, position: newPosition };
    });

    const newDocument = {
      ...document,
      breadboard: newBreadboard,
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
        componentMoves: componentMoves.map(({ componentId, oldPosition, newPosition }) => ({
          componentId,
          oldPosition,
          newPosition,
        })),
      }),
    };
  }

  // Rejoue exactement le mouvement d'origine — ne recalcule PAS la
  // solidarité (même patron défensif que MoveComponentHandler._applyRedo,
  // qui rejoue lastResult.moves plutôt que de re-dériver). Garantit un Redo
  // strictement identique même si l'ordre des composants avait changé.
  _applyRedo(command, document, lastResult) {
    const { breadboardId, newBreadboardPosition, componentMoves } = lastResult || {};
    if (!breadboardId || !newBreadboardPosition || !Array.isArray(componentMoves)) {
      throw new Error('Cannot redo MoveBreadboard: missing data');
    }

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      return { success: true, document };
    }

    const newBreadboard = { ...document.breadboard, position: { ...newBreadboardPosition } };
    const movesByComponentId = new Map(componentMoves.map((m) => [m.componentId, m]));
    const newComponents = (document.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return { ...component, position: { ...move.newPosition } };
    });

    return {
      success: true,
      document: { ...document, breadboard: newBreadboard, components: newComponents },
      breadboardId,
      oldBreadboardPosition: lastResult.oldBreadboardPosition,
      newBreadboardPosition,
      componentMoves,
    };
  }

  _applyInverse(command, document, lastResult) {
    const { breadboardId, oldBreadboardPosition, componentMoves } = lastResult || {};
    if (!breadboardId || !oldBreadboardPosition || !Array.isArray(componentMoves)) {
      throw new Error('Cannot undo MoveBreadboard: missing data');
    }

    if (!document.breadboard || document.breadboard.id !== breadboardId) {
      return { success: true, document };
    }

    const restoredBreadboard = { ...document.breadboard, position: { ...oldBreadboardPosition } };
    const movesByComponentId = new Map(componentMoves.map((m) => [m.componentId, m]));
    const newComponents = (document.components || []).map((component) => {
      const move = movesByComponentId.get(component.id);
      if (!move) return component;
      return { ...component, position: { ...move.oldPosition } };
    });

    return {
      success: true,
      document: { ...document, breadboard: restoredBreadboard, components: newComponents },
      restored: true,
      breadboardId,
      componentMoves,
    };
  }
}
