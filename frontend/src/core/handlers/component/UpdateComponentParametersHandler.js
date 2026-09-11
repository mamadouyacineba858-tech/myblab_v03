import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';

// MB-L1-CVE-001 (CSA GO) — huitième type autorisé sur le canal CommandBus,
// borné exactement à UPDATE_COMPONENT_PARAMETERS (CV-06 : jamais un
// UPDATE_COMPONENT générique). Contrat canonique :
//
//   new Command("UPDATE_COMPONENT_PARAMETERS", {
//     componentId, beforeParameters, afterParameters
//   })
//
// Les deux snapshots sont fournis explicitement par l'appelant (couche de
// composition, useCircuitState.js) — jamais dérivés par le Handler lui-même
// — même principe d'auto-description que MOVE_COMPONENT (ruling
// CSA-CF3-003-MOVE-001) : la commande reste rejouable indépendamment de
// l'état exact du Document au moment où History la rejoue.
//
// CV-19/CV-20 : ce fichier n'importe RIEN depuis simulator/*. La validation
// sémantique des paramètres (schema, min/max) est fournie par une fonction
// injectée au constructeur (`validateParameters`), résolue par la couche de
// composition — jamais importée ici directement. Sans injection, le Handler
// reste utilisable (validation sémantique absente, seule la validation
// structurelle s'applique) : testable en isolation du domaine Simulation.
export class UpdateComponentParametersHandler extends BaseCommandHandler {
  constructor(options = {}) {
    super(options);
    this._validateParameters = typeof options.validateParameters === 'function'
      ? options.validateParameters
      : null;
  }

  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'beforeParameters', 'afterParameters']);
    const { componentId, beforeParameters, afterParameters } = command.payload;

    if (typeof beforeParameters !== 'object' || beforeParameters === null || Array.isArray(beforeParameters)) {
      throw new HandlerError('beforeParameters must be a plain object');
    }
    if (typeof afterParameters !== 'object' || afterParameters === null || Array.isArray(afterParameters)) {
      throw new HandlerError('afterParameters must be a plain object');
    }
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    // CV-12 : une valeur invalide ne doit jamais atteindre le Document
    // persistant — revalidée ici (défense en profondeur), indépendamment de
    // toute validation déjà faite en amont par la couche de composition.
    if (this._validateParameters) {
      const component = this._findComponent(document, componentId);
      const result = this._validateParameters(component.type, afterParameters);
      if (!result || result.valid !== true) {
        throw new HandlerError(
          `Invalid component parameters: ${result?.errors?.join('; ') ?? 'unknown validation failure'}`
        );
      }
    }

    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentId, afterParameters } = command.payload;
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const updatedComponent = { ...oldComponent, parameters: { ...afterParameters } };

    const newDocument = {
      ...document,
      components: document.components.map((c) => (c.id === componentId ? updatedComponent : c)),
    };

    return {
      success: true,
      document: newDocument,
      componentId,
      change: this._createChange('UPDATE_COMPONENT_PARAMETERS', {
        componentId,
        beforeParameters: command.payload.beforeParameters,
        afterParameters,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { componentId, afterParameters } = command.payload;
    if (!this._componentExists(document, componentId)) {
      return { success: true, document, componentId };
    }
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const updatedComponent = { ...oldComponent, parameters: { ...afterParameters } };

    return {
      success: true,
      document: {
        ...document,
        components: document.components.map((c) => (c.id === componentId ? updatedComponent : c)),
      },
      componentId,
    };
  }

  _applyInverse(command, document) {
    const { componentId, beforeParameters } = command.payload;
    if (!this._componentExists(document, componentId)) {
      return { success: true, document, restored: false };
    }
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const restoredComponent = { ...oldComponent, parameters: { ...beforeParameters } };

    return {
      success: true,
      document: {
        ...document,
        components: document.components.map((c) => (c.id === componentId ? restoredComponent : c)),
      },
      restored: true,
      componentId,
    };
  }
}
