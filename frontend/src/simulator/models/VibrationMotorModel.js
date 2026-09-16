/**
 * VibrationMotorModel — Modèle électrique d'un moteur à vibration (A6-OUT1).
 *
 * A6-OUT1 : réutilisation du modèle ÉLECTRIQUE DC SIMPLIFIÉ à résistance fixe
 * de la famille DC_MOTOR (même niveau de simplification que
 * DcMotorModel/LdrModel/ThermistorModel — voir DcMotorModel.js). Ne modélise
 * aucun comportement mécanique : vitesse, couple, inertie, force
 * contre-électromotrice dynamique et commande PWM sont hors périmètre — voir
 * DECLARED_PARAMETER_SCHEMA.VIBRATION_MOTOR dans canonicalRegistry.js.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — le même contrat que
 * DcMotorModel/LdrModel/ThermistorModel, avec le même corps de validation
 * (déjà dupliqué littéralement entre ces trois fichiers dans ce dépôt ; ce
 * module suit la même convention établie plutôt que d'introduire un
 * mécanisme de partage inédit pour cette seule couche de validation).
 *
 * La contribution au solveur DC — la physique réelle (I = U / R) — est
 * portée séparément par simulator/dcContributionRegistry.js, où
 * VIBRATION_MOTOR réutilise LITTÉRALEMENT la même fonction de contribution
 * que DC_MOTOR (dcMotorDc) : aucune physique n'est dupliquée nulle part.
 */

export const VibrationMotorModel = {
  type: 'VIBRATION_MOTOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
