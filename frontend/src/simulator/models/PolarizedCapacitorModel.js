/**
 * PolarizedCapacitorModel — modèle électrique d'un condensateur électrolytique.
 *
 * MB-SIM-008 v2 : modèle DC établi uniquement (I = 0, circuit ouvert en régime
 * permanent). La polarité est conservée comme propriété physique/présentation;
 * le comportement transitoire reste hors périmètre.
 */

export const PolarizedCapacitorModel = {
  type: 'CAPACITOR_POLARIZED',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.capacitance !== 'number') return false
    if (!Number.isFinite(params.capacitance)) return false
    if (params.capacitance <= 0) return false
    return true
  },
}
