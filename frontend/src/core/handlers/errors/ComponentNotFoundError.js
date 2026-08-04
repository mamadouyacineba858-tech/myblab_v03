import { HandlerError } from './HandlerError.js';

/**
 * Erreur levée lorsqu'un composant n'existe pas dans le Document.
 */
export class ComponentNotFoundError extends HandlerError {
  constructor(componentId, message = null) {
    super(
      message || `Component with id "${componentId}" not found in document`,
      'COMPONENT_NOT_FOUND'
    );
    this.componentId = componentId;
  }
}
