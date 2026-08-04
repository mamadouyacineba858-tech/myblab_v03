/**
 * Erreur de base pour les Command Handlers.
 */
export class HandlerError extends Error {
  constructor(message, code = 'HANDLER_ERROR', originalError = null) {
    super(message);
    this.name = 'HandlerError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}
