import { describe, it, expect } from "vitest"
import { COMPONENT_TYPES } from "../componentDefinitions.js"
import { resolveComponentProperties, validateComponentProperties } from "../componentProperties.js"
import { normalizeComponent } from "../../utils/circuitModel.js"
import { ReactDocumentMapper } from "../../bridge/ReactDocumentMapper.js"

describe("L1-PROP-001 product property contract", () => {
  it("shares a single declarative schema across every existing type", () => {
    const schema = COMPONENT_TYPES.LED.propertySchema
    for (const [type, definition] of Object.entries(COMPONENT_TYPES)) {
      expect(definition.propertySchema).toBe(schema)
      expect(resolveComponentProperties(type)).toEqual({ name: "" })
    }
    expect(resolveComponentProperties("unknown")).toEqual({})
    expect(validateComponentProperties("unknown", { name: "" }).valid).toBe(false)
  })
  it.each(["", "LED témoin température", "  R entrée  ", "x".repeat(80), "💡".repeat(80)])("accepts Unicode and preserves exact contents: %s", name => {
    expect(validateComponentProperties("LED", { name })).toEqual({ valid: true, errors: [], sanitized: { name } })
    expect(resolveComponentProperties("LED", { name })).toEqual({ name })
  })
  it.each([{ name: 123 }, { name: null }, { name: "x".repeat(81) }, { surprise: 1 }, { name: "ok", surprise: 123 }, [], null, new Date()])("strictly rejects invalid candidates: %j", candidate => {
    expect(validateComponentProperties("LED", candidate).valid).toBe(false)
  })
  it("resolves missing/invalid legacy properties without mutating the source", () => {
    const legacy = { uid: "legacy", type: "LED", x: 0, y: 0 }
    const normalized = normalizeComponent(legacy)
    expect(normalized.properties).toBeUndefined()
    expect(resolveComponentProperties(normalized.type, normalized.properties)).toEqual({ name: "" })
    expect(resolveComponentProperties("LED", { name: 12 })).toEqual({ name: "" })
    expect(legacy.properties).toBeUndefined()
  })
  it("normalization and generic React/Core round-trip preserve independent properties", () => {
    const input = { uid: "r", type: "RESISTOR", x: 20, y: 40, pins: [], parameters: { resistance: 220 }, properties: { name: "R entrée" } }
    const normalized = normalizeComponent(input)
    expect(normalized.properties).toEqual(input.properties)
    expect(normalized.properties).not.toBe(input.properties)
    const core = ReactDocumentMapper.toCore({ components: [normalized], wires: [] })
    expect(core.components[0].properties).toEqual(input.properties)
    const back = ReactDocumentMapper.toReact(core)
    expect(back.components[0]).toEqual(normalized)
    back.components[0].properties.name = "changed"
    expect(core.components[0].properties.name).toBe("R entrée")
    expect(input.properties.name).toBe("R entrée")
  })
})
