import { describe, it, expect } from 'vitest'
import { getPinPresentationPosition } from '../pinPresentationGeometry.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

describe('MB-VIS-LED-V5 — presentation-only pin geometry', () => {
  it('projects LED pins to the physical feet without changing the electrical definition', () => {
    const component = { uid: 'led-1', type: 'LED', x: 100, y: 200 }
    const def = getComponentDef('LED')

    expect(def.pins).toEqual([
      expect.objectContaining({ id: 'anode', dx: 0, dy: 20 }),
      expect.objectContaining({ id: 'cathode', dx: 80, dy: 20 }),
    ])

    expect(getPinPresentationPosition(component, def.pins[0])).toEqual({ x: 128, y: 268 })
    expect(getPinPresentationPosition(component, def.pins[1])).toEqual({ x: 152, y: 268 })
  })

  it('falls back to canonical coordinates for non-LED components', () => {
    const component = { uid: 'res-1', type: 'RESISTOR', x: 100, y: 200 }
    const def = getComponentDef('RESISTOR')

    expect(getPinPresentationPosition(component, def.pins[0])).toEqual({ x: 100, y: 214 })
    expect(getPinPresentationPosition(component, def.pins[1])).toEqual({ x: 184, y: 214 })
  })
})
