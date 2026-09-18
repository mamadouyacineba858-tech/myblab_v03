import { describe, it, expect } from 'vitest'
import { PnpTransistorModel } from '../../simulator/models/PnpTransistorModel.js'
describe('PnpTransistorModel', () => {
  it('exports only type and executable validation', () => { expect(Object.keys(PnpTransistorModel).sort()).toEqual(['type', 'validate']); expect(PnpTransistorModel.type).toBe('PNP_TRANSISTOR') })
  it.each([1, 0.001, 1e6])('accepts %s', (onResistance) => { expect(PnpTransistorModel.validate({ onResistance })).toBe(true) })
  it.each([0, -1, NaN, Infinity, -Infinity, undefined, null, '1'])('rejects %s', (onResistance) => { expect(PnpTransistorModel.validate({ onResistance })).toBe(false) })
  it.each([undefined, null, false, 'params'])('rejects invalid params %s', (params) => { expect(PnpTransistorModel.validate(params)).toBe(false) })
})
