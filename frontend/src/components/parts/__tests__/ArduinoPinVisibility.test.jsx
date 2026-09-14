// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'

const EXPECTED_CONTACTS = {
  D2: [3, 50],
  D3: [15, 75],
  GND: [15, 108],
  '5V': [115, 50],
}

describe('MB-L1-ARDUINO-001 — Tinkercad-like natural pin presentation', () => {
  it('n’ajoute aucun badge, numéro ou pastille artificielle au-dessus du PCB', () => {
    const { container } = render(<ArduinoPart />)
    expect(container.querySelector('.part-arduino__visible-pin')).toBeNull()
    expect(container.querySelector('.part-arduino__visible-pin-label')).toBeNull()
    expect(container.querySelector('[data-arduino-pin]')).toBeNull()
    expect(container.textContent.trim()).toBe('')
  })

  it('verrouille la taille Canvas approuvée à 1.30× sans modifier l’asset source', () => {
    const { container } = render(<ArduinoPart />)
    const root = container.querySelector('.part-arduino')
    expect(root).not.toBeNull()
    expect(root.getAttribute('data-canvas-scale')).toBe('1.3')
    expect(root.style.transform).toBe('scale(1.3)')
    expect(root.style.transformOrigin).toBe('center center')
    expect(container.querySelector('.part-arduino__img')).not.toBeNull()
  })

  it('préserve les quatre PhysicalContacts existants en attendant l’extension GPIO complète', () => {
    const def = getComponentDef('ARDUINO')
    expect(def.pins).toHaveLength(4)
    for (const pin of def.pins) {
      expect(pin.contacts).toHaveLength(1)
      const contact = pin.contacts[0]
      expect([contact.dx, contact.dy]).toEqual(EXPECTED_CONTACTS[pin.id])
      expect(contact.wireConnectable).toBe(true)
      expect(contact.breadboardInsertable).toBe(false)
    }
  })

  it('préserve les coordonnées électriques historiques de ce ticket visuel', () => {
    const def = getComponentDef('ARDUINO')
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))
    expect({ dx: byId.D2.dx, dy: byId.D2.dy }).toEqual({ dx: 0, dy: 50 })
    expect({ dx: byId.D3.dx, dy: byId.D3.dy }).toEqual({ dx: 0, dy: 75 })
    expect({ dx: byId.GND.dx, dy: byId.GND.dy }).toEqual({ dx: 0, dy: 110 })
    expect({ dx: byId['5V'].dx, dy: byId['5V'].dy }).toEqual({ dx: 120, dy: 50 })
  })
})
