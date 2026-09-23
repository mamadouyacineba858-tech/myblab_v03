/**
 * A7-C5-PREQ — Generic Timed Digital Output Runtime : Registry.
 *
 * Sibling registry to `digitalContributionRegistry.js` (A7-C3-PREQ), same
 * Open/Closed principle, but for STATEFUL, TIME-DEPENDENT digital producers
 * instead of stateless/synchronous ones : an association `type de composant
 * -> fonction qui reçoit le temps simulé courant et son propre état privé du
 * step précédent, et retourne zéro ou plusieurs sorties Signal.HIGH/LOW pour
 * ses propres pins, ainsi que son nouvel état privé`. Adding a future timed
 * producer (e.g. a component whose output depends on an elapsed simulated
 * duration) is done by adding ONE declarative entry here, never by modifying
 * a generic engine file (composition in `simulationRuntimeIntegration.js`,
 * resolution in `resolution.js` — both unmodified by this file).
 *
 * A7-C5-PREQ built ONLY the generic mechanism (production table
 * intentionally empty). A7-C5 (this ticket) registers the FIRST real
 * producer : HC_SR04 (ultrasonic distance sensor, TRIG -> ECHO timed
 * behaviour, see `hcSr04TimedDigital` below).
 *
 * Contrat d'une fonction de contribution temporelle :
 *
 *   ({ component, pins, params, pinSignals, currentTimeMs, previousState })
 *     => { state, outputs: Map<pinId, Signal> | null }
 *
 * - `component` : le composant EFFECTIF (post applyEnvironmentalStimuli),
 *   tel que reçu par la composition — jamais muté ici.
 * - `pins` : `component.pins` (définitions de pins persistantes de
 *   l'instance) — PAS un état de signal résolu.
 * - `params` : paramètres EFFECTIFS résolus (`resolveComponentParameters`,
 *   mêmes defaults canoniques + overrides d'instance validés que
 *   `digitalContributionRegistry.js`).
 * - `pinSignals` : `{ pinId: Signal }`, les propres pins du composant
 *   PRÉ-résolues UNIQUEMENT depuis les sources DC et la topologie physique
 *   (`resolveSourceDrivenPinSignals`, resolution.js — même primitive que
 *   `digitalContributionRegistry.js`, AVANT toute conduction passive, sortie
 *   numérique calculée, Runtime ou résolution complète) — jamais lu
 *   directement depuis un wire/DOM/Canvas.
 *   A9-SEQ-PREQ : dans `runSimulationWithRuntime`, ce contexte est le
 *   contexte d'ÉCHANTILLONNAGE du step : il inclut en plus les autorités
 *   Runtime courantes, les sorties timed MAINTENUES du step précédent et les
 *   sorties combinatoires qu'elles pilotent — jamais les nouvelles sorties
 *   timed du step courant (tous les producteurs échantillonnent le même
 *   contexte). Sans ces autorités, il reste identique au contexte historique.
 *   UNKNOWN/FLOATING sont transmis tels quels, jamais convertis.
 * - `currentTimeMs` : temps simulé courant, tel que retourné par le
 *   Scheduler partagé (scheduler.js — seule source de temps, voir
 *   `simulationRuntimeIntegration.js`). Un producteur ne possède jamais sa
 *   propre horloge et ne doit jamais reconstruire ce temps par accumulation
 *   indépendante de dt : `currentTimeMs` reste la référence absolue à
 *   chaque appel.
 * - `previousState` : état privé RUNTIME (volatile) retourné par ce même
 *   producteur au step précédent pour ce composant (`undefined` au premier
 *   step, ou après un reset/suppression du composant) — jamais lu depuis ni
 *   écrit dans le Document, `component.parameters`, History, Undo/Redo ou
 *   `canonicalRegistry.js`.
 * - Retour : un objet `{ state, outputs }`.
 *   - `state` : nouvel état privé à persister pour le prochain step (peut
 *     être `undefined`) — vit exclusivement dans le store runtime fourni par
 *     l'appelant (voir `computeTimedDigitalSignals`,
 *     `simulationRuntimeIntegration.js`), jamais dans le Document.
 *   - `outputs` : soit `null`/absence de sortie (rien à produire pour cet
 *     appel), soit une `Map<pinId, Signal>` — jamais un objet plain, même
 *     convention que `digitalContributionRegistry.js`.
 *
 * Aucun accès React/Canvas/Document/DOM/wires/breadboard ici, et aucune
 * horloge système (Date.now/performance.now/setTimeout/setInterval/
 * requestAnimationFrame) — cette fonction est synchrone et déterministe,
 * pilotée exclusivement par `currentTimeMs` et `previousState`.
 *
 * @typedef {(ctx: {
 *   component: object,
 *   pins: Array<object>,
 *   params: Record<string, number>,
 *   pinSignals: Record<string, string>,
 *   currentTimeMs: number,
 *   previousState: object | undefined,
 * }) => { state: object | undefined, outputs: Map<string, string> | null }} TimedDigitalContributionFn
 */

