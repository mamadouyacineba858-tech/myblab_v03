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

  it('utilise directement la référence haute résolution approuvée', () => {
    const { container } = render(<PowerPart />)
    const root = container.querySelector('.part-power')
    const img = container.querySelector('.part-power__img--approved-reference')

    expect(root.getAttribute('data-visual-authority')).toBe('approved-reference')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('/assets/components/power/power.reference.hires.webp')
    expect(img.style.pointerEvents).toBe('none')
    expect(container.querySelector('.part-power__facade-overlay')).toBeNull()
    expect(container.querySelector('.part-power__facade-label')).toBeNull()
  })

  it('ne modifie ni les pins ni les PhysicalContacts', () => {
    const def = getComponentDef('POWER')
    expect(def.pins.map((pin) => pin.id)).toEqual(['5V', 'GND'])
    const byId = Object.fromEntries(def.pins.map((pin) => [pin.id, pin]))
    expect(byId['5V'].contacts[0]).toMatchObject({ dx: 35, dy: 67, wireConnectable: true, breadboardInsertable: false })
    expect(byId.GND.contacts[0]).toMatchObject({ dx: 22, dy: 67, wireConnectable: true, breadboardInsertable: false })
  })
})
