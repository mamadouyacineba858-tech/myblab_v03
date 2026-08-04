import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

/**
 * Handler pour le déplacement d'un composant.
 * Commande : { type: "MOVE_COMPONENT", payload: { componentId, position } }
 */
export class MoveComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'position']);

    const { componentId, position } = command.payload;

    // Vérifier que le composant existe
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    // Vérifier que position est un objet valide
    if (typeof position !== 'object' || position === null) {
      throw new HandlerError('Position must be an object');
    }
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      throw new HandlerError('Position must have x and y numbers');
    }

    // Récupérer l'ancien composant
    const oldComponent = this._findComponent(document, componentId);
    const oldPosition = oldComponent.position || { x: 0, y: 0 };

    // Créer le nouveau composant avec la nouvelle position
    const updatedComponent = {
      ...oldComponent,
      position: { ...position },
    };

    // Mettre à jour la liste des composants
    const updatedComponents = document.components.map(c =>
      c.id === componentId ? updatedComponent : c
    );

    const newDocument = {
      ...document,
      components: updatedComponents,
    };

    return {
      success: true,
      document: newDocument,
      componentId,
      change: this._createChange('MOVE_COMPONENT', {
        componentId,
        oldPosition: { ...oldPosition },
        newPosition: { ...position },
      }),
    };
  }
}
