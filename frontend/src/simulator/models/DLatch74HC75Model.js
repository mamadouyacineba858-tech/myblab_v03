/** 74HC75 quad D latch, Level-1: no parameters; sequential logic lives in timedDigitalContributionRegistry. */
export const DLatch74HC75Model = {
  type: 'D_LATCH_74HC75',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
