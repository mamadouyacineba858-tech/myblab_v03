import { CommandHandler } from './CommandHandler.js';
import { HandlerNotFoundError } from './errors/HandlerNotFoundError.js';

/**
 * Registre des Command Handlers.
 * Permet d'enregistrer et de retrouver les handlers par type de commande.
 */
export class CommandRegistry {
  constructor() {
    this._handlers = new Map();
  }

  /**
   * Enregistre un handler pour un type de commande.
   * @param {string} commandType - Type de la commande
   * @param {CommandHandler} handler - Instance du handler
   */
  register(commandType, handler) {
    if (!(handler instanceof CommandHandler)) {
      throw new Error('Handler must be an instance of CommandHandler');
    }
    if (this._handlers.has(commandType)) {
      throw new Error(`Handler for command type "${commandType}" already registered`);
    }
    this._handlers.set(commandType, handler);
  }

  /**
   * Retourne le handler pour un type de commande donné.
   * @param {string} commandType - Type de la commande
   * @returns {CommandHandler} Le handler associé
   * @throws {HandlerNotFoundError} Si aucun handler n'est enregistré
   */
  getHandler(commandType) {
    if (!this._handlers.has(commandType)) {
      throw new HandlerNotFoundError(commandType);
    }
    return this._handlers.get(commandType);
  }

  /**
   * Vérifie si un handler est enregistré pour un type donné.
   */
  hasHandler(commandType) {
    return this._handlers.has(commandType);
  }

  /**
   * Retourne tous les types de commandes enregistrés.
   */
  getRegisteredTypes() {
    return Array.from(this._handlers.keys());
  }
}
