// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitContext } from '../../../context/CircuitContext.js'

const EXPECTED_CONTACTS = {
  D0: [165.0, 8.35],
  D1: [159.38, 8.35],
  D2: [153.75, 8.35],
  D3: [148.12, 8.35],
  D4: [142.38, 8.35],
  D5: [136.76, 8.35],
  D6: [131.13, 8.35],
  D7: [125.51, 8.35],
  D8: [114.61, 8.35],
  D9: [108.75, 8.35],
  D10: [102.77, 8.35],
  D11: [96.91, 8.35],
  D12: [91.17, 8.35],
  D13: [85.55, 8.35],
  GND: [112.15, 107.96],
  '5V': [106.41, 107.96],
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

  it('partage la boîte locale des contacts sans agrandir le corps seul', () => {
    const { container } = render(<ArduinoPart />)
    const root = container.querySelector('.part-arduino')
    expect(root).not.toBeNull()
    expect(root.getAttribute('data-canvas-scale')).toBe('1')
    expect(root.style.transform).toBe('scale(1)')
    expect(root.style.transformOrigin).toBe('center center')
  })

  it('force uniquement la source 3x pour le rendu visible sans réintroduire l’asset 1x comme candidat', () => {
    const { container } = render(<ArduinoPart />)
    const picture = container.querySelector('.part-arduino__picture')
    const source = container.querySelector('picture > source[type="image/webp"]')
    const img = container.querySelector('.part-arduino__img')

    expect(picture).not.toBeNull()
    expect(picture.getAttribute('data-hires-source')).toBe('3x-only')
    expect(img.getAttribute('src')).toBe('/assets/components/arduino/arduino.horizontal-candidate.3x.png')
    expect(img.getAttribute('srcset')).not.toContain('arduino.default.1x.png')
    expect(source.getAttribute('srcset')).not.toContain('arduino.default.1x.webp')
    expect(img.getAttribute('srcset')).toContain('arduino.horizontal-candidate.3x.png')
    expect(source.getAttribute('srcset')).toContain('arduino.horizontal-candidate.3x.webp')
    expect(img.style.filter).toContain('contrast(1.08)')
    expect(img.style.filter).toContain('saturate(1.04)')
  })

  it('ARRÊT — câble visuellement débranché et LED ON éteinte', () => {
    const { container } = renderArduino(false)
    expect(container.querySelector('.part-arduino').getAttribute('data-arduino-mode')).toBe('off')
    expect(container.querySelector('.part-arduino__usb-cable').getAttribute('data-usb-state')).toBe('disconnected')
    expect(container.querySelector('.part-arduino__usb-cable').style.display).toBe('none')
    expect(container.querySelector('.part-arduino__on-led').getAttribute('data-led-state')).toBe('off')
    expect(container.querySelector('.part-arduino__on-led').style.background).toBe('rgb(86, 94, 88)')
    const serialLeds = [...container.querySelectorAll('.part-arduino__serial-led')]
    expect(serialLeds).toHaveLength(2)
    for (const led of serialLeds) expect(led.dataset.ledState).toBe('off')
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


describe('CORR-005 — on-board digital silkscreen', () => {
  for (const active of [false, true]) {
    it(`keeps legacy pin metadata hidden behind raster silkscreen (${active ? 'RUN' : 'OFF'})`, () => {
      const { container } = renderArduino(active)
      const root = container.querySelector('.part-arduino__digital-pin-labels')
      const labels = [...container.querySelectorAll('[data-arduino-pin-label]')]
      expect(root.getAttribute('data-label-layout')).toBe('on-board')
      expect(root.style.display).toBe('none')
      expect(container.querySelectorAll('[data-arduino-pin-leader]')).toHaveLength(0)
      expect(labels).toHaveLength(14)
      expect(labels.map((label) => label.dataset.arduinoPinLabel).sort()).toEqual(
        Array.from({ length: 14 }, (_, i) => `D${i}`).sort()
      )
      for (const label of labels) {
        const contact = EXPECTED_CONTACTS[label.dataset.arduinoPinLabel]
        expect([Number(label.dataset.contactX), Number(label.dataset.contactY)]).toEqual(contact)
        expect(parseFloat(label.style.left)).toBe(contact[0])
        expect(parseFloat(label.style.top)).toBeGreaterThan(contact[1])
        expect(label.style.transform).toContain('translateX(-50%)')
        expect(label.style.background).toBe('')
        expect(label.textContent).toBe(label.dataset.arduinoPinLabel.slice(1))
      }
      expect(root.style.pointerEvents).toBe('none')
    })
  }
})

 describe('CORR003 — built-in L LED follows D13', () => {
  for (const [active, signal, expected] of [[false, 'HIGH', 'off'], [true, 'HIGH', 'on'], [true, 'LOW', 'off'], [true, 'FLOATING', 'off']]) {
    it(`RUN=${active}, D13=${signal} => L=${expected}`, () => {
      const { container } = render(<CircuitContext.Provider value={{ simulationActive: active }}><ArduinoPart uid="uno" pinSignals={new Map([['uno:D13', signal]])} /></CircuitContext.Provider>)
      expect(container.querySelector('.part-arduino__builtin-led').dataset.ledState).toBe(expected)
    })
  }
})