import { Signal } from "./signals.js"

/**
 * A7-C5 — HC_SR04 : durée ECHO par centimètre de distance (§16 du ticket),
 * approximation standard aller-retour du son :
 *
 *   echoDurationMs ≈ distanceCm × 0.058
 *
 * (2 cm -> ~0.116 ms ; 100 cm -> ~5.8 ms ; 400 cm -> ~23.2 ms). Cette
 * constante ne vit QUE dans le modèle HC_SR04 — jamais dans Scheduler,
 * jamais dans un fichier générique.
 */
const HC_SR04_ECHO_MS_PER_CM = 0.058

/**
 * État runtime initial déterministe (§17/§27 du ticket) : IDLE, aucun front
 * TRIG observé, aucune deadline ECHO en cours.
 */
function initialHcSr04State() {
  return { phase: "IDLE", previousTrig: Signal.UNKNOWN, echoEndMs: null }
}

/**
 * A7-C5 — HC_SR04 : sortie temporelle ECHO (§14 à §20 du ticket).
 *
 * Garde d'alimentation obligatoire (même patron exact que
 * `pirMotionSensorDigital`/`irReceiverDigital`, digitalContributionRegistry.js
 * — aucune seconde résolution, aucune branche HC_SR04 dans
 * resolution.js/simulationRuntimeIntegration.js) : un module non alimenté,
 * en polarité inversée, ou dont la source est en conflit ne produit jamais
 * de ECHO (pinSignals.VCC/GND ne sont jamais HIGH/LOW simultanément dans ces
 * trois cas). L'état privé est alors simplement PRÉSERVÉ tel quel (aucune
 * observation possible tant que le module n'est pas alimenté) — §19 du
 * ticket : absence de contribution, jamais un LOW inventé.
 *
 * Machine d'état à 2 phases (§17 du ticket) :
 *
 *   IDLE --front TRIG LOW->HIGH--> MEASURING --currentTimeMs>=echoEndMs--> IDLE
 *
 * Un front n'est détecté QUE depuis IDLE (`previousState.previousTrig !==
 * HIGH && pinSignals.TRIG === HIGH`) : TRIG maintenu HIGH ne redéclenche
 * jamais tant que la mesure en cours n'est pas terminée (§15 du ticket,
 * TD-26-style non-régression), et un retour LOW réarme naturellement le
 * front suivant (§15 : "retour LOW réarme correctement") — aucun compteur
 * de frame, uniquement `previousTrig` + `phase`, tous deux dans l'état
 * volatile retourné, jamais reconstruits par une horloge propre.
 *
 * echoEndMs est calculé UNE SEULE FOIS par front, à partir du
 * `params.distanceCm` EFFECTIF observé à cet instant (§38 : une nouvelle
 * mesure utilise la nouvelle DISTANCE effective) et de `currentTimeMs`
 * (jamais un accumulateur local) — préserve les fractions de milliseconde
 * (§18 du ticket, aucune quantification à SIMULATION_STEP_MS).
 */
