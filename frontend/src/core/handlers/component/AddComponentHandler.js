import { BaseCommandHandler } from '../BaseCommandHandler.js';

/**
 * Handler pour l'ajout d'un composant au Document.
 * Commande : { type: "ADD_COMPONENT", payload: { componentType, position, parameters } }
 */
export class AddComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    // Validation structurelle minimale
    this._validateCommandPayload(command, ['componentType']);

    const { componentType, position = { x: 0, y: 0 }, parameters = {} } = command.payload;

    // Générer un identifiant unique
    const id = this._generateComponentId(componentType);

    // Créer le nouveau composant
    const newComponent = {
      id,
      type: componentType,
      position: { ...position },
      parameters: { ...parameters },
    };

    // Créer un nouveau Document (immuable)
    const newDocument = {
      ...document,
      components: [...(document.components || []), newComponent],
    };

    // Retourner le résultat avec les métadonnées pour l'historique
    return {
      success: true,
      document: newDocument,
      componentId: id,
      change: this._createChange('ADD_COMPONENT', {
        componentId: id,
        component: newComponent,
      }),
    };
  }
}
