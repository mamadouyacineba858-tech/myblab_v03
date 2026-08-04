import { CATEGORIES, LEVELS } from './constants.js';

/**
 * Registre des règles de validation.
 * Extensible : on peut ajouter des règles sans modifier le moteur.
 *
 * Une règle est un objet avec :
 * - id: string (unique)
 * - category: CATEGORIES.*
 * - level: LEVELS.*
 * - validate: (document, command) => ValidationProblem | null | { message, ... }
 */
export class ValidationRegistry {
  constructor() {
    this._rules = [];
  }

  /**
   * Ajoute une règle au registre.
   * @param {object} rule
   */
  add(rule) {
    if (!rule.id) {
      throw new Error('ValidationRegistry: rule must have an id');
    }
    if (!Object.values(CATEGORIES).includes(rule.category)) {
      throw new Error(`ValidationRegistry: invalid category "${rule.category}"`);
    }
    if (!Object.values(LEVELS).includes(rule.level)) {
      throw new Error(`ValidationRegistry: invalid level "${rule.level}"`);
    }
    if (typeof rule.validate !== 'function') {
      throw new Error('ValidationRegistry: rule must have a validate function');
    }

    if (this._rules.some(r => r.id === rule.id)) {
      throw new Error(`ValidationRegistry: rule with id "${rule.id}" already exists`);
    }

    this._rules.push({ ...rule });
  }

  /**
   * Retourne toutes les règles enregistrées.
   */
  getAll() {
    return [...this._rules];
  }

  /**
   * Retourne les règles d'une catégorie donnée.
   */
  getByCategory(category) {
    return this._rules.filter(r => r.category === category);
  }

  /**
   * Retourne les règles d'un niveau donné.
   */
  getByLevel(level) {
    return this._rules.filter(r => r.level === level);
  }

  /**
   * Retourne le nombre de règles enregistrées.
   */
  count() {
    return this._rules.length;
  }

  /**
   * Vérifie si une règle existe.
   */
  has(ruleId) {
    return this._rules.some(r => r.id === ruleId);
  }
}
