import { Signal } from "./signals.js"

// Derived signal connectivity only; DC current calculation remains in its registry.
export function createConditionalConduction({ controlPinId, activeControlSignal, terminalAPinId, terminalBPinId }) {
  return (pins) => pins[controlPinId] === activeControlSignal
    ? [[terminalAPinId, terminalBPinId]]
    : []
}

const contributions = new Map([
  ["NPN_TRANSISTOR", createConditionalConduction({ controlPinId: "base", activeControlSignal: Signal.HIGH, terminalAPinId: "collector", terminalBPinId: "emitter" })],
  ["PNP_TRANSISTOR", createConditionalConduction({ controlPinId: "base", activeControlSignal: Signal.LOW, terminalAPinId: "collector", terminalBPinId: "emitter" })],
  ["NMOS", createConditionalConduction({ controlPinId: "gate", activeControlSignal: Signal.HIGH, terminalAPinId: "drain", terminalBPinId: "source" })],
  ["PMOS", createConditionalConduction({ controlPinId: "gate", activeControlSignal: Signal.LOW, terminalAPinId: "drain", terminalBPinId: "source" })],
])

/** Returns a pure own-pin signals -> conducting pairs contributor, or null. */
export function getConditionalConduction(type) {
  return contributions.get(type) ?? null
}
