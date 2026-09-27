/**
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 — Registry générique des consommateurs /
 * producteurs d'ÉVÉNEMENTS numériques horodatés.
 *
 * Sibling de `digitalContributionRegistry.js` (sorties stateless),
 * `timedDigitalContributionRegistry.js` (producteurs échantillonnés) et
 * `transientContributionRegistry.js` (contributeurs électriques) : même patron
 * Open/Closed — la seule connaissance type -> comportement vit dans la table
 * de ce Registry, consultée par `simulationRuntimeIntegration.js` uniquement
 * via `hasDigitalEventContribution` / `getDigitalEventContribution`.
 *
 * Là où un producteur timed reçoit des NIVEAUX échantillonnés une fois par
 * step, un contributeur événementiel reçoit les TRANSITIONS (contrat
 * `DigitalTransition = { pinId, timeMs, signal }` de `digitalTransitions.js`,
 * aucun second format) survenues sur ses pins d'entrée, y compris plusieurs à
 * l'intérieur d'un même step, et peut en émettre sur ses pins de sortie :
 *
 *   incoming DigitalTransition[] -> contribute -> { state, transitions }
 *
 * Une entrée du Registry est une déclaration :
 *
 *   {
 *     inputPins:  string[]   // pins dont les transitions entrantes sont livrées
 *     outputPins: string[]   // seules pins sur lesquelles `transitions` peut émettre
 *     contribute(ctx) -> { state, transitions }
 *   }
 *
 * avec ctx = { component, pins, params, currentTimeMs, previousState, transitions }.
 *
 * - `currentTimeMs` : temps simulé du Scheduler partagé du step (jamais une
 *   horloge propre au contributeur).
 * - `previousState` : état privé runtime de CE uid (undefined au premier
 *   appel), porté par la session runtime (`digitalEventStates`) — jamais par
 *   ce Registry, jamais dans le Document.
 * - `transitions` (entrée) : transitions livrées sur `inputPins`, `timeMs` <=
 *   `currentTimeMs`, triées par temps (égalité : ordre de `inputPins` puis
 *   ordre de production). Chacune n'est livrée qu'une fois.
 * - `transitions` (sortie) : DigitalTransition[] sur `outputPins`, timestamps
 *   fractionnaires libres (>= dernière transition de la pin), validées et
 *   enregistrées atomiquement par le runtime via `recordDigitalTransitions`.
 *
 * Ce module ne contient ni temps, ni topologie, ni résolution : uniquement la
 * table. La table de production est VIDE (aucun type n'y est enregistré).
 */

/**
 * @typedef {{
 *   inputPins: string[],
 *   outputPins: string[],
 *   contribute: (ctx: {
 *     component: object,
 *     pins: Array<object>,
 *     params: object,
 *     currentTimeMs: number,
 *     previousState: any,
 *     transitions: Array<Readonly<{ pinId: string, timeMs: number, signal: string }>>,
 *   }) => { state: any, transitions?: Array<{ pinId: string, timeMs: number, signal: string }> | null },
 * }} DigitalEventContribution
 */

function assertContribution(type, contribution) {
  const pinList = (value) => Array.isArray(value) && value.every((pin) => typeof pin === "string" && pin.length > 0)
  if (
    !contribution
    || typeof contribution.contribute !== "function"
    || !pinList(contribution.inputPins)
    || !pinList(contribution.outputPins)
  ) {
    throw new Error(`digitalEventContributionRegistry: invalid contribution for type "${type}" (expected { inputPins: string[], outputPins: string[], contribute: Function })`)
  }
  return Object.freeze({
    inputPins: Object.freeze([...contribution.inputPins]),
    outputPins: Object.freeze([...contribution.outputPins]),
    contribute: contribution.contribute,
  })
}

/**
 * Fabrique un Registry isolé — même patron que
 * `createTimedDigitalContributionRegistry` : permet à un test d'injecter une
 * table FIXTURE sans jamais enregistrer de faux type de production.
 *
 * @param {{ contributions?: Map<string, DigitalEventContribution> | Record<string, DigitalEventContribution> }} [options]
 */
export function createDigitalEventContributionRegistry({ contributions = new Map() } = {}) {
  const source = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))
  const store = new Map([...source].map(([type, contribution]) => [type, assertContribution(type, contribution)]))

  /** @param {string} type @returns {DigitalEventContribution | null} */
  function getDigitalEventContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasDigitalEventContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllDigitalEventContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getDigitalEventContribution, hasDigitalEventContribution, getAllDigitalEventContributionTypes }
}

/** Registry de production — VIDE (A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 : aucun type enregistré). */
const defaultRegistry = createDigitalEventContributionRegistry()

export const getDigitalEventContribution = defaultRegistry.getDigitalEventContribution
export const hasDigitalEventContribution = defaultRegistry.hasDigitalEventContribution
export const getAllDigitalEventContributionTypes = defaultRegistry.getAllDigitalEventContributionTypes
