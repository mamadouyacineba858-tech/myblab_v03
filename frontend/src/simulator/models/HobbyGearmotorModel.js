/**
 * HobbyGearmotorModel — Modèle électrique d'un motoréducteur hobby (A6-OUT3).
 *
 * A6-OUT3 : réutilisation du modèle ÉLECTRIQUE DC SIMPLIFIÉ à résistance fixe
 * de la famille DC_MOTOR (même niveau de simplification que
 * DcMotorModel/VibrationMotorModel/LdrModel/ThermistorModel). Ne modélise
 * aucun comportement mécanique : vitesse, couple, inertie, rapport de
 * réduction du réducteur, backlash, efficacité dépendante de la charge,
 * modèle thermique ou force contre-électromotrice dynamique sont hors
 * périmètre — voir DECLARED_PARAMETER_SCHEMA.HOBBY_GEARMOTOR dans
 * canonicalRegistry.js. Le réducteur jaune visible sur l'asset raster est
 * une propriété mécanique/visuelle du produit physique, pas un objet
 * simulé à ce niveau (Level 1).
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — le même contrat que
 * DcMotorModel/VibrationMotorModel/LdrModel/ThermistorModel, avec le même
 * corps de validation (déjà dupliqué littéralement entre ces fichiers dans
 * ce dépôt ; ce module suit la même convention établie plutôt que
 * d'introduire un mécanisme de partage inédit pour cette seule couche de
 * validation).
 *
 * La contribution au solveur DC — la physique réelle (I = U / R) — est
 * portée séparément par simulator/dcContributionRegistry.js, où
 * HOBBY_GEARMOTOR réutilise LITTÉRALEMENT la même fonction de contribution
 * que DC_MOTOR (dcMotorDc) : aucune physique n'est dupliquée nulle part,
 * aucun `hobbyGearmotorDc` ni solveur dédié n'existe.
 */

export const HobbyGearmotorModel = {
  type: 'HOBBY_GEARMOTOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
