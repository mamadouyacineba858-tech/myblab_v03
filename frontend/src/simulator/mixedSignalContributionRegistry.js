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
 * table. A11-COMP4-PREQ3 built ONLY the generic mechanism ; A11-COMP4 registers
 * its first production entry, the TI NE555P timer (see `ne555pTimer` below) ;
 * A11-COMP5 the TI NE556N dual timer (`ne556nTimer`), same channel law.
 */

import { Signal } from "./signals.js"

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

/**
 * A11-COMP4 — Texas Instruments NE555P precision timer, Level-1.
 *
 * One private runtime state, `{ latch: "SET" | "RESET" }` : no counter, no
 * deadline, no period, no internal capacitor. Timing emerges only from the
 * EXTERNAL circuit (resistors and capacitor, PREQ4/PREQ5) observed at each
 * SAMPLE ; this entry knows no R, no C and no time constant.
 *
 * Observation (all relative to GND, from `pinVoltages` only — never a Signal
 * turned into volts) :
 * - supply = V(VCC) - V(GND), both finite facts of the same reference ; the
 *   device is powered only inside the TI NE555P recommended supply range
 *   (4.5 V .. 16 V, TI datasheet SLFS022 "Recommended Operating Conditions").
 * - CONT absent : nominal comparator levels, trigger = supply / 3 and
 *   threshold = 2 × supply / 3. CONT valid : Level-1 controlled levels,
 *   threshold = V(CONT), trigger = V(CONT) / 2. CONT null or of a foreign
 *   reference : levels unresolved (never a nominal fallback) — neither
 *   comparator may act.
 * - TRIG / THRES : numeric facts, each usable independently of the other.
 * - RESET : digital observation (`pinSignals`) ; only Signal.HIGH releases it,
 *   LOW and UNKNOWN assert it (conservative, deterministic).
 *
 * Priority : RESET > TRIG (V(TRIG) < trigger -> SET) > THRES
 * (V(THRES) > threshold -> RESET) > HOLD. Equality never switches.
 * previousState undefined -> latch RESET (MYBlab deterministic start-up
 * convention, not a guaranteed silicon power-up behaviour). Unpowered or out
 * of range : latch RESET and no effect at all (OUT not driven, DISCH open).
 *
 * Effects : SET -> OUT HIGH, DISCH open ; RESET -> OUT LOW and the step
 * conduction pair DISCH-GND (discharge transistor), never a digital DISCH.
 *
 * A11-COMP5 : this channel law is the ONE local law of the bipolar timer
 * family (`evaluateBipolarTimerChannel`), shared by NE555P and by both
 * channels of NE556N ; only the pin names of a channel differ.
 */
const BIPOLAR_TIMER_SUPPLY_MIN_VOLTS = 4.5
const BIPOLAR_TIMER_SUPPLY_MAX_VOLTS = 16
const LATCH_SET = "SET"
const LATCH_RESET = "RESET"

/** Volts of `fact` relative to the ground fact : number, undefined (absent) or null (conflict / foreign reference). */
function relativeToGround(fact, ground) {
  if (fact === undefined) return undefined
  if (!fact || fact.reference !== ground.reference || !Number.isFinite(fact.voltage)) return null
  return fact.voltage - ground.voltage
}

/** Common supply of a timer package, V(VCC) - V(GND) inside the Level-1 range ; null = unpowered. */
function poweredTimerSupply(pinVoltages) {
  const ground = pinVoltages.GND
  if (!ground || !Number.isFinite(ground.voltage)) return null
  const supply = relativeToGround(pinVoltages.VCC, ground)
  if (typeof supply !== "number" || supply < BIPOLAR_TIMER_SUPPLY_MIN_VOLTS || supply > BIPOLAR_TIMER_SUPPLY_MAX_VOLTS) return null
  return { ground, supply }
}

/**
 * The one Level-1 channel law of a powered bipolar timer. Observations are
 * relative to GND : number, undefined (absent) or null (conflict / foreign
 * reference). RESET > TRIG SET > THRES RESET > HOLD ; equality never switches.
 */
function evaluateBipolarTimerChannel({ supply, resetSignal, controlVoltage, triggerVoltage, thresholdVoltage, previousLatch }) {
  if (resetSignal !== Signal.HIGH) return LATCH_RESET
  if (controlVoltage !== null) {
    const thresholdLevel = controlVoltage === undefined ? (2 * supply) / 3 : controlVoltage
    const triggerLevel = controlVoltage === undefined ? supply / 3 : controlVoltage / 2
    if (typeof triggerVoltage === "number" && triggerVoltage < triggerLevel) return LATCH_SET
    if (typeof thresholdVoltage === "number" && thresholdVoltage > thresholdLevel) return LATCH_RESET
  }
  return previousLatch === LATCH_SET ? LATCH_SET : LATCH_RESET
}

