/**
 * ZenerDiodeModel — Modèle électrique d'une diode Zener (A5-ZENER_DIODE).
 *
 * Level-1 : réutilise la même famille physique diode que DiodeModel (voir
 * simulator/dcContributionRegistry.js — createDiodeDcContribution avec
 * reverseBreakdown activé), avec deux paramètres supplémentaires pour la
 * conduction de breakdown. Le contrat déclaratif du composant est porté
 * par le Registry canonique. Ce fichier ne porte que le comportement de
 * validation, conformément au contrat `{ type, validate() }` imposé à
 * tout modèle exécutable (ADR-012 §4/§11, simulator/models/*.js).
 */

export const ZenerDiodeModel = {
  type: 'ZENER_DIODE',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.forwardVoltage !== 'number') return false
    if (!Number.isFinite(params.forwardVoltage)) return false
    if (params.forwardVoltage < 0) return false
    if (typeof params.onResistance !== 'number') return false
    if (!Number.isFinite(params.onResistance)) return false
    if (params.onResistance <= 0) return false
    if (typeof params.breakdownVoltage !== 'number') return false
    if (!Number.isFinite(params.breakdownVoltage)) return false
    if (params.breakdownVoltage < 0) return false
    if (typeof params.breakdownResistance !== 'number') return false
    if (!Number.isFinite(params.breakdownResistance)) return false
    if (params.breakdownResistance <= 0) return false
    return true
  },
}
