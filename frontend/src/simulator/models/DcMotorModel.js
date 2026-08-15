/**
 * DcMotorModel — Modèle électrique d'un moteur à courant continu.
 *
 * MB-SIM-008 v2 : modèle ÉLECTRIQUE DC SIMPLIFIÉ à résistance fixe (même
 * niveau de simplification que LdrModel/ThermistorModel). Ne modélise
 * aucun comportement mécanique : vitesse, couple, inertie, force
 * contre-électromotrice dynamique et commande PWM sont hors périmètre de
 * MB-SIM-008 — voir DECLARED_PARAMETER_SCHEMA.DC_MOTOR dans
 * canonicalRegistry.js.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement de validation. La
 * contribution au solveur DC est portée séparément par
 * simulator/dcContributionRegistry.js.
 */

export const DcMotorModel = {
  type: 'DC_MOTOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
