/**
 * ResistorModel — Modèle électrique d'une résistance.
 *
 * Représente un composant passif qui limite le courant selon la loi d'Ohm :
 * V = R × I
 *
 * Conformité au contrat MB-SIM-001 V4 + Addenda A1-A4 + V5 + V5.1
 * - parameterType ouvert (ADR #1) : "resistance" est une chaîne sémantique
 * - Le contrat déclaratif du composant est porté par le Registry canonique
 * - Le modèle conserve uniquement son comportement exécutable
 */

export const ResistorModel = {
  type: 'RESISTOR',

  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
