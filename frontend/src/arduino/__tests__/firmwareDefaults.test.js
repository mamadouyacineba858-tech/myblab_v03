import { describe, it, expect } from "vitest"
import { DEFAULT_FIRMWARE_SOURCE, hasFirmwareCapability, createDefaultFirmware, isValidFirmwareStructure } from "../firmwareDefaults.js"

describe("MB-L1-ARD-001 — firmwareDefaults", () => {
  it("DEFAULT_FIRMWARE_SOURCE est un squelette vide (setup/loop), jamais un Blink (§29)", () => {
    expect(DEFAULT_FIRMWARE_SOURCE).toMatch(/void setup\(\)/)
    expect(DEFAULT_FIRMWARE_SOURCE).toMatch(/void loop\(\)/)
    expect(DEFAULT_FIRMWARE_SOURCE).not.toMatch(/digitalWrite|delay|pinMode/)
  })

  it("hasFirmwareCapability : uniquement ARDUINO pour l'instant", () => {
    expect(hasFirmwareCapability("ARDUINO")).toBe(true)
    expect(hasFirmwareCapability("RESISTOR")).toBe(false)
    expect(hasFirmwareCapability("LED")).toBe(false)
    expect(hasFirmwareCapability("NOT_A_TYPE")).toBe(false)
  })

  it("createDefaultFirmware : { source } pour ARDUINO, undefined pour tout autre type (AC-04)", () => {
    expect(createDefaultFirmware("ARDUINO")).toEqual({ source: DEFAULT_FIRMWARE_SOURCE })
    expect(createDefaultFirmware("RESISTOR")).toBeUndefined()
    expect(createDefaultFirmware("LED")).toBeUndefined()
  })

  it("isValidFirmwareStructure : accepte { source: string }", () => {
    expect(isValidFirmwareStructure({ source: "void setup(){}" })).toBe(true)
    expect(isValidFirmwareStructure({ source: "" })).toBe(true)
  })

  it("isValidFirmwareStructure : rejette null/undefined/non-objet/tableau/source non-string", () => {
    expect(isValidFirmwareStructure(null)).toBe(false)
    expect(isValidFirmwareStructure(undefined)).toBe(false)
    expect(isValidFirmwareStructure("string")).toBe(false)
    expect(isValidFirmwareStructure(123)).toBe(false)
    expect(isValidFirmwareStructure([])).toBe(false)
    expect(isValidFirmwareStructure({ source: 123 })).toBe(false)
    expect(isValidFirmwareStructure({})).toBe(false)
  })
})
