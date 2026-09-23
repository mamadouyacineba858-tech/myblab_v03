/**
 * useCircuitStateTimedRuntime.test.jsx
 * A9-SEQ-PREQ2 — Application runtime persistence gate.
 *
 * Real application path only: CircuitProvider -> useCircuitState ->
 * runSimulationWithRuntime -> HC_SR04 (the production timed producer, used
 * as oracle) with the hook-owned runtime session. The integration module is
 * wrapped by a pass-through spy so the tests can observe the options the
 * hook really sends (runtime session, dt); no simulation function is called
 * directly and no test-only API is added to the hook.
 *
 * requestAnimationFrame is replaced by a manual queue: each `frame()` runs the
 * callbacks registered by the hook exactly once, with a meaningless browser
 * timestamp that must never reach simulated time.
 */

// Requis par le transform JSX de ce projet (même convention que les autres
// tests .jsx du dépôt).
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { useCircuitInteraction } from "../../context/useCircuitInteraction.js"
import { runSimulationWithRuntime } from "../../simulator/simulationRuntimeIntegration.js"
import { createScheduler } from "../../simulator/scheduler.js"
import { Signal } from "../../simulator/signals.js"
import { PALETTE_ITEMS } from "../../config/componentDefinitions.js"

vi.mock("../../simulator/simulationRuntimeIntegration.js", async (original) => {
  const actual = await original()
  return { ...actual, runSimulationWithRuntime: vi.fn(actual.runSimulationWithRuntime) }
})
vi.mock("../../simulator/scheduler.js", async (original) => {
  const actual = await original()
  return { ...actual, createScheduler: vi.fn(actual.createScheduler) }
})

const { HIGH, LOW } = Signal
const dir = path.dirname(fileURLToPath(import.meta.url))
const read = (...parts) => readFileSync(path.join(dir, ...parts), "utf8")
const STEP = 16
const PULSE_MS = 100 * 0.058 // HC_SR04 default distanceCm = 100

