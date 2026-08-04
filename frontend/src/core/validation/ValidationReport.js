import { STATUSES } from './constants.js';

/**
 * Rapport de validation produit par le Validation Engine.
 * Agrège tous les problèmes détectés et calcule un statut global.
 */
export class ValidationReport {
  constructor() {
    this._problems = [];
    this._timestamp = new Date().toISOString();
  }

  /**
   * Ajoute un problème au rapport.
   * @param {ValidationProblem} problem
   */
  addProblem(problem) {
    this._problems.push(problem);
  }

  /**
   * Ajoute plusieurs problèmes en une fois.
   * @param {ValidationProblem[]} problems
   */
  addProblems(problems) {
    for (const problem of problems) {
      this.addProblem(problem);
    }
  }

  /**
   * Retourne tous les problèmes (copie).
   */
  getProblems() {
    return [...this._problems];
  }

  /**
   * Retourne uniquement les erreurs (ERROR).
   */
  getErrors() {
    return this._problems.filter(p => p.isError());
  }

  /**
   * Retourne uniquement les warnings (WARNING).
   */
  getWarnings() {
    return this._problems.filter(p => p.isWarning());
  }

  /**
   * Retourne uniquement les infos (INFO).
   */
  getInfos() {
    return this._problems.filter(p => p.isInfo());
  }

  /**
   * Calcule le statut global du rapport.
   * - ERROR si au moins une erreur
   * - WARNING si au moins un warning (et aucune erreur)
   * - OK sinon
   */
  getStatus() {
    if (this.getErrors().length > 0) {
      return STATUSES.ERROR;
    }
    if (this.getWarnings().length > 0) {
      return STATUSES.WARNING;
    }
    return STATUSES.OK;
  }

  /**
   * Vérifie si le rapport contient des erreurs bloquantes.
   */
  hasErrors() {
    return this.getErrors().length > 0;
  }

  /**
   * Vérifie si le rapport est OK (ni erreur ni warning).
   */
  isOk() {
    return this.getStatus() === STATUSES.OK;
  }

  /**
   * Vérifie si le rapport est valide (OK ou WARNING).
   * Une commande peut être exécutée même avec des warnings.
   */
  isValid() {
    return !this.hasErrors();
  }

  /**
   * Retourne une copie sérialisable du rapport.
   */
  toJSON() {
    return {
      status: this.getStatus(),
      timestamp: this._timestamp,
      errors: this.getErrors().map(p => p.toJSON()),
      warnings: this.getWarnings().map(p => p.toJSON()),
      infos: this.getInfos().map(p => p.toJSON()),
      total: this._problems.length,
    };
  }
}
