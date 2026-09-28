/**
 * A11-ANALOG-PREQ2 — conduction selected from numeric analog facts.
 * Entries declare { inputPins, referencePin, contribute }. The pure
 * contribute({ inputVoltages, params }) receives { [inputPin]: volts } (finite,
 * >= 0, relative to referencePin, same observation rule as the controlled DC
 * domains of dcVoltageDomainRegistry) and returns own-pin conducting pairs
 * [[pinA, pinB], ...]; [] means high-Z. It never returns a voltage or Signal:
 * a selected pair is ideal derived conduction, and the resulting voltage
 * emerges from the existing DC domain resolution. The resolver calls it only
 * when EVERY input shares the resolved referencePin domain, never from HIGH/LOW.
 * The digital own-pin-signal contract stays in conditionalConductionRegistry.
 *
 * A11-ANALOG-PREQ2-CORR-001 — optional digitalProjectionPins: [pinId, ...].
 * After electrical convergence only, the physical net of each listed pin takes
 * the Signal projected from its final DC fact (voltage > 0 → HIGH, 0 → LOW,
 * conflict null → UNKNOWN; no fact → historical signal kept). Pins not listed
 * are never projected. The projection never feeds back into this step.
 */
const contributions = new Map()

export function getAnalogConditionalConduction(type) {
  return contributions.get(type) ?? null
}

export function hasAnalogConditionalConduction(type) {
  return contributions.has(type)
}
