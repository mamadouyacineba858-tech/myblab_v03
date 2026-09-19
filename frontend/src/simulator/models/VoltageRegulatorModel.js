/** Ideal derived DC regulator, Level-1; network resolution remains generic. */
export const VoltageRegulatorModel = {
  type: 'VOLTAGE_REGULATOR',
  validate(params) {
    return !!params && typeof params === 'object' &&
      Number.isFinite(params.outputVoltage) && params.outputVoltage > 0
  },
}
