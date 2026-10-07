/**
 * A13-ARD-PREQ1 — Generic board pin capability contract.
 *
 * Pure board metadata only: no React, Document, Scheduler, Runtime or Canvas
 * knowledge. Electrical topology remains owned by canonicalRegistry.js.
 */

export const BOARD_IDS = Object.freeze({
  ARDUINO_UNO_R3: "ARDUINO_UNO_R3",
})

export const BOARD_PIN_CAPABILITIES = Object.freeze({
  DIGITAL_OUTPUT: "DIGITAL_OUTPUT",
})

function freezePin(pin) {
  return Object.freeze({
    sketchPin: pin.sketchPin,
    canonicalPinId: pin.canonicalPinId,
    capabilities: Object.freeze([...pin.capabilities]),
  })
}

function freezeBoard(board) {
  return Object.freeze({
    boardId: board.boardId,
    componentType: board.componentType,
    pins: Object.freeze(board.pins.map(freezePin)),
  })
}

const BOARDS = new Map([
  [
    BOARD_IDS.ARDUINO_UNO_R3,
    freezeBoard({
      boardId: BOARD_IDS.ARDUINO_UNO_R3,
      componentType: "ARDUINO",
      pins: Array.from({ length: 14 }, (_, sketchPin) => ({
        sketchPin,
        canonicalPinId: `D${sketchPin}`,
        capabilities: [BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT],
      })),
    }),
  ],
])

export function getBoardDefinition(boardId) {
  return BOARDS.get(boardId) ?? null
}

export function getBoardPins(boardId) {
  return getBoardDefinition(boardId)?.pins ?? Object.freeze([])
}

export function getBoardPin(boardId, sketchPin) {
  return getBoardPins(boardId).find((pin) => pin.sketchPin === sketchPin) ?? null
}

export function hasBoardPinCapability(boardId, sketchPin, capability) {
  return getBoardPin(boardId, sketchPin)?.capabilities.includes(capability) === true
}

export function mapBoardPinToCanonical(boardId, sketchPin, requiredCapability) {
  const pin = getBoardPin(boardId, sketchPin)
  if (!pin) return null
  if (requiredCapability !== undefined && !pin.capabilities.includes(requiredCapability)) return null
  return pin.canonicalPinId
}
