import { Signal } from "./signals.js"

/**
 * A4-D-PREQ1 — Generic Transient Electrical Simulation : Registry.
 *
 * Sibling registry to `dcContributionRegistry.js` (ADR-006, same Open/Closed
 * principle : association `type de composant -> fonction de contribution`),
 * but for components whose electrical behaviour depends on simulated TIME
 * and on their OWN previous electrical state, instead of being resolved
 * instantaneously from the current signal state alone. The DC Registry keeps
 * governing steady-state DC analysis (`computeDcAnalysis`, resolution.js) —
 * this Registry is consulted separately, by `simulationRuntimeIntegration.js`
 * only (same integration seam already used for
 * `timedDigitalContributionRegistry.js`), never by `resolution.js`.
 *
 * Contrat d'une fonction de contribution transitoire :
 *
 *   ({ pins, params, supplyVoltage, dt, currentTimeMs, previousState })
 *     => { state, contribution }
 *
 * - `pins` : `{ pinId: Signal }`, les propres bornes du composant, PRÉ-
 *   résolues UNIQUEMENT depuis les sources DC et la topologie physique
 *   (`resolveSourceDrivenPinSignals`, resolution.js) — même primitive et
 *   même convention EXACTE que `pins` dans `dcContributionRegistry.js`
 *   (Signal.HIGH/LOW/UNKNOWN, jamais un objet de définition de broche).
 * - `params` : paramètres EFFECTIFS résolus (`resolveComponentParameters`).
 * - `supplyVoltage` : tension de la SEULE source DC du circuit lorsque le
 *   circuit n'en compte exactement qu'une (même restriction, déjà existante
 *   et documentée, que `computeDcAnalysis` — resolution.js : au-delà d'une
 *   source, aucune tension de bus unique n'est définie dans ce modèle
 *   simplifié) ; `null` sinon — un contributeur doit alors se comporter
 *   comme un composant non alimenté.
 * - `dt` : le même pas de temps simulé explicite que celui transmis à
 *   `Scheduler.advance(dt)` pour ce step (jamais recalculé depuis
 *   `currentTimeMs`, jamais une horloge propre au contributeur).
 * - `currentTimeMs` : temps simulé courant, tel que retourné par le
 *   Scheduler partagé (scheduler.js — seule source de temps).
 * - `previousState` : état électrique privé RUNTIME (volatile) retourné par
 *   ce même contributeur au step précédent pour ce composant (`undefined`
 *   au premier step, ou après un reset/suppression du composant) — jamais
 *   lu depuis ni écrit dans le Document, `component.parameters`, History,
 *   Undo/Redo ou `canonicalRegistry.js`.
 * - Retour : un objet `{ state, contribution }`.
 *   - `state` : nouvel état électrique privé à persister pour le prochain
 *     step (peut être `undefined`) — vit exclusivement dans le store runtime
 *     fourni par l'appelant (`electricalTransientStates`, voir
 *     `computeTransientElectricalContributions`,
 *     `simulationRuntimeIntegration.js`), jamais dans le Document.
 *   - `contribution` : soit `null` (rien à produire pour cet appel — même
 *     convention que `dcContributionRegistry.js` : composant non alimenté
 *     ou hors contexte électrique), soit `{ voltage, current }` — même forme
 *     exacte qu'une contribution DC.
 *
 * Aucun accès React/Canvas/Document/DOM/wires/breadboard ici, et aucune
 * horloge système (Date.now/performance.now/setTimeout/setInterval/
 * requestAnimationFrame) — cette fonction est synchrone et déterministe,
 * pilotée exclusivement par `dt`/`currentTimeMs`/`previousState`.
 *
 * @typedef {(ctx: {
 *   pins: Record<string, string>,
 *   params: Record<string, number>,
 *   supplyVoltage: number | null,
 *   dt: number,
 *   currentTimeMs: number,
 *   previousState: object | undefined,
 * }) => { state: object | undefined, contribution: {voltage:number, current:number} | null }} TransientContributionFn
 */

function isSimplePoweredLoop(pinA, pinB) {
  return (
    (pinA === Signal.HIGH && pinB === Signal.LOW) ||
    (pinA === Signal.LOW && pinB === Signal.HIGH)
  )
}

