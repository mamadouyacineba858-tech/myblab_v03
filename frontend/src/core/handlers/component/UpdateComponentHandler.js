import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

/**
 * Handler pour la mise à jour des paramètres d'un composant.
 * Commande : { type: "UPDATE_COMPONENT", payload: { componentId, parameters } }
 */
export class UpdateComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'parameters']);

    const { componentId, parameters } = command.payload;

    // Vérifier que le composant existe
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    // Vérifier que parameters est un objet
    if (typeof parameters !== 'object' || parameters === null) {
      throw new HandlerError('Parameters must be an object');
    }

    // Récupérer l'ancien composant
    const oldComponent = this._findComponent(document, componentId);

    // Créer le nouveau composant avec les paramètres fusionnés
    const updatedComponent = {
      ...oldComponent,
      parameters: {
        ...oldComponent.parameters,
        ...parameters,
      },
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
      change: this._createChange('UPDATE_COMPONENT', {
        componentId,
        oldParameters: oldComponent.parameters,
        newParameters: updatedComponent.parameters,
      }),
    };
  }
}
