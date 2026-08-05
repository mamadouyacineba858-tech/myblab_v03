import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

export class UpdateComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'parameters']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentId, parameters } = command.payload;

    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    if (typeof parameters !== 'object' || parameters === null) {
      throw new HandlerError('Parameters must be an object');
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );
    const oldParameters = { ...oldComponent.parameters };

    const updatedComponent = {
      ...oldComponent,
      parameters: {
        ...oldParameters,
        ...parameters,
      },
    };

    const updatedComponents = document.components.map(c =>
      c.id === componentId ? updatedComponent : c
    );

    const newDocument = {
      ...document,
      components: updatedComponents,
    };

    return {
      success: true,
      document: newDocument,
      componentId,
      oldParameters,
      newParameters: updatedComponent.parameters,
      oldComponent,
      change: this._createChange('UPDATE_COMPONENT', {
        componentId,
        oldParameters,
        newParameters: updatedComponent.parameters,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { componentId, newParameters } = lastResult;

    if (!componentId || !newParameters) {
      throw new Error('Cannot redo UpdateComponent: missing data');
    }

    if (!this._componentExists(document, componentId)) {
      return { success: true, document };
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );

    const updatedComponent = {
      ...oldComponent,
      parameters: { ...newParameters },
    };

    const updatedComponents = document.components.map(c =>
      c.id === componentId ? updatedComponent : c
    );

    const newDocument = {
      ...document,
      components: updatedComponents,
    };

    return {
      success: true,
      document: newDocument,
      componentId,
    };
  }

  _applyInverse(command, document, lastResult) {
    const { componentId, oldParameters } = lastResult;

    if (!componentId || oldParameters === undefined) {
      throw new Error('Cannot undo UpdateComponent: missing componentId or oldParameters');
    }

    if (!this._componentExists(document, componentId)) {
      return { success: true, document };
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );

    const restoredComponent = {
      ...oldComponent,
      parameters: { ...oldParameters },
    };

    const updatedComponents = document.components.map(c =>
      c.id === componentId ? restoredComponent : c
    );

    const newDocument = {
      ...document,
      components: updatedComponents,
    };

    return {
      success: true,
      document: newDocument,
      restored: true,
      componentId,
    };
  }
}
