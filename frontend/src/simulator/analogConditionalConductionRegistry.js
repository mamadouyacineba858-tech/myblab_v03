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
 *
 * A11-COMP1-CORR-001 — optional component activation and independent groups:
 * - requiredPositivePins: [pinId, ...] — the component selects no pair at all
 *   unless each listed pin is a finite fact > 0 V of the referencePin domain
 *   (powered versus unpowered/unresolved only; no operating-range model);
 * - groups: [{ inputPins, contribute }, ...] — each group is observed on its
 *   own inputPins with the rule above and contributes its own pairs, so an
 *   unresolved group never suppresses another. Without `groups`, the top-level
 *   { inputPins, contribute } is the single group (historical contract).
 */
/**
 * Independent open-collector comparator channels, active only while supplyPin is
 * powered: while V(plus) < V(minus) the channel output conducts to referencePin,
 * otherwise it is high-Z (no pair). Equality is high-Z. No voltage and no HIGH is
 * ever produced here.
 */
export function createOpenCollectorComparators({ channels, referencePin, supplyPin }) {
  return {
    referencePin,
    requiredPositivePins: [supplyPin],
    groups: channels.map(({ plus, minus, output }) => ({
      inputPins: [plus, minus],
      contribute: ({ inputVoltages }) => inputVoltages[plus] < inputVoltages[minus] ? [[output, referencePin]] : [],
    })),
    digitalProjectionPins: channels.map(({ output }) => output),
  }
}

const contributions = new Map([
  // A11-COMP1 : TI LM339NE4 quad comparator, Level-1 (no offset, hysteresis, delay or saturation model).
  ['LM339NE4', createOpenCollectorComparators({
    referencePin: 'GND',
    supplyPin: 'VCC',
    channels: [1, 2, 3, 4].map((n) => ({ plus: `${n}IN+`, minus: `${n}IN-`, output: `${n}OUT` })),
  })],
  // A11-COMP2 : TI LM393P dual comparator, same Level-1 open-collector contract (two channels).
  ['LM393P', createOpenCollectorComparators({
    referencePin: 'GND',
    supplyPin: 'VCC',
    channels: [1, 2].map((n) => ({ plus: `${n}IN+`, minus: `${n}IN-`, output: `${n}OUT` })),
  })],
])

export function getAnalogConditionalConduction(type) {
  return contributions.get(type) ?? null
}

export function hasAnalogConditionalConduction(type) {
  return contributions.has(type)
}
