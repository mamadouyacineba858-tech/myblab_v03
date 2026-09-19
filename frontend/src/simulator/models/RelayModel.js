/** Level-1 relay parameters only; switching and DC belong to their registries. */
export const RelayModel = {
  type: 'RELAY',
  validate(params) {
    return !!params && typeof params === 'object' &&
      typeof params.coilResistance === 'number' &&
      Number.isFinite(params.coilResistance) && params.coilResistance > 0
  },
}