/**
 * A4-D-PREQ1 — Modèle Level-1 pédagogique de charge d'un condensateur sous
 * tension continue (loi de charge RC classique), volontairement simplifié :
 * ce n'est PAS un solveur SPICE. Aucune valeur de résistance série réelle
 * n'est modélisée ici à l'échelle du circuit (le moteur générique ne
 * transmet aucune topologie résistive à cette fonction) : `CHARGE_RESISTANCE_OHMS`
 * est une constante pédagogique fixe, propre à ce modèle CAPACITOR, qui ne
 * prétend représenter aucun composant réel du circuit — seulement produire
 * une réponse déterministe, dépendante de `capacitance` et de `dt`, qui
 * illustre la charge progressive attendue (§5 du ticket).
 *
 *   tau = capacitance × CHARGE_RESISTANCE_OHMS
 *   V(t+dt) = V(t) + (Vtarget - V(t)) × (1 - e^(-dt/tau))
 *   I(t+dt) = capacitance × (V(t+dt) - V(t)) / dt     (dt > 0 uniquement)
 *
 * Composant non alimenté (boucle non simple HIGH/LOW, ou `supplyVoltage`
 * absent — plusieurs sources DC dans le circuit) : l'état privé est
 * simplement PRÉSERVÉ tel quel (aucune charge ni décharge modélisée hors
 * contexte alimenté), et `contribution` vaut `null` — même patron exact que
 * `hcSr04TimedDigital` (timedDigitalContributionRegistry.js) lorsque VCC/GND
 * ne sont pas correctement observés.
 */
const CHARGE_RESISTANCE_OHMS = 1000

function initialCapacitorState() {
  return { voltage: 0 }
}

function capacitorChargeStep(termA, termB, capacitance, supplyVoltage, dt, previousState) {
  if (!isSimplePoweredLoop(termA, termB) || typeof supplyVoltage !== "number" || !Number.isFinite(supplyVoltage)) {
    return { state: previousState, contribution: null }
  }

  const { voltage: previousVoltage } = previousState ?? initialCapacitorState()
  const tau = capacitance * CHARGE_RESISTANCE_OHMS
  const alpha = tau > 0 && dt > 0 ? 1 - Math.exp(-dt / tau) : 0
  const voltage = previousVoltage + (supplyVoltage - previousVoltage) * alpha
  const current = dt > 0 ? capacitance * (voltage - previousVoltage) / dt : 0

  return { state: { voltage }, contribution: { voltage, current } }
}

/**
 * FT-C-COMP-002 : POLARIZED_CAPACITOR réutilise LA MÊME fonction moteur
 * (`capacitorChargeStep`) que CAPACITOR — jamais une seconde implémentation
 * du modèle de charge — seules les bornes nommées diffèrent (`plus`/`minus`
 * au lieu de `pinA`/`pinB`), même patron exact que `capacitorDc`/
 * `polarizedCapacitorDc` dans `dcContributionRegistry.js`.
 */
function capacitorTransient({ pins, params, supplyVoltage, dt, previousState }) {
  return capacitorChargeStep(pins.pinA, pins.pinB, params.capacitance, supplyVoltage, dt, previousState)
}

function polarizedCapacitorTransient({ pins, params, supplyVoltage, dt, previousState }) {
  return capacitorChargeStep(pins.plus, pins.minus, params.capacitance, supplyVoltage, dt, previousState)
}

/**
 * Fabrique un Registry isolé — même patron que
 * `createTimedDigitalContributionRegistry` (`timedDigitalContributionRegistry.js`) :
 * permet à un test d'injecter une table de contributions FIXTURE, sans
 * jamais enregistrer de faux type de production dans la table par défaut ni
 * dans `canonicalRegistry.js`.
 *
 * @param {{ contributions?: Map<string, TransientContributionFn> }} [options]
 */
export function createTransientContributionRegistry({ contributions = new Map() } = {}) {
  const store = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))

  /** @param {string} type @returns {TransientContributionFn | null} */
  function getTransientContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasTransientContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllTransientContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getTransientContribution, hasTransientContribution, getAllTransientContributionTypes }
}

/**
 * Registry de production — CAPACITOR et POLARIZED_CAPACITOR, premiers (et
 * seuls, §2/§8 du ticket : aucun INDUCTOR/ZENER/nouveau type) consommateurs
 * réels du contrat transitoire générique (§5 du ticket : "utiliser CAPACITOR
 * comme premier consommateur réel du contrat").
 */
const defaultRegistry = createTransientContributionRegistry({
  contributions: new Map([
    ["CAPACITOR", capacitorTransient],
    ["POLARIZED_CAPACITOR", polarizedCapacitorTransient],
  ]),
})

export const getTransientContribution = defaultRegistry.getTransientContribution
export const hasTransientContribution = defaultRegistry.hasTransientContribution
export const getAllTransientContributionTypes = defaultRegistry.getAllTransientContributionTypes
