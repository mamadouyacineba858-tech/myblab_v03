/**
 * VisualStateRegistry — MB-VIS-COMP-002
 *
 * Associe un type logique de composant (ex: 'LED') à un resolver d'état
 * visuel : une fonction pure qui dérive des props de rendu à partir du
 * contexte du composant (uid, signaux de pins, état d'instance).
 *
 * Objectif : extraire de PartRenderer.jsx les branchements
 * `if (type === 'LED') ... else if (type === 'RGB_LED') ...` qui
 * empêchaient l'ajout d'un nouveau composant sans modifier ce fichier.
 * Construit sur le même principe que le RendererRegistry déjà existant
 * (visualization/registry.js) : un annuaire pur, sans logique métier.
 *
 * Un type sans resolver enregistré fonctionne normalement : getVisualState
 * retourne alors un objet vide, sans branchement spécial ni erreur.
 *
 * Ce registre ne connaît aucune coordonnée graphique interne des
 * composants et ne contient aucune logique électrique de simulation — un
 * resolver ne fait que lire un état déjà calculé ailleurs (ex:
 * simulator/engine.js) et retourner des props.
 */
const _resolvers = new Map()

/**
 * Enregistre un resolver d'état visuel pour un type.
 * @param {string} type
 * @param {(context: object) => object} resolver
 */
export function registerVisualState(type, resolver) {
  if (typeof type !== 'string' || type.trim() === '') {
    throw new Error('[VisualStateRegistry] registerVisualState: type must be a non-empty string')
  }
  if (typeof resolver !== 'function') {
    throw new Error('[VisualStateRegistry] registerVisualState: resolver must be a function')
  }
  _resolvers.set(type, resolver)
}

/**
 * Résout les props visuelles dérivées pour un type donné.
 * Retourne {} si aucun resolver n'est enregistré pour ce type (un
 * composant sans état visuel dérivé fonctionne normalement).
 * @param {string} type
 * @param {object} context
 * @returns {object}
 */
export function getVisualState(type, context) {
  const resolver = typeof type === 'string' ? _resolvers.get(type) : null
  if (!resolver) return {}
  const result = resolver(context)
  return result && typeof result === 'object' ? result : {}
}

/**
 * @param {string} type
 * @returns {boolean}
 */
export function hasVisualStateResolver(type) {
  return typeof type === 'string' && _resolvers.has(type)
}

/**
 * Utilitaire de test uniquement : vide le registre.
 */
export function clearVisualStateRegistry() {
  _resolvers.clear()
}
