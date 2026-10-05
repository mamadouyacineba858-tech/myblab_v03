/** TI NE556N dual precision timer, Level-1: no parameters; the channel law stays in the mixed-signal contribution registry. */
export const Ne556nModel = {
  type: 'NE556N',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
