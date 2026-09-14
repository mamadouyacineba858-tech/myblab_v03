// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PowerPart } from '../PowerPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'

describe('MB-L1-POWER-001 — Canvas readability', () => {
  it('agrandit uniquement la présentation POWER à 2.5×', () => {
    const { container } = render(<PowerPart />)
    const root = container.querySelector('.part-power')
    expect(root.getAttribute('data-canvas-scale')).toBe('2.5')
    expect(root.style.transform).toBe('scale(2.5)')
    expect(root.style.transformOrigin).toBe('center center')
  })

  it('force la variante raster 3x pour le rendu visible', () => {
    const { container } = render(<PowerPart />)
    const picture = container.querySelector('.part-power__picture')
    const img = container.querySelector('.part-power__img')
    const source = container.querySelector('picture > source[type="image/webp"]')

    expect(picture.getAttribute('data-hires-source')).toBe('3x-only')
    expect(img.getAttribute('src')).toBe('/assets/components/power/power.default.3x.png')
    expect(img.getAttribute('srcset')).not.toContain('power.default.1x.png')
    expect(source.getAttribute('srcset')).not.toContain('power.default.1x.webp')
  })

  it('rend lisibles les sérigraphies de commande sans interaction propre', () => {
    const { container } = render(<PowerPart />)
    const overlay = container.querySelector('.part-power__facade-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay.style.pointerEvents).toBe('none')

    const labels = [...container.querySelectorAll('.part-power__facade-label')]
    const text = labels.map((el) => el.textContent)
    for (const expected of ['VOLTAGE', 'CURRENT', 'POWER', 'MIN', 'MAX', 'DC POWER SUPPLY', 'MCH-305D']) {
      expect(text).toContain(expected)
    }
    for (const label of labels) expect(label.style.pointerEvents).toBe('none')
  })

  it('ne modifie ni les pins ni les PhysicalContacts', () => {
    const def = getComponentDef('POWER')
    expect(def.pins.map((pin) => pin.id)).toEqual(['5V', 'GND'])
    const byId = Object.fromEntries(def.pins.map((pin) => [pin.id, pin]))
    expect(byId['5V'].contacts[0]).toMatchObject({ dx: 35, dy: 67, wireConnectable: true, breadboardInsertable: false })
    expect(byId.GND.contacts[0]).toMatchObject({ dx: 22, dy: 67, wireConnectable: true, breadboardInsertable: false })
  })
})
