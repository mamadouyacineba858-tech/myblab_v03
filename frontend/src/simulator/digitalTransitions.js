import { InvalidDigitalTransitionError } from "./errors/index.js"
import { Signal } from "./signals.js"

/**
 * A12-NEOPIXEL-PREQ-EVENT-TIMING-001 — transitions numériques horodatées.
 *
 * Un SignalMap (`Map<pinId, Signal>`) ne porte que le niveau COURANT d'une
 * pin à la fin d'un step de présentation (SIMULATION_STEP_MS). Un protocole
 * codé par impulsions a besoin, en plus, des transitions survenues À
 * L'INTÉRIEUR de ce step. Ce module fournit uniquement ce transport :
 *
 *   DigitalTransition = { pinId, timeMs, signal }
 *
 * - UN événement, jamais un état : SignalMap reste le contrat électrique
 *   instantané, inchangé, et n'est ni lu ni écrit ici.
 * - `timeMs` appartient à l'axe du Scheduler/SimulatedClock existant (ms,
 *   fractionnaire). Ce module ne possède ni Clock, ni Scheduler, ni timer,
 *   et ne consulte aucune horloge système : il ne fait que valider et
 *   ordonner des timestamps fournis par le producteur.
 * - `signal` utilise le vocabulaire canonique `Signal` (signals.js).
 * - Aucun type de composant, aucun protocole : un futur consommateur
 *   (ticket séparé) interprétera les transitions.
 *
 * Store : `Map<uid, Map<pinId, { lastTimeMs, pending }>>`, volatile, porté
 * par la session runtime (`createSimulationRuntimeSession`) — jamais dans le
 * Document, jamais historisé, jamais sérialisé. Les entrées par uid/pin sont
 * créées paresseusement au premier enregistrement : un circuit sans
 * producteur de transitions laisse le store vide.
 *
 * Ordre : par (uid, pinId), `timeMs` est monotone non décroissant, y compris
 * après consommation (`lastTimeMs` survit à la consommation ; seul un reset
 * de session le remet à zéro, en même temps que le Scheduler). Deux
 * transitions au même `timeMs` sont conservées dans l'ordre de production.
 *
 * Consommation : consume-and-remove borné (`untilMs` inclus). Les
 * transitions postérieures à la borne restent disponibles pour la
 * consommation suivante ; une transition rendue n'est jamais rendue deux
 * fois. Coût proportionnel au nombre de transitions produites/consommées.
 */

const CANONICAL_SIGNALS = new Set(Object.values(Signal))

function isValidTimeMs(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function assertKey(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new InvalidDigitalTransitionError(`${label} must be a non-empty string`, value)
  }
}

/** @returns {Map<string, Map<string, { lastTimeMs: number, pending: Array<Readonly<{ pinId: string, timeMs: number, signal: string }>> }>>} */
export function createDigitalTransitionStore() {
  return new Map()
}

/**
 * Enregistre une transition pour le composant `uid`. Validation complète
 * avant toute mutation : une transition rejetée laisse le store inchangé.
 * Un timestamp invalide n'est jamais corrigé.
 *
 * @param {ReturnType<typeof createDigitalTransitionStore>} store
 * @param {string} uid
 * @param {{ pinId: string, timeMs: number, signal: string }} transition
 * @returns {Readonly<{ pinId: string, timeMs: number, signal: string }>} la transition enregistrée (gelée)
 * @throws {InvalidDigitalTransitionError}
 */
export function recordDigitalTransition(store, uid, transition) {
  assertKey(uid, "uid")
  if (transition === null || typeof transition !== "object") {
    throw new InvalidDigitalTransitionError("transition must be an object", transition)
  }
  const { pinId, timeMs, signal } = transition
  assertKey(pinId, "pinId")
  if (!isValidTimeMs(timeMs)) {
    throw new InvalidDigitalTransitionError("timeMs must be a finite number >= 0", timeMs)
  }
  if (!CANONICAL_SIGNALS.has(signal)) {
    throw new InvalidDigitalTransitionError("signal must be a canonical Signal value", signal)
  }
  const stream = store.get(uid)?.get(pinId)
  if (stream && timeMs < stream.lastTimeMs) {
    throw new InvalidDigitalTransitionError(
      `timeMs must be non-decreasing per pin (last ${stream.lastTimeMs} ms)`,
      timeMs
    )
  }

  const recorded = Object.freeze({ pinId, timeMs, signal })
  let pins = store.get(uid)
  if (!pins) {
    pins = new Map()
    store.set(uid, pins)
  }
  if (stream) {
    stream.pending.push(recorded)
    stream.lastTimeMs = timeMs
  } else {
    pins.set(pinId, { lastTimeMs: timeMs, pending: [recorded] })
  }
  return recorded
}

/**
 * Retire et retourne, dans l'ordre de production, les transitions en
 * attente de (`uid`, `pinId`) dont `timeMs <= untilMs` (toutes si `untilMs`
 * est omis). Les suivantes restent en attente.
 *
 * @param {ReturnType<typeof createDigitalTransitionStore>} store
 * @param {string} uid
 * @param {string} pinId
 * @param {{ untilMs?: number }} [options]
 * @returns {Array<Readonly<{ pinId: string, timeMs: number, signal: string }>>}
 * @throws {InvalidDigitalTransitionError} si `untilMs` est fourni et invalide
 */
export function consumeDigitalTransitions(store, uid, pinId, { untilMs } = {}) {
  if (untilMs !== undefined && !isValidTimeMs(untilMs)) {
    throw new InvalidDigitalTransitionError("untilMs must be a finite number >= 0", untilMs)
  }
  const pending = store.get(uid)?.get(pinId)?.pending
  if (!pending || pending.length === 0) return []
  let count = pending.length
  if (untilMs !== undefined) {
    count = 0
    while (count < pending.length && pending[count].timeMs <= untilMs) count += 1
  }
  return pending.splice(0, count)
}

/** Nouveau runtime : aucune transition ni borne d'ordre ne survit. */
export function clearDigitalTransitions(store) {
  store.clear()
}

/** Retire les flux de tout uid absent de `liveUids`. */
export function retainDigitalTransitionUids(store, liveUids) {
  for (const uid of Array.from(store.keys())) {
    if (!liveUids.has(uid)) store.delete(uid)
  }
}