/** Latch of ONE channel, observed only through that channel's own pins. */
function timerChannelLatch({ pinSignals, pinVoltages }, power, pins, previousLatch) {
  const observe = (pin) => relativeToGround(pinVoltages[pin], power.ground)
  return evaluateBipolarTimerChannel({
    supply: power.supply,
    resetSignal: pinSignals[pins.reset],
    controlVoltage: observe(pins.control),
    triggerVoltage: observe(pins.trigger),
    thresholdVoltage: observe(pins.threshold),
    previousLatch,
  })
}

/** SET -> OUT HIGH, DISCH open ; RESET -> OUT LOW and the step conduction pair DISCH-GND, per channel. */
function timerEffects(channels) {
  const digitalOutputs = {}
  const conductionPairs = []
  for (const [latch, pins] of channels) {
    digitalOutputs[pins.output] = latch === LATCH_SET ? Signal.HIGH : Signal.LOW
    if (latch === LATCH_RESET) conductionPairs.push([pins.discharge, "GND"])
  }
  return conductionPairs.length > 0 ? { digitalOutputs, conductionPairs } : { digitalOutputs }
}

const NE555P_CHANNEL = Object.freeze({ reset: "RESET", control: "CONT", trigger: "TRIG", threshold: "THRES", output: "OUT", discharge: "DISCH" })

export const ne555pTimer = Object.freeze({
  digitalOutputPins: Object.freeze(["OUT"]),
  contribute(ctx) {
    const power = poweredTimerSupply(ctx.pinVoltages)
    if (power === null) return { state: { latch: LATCH_RESET }, effects: {} }
    const latch = timerChannelLatch(ctx, power, NE555P_CHANNEL, ctx.previousState?.latch)
    return { state: { latch }, effects: timerEffects([[latch, NE555P_CHANNEL]]) }
  },
})

/**
 * A11-COMP5 — Texas Instruments NE556N dual precision timer, Level-1.
 *
 * ONE physical component, ONE private runtime state :
 * `{ timer1: { latch }, timer2: { latch } }`. Both channels share VCC / GND
 * (CSA Level-1 lock 4.5 V <= VCC - GND <= 16 V, as NE555P) and each runs the
 * common channel law above on its own pins only (xRESET, xCONT, xTRIG,
 * xTHRES -> xOUT, xDISCH) : no cross-channel observation. Common supply
 * invalid : both latches RESET, no effect at all.
 */
const NE556N_CHANNELS = Object.freeze({
  timer1: Object.freeze({ reset: "1RESET", control: "1CONT", trigger: "1TRIG", threshold: "1THRES", output: "1OUT", discharge: "1DISCH" }),
  timer2: Object.freeze({ reset: "2RESET", control: "2CONT", trigger: "2TRIG", threshold: "2THRES", output: "2OUT", discharge: "2DISCH" }),
})

export const ne556nTimer = Object.freeze({
  digitalOutputPins: Object.freeze(["1OUT", "2OUT"]),
  contribute(ctx) {
    const power = poweredTimerSupply(ctx.pinVoltages)
    if (power === null) return { state: { timer1: { latch: LATCH_RESET }, timer2: { latch: LATCH_RESET } }, effects: {} }
    const timer1 = timerChannelLatch(ctx, power, NE556N_CHANNELS.timer1, ctx.previousState?.timer1?.latch)
    const timer2 = timerChannelLatch(ctx, power, NE556N_CHANNELS.timer2, ctx.previousState?.timer2?.latch)
    return {
      state: { timer1: { latch: timer1 }, timer2: { latch: timer2 } },
      effects: timerEffects([[timer1, NE556N_CHANNELS.timer1], [timer2, NE556N_CHANNELS.timer2]]),
    }
  },
})

/** Production Registry — A11-COMP4 : NE555P is its first entry ; A11-COMP5 : NE556N. */
const defaultRegistry = createMixedSignalContributionRegistry({
  contributions: new Map([
    ["NE555P", ne555pTimer],
    ["NE556N", ne556nTimer],
  ]),
})

export const getMixedSignalContribution = defaultRegistry.getMixedSignalContribution
export const hasMixedSignalContribution = defaultRegistry.hasMixedSignalContribution
export const getAllMixedSignalContributionTypes = defaultRegistry.getAllMixedSignalContributionTypes
