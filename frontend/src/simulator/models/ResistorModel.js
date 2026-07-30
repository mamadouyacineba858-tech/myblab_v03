/**
 * ResistorModel — Modèle électrique d'une résistance.
 * 
 * Représente un composant passif qui limite le courant selon la loi d'Ohm :
 * V = R × I
 * 
 * Conformité au contrat MB-SIM-001 V4 + Addenda A1-A4 + V5 + V5.1
 * - parameterType ouvert (ADR #1) : "resistance" est une chaîne sémantique
 * - Annuaire pur (ADR #4) : pas de logique de résolution
 * - Capabilities déclarées explicitement
 * 
 * @see MB-SIM-001 Contrat architectural
 */

/**
 * Modèle de composant pour une résistance.
 * 
 * @type {import('../registry.js').ComponentModel}
 */
export const ResistorModel = {
  /**
   * Identifiant unique du type de composant.
   * @type {string}
   */
  type: 'RESISTOR',

  /**
   * Paramètres par défaut de la résistance.
   * @type {Object}
   */
  defaultParameters: {
    resistance: 220,
  },

  /**
   * Schéma des paramètres éditables.
   * Utilisé par l'UI, la validation et l'import/export.
   * 
   * ADR #1 : Le parameterType est une chaîne sémantique ouverte.
   * Le framework n'interprète pas "resistance", c'est l'UI qui choisit le widget.
   * 
   * @type {Array<import('../registry.js').ParameterDescriptor>}
   */
  parameterSchema: [
    {
      key: 'resistance',
      parameterType: 'resistance',
      unit: 'Ω',
      minimum: 0.001,
      maximum: 1e9,
      defaultValue: 220,
      description: 'Valeur de la résistance en Ohms',
    },
  ],

  /**
   * Capacités supportées par ce modèle.
   * 
   * - "digital" : la résistance peut être utilisée dans une simulation logique
   * - "dc" : la résistance peut être utilisée dans une simulation en courant continu
   * 
   * @type {string[]}
   */
  capabilities: ['digital', 'dc'],

  /**
   * Valide les paramètres fournis par l'utilisateur.
   * 
   * @param {Object} params - Paramètres à valider
   * @param {number} params.resistance - Valeur de la résistance
   * @returns {boolean} true si les paramètres sont valides
   */
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    return true
  },
}