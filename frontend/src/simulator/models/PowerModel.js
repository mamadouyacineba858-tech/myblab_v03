/**
 * PowerModel — Modèle électrique d'une source de tension.
 *
 * Représente une alimentation (batterie, source DC) fournissant
 * une tension constante entre deux bornes (5V et GND par défaut).
 *
 * Conformité au contrat MB-SIM-001 V4 + Addenda A1-A4 + V5 + V5.1
 * - parameterType ouvert (ADR #1) : "voltage" est une chaîne sémantique
 * - Le contrat déclaratif du composant est porté par le Registry canonique
 * - Le modèle conserve uniquement son comportement exécutable
 */

export const PowerModel = {
  type: 'POWER',

  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.voltage !== 'number') return false
    if (!Number.isFinite(params.voltage)) return false
    if (params.voltage <= 0) return false
    return true
  },
}
