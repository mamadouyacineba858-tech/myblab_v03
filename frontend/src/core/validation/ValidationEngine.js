import { ValidationReport } from './ValidationReport.js';
import { ValidationProblem } from './ValidationProblem.js';
import { ValidationError } from './errors/ValidationError.js';

/**
 * Moteur de validation métier.
 * Exécute les règles enregistrées et produit un rapport.
 *
 * NE MODIFIE JAMAIS le Document.
 * NE STOCKE AUCUN ÉTAT persistant.
 * NE DÉCIDE PAS de l'exécution (seulement un rapport).
 */
export class ValidationEngine {
  /**
   * @param {ValidationRegistry} registry - Registre des règles
   */
  constructor(registry) {
    if (!registry) {
      throw new ValidationError('ValidationEngine: registry is required');
    }
    this._registry = registry;
  }

  /**
   * Valide un document et une commande.
   * @param {object} document - Le Document Circuit (source de vérité)
   * @param {object|null} command - La commande proposée (optionnelle)
   * @returns {ValidationReport} Rapport de validation
   */
  validate(document, command = null) {
    const report = new ValidationReport();
    const rules = this._registry.getAll();

    if (rules.length === 0) {
      return report;
    }

    for (const rule of rules) {
      try {
        const result = rule.validate(document, command);

        if (result) {
          let problem;
          if (result instanceof ValidationProblem) {
            problem = result;
          } else {
            // Transformation d'un objet simple en ValidationProblem
            problem = new ValidationProblem({
              id: result.id || `problem_${rule.id}`,
              level: result.level || rule.level,
              message: result.message || `Rule "${rule.id}" failed`,
              explanation: result.explanation || '',
              suggestion: result.suggestion || '',
              context: result.context || {},
              ruleId: rule.id,
            });
          }
          report.addProblem(problem);
        }
      } catch (error) {
        // Une erreur dans une règle ne bloque pas les autres.
        // Elle est transformée en problème ERROR.
        const problem = new ValidationProblem({
          id: `rule_error_${rule.id}`,
          level: 'ERROR',
          message: `Rule "${rule.id}" execution failed: ${error.message}`,
          explanation: 'An internal error occurred during validation.',
          suggestion: 'Please report this issue to the development team.',
          context: { ruleId: rule.id },
          ruleId: rule.id,
        });
        report.addProblem(problem);
      }
    }

    return report;
  }

  /**
   * Valide un document uniquement (sans commande).
   * Utile pour la validation post-exécution ou périodique.
   */
  validateDocument(document) {
    return this.validate(document, null);
  }
}
