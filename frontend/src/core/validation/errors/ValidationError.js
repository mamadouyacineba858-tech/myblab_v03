/**
 * Erreur spécifique au Validation Engine.
 */
export class ValidationError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'ValidationError';
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}
