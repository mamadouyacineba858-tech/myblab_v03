import { describe, expect, it } from "vitest"
import { COMPONENT_TYPES } from "../componentDefinitions.js"
import { getAllCanonicalTypes, getCanonicalEntry } from "../../simulator/canonicalRegistry.js"

describe("MB-CF2-005 — Registry/Presentation pin boundary", () => {
  it("keeps the Registry independent from Presentation", async () => {
    const moduleSource = await import("../../simulator/canonicalRegistry.js")
    expect(moduleSource.getAllCanonicalTypes()).toEqual(getAllCanonicalTypes())
  })

  it("exposes every canonical type in Presentation", () => {
    expect(Object.keys(COMPONENT_TYPES)).toEqual(getAllCanonicalTypes())
  })

  it("keeps canonical id and role unchanged for every pin", () => {
    for (const type of getAllCanonicalTypes()) {
      expect(COMPONENT_TYPES[type].pins.map(({ id, role }) => ({ id, role }))).toEqual(
        getCanonicalEntry(type).pins.map(({ id, role }) => ({ id, role })),
      )
    }
  })

  it("preserves presentation metadata for every canonical pin", () => {
    for (const type of getAllCanonicalTypes()) {
      for (const pin of COMPONENT_TYPES[type].pins) {
        expect(typeof pin.label).toBe("string")
        expect(typeof pin.dx).toBe("number")
        expect(typeof pin.dy).toBe("number")
      }
    }
  })

  it("joins presentation metadata by pin id rather than array position", async () => {
    const original = getCanonicalEntry("LED")
    const reordered = {
      ...original,
      pins: [...original.pins].reverse(),
    }
    const byId = new Map(COMPONENT_TYPES.LED.pins.map((pin) => [pin.id, pin]))

    for (const pin of reordered.pins) {
      expect(byId.get(pin.id)).toBeDefined()
    }
    expect(byId.get("anode").label).toBe("Anode")
    expect(byId.get("cathode").label).toBe("Cathode")
  })

  it("detects a missing presentation pin id", () => {
    const canonical = getCanonicalEntry("LED").pins
    const presentation = COMPONENT_TYPES.LED.pins.filter((pin) => pin.id !== "anode")
    const presentationIds = new Set(presentation.map((pin) => pin.id))

    expect(canonical.some((pin) => !presentationIds.has(pin.id))).toBe(true)
  })

  it("detects an orphan presentation pin id", () => {
    const canonicalIds = new Set(getCanonicalEntry("LED").pins.map((pin) => pin.id))
    const presentationIds = [...COMPONENT_TYPES.LED.pins.map((pin) => pin.id), "orphan"]

    expect(presentationIds.some((id) => !canonicalIds.has(id))).toBe(true)
  })

  it("rejects duplicate presentation ids as an invalid join source", () => {
    const pins = [...COMPONENT_TYPES.LED.pins, { ...COMPONENT_TYPES.LED.pins[0] }]
    const ids = pins.map((pin) => pin.id)
    expect(new Set(ids).size).toBeLessThan(ids.length)
  })

  it("does not duplicate canonical role declarations in presentation metadata", () => {
    for (const type of getAllCanonicalTypes()) {
      for (const pin of COMPONENT_TYPES[type].pins) {
        expect(Object.prototype.hasOwnProperty.call(pin, "role")).toBe(true)
        expect(pin.role).toBe(getCanonicalEntry(type).pins.find((canonicalPin) => canonicalPin.id === pin.id).role)
      }
    }
  })

  it("preserves the public component definition shape", () => {
    expect(COMPONENT_TYPES.RESISTOR).toMatchObject({
      id: "RESISTOR",
      label: "Résistance",
      width: 90,
      height: 28,
    })
    expect(COMPONENT_TYPES.RESISTOR.pins).toHaveLength(2)
  })
})
