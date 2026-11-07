import { BaseCommandHandler } from '../BaseCommandHandler.js'
import { HandlerError } from '../errors/HandlerError.js'
import { WireNotFoundError } from '../errors/WireNotFoundError.js'
import { resolveWireInsulationColor } from '../../../wires/wireAppearance.js'

/**
 * WIRE-009: atomic insulation-only mutation, prepared for explicit registry
 * authorization. Does not alter endpoints, contacts, or waypoints.
 * A null color removes the override and restores legacy signal coloring.
 */
export class UpdateWireColorHandler extends BaseCommandHandler {
  execute(command, document) {
    this._validateCommandPayload(command, ['wireId', 'color'])
    return this._executeWithHistory(command, document)
  }

  _applyMutation(command, document) {
    const { wireId, color } = command.payload
    const nextColor = this._validateColor(color)
    const wire = this._findWire(document, wireId)
    const previousColor = Object.prototype.hasOwnProperty.call(wire, 'color') ? wire.color : null
    return {
      success: true,
      document: this._replaceColor(document, wireId, nextColor),
      wireId,
      previousColor,
      nextColor,
      change: this._createChange('UPDATE_WIRE_COLOR', { wireId, previousColor, nextColor }),
    }
  }

  _applyRedo(command, document, lastResult) {
    if (!lastResult || !lastResult.wireId) throw new HandlerError('Missing wire color redo data')
    return { success: true, document: this._replaceColor(document, lastResult.wireId, lastResult.nextColor) }
  }

  _applyInverse(command, document, lastResult) {
    if (!lastResult || !lastResult.wireId) throw new HandlerError('Missing wire color undo data')
    return { success: true, document: this._replaceColor(document, lastResult.wireId, lastResult.previousColor) }
  }

  _validateColor(color) {
    if (color === null) return null
    const normalized = resolveWireInsulationColor(color)
    if (!normalized) throw new HandlerError('Unsupported wire insulation color')
    return normalized
  }

  _findWire(document, wireId) {
    const wire = document?.wires?.find((item) => item.id === wireId)
    if (!wire) throw new WireNotFoundError(wireId)
    return wire
  }

  _replaceColor(document, wireId, color) {
    this._findWire(document, wireId)
    return {
      ...document,
      wires: document.wires.map((wire) => {
        if (wire.id !== wireId) return wire
        const { color: _previousColor, ...unchanged } = wire
        return color === null ? unchanged : { ...unchanged, color }
      }),
    }
  }
}
