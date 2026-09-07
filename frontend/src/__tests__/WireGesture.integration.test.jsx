import React from 'react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, act, fireEvent, cleanup } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { SimulationCanvas } from '../canvas/SimulationCanvas.jsx'
import { CommandBus } from '../core/command/CommandBus.js'
import { getComponentDef } from '../config/componentDefinitions.js'
import { getPinPresentationPosition } from '../utils/pinPresentationGeometry.js'
import { resolveContact } from '../utils/contactModel.js'
import { clientToCanvas, extractPointsFromPathData } from '../utils/geometry.js'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
function setup(type = 'RESISTOR') {
  let api
  const canvasRef = { current: null }
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return <SimulationCanvas />
  }
  const view = render(<CircuitProvider canvasRef={canvasRef}><Probe /></CircuitProvider>)
  act(() => { api.addComponent(type, 100, 100); api.addComponent(type, 400, 100) })
  const pins = [...view.container.querySelectorAll('.myblab-pin')]
  const event = (node, name, x = 120, y = 130, id = 1) => {
    fireEvent(node, new PointerEvent(name, { bubbles: true, button: 0, pointerId: id, clientX: x, clientY: y }))
  }
  return { ...view, api: () => api, pins, event, canvasRef,
    preview: () => view.container.querySelector('.wires-layer__preview') }
}

