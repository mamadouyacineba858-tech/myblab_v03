// MB-L1-PROP-006 — THERMISTOR dynamic nominal marking + shared V2 silhouette.
// React explicite requis par la config Vitest secondaire du depot.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThermistorPart } from '../ThermistorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'

describe('MB-L1-PROP-006 — THERMISTOR rendu physique + marquage', () => {
  it('conserve la boite canonique 84x36 et les pins A/B', () => {
    const def = getComponentDef('THERMISTOR')
    expect([def.width, def.height]).toEqual([84, 36])
    expect(def.pins.map((p) => [p.id, p.dx, p.dy])).toEqual([
      ['A', 0, 18],
      ['B', 84, 18],
    ])
  })

  it('reutilise la silhouette CAPACITOR V2 et la rend noire', () => {
    const { container } = render(<ThermistorPart parameters={{ resistance: 10_000 }} />)
    const img = container.querySelector('.part-thermistor__img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('/assets/components/capacitor/capacitor.base.3x.png')
    expect(img.style.filter).toContain('grayscale(1)')
    expect(container.textContent).toContain('NTC')
  })

  it.each([
    [100, '101'],
    [1_000, '102'],
    [10_000, '103'],
    [47_000, '473'],
    [100_000, '104'],
    [220_000, '224'],
    [470_000, '474'],
    [1_000_000, '105'],
  ])('%s ohms -> %s', (resistance, marking) => {
    const { container } = render(<ThermistorPart parameters={{ resistance }} />)
    expect(container.querySelector('.part-thermistor__marking')?.textContent).toBe(marking)
    expect(container.getAttribute('aria-label')).toBeNull()
    expect(container.querySelector('.part-thermistor')?.getAttribute('aria-label')).toContain(marking)
  })

  it('ne fabrique aucun faux code pour une valeur non representable', () => {
    const { container } = render(<ThermistorPart parameters={{ resistance: 12_345 }} />)
    expect(container.querySelector('.part-thermistor__marking')).toBeNull()
    expect(container.querySelector('.part-thermistor')?.getAttribute('aria-label')).toBe('Thermistance NTC')
  })

  it('preserve les PhysicalContacts et utilise les pattes metalliques brillantes', () => {
    const geometry = resolveAssemblyGeometry(
      { uid: 'th-1', type: 'THERMISTOR', x: 100, y: 200 },
      null,
    )
    expect(geometry.contacts.map((c) => [
      c.pinId,
      c.root.x - 100,
      c.root.y - 200,
      c.target.x - 100,
      c.target.y - 200,
      c.style,
    ])).toEqual([
      ['A', 30, 31, 30, 62, 'metallic-wire'],
      ['B', 54, 31, 54, 62, 'metallic-wire'],
    ])
  })

  it('conserve le contrat bareBody/markerless existant sans logique centrale specifique', () => {
    expect(getComponentPresentation('THERMISTOR')).toEqual({
      backend: 'svg',
      bareBody: true,
      markerless: true,
    })
  })
})
