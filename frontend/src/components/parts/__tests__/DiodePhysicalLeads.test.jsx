import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DiodePart } from '../DiodePart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'

describe('MB-L1-PROP-007 — DIODE physical lead consolidation', () => {
  it('keeps only the opaque central raster body window and preserves the cathode-bearing asset', () => {
    const { container } = render(<DiodePart />)
    const root = container.querySelector('.part-diode')
    const picture = container.querySelector('.part-diode__picture')
    const img = container.querySelector('.part-diode__img')

    expect(root).not.toBeNull()
    expect(root.getAttribute('data-body-window')).toBe('31-51')
    expect(picture).not.toBeNull()
    expect(picture.style.clipPath).toContain('inset(')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('/assets/components/diode/diode.default.3x.png')
  })

  it('connects two polished-metal leads directly to the visible cylinder without changing electrical endpoints', () => {
    const profile = getAssemblyProfile('DIODE')
    expect(profile).not.toBeNull()
    expect(profile.leads.anode).toEqual({ root: { dx: 31, dy: 15 }, style: 'metallic-wire' })
    expect(profile.leads.cathode).toEqual({ root: { dx: 51, dy: 15 }, style: 'metallic-wire' })

    const def = getComponentDef('DIODE')
    const byId = Object.fromEntries(def.pins.map((pin) => [pin.id, [pin.dx, pin.dy]]))
    expect(byId.anode).toEqual([0, 15])
    expect(byId.cathode).toEqual([84, 15])

    const geometry = resolveAssemblyGeometry({ type: 'DIODE', x: 10, y: 20 }, null)
    expect(geometry.contacts).toHaveLength(2)

    const anode = geometry.contacts.find((c) => c.pinId === 'anode')
    const cathode = geometry.contacts.find((c) => c.pinId === 'cathode')

    expect(anode).toMatchObject({
      root: { x: 41, y: 35 },
      target: { x: 10, y: 35 },
      style: 'metallic-wire',
    })
    expect(cathode).toMatchObject({
      root: { x: 61, y: 35 },
      target: { x: 94, y: 35 },
      style: 'metallic-wire',
    })
  })

  it('does not invent a visual mapping from DC model parameters', () => {
    const a = render(<DiodePart parameters={{ forwardVoltage: 0.2, onResistance: 1 }} />)
    const htmlA = a.container.innerHTML
    a.unmount()

    const b = render(<DiodePart parameters={{ forwardVoltage: 1.8, onResistance: 1000 }} />)
    const htmlB = b.container.innerHTML
    b.unmount()

    expect(htmlB).toBe(htmlA)
  })
})
