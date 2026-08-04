import { HandlerError } from './HandlerError.js';

/**
 * Erreur levée lorsqu'un type de composant est invalide.
 * (La validation métier est normalement déléguée au ValidationEngine)
 */
export class InvalidComponentTypeError extends HandlerError {
  constructor(componentType, message = null) {
    super(
      message || `Invalid component type: "${componentType}"`,
      'INVALID_COMPONENT_TYPE'
    );
    this.componentType = componentType;
  }
}
