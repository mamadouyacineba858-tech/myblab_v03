/** 74HC73 dual J-K flip-flop, Level-1: no parameters; sequential logic lives in timedDigitalContributionRegistry. */
export const JkFlipFlop74HC73Model = {
  type: 'JK_FLIP_FLOP_74HC73',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
