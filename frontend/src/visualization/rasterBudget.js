import { RENDER_BUDGET } from './visualContract.js'

/** Resolve a pack's weight limit; exceptional requests must stay within the contract. */
export function getRasterWeightLimitKb(manifest) {
  const limits = RENDER_BUDGET.raster
  const stateCount = Array.isArray(manifest.states) && manifest.states.length ? manifest.states.length : 1
  const normal = manifest.complexity === 'complex' ||
    manifest.budget?.complexity === 'complex' || stateCount > 1
    ? limits.maxWeightKbPerVariantComplex : limits.maxWeightKbPerVariantSimple

  if (!Object.prototype.hasOwnProperty.call(manifest.budget ?? {}, 'maxWeightKbPerVariant')) return normal
  const requested = manifest.budget.maxWeightKbPerVariant
  if (!Number.isFinite(requested) || requested <= 0 || requested < normal ||
      requested > limits.maxWeightKbPerVariantExceptional) {
    throw new RangeError(`Raster weight limit must be finite and between ${normal} and ${limits.maxWeightKbPerVariantExceptional} KiB`)
  }
  return requested
}
