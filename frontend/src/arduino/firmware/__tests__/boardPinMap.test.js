import { describe, it, expect } from "vitest"
import { mapArduinoPin, getSupportedArduinoPins } from "../boardPinMap.js"

describe("MB-L1-ARD-002 — boardPinMap", () => {
  it("AC-07/AC-08 : pin 2 -> D2, pin 3 -> D3", () => {
    expect(mapArduinoPin(2)).toBe("D2")
    expect(mapArduinoPin(3)).toBe("D3")
  })

  it("§26 : tout pin hors {2,3} (ex. 13, D4-D13) retourne null, jamais une valeur inventée", () => {
    expect(mapArduinoPin(13)).toBeNull()
    expect(mapArduinoPin(0)).toBeNull()
    expect(mapArduinoPin(4)).toBeNull()
    expect(mapArduinoPin(-1)).toBeNull()
    expect(mapArduinoPin(NaN)).toBeNull()
  })

  it("getSupportedArduinoPins expose exactement [2, 3]", () => {
    expect(getSupportedArduinoPins()).toEqual([2, 3])
  })
})
