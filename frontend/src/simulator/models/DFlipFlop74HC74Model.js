/** 74HC74 dual D flip-flop, Level-1: no parameters; sequential logic lives in timedDigitalContributionRegistry. */
export const DFlipFlop74HC74Model = {
  type: 'D_FLIP_FLOP_74HC74',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
