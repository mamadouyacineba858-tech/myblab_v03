export class CommandNotFoundError extends Error {
  constructor(commandType) {
    super(`Command type "${commandType}" is not recognized`);
    this.name = 'CommandNotFoundError';
    this.commandType = commandType;
  }
}
