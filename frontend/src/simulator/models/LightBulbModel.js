/**
 * LightBulbModel — Modèle électrique d'une ampoule (A6-OUT2).
 *
 * A6-OUT2 : au niveau de simulation actuel de MYBlab, une ampoule est
 * modélisée comme une charge résistive DC simple à deux bornes, NON
 * polarisée (même niveau de simplification que ResistorModel/LdrModel/
 * ThermistorModel/DcMotorModel/VibrationMotorModel). Aucun modèle
 * thermique, aucune non-linéarité tungstène, aucun vieillissement de
 * filament, aucun claquage, aucun modèle spectral : hors périmètre — voir
 * DECLARED_PARAMETER_SCHEMA.LIGHT_BULB dans canonicalRegistry.js.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — le même contrat, avec le même
 * corps de validation, que ResistorModel/DcMotorModel/VibrationMotorModel
 * (déjà dupliqué littéralement entre ces fichiers dans ce dépôt ; ce module
 * suit la même convention établie plutôt que d'introduire un mécanisme de
 * partage inédit pour cette seule couche de validation).
 *
 * La contribution au solveur DC — la physique réelle (I = U / R) — est
 * portée séparément par simulator/dcContributionRegistry.js, où LIGHT_BULB
 * réutilise LITTÉRALEMENT la même fonction de contribution que RESISTOR
 * (resistorDc) : aucune physique n'est dupliquée nulle part.
 */

export const LightBulbModel = {
  type: 'LIGHT_BULB',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
