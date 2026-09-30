/** TI LM358P dual op amp, Level-1: fixed pedagogical constants; the transfer law stays in the DC voltage-domain registry. */
export const Lm358pModel = {
  type: 'LM358P',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
      && Number.isFinite(params.openLoopGain) && params.openLoopGain > 0
      && Number.isFinite(params.outputHighHeadroom) && params.outputHighHeadroom >= 0
  },
}
