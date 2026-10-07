// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitContext } from '../../../context/CircuitContext.js'

const EXPECTED_CONTACTS = {
  D0: [110, 33],
  D1: [106, 33],
  D2: [102, 33],
  D3: [98, 33],
  D4: [94, 33],
  D5: [90, 33],
  D6: [86, 33],
  D7: [82, 33],
  D8: [79, 33],
  D9: [75, 33],
  D10: [71, 33],
  D11: [67, 33],
  D12: [63, 33],
  D13: [59, 33],
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

describe('MB-L1-ARDUINO-001 — refined Arduino OFF/RUN presentation', () => {
  it('n’ajoute aucun badge, numéro ou pastille artificielle autour des pins', () => {
    const { container } = render(<ArduinoPart />)
    expect(container.querySelector('.part-arduino__visible-pin')).toBeNull()
    expect(container.querySelector('.part-arduino__visible-pin-label')).toBeNull()
    expect(container.querySelector('[data-arduino-pin]')).toBeNull()
  })

  it('verrouille le raffinement Canvas à 2.45×', () => {
    const { container } = render(<ArduinoPart />)
    const root = container.querySelector('.part-arduino')
    expect(root).not.toBeNull()
    expect(root.getAttribute('data-canvas-scale')).toBe('2.45')
    expect(root.style.transform).toBe('scale(2.45)')
    expect(root.style.transformOrigin).toBe('center center')
  })

  it('force uniquement la source 3x pour le rendu visible sans réintroduire l’asset 1x comme candidat', () => {
    const { container } = render(<ArduinoPart />)
    const picture = container.querySelector('.part-arduino__picture')
    const source = container.querySelector('picture > source[type="image/webp"]')
    const img = container.querySelector('.part-arduino__img')

    expect(picture).not.toBeNull()
    expect(picture.getAttribute('data-hires-source')).toBe('3x-only')
    expect(img.getAttribute('src')).toBe('/assets/components/arduino/arduino.default.3x.png')
    expect(img.getAttribute('srcset')).not.toContain('arduino.default.1x.png')
    expect(source.getAttribute('srcset')).not.toContain('arduino.default.1x.webp')
    expect(img.getAttribute('srcset')).toContain('arduino.default.3x.png')
    expect(source.getAttribute('srcset')).toContain('arduino.default.3x.webp')
    expect(img.style.filter).toContain('contrast(1.08)')
    expect(img.style.filter).toContain('saturate(1.04)')
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

  it('expose D0-D13 plus GND/5V comme PhysicalContacts wire-only', () => {
    const def = getComponentDef('ARDUINO')
    expect(def.pins).toHaveLength(16)
    for (const pin of def.pins) {
      expect(pin.contacts).toHaveLength(1)
      const contact = pin.contacts[0]
      expect([contact.dx, contact.dy]).toEqual(EXPECTED_CONTACTS[pin.id])
      expect(contact.wireConnectable).toBe(true)
      expect(contact.breadboardInsertable).toBe(false)
    }
  })

  it('verrouille le mapping du header numérique et la migration physique D2/D3', () => {
    const def = getComponentDef('ARDUINO')
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))
    for (let pin = 0; pin <= 13; pin++) {
      expect([byId[`D${pin}`].contacts[0].dx, byId[`D${pin}`].contacts[0].dy]).toEqual(EXPECTED_CONTACTS[`D${pin}`])
    }
    expect({ dx: byId.GND.dx, dy: byId.GND.dy }).toEqual({ dx: 0, dy: 110 })
    expect({ dx: byId['5V'].dx, dy: byId['5V'].dy }).toEqual({ dx: 120, dy: 50 })
  })
})
