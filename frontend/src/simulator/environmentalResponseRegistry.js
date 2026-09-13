import { getCanonicalEntry } from "./canonicalRegistry.js"

/**
 * MB-L1-ENV-001 — Registry environnemental.
 *
 * Association `component.type -> réponse environnementale`, sur le même
 * principe déclaratif que `dcContributionRegistry.js`/`canonicalRegistry.js` :
 * une seule table de lookup, jamais un `if (comp.type === "LDR")` dispersé
 * dans les consommateurs (Simulation live, Observation, Measurement,
 * `useCircuitState.js`) — c'est ici, et ici seulement, que vit la
 * connaissance « LDR répond à LIGHT » (§8/§24 du ticket).
 *
 * Ce Registry ne calcule NI courant, NI tension, NI propagation logique
 * (ENV-15/ENV-16 : c'est `dcContributionRegistry.js`/`resolution.js`, tous
 * deux inchangés et ignorants de LIGHT — ENV-10/ENV-11 — qui en restent
 * seuls responsables, à partir du paramètre `resistance` déjà produit ici).
 * Chaque réponse retourne uniquement un jeu de paramètres effectifs
 * (overrides), jamais un composant complet — la construction du composant
 * effectif est la responsabilité d'`environmentalStimulus.js`.
 *
 * Bornes canoniques : la réponse LDR lit `minimum`/`maximum` du paramètre
 * `resistance` directement depuis `canonicalRegistry.js` (getCanonicalEntry)
 * — 100 Ω / 10 000 000 Ω ne sont jamais recopiés ici (ENV-25).
 */

function resistanceBounds(type, key) {
  const entry = getCanonicalEntry(type)
  const paramDef = entry?.parameterSchema?.find((param) => param.key === key)
  if (!paramDef || typeof paramDef.minimum !== "number" || typeof paramDef.maximum !== "number") return null
  return { minimum: paramDef.minimum, maximum: paramDef.maximum }
}

/**
 * Modèle pédagogique V1 (ticket §5) : interpolation logarithmique entre les
 * bornes canoniques de `resistance`, strictement monotone décroissante.
 *
 *   R(light) = Rmax * (Rmin / Rmax) ^ light
 *
 * light = 0 -> Rmax ; light = 1 -> Rmin ; toute valeur intermédiaire est
 * strictement comprise entre les deux bornes. Les deux bornes elles-mêmes
 * sont retournées exactement (`rMax`/`rMin`, sans passer par `Math.pow`) :
 * l'aller-retour division/puissance en arithmétique flottante ne garantit
 * pas `rMax * Math.pow(rMin / rMax, 1) === rMin` bit à bit (GATE E2 exige
 * l'égalité exacte aux deux bornes) — seule la zone STRICTEMENT
 * intermédiaire (0 < light < 1) passe par la formule générale.
 */
function ldrLightResponse(stimuli) {
  const bounds = resistanceBounds("LDR", "resistance")
  if (!bounds) return null
  const { minimum: rMin, maximum: rMax } = bounds
  const { LIGHT: light } = stimuli
  if (light === 0) return { resistance: rMax }
  if (light === 1) return { resistance: rMin }
  return { resistance: rMax * Math.pow(rMin / rMax, light) }
}

/**
 * Table déclarative type -> { stimulus, respond }. `respond(stimuli)` reçoit
 * le stimulus environnemental déjà validé (voir `environmentalStimulus.js`)
 * et retourne un objet d'overrides de paramètres, ou `null` si aucun effet
 * ne s'applique. Pour ce ticket, seul `LDR` répond à `LIGHT` (ENV-21) ;
 * `RESISTOR`/`THERMISTOR` et tout autre type restent absents de cette table
 * (ENV-22).
 */
const ENVIRONMENTAL_RESPONSES = Object.freeze({
  LDR: Object.freeze({ stimulus: "LIGHT", respond: ldrLightResponse }),
})

/**
 * @param {string} type
 * @returns {{ stimulus: string, respond: (stimuli: object) => (Record<string, number>|null) } | null}
 */
export function getEnvironmentalResponse(type) {
  if (typeof type !== "string") return null
  return Object.prototype.hasOwnProperty.call(ENVIRONMENTAL_RESPONSES, type)
    ? ENVIRONMENTAL_RESPONSES[type]
    : null
}
