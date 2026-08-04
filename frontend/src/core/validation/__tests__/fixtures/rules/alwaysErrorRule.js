import { CATEGORIES, LEVELS } from '../../../constants.js';

/**
 * Règle factice qui retourne toujours une erreur.
 */
export const alwaysErrorRule = {
  id: 'always_error',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate: () => ({
    message: 'This rule always returns an error',
    explanation: 'Used for testing purposes.',
    suggestion: 'This is a test rule.',
  }),
};
