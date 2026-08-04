/**
 * Classe de base représentant une commande utilisateur.
 * Une commande est une intention utilisateur formalisée.
 *
 * Les commandes sont considérées comme immuables.
 * Toute modification doit créer une nouvelle instance.
 */
export class Command {
  /**
   * @param {string} type - Type de la commande (ex: 'ADD_COMPONENT')
   * @param {object} payload - Paramètres de la commande
   * @param {object} metadata - Métadonnées optionnelles (timestamp, userId, etc.)
   */
  constructor(type, payload, metadata = {}) {
    this.id = this._generateId();
    this.type = type;
    this.payload = payload;
    this.metadata = {
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Empêcher la modification des propriétés principales
    Object.freeze(this.id);
    Object.freeze(this.type);
  }

  _generateId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Retourne une copie sérialisable de la commande.
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: { ...this.payload }, // Copie superficielle pour éviter mutation
      metadata: { ...this.metadata },
    };
  }
}
