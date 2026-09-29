/** TI LM393P dual comparator, Level-1: no parameters; conduction stays in the analog conditional conduction registry. */
export const Lm393pModel = {
  type: 'LM393P',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
