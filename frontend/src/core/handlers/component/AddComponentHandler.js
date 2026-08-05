import { BaseCommandHandler } from '../BaseCommandHandler.js';

export class AddComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentType']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentType, position = { x: 0, y: 0 }, parameters = {} } = command.payload;

    const id = command.payload.componentId || this._generateComponentId(componentType);
    command.payload.componentId = id;

    const newComponent = {
      id,
      type: componentType,
      position: { ...position },
      parameters: { ...parameters },
    };

    const newDocument = {
      ...document,
      components: [...(document.components || []), newComponent],
    };

    return {
      success: true,
      document: newDocument,
      componentId: id,
      newComponent,
      change: this._createChange('ADD_COMPONENT', {
        componentId: id,
        component: newComponent,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const componentId = command.payload.componentId;
    const { componentType, position = { x: 0, y: 0 }, parameters = {} } = command.payload;

    if (!componentId) {
      throw new Error('Cannot redo AddComponent: missing componentId');
    }

    if (this._componentExists(document, componentId)) {
      return { success: true, document, componentId };
    }

    const newComponent = {
      id: componentId,
      type: componentType,
      position: { ...position },
      parameters: { ...parameters },
    };

    const newDocument = {
      ...document,
      components: [...(document.components || []), newComponent],
    };

    return {
      success: true,
      document: newDocument,
      componentId,
      newComponent,
      change: this._createChange('ADD_COMPONENT', {
        componentId,
        component: newComponent,
      }),
    };
  }

  _applyInverse(command, document, lastResult) {
    const { componentId } = lastResult;

    if (!componentId) {
      throw new Error('Cannot undo AddComponent: missing componentId in lastResult');
    }

    if (!this._componentExists(document, componentId)) {
      return { success: true, document };
    }

    const { newDocument: docWithoutWires } =
      this._removeWiresForComponent(document, componentId);

    const remainingComponents = docWithoutWires.components.filter(
      c => c.id !== componentId
    );

    const newDocument = {
      ...docWithoutWires,
      components: remainingComponents,
    };

    return {
      success: true,
      document: newDocument,
      restored: false,
      removedComponentId: componentId,
    };
  }
}
