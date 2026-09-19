import { Signal } from "./signals.js"

// Derived signal connectivity only; DC current calculation remains in its registry.
export function createConditionalConduction({ controlPinId, activeControlSignal, terminalAPinId, terminalBPinId }) {
  return (pins) => pins[controlPinId] === activeControlSignal
    ? [[terminalAPinId, terminalBPinId]]
    : []
}

/** Generic pure condition on a component's resolved own-pin signals. */
export function createPredicateConditionalConduction({ predicate, whenTrue, whenFalse = [] }) {
  return (pins) => (predicate(pins) ? whenTrue : whenFalse).map((pair) => [...pair])
}

const contributions = new Map([
  ["RELAY", createPredicateConditionalConduction({
    predicate: (pins) => (pins.coilA === Signal.HIGH && pins.coilB === Signal.LOW)
      || (pins.coilA === Signal.LOW && pins.coilB === Signal.HIGH),
    whenTrue: [["common", "normallyOpen"]],
    whenFalse: [["common", "normallyClosed"]],
  })],
  ["NPN_TRANSISTOR", createConditionalConduction({ controlPinId: "base", activeControlSignal: Signal.HIGH, terminalAPinId: "collector", terminalBPinId: "emitter" })],
  ["PNP_TRANSISTOR", createConditionalConduction({ controlPinId: "base", activeControlSignal: Signal.LOW, terminalAPinId: "collector", terminalBPinId: "emitter" })],
  ["NMOS", createConditionalConduction({ controlPinId: "gate", activeControlSignal: Signal.HIGH, terminalAPinId: "drain", terminalBPinId: "source" })],
  ["PMOS", createConditionalConduction({ controlPinId: "gate", activeControlSignal: Signal.LOW, terminalAPinId: "drain", terminalBPinId: "source" })],
])

/** Returns a pure own-pin signals -> conducting pairs contributor, or null. */
export function getConditionalConduction(type) {
  return contributions.get(type) ?? null
}
