/** Stateless Level-1 NOT: no parameters; logic lives in digitalContributionRegistry. */
export const NotGateModel = {
  type: 'NOT_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
