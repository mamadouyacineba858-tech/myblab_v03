import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { createDigitalContributionRegistry, getAllDigitalContributionTypes } from "../digitalContributionRegistry.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { computeCombinationalDigitalSignals, runSimulationStep } from "../simulationRuntimeIntegration.js"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals, resolveSourceDrivenPinSignals } from "../resolution.js"
import { createScheduler } from "../scheduler.js"
import { createRuntimeOrchestrator } from "../runtimeOrchestrator.js"
import { runSimulation } from "../engine.js"
import { Signal } from "../signals.js"

vi.mock("../resolution.js", async (original) => {
  const actual = await original()
  return { ...actual, resolveSignals: vi.fn(actual.resolveSignals) }
})
vi.mock("../scheduler.js", async (original) => {
  const actual = await original()
  return { ...actual, createScheduler: vi.fn(actual.createScheduler) }
})
afterEach(() => vi.clearAllMocks())

const comp = (uid, type = "LDR") => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
// Existing canonical A/B pins, isolated fixture behavior; no catalogue additions.
const follow = ({ pinSignals }) => [Signal.HIGH, Signal.LOW].includes(pinSignals.A)
  ? new Map([["B", pinSignals.A]]) : null
const registry = (contribute = follow) => createDigitalContributionRegistry({ contributions: new Map([["LDR", contribute]]) })
function chain(depth) {
  const components = [comp("power", "POWER"), ...Array.from({ length: depth }, (_, i) => comp(`g${i}`))]
  const wires = [wire("power", "5V", "g0", "A"), ...Array.from({ length: depth - 1 }, (_, i) => wire(`g${i}`, "B", `g${i + 1}`, "A"))]
  return { components, wires }
}
const step = (components, wires, options = {}) => runSimulationStep(components, wires, { digitalContributionRegistry: registry(), ...options }).pinSignals

