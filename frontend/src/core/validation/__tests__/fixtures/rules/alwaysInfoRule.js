import { CATEGORIES, LEVELS } from '../../../constants.js';

/**
 * Règle factice qui retourne toujours une info.
 */
export const alwaysInfoRule = {
  id: 'always_info',
  category: CATEGORIES.PEDAGOGICAL,
  level: LEVELS.INFO,
  validate: () => ({
    message: 'This rule always returns an info',
    explanation: 'Used for testing purposes.',
    suggestion: 'This is a test rule.',
  }),
};
