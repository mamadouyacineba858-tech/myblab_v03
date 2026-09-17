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
 * A7-C5-PREQ builds ONLY the generic mechanism (production table
 * intentionally empty — no real component type is registered here). The
 * first real producer is registered by a future component ticket (A7-C5),
 * out of scope here.
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
 * Registry de production — table vide en A7-C5-PREQ (§16/§24 du ticket :
 * cette infrastructure n'enregistre aucun composant réel). Le premier
 * composant producteur temporel réel sera ajouté par un futur ticket
 * (A7-C5), sans jamais toucher `simulationRuntimeIntegration.js` ni
 * `resolution.js`.
 */
const defaultRegistry = createTimedDigitalContributionRegistry()

export const getTimedDigitalContribution = defaultRegistry.getTimedDigitalContribution
export const hasTimedDigitalContribution = defaultRegistry.hasTimedDigitalContribution
export const getAllTimedDigitalContributionTypes = defaultRegistry.getAllTimedDigitalContributionTypes
