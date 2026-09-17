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
 * A7-C1 — TMP36 : sortie analogique linéaire standard (datasheet Analog
 * Devices) Vout = 0.5 V + 0.01 V/°C × T. Aux bornes de la plage validée par
 * `environmentalStimulusRegistry.js` ([-40, 125] °C), cette formule produit
 * EXACTEMENT les bornes canoniques `outputVoltage` de TMP36 dans
 * `canonicalRegistry.js` (0.1 V / 1.75 V) — aucune borne dupliquée ici,
 * aucun clamp nécessaire : la plage de stimulus valide et la plage de sortie
 * canonique sont dérivées de la même relation physique.
 *
 * Ce Registry ne fait ici, comme pour LDR, que produire le paramètre
 * EFFECTIF `outputVoltage` : `dcContributionRegistry.js` reste seul
 * responsable de la conséquence électrique (tension/courant exposés à
 * Observation/Measurement), et seulement si TMP36 est alimenté (+Vs/GND).
 */
function tmp36TemperatureResponse(stimuli) {
  const { TEMPERATURE: celsius } = stimuli
  return { outputVoltage: 0.5 + 0.01 * celsius }
}

/**
 * A7-C2 — FORCE_SENSOR (FSR) : même patron que `ldrLightResponse` ci-dessus
 * (interpolation logarithmique entre les bornes canoniques de `resistance`,
 * strictement monotone décroissante) — physiquement cohérent avec un FSR
 * réel : une force croissante fait chuter la résistance de la couche
 * sensible, du même ordre de grandeur qu'un éclairement croissant fait
 * chuter la résistance d'une LDR (ticket §4).
 *
 *   R(force) = Rmax * (Rmin / Rmax) ^ force
 *
 * force = 0 -> Rmax (aucune force) ; force = 1 -> Rmin (force maximale) ;
 * les deux bornes sont retournées exactement, sans passer par `Math.pow`,
 * pour les mêmes raisons de précision flottante que `ldrLightResponse`.
 */
function forceSensorForceResponse(stimuli) {
  const bounds = resistanceBounds("FORCE_SENSOR", "resistance")
  if (!bounds) return null
  const { minimum: rMin, maximum: rMax } = bounds
  const { FORCE: force } = stimuli
  if (force === 0) return { resistance: rMax }
  if (force === 1) return { resistance: rMin }
  return { resistance: rMax * Math.pow(rMin / rMax, force) }
}

/**
 * A7-C2 — FLEX_SENSOR : modèle pédagogique V1 simple et déterministe (ticket
 * §5, sans hystérésis ni dynamique de fatigue matériau) — interpolation
 * LINÉAIRE entre les bornes canoniques de `resistance`, strictement monotone
 * CROISSANTE (sens opposé à FORCE/LIGHT ci-dessus) : un flex sensor résistif
 * classique voit sa résistance AUGMENTER avec la flexion, à la différence
 * d'un FSR dont la résistance diminue sous la force.
 *
 *   R(flex) = Rmin + (Rmax - Rmin) * flex
 *
 * flex = 0 -> Rmin (à plat) ; flex = 1 -> Rmax (flexion maximale) ; les deux
 * bornes sont retournées exactement (la formule linéaire ne souffre pas de
 * l'imprécision flottante du couple division/puissance utilisé pour
 * FORCE/LIGHT, mais les cas 0/1 restent explicites pour rester symétriques
 * et immédiatement lisibles).
 */
function flexSensorFlexResponse(stimuli) {
  const bounds = resistanceBounds("FLEX_SENSOR", "resistance")
  if (!bounds) return null
  const { minimum: rMin, maximum: rMax } = bounds
  const { FLEX: flex } = stimuli
  if (flex === 0) return { resistance: rMin }
  if (flex === 1) return { resistance: rMax }
  return { resistance: rMin + (rMax - rMin) * flex }
}

/**
 * A7-C3 — SOIL_MOISTURE_SENSOR : produit UNIQUEMENT le paramètre EFFECTIF
 * `analogRatio` (§6 du ticket) — aucun calcul électrique, aucune sortie
 * HIGH/LOW ici (ça reste dcContributionRegistry.js/digitalContributionRegistry.js).
 *
 *   analogRatio = 1 - MOISTURE
 *
 * MOISTURE = 0 (sol sec) -> analogRatio = 1 ; MOISTURE = 1 (sol saturé) ->
 * analogRatio = 0 ; strictement monotone décroissante, linéaire (contrat
 * verrouillé §5 du ticket, pas un choix logarithmique comme LIGHT/LDR ou
 * FORCE_SENSOR — l'inversion demandée est une simple complémentation [0,1],
 * aucune bornes canoniques externes à consulter ici, à la différence de
 * `resistanceBounds` ci-dessus).
 */
function soilMoistureSensorMoistureResponse(stimuli) {
  const { MOISTURE: moisture } = stimuli
  return { analogRatio: 1 - moisture }
}

/**
 * A7-C4-PIR — PIR_MOTION_SENSOR : produit UNIQUEMENT le paramètre EFFECTIF
 * `motionDetected` (§9 du ticket) — passage direct (identité), aucun calcul,
 * aucune sortie HIGH/LOW ici (ça reste digitalContributionRegistry.js, seule
 * responsable de la conséquence électrique OUT — §10/§12 du ticket, PIR n'a
 * d'ailleurs aucune contribution DC).
 *
 *   motionDetected = MOTION
 *
 * MOTION ∈ {0,1} déjà (contrat binaire verrouillé par
 * environmentalStimulusRegistry.js), donc `motionDetected` hérite du même
 * domaine sans transformation.
 */
