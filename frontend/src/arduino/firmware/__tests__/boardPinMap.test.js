import { describe, it, expect } from "vitest"
import { mapArduinoPin, getSupportedArduinoPins } from "../boardPinMap.js"

describe("A13-ARD-SURF1 — boardPinMap", () => {
  it("maps every Arduino Uno digital sketch pin D0-D13", () => {
    for (let pin = 0; pin <= 13; pin++) expect(mapArduinoPin(pin)).toBe(`D${pin}`)
  })

  it("rejects pins outside the digital surface", () => {
    expect(mapArduinoPin(14)).toBeNull()
    expect(mapArduinoPin(-1)).toBeNull()
    expect(mapArduinoPin(NaN)).toBeNull()
  })

  it("getSupportedArduinoPins exposes exactly 0..13", () => {
    expect(getSupportedArduinoPins()).toEqual(Array.from({ length: 14 }, (_, pin) => pin))
  })
})
