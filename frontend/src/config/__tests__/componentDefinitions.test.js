import { describe, expect, it } from "vitest"
import { COMPONENT_TYPES, PALETTE_ITEMS, createComponent, getComponentDef } from "../componentDefinitions.js"
import { getAllCanonicalTypes, getCanonicalEntry } from "../../simulator/canonicalRegistry.js"

describe("componentDefinitions — canonical pin integration", () => {
  it("exposes exactly the canonical component types", () => {
    expect(Object.keys(COMPONENT_TYPES)).toEqual(getAllCanonicalTypes())
  })

  it("derives every pin id and role from canonicalRegistry", () => {
    for (const type of getAllCanonicalTypes()) {
      expect(COMPONENT_TYPES[type].pins.map(({ id, role }) => ({ id, role }))).toEqual(
        getCanonicalEntry(type).pins.map(({ id, role }) => ({ id, role })),
      )
    }
  })

  it("preserves presentation data for every canonical pin", () => {
    for (const type of getAllCanonicalTypes()) {
      const pins = COMPONENT_TYPES[type].pins
      const canonicalPins = getCanonicalEntry(type).pins

      expect(pins).toHaveLength(canonicalPins.length)
      pins.forEach((pin, index) => {
        expect(pin.id).toBe(canonicalPins[index].id)
        expect(pin.role).toBe(canonicalPins[index].role)
        expect(typeof pin.label).toBe("string")
        expect(typeof pin.dx).toBe("number")
        expect(typeof pin.dy).toBe("number")
      })
    }
  })

  it("keeps getComponentDef and createComponent behavior intact", () => {
    const definition = getComponentDef("RESISTOR")
    expect(definition).toBe(COMPONENT_TYPES.RESISTOR)

    const component = createComponent("RESISTOR", 10, 20)
    expect(component).toMatchObject({ type: "RESISTOR", x: 10, y: 20 })
    expect(component.pins).toEqual(definition.pins)
    expect(component.pins).not.toBe(definition.pins)
  })

  it("returns null for an unknown component type", () => {
    expect(getComponentDef("UNKNOWN_TYPE")).toBeNull()
    expect(createComponent("UNKNOWN_TYPE", 0, 0)).toBeNull()
  })

  it("keeps the palette complete and ordered", () => {
    expect(PALETTE_ITEMS.map((item) => item.id)).toEqual(getAllCanonicalTypes())
  })

  it("does not mutate canonical pin objects when presentation data is consumed", () => {
    const canonicalPin = getCanonicalEntry("LED").pins[0]
    const componentPin = COMPONENT_TYPES.LED.pins[0]

    expect(componentPin).not.toBe(canonicalPin)
    expect(canonicalPin).toEqual({ id: "anode", role: "input" })
    expect(componentPin).toMatchObject({ id: "anode", role: "input", label: "Anode", dx: 0, dy: 20 })
  })
})
