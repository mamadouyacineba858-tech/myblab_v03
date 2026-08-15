/**
 * CapacitorModel — Modèle électrique d'un condensateur.
 *
 * MB-SIM-008 v2 : modèle DC ÉTABLI uniquement (I = 0, circuit ouvert en
 * régime permanent) — un résultat électriquement correct pour un
 * condensateur idéal en régime continu, pas une simplification arbitraire.
 * Charge, décharge, constante de temps RC et tout comportement transitoire
 * dépendant du temps sont explicitement hors périmètre de MB-SIM-008 (voir
 * ADR-006 et DECLARED_PARAMETER_SCHEMA.CAPACITOR dans canonicalRegistry.js) :
 * ils appartiennent à une future analyse Transitoire, dépendante du
 * Scheduler de MB-SIM-009.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement de validation. La
 * contribution au solveur DC est portée séparément par
 * simulator/dcContributionRegistry.js.
 */

export const CapacitorModel = {
  type: 'CAPACITOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.capacitance !== 'number') return false
    if (!Number.isFinite(params.capacitance)) return false
    if (params.capacitance <= 0) return false
    return true
  },
}
