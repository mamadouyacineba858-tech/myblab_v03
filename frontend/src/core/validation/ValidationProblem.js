import { LEVELS } from './constants.js';

/**
 * Représente un problème détecté lors de la validation.
 * Immutable par convention.
 */
export class ValidationProblem {
  /**
   * @param {object} params
   * @param {string} params.id - Identifiant unique du problème
   * @param {string} params.level - LEVELS.ERROR | WARNING | INFO
   * @param {string} params.message - Message principal (court)
   * @param {string} params.explanation - Explication détaillée (optionnelle)
   * @param {string} params.suggestion - Suggestion de correction (optionnelle)
   * @param {object} params.context - Contexte métier (composant, wire, pin concerné)
   * @param {string} params.ruleId - Identifiant de la règle ayant généré le problème
   */
  constructor({ id, level, message, explanation = '', suggestion = '', context = {}, ruleId = null }) {
    if (!id) throw new Error('ValidationProblem: id is required');
    if (!Object.values(LEVELS).includes(level)) {
      throw new Error(`ValidationProblem: invalid level "${level}"`);
    }
    if (!message) throw new Error('ValidationProblem: message is required');

    this.id = id;
    this.level = level;
    this.message = message;
    this.explanation = explanation;
    this.suggestion = suggestion;
    this.context = { ...context };
    this.ruleId = ruleId || id;
    this.timestamp = new Date().toISOString();

    // Empêcher la modification des propriétés principales
    Object.freeze(this.id);
    Object.freeze(this.level);
  }

  /**
   * Retourne une copie sérialisable du problème.
   */
  toJSON() {
    return {
      id: this.id,
      level: this.level,
      message: this.message,
      explanation: this.explanation,
      suggestion: this.suggestion,
      context: { ...this.context },
      ruleId: this.ruleId,
      timestamp: this.timestamp,
    };
  }

  /**
   * Vérifie si le problème est bloquant (ERROR).
   */
  isError() {
    return this.level === LEVELS.ERROR;
  }

  /**
   * Vérifie si le problème est un WARNING.
   */
  isWarning() {
    return this.level === LEVELS.WARNING;
  }

  /**
   * Vérifie si le problème est une INFO.
   */
  isInfo() {
    return this.level === LEVELS.INFO;
  }
}
