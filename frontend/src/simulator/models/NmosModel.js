/** NMOS Level-1 controlled by GATE HIGH; DC contribution stays in the generic registry. */
export const NmosModel = {
  type: 'NMOS',
  validate(params) {
    return !!params && typeof params === 'object' &&
      typeof params.onResistance === 'number' &&
      Number.isFinite(params.onResistance) && params.onResistance > 0
  },
}
