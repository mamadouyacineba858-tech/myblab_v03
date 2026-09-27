/** Winstar WH1602B 16x2 character LCD (ST7066U), Level-1: no parameters; controller state lives in timedDigitalContributionRegistry. */
export const Lcd16x2WH1602BModel = {
  type: 'LCD_16X2_WH1602B',
  validate(params) {
    return !!params && typeof params === 'object' && !Array.isArray(params)
  },
}
