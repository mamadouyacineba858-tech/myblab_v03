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
 * A7-C2 — FORCE est une valeur normalisée [0,1] (0 = aucune force appliquée,
 * 1 = force maximale du capteur), même convention que LIGHT — pas une unité
 * physique (Newton) : aucune fiche technique de force réelle ne justifierait
 * une plage précise à ce niveau pédagogique, et LIGHT établit déjà ce même
 * choix de normalisation pour un stimulus dont seule la réponse RELATIVE
 * (extrémités + monotonie) importe (ticket §4). NaN/Infinity/-Infinity/
 * hors-borne/non-numérique sont rejetés, exactement comme LIGHT/TEMPERATURE.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidForceStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * A7-C2 — FLEX est une valeur normalisée [0,1] (0 = capteur à plat, 1 =
 * flexion maximale du capteur), même convention que FORCE/LIGHT ci-dessus.
 * FORCE et FLEX restent deux kinds SÉPARÉS (pas un kind MECHANICAL unifié) :
 * ce sont deux grandeurs physiques incompatibles — une pression appliquée
 * perpendiculairement à un FSR n'est pas la même grandeur qu'un rayon de
 * courbure appliqué le long d'un flex sensor, et leurs composants répondent
 * dans des directions opposées (force croissante -> résistance
 * décroissante ; flexion croissante -> résistance croissante, cf.
 * environmentalResponseRegistry.js) — les fusionner sous un seul kind
 * obligerait à réintroduire une branche par type pour savoir quelle
 * direction appliquer, exactement ce que le contrat générique A7-C0 interdit
 * (ticket §3). NaN/Infinity/-Infinity/hors-borne/non-numérique sont rejetés,
 * exactement comme les autres kinds.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidFlexStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * A7-C3 — MOISTURE est une valeur normalisée [0,1] (0 = sol sec, 1 = sol
 * humide/mouillé — convention verrouillée), même patron que FORCE/FLEX/LIGHT
 * ci-dessus : pas une unité physique, seule la réponse RELATIVE (extrémités +
 * monotonie) importe à ce niveau pédagogique. NaN/Infinity/-Infinity/
 * hors-borne/non-numérique sont rejetés, exactement comme les autres kinds.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidMoistureStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * A7-C4-PIR — MOTION est un contrat Level-1 STRICTEMENT BINAIRE (0 ou 1
 * numériques uniquement, §8 du ticket) — à la différence de LIGHT/FORCE/
 * FLEX/MOISTURE qui acceptent tout le continuum [0,1]. Aucune valeur
 * intermédiaire (0.5), hors-borne (-1, 2), booléenne, string, NaN ou
 * Infinity n'est acceptée : `typeof value === "number"` exclut déjà
 * booléens/strings ; l'égalité stricte à 0 ou 1 exclut le reste (une
 * comparaison `value === 0 || value === 1` est déjà `false` pour NaN/
 * Infinity, aucune garde Number.isFinite supplémentaire n'est donc
 * nécessaire, mais conservée pour rester lisible et symétrique aux autres
 * validateurs de ce fichier).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidMotionStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && (value === 0 || value === 1)
}

/**
 * A7-C4-TILT — TILT est, comme MOTION, un contrat Level-1 STRICTEMENT
 * BINAIRE (0 ou 1 numériques uniquement, §8 du ticket) : 0 = position
 * normale (aucune inclinaison détectée), 1 = inclinaison détectée. Aucune
 * valeur intermédiaire (0.5), hors-borne (-1, 2), booléenne, string, NaN ou
 * Infinity n'est acceptée — même garde que `isValidMotionStimulus`. TILT et
 * MOTION restent deux phénomènes pédagogiques DISTINCTS (§8 du ticket) :
 * kinds séparés, jamais réutilisés l'un pour l'autre, même si leur contrat
 * de validation est structurellement identique.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidTiltStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && (value === 0 || value === 1)
}

/**
 * Table déclarative kind -> définition. Chaque définition porte au minimum
 * `validate(value)`. Aucun moteur générique ne doit connaître cette table
 * par son contenu — seulement par ses clés (`getSupportedStimulusKinds`) et
 * son comportement (`isValidStimulusValue`). A7-C1 ajoute TEMPERATURE ici,
 * exactement comme prévu par A7-C0 : aucune autre modification n'est requise
 * dans `environmentalStimulus.js` pour que ce nouveau kind soit reconnu.
 * A7-C2 ajoute FORCE et FLEX sur le même principe. A7-C3 ajoute MOISTURE.
 * A7-C4-PIR ajoute MOTION (contrat binaire {0,1}, seul kind non-continu).
 * A7-C4-TILT ajoute TILT (contrat binaire {0,1}, second kind non-continu,
 * distinct de MOTION).
 */
const STIMULUS_DEFINITIONS = Object.freeze({
  LIGHT: Object.freeze({ validate: isValidLightStimulus }),
  TEMPERATURE: Object.freeze({ validate: isValidTemperatureStimulus }),
  FORCE: Object.freeze({ validate: isValidForceStimulus }),
  FLEX: Object.freeze({ validate: isValidFlexStimulus }),
  MOISTURE: Object.freeze({ validate: isValidMoistureStimulus }),
  MOTION: Object.freeze({ validate: isValidMotionStimulus }),
  TILT: Object.freeze({ validate: isValidTiltStimulus }),
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
