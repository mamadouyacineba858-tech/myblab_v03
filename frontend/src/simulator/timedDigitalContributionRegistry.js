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
  ]),
})

export const getTimedDigitalContribution = defaultRegistry.getTimedDigitalContribution
export const hasTimedDigitalContribution = defaultRegistry.hasTimedDigitalContribution
export const getAllTimedDigitalContributionTypes = defaultRegistry.getAllTimedDigitalContributionTypes
