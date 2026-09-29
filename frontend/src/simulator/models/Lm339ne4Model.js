/** TI LM339NE4 quad comparator, Level-1: no parameters; conduction stays in the analog conditional conduction registry. */
export const Lm339ne4Model = {
  type: 'LM339NE4',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
