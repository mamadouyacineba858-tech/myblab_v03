/**
 * PolarizedCapacitorModel — Modèle électrique d'un condensateur électrolytique
 * polarisé (FT-C-COMP-002).
 *
 * Modèle DC ÉTABLI uniquement, STRICTEMENT identique à CapacitorModel : I = 0,
 * circuit ouvert en régime permanent, quelle que soit la polarité. Un résultat
 * électriquement correct pour un condensateur idéal en régime continu, pas une
 * simplification arbitraire.
 *
 * HORS PÉRIMÈTRE (comme CAPACITOR) : charge / décharge, constante de temps RC,
 * transitoire, ESR, courant de fuite, température, tension de claquage,
 * destruction, modèle électrochimique. La polarité est conservée
 * STRUCTURELLEMENT (pins canoniques `plus` / `minus`) mais la détection
 * d'inversion et ses conséquences physiques ne sont pas modélisées ici.
 *
 * Le contrat déclaratif (parameterSchema `capacitance`, defaultParameters,
 * capabilities) est porté par le Registry canonique. La contribution au
 * solveur DC est portée par simulator/dcContributionRegistry.js
 * (`polarizedCapacitorDc`, qui réutilise le même chemin générique
 * « circuit ouvert deux bornes » que CAPACITOR).
 */

export const PolarizedCapacitorModel = {
  type: 'POLARIZED_CAPACITOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.capacitance !== 'number') return false
    if (!Number.isFinite(params.capacitance)) return false
    if (params.capacitance <= 0) return false
    return true
  },
}
