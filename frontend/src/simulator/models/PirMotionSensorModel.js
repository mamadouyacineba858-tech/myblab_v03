/**
 * PirMotionSensorModel — Modèle électrique du capteur de mouvement PIR
 * (A7-C4-PIR, module HC-SR501-style).
 *
 * Capteur numérique alimenté à 3 broches (VCC/OUT/GND), modélisé au niveau
 * de simulation actuel de MYBlab par un unique paramètre BINAIRE
 * `motionDetected` ∈ {0,1} (voir DECLARED_PARAMETER_SCHEMA.PIR_MOTION_SENSOR
 * dans canonicalRegistry.js) : 0 = aucun mouvement, 1 = mouvement détecté.
 * Aucune sortie analogique, aucun modèle de temps de réponse/retrigger/
 * sensibilité : hors périmètre Level-1 (voir §12 du ticket).
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que les autres modèles, adapté au domaine STRICTEMENT BINAIRE de
 * `motionDetected` (jamais une valeur intermédiaire, à la différence de
 * SoilMoistureSensorModel.analogRatio/threshold).
 *
 * La contribution numérique (alimentation VCC/GND requise, exposition de
 * OUT) est portée séparément par simulator/digitalContributionRegistry.js
 * (pirMotionSensorDigital). La production de `motionDetected` EFFECTIF à
 * partir du stimulus environnemental MOTION est portée par
 * environmentalResponseRegistry.js — aucune des deux logiques n'est
 * dupliquée ici. Aucune contribution DC : PIR ne fournit aucune sortie
 * analogique (§12 du ticket).
 */

export const PirMotionSensorModel = {
  type: 'PIR_MOTION_SENSOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.motionDetected !== 'number') return false
    if (!Number.isFinite(params.motionDetected)) return false
    if (params.motionDetected !== 0 && params.motionDetected !== 1) return false
    return true
  },
}
