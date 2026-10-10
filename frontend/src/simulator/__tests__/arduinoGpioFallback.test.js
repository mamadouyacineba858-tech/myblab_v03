import { describe, expect, it } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { Signal } from "../signals.js"
import { getWireLogicalState } from "../../wires/wireState.js"
import { getWireStateClassName, getWireStrokeColor } from "../../wires/wirePath.js"

const gpioIds = Array.from({ length: 14 }, (_, index) => `D${index}`)

function circuit(pinId) {
  const components = [
    { uid: "arduino", type: "ARDUINO", x: 0, y: 0 },
    { uid: "led", type: "LED", x: 200, y: 0 },
    { uid: "power", type: "POWER", x: 300, y: 0 },
  ]
  const wire = { fromUid: "arduino", fromPin: pinId, toUid: "led", toPin: "anode" }
  const wires = [wire, { fromUid: "power", fromPin: "GND", toUid: "led", toPin: "cathode" }]
  return { components, wire, wires }
}

describe.each(gpioIds)("Arduino %s floating fallback", (pinId) => {
  it("marks an undriven GPIO and its outgoing wire floating without driving the load", () => {
    const { components, wire, wires } = circuit(pinId)
    const { pinSignals } = resolveSignals(components, prepareCircuit(components, wires))
    expect(pinSignals.get(`arduino:${pinId}`)).toBe(Signal.FLOATING)
    expect(pinSignals.get("led:anode")).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("led:cathode")).toBe(Signal.LOW)
    const state = getWireLogicalState(wire, pinSignals)
    expect(state.signal).toBe(Signal.FLOATING)
    expect(getWireStrokeColor(state)).toBe("#a855f7")
    expect(getWireStateClassName(state)).toBe("wires-layer__wire--floating")
    expect(getWireLogicalState(wire, new Map()).signal).toBeNull()
  })

  it.each([Signal.HIGH, Signal.LOW])("preserves firmware %s and propagates it to the load and wire", (signal) => {
    const { components, wire, wires } = circuit(pinId)
    const external = new Map([[`arduino:${pinId}`, signal]])
    const { pinSignals } = resolveSignals(components, prepareCircuit(components, wires), external)
    expect(pinSignals.get(`arduino:${pinId}`)).toBe(signal)
    expect(pinSignals.get("led:anode")).toBe(signal)
    expect(getWireLogicalState(wire, pinSignals).signal).toBe(signal)
    expect(getWireStateClassName({ signal })).not.toBe("wires-layer__wire--floating")
    for (const otherPin of gpioIds.filter((id) => id !== pinId)) {
      expect(pinSignals.get(`arduino:${otherPin}`)).toBe(Signal.FLOATING)
    }
    expect([...external]).toEqual([[`arduino:${pinId}`, signal]])
  })

  it("preserves UNKNOWN on a conflicting source net and its wire", () => {
    const { components, wire, wires } = circuit(pinId)
    wires.push(
      { fromUid: "power", fromPin: "5V", toUid: "arduino", toPin: pinId },
      { fromUid: "power", fromPin: "GND", toUid: "arduino", toPin: pinId },
    )
    const { pinSignals } = resolveSignals(components, prepareCircuit(components, wires),
      new Map([[`arduino:${pinId}`, Signal.HIGH]]))
    expect(pinSignals.get(`arduino:${pinId}`)).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("led:anode")).toBe(Signal.UNKNOWN)
    expect(getWireLogicalState(wire, pinSignals).signal).toBe(Signal.UNKNOWN)
  })
})

it("does not invent Arduino supply signals or alter an unrelated component", () => {
  const components = [
    { uid: "arduino", type: "ARDUINO", x: 0, y: 0 },
    { uid: "led", type: "LED", x: 200, y: 0 },
  ]
  const { pinSignals } = resolveSignals(components, prepareCircuit(components, []))
  for (const key of ["arduino:5V", "arduino:GND", "led:anode", "led:cathode"]) {
    expect(pinSignals.get(key)).toBe(Signal.UNKNOWN)
  }
  expect(pinSignals.size).toBe(18)
})
