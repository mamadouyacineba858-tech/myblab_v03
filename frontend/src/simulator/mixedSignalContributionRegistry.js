/**
 * A11-COMP4-PREQ3 — Generic stateful mixed-signal step contract : Registry.
 *
 * Sibling of `timedDigitalContributionRegistry.js` (stateful digital outputs)
 * and `transientContributionRegistry.js` (stateful electrical contributions),
 * same Open/Closed principle : the only type -> behaviour knowledge lives in
 * the table of this Registry, consulted by `simulationRuntimeIntegration.js`
 * only through `hasMixedSignalContribution` / `getMixedSignalContribution`.
 *
 * A mixed-signal contributor observes, once per step, BOTH the digital and the
 * numeric pre-resolution context of its own pins, keeps a private runtime
 * state, and returns electrical/logical AUTHORITIES for the single resolution
 * of the step :
 *
 *   SAMPLE (same pre-commit snapshot for every contributor) -> COMMIT -> RESOLVE
 *
 * An entry of the Registry is a declaration :
 *
 *   {
 *     digitalOutputPins?:   string[]  // only pins effects.digitalOutputs may drive
 *     voltageOutputPins?:   string[]  // only pins effects.voltageOutputs may drive
 *     voltageReferencePin?: string    // explicit electrical reference of every
 *                                     // voltage output (required with voltageOutputPins)
 *     contribute(ctx) -> { state, effects? }
 *   }
 *
 * with ctx = { component, params, pinSignals, pinVoltages, dt, currentTimeMs, previousState } :
 *
 * - `component` : the EFFECTIVE component, never mutated.
 * - `params` : resolved effective parameters (`resolveComponentParameters`).
 * - `pinSignals` : { pinId -> Signal } of the component's canonical pins in the
 *   digital pre-resolution context of the step (DC sources + current Runtime
 *   authorities, `resolveSourceDrivenPinSignals`) ; UNKNOWN otherwise.
 * - `pinVoltages` : { pinId -> { voltage, reference } | null } of the canonical
 *   pins in the numeric pre-resolution context (`resolveSourceDrivenVoltageFacts`) :
 *   a fact is a finite voltage relative to the physical `reference` net (an
 *   opaque net identity : two pins share a reference iff their facts have the
 *   same `reference`) ; `null` = conflicting/unresolved ; a pin absent from the
 *   object has no numeric fact. A voltage is never converted to HIGH/LOW here.
 * - `dt` / `currentTimeMs` : the step duration and the time of the one shared
 *   Scheduler of the step — never a clock of the contributor.
 * - `previousState` : this uid's private runtime state committed by the
 *   previous step (undefined on the first step of a runtime session). It is
 *   read-only (frozen) : the new state is RETURNED, never written in place.
 *
 * Returned effects (all optional) :
 * - `digitalOutputs` : Map | Record<pinId, Signal.HIGH | Signal.LOW>, only on
 *   `digitalOutputPins`. Composed with the other producers of the step with the
 *   explicit collision refusal of `mergeExternalSignals` (never last-write-wins).
 * - `voltageOutputs` : Map | Record<pinId, volts | null>, only on
 *   `voltageOutputPins`, relative to `voltageReferencePin`. A finite value
 *   >= 0 is a numeric authority of the step ; `null` (or any non-finite or
 *   negative value) reserves the net as unresolved (conservative). A pin left
 *   out carries no authority (high impedance).
 * - `conductionPairs` : [[pinA, pinB], ...] of distinct canonical pins : ideal
 *   derived conduction for THIS step only (never a wire, never a topology
 *   change, retracted as soon as a later step stops returning it).
 *
 * The contributor is pure with respect to the Document, deterministic and
 * synchronous. It never sees the Scheduler, the runtime session, another
 * component's state, nor any consequence resolved during the same step :
 * arbitrary same-step feedback is out of scope of this contract (V1).
 *
 * This module contains neither time, nor topology, nor resolution : only the
 * table. A11-COMP4-PREQ3 builds ONLY the generic mechanism : the production
 * table is intentionally empty.
 */

/**
 * @typedef {{
 *   digitalOutputPins: ReadonlyArray<string>,
 *   voltageOutputPins: ReadonlyArray<string>,
 *   voltageReferencePin: string | null,
 *   contribute: (ctx: {
 *     component: object,
 *     params: object,
 *     pinSignals: Record<string, string>,
 *     pinVoltages: Record<string, { voltage: number, reference: string } | null>,
 *     dt: number,
 *     currentTimeMs: number,
 *     previousState: any,
 *   }) => { state: any, effects?: {
 *     digitalOutputs?: Map<string, string> | Record<string, string>,
 *     voltageOutputs?: Map<string, number | null> | Record<string, number | null>,
 *     conductionPairs?: Array<[string, string]>,
 *   } | null },
 * }} MixedSignalContribution
 */

function assertContribution(type, contribution) {
  const pinList = (value) => value === undefined
    || (Array.isArray(value) && value.every((pin) => typeof pin === "string" && pin.length > 0))
  const invalid = (reason) => new Error(`mixedSignalContributionRegistry: invalid contribution for type "${type}" (${reason})`)
  if (!contribution || typeof contribution.contribute !== "function") throw invalid("expected a contribute function")
  if (!pinList(contribution.digitalOutputPins) || !pinList(contribution.voltageOutputPins)) {
    throw invalid("digitalOutputPins / voltageOutputPins must be string[]")
  }
  const voltageOutputPins = contribution.voltageOutputPins ?? []
  const reference = contribution.voltageReferencePin ?? null
  if (reference !== null && (typeof reference !== "string" || reference.length === 0)) {
    throw invalid("voltageReferencePin must be a pin id")
  }
  if (voltageOutputPins.length > 0 && reference === null) {
    throw invalid("voltageOutputPins require an explicit voltageReferencePin")
  }
  if (voltageOutputPins.includes(reference)) throw invalid("the voltage reference cannot be a voltage output")
  return Object.freeze({
    digitalOutputPins: Object.freeze([...(contribution.digitalOutputPins ?? [])]),
    voltageOutputPins: Object.freeze([...voltageOutputPins]),
    voltageReferencePin: reference,
    contribute: contribution.contribute,
  })
}

/**
 * Isolated Registry factory — same pattern as
 * `createDigitalEventContributionRegistry` : lets a test inject a FIXTURE table
 * without ever registering a fake production type.
 *
 * @param {{ contributions?: Map<string, object> | Record<string, object> }} [options]
 */
export function createMixedSignalContributionRegistry({ contributions = new Map() } = {}) {
  const source = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))
  const store = new Map([...source].map(([type, contribution]) => [type, assertContribution(type, contribution)]))

  /** @param {string} type @returns {MixedSignalContribution | null} */
  function getMixedSignalContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasMixedSignalContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllMixedSignalContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getMixedSignalContribution, hasMixedSignalContribution, getAllMixedSignalContributionTypes }
}

/** Production Registry — intentionally empty in A11-COMP4-PREQ3. */
const defaultRegistry = createMixedSignalContributionRegistry()

export const getMixedSignalContribution = defaultRegistry.getMixedSignalContribution
export const hasMixedSignalContribution = defaultRegistry.hasMixedSignalContribution
export const getAllMixedSignalContributionTypes = defaultRegistry.getAllMixedSignalContributionTypes
