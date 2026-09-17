/**
 * TiltSensorModel — Modèle électrique du capteur d'inclinaison (A7-C4-TILT,
 * module SW-520D-style).
 *
 * Capteur numérique à DEUX broches (DO/GND — le pack Founder PASS approuvé
 * n'expose aucune broche VCC, §0/§7 du ticket), modélisé au niveau de
 * simulation actuel de MYBlab par un unique paramètre BINAIRE `tiltDetected`
 * ∈ {0,1} (voir DECLARED_PARAMETER_SCHEMA.TILT_SENSOR dans
 * canonicalRegistry.js) : 0 = position normale, 1 = inclinaison détectée.
 * Aucune sortie analogique, aucun modèle de rebond mécanique/hystérésis de
 * bille : hors périmètre Level-1 (voir §12 du ticket).
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que PirMotionSensorModel, adapté au domaine STRICTEMENT BINAIRE de
 * `tiltDetected`.
 *
 * La contribution numérique (garde d'alimentation basée uniquement sur GND
 * réel — aucune broche VCC à garder, §11 du ticket — exposition de DO) est
 * portée séparément par simulator/digitalContributionRegistry.js
 * (tiltSensorDigital). La production de `tiltDetected` EFFECTIF à partir du
 * stimulus environnemental TILT est portée par environmentalResponseRegistry.js
 * — aucune des deux logiques n'est dupliquée ici. Aucune contribution DC :
 * TILT_SENSOR ne fournit aucune sortie analogique (§12 du ticket).
 */

export const TiltSensorModel = {
  type: 'TILT_SENSOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.tiltDetected !== 'number') return false
    if (!Number.isFinite(params.tiltDetected)) return false
    if (params.tiltDetected !== 0 && params.tiltDetected !== 1) return false
    return true
  },
}
