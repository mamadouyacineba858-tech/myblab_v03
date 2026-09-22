/** Stateless Level-1 OR: no parameters; logic lives in digitalContributionRegistry. */
export const OrGateModel = {
  type: 'OR_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