function hcSr04TimedDigital({ params, pinSignals, currentTimeMs, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return { state: previousState, outputs: null }
  }

  const previous = previousState ?? initialHcSr04State()
  const trig = pinSignals.TRIG
  let { phase, echoEndMs } = previous

  if (phase === "IDLE" && previous.previousTrig !== Signal.HIGH && trig === Signal.HIGH) {
    phase = "MEASURING"
    echoEndMs = currentTimeMs + params.distanceCm * HC_SR04_ECHO_MS_PER_CM
  } else if (phase === "MEASURING" && currentTimeMs >= echoEndMs) {
    phase = "IDLE"
  }

  const echo = phase === "MEASURING" && currentTimeMs < echoEndMs ? Signal.HIGH : Signal.LOW

  return {
    state: { phase, previousTrig: trig, echoEndMs },
    outputs: new Map([["ECHO", echo]]),
  }
}

/**
 * A9-JK1 — 74HC73 : double bascule J-K, deux canaux INDÉPENDANTS (broches
 * nJ/nK/nCP/nR -> nQ/nNQ). Premier producteur SÉQUENTIEL réel du contrat
 * A9-SEQ-PREQ/PREQ2 : `currentTimeMs` n'est pas utilisé (aucune durée), le
 * mécanisme timed sert uniquement à l'état privé inter-step et à la
 * détection de front sur le contexte d'échantillonnage du step.
 */
const JK_74HC73_CHANNELS = Object.freeze([
  Object.freeze({ key: "channel1", j: "1J", k: "1K", clock: "1CP", reset: "1R", q: "1Q", nq: "1NQ" }),
  Object.freeze({ key: "channel2", j: "2J", k: "2K", clock: "2CP", reset: "2R", q: "2Q", nq: "2NQ" }),
])

const isDecisive = (level) => level === Signal.HIGH || level === Signal.LOW
const complement = (level) => (level === Signal.HIGH ? Signal.LOW : level === Signal.LOW ? Signal.HIGH : Signal.UNKNOWN)

/**
 * État initial (§14 du ticket) : Q indéterminé, aucun niveau d'horloge
 * observé. Un Q=LOW n'est jamais inventé au démarrage.
 */
function initialJkChannelState() {
  return { q: Signal.UNKNOWN, previousClock: Signal.UNKNOWN }
}

/** Table J-K au front descendant pour J/K décisifs (HOLD/RESET/SET/TOGGLE). */
function jkNext(j, k, q) {
  if (j === Signal.LOW && k === Signal.LOW) return q
  if (j === Signal.LOW && k === Signal.HIGH) return Signal.LOW
  if (j === Signal.HIGH && k === Signal.LOW) return Signal.HIGH
  return complement(q)
}

/**
 * Prochain Q au front descendant. J/K UNKNOWN/FLOATING ne sont jamais
 * convertis : on évalue la table pour CHAQUE niveau possible de l'entrée
 * indéterminée ; Q n'est déterminé que si toutes les branches concordent
 * (même principe « valeur décisive » que andGateDigital/orGateDigital,
 * digitalContributionRegistry.js), sinon Q devient UNKNOWN.
 */
function jkNextAtFallingEdge(j, k, q) {
  const js = isDecisive(j) ? [j] : [Signal.LOW, Signal.HIGH]
  const ks = isDecisive(k) ? [k] : [Signal.LOW, Signal.HIGH]
  const outcomes = new Set()
  for (const jj of js) for (const kk of ks) outcomes.add(jkNext(jj, kk, q))
  if (outcomes.size !== 1) return Signal.UNKNOWN
  const [only] = outcomes
  return isDecisive(only) ? only : Signal.UNKNOWN
}

/**
 * Un canal : reset asynchrone actif LOW prioritaire (§9), puis front
 * descendant strict previousClock HIGH -> clock LOW (§10). UNKNOWN/FLOATING
 * sur l'horloge ne sont jamais un front. Un reset indéterminé ne laisse Q
 * déterminé que si le résultat hors reset est déjà LOW (même valeur que le
 * reset), sinon Q devient UNKNOWN.
 */
