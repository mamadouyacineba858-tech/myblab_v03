import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../simulator/preparation.js"
import { resolveSignals } from "../simulator/resolution.js"
import { getLedState } from "../simulator/production.js"

function powerComponent() {
  return { uid: "power1", type: "POWER", x: 0, y: 0 }
}

function resistorComponent(uid, x, y, resistance) {
  return { uid, type: "RESISTOR", x, y, parameters: { resistance } }
}

function ledComponent(uid, x, y) {
  return { uid, type: "LED", x, y }
}

describe("E01 — Simple LED Simulation with Ammeter", () => {
  // E01-001: LED allumée avec courant et tension mesurables
  it("Creates and simulates a 5V LED circuit with 220Ω resistor", () => {
    const components = [
      powerComponent(),
      resistorComponent("r1", 200, 0, 220),
      ledComponent("l1", 400, 0),
    ]

    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)

    const ledState = getLedState("l1", pinSignals, {
      forwardVoltage: 2.1,
      seriesResistance: 220,
    })

    // Vérifications E01-001
    expect(ledState.on).toBe(true)
    expect(ledState.vled).toBeGreaterThan(1.5) // ~2.1V pour LED rouge
    expect(ledState.current).toBeGreaterThan(0.010) // >10 mA
    expect(ledState.current).toBeLessThan(0.020) // <20 mA
  })

  // E01-002: LED éteinte en circuit non connecté
  it("LED off when circuit is not wired", () => {
    const components = [ledComponent("l1", 0, 0)]

    const wires = []

    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)

    const ledState = getLedState("l1", pinSignals, {
      forwardVoltage: 2.1,
    })

    expect(ledState.on).toBe(false)
    expect(ledState.current).toBe(0)
  })

  // E01-003: Catalog préservé dans le workflow
  it("Circuit preserves component types throughout workflow", () => {
    const components = [
      powerComponent(),
      resistorComponent("r1", 200, 0, 220),
      ledComponent("l1", 400, 0),
    ]

    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const exportedTypes = new Set(components.map((c) => c.type))

    expect(exportedTypes).toContain("POWER")
    expect(exportedTypes).toContain("RESISTOR")
    expect(exportedTypes).toContain("LED")
  })
})