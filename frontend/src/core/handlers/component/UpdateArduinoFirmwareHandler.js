import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { HandlerError } from '../errors/HandlerError.js';
import { ComponentNotFoundError } from '../errors/ComponentNotFoundError.js';
import { isValidFirmwareStructure } from '../../../arduino/firmwareDefaults.js';

// MB-L1-ARD-001 (CSA GO) — neuvième type autorisé sur le canal CommandBus,
// borné exactement à UPDATE_ARDUINO_FIRMWARE (ARD invariant : jamais un
// UPDATE_COMPONENT générique, et jamais une réutilisation de
// UPDATE_COMPONENT_PARAMETERS — le firmware n'est pas un paramètre
// électrique). Contrat canonique :
//
//   new Command("UPDATE_ARDUINO_FIRMWARE", {
//     componentId, beforeFirmware, afterFirmware
//   })
//
// Les deux snapshots sont fournis explicitement par l'appelant (couche de
// composition, useCircuitState.js) — jamais dérivés par le Handler lui-même,
// même principe d'auto-description que MOVE_COMPONENT/
// UPDATE_COMPONENT_PARAMETERS (rulings CSA-CF3-003-MOVE-001, MB-L1-CVE-001).
//
// §21 du ticket : ce fichier n'importe RIEN depuis simulator/* (aucun
// ArduinoSimulator, runtimeOrchestrator, simulationRuntimeIntegration,
// parser). `isValidFirmwareStructure` (firmwareDefaults.js) est une pure
// validation de FORME (`{ source: string }`), sans connaissance de
// Simulation/Runtime — même statut que componentDefinitions.js pour
// UpdateComponentParametersHandler (aucune dépendance Core → Simulator).
export class UpdateArduinoFirmwareHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['componentId', 'beforeFirmware', 'afterFirmware']);
    const { componentId, beforeFirmware, afterFirmware } = command.payload;

    if (!isValidFirmwareStructure(beforeFirmware)) {
      throw new HandlerError('beforeFirmware must be a valid firmware structure ({ source: string })');
    }
    if (!isValidFirmwareStructure(afterFirmware)) {
      throw new HandlerError('afterFirmware must be a valid firmware structure ({ source: string })');
    }
    if (!this._componentExists(document, componentId)) {
      throw new ComponentNotFoundError(componentId);
    }

    const component = this._findComponent(document, componentId);
    if (component.type !== 'ARDUINO') {
      throw new HandlerError(
        `Cannot update firmware: component "${componentId}" is not an ARDUINO (type "${component.type}")`
      );
    }

    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { componentId, afterFirmware } = command.payload;
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const updatedComponent = { ...oldComponent, firmware: { ...afterFirmware } };

    const newDocument = {
      ...document,
      components: document.components.map((c) => (c.id === componentId ? updatedComponent : c)),
    };

    return {
      success: true,
      document: newDocument,
      componentId,
      change: this._createChange('UPDATE_ARDUINO_FIRMWARE', {
        componentId,
        beforeFirmware: command.payload.beforeFirmware,
        afterFirmware,
      }),
    };
  }

  _applyRedo(command, document) {
    const { componentId, afterFirmware } = command.payload;
    if (!this._componentExists(document, componentId)) {
      return { success: true, document, componentId };
    }
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const updatedComponent = { ...oldComponent, firmware: { ...afterFirmware } };

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
    const { componentId, beforeFirmware } = command.payload;
    if (!this._componentExists(document, componentId)) {
      return { success: true, document, restored: false };
    }
    const oldComponent = this._cloneComponent(this._findComponent(document, componentId));
    const restoredComponent = { ...oldComponent, firmware: { ...beforeFirmware } };

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
