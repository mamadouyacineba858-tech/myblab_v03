import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { projectWs2812bV6 } from "../ws2812bV6Projection.js"
import { getVisualState, hasVisualStateResolver } from "../visualStateRegistry.js"
import "../defaultVisualStateRegistrations.js"
import { recordDigitalTransitions } from "../../simulator/digitalTransitions.js"
import {
  SIMULATION_STEP_MS,
  createSimulationRuntimeSession,
  runSimulationWithRuntime,
  snapshotRuntimeComponentStates,
} from "../../simulator/simulationRuntimeIntegration.js"
import { Signal } from "../../simulator/signals.js"

/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — P33/P34 : la Presentation projette la
 * couleur latchée (runtime événementiel, lecture seule) ; aucun protocole dans
 * la projection ni dans le renderer.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const byteBits = (byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)

function litSession() {
  const components = [
    { uid: "p", type: "POWER", x: 0, y: 0 },
    { uid: "src", type: "PNP_TRANSISTOR", x: 0, y: 0 },
    { uid: "px", type: "WS2812B_V6", x: 0, y: 0 },
  ]
  const wires = [
    { fromUid: "p", fromPin: "5V", toUid: "px", toPin: "VDD" },
    { fromUid: "p", fromPin: "GND", toUid: "px", toPin: "VSS" },
    { fromUid: "src", fromPin: "emitter", toUid: "px", toPin: "DIN" },
  ]
  const session = createSimulationRuntimeSession()
  const transitions = []
  let t = 1_000_000
  for (const bit of [...byteBits(0x12), ...byteBits(0x34), ...byteBits(0x56)]) {
    transitions.push({ pinId: "emitter", timeMs: t / 1e6, signal: Signal.HIGH })
    transitions.push({ pinId: "emitter", timeMs: (t + (bit ? 800 : 300)) / 1e6, signal: Signal.LOW })
    t += bit ? 1400 : 1250
  }
  recordDigitalTransitions(session.digitalTransitions, "src", transitions)
  runSimulationWithRuntime(components, wires, { dt: SIMULATION_STEP_MS, runtimeSession: session })
  runSimulationWithRuntime(components, wires, { dt: SIMULATION_STEP_MS, runtimeSession: session })
  return session
}

describe("A12-FUNC — Visual State WS2812B_V6", () => {
  it("projection pure : couleur latchée -> r/g/b ; sans couleur -> éteint", () => {
    expect(projectWs2812bV6({ color: { r: 1, g: 2, b: 3 } })).toEqual({ r: 1, g: 2, b: 3, latched: true })
    expect(projectWs2812bV6({ color: null })).toEqual({ r: 0, g: 0, b: 0, latched: false })
    expect(projectWs2812bV6(undefined)).toEqual({ r: 0, g: 0, b: 0, latched: false })
  })

  it("P33 — runtime -> snapshot lecture seule -> Visual State Registry : r/g/b latchés (GRB décodé en amont)", () => {
    const session = litSession()
    const snapshot = snapshotRuntimeComponentStates(session, ["p", "src", "px"])
    expect(hasVisualStateResolver("WS2812B_V6")).toBe(true)
    expect(getVisualState("WS2812B_V6", { uid: "px", pinSignals: new Map(), runtimeState: snapshot.get("px") }))
      .toEqual({ r: 0x34, g: 0x12, b: 0x56, latched: true })
    expect(Object.isFrozen(snapshot.get("px"))).toBe(true)
    expect(snapshot).not.toBe(session.digitalEventStates)
  })

  it("snapshotRuntimeComponentStates : limité aux uid vivants ; collision timed/événementiel explicite", () => {
    const session = litSession()
    expect([...snapshotRuntimeComponentStates(session, ["p"]).keys()]).toEqual([])
    expect([...snapshotRuntimeComponentStates(session).keys()]).toEqual(["px"])
    session.timedDigitalStates.set("px", {})
    expect(() => snapshotRuntimeComponentStates(session)).toThrow(/both a timed and an event runtime state/)
  })

  it("P34 — ni la projection ni le renderer ne contiennent de logique protocolaire ou électrique", () => {
    for (const path of ["../ws2812bV6Projection.js", "../../components/parts/Ws2812bV6Part.jsx"]) {
      const code = readFileSync(resolve(__dirname, path), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
      expect(code, path).not.toMatch(/\bDIN\b|\bDOUT\b|T0H|T1H|reset|latchAndReset|timeMs|transition|decode|pinSignals|Signal\./i)
    }
  })
})
