/**
 * PartRenderer.visualState.test.jsx — MB-VIS-COMP-002 (Phase 7)
 *
 * Complète RealisticRenderers.test.jsx (qui teste LedPart/RgbLedPart en
 * isolation et via manager.render avec des props passées à la main) en
 * exerçant le mécanisme réellement introduit par MB-VIS-COMP-002 : le
 * Visual State Registry, tel que consommé par PartRenderer.jsx via
 * getVisualState(type, { uid, pinSignals }).
 *
 * TEST 3 : LED conserve son état visuel (isOn dérivé de pinSignals réels).
 * TEST 4 : RGB_LED conserve son état visuel (r/g/b dérivés de pinSignals réels).
 * TEST 9 (complément) : la résolution ne modifie pas les signaux fournis.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PartRenderer } from '../PartRenderer.jsx'
import { Signal } from '../../../simulator/signals.js'

describe('MB-VIS-COMP-002 — PartRenderer → Visual State Registry (TEST 3, TEST 4)', () => {
  it('TEST 3 — LED : isOn=true dérivé de pinSignals réels (anode HIGH, cathode LOW)', () => {
    const signals = new Map([
      ['led-1:anode', Signal.HIGH],
      ['led-1:cathode', Signal.LOW],
    ])
    const { container } = render(<PartRenderer type="LED" uid="led-1" pinSignals={signals} />)
    const root = container.querySelector('.part-led')
    expect(root.getAttribute('class')).toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED allumée')
  })

  it('TEST 3 — LED : isOn=false dérivé de pinSignals réels (anode LOW)', () => {
    const signals = new Map([
      ['led-2:anode', Signal.LOW],
      ['led-2:cathode', Signal.LOW],
    ])
    const { container } = render(<PartRenderer type="LED" uid="led-2" pinSignals={signals} />)
    const root = container.querySelector('.part-led')
    expect(root.getAttribute('class')).not.toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED éteinte')
  })

  it('TEST 4 — RGB_LED : état visuel "red" dérivé de pinSignals réels (common LOW, R HIGH) — MB-VIS-COMP-033 raster', () => {
    const signals = new Map([
      ['rgb-1:common', Signal.LOW],
      ['rgb-1:R', Signal.HIGH],
      ['rgb-1:G', Signal.LOW],
      ['rgb-1:B', Signal.LOW],
    ])
    const { container } = render(<PartRenderer type="RGB_LED" uid="rgb-1" pinSignals={signals} />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('red')
    expect(container.querySelector('img').getAttribute('src')).toContain('/assets/components/rgb-led/rgb-led.red.')
  })

  it('TEST 4b — RGB_LED : common LOW, R+G HIGH → état visuel "yellow" (mélange dérivé de r/g/b réels)', () => {
    const signals = new Map([
      ['rgb-2:common', Signal.LOW],
      ['rgb-2:R', Signal.HIGH],
      ['rgb-2:G', Signal.HIGH],
      ['rgb-2:B', Signal.LOW],
    ])
    const { container } = render(<PartRenderer type="RGB_LED" uid="rgb-2" pinSignals={signals} />)
    expect(container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('yellow')
  })

  it('TEST 9 (complément) — la résolution via PartRenderer ne modifie pas le Map de signaux fourni', () => {
    const signals = new Map([
      ['led-3:anode', Signal.HIGH],
      ['led-3:cathode', Signal.LOW],
    ])
    const snapshotBefore = new Map(signals)
    render(<PartRenderer type="LED" uid="led-3" pinSignals={signals} />)
    expect(signals).toEqual(snapshotBefore)
  })

  it('un type sans resolver de Visual State Registry (RESISTOR) rend toujours sans erreur', () => {
    const { container } = render(<PartRenderer type="RESISTOR" uid="r-1" pinSignals={new Map()} />)
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBeNull()
  })
})
