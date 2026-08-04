import { CATEGORIES, LEVELS } from '../../../constants.js';

/**
 * Règle factice qui retourne toujours un warning.
 */
export const alwaysWarningRule = {
  id: 'always_warning',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.WARNING,
  validate: () => ({
    message: 'This rule always returns a warning',
    explanation: 'Used for testing purposes.',
    suggestion: 'This is a test rule.',
  }),
};
