/**
 * DiffResult
 *
 * Représentation immutable des différences entre deux documents Core.
 * Structure de données simple (DTO) — sans logique métier.
 *
 * CONTRAT :
 * - Immutable : tous les objets sont figés en profondeur (deepFreeze).
 * - Sérialisable : peut être converti en JSON.
 * - Pas de logique : ne contient que des données.
 *
 * RÉFÉRENCES : MB-BRIDGE-002 V3
 */

/**
 * Vérifie si une valeur est un objet.
 * @param {any} value
 * @returns {boolean}
 */
function isObject(value) {
  return value !== null && typeof value === 'object';
}

/**
 * Gèle un objet en profondeur.
 * @param {any} obj
 * @returns {any} L'objet figé
 */
function deepFreeze(obj) {
  if (!isObject(obj)) {
    return obj;
  }

  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name];
    if (isObject(value) && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj);
}

/**
 * Copie profonde d'un objet pour éviter les références partagées.
 * @param {any} value
 * @returns {any}
 */
function deepClone(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = deepClone(val);
  }
  return result;
}

/**
 * Crée un DiffResult immutable.
 * Tous les objets sont clonés en profondeur puis figés.
 * @param {Object} params
 * @param {Array} params.componentsAdded - Composants ajoutés
 * @param {Array} params.componentsRemoved - Composants supprimés
 * @param {Array} params.componentsModified - Composants modifiés
 * @param {Array} params.wiresAdded - Wires ajoutées
 * @param {Array} params.wiresRemoved - Wires supprimées
 * @param {Array} params.wiresModified - Wires modifiées
 * @param {Object} params.statistics - Métriques
 * @param {boolean} params.hasChanges - Indicateur de changement
 * @returns {Object} DiffResult immutable
 */
export function createDiffResult({
  componentsAdded = [],
  componentsRemoved = [],
  componentsModified = [],
  wiresAdded = [],
  wiresRemoved = [],
  wiresModified = [],
  statistics = {},
  hasChanges = false,
} = {}) {
  // Clonage profond pour éviter les références partagées
  const result = {
    hasChanges,
    componentsAdded: deepClone(componentsAdded),
    componentsRemoved: deepClone(componentsRemoved),
    componentsModified: deepClone(componentsModified),
    wiresAdded: deepClone(wiresAdded),
    wiresRemoved: deepClone(wiresRemoved),
    wiresModified: deepClone(wiresModified),
    statistics: deepClone(statistics),
  };

  return deepFreeze(result);
}