/**
 * A7-C3-PREQ — Generic Computed Digital Output Registry.
 *
 * Sibling registry to `dcContributionRegistry.js` (ADR-006), but for
 * DRIVEN DIGITAL LOGIC LEVELS instead of analog voltage/current : an
 * association `type de composant -> fonction pure qui calcule zéro ou
 * plusieurs sorties Signal.HIGH/Signal.LOW pour ses propres pins`. Exactement
 * le même principe Open/Closed que dcContributionRegistry.js : ajouter un
 * futur composant producteur (détecteur de mouvement, détecteur
 * d'inclinaison, récepteur en lumière infrarouge, ...) se fait en ajoutant
 * UNE entrée déclarative ici, jamais en modifiant un fichier générique
 * (composition dans `simulationRuntimeIntegration.js`, résolution dans
 * `resolution.js`).
 *
 * A7-C3-PREQ a construit UNIQUEMENT le mécanisme générique (table de
 * production volontairement vide). A7-C3-PREQ2 a étendu le contexte de
 * contribution d'un champ `pinSignals` (voir contrat ci-dessous). A7-C3
 * (ce ticket) enregistre le PREMIER composant producteur réel :
 * SOIL_MOISTURE_SENSOR.
 *
 * Contrat d'une fonction de contribution :
 *
 *   ({ component, pins, params, pinSignals }) => Map<pinId, Signal> | null
 *
 * - `component` : le composant EFFECTIF (post applyEnvironmentalStimuli),
 *   tel que reçu par la composition — jamais muté ici.
 * - `pins` : `component.pins` (définitions de pins persistantes de
 *   l'instance) — PAS un état de signal résolu.
 * - `params` : paramètres EFFECTIFS résolus (`resolveComponentParameters`,
 *   mêmes defaults canoniques + overrides d'instance validés que
 *   `dcContributionRegistry.js`).
 * - `pinSignals` [A7-C3-PREQ2] : `{ pinId: Signal }`, les propres pins du
 *   composant PRÉ-résolues UNIQUEMENT depuis les sources DC et la topologie
 *   physique (`resolveSourceDrivenPinSignals`, resolution.js — AVANT toute
 *   conduction passive, sortie numérique calculée, Runtime ou résolution
 *   complète). Un contributeur qui a besoin de connaître l'état d'alimentation
 *   de son propre composant (ex. "VCC=HIGH et GND=LOW requis") le lit ici de
 *   façon générique — voir `soilMoistureSensorDigital` ci-dessous pour le
 *   premier exemple réel de ce patron.
 * - Retour : soit `null`/absence de sortie (composant présent dans le
 *   Registry mais rien à produire pour cet appel), soit une `Map<pinId,
 *   Signal>` — jamais un objet plain, pour rester cohérent avec le format
 *   `Map` déjà utilisé par `pinSignals`/`externalSignals` partout ailleurs
 *   dans `resolution.js`/`simulationRuntimeIntegration.js`.
 *
 * Aucun accès React/Canvas/Document/Scheduler/DOM/breadboard ici — cette
 * fonction est pure, synchrone, sans effet de bord, exactement comme
 * `dcContributionRegistry.js`.
 *
 * @typedef {(ctx: { component: object, pins: Array<object>, params: Record<string, number>, pinSignals: Record<string, string> }) => Map<string, string> | null} DigitalContributionFn
 */

import { Signal } from "./signals.js"

