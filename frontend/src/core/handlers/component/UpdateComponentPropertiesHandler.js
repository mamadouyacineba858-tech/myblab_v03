import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Semantic validation is injected by composition, never imported from a domain.
export class UpdateComponentPropertiesHandler extends BaseCommandHandler {
  constructor(options = {}) {
    super(options);
    this._validateProperties = options.validateProperties ?? null;
  }

  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'beforeProperties', 'afterProperties']);
    const { componentId, beforeProperties, afterProperties } = command.payload;
    if (typeof componentId !== 'string' || componentId.length === 0) throw new HandlerError('componentId must be a nonempty string');
    if (!isPlainObject(beforeProperties) || !isPlainObject(afterProperties)) throw new HandlerError('properties snapshots must be plain objects');
    if (!this._componentExists(document, componentId)) throw new ComponentNotFoundError(componentId);
    const component = this._findComponent(document, componentId);
    if (this._validateProperties) {
      for (const snapshot of [beforeProperties, afterProperties]) {
        const result = this._validateProperties(component.type, snapshot);
        if (result?.valid !== true) throw new HandlerError(`Invalid component properties: ${result?.errors?.join('; ') ?? 'validation failed'}`);
      }
    }
    // Own detached snapshots: subsequent caller changes must not rewrite History.
    const before = this._cloneComponent(beforeProperties);
    const after = this._cloneComponent(afterProperties);
    const keys = Object.keys(before);
    if (keys.length === Object.keys(after).length && keys.every(key => Object.hasOwn(after, key) && JSON.stringify(before[key]) === JSON.stringify(after[key]))) {
      return { success: true, document, componentId };
    }
    const snapshotCommand = { ...command, payload: { ...command.payload, beforeProperties: before, afterProperties: after } };
    return this._executeWithHistory(snapshotCommand, document);
  }

  _replace(document, componentId, properties) {
    return {
      ...document,
      components: document.components.map(component => component.id === componentId
        ? { ...component, properties: this._cloneComponent(properties) } : component),
    };
  }

  _applyMutation(command, document) {
    const { componentId, beforeProperties, afterProperties } = command.payload;
    return {
      success: true,
      document: this._replace(document, componentId, afterProperties),
      componentId,
      change: this._createChange('UPDATE_COMPONENT_PROPERTIES', {
        componentId,
        beforeProperties: this._cloneComponent(beforeProperties),
        afterProperties: this._cloneComponent(afterProperties),
      }),
    };
  }

  _applyRedo(command, document) {
    const { componentId, afterProperties } = command.payload;
    return { success: true, document: this._replace(document, componentId, afterProperties), componentId };
  }

  _applyInverse(command, document) {
    const { componentId, beforeProperties } = command.payload;
    return { success: true, document: this._replace(document, componentId, beforeProperties), componentId };
  }
}
