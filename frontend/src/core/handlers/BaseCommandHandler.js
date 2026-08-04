import { CommandHandler } from '../command/CommandHandler.js';
import { HandlerError } from './errors/HandlerError.js';
import { ComponentNotFoundError } from './errors/ComponentNotFoundError.js';
import { createUid } from '../../utils/ids.js';

/**
 * Classe de base pour tous les Command Handlers.
 * Fournit des utilitaires communs pour la manipulation du Document.
 *
 * IMPORTANT : Les handlers ne contiennent PAS de validation métier.
 * La validation est déléguée au ValidationEngine (ADR-010).
 */
export class BaseCommandHandler extends CommandHandler {
  /**
   * Exécute la commande.
   * À implémenter par les sous-classes.
   */
  execute(command, document) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * ADAPTÉ LORS DE L'INTÉGRATION LOCALE :
   * Utilise le générateur d'UID centralisé du dépôt (src/utils/ids.js)
   * comme source d'unicité, tout en conservant un préfixe lisible.
   *
   * Génère un identifiant unique pour un composant.
   * @param {string} prefix - Préfixe optionnel
   * @returns {string} Identifiant unique
   */
  _generateComponentId(prefix = 'component') {
    return `${prefix}_${createUid()}`;
  }

  /**
   * ADAPTÉ LORS DE L'INTÉGRATION LOCALE :
   * Idem, utilise createUid() comme source d'unicité.
   *
   * Génère un identifiant unique pour une wire.
   * @param {string} prefix - Préfixe optionnel
   * @returns {string} Identifiant unique
   */
  _generateWireId(prefix = 'wire') {
    return `${prefix}_${createUid()}`;
  }

  /**
   * Clone en profondeur le Document.
   * @param {object} document - Document à cloner
   * @returns {object} Nouvelle copie du Document
   */
  _cloneDocument(document) {
    return JSON.parse(JSON.stringify(document));
  }

  /**
   * Recherche un composant dans le Document par son identifiant.
   * @param {object} document - Document à interroger
   * @param {string} componentId - Identifiant du composant
   * @returns {object} Le composant trouvé
   * @throws {ComponentNotFoundError} Si le composant n'existe pas
   */
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

  /**
   * Vérifie si un composant existe dans le Document.
   * @param {object} document - Document à interroger
   * @param {string} componentId - Identifiant du composant
   * @returns {boolean} true si le composant existe
   */
  _componentExists(document, componentId) {
    if (!document.components) return false;
    return document.components.some(c => c.id === componentId);
  }

  /**
   * Supprime toutes les wires associées à un composant.
   *
   * @param {object} document - Document à modifier
   * @param {string} componentId - Identifiant du composant
   * @returns {object} { newDocument, removedWires: [...] }
   */
  _removeWiresForComponent(document, componentId) {
    if (!document.wires || document.wires.length === 0) {
      return { newDocument: document, removedWires: [] };
    }

    const removedWires = [];
    const remainingWires = document.wires.filter(wire => {
      const isConnected = wire.pinA?.componentId === componentId ||
                          wire.pinB?.componentId === componentId;
      if (isConnected) {
        removedWires.push(wire.id);
        return false;
      }
      return true;
    });

    const newDocument = {
      ...document,
      wires: remainingWires,
    };

    return { newDocument, removedWires };
  }

  /**
   * Crée un objet change pour l'historique (ADR-007).
   * @param {string} type - Type de changement
   * @param {object} data - Données du changement
   * @returns {object} Objet change formaté
   */
  _createChange(type, data) {
    return {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    };
  }

  /**
   * Valide que la commande contient les champs requis.
   * (Validation structurelle minimale, pas métier)
   */
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
