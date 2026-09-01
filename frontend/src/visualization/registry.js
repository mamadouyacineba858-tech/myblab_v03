/**
 * RendererRegistry — Registre des composants de visualisation
 * 
 * Permet d'associer un type logique (ex: 'LED') à un composant React
 * (ex: LedPart). Le registry est un annuaire pur, sans logique métier.
 */
export class RendererRegistry {
  constructor() {
    this._registry = new Map();
    // MB-VIS-INDUSTRIAL-001 : déclaration `visual` optionnelle par type
    // (backend / bareBody / markerless). Annuaire pur, aucune logique métier.
    this._visual = new Map();
  }

  /**
   * Enregistre un type avec son composant renderer
   * @param {string} type - Identifiant unique du type
   * @param {React.ComponentType} Component - Composant React
   * @param {{backend?: string, bareBody?: boolean, markerless?: boolean}} [visual] - déclaration de présentation optionnelle
   * @returns {this} - Pour chaînage
   */
  register(type, Component, visual = undefined) {
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
    if (visual !== undefined) {
      this._visual.set(type, visual);
    }
    return this;
  }

  /**
   * Enregistre plusieurs types
   * @param {Array<{type: string, component: React.ComponentType, visual?: object}>} registrations
   * @returns {this}
   */
  registerAll(registrations) {
    if (!Array.isArray(registrations)) {
      throw new Error('[RendererRegistry] registerAll: registrations must be an array');
    }

    for (const entry of registrations) {
      if (entry && typeof entry === 'object' && entry.type && entry.component) {
        this.register(entry.type, entry.component, entry.visual);
      } else {
        console.warn('[RendererRegistry] registerAll: skipping invalid entry', entry);
      }
    }

    return this;
  }

  /**
   * Déclaration `visual` brute d'un type (ou `undefined`). MB-VIS-INDUSTRIAL-001.
   * @param {string} type
   * @returns {object|undefined}
   */
  getVisual(type) {
    if (typeof type !== 'string') {
      return undefined;
    }
    return this._visual.get(type);
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