function pirMotionSensorMotionResponse(stimuli) {
  const { MOTION: motion } = stimuli
  return { motionDetected: motion }
}

/**
 * A7-C4-TILT — TILT_SENSOR : produit UNIQUEMENT le paramètre EFFECTIF
 * `tiltDetected` (§8 du ticket) — passage direct (identité), aucun calcul,
 * aucune sortie HIGH/LOW ici (ça reste digitalContributionRegistry.js, seule
 * responsable de la conséquence électrique DO — §10/§12 du ticket, TILT_SENSOR
 * n'a d'ailleurs aucune contribution DC). Même patron exact que
 * `pirMotionSensorMotionResponse` ci-dessus, sur le kind TILT (distinct de
 * MOTION, §8 du ticket : deux phénomènes pédagogiques séparés).
 *
 *   tiltDetected = TILT
 *
 * TILT ∈ {0,1} déjà (contrat binaire verrouillé par
 * environmentalStimulusRegistry.js), donc `tiltDetected` hérite du même
 * domaine sans transformation.
 */
function tiltSensorTiltResponse(stimuli) {
  const { TILT: tilt } = stimuli
  return { tiltDetected: tilt }
}

/**
 * A7-C4-IR — IR_RECEIVER : produit UNIQUEMENT le paramètre EFFECTIF
 * `infraredDetected` (§11 du ticket) — passage direct (identité), aucun
 * calcul, aucune sortie HIGH/LOW ici (ça reste digitalContributionRegistry.js,
 * seule responsable de la conséquence électrique SIGNAL en logique
 * active-low — §12 du ticket, IR_RECEIVER n'a d'ailleurs aucune contribution
 * DC). Même patron exact que `tiltSensorTiltResponse`/
 * `pirMotionSensorMotionResponse` ci-dessus, sur le kind INFRARED (distinct
 * de LIGHT/MOTION/TILT, §10 du ticket : phénomènes pédagogiques séparés).
 *
 *   infraredDetected = INFRARED
 *
 * INFRARED ∈ {0,1} déjà (contrat binaire verrouillé par
 * environmentalStimulusRegistry.js), donc `infraredDetected` hérite du même
 * domaine sans transformation.
 */
function irReceiverInfraredResponse(stimuli) {
  const { INFRARED: infrared } = stimuli
  return { infraredDetected: infrared }
}

/**
 * A7-C5 — HC_SR04 : produit UNIQUEMENT le paramètre EFFECTIF `distanceCm`
 * (§9/§10 du ticket) — passage direct (identité), aucun calcul, aucune durée
 * ECHO ici (ça reste timedDigitalContributionRegistry.js, seule responsable
 * de la conséquence temporelle ECHO — §16/§20 du ticket, HC_SR04 n'a
 * d'ailleurs aucune contribution DC). Même patron que
 * `pirMotionSensorMotionResponse`/`tiltSensorTiltResponse` ci-dessus, mais
 * sur un domaine CONTINU [2,400] (DISTANCE) plutôt que binaire {0,1}.
 *
 *   distanceCm = DISTANCE
 *
 * DISTANCE ∈ [2,400] déjà (contrat verrouillé par
 * environmentalStimulusRegistry.js), donc `distanceCm` hérite du même
 * domaine sans transformation.
 */
function hcSr04DistanceResponse(stimuli) {
  const { DISTANCE: distance } = stimuli
  return { distanceCm: distance }
}

/**
 * Table déclarative type -> { stimulus, respond }. `respond(stimuli)` reçoit
 * le stimulus environnemental déjà validé (voir `environmentalStimulus.js`)
 * et retourne un objet d'overrides de paramètres, ou `null` si aucun effet
 * ne s'applique. `LDR` répond à `LIGHT` (ENV-21) ; A7-C1 ajoute `TMP36`
 * répondant à `TEMPERATURE`, sur le même principe déclaratif — aucune
 * modification d'`environmentalStimulus.js` n'a été nécessaire pour cela.
 * A7-C2 ajoute `FORCE_SENSOR` répondant à `FORCE` et `FLEX_SENSOR` répondant
 * à `FLEX`, sur le même principe déclaratif. `RESISTOR`/`THERMISTOR` et tout
 * autre type restent absents de cette table (ENV-22).
 */
const ENVIRONMENTAL_RESPONSES = Object.freeze({
  LDR: Object.freeze({ stimulus: "LIGHT", respond: ldrLightResponse }),
  TMP36: Object.freeze({ stimulus: "TEMPERATURE", respond: tmp36TemperatureResponse }),
  FORCE_SENSOR: Object.freeze({ stimulus: "FORCE", respond: forceSensorForceResponse }),
  FLEX_SENSOR: Object.freeze({ stimulus: "FLEX", respond: flexSensorFlexResponse }),
  SOIL_MOISTURE_SENSOR: Object.freeze({ stimulus: "MOISTURE", respond: soilMoistureSensorMoistureResponse }),
  PIR_MOTION_SENSOR: Object.freeze({ stimulus: "MOTION", respond: pirMotionSensorMotionResponse }),
  TILT_SENSOR: Object.freeze({ stimulus: "TILT", respond: tiltSensorTiltResponse }),
  IR_RECEIVER: Object.freeze({ stimulus: "INFRARED", respond: irReceiverInfraredResponse }),
  HC_SR04: Object.freeze({ stimulus: "DISTANCE", respond: hcSr04DistanceResponse }),
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