describe("A9-LOGIC-PREQ — stateless propagation", () => {
  it.each([1, 2, 4, 64])("T1-T3/T12: source-driven cascade of %i levels settles in one step", (depth) => {
    const { components, wires } = chain(depth)
    const result = step(components, wires)
    for (let i = 0; i < depth; i++) expect(result.get(`g${i}:B`)).toBe(Signal.HIGH)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    expect(createScheduler).not.toHaveBeenCalled()
  })

  it("T4: component and wire order do not change the result", () => {
    const { components, wires } = chain(12)
    const expected = [...step(components, wires)].sort()
    for (const order of [[...components].reverse(), [...components.slice(5), ...components.slice(0, 5)]]) {
      expect([...step(order, [...wires].reverse())].sort()).toEqual(expected)
    }
  })

  it("T5: fan-out propagates to independent consumers", () => {
    const { components, wires } = chain(2)
    components.push(comp("branch"))
    wires.push(wire("g0", "B", "branch", "A"))
    const result = step(components, wires)
    expect(result.get("g1:B")).toBe(Signal.HIGH)
    expect(result.get("branch:B")).toBe(Signal.HIGH)
  })

  it.each([Signal.UNKNOWN, Signal.FLOATING])("T6/T7: %s input cannot invent a determined output", (signal) => {
    const components = [comp("g0"), comp("g1")]
    const prepared = prepareCircuit(components, [wire("g0", "B", "g1", "A")])
    const seen = []
    const fixture = registry((ctx) => { seen.push(ctx.pinSignals.A); return follow(ctx) })
    const output = computeCombinationalDigitalSignals(components, prepared, fixture, new Map([["g0:A", signal]]))
    expect(output.size).toBe(0)
    expect(seen).toContain(signal)
  })

  it("T8: disconnected chain has no phantom propagation", () => {
    const { components, wires } = chain(4)
    const result = step(components, wires.filter(w => w.fromUid !== "g1"))
    expect(result.get("g1:B")).toBe(Signal.HIGH)
    expect(result.get("g2:B")).toBe(Signal.UNKNOWN)
    expect(result.get("g3:B")).toBe(Signal.UNKNOWN)
  })

  it("T9: oscillation drops every provisional output, preserves base authorities and is order independent", () => {
    const components = [comp("power", "POWER"), comp("loop"), comp("tail")]
    const wires = [wire("loop", "B", "loop", "A"), wire("loop", "B", "tail", "A")]
    const contribute = vi.fn((ctx) => ctx.component.uid === "loop"
      ? new Map([["B", ctx.pinSignals.A === Signal.HIGH ? Signal.LOW : Signal.HIGH]]) : follow(ctx))
    const fixture = registry(contribute)
    for (const order of [components, [...components].reverse()]) {
      contribute.mockClear()
      const prepared = prepareCircuit(order, wires)
      const output = computeCombinationalDigitalSignals(order, prepared, fixture)
      expect(output.size).toBe(0)
      expect(contribute.mock.calls.length).toBeLessThanOrEqual(2 * (prepared.allKeys.length + 1))
      const result = step(order, wires, { digitalContributionRegistry: fixture })
      expect(result.get("loop:B")).toBe(Signal.UNKNOWN)
      expect(result.get("tail:B")).toBe(Signal.UNKNOWN)
      expect(result.get("power:5V")).toBe(Signal.HIGH)
      expect(result.get("power:GND")).toBe(Signal.LOW)
    }
  })

  it("T9: size bound refuses a long cycle even before its first repeated state", () => {
    const components = [comp("counterFixture", "TMP36")]
    const prepared = prepareCircuit(components, [])
    const pins = ["plus", "vout", "gnd"]
    const contribute = vi.fn(({ pinSignals }) => {
      const value = pins.reduce((n, pin, i) => n + (pinSignals[pin] === Signal.HIGH ? 2 ** i : 0), 0)
      return new Map(pins.map((pin, i) => [pin, ((value + 1) & (1 << i)) ? Signal.HIGH : Signal.LOW]))
    })
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", contribute]]) })
    expect(computeCombinationalDigitalSignals(components, prepared, fixture).size).toBe(0)
    expect(contribute).toHaveBeenCalledTimes(prepared.allKeys.length + 1)
  })

  it("T10: stable feedback retains its settled output", () => {
    const components = [comp("loop")]
    const wires = [wire("loop", "B", "loop", "A")]
    const fixture = registry(({ pinSignals }) => new Map([["B", pinSignals.A === Signal.HIGH ? Signal.HIGH : Signal.LOW]]))
    expect(step(components, wires, { digitalContributionRegistry: fixture }).get("loop:B")).toBe(Signal.LOW)
  })

  it.each([Signal.HIGH, Signal.LOW])("T11: independent producers on one pin throw, including equal levels (%s)", (signal) => {
    const components = [comp("g")]
    const prepared = prepareCircuit(components, [])
    expect(() => computeCombinationalDigitalSignals(components, prepared,
      registry(() => new Map([["B", signal]])), new Map([["g:B", Signal.HIGH]]))).toThrow(/more than one independent signal source/)
  })

  it("T11: distinct pins on one net preserve the explicit historical propagation policy", () => {
    const components = [comp("high"), comp("low"), comp("sink", "LED")]
    const wires = [wire("high", "B", "low", "B"), wire("low", "B", "sink", "anode")]
    const levels = new Map([["high:B", Signal.HIGH], ["low:B", Signal.LOW]])
    const prepared = prepareCircuit(components, wires)
    const historical = resolveSignals(components, prepared, levels).pinSignals
    const fixture = registry(({ component }) => new Map([["B", levels.get(`${component.uid}:B`)]]))
    for (const order of [components, [...components].reverse()]) {
      const result = step(order, wires, { digitalContributionRegistry: fixture })
      expect([...result].sort()).toEqual([...historical].sort())
      // Existing policy preserves driven pins; HIGH propagates into UNKNOWN before LOW.
      expect(result.get("high:B")).toBe(Signal.HIGH)
      expect(result.get("low:B")).toBe(Signal.LOW)
      expect(result.get("sink:anode")).toBe(Signal.HIGH)
    }
  })

  it("T13/T15: live Runtime drives the whole chain with one tick, advance and final resolution", () => {
    const { components, wires } = chain(5)
    components[0] = comp("arduino", "ARDUINO")
    wires[0] = wire("arduino", "D2", "g0", "A")
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()
    runtime.start()
    runtime.digitalWrite("D2", Signal.HIGH)
    const tick = vi.spyOn(runtime, "tick")
    const advance = vi.spyOn(orchestrator.getScheduler(), "advance")
    const options = { orchestrators: new Map([["arduino", orchestrator]]), dt: 16 }
    expect(step(components, wires, options).get("g4:B")).toBe(Signal.HIGH)
    expect(tick).toHaveBeenCalledTimes(1)
    expect(advance).toHaveBeenCalledTimes(1)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    runtime.digitalWrite("D2", Signal.LOW)
    expect(step(components, wires, options).get("g4:B")).toBe(Signal.LOW)
    expect(tick).toHaveBeenCalledTimes(2)
    expect(advance).toHaveBeenCalledTimes(2)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })

  it("T14: stateless-only never creates or advances a Scheduler and writes no runtime state", () => {
    const { components, wires } = chain(8)
    const scheduler = { advance: vi.fn(() => { throw new Error("unexpected clock") }) }
    const orchestrators = new Map(), timedDigitalStates = new Map(), electricalTransientStates = new Map()
    step(components, wires, { scheduler, orchestrators, timedDigitalStates, electricalTransientStates, dt: 100 })
    expect(createScheduler).not.toHaveBeenCalled()
    expect(scheduler.advance).not.toHaveBeenCalled()
    for (const store of [orchestrators, timedDigitalStates, electricalTransientStates]) expect(store.size).toBe(0)
  })

  it("T16: historical environmental producers retain powered outputs", () => {
    for (const [type, pin, expected] of [["SOIL_MOISTURE_SENSOR", "DO", Signal.HIGH], ["PIR_MOTION_SENSOR", "OUT", Signal.LOW], ["TILT_SENSOR", "DO", Signal.LOW], ["IR_RECEIVER", "SIGNAL", Signal.HIGH]]) {
      const components = [comp("power", "POWER"), comp("sensor", type)]
      const wires = [wire("power", "GND", "sensor", "GND")]
      if (type !== "TILT_SENSOR") wires.push(wire("power", "5V", "sensor", "VCC"))
      expect(runSimulationStep(components, wires).pinSignals.get(`sensor:${pin}`)).toBe(expected)
    }
  })

  it("T17: current HC_SR04 output drives a cascade without a second temporal evaluation", () => {
    const { components, wires } = chain(2)
    components.push(comp("ultrasonic", "HC_SR04"))
    wires[0] = wire("ultrasonic", "ECHO", "g0", "A")
    wires.push(wire("power", "5V", "ultrasonic", "VCC"), wire("power", "GND", "ultrasonic", "GND"), wire("power", "5V", "ultrasonic", "TRIG"))
    const scheduler = createScheduler()
    const advance = vi.spyOn(scheduler, "advance")
    const timedDigitalStates = new Map()
    expect(step(components, wires, { scheduler, timedDigitalStates, dt: 1 }).get("g1:B")).toBe(Signal.HIGH)
    expect(step(components, wires, { scheduler, timedDigitalStates, dt: 100 }).get("g1:B")).toBe(Signal.LOW)
    expect(advance).toHaveBeenCalledTimes(2)
    expect(timedDigitalStates.size).toBe(1)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })

  it("timed producer is evaluated once despite multiple combinational rounds", () => {
    const { components, wires } = chain(4)
    components.push(comp("timed", "TMP36"))
    wires[0] = wire("timed", "vout", "g0", "A")
    const contribute = vi.fn(() => ({ state: { observed: true }, outputs: new Map([["vout", Signal.HIGH]]) }))
    const timedDigitalContributionRegistry = createTimedDigitalContributionRegistry({ contributions: new Map([["TMP36", contribute]]) })
    expect(step(components, wires, { timedDigitalContributionRegistry }).get("g3:B")).toBe(Signal.HIGH)
    expect(contribute).toHaveBeenCalledTimes(1)
  })

  it("T18: GATE 0 preserves the historical result", () => {
    const components = [comp("power", "POWER"), comp("led", "LED")]
    const wires = [wire("power", "5V", "led", "anode"), wire("power", "GND", "led", "cathode")]
    const expected = runSimulation(components, wires)
    vi.clearAllMocks()
    expect(runSimulationStep(components, wires).pinSignals).toEqual(expected)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    expect(createScheduler).not.toHaveBeenCalled()
  })

  it("T19: topology, Document and authorities remain immutable", () => {
    const { components, wires } = chain(6)
    for (const c of components) Object.freeze(c)
    Object.freeze(components)
    const prepared = prepareCircuit(components, wires)
    const before = JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys, components, wires])
    prepared.uf.find = prepared.uf.union = () => { throw new Error("topology mutation") }
    const authorities = new Map([["g0:A", Signal.LOW]])
    const source = resolveSourceDrivenPinSignals(components, prepared)
    const output = computeCombinationalDigitalSignals(components, prepared, registry(), authorities)
    expect(output.get("g5:B")).toBe(Signal.LOW)
    expect([...authorities]).toEqual([["g0:A", Signal.LOW]])
    expect(resolveSourceDrivenPinSignals(components, prepared)).toEqual(source)
    expect(JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys, components, wires])).toBe(before)
    expect(resolveSignals).not.toHaveBeenCalled()
  })

  it("T20: production registry contains the historical producers and A9-AND, no fixture", () => {
    expect(getAllDigitalContributionTypes()).toEqual(["SOIL_MOISTURE_SENSOR", "PIR_MOTION_SENSOR", "TILT_SENSOR", "IR_RECEIVER", "AND_GATE", "OR_GATE"])
    const source = readFileSync(new URL("../simulationRuntimeIntegration.js", import.meta.url), "utf8")
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
    expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
  })

  it("retracts provisional downstream signals when an upstream output disappears", () => {
    const components = [comp("source"), comp("provisional"), comp("tail")]
    const wires = [wire("source", "B", "provisional", "A"), wire("provisional", "B", "tail", "A")]
    const fixture = registry((ctx) => {
      if (ctx.component.uid === "source") return new Map([["B", Signal.HIGH]])
      if (ctx.component.uid === "provisional") return ctx.pinSignals.A === Signal.UNKNOWN ? new Map([["B", Signal.HIGH]]) : null
      return follow(ctx)
    })
    const result = step(components, wires, { digitalContributionRegistry: fixture })
    expect(result.get("source:B")).toBe(Signal.HIGH)
    expect(result.get("provisional:B")).toBe(Signal.UNKNOWN)
    expect(result.get("tail:B")).toBe(Signal.UNKNOWN)
  })
})
