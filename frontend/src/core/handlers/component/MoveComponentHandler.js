import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

export class MoveComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'position']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentId, position } = command.payload;

    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    if (typeof position !== 'object' || position === null) {
      throw new HandlerError('Position must be an object');
    }
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      throw new HandlerError('Position must have x and y numbers');
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );
    const oldPosition = { ...oldComponent.position };

    const updatedComponent = {
      ...oldComponent,
      position: { ...position },
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
      oldPosition,
      newPosition: { ...position },
      oldComponent,
      change: this._createChange('MOVE_COMPONENT', {
        componentId,
        oldPosition,
        newPosition: { ...position },
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { componentId, newPosition } = lastResult;

    if (!componentId || !newPosition) {
      throw new Error('Cannot redo MoveComponent: missing data');
    }

    if (!this._componentExists(document, componentId)) {
      return { success: true, document };
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );

    const updatedComponent = {
      ...oldComponent,
      position: { ...newPosition },
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
    const { componentId, oldPosition } = lastResult;

    if (!componentId || !oldPosition) {
      throw new Error('Cannot undo MoveComponent: missing componentId or oldPosition');
    }

    if (!this._componentExists(document, componentId)) {
      return { success: true, document };
    }

    const oldComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );

    const restoredComponent = {
      ...oldComponent,
      position: { ...oldPosition },
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
