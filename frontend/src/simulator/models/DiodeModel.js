/**
 * DiodeModel — Modèle électrique d'une diode.
 *
 * MB-SIM-008 v2 : modèle DC SIMPLIFIÉ à seuil de conduction. Ne modélise
 * pas la courbe I(V) réelle d'une diode (exponentielle de Shockley), ni sa
 * capacité de jonction, ni sa dynamique de commutation, ni ses effets
 * thermiques — voir DECLARED_PARAMETER_SCHEMA.DIODE dans canonicalRegistry.js
 * pour les bornes exactes de cette simplification.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement de validation. La
 * contribution au solveur DC (conduction/blocage selon la polarisation)
 * est portée séparément par simulator/dcContributionRegistry.js.
 */

export const DiodeModel = {
  type: 'DIODE',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.forwardVoltage !== 'number') return false
    if (!Number.isFinite(params.forwardVoltage)) return false
    if (params.forwardVoltage < 0) return false
    if (typeof params.onResistance !== 'number') return false
    if (!Number.isFinite(params.onResistance)) return false
    if (params.onResistance <= 0) return false
    return true
  },
}
