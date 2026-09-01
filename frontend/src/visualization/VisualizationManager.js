import React from 'react';
import { RendererRegistry } from './registry.js';
import { resolvePresentation } from './visualContract.js';

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
   * Drapeaux de présentation résolus d'un type (MB-VIS-INDUSTRIAL-001).
   * Lit la déclaration `visual` portée par le registre et la résout via
   * `resolvePresentation()` — aucun couplage par type.
   * @param {string} type
   * @returns {{ backend: 'svg'|'raster'|'r3f', bareBody: boolean, markerless: boolean }}
   */
  getPresentation(type) {
    return resolvePresentation(this._registry.getVisual(type));
  }

  /**
   * Backend de rendu résolu d'un type ('svg' par défaut).
   * @param {string} type
   * @returns {'svg'|'raster'|'r3f'}
   */
  getBackend(type) {
    return this.getPresentation(type).backend;
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