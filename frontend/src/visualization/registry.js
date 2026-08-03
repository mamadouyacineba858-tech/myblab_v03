/**
 * RendererRegistry — Registre des composants de visualisation
 * 
 * Permet d'associer un type logique (ex: 'LED') à un composant React
 * (ex: LedPart). Le registry est un annuaire pur, sans logique métier.
 */
export class RendererRegistry {
  constructor() {
    this._registry = new Map();
  }

  /**
   * Enregistre un type avec son composant renderer
   * @param {string} type - Identifiant unique du type
   * @param {React.ComponentType} Component - Composant React
   * @returns {this} - Pour chaînage
   */
  register(type, Component) {
    if (typeof type !== 'string' || type.trim() === '') {
      throw new Error('[RendererRegistry] register: type must be a non-empty string');
    }

    if (!Component || typeof Component !== 'function') {
      throw new Error('[RendererRegistry] register: Component must be a valid React component');
    }

    if (this._registry.has(type)) {
      console.warn(`[RendererRegistry] Type "${type}" already registered, overwriting`);
    }

    this._registry.set(type, Component);
    return this;
  }

  /**
   * Enregistre plusieurs types
   * @param {Array<{type: string, component: React.ComponentType}>} registrations
   * @returns {this}
   */
  registerAll(registrations) {
    if (!Array.isArray(registrations)) {
      throw new Error('[RendererRegistry] registerAll: registrations must be an array');
    }

    for (const entry of registrations) {
      if (entry && typeof entry === 'object' && entry.type && entry.component) {
        this.register(entry.type, entry.component);
      } else {
        console.warn('[RendererRegistry] registerAll: skipping invalid entry', entry);
      }
    }

    return this;
  }

  /**
   * Récupère le composant pour un type donné
   * @param {string} type
   * @returns {React.ComponentType|null}
   */
  get(type) {
    if (typeof type !== 'string') {
      return null;
    }
    return this._registry.get(type) || null;
  }

  /**
   * Vérifie si un type est enregistré
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    if (typeof type !== 'string') {
      return false;
    }
    return this._registry.has(type);
  }

  /**
   * Retourne la liste des types enregistrés
   * @returns {string[]}
   */
  list() {
    return Array.from(this._registry.keys());
  }

  /**
   * Retourne le nombre de types enregistrés
   * @returns {number}
   */
  size() {
    return this._registry.size;
  }

  /**
   * Vide le registre
   * @returns {this}
   */
  clear() {
    this._registry.clear();
    return this;
  }
}

export default RendererRegistry;