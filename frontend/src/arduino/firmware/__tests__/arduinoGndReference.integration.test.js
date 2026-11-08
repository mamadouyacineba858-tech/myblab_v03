import { describe, it, expect } from "vitest"
import { runSimulationWithRuntime, SIMULATION_STEP_MS } from "../../../simulator/simulationRuntimeIntegration.js"
import { getLedState } from "../../../simulator/production.js"

const BLINK = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  delay(500);\n  digitalWrite(2, LOW);\n  delay(500);\n}\n"

function run(components, wires) {
  const orchestrators = new Map()
  const firmwareSessions = new Map()
  const step = (dt = SIMULATION_STEP_MS) => runSimulationWithRuntime(components, wires, { orchestrators, firmwareSessions, dt })
  return step
}

describe("TINKERCAD-004 — Arduino GND is a ground reference", () => {
  const components = [
    { uid: "arduino1", type: "ARDUINO", x: 0, y: 0, firmware: { source: BLINK } },
    { uid: "resistor1", type: "RESISTOR", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 0, y: 0 },
  ]
  const wires = [
    { fromUid: "arduino1", fromPin: "D2", toUid: "resistor1", toPin: "A" },
    { fromUid: "resistor1", fromPin: "B", toUid: "led1", toPin: "anode" },
    { fromUid: "led1", fromPin: "cathode", toUid: "arduino1", toPin: "GND" },
  ]

  it("D2 -> R -> LED -> Arduino GND lights the LED then blinks, with no external supply", () => {
    const step = run(components, wires)
    expect(getLedState("led1", step(0)).on).toBe(true)
    let signals
    for (let i = 0; i < 32; i++) signals = step()
    expect(getLedState("led1", signals).on).toBe(false)
    for (let i = 0; i < 32; i++) signals = step()
    expect(getLedState("led1", signals).on).toBe(true)
  })

  it("an LED without any ground reference stays off", () => {
    const step = run(components, wires.slice(0, 2))
    expect(getLedState("led1", step(0)).on).toBe(false)
  })
})
