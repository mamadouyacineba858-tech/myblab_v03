/**
 * ThermistorModel — Modèle électrique d'une thermistance (type NTC).
 *
 * MB-SIM-008 : modèle DC SIMPLIFIÉ à résistance fixe. Ne modélise pas la
 * dépendance réelle d'une thermistance NTC à la température — aucune
 * grandeur environnementale (température ambiante) n'est représentée dans
 * ce dépôt. Ce modèle ne fait que fournir une valeur de résistance
 * constante, au même titre qu'une résistance classique, pour permettre à
 * computeDcAnalysis() de produire un résultat DC pour ce type de composant.
 *
 * Conformité au contrat MB-SIM-001 V4 + Addenda A1-A4 + V5 + V5.1
 * - parameterType ouvert (ADR #1) : "resistance" est une chaîne sémantique
 * - Annuaire pur (ADR #4) : pas de logique de résolution
 * - Capabilities déclarées explicitement
 *
 * @see MB-SIM-001 Contrat architectural
 * @see MB-SIM-008 Blueprint — modèle DC simplifié à résistance fixe (NTC)
 */

export const ThermistorModel = {
  type: 'THERMISTOR',
  defaultParameters: {
    resistance: 10000,
  },
  parameterSchema: [
    {
      key: 'resistance',
      parameterType: 'resistance',
      unit: 'Ω',
      minimum: 100,
      maximum: 1000000,
      defaultValue: 10000,
      description:
        'Résistance fixe (mode simplifié MB-SIM-008, type NTC) : cette ' +
        'thermistance est modélisée par une résistance constante et ne ' +
        'dépend pas de la température — la relation température → ' +
        'résistance est hors périmètre de MB-SIM-008.',
    },
  ],
  capabilities: ['digital', 'dc'],
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}
