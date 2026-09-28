import { Signal } from "./signals.js"

/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — WORLDSEMI WS2812B-V6 : décodeur du
 * protocole Single-Wire RZ pour UN pixel, sur le contrat événementiel
 * générique (`digitalEventContributionRegistry.js`).
 *
 * Entrée : DigitalTransition[] sur DIN (timeMs fractionnaire, axe du
 * Scheduler). Sortie : DigitalTransition[] sur DOUT. Aucune horloge, aucun
 * SignalMap lu pour les données, aucun React/Canvas/Document/Arduino.
 *
 * Constantes CSA verrouillées (documentation WORLDSEMI), converties en ms :
 *   T0H  : 220 ns <= HIGH <= 380 ns   -> bit 0
 *   T1H  : 580 ns <= HIGH <= 1000 ns  -> bit 1
 *   T0L / T1L : 580 ns <= LOW <= 1000 ns (LOW entre deux bits)
 *   bit  : période (front montant -> front montant suivant) >= 1.25 µs
 *   RESET / latch : LOW > 280 µs (strict)
 *   payload : 24 bits, G7..G0 R7..R0 B7..B0 (GRB, MSB first)
 *
 * Mesure des durées : différence de deux timestamps en ms, exprimée en ns à la
 * résolution de 1 ps (`durationNs`). Cette résolution (5 ordres de grandeur
 * sous la plus petite constante) neutralise uniquement le bruit binaire des
 * flottants (ex. 1.28 - 1.0 = 0.2800000000000000266) ; elle n'élargit aucune
 * fenêtre. Les bornes des fenêtres sont INCLUSES ; le reset est STRICT.
 *
 * Machine d'états (`phase`) :
 *   IDLE        après reset / mise sous tension : prêt pour une trame ;
 *   RECEIVING   réception des 24 bits propres au pixel ;
 *   FORWARDING  24 bits absorbés : chaque changement de niveau suivant de DIN
 *               est retransmis tel quel sur DOUT, au MÊME timeMs (le pixel
 *               suivant décode lui-même ses bits) ;
 *   INVALID     impulsion / intervalle hors contrat pendant la réception
 *               propre : rien n'est plus accepté ni retransmis jusqu'au
 *               prochain RESET, qui n'en latche rien (trame rejetée).
 *
 * RESET : détecté (a) sur front montant après un LOW > 280 µs, ou (b) en fin
 * d'appel si DIN est LOW depuis plus de 280 µs à l'HORIZON — le temps simulé
 * du step précédent (`horizonMs`), jusqu'auquel toutes les transitions ont
 * déjà été livrées par le runtime (y compris en cascade). Le latch par temps
 * seul intervient donc au step qui suit la trame, jamais par anticipation.
 * Au RESET : 24 bits valides -> couleur latchée ; sinon la couleur précédente
 * est conservée (aucune couleur inventée) ; puis retour en IDLE.
 *
 * Alimentation : VDD HIGH et VSS LOW (contexte pré-résolution fourni par le
 * runtime) ; sinon état initial (aucune couleur), aucune sortie.
 */

export const WS2812B_V6_TIMING_NS = Object.freeze({
  T0H_MIN: 220,
  T0H_MAX: 380,
  T1H_MIN: 580,
  T1H_MAX: 1000,
  TL_MIN: 580,
  TL_MAX: 1000,
  BIT_PERIOD_MIN: 1250,
  RESET_LOW_MIN_EXCLUSIVE: 280000,
})

export const WS2812B_V6_TIMING_MS = Object.freeze(
  Object.fromEntries(Object.entries(WS2812B_V6_TIMING_NS).map(([key, ns]) => [key, ns / 1e6]))
)

export const WS2812B_V6_BITS_PER_PIXEL = 24

export const WS2812B_V6_INITIAL_STATE = Object.freeze({
  phase: "IDLE",
  din: Signal.LOW,
  lastEdgeMs: null,
  bitStartMs: null,
  bits: 0,
  word: 0,
  dout: Signal.LOW,
  color: null,
  stepTimeMs: null,
  horizonMs: null,
})

/** Durée (ns, résolution 1 ps) entre deux timestamps en ms. */
export function durationNs(fromMs, toMs) {
  return Math.round((toMs - fromMs) * 1e9) / 1e3
}

/** HIGH (ns) -> 0 | 1 | null (hors des deux fenêtres, jamais arrondi à un bit). */
export function classifyHighNs(highNs) {
  const t = WS2812B_V6_TIMING_NS
  if (highNs >= t.T0H_MIN && highNs <= t.T0H_MAX) return 0
  if (highNs >= t.T1H_MIN && highNs <= t.T1H_MAX) return 1
  return null
}

export function isResetLowNs(lowNs) {
  return lowNs > WS2812B_V6_TIMING_NS.RESET_LOW_MIN_EXCLUSIVE
}

/** Mot 24 bits G7..G0 R7..R0 B7..B0 -> { r, g, b }. */
export function decodeGrbWord(word) {
  return Object.freeze({ r: (word >> 8) & 0xff, g: (word >> 16) & 0xff, b: word & 0xff })
}

