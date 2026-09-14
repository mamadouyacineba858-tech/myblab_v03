// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { ArduinoPart } from '../ArduinoPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const EXPECTED = {
  D2: [3, 50],
  D3: [15, 75],
  GND: [15, 108],
  '5V': [115, 50],
}

describe('MB-L1-ARDUINO-001 — Pin Visibility & Physical Connectivity', () => {
  it('rend D2, D3, GND et 5V visibles avec un label explicite', () => {
    const { container } = render(<ArduinoPart />)
    const markers = [...container.querySelectorAll('.part-arduino__visible-pin')]
    expect(markers).toHaveLength(4)
    expect(markers.map((m) => m.getAttribute('data-arduino-pin')).sort()).toEqual(['5V', 'D2', 'D3', 'GND'])

    for (const [id, [x, y]] of Object.entries(EXPECTED)) {
      const marker = container.querySelector(`[data-arduino-pin="${id}"]`)
      expect(marker).not.toBeNull()
      expect(Number(marker.style.left.replace('px', ''))).toBe(x)
      expect(Number(marker.style.top.replace('px', ''))).toBe(y)
      expect(marker.textContent).toContain(id)
      expect(marker.style.pointerEvents).toBe('none')
    }
  })

  it('les marqueurs visibles reprennent exactement les PhysicalContacts déclarés', () => {
    const def = getComponentDef('ARDUINO')
    for (const pin of def.pins) {
      expect(pin.contacts).toHaveLength(1)
      const contact = pin.contacts[0]
      expect([contact.dx, contact.dy]).toEqual(EXPECTED[pin.id])
    }
  })

  it('dans le pipeline réel, marqueur visible et hit target de câblage convergent', () => {
    const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
    function Harness({ onReady }) {
      const c = useCircuit()
      const { components } = useCircuitInteraction()
      onReady({ ...c, components })
      return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
    }

    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('ARDUINO', 100, 100) })

    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins).toHaveLength(4)

    for (const pin of pins) {
      const id = pin.getAttribute('data-wire-pin')
      const marker = container.querySelector(`[data-arduino-pin="${id}"]`)
      expect(marker).not.toBeNull()
      expect(pin.style.left).toBe(marker.style.left)
      expect(pin.style.top).toBe(marker.style.top)
    }
  })

  it('ne modifie ni le Core ni la géométrie électrique canonique Arduino', () => {
    const def = getComponentDef('ARDUINO')
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))
    expect({ dx: byId.D2.dx, dy: byId.D2.dy }).toEqual({ dx: 0, dy: 50 })
    expect({ dx: byId.D3.dx, dy: byId.D3.dy }).toEqual({ dx: 0, dy: 75 })
    expect({ dx: byId.GND.dx, dy: byId.GND.dy }).toEqual({ dx: 0, dy: 110 })
    expect({ dx: byId['5V'].dx, dy: byId['5V'].dy }).toEqual({ dx: 120, dy: 50 })
  })
})