let rafQueue = []
let cancelled = []
beforeEach(() => {
  rafQueue = []
  cancelled = []
  let id = 0
  vi.stubGlobal("requestAnimationFrame", (cb) => { rafQueue.push({ id: ++id, cb }); return id })
  vi.stubGlobal("cancelAnimationFrame", (handle) => { cancelled.push(handle) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

/** Run the currently registered RAF callbacks once, with a bogus browser timestamp. */
function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = rafQueue
    rafQueue = []
    act(() => { for (const { cb } of pending) cb(123456.789 * (i + 1)) })
  }
}

const lastOptions = () => runSimulationWithRuntime.mock.calls.at(-1)[2]
const session = () => lastOptions().runtimeSession

function mount() {
  const orchestrators = new Map()
  const wrapper = ({ children }) => <CircuitProvider orchestrators={orchestrators}>{children}</CircuitProvider>
  const hook = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
  return { ...hook, orchestrators }
}

function add(result, type, x = 0, y = 0) {
  const before = new Set(result.current.components.map((c) => c.uid))
  act(() => result.current.addComponent(type, x, y))
  return result.current.components.find((c) => !before.has(c.uid)).uid
}

/** POWER + one HC_SR04 per requested uid slot, TRIG held HIGH (one edge, then no retrigger). */
function buildSonar(result, count = 1) {
  const power = add(result, "POWER", 0, 0)
  const sonars = []
  for (let i = 0; i < count; i++) {
    const hc = add(result, "HC_SR04", 200 + 200 * i, 0)
    act(() => {
      result.current.addWire(power, "5V", hc, "VCC")
      result.current.addWire(power, "GND", hc, "GND")
      result.current.addWire(power, "5V", hc, "TRIG")
    })
    sonars.push(hc)
  }
  return { power, sonars }
}

const echo = (result, uid) => result.current.pinSignals.get(`${uid}:ECHO`)

describe("A9-SEQ-PREQ2 — persistent runtime through the real hook path (HC_SR04 oracle)", () => {
  it("T1-T4: one stable session/Scheduler across solves; HC_SR04 state persists and its pulse ends in simulated time", () => {
    const { result } = mount()
    const { sonars: [hc] } = buildSonar(result)
    act(() => result.current.startSimulation())

    const first = session()
    expect(echo(result, hc)).toBe(HIGH) // edge observed at t = 0
    expect(first.scheduler.getCurrentTime()).toBe(0)
    expect(first.timedDigitalStates.get(hc)).toMatchObject({ phase: "MEASURING" })
    expect(first.timedDigitalStates.get(hc).echoEndMs).toBeCloseTo(PULSE_MS, 9)

    frame()
    expect(echo(result, hc)).toBe(LOW) // 16 ms > 5.8 ms: pulse over, no retrigger while TRIG stays HIGH
    frame(3)
    expect(echo(result, hc)).toBe(LOW)
    expect(first.timedDigitalStates.get(hc)).toMatchObject({ phase: "IDLE", previousTrig: HIGH })
    expect(first.timedDigitalStates.get(hc).echoEndMs).toBeCloseTo(PULSE_MS, 9)

    const sessions = new Set(runSimulationWithRuntime.mock.calls.filter(([, , o]) => o.runtimeSession).map(([, , o]) => o.runtimeSession))
    expect(sessions.size).toBe(1)
    expect(session().scheduler).toBe(first.scheduler)
    expect(first.scheduler.getCurrentTime()).toBe(4 * STEP)
  })

  it("T5/T24/T25: RAF only triggers fixed steps — browser timestamps never reach simulated time", () => {
    const { result } = mount()
    buildSonar(result)
    act(() => result.current.startSimulation())
    const callsBefore = runSimulationWithRuntime.mock.calls.length
    frame(5)
    const dts = runSimulationWithRuntime.mock.calls.slice(callsBefore).map(([, , o]) => o.dt)
    expect(dts).toEqual([STEP, STEP, STEP, STEP, STEP])
    expect(session().scheduler.getCurrentTime()).toBe(5 * STEP)
    const source = read("..", "useCircuitState.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
    expect(source).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval/)
  })

  it("T24: a circuit without runtime or timed producer registers no RAF loop and keeps no Scheduler", () => {
    const { result } = mount()
    const power = add(result, "POWER", 0, 0)
    const led = add(result, "LED", 200, 0)
    act(() => {
      result.current.addWire(power, "5V", led, "anode")
      result.current.addWire(power, "GND", led, "cathode")
    })
    act(() => result.current.startSimulation())
    expect(rafQueue).toHaveLength(0)
    expect(session().scheduler).toBeNull()
    expect(createScheduler).not.toHaveBeenCalled()
  })
})

describe("A9-SEQ-PREQ2 — single time authority with Arduino", () => {
  it("T6/T7: Arduino GPIO -> HC_SR04 TRIG, Arduino runtime and timed producer share the session Scheduler; deleting Arduino keeps time monotonic", () => {
    const { result, orchestrators } = mount()
    const power = add(result, "POWER", 0, 0)
    const ard = add(result, "ARDUINO", 0, 200)
    const hc = add(result, "HC_SR04", 300, 0)
    act(() => {
      result.current.addWire(power, "5V", hc, "VCC")
      result.current.addWire(power, "GND", hc, "GND")
      result.current.addWire(ard, "D2", hc, "TRIG")
    })
    act(() => result.current.startSimulation())
    const runtime = orchestrators.get(ard).getRuntime()
    runtime.digitalWrite("D2", LOW)
    frame()
    expect(echo(result, hc)).toBe(LOW)
    runtime.digitalWrite("D2", HIGH)
    frame()
    expect(echo(result, hc)).toBe(HIGH) // the Runtime authority is sampled by the timed producer
    const t = session().scheduler.getCurrentTime()
    expect(session().timedDigitalStates.get(hc).echoEndMs).toBeCloseTo(t + PULSE_MS, 9)
    frame()
    expect(echo(result, hc)).toBe(LOW)

    expect(orchestrators.size).toBe(1)
    expect(orchestrators.get(ard).getScheduler()).toBe(session().scheduler)
    expect(createScheduler).toHaveBeenCalledTimes(1)

    const scheduler = session().scheduler
    const before = scheduler.getCurrentTime()
    act(() => result.current.deleteComponent(ard))
    frame(2)
    expect(orchestrators.size).toBe(0)
    expect(session().scheduler).toBe(scheduler)
    expect(scheduler.getCurrentTime()).toBe(before + 2 * STEP)
    expect(createScheduler).toHaveBeenCalledTimes(1)
  })
})

describe("A9-SEQ-PREQ2 — lifecycle boundaries", () => {
  function running() {
    const m = mount()
    const { sonars } = buildSonar(m.result, 2)
    act(() => m.result.current.startSimulation())
    frame(2)
    return { ...m, sonars, s: session() }
  }

  it("T8/T9: stop empties the runtime; restart begins a fresh runtime (new time origin, new pulse)", () => {
    const { result, sonars: [hc], s } = running()
    const oldScheduler = s.scheduler
    expect(s.timedDigitalStates.size).toBe(2)
    act(() => result.current.stopSimulation())
    expect(s.timedDigitalStates.size).toBe(0)
    expect(s.electricalTransientStates.size).toBe(0)
    expect(s.scheduler).toBeNull()
    expect(result.current.pinSignals.size).toBe(0)

    act(() => result.current.startSimulation())
    expect(session()).toBe(s) // same container, new runtime inside it
    expect(s.scheduler).not.toBe(oldScheduler)
    expect(s.scheduler.getCurrentTime()).toBe(0)
    expect(echo(result, hc)).toBe(HIGH)
    expect(s.timedDigitalStates.get(hc).echoEndMs).toBeCloseTo(PULSE_MS, 9)
  })

  it("T10: clearCircuit leaves no timed state of the previous circuit", () => {
    const { result, s } = running()
    act(() => result.current.clearCircuit())
    expect(s.timedDigitalStates.size).toBe(0)
    expect(s.scheduler).toBeNull()
  })

  it("T11: importCircuit leaves no timed state of the previous circuit (imported sonar starts a fresh pulse)", () => {
    const { result, sonars: [hc], s } = running()
    const exported = JSON.parse(JSON.stringify(result.current.exportCircuit()))
    expect(s.timedDigitalStates.get(hc)).toMatchObject({ phase: "IDLE" })
    act(() => result.current.importCircuit(exported))
    expect(session()).toBe(s)
    expect(s.scheduler.getCurrentTime()).toBe(0)
    expect(s.timedDigitalStates.get(hc)).toMatchObject({ phase: "MEASURING" })
    expect(echo(result, hc)).toBe(HIGH)
  })

  it("T12/T13/T14: deletion purges only that uid; the other survives; undo recreation starts clean", () => {
    const { result, sonars: [hc1, hc2], s } = running()
    const survivor = { ...s.timedDigitalStates.get(hc2) }
    act(() => result.current.toggleSelection({ type: "component", id: hc1 }))
    act(() => result.current.deleteSelection())
    expect(result.current.components.some((c) => c.uid === hc1)).toBe(false)
    expect(s.timedDigitalStates.has(hc1)).toBe(false)
    expect(s.timedDigitalStates.get(hc2)).toEqual(survivor)

    frame()
    const now = s.scheduler.getCurrentTime()
    act(() => result.current.undo())
    expect(result.current.components.some((c) => c.uid === hc1)).toBe(true)
    expect(s.timedDigitalStates.get(hc1)).toMatchObject({ phase: "MEASURING" })
    expect(s.timedDigitalStates.get(hc1).echoEndMs).toBeCloseTo(now + PULSE_MS, 9)
    expect(echo(result, hc1)).toBe(HIGH)
    expect(s.timedDigitalStates.get(hc2)).toMatchObject({ phase: "IDLE" })
  })

  it("T15: unmount stops the runtime, cancels the loop and empties the session", () => {
    const { unmount, s, orchestrators } = running()
    const pending = rafQueue.map((r) => r.id)
    unmount()
    expect(s.timedDigitalStates.size).toBe(0)
    expect(s.scheduler).toBeNull()
    expect(orchestrators.size).toBe(0)
    expect(cancelled).toEqual(expect.arrayContaining(pending))
  })
})

describe("A9-SEQ-PREQ2 — Document / History / Context isolation", () => {
  it("T16/T17/T18: runtime never reaches export, import payload, components or History", () => {
    const { result } = mount()
    buildSonar(result)
    const before = JSON.stringify(result.current.exportCircuit())
    const undoCount = result.current.getUndoCount()
    act(() => result.current.startSimulation())
    frame(3)
    const after = result.current.exportCircuit()
    expect(JSON.stringify(after)).toBe(before)
    for (const token of ["timedDigitalStates", "electricalTransientStates", "scheduler", "runtimeSession", "echoEndMs", "MEASURING", "IDLE"]) {
      expect(JSON.stringify(after)).not.toContain(token)
    }
    for (const c of result.current.components) {
      expect(c).not.toHaveProperty("state")
      expect(JSON.stringify(c.parameters ?? {})).not.toMatch(/phase|echoEndMs|previousTrig/)
    }
    expect(result.current.getUndoCount()).toBe(undoCount)
  })

  it("T23: the runtime session is not exposed through the Context", () => {
    const { result } = mount()
    for (const key of ["runtimeSession", "timedDigitalStates", "electricalTransientStates", "scheduler"]) {
      expect(result.current).not.toHaveProperty(key)
    }
    const context = read("..", "..", "context", "CircuitContext.jsx")
    expect(context).not.toMatch(/runtimeSession|timedDigitalStates|electricalTransientStates|[sS]cheduler/)
  })

  it("T19/T20: no type-specific timed/sequential knowledge in the hook, no sequential production type", () => {
    const source = read("..", "useCircuitState.js")
    expect(source).not.toMatch(/HC_SR04|FLIP_?FLOP|SR_LATCH|JK_|\bCOUNTER\b/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']|createScheduler\s*\(/)
    for (const type of ["D_FLIP_FLOP", "JK_FLIP_FLOP", "SR_LATCH", "COUNTER"]) expect(PALETTE_ITEMS).not.toContain(type)
  })
})
