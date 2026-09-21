/** Stateless Level-1 AND: no parameters; logic lives in digitalContributionRegistry. */
export const AndGateModel = {
  type: 'AND_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
