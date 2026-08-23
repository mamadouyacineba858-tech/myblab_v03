import { observe, ObservationStatus, ObservationQuantity } from "../observation/observationContract.js"

/**
 * MB-MEASURE-001 — Reference Measurement Instrument.
 *
 * Adaptateur mince entre un instrument de mesure utilisateur et le contrat
 * `MB-OBS-001` déjà en production :
 *
 *   Presentation / Instrument
 *        ↓
 *   Measurement           ← ce module
 *        ↓
 *   Observation Contract  (observe(), observationContract.js)
 *        ↓
 *   Simulation
 *
 * Conformément au Ticket (`docs/pmo/tickets/MB-MEASURE-001.md`, §A/§B/§L) et
 * à son Blueprint (`docs/pmo/blueprints/MB-MEASURE-001-reference-measurement-instrument-blueprint.md`,
 * §H) :
 *
 * - ce module n'importe QUE les exports publics d'`observationContract.js`
 *   (`observe`, `ObservationStatus`, `ObservationQuantity`) — jamais
 *   `resolveSignals()`, `dcAnalysis`, `pinSignals`, `dcContributionRegistry`
 *   ou `canonicalRegistry` directement ;
 * - il ne possède AUCUNE logique physique propre : il ne recalcule jamais
 *   une tension ou un courant, ne dérive jamais l'un de l'autre, et ne
 *   modifie ni la convention de signe du courant ni la référence de tension
 *   déjà établies par `MB-OBS-001` ;
 * - il n'introduit aucune seconde horloge (`time` est un champ de la
 *   requête, jamais généré ici) ;
 * - il ne mute jamais le Document : `measure()` est une fonction pure qui
 *   lit `(components, wires)` sans les modifier et ne persiste rien.
 *
 * La seule responsabilité propre à Measurement (non déléguée à Observation)
 * est la restriction de la surface V1 aux deux modes utilisateur autorisés
 * par le Ticket §C : `VOLTAGE` et `CURRENT`. `LOGICAL_STATE`, bien que
 * supporté par `MB-OBS-001`, n'est pas un mode de mesure V1 et est rejeté
 * en `INVALID` par ce module, exactement comme tout autre mode inconnu —
 * aucune nouvelle catégorie de statut n'est créée (§8 de la mission
 * d'implémentation, §I du Ticket).
 *
 * Toute autre validation (target malformé/inconnu, target kind non
 * supporté, quantité indisponible) est déléguée intégralement à
 * `observe()` : Measurement ne duplique aucune de ces règles (AC-13).
 */

/** Modes de mesure supportés en V1 (Ticket §C, Blueprint §D). */
export const MeasurementMode = Object.freeze({
  VOLTAGE: ObservationQuantity.VOLTAGE,
  CURRENT: ObservationQuantity.CURRENT,
})

/** Statuts de résultat — réutilisation exacte de MB-OBS-001, aucune nouvelle
 * catégorie (Ticket §I : « Measurement reuses the status vocabulary already
 * established by MB-OBS-001, without redefining it »). */
export const MeasurementStatus = ObservationStatus

function isSupportedMode(mode) {
  return mode === MeasurementMode.VOLTAGE || mode === MeasurementMode.CURRENT
}

/**
 * Point d'entrée public unique de Measurement (miroir de `observe()`).
 *
 * @param {{ instrument?: string, mode: "VOLTAGE"|"CURRENT", target: { kind: "PIN"|"NET", componentUid: string, pinId: string }, time: number }} request
 * @param {Array<object>} components
 * @param {Array<object>} wires
 * @returns {{ target: object, quantity: string, value: *, unit: string|null, time: number|null, status: "VALID"|"UNAVAILABLE"|"INVALID", reason?: string }}
 */
export function measure(request, components, wires) {
  const mode = request && typeof request === "object" ? request.mode : undefined

  if (!isSupportedMode(mode)) {
    return {
      target: request && typeof request === "object" ? request.target ?? null : null,
      quantity: mode ?? null,
      value: null,
      unit: null,
      time: request && typeof request === "object" && typeof request.time === "number" ? request.time : null,
      status: MeasurementStatus.INVALID,
      reason: `unsupported measurement mode "${String(mode)}": MB-MEASURE-001 V1 supports only VOLTAGE and CURRENT`,
    }
  }

  // Traduction MeasurementRequest -> ObservationRequest : mode devient
  // quantity, target/time sont transmis tels quels. Aucune interprétation
  // supplémentaire — c'est observe() qui valide target/time et calcule.
  const observationRequest = {
    target: request.target,
    quantity: mode,
    time: request.time,
  }

  return observe(observationRequest, components, wires)
}
