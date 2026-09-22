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
 *   composant dans le contexte digital du round courant : sources DC,
 *   autorités Runtime/temporelles déjà produites pour le step et sorties
 *   stateless du round précédent, propagées sur les nets physiques. La
 *   composition A9-LOGIC-PREQ réévalue cette fonction pure jusqu'à stabilité,
 *   AVANT toute conduction passive ou résolution électrique complète.
 *   Aucun résultat ni état privé ne doit persister entre ces évaluations.
 *   Un contributeur qui a besoin de connaître l'état d'alimentation
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
 * A7-C4-TILT — TILT_SENSOR : sortie numérique DO (§10/§11/§12 du ticket).
 *
 * Audit électrique §11 du ticket : le pack Founder PASS approuvé pour ce
 * module n'expose QUE deux broches visibles, DO/GND (aucune VCC — voir
 * canonicalRegistry.js). La garde d'alimentation de SOIL_MOISTURE_SENSOR/
 * PIR_MOTION_SENSOR ci-dessus exige VCC=HIGH ET GND=LOW ; ce contrat à trois
 * broches ne s'applique PAS ici tel quel, et l'inventer reviendrait à ajouter
 * une broche VCC fictive — interdit explicitement par le ticket. L'architecture
 * générique existante (pinSignals résolus par resolveSourceDrivenPinSignals,
 * resolution.js — protégé, non modifié) permet néanmoins une garde propre à
 * deux bornes SANS aucune broche fictive : GND est une broche RÉELLE de ce
 * composant (role 'ground', canonicalRegistry.js), et pinSignals.GND n'est
 * jamais LOW tant que cette broche n'est pas effectivement raccordée, par la
 * topologie physique du circuit (fil/breadboard), à la référence de masse
 * d'une source DC réelle (POWER/BATTERY GND) — exactement le même mécanisme
 * de seeding/propagation par nets que la garde VCC/GND ci-dessus, restreint à
 * la SEULE broche que ce module possède réellement. Un module non raccordé
 * (GND flottant, UNKNOWN) ou dont GND serait accidentellement relié à une
 * borne HIGH ne produit donc jamais de DO (résolution RÉELLE, aucune seconde
 * résolution, aucune branche TILT_SENSOR dans resolution.js/
 * simulationRuntimeIntegration.js).
 *
 * Contrat pédagogique verrouillé : tiltDetected===1 -> DO HIGH ;
 * tiltDetected===0 -> DO LOW. Cette fonction ne relit JAMAIS
 * environmentalStimuli (interdit par §10 du ticket) et ne recalcule jamais
 * TILT : elle consomme uniquement le paramètre EFFECTIF `tiltDetected` déjà
 * produit en amont (fallback canonique 0, ou réponse TILT via
 * environmentalResponseRegistry.js).
 */
function tiltSensorDigital({ params, pinSignals }) {
  if (pinSignals.GND !== Signal.LOW) return null
  return new Map([["DO", params.tiltDetected === 1 ? Signal.HIGH : Signal.LOW]])
}

/**
 * A7-C4-IR — IR_RECEIVER : sortie numérique SIGNAL, logique ACTIVE-LOW
 * (§12/§13/§14 du ticket).
 *
 * Garde d'alimentation obligatoire (réutilise PREQ2, même patron exact que
 * soilMoistureSensorDigital/pirMotionSensorDigital ci-dessus — aucune
 * seconde résolution, aucune branche IR_RECEIVER dans resolution.js/
 * simulationRuntimeIntegration.js) : un module non alimenté, en polarité
 * inversée, ou dont la source est en conflit ne produit jamais de SIGNAL
 * (pinSignals.VCC/GND ne sont jamais HIGH/LOW simultanément dans ces trois
 * cas — voir resolveSourceDrivenPinSignals).
 *
 * Contrat pédagogique verrouillé, ACTIVE-LOW (le TSOP4838-style réel inverse
 * sa sortie, §12 du ticket) : infraredDetected===1 -> SIGNAL LOW (signal IR
 * détecté) ; infraredDetected===0 -> SIGNAL HIGH (aucun signal IR détecté).
 * Cette fonction ne relit JAMAIS environmentalStimuli (interdit par §12 du
 * ticket) et ne recalcule jamais INFRARED : elle consomme uniquement le
 * paramètre EFFECTIF `infraredDetected` déjà produit en amont (fallback
 * canonique 0, ou réponse INFRARED via environmentalResponseRegistry.js).
 */
function irReceiverDigital({ params, pinSignals }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) return null
  return new Map([["SIGNAL", params.infraredDetected === 1 ? Signal.LOW : Signal.HIGH]])
}

/**
 * A9-AND: LOW is decisive even when the other input is undetermined.
 * Otherwise both inputs must be HIGH. As in existing contributors, null
 * means no driven output: generic resolution preserves the unknown net.
 * FLOATING is not a logic level and is never coerced to HIGH or LOW.
 */
function andGateDigital({ pinSignals }) {
  if (pinSignals.A === Signal.LOW || pinSignals.B === Signal.LOW) {
    return new Map([["Q", Signal.LOW]])
  }
  if (pinSignals.A === Signal.HIGH && pinSignals.B === Signal.HIGH) {
    return new Map([["Q", Signal.HIGH]])
  }
  return null
}

/**
 * A9-OR: HIGH is decisive, symmetrically to AND's decisive LOW.
 * Otherwise both inputs must be LOW. Undetermined inputs produce no drive;
 * the existing fixed-point propagation and resolution preserve UNKNOWN.
 */
function orGateDigital({ pinSignals }) {
  if (pinSignals.A === Signal.HIGH || pinSignals.B === Signal.HIGH) {
    return new Map([["Q", Signal.HIGH]])
  }
  if (pinSignals.A === Signal.LOW && pinSignals.B === Signal.LOW) {
    return new Map([["Q", Signal.LOW]])
  }
  return null
}

/**
 * A9-NAND: NAND is the logical negation of AND, so a decisive LOW on either
 * input is enough to establish Q=HIGH regardless of the other input's value
 * (including UNKNOWN/FLOATING). Only when both inputs are decisively HIGH is
 * Q=LOW. Any other combination produces no drive; the existing fixed-point
 * propagation and resolution preserve UNKNOWN. FLOATING is not a logic level
 * and is never coerced to HIGH or LOW.
 */
function nandGateDigital({ pinSignals }) {
  if (pinSignals.A === Signal.LOW || pinSignals.B === Signal.LOW) {
    return new Map([["Q", Signal.HIGH]])
  }
  if (pinSignals.A === Signal.HIGH && pinSignals.B === Signal.HIGH) {
    return new Map([["Q", Signal.LOW]])
  }
  return null
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
    ["TILT_SENSOR", tiltSensorDigital],
    ["IR_RECEIVER", irReceiverDigital],
    ["AND_GATE", andGateDigital],
    ["OR_GATE", orGateDigital],
    ["NAND_GATE", nandGateDigital],
  ]),
})

export const getDigitalContribution = defaultRegistry.getDigitalContribution
export const hasDigitalContribution = defaultRegistry.hasDigitalContribution
export const getAllDigitalContributionTypes = defaultRegistry.getAllDigitalContributionTypes
