/**
 * A7-C0 — Environmental Stimulus Registry.
 *
 * Contrat déclaratif séparé de `environmentalResponseRegistry.js` (ticket
 * §7.4) : celui-ci répond à « quels stimulus kinds existent, et comment
 * leur valeur est validée » — jamais « quel composant répond à quel
 * stimulus » (ça reste dans `environmentalResponseRegistry.js`) ni « quelles
 * conséquences électriques » (ça reste dans `resolution.js`/
 * `dcContributionRegistry.js`).
 *
 * Ajouter un futur stimulus kind (TEMPERATURE, FORCE, MOISTURE, MOTION,
 * DISTANCE — A7-C1..A7-C5) se fait en ajoutant une entrée à
 * STIMULUS_DEFINITIONS ci-dessous. `environmentalStimulus.js` (le moteur
 * générique) lit cette table par clé et n'a donc jamais besoin d'une
 * branche `if (kind === "...")` supplémentaire (I-A7C0-08/I-A7C0-09/T29/T30).
 */

/**
 * LIGHT est une valeur normalisée [0,1] (jamais une valeur en lux).
 * NaN/Infinity/-Infinity/hors-borne/non-numérique sont explicitement
 * rejetés : une valeur invalide ne contamine jamais le calcul effectif,
 * elle est traitée comme « stimulus absent » pour ce kind (ENV-20).
 *
 * Exportée nommément (API historique préservée — consommée directement par
 * `useCircuitState.js` via `environmentalStimulus.js`, voir le re-export
 * dans ce dernier).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidLightStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * A7-C1 — TEMPERATURE est une valeur en degrés Celsius, bornée à la plage
 * opérationnelle réelle du premier (et seul, pour ce ticket) composant qui y
 * répond : TMP36 (datasheet Analog Devices, -40°C à +125°C — pas une plage
 * arbitraire choisie pour faire passer un test). NaN/Infinity/-Infinity/
 * hors-borne/non-numérique sont rejetés, exactement comme LIGHT : une valeur
 * invalide est traitée comme « stimulus absent » pour ce kind.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidTemperatureStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -40 && value <= 125
}

/**
 * Table déclarative kind -> définition. Chaque définition porte au minimum
 * `validate(value)`. Aucun moteur générique ne doit connaître cette table
 * par son contenu — seulement par ses clés (`getSupportedStimulusKinds`) et
 * son comportement (`isValidStimulusValue`). A7-C1 ajoute TEMPERATURE ici,
 * exactement comme prévu par A7-C0 : aucune autre modification n'est requise
 * dans `environmentalStimulus.js` pour que ce nouveau kind soit reconnu.
 */
const STIMULUS_DEFINITIONS = Object.freeze({
  LIGHT: Object.freeze({ validate: isValidLightStimulus }),
  TEMPERATURE: Object.freeze({ validate: isValidTemperatureStimulus }),
})

/**
 * @returns {string[]} Les stimulus kinds connus du contrat, dans un ordre
 *   stable. Utilisé par le moteur générique pour itérer sans jamais nommer
 *   un kind explicitement.
 */
export function getSupportedStimulusKinds() {
  return Object.keys(STIMULUS_DEFINITIONS)
}

/**
 * @param {string} kind
 * @returns {boolean}
 */
export function isKnownStimulusKind(kind) {
  return Object.prototype.hasOwnProperty.call(STIMULUS_DEFINITIONS, kind)
}

/**
 * @param {string} kind
 * @param {unknown} value
 * @returns {boolean} `false` pour tout kind inconnu (rejet défensif, T11) ou
 *   toute valeur que la définition du kind juge invalide.
 */
export function isValidStimulusValue(kind, value) {
  return isKnownStimulusKind(kind) ? STIMULUS_DEFINITIONS[kind].validate(value) : false
}
