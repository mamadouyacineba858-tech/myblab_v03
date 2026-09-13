import { getEnvironmentalResponse } from "./environmentalResponseRegistry.js"

/**
 * MB-L1-ENV-001 — Environmental Stimulus Foundation (LIGHT -> LDR).
 *
 * Primitive centrale et pure gouvernant la production des paramètres
 * électriques EFFECTIFS d'un circuit soumis à un stimulus environnemental
 * (ticket §7/§ENV-15) :
 *
 *   persistent component parameters + environmental stimulus
 *        ↓
 *   applyEnvironmentalStimuli()  ← ce fichier
 *        ↓
 *   effective components (mêmes composants, `parameters` éventuellement
 *   remplacés pour les seuls types concernés)
 *
 * Consommée à l'identique par Simulation live
 * (`simulationRuntimeIntegration.js`), Observation (`observationContract.js`)
 * et, par transitivité, Observation temporelle et Measurement (ENV-16/
 * ENV-17) : une seule primitive, jamais une seconde formule.
 *
 * Non-mutation stricte (ENV-03, GATE E3) : `components`, chacun de ses
 * éléments et `component.parameters` ne sont jamais modifiés en place —
 * seuls des objets/tableau NEUFS sont produits pour les composants
 * effectivement concernés par un effet environnemental. Sans stimulus
 * valide, la MÊME référence de tableau `components` est retournée (§6 du
 * ticket) : aucun clone n'est jamais nécessaire dans ce cas, ce qui
 * préserve GATE 0 (`runSimulationWithRuntime`) et le comportement
 * historique sans environnement (ENV-18).
 *
 * Aucune horloge (ENV-04/ENV-05), aucun Runtime Arduino (ENV-08/ENV-09),
 * aucun import de `core/`/`history/`/`bridge/` (ENV-01/ENV-02/ENV-03) :
 * ce module n'importe que le Registry environnemental dédié.
 */

const SUPPORTED_STIMULUS_KINDS = Object.freeze(["LIGHT"])

/**
 * LIGHT est une valeur normalisée [0,1] (ticket §4) — jamais une valeur en
 * lux. NaN/Infinity/-Infinity/hors-borne/non-numérique sont explicitement
 * rejetés ici (ENV-20) : une valeur invalide ne contamine jamais le calcul
 * effectif, elle est simplement traitée comme « stimulus absent » pour ce
 * kind (§4 : « doivent être rejetées ou ignorées défensivement selon la
 * frontière appelée »).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidLightStimulus(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

function isValidStimulusValue(kind, value) {
  if (kind === "LIGHT") return isValidLightStimulus(value)
  return false
}

/**
 * @param {unknown} environmentalStimuli
 * @returns {boolean} `true` si au moins un stimulus supporté porte une
 *   valeur valide — condition nécessaire et suffisante pour qu'un composant
 *   puisse être affecté.
 */
function hasAnyValidStimulus(environmentalStimuli) {
  if (!environmentalStimuli || typeof environmentalStimuli !== "object") return false
  return SUPPORTED_STIMULUS_KINDS.some((kind) => isValidStimulusValue(kind, environmentalStimuli[kind]))
}

/**
 * Ne conserve, dans l'objet stimulus transmis au Registry, que les entrées
 * valides — une clé invalide (NaN, hors-borne, etc.) n'atteint jamais
 * `respond()` (défense en profondeur, en plus de `hasAnyValidStimulus`
 * ci-dessus qui décide déjà si `applyEnvironmentalStimuli` a quoi que ce
 * soit à faire).
 */
function sanitizeStimuli(environmentalStimuli) {
  const sanitized = {}
  for (const kind of SUPPORTED_STIMULUS_KINDS) {
    if (isValidStimulusValue(kind, environmentalStimuli[kind])) sanitized[kind] = environmentalStimuli[kind]
  }
  return sanitized
}

/**
 * Point d'entrée public unique (ticket §7).
 *
 * @param {Array<{uid: string, type: string, parameters?: Record<string, number>}>} components
 *   Composants de Simulation (mêmes objets que consommés par
 *   `resolveComponentParameters`/`getDcContribution` — voir resolution.js).
 * @param {{LIGHT?: number}|null|undefined} environmentalStimuli
 *   État environnemental volatile (ticket §13). `null`/`undefined`/absence
 *   de stimulus valide -> no-op strict (ENV-18).
 * @returns {Array<object>} Les MÊMES composants (même référence de tableau)
 *   si aucun stimulus valide n'est actif ou si aucun composant du circuit
 *   n'est concerné ; sinon un NOUVEAU tableau où seuls les composants
 *   affectés sont remplacés par une copie superficielle dont `parameters`
 *   porte les overrides environnementaux (ENV-24 : la connaissance du type
 *   concerné reste entièrement dans `environmentalResponseRegistry.js`).
 */
export function applyEnvironmentalStimuli(components, environmentalStimuli) {
  if (!Array.isArray(components)) return components
  if (!hasAnyValidStimulus(environmentalStimuli)) return components

  const stimuli = sanitizeStimuli(environmentalStimuli)
  let changed = false

  const next = components.map((component) => {
    if (!component || typeof component !== "object") return component

    const response = getEnvironmentalResponse(component.type)
    if (!response || !(response.stimulus in stimuli)) return component

    const overrides = response.respond(stimuli)
    if (!overrides || typeof overrides !== "object") return component

    changed = true
    return { ...component, parameters: { ...component.parameters, ...overrides } }
  })

  return changed ? next : components
}
