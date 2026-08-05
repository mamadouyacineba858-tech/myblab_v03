import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';

export class RemoveComponentHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentId } = command.payload;

    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    const removedComponent = this._cloneComponent(
      this._findComponent(document, componentId)
    );
    const { newDocument: docWithoutWires, removedWires, removedWiresData } =
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
      removedComponentId: componentId,
      removedWireIds: removedWires,
      removedWiresData: removedWiresData.map(w => ({ ...w })),
      removedComponent,
      change: this._createChange('REMOVE_COMPONENT', {
        componentId,
        removedWireIds: removedWires,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { removedComponentId, removedWiresData } = lastResult;

    if (!removedComponentId) {
      throw new Error('Cannot redo RemoveComponent: missing componentId');
    }

    if (!this._componentExists(document, removedComponentId)) {
      return { success: true, document };
    }

    const remainingWires = document.wires.filter(wire => {
      return !removedWiresData.some(removed => removed.id === wire.id);
    });

    const remainingComponents = document.components.filter(
      c => c.id !== removedComponentId
    );

    const newDocument = {
      ...document,
      components: remainingComponents,
      wires: remainingWires,
    };

    return {
      success: true,
      document: newDocument,
      removedComponentId,
      removedWireIds: removedWiresData.map(w => w.id),
    };
  }

  _applyInverse(command, document, lastResult) {
    const { removedComponent, removedWiresData } = lastResult;

    if (!removedComponent) {
      throw new Error('Cannot undo RemoveComponent: missing removedComponent in lastResult');
    }

    const restoredComponents = [...document.components, { ...removedComponent }];

    const restoredWires = [
      ...(document.wires || [])
    ];

    if (removedWiresData && removedWiresData.length > 0) {
      restoredWires.push(...removedWiresData.map(w => ({ ...w })));
    }

    const newDocument = {
      ...document,
      components: restoredComponents,
      wires: restoredWires,
    };

    return {
      success: true,
      document: newDocument,
      restored: true,
      restoredComponentId: removedComponent.id,
    };
  }
}
