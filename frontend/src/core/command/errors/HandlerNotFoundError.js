export class HandlerNotFoundError extends Error {
  constructor(commandType) {
    super(`No handler registered for command type "${commandType}"`);
    this.name = 'HandlerNotFoundError';
    this.commandType = commandType;
  }
}
