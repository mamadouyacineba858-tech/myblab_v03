/** TI NE555P precision timer, Level-1: no parameters; the latch law stays in the mixed-signal contribution registry. */
export const Ne555pModel = {
  type: 'NE555P',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
