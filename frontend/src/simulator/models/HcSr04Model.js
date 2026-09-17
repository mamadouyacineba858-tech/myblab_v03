/**
 * HcSr04Model — Modèle électrique du capteur de distance à ultrasons
 * HC-SR04 (A7-C5).
 *
 * Capteur numérique alimenté à 4 broches (VCC/TRIG/ECHO/GND), modélisé au
 * niveau de simulation actuel de MYBlab par un unique paramètre CONTINU
 * `distanceCm` ∈ [2,400] (voir DECLARED_PARAMETER_SCHEMA.HC_SR04 dans
 * canonicalRegistry.js — portée réelle du capteur, datasheet). Aucun modèle
 * acoustique, aucune vitesse du son : hors périmètre Level-1 (voir §16 du
 * ticket — la formule de conversion distance -> durée ECHO vit dans
 * timedDigitalContributionRegistry.js, pas ici).
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique. Ce
 * fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js) — même corps de validation bornée
 * que les autres modèles, adapté au domaine CONTINU [2,400] de
 * `distanceCm` (à la différence de PirMotionSensorModel/TiltSensorModel,
 * strictement binaires).
 *
 * La contribution temporelle (alimentation VCC/GND requise, machine d'état
 * TRIG -> ECHO) est portée séparément par
 * simulator/timedDigitalContributionRegistry.js (premier producteur réel de
 * A7-C5-PREQ). La production de `distanceCm` EFFECTIF à partir du stimulus
 * environnemental DISTANCE est portée par environmentalResponseRegistry.js
 * — aucune des deux logiques n'est dupliquée ici. Aucune contribution DC :
 * HC_SR04 ne fournit aucune sortie analogique (§13 du ticket).
 */

export const HcSr04Model = {
  type: 'HC_SR04',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.distanceCm !== 'number') return false
    if (!Number.isFinite(params.distanceCm)) return false
    if (params.distanceCm < 2 || params.distanceCm > 400) return false
    return true
  },
}
