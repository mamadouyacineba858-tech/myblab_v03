/**
 * Tmp36Model — Modèle électrique du capteur de température TMP36 (A7-C1).
 *
 * Capteur analogique alimenté à 3 broches (+Vs/Vout/GND), modélisé au niveau
 * de simulation actuel de MYBlab comme une source de tension Vout dépendante
 * de la température (voir DECLARED_PARAMETER_SCHEMA.TMP36 dans
 * canonicalRegistry.js) : Vout = 0.5 V + 0.01 V/°C × T, valable sur la plage
 * datasheet -40°C..+125°C (Vout ∈ [0.1 V, 1.75 V]). Aucun modèle de bruit,
 * de temps de réponse thermique, de courant de repos ou de charge Vout :
 * hors périmètre — voir DECLARED_PARAMETER_SCHEMA.TMP36.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que PotentiometerModel (paramètre `position` dans [0,1]), adapté aux
 * bornes réelles de `outputVoltage`.
 *
 * La contribution au solveur DC (alimentation +Vs/GND requise, exposition de
 * Vout) est portée séparément par simulator/dcContributionRegistry.js
 * (tmp36Dc). La production de la tension EFFECTIVE à partir du stimulus
 * environnemental TEMPERATURE est portée par environmentalResponseRegistry.js
 * — aucune des deux logiques n'est dupliquée ici.
 */

export const Tmp36Model = {
  type: 'TMP36',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.outputVoltage !== 'number') return false
    if (!Number.isFinite(params.outputVoltage)) return false
    if (params.outputVoltage < 0.1 || params.outputVoltage > 1.75) return false
    return true
  },
}
