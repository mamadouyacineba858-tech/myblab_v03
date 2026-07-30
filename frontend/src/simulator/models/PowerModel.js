/**
 * PowerModel — Modèle électrique d'une source de tension.
 * 
 * Représente une alimentation (batterie, source DC) fournissant
 * une tension constante entre deux bornes (5V et GND par défaut).
 * 
 * Conformité au contrat MB-SIM-001 V4 + Addenda A1-A4 + V5 + V5.1
 * - parameterType ouvert (ADR #1) : "voltage" est une chaîne sémantique
 * - Annuaire pur (ADR #4) : pas de logique de résolution
 * - Capabilities déclarées explicitement
 * 
 * @see MB-SIM-001 Contrat architectural
 */

/**
 * Modèle de composant pour une source de tension.
 * 
 * @type {import('../registry.js').ComponentModel}
 */
export const PowerModel = {
  /**
   * Identifiant unique du type de composant.
   * @type {string}
   */
  type: 'POWER',

  /**
   * Paramètres par défaut de la source.
   * @type {Object}
   */
  defaultParameters: {
    voltage: 5,
  },

  /**
   * Schéma des paramètres éditables.
   * Utilisé par l'UI, la validation et l'import/export.
   * 
   * ADR #1 : Le parameterType est une chaîne sémantique ouverte.
   * Le framework n'interprète pas "voltage", c'est l'UI qui choisit le widget.
   * 
   * @type {Array<import('../registry.js').ParameterDescriptor>}
   */
  parameterSchema: [
    {
      key: 'voltage',
      parameterType: 'voltage',
      unit: 'V',
      minimum: 0.001,
      maximum: 1000,
      defaultValue: 5,
      description: 'Tension de sortie de la source en Volts',
    },
  ],

  /**
   * Capacités supportées par ce modèle.
   * 
   * - "digital" : la source peut alimenter des signaux logiques HIGH/LOW
   * - "dc" : la source peut être utilisée dans une simulation en courant continu
   * 
   * @type {string[]}
   */
  capabilities: ['digital', 'dc'],

  /**
   * Valide les paramètres fournis par l'utilisateur.
   * 
   * @param {Object} params - Paramètres à valider
   * @param {number} params.voltage - Tension de la source
   * @returns {boolean} true si les paramètres sont valides
   */
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.voltage !== 'number') return false
    if (!Number.isFinite(params.voltage)) return false
    if (params.voltage <= 0) return false
    return true
  },
}