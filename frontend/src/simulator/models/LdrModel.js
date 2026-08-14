/**
 * LdrModel — Modèle électrique d'une photorésistance (LDR).
 *
 * MB-SIM-008 : modèle DC SIMPLIFIÉ à résistance fixe. Ne modélise pas la
 * dépendance réelle d'une LDR à la lumière — aucune grandeur environnementale
 * (éclairement) n'est représentée dans ce dépôt. Ce modèle ne fait que
 * fournir une valeur de résistance constante, au même titre qu'une
 * résistance classique, pour permettre à computeDcAnalysis() de produire un
 * résultat DC pour ce type de composant.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement exécutable.
 */

export const LdrModel = {
  type: 'LDR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
