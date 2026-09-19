import { describe, it, expect } from 'vitest'
import { getRasterWeightLimitKb } from '../rasterBudget.js'
import { RENDER_BUDGET } from '../visualContract.js'

describe('generic bounded raster weight contract CR-1', () => {
  it.each([{}, { states: [] }, { states: ['default'] }, { budget: {} }, { assetStatus: 'FOUNDER_PASS_FROZEN' }])('preserves the simple limit without override: %j', manifest => {
    expect(getRasterWeightLimitKb(manifest)).toBe(30)
  })
  it.each([{ complexity: 'complex' }, { budget: { complexity: 'complex' } }, { states: ['off', 'on'] }])('preserves complex classification: %j', manifest => {
    expect(getRasterWeightLimitKb(manifest)).toBe(175)
  })
  it('keeps normal limits unchanged and bounds exceptional requests at 425 KiB', () => {
    expect(RENDER_BUDGET.raster).toMatchObject({ maxWeightKbPerVariantSimple: 30, maxWeightKbPerVariantComplex: 175, maxWeightKbPerVariantExceptional: 425 })
  })
  it.each([175, 200, 425])('accepts a bounded complex request of %s KiB', maxWeightKbPerVariant => {
    expect(getRasterWeightLimitKb({ complexity: 'complex', budget: { maxWeightKbPerVariant } })).toBe(maxWeightKbPerVariant)
  })
  it.each([30, 100, 425])('accepts a bounded simple request of %s KiB', maxWeightKbPerVariant => {
    expect(getRasterWeightLimitKb({ budget: { maxWeightKbPerVariant } })).toBe(maxWeightKbPerVariant)
  })
  it.each([425.01, 426, Infinity, -Infinity, NaN, 0, -1, null, undefined, '425', true, 174.99])('rejects invalid or below-normal complex request %s', maxWeightKbPerVariant => {
    expect(() => getRasterWeightLimitKb({ complexity: 'complex', budget: { maxWeightKbPerVariant } })).toThrow(RangeError)
  })
  it('rejects a request below the simple limit', () => {
    expect(() => getRasterWeightLimitKb({ budget: { maxWeightKbPerVariant: 29 } })).toThrow(RangeError)
  })
  it('does not consult component identity or frozen status to allow an exception', () => {
    const manifest = { budget: { maxWeightKbPerVariant: 400 } }
    Object.defineProperties(manifest, {
      component: { get() { throw new Error('component identity read') } },
      type: { get() { throw new Error('component type read') } },
      assetStatus: { get() { throw new Error('frozen status read') } },
    })
    expect(getRasterWeightLimitKb(manifest)).toBe(400)
    expect(manifest.budget.maxWeightKbPerVariant).toBe(400)
  })
})
