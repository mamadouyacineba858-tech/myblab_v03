import { describe, it, expect } from 'vitest'
import { DEFAULT_VIEWPORT, createDefaultViewport, clampZoom, zoomViewportAtScreenPoint } from '../viewport.js'

describe('A13 product default scale', () => {
  it('starts at 100% without globally enlarging Arduino or breadboard', () => {
    expect(DEFAULT_VIEWPORT.zoom).toBe(1)
    expect(createDefaultViewport()).toEqual({ zoom: 1, translateX: 0, translateY: 0 })
  })
  it('keeps normal zoom-out and cursor-anchored zoom behavior', () => {
    const initial = createDefaultViewport()
    expect(clampZoom(1)).toBe(1)
    const next = zoomViewportAtScreenPoint(initial, 240, 180, 1.8)
    expect(next.zoom).toBe(1.8)
    expect(next.translateX + 240 / initial.zoom * next.zoom).toBeCloseTo(240)
    expect(next.translateY + 180 / initial.zoom * next.zoom).toBeCloseTo(180)
  })
})
