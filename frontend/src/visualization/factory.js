import { VisualizationManager } from './VisualizationManager.js';
import { RendererRegistry } from './registry.js';

/**
 * Crée un VisualizationManager avec un RendererRegistry vide
 * @returns {VisualizationManager}
 */
export function createVisualizationManager() {
  const registry = new RendererRegistry();
  return new VisualizationManager(registry);
}

/**
 * Crée un VisualizationManager pré-enregistré avec des renderers par défaut
 * @param {Array} registrations - [{ type, component }]
 * @returns {VisualizationManager}
 */
export function createDefaultVisualizationManager(registrations = []) {
  const manager = createVisualizationManager();

  if (Array.isArray(registrations) && registrations.length > 0) {
    manager.registerAll(registrations);
  }

  return manager;
}

/**
 * Crée un VisualizationManager à partir d'un registre existant
 * @param {RendererRegistry} registry
 * @returns {VisualizationManager}
 */
export function createVisualizationManagerFromRegistry(registry) {
  return new VisualizationManager(registry);
}

export default {
  createVisualizationManager,
  createDefaultVisualizationManager,
  createVisualizationManagerFromRegistry,
};