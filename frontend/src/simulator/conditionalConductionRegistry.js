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

/** Generic union of several own-pin contributors: the pairs each one selects. */
export function composeConditionalConductions(...contributors) {
  return (pins) => contributors.flatMap((contribute) => contribute(pins))
}

/**
 * Enabled push-pull driver output (Level-1): while `supplyPinId` and `enablePinId`
 * are HIGH, `outputPinId` conducts to `highRailPinId` for a HIGH input and to
 * `lowRailPinId` for a LOW input. Any other condition selects no pair (high-Z).
 * Only signal connectivity is derived here; the rails keep their own DC domains.
 */
export function createEnabledPushPullConduction({ supplyPinId, enablePinId, inputPinId, outputPinId, highRailPinId, lowRailPinId }) {
  const enabled = (pins) => pins[supplyPinId] === Signal.HIGH && pins[enablePinId] === Signal.HIGH
  return composeConditionalConductions(
    createPredicateConditionalConduction({ predicate: (pins) => enabled(pins) && pins[inputPinId] === Signal.HIGH, whenTrue: [[outputPinId, highRailPinId]] }),
    createPredicateConditionalConduction({ predicate: (pins) => enabled(pins) && pins[inputPinId] === Signal.LOW, whenTrue: [[outputPinId, lowRailPinId]] }),
  )
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
  // A8-H-BRIDGE : L293D, quatre sorties push-pull ; VCC1 = logique, VCC2 = puissance.
  ["H_BRIDGE", composeConditionalConductions(
    ...[["EN12", "1A", "1Y"], ["EN12", "2A", "2Y"], ["EN34", "3A", "3Y"], ["EN34", "4A", "4Y"]].map(([enablePinId, inputPinId, outputPinId]) =>
      createEnabledPushPullConduction({ supplyPinId: "VCC1", enablePinId, inputPinId, outputPinId, highRailPinId: "VCC2", lowRailPinId: "GND" })),
  )],])

/** Returns a pure own-pin signals -> conducting pairs contributor, or null. */
export function getConditionalConduction(type) {
  return contributions.get(type) ?? null
}
