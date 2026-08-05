import { CommandHandler } from '../command/CommandHandler.js';
import { HandlerError } from './errors/HandlerError.js';
import { ComponentNotFoundError } from './errors/ComponentNotFoundError.js';
import { createUid } from '../../utils/ids.js';
import { HistoryCommandAdapter } from '../history/HistoryCommandAdapter.js';

/**
 * Classe de base pour tous les Command Handlers.
 *
 * NOTE ARCHITECTURE — MB-HISTORY-001-A
 * Les handlers sont utilisés en runtime par le HistoryCommand.
 * Pour la persistance, voir MB-HISTORY-002.
 */
export class BaseCommandHandler extends CommandHandler {
  constructor(options = {}) {
    super();
    this._historyService = options.historyService || null;
    this._documentApi = options.documentApi || null;
  }

  execute(command, document) {
    throw new Error('execute() must be implemented by subclass');
  }

  _applyMutation(command, document) {
    throw new Error('_applyMutation() must be implemented by subclass');
  }

  _applyRedo(command, document, lastResult) {
    return this._applyMutation(command, document);
  }

  _applyInverse(command, document, lastResult) {
    throw new Error('_applyInverse() must be implemented by subclass');
  }

  _executeWithHistory(command, document) {
    if (!this._historyService) {
      throw new HandlerError('HistoryService not configured for this handler');
    }

    // Le paramètre 'document' n'est plus passé à l'adaptateur
    const historyCommand = HistoryCommandAdapter.toHistoryCommand(
      command,
      this,
      this._documentApi
    );

    return this._historyService.execute(historyCommand);
  }

  _generateComponentId(prefix = 'component') {
    return createUid(prefix);
  }

  _generateWireId(prefix = 'wire') {
    return createUid(prefix);
  }

  _cloneDocument(document) {
    return JSON.parse(JSON.stringify(document));
  }

  _cloneComponent(component) {
    return JSON.parse(JSON.stringify(component));
  }

  _findComponent(document, componentId) {
    if (!document.components) {
      throw new HandlerError('Document has no components array');
    }
    const component = document.components.find(c => c.id === componentId);
    if (!component) {
      throw new ComponentNotFoundError(componentId);
    }
    return component;
  }

  _componentExists(document, componentId) {
    if (!document.components) return false;
    return document.components.some(c => c.id === componentId);
  }

  _removeWiresForComponent(document, componentId) {
    if (!document.wires || document.wires.length === 0) {
      return { newDocument: document, removedWires: [], removedWiresData: [] };
    }

    const removedWires = [];
    const removedWiresData = [];
    const remainingWires = document.wires.filter(wire => {
      const isConnected = wire.pinA?.componentId === componentId ||
                          wire.pinB?.componentId === componentId;
      if (isConnected) {
        removedWires.push(wire.id);
        removedWiresData.push({ ...wire });
        return false;
      }
      return true;
    });

    const newDocument = {
      ...document,
      wires: remainingWires,
    };

    return { newDocument, removedWires, removedWiresData };
  }

  _createChange(type, data) {
    return {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    };
  }

  _validateCommandPayload(command, requiredFields) {
    if (!command.payload) {
      throw new HandlerError('Command payload is required');
    }
    for (const field of requiredFields) {
      if (!(field in command.payload)) {
        throw new HandlerError(`Missing required field: "${field}"`);
      }
    }
  }
}
