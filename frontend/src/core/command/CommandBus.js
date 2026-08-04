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
  /**
   * @param {CommandRegistry} registry - Le registre des handlers
   * @param {object} validators - Validateurs optionnels (Validation Engine)
   */
  constructor(registry, validators = {}) {
    this._registry = registry;
    this._validators = validators;
    this._middlewares = [];
  }

  /**
   * Ajoute un middleware (exécuté avant le handler).
   * @param {Function} middleware - (command, document, next) => result
   */
  use(middleware) {
    this._middlewares.push(middleware);
    return this;
  }

  /**
   * Dispatch une commande vers son handler.
   * @param {Command} command - La commande à exécuter
   * @param {object} document - L'état actuel du Document
   * @returns {object} Résultat de l'exécution
   * @throws {CommandNotFoundError} Si le type de commande est inconnu
   * @throws {CommandExecutionError} Si l'exécution échoue
   */
  dispatch(command, document) {
    if (!(command instanceof Command)) {
      throw new CommandExecutionError('Command must be an instance of Command');
    }

    try {
      // Récupérer le handler
      const handler = this._registry.getHandler(command.type);

      // Exécuter la chaîne de middlewares
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
      };
    } catch (error) {
      // Wrapper des erreurs en CommandExecutionError
      if (error instanceof CommandExecutionError) {
        throw error;
      }
      if (error instanceof HandlerNotFoundError) {
        throw error;
      }
      throw new CommandExecutionError(error.message, error);
    }
  }

  /**
   * Version asynchrone du dispatch.
   */
  async dispatchAsync(command, document) {
    return this.dispatch(command, document);
  }
}
