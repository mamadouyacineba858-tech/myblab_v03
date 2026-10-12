import { describe, it, expect } from 'vitest'
import { DEFAULT_VIEWPORT, createDefaultViewport, clampZoom, zoomViewportAtScreenPoint } from '../viewport.js'

describe('A13 product default scale', () => {
  it('starts maximum 200% through the single canonical viewport', () => {
    expect(DEFAULT_VIEWPORT.zoom).toBe(2)
    expect(createDefaultViewport()).toEqual({ zoom: 2, translateX: 0, translateY: 0 })
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
