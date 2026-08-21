import { BaseCommandHandler } from '../BaseCommandHandler.js';
import { WireNotFoundError } from '../errors/WireNotFoundError.js';
import { HandlerError } from '../errors/HandlerError.js';

/**
 * UpdateWireWaypointsHandler — MB-VIS-005.
 *
 * Mutation atomique unique du contrat des waypoints (ADR-008 — ACCEPTED /
 * AMENDED ; docs/pmo/tickets/MB-VIS-005.md §5.2/§5.3 ; docs/pmo/tickets/
 * MB-VIS-005-IMPLEMENTATION.md §4.3) : remplace intégralement le tableau
 * `waypoints` d'un Wire déjà existant. `pinA`/`pinB` ne sont jamais lus ni
 * modifiés par ce Handler — la topologie du Wire reste hors de portée de
 * cette mutation (AC-11, invariant §12.5/§12.6 du ticket parent).
 *
 * Suit exactement le même patron que UpdateComponentHandler (remplacement
 * atomique d'une propriété + snapshot ancien/nouveau pour Undo/Redo) :
 * _applyMutation/_applyRedo/_applyInverse opèrent sur le Document Core,
 * execute() délègue à BaseCommandHandler._executeWithHistory() — aucune
 * nouvelle mécanique d'historique n'est inventée ici.
 *
 * GOUVERNANCE (MB-VIS-005 §5, G-09, G-10) : ce Handler N'ÉTAIT PAS enregistré
 * dans le CommandRegistry de production (frontend/src/hooks/
 * useCircuitState.js) tant qu'aucun ruling CSA traçable n'amendait
 * explicitement le verrou frontend/src/bridge/tests/
 * cf1DocumentArchitecture.test.js (cf. rapport d'implémentation de la
 * mission MB-VIS-005-IMPLEMENTATION, commit ab8f1bf).
 *
 * [CSA RULING — AUTORISATION DE REPRISE MB-VIS-005, 2026-08-21] Ce ruling
 * autorise explicitement l'enregistrement en production de
 * UPDATE_WIRE_WAYPOINTS (et de cette seule commande) ainsi que l'adaptation
 * corrélative du verrou cf1DocumentArchitecture.test.js. Ce Handler est
 * désormais câblé dans useCircuitState.js, exactement selon le patron déjà
 * utilisé pour AddWireHandler — aucune logique de ce fichier n'a été
 * modifiée pour cette reprise.
 */
export class UpdateWireWaypointsHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['wireId', 'waypoints']);
    return this._executeWithHistory(command, document);
  }

  _applyMutation(command, document) {
    const { wireId, waypoints } = command.payload;

    if (!Array.isArray(waypoints)) {
      throw new HandlerError('waypoints must be an array');
    }

    const oldWire = this._cloneWire(this._findWire(document, wireId));
    const oldWaypoints = Array.isArray(oldWire.waypoints)
      ? oldWire.waypoints.map((wp) => ({ ...wp }))
      : [];
    const newWaypoints = waypoints.map((wp) => ({ ...wp }));

    const updatedWire = { ...oldWire, waypoints: newWaypoints };
    const updatedWires = document.wires.map((w) => (w.id === wireId ? updatedWire : w));

    const newDocument = {
      ...document,
      wires: updatedWires,
    };

    return {
      success: true,
      document: newDocument,
      wireId,
      oldWaypoints,
      newWaypoints,
      change: this._createChange('UPDATE_WIRE_WAYPOINTS', {
        wireId,
        oldWaypoints,
        newWaypoints,
      }),
    };
  }

  _applyRedo(command, document, lastResult) {
    const { wireId, newWaypoints } = lastResult || {};

    if (!wireId || !newWaypoints) {
      throw new Error('Cannot redo UpdateWireWaypoints: missing data');
    }

    if (!this._wireExists(document, wireId)) {
      return { success: true, document };
    }

    const oldWire = this._cloneWire(this._findWire(document, wireId));
    const updatedWire = { ...oldWire, waypoints: newWaypoints.map((wp) => ({ ...wp })) };
    const updatedWires = document.wires.map((w) => (w.id === wireId ? updatedWire : w));

    const newDocument = {
      ...document,
      wires: updatedWires,
    };

    return { success: true, document: newDocument, wireId };
  }

  _applyInverse(command, document, lastResult) {
    const { wireId, oldWaypoints } = lastResult || {};

    if (!wireId || oldWaypoints === undefined) {
      throw new Error('Cannot undo UpdateWireWaypoints: missing wireId or oldWaypoints');
    }

    if (!this._wireExists(document, wireId)) {
      return { success: true, document };
    }

    const oldWire = this._cloneWire(this._findWire(document, wireId));
    const restoredWire = { ...oldWire, waypoints: oldWaypoints.map((wp) => ({ ...wp })) };
    const updatedWires = document.wires.map((w) => (w.id === wireId ? restoredWire : w));

    const newDocument = {
      ...document,
      wires: updatedWires,
    };

    return { success: true, document: newDocument, restored: true, wireId };
  }

  _wireExists(document, wireId) {
    if (!document.wires) return false;
    return document.wires.some((w) => w.id === wireId);
  }

  _findWire(document, wireId) {
    if (!document.wires) {
      throw new HandlerError('Document has no wires array');
    }
    const wire = document.wires.find((w) => w.id === wireId);
    if (!wire) {
      throw new WireNotFoundError(wireId);
    }
    return wire;
  }

  _cloneWire(wire) {
    return JSON.parse(JSON.stringify(wire));
  }
}
