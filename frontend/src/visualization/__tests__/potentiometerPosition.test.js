import { describe, expect, it } from 'vitest'
import {
  POTENTIOMETER_DEFAULT_POSITION,
  POTENTIOMETER_MAX_ANGLE_DEG,
  POTENTIOMETER_MIN_ANGLE_DEG,
  resolvePotentiometerVisualPosition,
} from '../potentiometerPosition.js'

describe('MB-L1-PROP-008 — potentiometer position projection', () => {
  it.each([
    [0, -135],
    [0.25, -67.5],
    [0.5, 0],
    [0.75, 67.5],
    [1, 135],
  ])('maps position %s to %s degrees', (position, angleDeg) => {
    expect(resolvePotentiometerVisualPosition(position)).toEqual({ position, angleDeg })
  })

  it('exposes the locked 270-degree mechanical sweep', () => {
    expect(POTENTIOMETER_MIN_ANGLE_DEG).toBe(-135)
    expect(POTENTIOMETER_MAX_ANGLE_DEG).toBe(135)
  })

  it('fails safe to the canonical midpoint for invalid input', () => {
    expect(resolvePotentiometerVisualPosition(undefined)).toEqual({
      position: POTENTIOMETER_DEFAULT_POSITION,
      angleDeg: 0,
    })
    expect(resolvePotentiometerVisualPosition(Number.NaN).angleDeg).toBe(0)
  })

  it('clamps defensive direct-render inputs without mutating electrical state', () => {
    expect(resolvePotentiometerVisualPosition(-1)).toEqual({ position: 0, angleDeg: -135 })
    expect(resolvePotentiometerVisualPosition(2)).toEqual({ position: 1, angleDeg: 135 })
  })
})
