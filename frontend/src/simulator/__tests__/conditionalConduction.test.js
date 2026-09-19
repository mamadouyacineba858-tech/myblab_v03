import { it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { getConditionalConduction } from "../conditionalConductionRegistry.js"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals, propagatePassiveConduction } from "../resolution.js"
import { Signal } from "../signals.js"
const comp = (uid, type) => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
it("unregistered type has no behavior", () => expect(getConditionalConduction("UNREGISTERED")).toBeNull())
it.each([
  ["NPN_TRANSISTOR", "base", Signal.HIGH, ["collector", "emitter"]],
  ["PNP_TRANSISTOR", "base", Signal.LOW, ["collector", "emitter"]],
  ["NMOS", "gate", Signal.HIGH, ["drain", "source"]],
  ["PMOS", "gate", Signal.LOW, ["drain", "source"]],
])("%s control semantics", (type, control, active, pair) => {
  for (const signal of [Signal.HIGH, Signal.LOW, Signal.UNKNOWN, Signal.FLOATING]) {
    expect(getConditionalConduction(type)(Object.freeze({ [control]: signal }))).toEqual(signal === active ? [pair] : [])
  }
})
it.each([["NMOS", "5V"], ["PMOS", "GND"]])("%s passive chain, ordering and immutability", (type, control) => {
  const components = [comp("power", "POWER"), comp("z", type), comp("b", "RESISTOR"), comp("a", "RESISTOR"), comp("load", "LED")]
  const wires = [wire("power", "GND", "z", "source"), wire("power", control, "z", "gate"), wire("z", "drain", "b", "A"), wire("b", "B", "a", "A"), wire("a", "B", "load", "cathode"), wire("load", "anode", "power", "5V")]
  const before = JSON.stringify({ components, wires })
  let reference
  for (const order of [components, [...components].reverse(), [components[2], components[4], components[1], components[0], components[3]]]) {
    const prepared = prepareCircuit(order, wires)
    const topology = JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
    prepared.uf.find = prepared.uf.union = () => { throw new Error("mutating topology access") }
    const { pinSignals } = resolveSignals(order, prepared)
    expect(pinSignals.get("load:cathode")).toBe(Signal.LOW)
    expect(pinSignals.get("z:drain")).toBe(Signal.LOW)
    expect(JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(topology)
    const result = [...pinSignals].sort()
    if (reference) expect(result).toEqual(reference)
    reference = result
  }
  expect(JSON.stringify({ components, wires })).toBe(before)
})
it.each([Signal.LOW, Signal.UNKNOWN, Signal.FLOATING])("inactive NMOS %s", (control) => {
  const components = [comp("power", "POWER"), comp("t", "NMOS")]
  const prepared = prepareCircuit(components, [wire("power", "GND", "t", "source")])
  expect(resolveSignals(components, prepared, new Map([["t:gate", control]])).pinSignals.get("t:drain")).toBe(Signal.UNKNOWN)
})
it("control propagated by resistor activates on later round", () => {
  const components = [comp("a", "NMOS"), comp("z", "RESISTOR"), comp("power", "POWER")]
  const prepared = prepareCircuit(components, [wire("power", "5V", "z", "A"), wire("z", "B", "a", "gate"), wire("power", "GND", "a", "source")])
  expect(resolveSignals(components, prepared).pinSignals.get("a:drain")).toBe(Signal.LOW)
})
it.each([Signal.HIGH, Signal.LOW])("synthetic selectable topology %s", (control) => {
  const components = [comp("t", "ARDUINO")]
  const prepared = prepareCircuit(components, [])
  const signals = new Map(prepared.allKeys.map((key) => [key, Signal.UNKNOWN]))
  signals.set("t:D2", control)
  signals.set("t:D3", Signal.HIGH)
  const selected = control === Signal.HIGH ? "5V" : "GND"
  const other = control === Signal.HIGH ? "GND" : "5V"
  propagatePassiveConduction(components, prepared, signals, () => (pins) =>
    pins.D2 === Signal.HIGH ? [["D3", "5V"]] : [["D3", "GND"]])
  expect(signals.get(`t:${selected}`)).toBe(Signal.HIGH)
  expect(signals.get(`t:${other}`)).toBe(Signal.UNKNOWN)
})
it("retracts a transient selected path and terminates an oscillation conservatively", () => {
  const components = [comp("t", "ARDUINO")]
  const prepared = prepareCircuit(components, [])
  const topology = JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
  const signals = new Map(prepared.allKeys.map((key) => [key, Signal.UNKNOWN]))
  signals.set("t:D2", Signal.HIGH) // non-derived baseline authority
  let contributorCalls = 0

  propagatePassiveConduction(components, prepared, signals, () => (pins) => {
    contributorCalls += 1
    // First candidate derives D3=HIGH. That signal removes its own path on
    // the next candidate, producing a two-state cycle. Conservative fallback
    // must retain D2 and retract only the stale derived D3 value.
    return pins.D3 === Signal.HIGH ? [] : [["D2", "D3"]]
  })

  expect(signals.get("t:D2")).toBe(Signal.HIGH)
  expect(signals.get("t:D3")).toBe(Signal.UNKNOWN)
  expect(contributorCalls).toBeLessThanOrEqual(prepared.allKeys.length + 1)
  expect(JSON.stringify([[...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(topology)
})
it("no type-specific controlled branch", () => {
  expect(readFileSync(new URL("../resolution.js", import.meta.url), "utf8")).not.toMatch(/(?:===|!==|case)\s*["'](?:NMOS|PMOS|NPN_TRANSISTOR|PNP_TRANSISTOR|RELAY)["']/)
})
