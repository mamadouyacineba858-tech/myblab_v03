import { BaseCommandHandler } from '../BaseCommandHandler.js';

/**
 * AddWireHandler — MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001).
 *
 * Suit exactement le même patron que AddComponentHandler (MB-CF3-001) :
 * _applyMutation/_applyRedo/_applyInverse opèrent sur le Document Core
 * (jamais sur l'état React), et execute() délègue à
 * BaseCommandHandler._executeWithHistory() — aucune nouvelle mécanique
 * d'historique n'est inventée ici (contrat existant, réutilisé tel quel).
 *
 * Modèle Wire Core (inchangé, déjà défini par ReactDocumentMapper
 * §_WIRE_MAPPING_RC/_CR, vérifié en lecture seule lors du GATE 1) :
 *   { id, pinA: { componentId, pinId? }, pinB: { componentId, pinId? } }
 * `id` n'est pas un champ déclaré du contrat de mapping : il transite par
 * le mécanisme générique de copie des propriétés inconnues de
 * ReactDocumentMapper (même mécanisme que `pins` sur les composants,
 * déjà documenté lors de MB-CF1-001/MB-CF3-001).
 *
 * La détection de doublon (wireAlreadyExists) N'EST PAS dupliquée ni
 * déplacée ici, conformément au ruling CSA (« ne déplace pas cette
 * logique automatiquement ») : elle reste appliquée côté UI
 * (useCircuitState.js), avant tout dispatch, exactement comme avant
 * ce ticket — seul le mécanisme de mutation change (CommandBus au lieu
 * d'un setWires() direct), pas la garantie elle-même.
 */
export class AddWireHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['fromUid', 'fromPin', 'toUid', 'toPin']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { fromUid, fromPin, toUid, toPin } = command.payload;

    const id = command.payload.wireId || this._generateWireId();
    command.payload.wireId = id;

    const newWire = this._buildWire(id, fromUid, fromPin, toUid, toPin);

    const newDocument = {
      ...document,
      wires: [...(document.wires || []), newWire],
    };

    return {
      success: true,
      document: newDocument,
      wireId: id,
      newWire,
      change: this._createChange('ADD_WIRE', {
        wireId: id,
        wire: newWire,
      }),
    };
  }

  _applyRedo(command, document) {
    const wireId = command.payload.wireId;
    const { fromUid, fromPin, toUid, toPin } = command.payload;

    if (!wireId) {
      throw new Error('Cannot redo AddWire: missing wireId');
    }

    if (this._wireExists(document, wireId)) {
      return { success: true, document, wireId };
    }

    const newWire = this._buildWire(wireId, fromUid, fromPin, toUid, toPin);

    const newDocument = {
      ...document,
      wires: [...(document.wires || []), newWire],
    };

    return {
      success: true,
      document: newDocument,
      wireId,
      newWire,
      change: this._createChange('ADD_WIRE', {
        wireId,
        wire: newWire,
      }),
    };
  }

  _applyInverse(command, document, lastResult) {
    const { wireId } = lastResult;

    if (!wireId) {
      throw new Error('Cannot undo AddWire: missing wireId in lastResult');
    }

    if (!this._wireExists(document, wireId)) {
      return { success: true, document };
    }

    const remainingWires = (document.wires || []).filter((w) => w.id !== wireId);

    const newDocument = {
      ...document,
      wires: remainingWires,
    };

    return {
      success: true,
      document: newDocument,
      restored: false,
      removedWireId: wireId,
    };
  }

  _buildWire(id, fromUid, fromPin, toUid, toPin) {
    return {
      id,
      pinA: {
        componentId: fromUid,
        ...(fromPin !== undefined ? { pinId: fromPin } : {}),
      },
      pinB: {
        componentId: toUid,
        ...(toPin !== undefined ? { pinId: toPin } : {}),
      },
    };
  }

  _wireExists(document, wireId) {
    if (!document.wires) return false;
    return document.wires.some((w) => w.id === wireId);
  }
}
