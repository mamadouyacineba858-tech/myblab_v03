// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitContext } from '../../../context/CircuitContext.js'

const EXPECTED_CONTACTS = {
  D2: [3, 50],
  D3: [15, 75],
  GND: [15, 108],
  '5V': [115, 50],
}

function renderArduino(simulationActive) {
  return render(
    <CircuitContext.Provider value={{ simulationActive }}>
      <ArduinoPart />
    </CircuitContext.Provider>
  )
}

describe('MB-L1-ARDUINO-001 — Tinkercad-like Arduino presentation', () => {
  it('n’ajoute aucun badge, numéro ou pastille artificielle autour des pins', () => {
    const { container } = render(<ArduinoPart />)
    expect(container.querySelector('.part-arduino__visible-pin')).toBeNull()
    expect(container.querySelector('.part-arduino__visible-pin-label')).toBeNull()
    expect(container.querySelector('[data-arduino-pin]')).toBeNull()
  })

  it('verrouille le zoom Canvas révisé à 2.20×', () => {
    const { container } = render(<ArduinoPart />)
    const root = container.querySelector('.part-arduino')
    expect(root).not.toBeNull()
    expect(root.getAttribute('data-canvas-scale')).toBe('2.2')
    expect(root.style.transform).toBe('scale(2.2)')
    expect(root.style.transformOrigin).toBe('center center')
    expect(container.querySelector('.part-arduino__img')).not.toBeNull()
  })

  it('ARRÊT — câble visuellement débranché et LED ON éteinte', () => {
    const { container } = renderArduino(false)
    expect(container.querySelector('.part-arduino').getAttribute('data-arduino-mode')).toBe('off')
    expect(container.querySelector('.part-arduino__usb-cable').getAttribute('data-usb-state')).toBe('disconnected')
    expect(container.querySelector('.part-arduino__on-led').getAttribute('data-led-state')).toBe('off')
  })

  it('MARCHE — câble visuellement inséré et LED ON verte', () => {
    const { container } = renderArduino(true)
    expect(container.querySelector('.part-arduino').getAttribute('data-arduino-mode')).toBe('run')
    expect(container.querySelector('.part-arduino__usb-cable').getAttribute('data-usb-state')).toBe('connected')
    const led = container.querySelector('.part-arduino__on-led')
    expect(led.getAttribute('data-led-state')).toBe('on')
    expect(led.style.boxShadow).not.toBe('none')
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
