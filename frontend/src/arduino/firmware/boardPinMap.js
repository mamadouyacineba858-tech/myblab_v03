/**
 * MB-L1-ARD-002 / A13-ARD-PREQ1 — compatibility adapter for the historical
 * Arduino firmware pin API.
 *
 * The generic board capability contract is now the authority. This module
 * deliberately preserves the existing D2/D3-only public behavior so PREQ1 is
 * behavior-preserving and activates no new product capability.
 */

import {
  BOARD_IDS,
  BOARD_PIN_CAPABILITIES,
  getBoardPins,
  mapBoardPinToCanonical,
} from "../boards/boardCapabilities.js"

const BOARD_ID = BOARD_IDS.ARDUINO_UNO_R3
const REQUIRED_CAPABILITY = BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT

/**
 * @param {number} arduinoPin Pin number as written in the sketch.
 * @returns {string|null} Canonical MYBlab pin id, or null when unsupported.
 */
export function mapArduinoPin(arduinoPin) {
  return mapBoardPinToCanonical(BOARD_ID, arduinoPin, REQUIRED_CAPABILITY)
}

/** @returns {number[]} Supported Arduino sketch pins, sorted. */
export function getSupportedArduinoPins() {
  return getBoardPins(BOARD_ID)
    .filter((pin) => pin.capabilities.includes(REQUIRED_CAPABILITY))
    .map((pin) => pin.sketchPin)
    .sort((a, b) => a - b)
}
