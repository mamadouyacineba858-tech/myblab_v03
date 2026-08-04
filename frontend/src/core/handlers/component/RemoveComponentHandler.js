import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';

/**
 * Handler pour la suppression d'un composant et de ses connexions.
 * Commande : { type: "REMOVE_COMPONENT", payload: { componentId } }
 */
export class RemoveComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId']);

    const { componentId } = command.payload;

    // Vérifier que le composant existe
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    // Supprimer les wires associées
    const { newDocument: docWithoutWires, removedWires } =
      this._removeWiresForComponent(document, componentId);

    // Supprimer le composant de la liste
    const remainingComponents = docWithoutWires.components.filter(
      c => c.id !== componentId
    );

    const newDocument = {
      ...docWithoutWires,
      components: remainingComponents,
    };

    return {
      success: true,
      document: newDocument,
      removedComponentId: componentId,
      removedWireIds: removedWires,
      change: this._createChange('REMOVE_COMPONENT', {
        componentId,
        removedWireIds: removedWires,
      }),
    };
  }
}
