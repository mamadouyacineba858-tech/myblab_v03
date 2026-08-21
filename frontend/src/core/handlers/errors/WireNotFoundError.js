import { HandlerError } from './HandlerError.js';

/**
 * Erreur levée lorsqu'un wire n'existe pas dans le Document.
 * Mirroir exact de ComponentNotFoundError.js pour les wires (MB-VIS-005).
 */
export class WireNotFoundError extends HandlerError {
  constructor(wireId, message = null) {
    super(
      message || `Wire with id "${wireId}" not found in document`,
      'WIRE_NOT_FOUND'
    );
    this.wireId = wireId;
  }
}