function latchAndReset(state) {
  const complete = (state.phase === "RECEIVING" || state.phase === "FORWARDING") && state.bits === WS2812B_V6_BITS_PER_PIXEL
  return {
    ...state,
    phase: "IDLE",
    bitStartMs: null,
    bits: 0,
    word: 0,
    color: complete ? decodeGrbWord(state.word) : state.color,
  }
}

function forward(state, out, timeMs, signal) {
  if (state.dout === signal) return state
  out.push({ pinId: "DOUT", timeMs, signal })
  return { ...state, dout: signal }
}

/** Front montant DIN (LOW -> HIGH) à `t`. */
function risingEdge(state, t, out) {
  let s = state
  const lowNs = s.lastEdgeMs === null ? null : durationNs(s.lastEdgeMs, t)
  if (lowNs !== null && isResetLowNs(lowNs)) s = latchAndReset(s)

  if (s.phase === "FORWARDING") return { ...forward(s, out, t, Signal.HIGH), bitStartMs: t }
  if (s.phase === "INVALID") return s
  if (s.phase === "IDLE") return { ...s, phase: "RECEIVING", bitStartMs: t }

  // RECEIVING, au moins un bit propre reçu : LOW et période du bit précédent.
  const t8 = WS2812B_V6_TIMING_NS
  const periodNs = durationNs(s.bitStartMs, t)
  if (lowNs === null || lowNs < t8.TL_MIN || lowNs > t8.TL_MAX || periodNs < t8.BIT_PERIOD_MIN) {
    return { ...s, phase: "INVALID" }
  }
  if (s.bits === WS2812B_V6_BITS_PER_PIXEL) {
    return { ...forward({ ...s, phase: "FORWARDING" }, out, t, Signal.HIGH), bitStartMs: t }
  }
  return { ...s, bitStartMs: t }
}

/** Front descendant DIN (HIGH -> LOW) à `t`. */
function fallingEdge(state, t, out) {
  if (state.phase === "FORWARDING") return forward(state, out, t, Signal.LOW)
  if (state.phase !== "RECEIVING") return state
  const bit = classifyHighNs(durationNs(state.bitStartMs, t))
  if (bit === null) return { ...state, phase: "INVALID" }
  return { ...state, bits: state.bits + 1, word: state.word * 2 + bit }
}

/**
 * Applique UNE transition DIN. Un niveau identique au niveau courant n'est pas
 * un front. HIGH n'est un front montant que depuis LOW ; un niveau non binaire
 * (UNKNOWN/FLOATING) ou un HIGH qui n'en vient pas rend la réception propre
 * INVALID. En FORWARDING, tout changement de niveau est retransmis tel quel.
 *
 * @returns {{ state: object, transitions: Array<{ pinId: string, timeMs: number, signal: string }> }}
 */
export function applyDinTransition(state, { timeMs, signal }) {
  const out = []
  if (signal === state.din) return { state, transitions: out }
  let s
  if (signal === Signal.HIGH && state.din === Signal.LOW) s = risingEdge(state, timeMs, out)
  else if (signal === Signal.LOW && state.din === Signal.HIGH) s = fallingEdge(state, timeMs, out)
  else if (state.phase === "FORWARDING") s = forward(state, out, timeMs, signal)
  else s = state.phase === "IDLE" && signal !== Signal.HIGH ? state : { ...state, phase: "INVALID" }
  return { state: Object.freeze({ ...s, din: signal, lastEdgeMs: timeMs }), transitions: out }
}

/** Nouveau step (currentTimeMs distinct) : l'horizon devient le step précédent. */
export function advanceStep(state, currentTimeMs) {
  if (state.stepTimeMs === currentTimeMs) return state
  return Object.freeze({ ...state, horizonMs: state.stepTimeMs, stepTimeMs: currentTimeMs })
}

/** RESET par temps : DIN LOW depuis plus de 280 µs à l'horizon. */
export function applyHorizonReset(state) {
  if (
    state.phase === "IDLE"
    || state.din !== Signal.LOW
    || state.lastEdgeMs === null
    || state.horizonMs === null
    || !isResetLowNs(durationNs(state.lastEdgeMs, state.horizonMs))
  ) return state
  return Object.freeze(latchAndReset(state))
}

/**
 * Contributeur événementiel (contrat `digitalEventContributionRegistry.js`).
 * Transitions DIN déjà triées par le runtime ; sorties DOUT au même axe.
 */
export function ws2812bV6DigitalEvent({ pinSignals, currentTimeMs, previousState, transitions }) {
  if (pinSignals?.VDD !== Signal.HIGH || pinSignals?.VSS !== Signal.LOW) {
    return { state: WS2812B_V6_INITIAL_STATE, transitions: [] }
  }
  let state = advanceStep(previousState ?? WS2812B_V6_INITIAL_STATE, currentTimeMs)
  const out = []
  for (const transition of transitions) {
    const step = applyDinTransition(state, transition)
    state = step.state
    out.push(...step.transitions)
  }
  return { state: applyHorizonReset(state), transitions: out }
}

export const WS2812B_V6_DIGITAL_EVENT_CONTRIBUTION = Object.freeze({
  inputPins: Object.freeze(["DIN"]),
  outputPins: Object.freeze(["DOUT"]),
  contribute: ws2812bV6DigitalEvent,
})
