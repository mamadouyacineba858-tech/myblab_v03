/**
 * ComponentRegistry — Annuaire pur des modèles de composants.
 * 
 * Responsabilité unique : stocker et récupérer des modèles.
 * 
 * ADR #1 : Le framework n'interprète jamais la sémantique d'un parameterType inconnu.
 * ADR #4 : Le Registry est un annuaire pur, sans logique métier.
 * 
 * @see MB-SIM-001 Contrat architectural V4 + Addenda A1-A4 + V5 + V5.1
 */
export class ComponentRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this.models = new Map()
  }

  /**
   * Enregistre un modèle de composant.
   * 
   * @param {object} model - Modèle à enregistrer
   * @param {string} model.type - Identifiant unique du type de composant
   * @param {object} model.defaultParameters - Paramètres par défaut
   * @param {Array} model.parameterSchema - Schéma des paramètres
   * @param {string[]} model.capabilities - Capacités du composant
   * @param {Function} model.validate - Fonction de validation
   * 
   * @throws {Error} Si le modèle est invalide ou si le type est déjà enregistré
   */
  register(model) {
    // Validation de base
    if (!model || typeof model !== 'object') {
      throw new Error('ComponentRegistry.register: model must be a valid object')
    }

    if (!model.type || typeof model.type !== 'string') {
      throw new Error('ComponentRegistry.register: model.type must be a non-empty string')
    }

    if (!Array.isArray(model.parameterSchema)) {
      throw new Error('ComponentRegistry.register: model.parameterSchema must be an array')
    }

    if (!Array.isArray(model.capabilities)) {
      throw new Error('ComponentRegistry.register: model.capabilities must be an array')
    }

    if (typeof model.validate !== 'function') {
      throw new Error('ComponentRegistry.register: model.validate must be a function')
    }

    // Vérification de doublon
    if (this.models.has(model.type)) {
      throw new Error(`ComponentRegistry.register: type "${model.type}" is already registered`)
    }

    // Enregistrement
    this.models.set(model.type, model)
  }

  /**
   * Récupère un modèle par son type.
   * 
   * @param {string} type - Type de composant
   * @returns {object|null} - Modèle ou null si non trouvé
   */
  getModel(type) {
    return this.models.get(type) ?? null
  }

  /**
   * Récupère tous les modèles enregistrés.
   * 
   * @returns {object[]} - Tableau de tous les modèles
   */
  getAllModels() {
    return Array.from(this.models.values())
  }
}