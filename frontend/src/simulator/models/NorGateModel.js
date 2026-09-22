/** Stateless Level-1 NOR: no parameters; logic lives in digitalContributionRegistry. */
export const NorGateModel = {
  type: 'NOR_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
