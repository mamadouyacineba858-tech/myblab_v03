/** PMOS Level-1 controlled by GATE LOW; DC contribution stays in the generic registry. */
export const PmosModel = {
  type: 'PMOS',
  validate(params) {
    return !!params && typeof params === 'object' &&
      typeof params.onResistance === 'number' &&
      Number.isFinite(params.onResistance) && params.onResistance > 0
  },
}
