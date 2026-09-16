/**
 * ForceSensorModel — Modèle électrique du capteur de force résistif (FSR, A7-C2).
 *
 * Capteur résistif deux bornes NON polarisé (A/B, même vocabulaire que LDR/
 * THERMISTOR/LIGHT_BULB). Ce modèle ne fait que fournir une valeur de
 * résistance constante — même contrat que LdrModel/ThermistorModel — pour
 * permettre à computeDcAnalysis() de produire un résultat DC pour ce type de
 * composant.
 *
 * Le contrat déclaratif du composant (bornes minimum/maximum, défaut) est
 * porté par canonicalRegistry.js. Ce fichier ne porte que le comportement de
 * validation, conformément au contrat `{ type, validate() }` imposé à tout
 * modèle exécutable (ADR-012 §4/§11, simulator/models/*.js).
 *
 * La contribution au solveur DC est portée séparément par
 * simulator/dcContributionRegistry.js (réutilisation directe de resistorDc,
 * aucune fonction dédiée). La production de la résistance EFFECTIVE à partir
 * du stimulus environnemental FORCE est portée par
 * environmentalResponseRegistry.js — aucune des deux logiques n'est
 * dupliquée ici.
 */

export const ForceSensorModel = {
  type: 'FORCE_SENSOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