/**
 * A7-C3 — SOIL_MOISTURE_SENSOR : sortie numérique DO (§8 du ticket).
 *
 * Garde d'alimentation obligatoire (réutilise PREQ2, aucune seconde
 * résolution, aucune branche SOIL dans resolution.js/simulationRuntimeIntegration.js) :
 * un composant non alimenté, en polarité inversée, ou dont la source est en
 * conflit ne produit jamais de DO (pinSignals.VCC/GND ne sont jamais HIGH/LOW
 * simultanément dans ces trois cas — voir resolveSourceDrivenPinSignals).
 *
 * Contrat pédagogique verrouillé : MOISTURE < threshold -> DO HIGH ; MOISTURE
 * >= threshold -> DO LOW. Cette fonction ne relit JAMAIS environmentalStimuli
 * (interdit par §8 du ticket) et ne duplique pas la formule MOISTURE ->
 * analogRatio d'environmentalResponseRegistry.js : elle consomme uniquement
 * le paramètre EFFECTIF `analogRatio` déjà produit en amont (fallback
 * canonique, ou réponse MOISTURE) et en déduit localement le niveau
 * d'humidité correspondant (moisture = 1 - analogRatio, inverse exact et
 * autonome de la même relation bijective) pour appliquer le seuil.
 */
function soilMoistureSensorDigital({ params, pinSignals }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) return null
  const moisture = 1 - params.analogRatio
  return new Map([["DO", moisture < params.threshold ? Signal.HIGH : Signal.LOW]])
}

/**
 * A7-C4-PIR — PIR_MOTION_SENSOR : sortie numérique OUT (§10/§11 du ticket).
 *
 * Garde d'alimentation obligatoire (réutilise PREQ2, aucune seconde
 * résolution, aucune branche PIR dans resolution.js/simulationRuntimeIntegration.js) :
 * un module non alimenté, en polarité inversée, ou dont la source est en
 * conflit ne produit jamais de OUT (pinSignals.VCC/GND ne sont jamais HIGH/LOW
 * simultanément dans ces trois cas — voir resolveSourceDrivenPinSignals).
 *
 * Contrat verrouillé : motionDetected===1 -> OUT HIGH ; motionDetected===0 ->
 * OUT LOW. Cette fonction ne relit JAMAIS environmentalStimuli (interdit par
 * §10 du ticket) et ne recalcule jamais MOTION : elle consomme uniquement le
 * paramètre EFFECTIF `motionDetected` déjà produit en amont (fallback
 * canonique 0, ou réponse MOTION via environmentalResponseRegistry.js).
 */
function pirMotionSensorDigital({ params, pinSignals }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) return null
  return new Map([["OUT", params.motionDetected === 1 ? Signal.HIGH : Signal.LOW]])
}

/**
 * Fabrique un Registry isolé — même patron que `createSimulationRegistry`
 * (`simulationRegistry.js`) : permet à un test d'injecter une table de
 * contributions FIXTURE, sans jamais enregistrer de faux type de production
 * dans la table par défaut ni dans `canonicalRegistry.js` (§13 du ticket).
 *
 * @param {{ contributions?: Map<string, DigitalContributionFn> }} [options]
 */
export function createDigitalContributionRegistry({ contributions = new Map() } = {}) {
  const store = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))

  /** @param {string} type @returns {DigitalContributionFn | null} */
  function getDigitalContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasDigitalContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllDigitalContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getDigitalContribution, hasDigitalContribution, getAllDigitalContributionTypes }
}

/**
 * Registry de production — table vide en A7-C3-PREQ, première entrée réelle
 * ajoutée par A7-C3 (SOIL_MOISTURE_SENSOR), deuxième par A7-C4-PIR
 * (PIR_MOTION_SENSOR). Chaque futur ticket producteur ajoute UNE entrée ici,
 * sans jamais toucher `simulationRuntimeIntegration.js` ni `resolution.js`.
 */
const defaultRegistry = createDigitalContributionRegistry({
  contributions: new Map([
    ["SOIL_MOISTURE_SENSOR", soilMoistureSensorDigital],
    ["PIR_MOTION_SENSOR", pirMotionSensorDigital],
  ]),
})

export const getDigitalContribution = defaultRegistry.getDigitalContribution
export const hasDigitalContribution = defaultRegistry.hasDigitalContribution
export const getAllDigitalContributionTypes = defaultRegistry.getAllDigitalContributionTypes
