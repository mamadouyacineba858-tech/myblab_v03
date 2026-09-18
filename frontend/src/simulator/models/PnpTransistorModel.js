/** PNP Level-1 commandé par BASE LOW, sans bêta ni courbes analogiques.
 * Contrat déclaratif dans canonicalRegistry ; contribution DC dans dcContributionRegistry.
 */
export const PnpTransistorModel = {
  type: 'PNP_TRANSISTOR',
  validate(params) {
    return !!params && typeof params === 'object' &&
      typeof params.onResistance === 'number' &&
      Number.isFinite(params.onResistance) && params.onResistance > 0
  },
}