function jkChannelStep(channel, pinSignals, previous) {
  const clock = pinSignals[channel.clock]
  const reset = pinSignals[channel.reset]
  if (reset === Signal.LOW) return { q: Signal.LOW, previousClock: clock }

  const fallingEdge = previous.previousClock === Signal.HIGH && clock === Signal.LOW
  const clocked = fallingEdge ? jkNextAtFallingEdge(pinSignals[channel.j], pinSignals[channel.k], previous.q) : previous.q
  if (reset === Signal.HIGH) return { q: clocked, previousClock: clock }
  return { q: clocked === Signal.LOW ? Signal.LOW : Signal.UNKNOWN, previousClock: clock }
}

/**
 * A9-JK1 — 74HC73 : contribution timed/stateful.
 *
 * Garde d'alimentation (§8, même patron que `hcSr04TimedDigital`) : sans
 * VCC HIGH et GND LOW, aucune sortie (`outputs = null`, jamais un LOW
 * inventé). Un circuit non alimenté ne mémorise rien : l'état privé revient
 * à l'état initial (Q UNKNOWN), de sorte qu'une remise sous tension ne
 * restitue jamais un Q fantôme.
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document) :
 *   { channel1: { q, previousClock }, channel2: { q, previousClock } }
 *
 * Sorties : pour chaque canal dont Q est déterminé, nQ = Q et nNQ = NOT Q ;
 * un Q UNKNOWN ne pilote ni nQ ni nNQ (la résolution générique préserve
 * UNKNOWN). `null` si aucun canal n'est déterminé.
 */
function jkFlipFlop74HC73TimedDigital({ pinSignals, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return {
      state: { channel1: initialJkChannelState(), channel2: initialJkChannelState() },
      outputs: null,
    }
  }

  const state = {}
  const outputs = new Map()
  for (const channel of JK_74HC73_CHANNELS) {
    const next = jkChannelStep(channel, pinSignals, previousState?.[channel.key] ?? initialJkChannelState())
    state[channel.key] = next
    if (isDecisive(next.q)) {
      outputs.set(channel.q, next.q)
      outputs.set(channel.nq, complement(next.q))
    }
  }
  return { state, outputs: outputs.size > 0 ? outputs : null }
}

/**
 * Fabrique un Registry isolé — même patron que
 * `createDigitalContributionRegistry` (`digitalContributionRegistry.js`) :
 * permet à un test d'injecter une table de contributions FIXTURE, sans
 * jamais enregistrer de faux type de production dans la table par défaut ni
 * dans `canonicalRegistry.js`.
 *
 * @param {{ contributions?: Map<string, TimedDigitalContributionFn> }} [options]
 */
export function createTimedDigitalContributionRegistry({ contributions = new Map() } = {}) {
  const store = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))

  /** @param {string} type @returns {TimedDigitalContributionFn | null} */
  function getTimedDigitalContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasTimedDigitalContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllTimedDigitalContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getTimedDigitalContribution, hasTimedDigitalContribution, getAllTimedDigitalContributionTypes }
}

/**
 * Registry de production — vide en A7-C5-PREQ (§16/§24 du ticket PREQ).
 * A7-C5 (ce ticket) ajoute la PREMIÈRE entrée réelle : HC_SR04, sans jamais
 * toucher `simulationRuntimeIntegration.js` (PROTECTED pour A7-C5, §33 du
 * ticket) ni `resolution.js`.
 */
const defaultRegistry = createTimedDigitalContributionRegistry({
  contributions: new Map([
    ["HC_SR04", hcSr04TimedDigital],
    // A9-JK1 : premier producteur séquentiel réel (état inter-step + front descendant).
    ["JK_FLIP_FLOP_74HC73", jkFlipFlop74HC73TimedDigital],
  ]),
})

export const getTimedDigitalContribution = defaultRegistry.getTimedDigitalContribution
export const hasTimedDigitalContribution = defaultRegistry.hasTimedDigitalContribution
export const getAllTimedDigitalContributionTypes = defaultRegistry.getAllTimedDigitalContributionTypes
