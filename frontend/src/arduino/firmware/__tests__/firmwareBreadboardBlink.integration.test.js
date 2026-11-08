import { describe, it, expect } from "vitest"
import { deriveBreadboardVirtualWires } from "../../../utils/breadboardConnectivity.js"
import { runSimulationWithRuntime, SIMULATION_STEP_MS } from "../../../simulator/simulationRuntimeIntegration.js"
import { getLedState } from "../../../simulator/production.js"

// A15: exercise the actual electrical bridge across breadboard holes, not a
// direct resistor-to-LED wire. Physical pin offsets are fixed by the current
// component definitions and shared with breadboardWireConnectivity.test.js.
const firmware = `void setup() { pinMode(2, OUTPUT); }
void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
}`
const board = { id: "bb-blink", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }
const coreComponents = [
  { id: "r1", type: "RESISTOR", position: { x: 0, y: 22 } },
  // LED anode dx=28,dy=62 -> x=84,y=48 (row 4); resistor B is x=84,y=36 (row 3): separate holes, same strip
  { id: "led1", type: "LED", position: { x: 56, y: -14 } },
]
const electricalComponents = [
  { uid: "arduino1", type: "ARDUINO", x: -200, y: 0, firmware: { source: firmware } },
  { uid: "r1", type: "RESISTOR", x: 0, y: 22 },
  { uid: "led1", type: "LED", x: 56, y: -14 },
  { uid: "power1", type: "POWER", x: -200, y: 100 },
]
const directWires = [
  { fromUid: "arduino1", fromPin: "D2", toUid: "r1", toPin: "A" },
  { fromUid: "led1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
]
describe("A15 Arduino Blink through physical breadboard contact", () => {
  it("connects resistor B to LED anode through shared breadboard group", () => {
    const virtual = deriveBreadboardVirtualWires({ breadboards: [board], components: coreComponents, wires: [] })
    expect(virtual.some(w =>
      (w.pinA.componentId === "r1" && w.pinA.pinId === "B" && w.pinB.componentId === "led1" && w.pinB.pinId === "anode") ||
      (w.pinB.componentId === "r1" && w.pinB.pinId === "B" && w.pinA.componentId === "led1" && w.pinA.pinId === "anode")
    )).toBe(true)
  })
  it("propagates Blink HIGH/LOW/HIGH to LED via breadboard virtual wires", () => {
    const virtual = deriveBreadboardVirtualWires({ breadboards: [board], components: coreComponents, wires: [] })
    const wires = [...directWires, ...virtual.map(w => ({
      fromUid: w.pinA.componentId, fromPin: w.pinA.pinId,
      toUid: w.pinB.componentId, toPin: w.pinB.pinId,
    }))]
    const orchestrators = new Map()
    const firmwareSessions = new Map()
    const step = (dt = SIMULATION_STEP_MS) => runSimulationWithRuntime(electricalComponents, wires, { orchestrators, firmwareSessions, dt })
    expect(getLedState("led1", step(0)).on).toBe(true)
    let signals
    for (let i = 0; i < 32; i++) signals = step()
    expect(getLedState("led1", signals).on).toBe(false)
    for (let i = 0; i < 32; i++) signals = step()
    expect(getLedState("led1", signals).on).toBe(true)
  })
})
