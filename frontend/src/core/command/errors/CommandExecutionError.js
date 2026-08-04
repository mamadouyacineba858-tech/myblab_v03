export class CommandExecutionError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'CommandExecutionError';
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}
