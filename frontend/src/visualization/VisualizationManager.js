import React from 'react';
import { RendererRegistry } from './registry.js';

/**
 * VisualizationManager — Gestionnaire de visualisation des composants
 * 
 * Centralise la résolution et le rendu des composants de visualisation.
 * S'appuie sur un RendererRegistry pour la résolution des types.
 * 
 * Usage:
 *   const manager = new VisualizationManager(registry);
 *   return manager.render('LED', { uid, pinSignals, state });
 */
export class VisualizationManager {
  /**
   * @param {RendererRegistry} registry - Registre de renderers
   */
  constructor(registry = null) {
    this._registry = registry || new RendererRegistry();
  }

  /**
   * Enregistre un renderer dans le registre
   * @param {string} type
   * @param {React.ComponentType} Component
   * @returns {this}
   */
  register(type, Component) {
    this._registry.register(type, Component);
    return this;
  }

  /**
   * Enregistre plusieurs renderers
   * @param {Array} registrations
   * @returns {this}
   */
  registerAll(registrations) {
    this._registry.registerAll(registrations);
    return this;
  }

  /**
   * Récupère le renderer pour un type
   * @param {string} type
   * @returns {React.ComponentType|null}
   */
  getRenderer(type) {
    return this._registry.get(type);
  }

  /**
   * Rend un composant visuel pour un type donné
   * 
   * @param {string} type - Type logique du composant
   * @param {Object} props - Props à passer au renderer
   * @returns {React.ReactElement|null}
   */
  render(type, props) {
    const Component = this.getRenderer(type);

    if (!Component) {
      console.warn(`[VisualizationManager] No renderer found for type: ${type}`);
      return null;
    }

    if (typeof Component !== 'function') {
      console.error(
        `[VisualizationManager] Invalid renderer for type ${type}: expected function, got ${typeof Component}`
      );
      return null;
    }

    return React.createElement(Component, props);
  }

  /**
   * Retourne la liste des types disponibles
   * @returns {string[]}
   */
  listTypes() {
    return this._registry.list();
  }

  /**
   * Retourne le registre sous-jacent
   * @returns {RendererRegistry}
   */
  getRegistry() {
    return this._registry;
  }
}

export default VisualizationManager;