describe('MB-VIS-WIRE-INTERACTION-007', () => {
  // [FT-B-001-S2] BUTTON / BUTTON_LATCHING exposent 4 CONTACTS physiques / 2
  // pins canoniques. La gesture est paramétrée par (pin, contact) et les
  // nœuds DOM sont sélectionnés par leurs attributs `data-wire-pin` /
  // `data-wire-contact` (plus par index positionnel). L'ancre de contact
  // choisie doit survivre à ADD_WIRE, undo/redo ET au déplacement du
  // composant (l'extrémité de fil suit le CONTACT, pas la pin).
  const CONTACT_CASES = [
    { pin: 'pin1', contact: '1a' }, { pin: 'pin1', contact: '1b' },
    { pin: 'pin2', contact: '2a' }, { pin: 'pin2', contact: '2b' },
  ]
  for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
    for (const tc of CONTACT_CASES) {
      it(`${type} ${tc.pin}/${tc.contact}: real gesture, isolated preview, ADD_WIRE, undo/redo, movement retains contact anchor`, () => {
        const h = setup(type)
        const nodesFor = (i) => [...h.container.querySelectorAll('.circuit-component')][i]
          .querySelectorAll(`[data-wire-pin="${tc.pin}"][data-wire-contact="${tc.contact}"]`)[0]
        const src = nodesFor(0)
        const dst = nodesFor(1)
        expect(src).toBeTruthy()
        expect(dst).toBeTruthy()

        const before = h.api().exportCircuit()
        const count = h.api().getUndoCount()
        const dispatch = vi.spyOn(CommandBus.prototype, 'dispatch')
        h.event(src, 'pointerdown')
        fireEvent.mouseDown(src, { button: 0, clientX: 120, clientY: 130 })
        expect(h.api().wireGesture).not.toBeNull()
        expect(h.api().wireGesture.contactId).toBe(tc.contact)
        h.event(window, 'pointermove', 420, 130)
        expect(h.preview()).not.toBeNull()
        expect(h.api().exportCircuit()).toEqual(before)
        expect(h.api().getUndoCount()).toBe(count)
        expect(dispatch).not.toHaveBeenCalled()
        h.event(dst, 'pointerup', 420, 130)
        fireEvent.click(dst, { detail: 1 })
        expect(h.preview()).toBeNull()
        expect(h.api().wires).toHaveLength(1)
        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch.mock.calls[0][0].type).toBe('ADD_WIRE')
        // L'ancre de contact source ET destination est persistée.
        expect(h.api().wires[0]).toMatchObject({ fromPin: tc.pin, fromContact: tc.contact, toPin: tc.pin, toContact: tc.contact })
        expect(h.api().getUndoCount()).toBe(count + 1)
        act(() => h.api().undo())
        expect(h.api().wires).toHaveLength(0)
        act(() => h.api().redo())
        expect(h.api().wires).toHaveLength(1)
        expect(h.api().wires[0]).toMatchObject({ fromContact: tc.contact, toContact: tc.contact })

        const body = h.container.querySelector('.circuit-component')
        fireEvent.mouseDown(body, { button: 0, clientX: 110, clientY: 110 })
        h.event(window, 'pointermove', 150, 150)
        h.event(window, 'pointerup', 150, 150)
        const moved = h.api().components[0]
        expect(moved.x).not.toBe(before.components[0].x)
        // Extrémité de fil = position du CONTACT choisi (pas de la pin).
        const pinDef = getComponentDef(type).pins.find((p) => p.id === tc.pin)
        const resolved = resolveContact(pinDef, tc.contact)
        const expected = getPinPresentationPosition(moved, pinDef, { contact: resolved })
        expect(extractPointsFromPathData(h.api().wirePaths[0].d)[0]).toEqual(expected)
      })
    }
  }
  for (const end of ['empty', 'Escape', 'same', 'pointercancel', 'blur']) {
    it(`cancels ${end} without mutation or synthetic click wiring`, () => {
      const h = setup()
      const before = h.api().exportCircuit()
      const count = h.api().getUndoCount()
      h.event(h.pins[0], 'pointerdown')
      h.event(window, 'pointermove', 300, 200)
      if (end === 'Escape') fireEvent.keyDown(window, { key: 'Escape' })
      else if (end === 'blur') fireEvent.blur(window)
      else h.event(end === 'same' ? h.pins[0] : h.canvasRef.current,
        end === 'pointercancel' ? 'pointercancel' : 'pointerup', 300, 200)
      h.event(h.pins[2], 'pointerup', 420, 130)
      fireEvent.click(h.pins[0], { detail: 1 })
      expect(h.api().wireGesture).toBeNull()
      expect(h.api().pendingPin).toBeNull()
      expect(h.api().exportCircuit()).toEqual(before)
      expect(h.api().getUndoCount()).toBe(count)
    })
  }
  it('preserves stationary click-pin and rejects reversed duplicates', () => {
    const h = setup()
    for (const pin of [h.pins[0], h.pins[2]]) {
      h.event(pin, 'pointerdown'); h.event(pin, 'pointerup')
      fireEvent.click(pin, { detail: 1 })
    }
    expect(h.api().wires).toHaveLength(1)
    const count = h.api().getUndoCount()
    h.event(h.pins[2], 'pointerdown')
    h.event(window, 'pointermove', 120, 130)
    h.event(h.pins[0], 'pointerup')
    expect(h.api().wires).toHaveLength(1)
    expect(h.api().getUndoCount()).toBe(count)
  })
  it('uses physical hit testing and ignores a different pointer', () => {
    const h = setup()
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => h.pins[2]) })
    try {
      h.event(h.pins[0], 'pointerdown')
      h.event(window, 'pointerup', 420, 130, 2)
      expect(h.api().wireGesture).not.toBeNull()
      h.event(window, 'pointermove', 420, 130)
      h.event(h.pins[0], 'pointerup', 420, 130)
      expect(h.api().wires[0].toUid).toBe(h.api().components[1].uid)
    } finally { delete document.elementFromPoint }
  })
  for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
    it(`${type}: preview and final endpoint follow zoom and localScale during gesture`, () => {
      const h = setup(type)
      const uid = h.api().components[0].uid
      act(() => h.api().focusComponent(uid))
      h.event(h.pins[0], 'pointerdown')
      h.event(window, 'pointermove', 420, 230)
      act(() => { h.api().adjustLocalScale(0.5); h.api().zoomIn() })
      const api = h.api()
      const from = getPinPresentationPosition(api.components[0], getComponentDef(type).pins[0], { scale: api.localScale })
      const to = clientToCanvas({ clientX: 420, clientY: 230 }, h.canvasRef.current.getBoundingClientRect(),
        api.viewport.zoom, api.viewport.translateX, api.viewport.translateY)
      expect(extractPointsFromPathData(h.preview().getAttribute('d'))).toEqual([from, to])
      h.event(h.pins[2], 'pointerup', 420, 230)
      expect(extractPointsFromPathData(h.api().wirePaths[0].d)[0]).toEqual(from)
    })
  }
})
