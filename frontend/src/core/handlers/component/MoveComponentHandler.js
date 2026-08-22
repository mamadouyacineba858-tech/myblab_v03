import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

// MB-CF3-003 — ruling CSA-CF3-003-MOVE-001 (2026-08-22, traçable dans
// docs/pmo/tickets/MB-CF3-003.md §R) : contrat canonique de production pour
// un déplacement d'un ou plusieurs composants en une seule commande
// MOVE_COMPONENT — donc une seule entrée d'historique, un seul Undo, un seul
// Redo, quelle que soit la taille de la sélection. Aucune commande
// concurrente (MOVE_COMPONENTS/GROUP_MOVE/BATCH_MOVE) n'est introduite.
//
//   new Command("MOVE_COMPONENT", {
//     moves: [{ componentId, fromPosition: {x,y}, toPosition: {x,y} }, ...]
//   })
//
// fromPosition/toPosition sont fournies explicitement par l'appelant (jamais
// dérivées d'un état du Document au moment du dispatch) : la commande est
// ainsi auto-descriptive et rejouable indépendamment de l'état exact du
// Document au moment où History la rejoue (ruling §6). C'est ce contrat,
// combiné à la séparation Presentation dragPreview ≠ Document persistant
// dans useCircuitState.js (le Document réel n'est plus jamais pré-muté avant
// dispatch), qui résout à la racine le risque oldPosition === toPosition.
//
// La forme mono-composant historique { componentId, position } reste
// acceptée ci-dessous, UNIQUEMENT pour la rétrocompatibilité des tests/
// consommateurs Core existants (MoveComponentHandler.test.js, qui
// construisent des commandes directement sans passer par
// useCircuitState.js et ne pré-mutent jamais le Document). Le drag de
// production n'émet plus jamais cette forme (toujours { moves: [...] },
// y compris pour un seul composant — ruling §2). Pour cette forme héritée,
// oldPosition reste dérivée du Document reçu, comportement identique à
// avant toute extension de ce contrat.
//
// Les deux formes sont normalisées en un tableau unique de "moves" dès
// l'entrée de chaque méthode _apply*, puis appliquées en un seul passage
// séquentiel sur document.components. BaseCommandHandler._executeWithHistory
// (non modifié) garantit qu'un seul dispatch CommandBus produit, quel que
// soit N, un seul appel à _applyMutation/_applyRedo/_applyInverse.
export class MoveComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateMovePayload(command);
    return this._executeWithHistory(command, document);
  }

  _validateMovePayload(command) {
    if (!command.payload) {
      throw new HandlerError('Command payload is required');
    }
    if (command.payload.moves !== undefined) {
      const { moves } = command.payload;
      if (!Array.isArray(moves) || moves.length === 0) {
        throw new HandlerError('moves must be a non-empty array');
      }
      moves.forEach((move) => {
        if (!move || typeof move !== 'object' || !('componentId' in move)) {
          throw new HandlerError('Each entry of moves must have componentId');
        }
        if (!('toPosition' in move)) {
          throw new HandlerError('Each entry of moves must have toPosition');
        }
        if (!('fromPosition' in move)) {
          throw new HandlerError('Each entry of moves must have fromPosition (ruling CSA-CF3-003-MOVE-001)');
        }
      });
      return;
    }
    // Forme mono-composant historique : validation inchangée (message
    // d'erreur identique, contrat MoveComponentHandler.test.js préservé).
    this._validateCommandPayload(command, ['componentId', 'position']);
  }

  // Normalise les deux formes de payload en un tableau unique
  // { componentId, toPosition, fromPosition|undefined }. La forme héritée ne
  // fournit jamais fromPosition — c'est ce qui déclenche la dérivation
  // depuis le Document dans _applyMoveOne, exactement comme avant cette
  // extension.
  _normalizeMoves(payload) {
    if (Array.isArray(payload.moves)) {
      return payload.moves.map((m) => ({
        componentId: m.componentId,
        toPosition: m.toPosition,
        fromPosition: m.fromPosition,
      }));
    }
    return [{
      componentId: payload.componentId,
      toPosition: payload.position,
      fromPosition: undefined,
    }];
  }

  _applyMoveOne(document, componentId, toPosition, fromPosition) {
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }
    if (typeof toPosition !== 'object' || toPosition === null) {
      throw new HandlerError('Position must be an object');
    }
    if (typeof toPosition.x !== 'number' || typeof toPosition.y !== 'number') {
      throw new HandlerError('Position must have x and y numbers');
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );
    const hasExplicitFromPosition =
      fromPosition &&
      typeof fromPosition === 'object' &&
      typeof fromPosition.x === 'number' &&
      typeof fromPosition.y === 'number';
    // Forme { moves }: fromPosition est obligatoire et déjà validée par
    // _validateMovePayload — toujours utilisée telle quelle, jamais dérivée
    // du Document (ruling §6). Forme héritée { componentId, position } :
    // fromPosition est toujours absente ici (voir _normalizeMoves) —
    // dérivation depuis le Document, comportement original inchangé.
    const oldPosition = hasExplicitFromPosition
      ? { ...fromPosition }
      : { ...oldComponent.position };
    const updatedComponent = {
      ...oldComponent,
      position: { ...toPosition },
    };

    return { updatedComponent, oldComponent, oldPosition, newPosition: { ...toPosition } };
  }

  _applyMutation(command, document) {
    const rawMoves = this._normalizeMoves(command.payload);

    let workingDocument = document;
    const moves = [];
    for (const { componentId, toPosition, fromPosition } of rawMoves) {
      const { updatedComponent, oldComponent, oldPosition, newPosition } =
        this._applyMoveOne(workingDocument, componentId, toPosition, fromPosition);

      workingDocument = {
        ...workingDocument,
        components: workingDocument.components.map((c) =>
          c.id === componentId ? updatedComponent : c
        ),
      };
      moves.push({ componentId, oldComponent, oldPosition, newPosition });
    }

    const result = {
      success: true,
      document: workingDocument,
      moves,
      change: this._createChange('MOVE_COMPONENT', {
        moves: moves.map(({ componentId, oldPosition, newPosition }) => ({
          componentId,
          oldPosition,
          newPosition,
        })),
      }),
    };

    // Rétro-compatibilité stricte avec le contrat mono-composant historique
    // (MoveComponentHandler.test.js) : lorsqu'un seul composant est déplacé,
    // les champs "plats" componentId/oldPosition/newPosition/oldComponent
    // restent exposés au même endroit qu'avant cette extension — que ce
    // soit via la forme héritée ou via { moves } à un seul élément (ruling).
    if (moves.length === 1) {
      const [m] = moves;
      result.componentId = m.componentId;
      result.oldPosition = m.oldPosition;
      result.newPosition = m.newPosition;
      result.oldComponent = m.oldComponent;
      result.change.componentId = m.componentId;
      result.change.oldPosition = m.oldPosition;
      result.change.newPosition = m.newPosition;
    }

    return result;
  }

  _applyRedo(command, document, lastResult) {
    const moves = lastResult && lastResult.moves;
    if (!Array.isArray(moves) || moves.length === 0) {
      throw new Error('Cannot redo MoveComponent: missing data');
    }

    let workingDocument = document;
    for (const { componentId, newPosition } of moves) {
      if (!this._componentExists(workingDocument, componentId)) continue;
      const oldComponent = this._cloneComponent(
        this._findComponent(workingDocument, componentId)
      );
      const updatedComponent = { ...oldComponent, position: { ...newPosition } };
      workingDocument = {
        ...workingDocument,
        components: workingDocument.components.map((c) =>
          c.id === componentId ? updatedComponent : c
        ),
      };
    }

    return {
      success: true,
      document: workingDocument,
      moves,
      componentId: moves.length === 1 ? moves[0].componentId : undefined,
    };
  }

  _applyInverse(command, document, lastResult) {
    const moves = lastResult && lastResult.moves;
    if (!Array.isArray(moves) || moves.length === 0) {
      throw new Error('Cannot undo MoveComponent: missing componentId or oldPosition');
    }

    let workingDocument = document;
    for (const { componentId, oldPosition } of moves) {
      if (!this._componentExists(workingDocument, componentId)) continue;
      const oldComponent = this._cloneComponent(
        this._findComponent(workingDocument, componentId)
      );
      const restoredComponent = { ...oldComponent, position: { ...oldPosition } };
      workingDocument = {
        ...workingDocument,
        components: workingDocument.components.map((c) =>
          c.id === componentId ? restoredComponent : c
        ),
      };
    }

    return {
      success: true,
      document: workingDocument,
      restored: true,
      moves,
      componentId: moves.length === 1 ? moves[0].componentId : undefined,
    };
  }
}
