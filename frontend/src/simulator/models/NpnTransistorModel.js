/**
 * NpnTransistorModel — Modèle électrique d'un transistor NPN.
 *
 * MB-SIM-008 v2 : modèle DC SIMPLIFIÉ de type interrupteur commandé
 * (« BASE LOW → C-E bloqué », « BASE HIGH → C-E passant »), retenu après
 * inspection de signals.js (modèle Signal purement statique, cohérent avec
 * un modèle tout-ou-rien) et du Registry canonique. Aucun β réel, aucune
 * courbe Ic/Vce, aucun modèle non linéaire complet, aucune dynamique
 * temporelle — voir DECLARED_PARAMETER_SCHEMA.NPN_TRANSISTOR dans
 * canonicalRegistry.js pour les bornes exactes de cette simplification.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement de validation. La
 * contribution au solveur DC (blocage/conduction selon BASE) est portée
 * séparément par simulator/dcContributionRegistry.js.
 */

export const NpnTransistorModel = {
  type: 'NPN_TRANSISTOR',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.onResistance !== 'number') return false
    if (!Number.isFinite(params.onResistance)) return false
    if (params.onResistance <= 0) return false
    return true
  },
}
