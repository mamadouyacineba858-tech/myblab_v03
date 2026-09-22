/** Stateless Level-1 XOR: no parameters; logic lives in digitalContributionRegistry. */
export const XorGateModel = {
  type: 'XOR_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
