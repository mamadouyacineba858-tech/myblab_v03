import { describe, it, expect } from 'vitest'
import { NmosModel } from '../../simulator/models/NmosModel.js'
describe('NmosModel', () => {
  it('exports only type and executable validation', () => { expect(Object.keys(NmosModel).sort()).toEqual(['type', 'validate']); expect(NmosModel.type).toBe('NMOS') })
  it.each([1, 0.001, 1e6])('accepts %s', (onResistance) => { expect(NmosModel.validate({ onResistance })).toBe(true) })
  it.each([0, -1, NaN, Infinity, -Infinity, undefined, null, '1'])('rejects %s', (onResistance) => { expect(NmosModel.validate({ onResistance })).toBe(false) })
  it.each([undefined, null, false, 'params'])('rejects invalid params %s', (params) => { expect(NmosModel.validate(params)).toBe(false) })
})
