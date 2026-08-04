/**
 * Constantes du système de validation.
 * Niveaux, catégories et statuts utilisés par le Validation Engine.
 */

/**
 * Niveaux de gravité des problèmes.
 * - ERROR : bloquant, empêche l'exécution
 * - WARNING : non bloquant, signale un problème potentiel
 * - INFO : suggestion pédagogique
 */
export const LEVELS = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

/**
 * Catégories de règles de validation.
 * - STRUCTURAL : intégrité du Document
 * - ELECTRICAL : cohérence électrique
 * - PEDAGOGICAL : suggestions d'amélioration
 */
export const CATEGORIES = {
  STRUCTURAL: 'structural',
  ELECTRICAL: 'electrical',
  PEDAGOGICAL: 'pedagogical',
};

/**
 * Statuts du rapport de validation.
 * - OK : aucun problème détecté
 * - WARNING : des warnings présents, mais exécutable
 * - ERROR : des erreurs bloquantes
 */
export const STATUSES = {
  OK: 'OK',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

/**
 * Ordre de gravité pour le calcul du statut global.
 */
export const SEVERITY_ORDER = {
  [LEVELS.ERROR]: 3,
  [LEVELS.WARNING]: 2,
  [LEVELS.INFO]: 1,
};
