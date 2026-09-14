import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { PotentiometerPart } from '../PotentiometerPart.jsx'

describe('MB-L1-PROP-008 — POTENTIOMETER dynamic wiper position rendering', () => {
  it.each([
    [0, '-135'],
    [0.25, '-67.5'],
    [0.5, '0'],
    [0.75, '67.5'],
    [1, '135'],
  ])('projects position %s into the visible knob indicator', (position, angle) => {
    const { container } = render(<PotentiometerPart parameters={{ resistance: 10000, position }} />)
    const root = container.querySelector('.part-potentiometer')
    const indicator = container.querySelector('.part-potentiometer__indicator')

    expect(root.getAttribute('data-position')).toBe(String(position))
    expect(root.getAttribute('data-angle-deg')).toBe(angle)
    expect(indicator.style.transform).toContain(`rotate(${angle}deg)`)
    expect(indicator.style.transformOrigin).toBe('50% 100%')
  })

  it('keeps total resistance visually independent from knob position', () => {
    const a = render(<PotentiometerPart parameters={{ resistance: 1000, position: 0.25 }} />)
    const transformA = a.container.querySelector('.part-potentiometer__indicator').style.transform
    a.unmount()

    const b = render(<PotentiometerPart parameters={{ resistance: 100000, position: 0.25 }} />)
    const transformB = b.container.querySelector('.part-potentiometer__indicator').style.transform
    b.unmount()

    expect(transformB).toBe(transformA)
  })

  it('preserves the same realistic raster asset for every position', () => {
    const a = render(<PotentiometerPart parameters={{ position: 0 }} />)
    const srcA = a.container.querySelector('img').getAttribute('src')
    a.unmount()

    const b = render(<PotentiometerPart parameters={{ position: 1 }} />)
    const srcB = b.container.querySelector('img').getAttribute('src')
    b.unmount()

    expect(srcB).toBe(srcA)
    expect(srcA).toContain('/assets/components/potentiometer/potentiometer.default.3x.png')
  })
})
