// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PolarizedCapacitorPart } from '../PolarizedCapacitorPart.jsx'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { getComponentDef } from '../../../config/componentDefinitions.js'

describe('MB-L1-PROP-010 — POLARIZED_CAPACITOR dynamic capacitance marking', () => {
  it.each([
    [100e-6, '100µF'],
    [47e-6, '47µF'],
    [10e-6, '10µF'],
    [1e-6, '1µF'],
  ])('projette %s F en marquage %s sans modifier le 25V fixe', (capacitance, expected) => {
    const { container } = render(<PolarizedCapacitorPart parameters={{ capacitance }} />)
    expect(container.querySelector('.part-polarized-capacitor__capacitance-marking')?.textContent).toBe(expected)
    expect(container.querySelector('.part-polarized-capacitor__voltage-marking')?.textContent).toBe('25V')
    expect(container.querySelector('.part-polarized-capacitor')?.getAttribute('aria-label')).toContain(expected)
  })

  it('change réellement de marquage lorsque la capacitance change', () => {
    const view = render(<PolarizedCapacitorPart parameters={{ capacitance: 100e-6 }} />)
    expect(view.container.querySelector('.part-polarized-capacitor__capacitance-marking')?.textContent).toBe('100µF')
    view.rerender(<PolarizedCapacitorPart parameters={{ capacitance: 47e-6 }} />)
    expect(view.container.querySelector('.part-polarized-capacitor__capacitance-marking')?.textContent).toBe('47µF')
    expect(view.container.querySelector('.part-polarized-capacitor__voltage-marking')?.textContent).toBe('25V')
  })

  it('préserve le raster bleu, la bande de polarité et la zone de marquage comme simple projection DOM', () => {
    const { container } = render(<PolarizedCapacitorPart parameters={{ capacitance: 100e-6 }} />)
    expect(container.querySelector('.part-polarized-capacitor__img')).not.toBeNull()
    expect(container.querySelector('.part-polarized-capacitor__marking-patch')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('.part-polarized-capacitor__marking-patch').style.pointerEvents).toBe('none')
  })

  it('ne crée aucun voltageRating : 25V reste une caractéristique visuelle fixe', () => {
    const entry = getCanonicalEntry('POLARIZED_CAPACITOR')
    expect(entry.parameterSchema.map((p) => p.key)).toEqual(['capacitance'])
    expect(entry.defaultParameters).toEqual({ capacitance: 0.0001 })
    expect(entry.parameterSchema.some((p) => p.key === 'voltageRating')).toBe(false)
  })

  it('préserve pins, contacts et polarité existants', () => {
    const def = getComponentDef('POLARIZED_CAPACITOR')
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(def.pins.find((p) => p.id === 'plus').contacts).toEqual([
      { id: 'plus', dx: 28, dy: 80, wireConnectable: true, breadboardInsertable: true },
    ])
    expect(def.pins.find((p) => p.id === 'minus').contacts).toEqual([
      { id: 'minus', dx: 4, dy: 80, wireConnectable: true, breadboardInsertable: true },
    ])
  })
})
