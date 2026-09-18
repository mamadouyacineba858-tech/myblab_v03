import { describe, it, expect } from 'vitest'
import { PmosModel } from '../../simulator/models/PmosModel.js'
describe('PmosModel', () => {
  it('exports only type and executable validation', () => { expect(Object.keys(PmosModel).sort()).toEqual(['type', 'validate']); expect(PmosModel.type).toBe('PMOS') })
  it.each([1, 0.001, 1e6])('accepts %s', (onResistance) => { expect(PmosModel.validate({ onResistance })).toBe(true) })
  it.each([0, -1, NaN, Infinity, -Infinity, undefined, null, '1'])('rejects %s', (onResistance) => { expect(PmosModel.validate({ onResistance })).toBe(false) })
  it.each([undefined, null, false, 'params'])('rejects invalid params %s', (params) => { expect(PmosModel.validate(params)).toBe(false) })
})
