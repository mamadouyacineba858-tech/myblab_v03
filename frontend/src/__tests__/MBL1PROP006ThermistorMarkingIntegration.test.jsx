// MB-L1-PROP-006 — integration du pipeline parameters -> PartRenderer -> ThermistorPart.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PartRenderer } from '../components/parts/PartRenderer.jsx'

describe('MB-L1-PROP-006 — THERMISTOR parameter projection', () => {
  it('applique le default canonique 10 kΩ -> 103 quand parameters est absent', () => {
    const { container } = render(<PartRenderer type="THERMISTOR" uid="th-default" />)
    expect(container.querySelector('.part-thermistor__marking')?.textContent).toBe('103')
  })

  it.each([
    [1_000, '102'],
    [10_000, '103'],
    [47_000, '473'],
    [100_000, '104'],
    [470_000, '474'],
  ])('projette %s Ω -> %s', (resistance, marking) => {
    const { container } = render(
      <PartRenderer type="THERMISTOR" uid={`th-${resistance}`} parameters={{ resistance }} />,
    )
    expect(container.querySelector('.part-thermistor__marking')?.textContent).toBe(marking)
  })

  it('garde la valeur non representable visuellement neutre', () => {
    const { container } = render(
      <PartRenderer type="THERMISTOR" uid="th-neutral" parameters={{ resistance: 12_345 }} />,
    )
    expect(container.querySelector('.part-thermistor__marking')).toBeNull()
  })
})
