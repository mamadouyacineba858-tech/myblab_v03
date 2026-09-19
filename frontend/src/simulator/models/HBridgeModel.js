/** L293D H-bridge, Level-1: no parameters; conduction and DC domains stay in the generic registries. */
export const HBridgeModel = {
  type: 'H_BRIDGE',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
