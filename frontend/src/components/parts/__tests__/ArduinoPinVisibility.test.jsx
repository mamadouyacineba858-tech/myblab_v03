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

describe('MB-L1-ARDUINO-001 — exact approved Arduino reference', () => {
  it('n’ajoute aucun badge, numéro ou pastille artificielle autour des pins', () => {
    const { container } = render(<ArduinoPart />)
    expect(container.querySelector('.part-arduino__visible-pin')).toBeNull()
    expect(container.querySelector('.part-arduino__visible-pin-label')).toBeNull()
    expect(container.querySelector('[data-arduino-pin]')).toBeNull()
  })

  it('conserve la taille Canvas validée à 2.20×', () => {
    const { container } = render(<ArduinoPart />)
    const root = container.querySelector('.part-arduino')
    expect(root.getAttribute('data-canvas-scale')).toBe('2.2')
    expect(root.style.transform).toBe('scale(2.2)')
    expect(root.getAttribute('data-reference-render')).toBe('exact-approved-reference')
  })

  it('ARRÊT utilise directement l’asset de référence câble non inséré', () => {
    const { container } = renderArduino(false)
    const root = container.querySelector('.part-arduino')
    const img = container.querySelector('.part-arduino__reference-img')
    expect(root.getAttribute('data-arduino-mode')).toBe('off')
    expect(img.getAttribute('src')).toBe('/assets/components/arduino/arduino.reference.off.webp')
    expect(container.querySelector('.part-arduino__usb-cable')).toBeNull()
    expect(container.querySelector('.part-arduino__on-led')).toBeNull()
  })

  it('MARCHE utilise directement l’asset de référence câble inséré + LED ON', () => {
    const { container } = renderArduino(true)
    const root = container.querySelector('.part-arduino')
    const img = container.querySelector('.part-arduino__reference-img')
    expect(root.getAttribute('data-arduino-mode')).toBe('run')
    expect(img.getAttribute('src')).toBe('/assets/components/arduino/arduino.reference.run.webp')
    expect(container.querySelector('.part-arduino__usb-cable')).toBeNull()
    expect(container.querySelector('.part-arduino__on-led')).toBeNull()
  })

  it('ne revient ni au raster historique ni au body SVG reconstruit', () => {
    const { container } = render(<ArduinoPart />)
    const img = container.querySelector('.part-arduino__reference-img')
    expect(img.getAttribute('src')).not.toContain('arduino.default')
    expect(img.getAttribute('src')).not.toContain('arduino.approved.body.svg')
    expect(container.querySelector('picture')).toBeNull()
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
