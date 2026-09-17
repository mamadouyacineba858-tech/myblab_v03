/**
 * IrReceiverModel — Modèle électrique du récepteur infrarouge (A7-C4-IR,
 * module TSOP4838-style 38 kHz).
 *
 * Capteur numérique à TROIS broches (SIGNAL/GND/VCC — le pack Founder PASS
 * approuvé expose ces trois connexions, §2/§5 du ticket), modélisé au
 * niveau de simulation actuel de MYBlab par un unique paramètre BINAIRE
 * `infraredDetected` ∈ {0,1} (voir DECLARED_PARAMETER_SCHEMA.IR_RECEIVER
 * dans canonicalRegistry.js) : 0 = aucun signal IR 38 kHz détecté, 1 =
 * signal IR 38 kHz détecté. Aucun décodage protocole (NEC/RC5), aucun
 * timing de burst, aucune porteuse 38 kHz réelle, aucune AGC/démodulation
 * analogique : hors périmètre Level-1 (voir §16 du ticket).
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que PirMotionSensorModel/TiltSensorModel, adapté au domaine STRICTEMENT
 * BINAIRE de `infraredDetected`.
 *
 * La contribution numérique (garde d'alimentation VCC/GND réelle, PREQ2 —
 * exposition de SIGNAL en logique ACTIVE-LOW) est portée séparément par
 * simulator/digitalContributionRegistry.js (irReceiverDigital). La
 * production de `infraredDetected` EFFECTIF à partir du stimulus
 * environnemental INFRARED est portée par environmentalResponseRegistry.js
 * — aucune des deux logiques n'est dupliquée ici. Aucune contribution DC :
 * IR_RECEIVER ne fournit aucune sortie analogique (§15 du ticket).
 */

export const IrReceiverModel = {
  type: 'IR_RECEIVER',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.infraredDetected !== 'number') return false
    if (!Number.isFinite(params.infraredDetected)) return false
    if (params.infraredDetected !== 0 && params.infraredDetected !== 1) return false
    return true
  },
}
