import { Command } from './Command.js';
import {
  CommandNotFoundError,
  HandlerNotFoundError,
  CommandExecutionError,
} from './errors/index.js';

/**
 * Command Bus central.
 * Reçoit les commandes, trouve le handler approprié et l'exécute.
 *
 * La validation métier est déléguée au Validation Engine (ADR-010)
 * via l'injection d'un validateur externe.
 */
export class CommandBus {
  constructor(registry, validators = {}) {
    this._registry = registry;
    this._validators = validators;
    this._middlewares = [];
  }

  use(middleware) {
    this._middlewares.push(middleware);
    return this;
  }

  dispatch(command, document) {
    if (!(command instanceof Command)) {
      throw new CommandExecutionError('Command must be an instance of Command');
    }

    try {
      const handler = this._registry.getHandler(command.type);

      // ADR-010 : pré-validation avant le Handler.
      const validationEngine = this._validators?.validationEngine;
      const validationReport = validationEngine
        ? validationEngine.validate(document, command)
        : null;

      if (validationReport?.hasErrors()) {
        const validationError = new CommandExecutionError('Command rejected by validation');
        validationError.validationReport = validationReport;
        throw validationError;
      }

      const execute = (cmd, doc) => handler.execute(cmd, doc);
      const result = this._middlewares.reduceRight(
        (next, middleware) => (cmd, doc) => middleware(cmd, doc, next),
        execute
      )(command, document);

      return {
        success: true,
        commandId: command.id,
        commandType: command.type,
        result,
        ...(validationReport ? { validationReport } : {}),
      };
    } catch (error) {
      if (error instanceof CommandExecutionError) {
        throw error;
      }
      if (error instanceof HandlerNotFoundError) {
        throw error;
      }
      throw new CommandExecutionError(error.message, error);
    }
  }

  async dispatchAsync(command, document) {
    return this.dispatch(command, document);
  }
}
