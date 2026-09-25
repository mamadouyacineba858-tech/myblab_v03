/** 74HC161 synchronous 4-bit binary counter, Level-1: no parameters; sequential logic lives in timedDigitalContributionRegistry. */
export const BinaryCounter74HC161Model = {
  type: 'BINARY_COUNTER_74HC161',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
