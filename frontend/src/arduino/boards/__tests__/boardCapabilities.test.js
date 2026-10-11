import { describe, expect, it } from "vitest"
import {
  BOARD_IDS,
  BOARD_PIN_CAPABILITIES,
  getBoardDefinition,
  getBoardPin,
  getBoardPins,
  hasBoardPinCapability,
  mapBoardPinToCanonical,
} from "../boardCapabilities.js"
import { getCanonicalEntry } from "../../../simulator/canonicalRegistry.js"

describe("A13-ARD-PREQ1 — generic board pin capability contract", () => {
  const boardId = BOARD_IDS.ARDUINO_UNO_R3

  it("declares the Arduino Uno R3 complete digital output surface", () => {
    const board = getBoardDefinition(boardId)
    expect(board).not.toBeNull()
    expect(board.componentType).toBe("ARDUINO")
    expect(board.pins.map((pin) => pin.sketchPin)).toEqual(Array.from({ length: 14 }, (_, pin) => pin))
    expect(board.pins.map((pin) => pin.canonicalPinId)).toEqual(Array.from({ length: 14 }, (_, pin) => `D${pin}`))
  })

  it("declares DIGITAL_OUTPUT on D0-D13 and no implicit capability on unknown pins", () => {
    for (let pin = 0; pin <= 13; pin++) expect(hasBoardPinCapability(boardId, pin, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBe(true)
    expect(hasBoardPinCapability(boardId, 14, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBe(false)
    expect(hasBoardPinCapability(boardId, 2, "NOT_A_CAPABILITY")).toBe(false)
  })

  it("maps only supported board pins to canonical electrical pins", () => {
    expect(mapBoardPinToCanonical(boardId, 2, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBe("D2")
    expect(mapBoardPinToCanonical(boardId, 3, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBe("D3")
    expect(mapBoardPinToCanonical(boardId, 13, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBe("D13")
    expect(mapBoardPinToCanonical(boardId, 14, BOARD_PIN_CAPABILITIES.DIGITAL_OUTPUT)).toBeNull()
    expect(getBoardPin("NOT_A_BOARD", 2)).toBeNull()
    expect(getBoardPins("NOT_A_BOARD")).toEqual([])
  })

  it("keeps board definitions deeply immutable", () => {
    const board = getBoardDefinition(boardId)
    expect(Object.isFrozen(board)).toBe(true)
    expect(Object.isFrozen(board.pins)).toBe(true)
    expect(Object.isFrozen(board.pins[0])).toBe(true)
    expect(Object.isFrozen(board.pins[0].capabilities)).toBe(true)
    expect(() => board.pins.push({})).toThrow(TypeError)
    expect(() => { board.pins[0].canonicalPinId = "D13" }).toThrow(TypeError)
  })

  it("has deterministic unique sketch/canonical ids", () => {
    const pins = getBoardPins(boardId)
    expect(new Set(pins.map((pin) => pin.sketchPin)).size).toBe(pins.length)
    expect(new Set(pins.map((pin) => pin.canonicalPinId)).size).toBe(pins.length)
    expect(pins.map((pin) => pin.sketchPin)).toEqual([...pins].map((pin) => pin.sketchPin).sort((a, b) => a - b))
  })

  it("cross-checks every enabled firmware pin against canonical electrical topology", () => {
    const board = getBoardDefinition(boardId)
    const canonical = getCanonicalEntry(board.componentType)
    const canonicalIds = new Set(canonical.pins.map((pin) => pin.id))
    for (const pin of board.pins) expect(canonicalIds.has(pin.canonicalPinId)).toBe(true)
  })
})
