/** Stateless Level-1 NAND: no parameters; logic lives in digitalContributionRegistry. */
export const NandGateModel = {
  type: 'NAND_GATE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
