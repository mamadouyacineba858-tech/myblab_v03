/**
 * WiresLayerPreviewContactConvergence.test.jsx — FT-B-001-S4 R2 (TEST S4-I).
 *
 * L'aperçu du geste de câblage (WiresLayer.jsx) ancre son extrémité "composant"
 * au CONTACT PHYSIQUE via résolution GÉNÉRIQUE (`resolveContact`), pour toute
 * pin — mono-contact implicite comme multi-contacts explicites. Plus de
 * bifurcation explicit/implicit ; POWER/ARDUINO restent sur leur projection
 * visuelle historique (TODO S5).
 *
 * Rendu isolé : contextes minimaux (même patron que WiresLayer.test.jsx), on
 * fournit ici `wireGesture` + `components` dans le contexte interaction.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WiresLayer } from '../WiresLayer.jsx'
import { CircuitContext, CircuitInteractionContext } from '../../context/CircuitContext.js'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { getPinPresentationPosition } from '../../utils/pinPresentationGeometry.js'
import { resolveContact } from '../../utils/contactModel.js'
import { extractPointsFromPathData } from '../../utils/geometry.js'

const canvasRef = { current: { getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) } }

function renderPreview({ component, pinId, contactId }) {
  const circuit = {
    isSelected: () => false, selectOnly: () => {}, toggleSelection: () => {},
    wires: [], pinSignals: new Map(), canvasRef,
    updateWireWaypoints: () => {}, startWaypointDrag: () => {}, focusedComponentId: null,
  }
  const interaction = {
    viewport: { zoom: 1, translateX: 0, translateY: 0 },
    wireGesture: { uid: component.uid, pinId, contactId, clientX: 500, clientY: 500 },
    components: [component],
    localScale: 1,
  }
  const { container } = render(
    <CircuitContext.Provider value={circuit}>
      <CircuitInteractionContext.Provider value={interaction}>
        <WiresLayer wirePaths={[]} />
      </CircuitInteractionContext.Provider>
    </CircuitContext.Provider>
  )
  const preview = container.querySelector('.wires-layer__preview')
  return preview ? extractPointsFromPathData(preview.getAttribute('d'))[0] : null
}

describe('FT-B-001-S4 — TEST S4-I : aperçu de geste ancré au contact physique (résolution générique)', () => {
  it('RESISTOR (mono-contact implicite) : aperçu au contact implicite == géométrie de présentation', () => {
    const c = { uid: 'r', type: 'RESISTOR', x: 100, y: 100 }
    const pin = getComponentDef('RESISTOR').pins[0]
    const start = renderPreview({ component: c, pinId: 'A', contactId: undefined })
    expect(start).toEqual(getPinPresentationPosition(c, pin)) // (100, 114)
  })

  it('LED (mono-contact implicite, LED_VISUAL_PINS retiré) : aperçu == géométrie canonique du contact', () => {
    const c = { uid: 'l', type: 'LED', x: 0, y: 0 }
    const pin = getComponentDef('LED').pins[0]
    const start = renderPreview({ component: c, pinId: 'anode', contactId: undefined })
    expect(start).toEqual(getPinPresentationPosition(c, pin)) // (28, 62)
  })

  it('BUTTON : aperçu sur le CONTACT cliqué (1b = patte haute), distinct du contact par défaut', () => {
    const c = { uid: 'b', type: 'BUTTON', x: 100, y: 100 }
    const pin = getComponentDef('BUTTON').pins[0]
    const onHigh = renderPreview({ component: c, pinId: 'pin1', contactId: '1b' })
    expect(onHigh).toEqual(getPinPresentationPosition(c, pin, { contact: resolveContact(pin, '1b') })) // (114, 102)
    const onDefault = renderPreview({ component: c, pinId: 'pin1', contactId: '1a' })
    expect(onDefault).toEqual({ x: 114, y: 158 })
    expect(onHigh).not.toEqual(onDefault)
  })

  it('POWER : aperçu reste sur la projection visuelle historique (contrat breadboard préservé, TODO S5)', () => {
    const c = { uid: 'p', type: 'POWER', x: 0, y: 0 }
    const pin = getComponentDef('POWER').pins.find((p) => p.id === '5V')
    const start = renderPreview({ component: c, pinId: '5V', contactId: undefined })
    expect(start).toEqual(getPinPresentationPosition(c, pin)) // POWER_VISUAL_PINS (35, 67)
    expect(start).toEqual({ x: 35, y: 67 })
  })
})
