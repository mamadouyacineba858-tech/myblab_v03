/**
 * InductorModel — Modèle électrique d'une inductance (A4-INDUCTOR).
 *
 * Level-1 : AUCUNE contribution DC steady-state (voir
 * dcContributionRegistry.js — INDUCTOR n'y est délibérément pas enregistré,
 * §11 du ticket : un court-circuit idéal introduirait un courant DC
 * indéterminé sans résistance de boucle connue de ce moteur simplifié,
 * aucune résistance parasite arbitraire n'est inventée). La réponse
 * électrique réelle (V = L × di/dt, Scheduler partagé) est portée
 * séparément par simulator/transientContributionRegistry.js.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Ce fichier ne porte que le comportement de validation, conformément au
 * contrat `{ type, validate() }` imposé à tout modèle exécutable
 * (ADR-012 §4/§11, simulator/models/*.js).
 */

export const InductorModel = {
  type: 'INDUCTOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.inductance !== 'number') return false
    if (!Number.isFinite(params.inductance)) return false
    if (params.inductance <= 0) return false
    return true
  },
}
