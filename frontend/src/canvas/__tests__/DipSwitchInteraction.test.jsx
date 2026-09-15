/**
 * DipSwitchInteraction.test.jsx — A3-SW2
 *
 * Couvre les tests d'acceptation UI/History T9-T19, dans le même patron que
 * SlideSwitchInteraction.test.jsx (A3-SW1) : CircuitComponent.jsx ne reçoit
 * aucune connaissance du type DIP_SWITCH, seulement de la capacité
 * déclarative interaction.type === "multi-state-toggle".
 */
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, act, cleanup } from '@testing-library/react'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../CircuitComponent.jsx'
import { getComponentByType } from '../../visualization/defaultRegistrations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const circuitWrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

function CanvasHarness({ onReady }) {
  const circuit = useCircuit()
  const { components } = useCircuitInteraction()
  onReady({ ...circuit, components })
  return (
    <>
      {components.map((comp) => (
        <CircuitComponent key={comp.uid} component={comp} />
      ))}
    </>
  )
}

afterEach(() => {
  cleanup()
})

function channelButton(container, channelId) {
  return container.querySelector(`[data-channel-id="${channelId}"]`)
}

describe('A3-SW2 — architecture guards (I-DIP-15/16/17)', () => {
  it('T17 : PartRenderer.jsx ne contient aucune référence à DIP_SWITCH', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../components/parts/PartRenderer.jsx'), 'utf-8')
    expect(source).not.toMatch(/DIP_SWITCH/)
  })

  it('T17 : CircuitComponent.jsx ne contient aucune branche type-spécifique DIP_SWITCH', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../CircuitComponent.jsx'), 'utf-8')
    expect(source).not.toMatch(/comp\.type\s*===\s*["']DIP_SWITCH["']/)
    expect(source).not.toMatch(/type\s*===\s*["']DIP_SWITCH["']/)
  })

  it('T17 : Pin.jsx ne contient aucune référence à DIP_SWITCH', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../Pin.jsx'), 'utf-8')
    expect(source).not.toMatch(/DIP_SWITCH/)
  })

  it('T19 : le renderer DIP_SWITCH est résolu via le VisualizationManager (getComponentByType)', () => {
    expect(getComponentByType('DIP_SWITCH')).not.toBeNull()
  })
})

describe('A3-SW2 — palette et présentation', () => {
  it('DIP_SWITCH apparaît exactement une fois dans PALETTE_ITEMS', async () => {
    const { PALETTE_ITEMS } = await import('../../config/componentDefinitions.js')
    const occurrences = PALETTE_ITEMS.filter((item) => item.id === 'DIP_SWITCH').length
    expect(occurrences).toBe(1)
  })

  it('T16 : 8 pins rendues, composant sélectionnable', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })

    const root = container.querySelector('.part-dip-switch')
    expect(root).not.toBeNull()

    const pinButtons = container.querySelectorAll('[data-wire-pin]')
    expect(Array.from(pinButtons).map((el) => el.getAttribute('data-wire-pin'))).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'])

    const wrapper = container.querySelector('.circuit-component')
    expect(wrapper).not.toBeNull()
    act(() => { fireEvent.mouseDown(wrapper) })
    expect(circuitApi.isSelected({ type: 'component', id: circuitApi.components[0].uid })).toBe(true)
  })

  it('T15 : les 4 voies reflètent individuellement ON/OFF (classes is-on/is-off, aria-label)', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })

    const root = container.querySelector('.part-dip-switch')
    for (const ch of ['1', '2', '3', '4']) {
      const el = channelButton(container, ch)
      expect(el.className).toMatch(/is-off/)
    }
    expect(root.getAttribute('aria-label')).toBe('Interrupteur DIP 4 positions : 1=OFF, 2=OFF, 3=OFF, 4=OFF')

    act(() => { fireEvent.click(channelButton(container, '2')) })
    expect(channelButton(container, '2').className).toMatch(/is-on/)
    expect(channelButton(container, '1').className).toMatch(/is-off/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur DIP 4 positions : 1=OFF, 2=ON, 3=OFF, 4=OFF')
  })
})

describe('A3-SW2 — interaction utilisateur (T9, T10)', () => {
  it('T9 : un clic sur la voie N ne bascule QUE la voie N', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })

    act(() => { fireEvent.click(channelButton(container, '1')) })
    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'on', '2': 'off', '3': 'off', '4': 'off' })

    act(() => { fireEvent.click(channelButton(container, '3')) })
    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'on', '2': 'off', '3': 'on', '4': 'off' })

    act(() => { fireEvent.click(channelButton(container, '1')) })
    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'off', '2': 'off', '3': 'on', '4': 'off' })
  })

  it("T10 : un pointerdown suivi d'un mouvement au-delà du seuil (>= 4px) n'entraîne aucun toggle involontaire", () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })

    const root = container.querySelector('.part-dip-switch')
    const target = channelButton(container, '2')

    act(() => {
      fireEvent.pointerDown(root, { clientX: 10, clientY: 10 })
      fireEvent.pointerMove(root, { clientX: 40, clientY: 10 })
      fireEvent.click(target, { clientX: 40, clientY: 10 })
    })

    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'off', '2': 'off', '3': 'off', '4': 'off' })
  })
})

describe('A3-SW2 — History / Undo / Redo (T11, T12, T13)', () => {
  it('T11/T12 : toggle voie 2 -> Undo restaure uniquement la voie 2 -> Redo la réapplique, les autres voies restent inchangées', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })
    const uid = circuitApi.components[0].uid

    act(() => { fireEvent.click(channelButton(container, '1')) })
    act(() => { fireEvent.click(channelButton(container, '2')) })
    expect(circuitApi.components.find((c) => c.uid === uid).channelStates).toEqual({ '1': 'on', '2': 'on', '3': 'off', '4': 'off' })

    act(() => { circuitApi.undo() })
    expect(circuitApi.components.find((c) => c.uid === uid).channelStates).toEqual({ '1': 'on', '2': 'off', '3': 'off', '4': 'off' })

    act(() => { circuitApi.redo() })
    expect(circuitApi.components.find((c) => c.uid === uid).channelStates).toEqual({ '1': 'on', '2': 'on', '3': 'off', '4': 'off' })
  })

  it('T13 : Undo puis toggle d\'une autre voie invalide le redo précédent (invariant HistoryManager existant, non modifié)', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })

    act(() => { fireEvent.click(channelButton(container, '1')) })
    act(() => { circuitApi.undo() })
    expect(circuitApi.canRedo()).toBe(true)

    act(() => { fireEvent.click(channelButton(container, '4')) })
    expect(circuitApi.canRedo()).toBe(false)
    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'off', '2': 'off', '3': 'off', '4': 'on' })
  })
})

describe('A3-SW2 — non-régression BUTTON / BUTTON_LATCHING / SLIDE_SWITCH (I-DIP-18/19/20, T18)', () => {
  it('BUTTON_LATCHING on/off inchangé', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('BUTTON_LATCHING', 0, 0) })
    expect(circuitApi.components[0].state).toBe('off')
    const root = container.querySelector('.part-latching-button')
    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('on')
  })

  it('BUTTON momentary pressed/released inchangé', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('BUTTON', 0, 0) })
    const root = container.querySelector('.part-button')
    act(() => { fireEvent.pointerDown(root) })
    expect(circuitApi.components[0].state).toBe('pressed')
    act(() => { fireEvent.pointerUp(root) })
    expect(circuitApi.components[0].state).toBe('released')
  })

  it('SLIDE_SWITCH left/right inchangé', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('SLIDE_SWITCH', 0, 0) })
    expect(circuitApi.components[0].state).toBe('left')
    const root = container.querySelector('.part-slide-switch')
    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('right')
  })
})

describe('A3-SW2 — round-trip export/import (T14)', () => {
  it('channelStates survit à un cycle export -> import', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })
    act(() => { circuitApi.addComponent('DIP_SWITCH', 0, 0) })
    act(() => { fireEvent.click(channelButton(container, '2')) })
    act(() => { fireEvent.click(channelButton(container, '4')) })

    const exported = circuitApi.exportCircuit()
    expect(exported.components[0].channelStates).toEqual({ '1': 'off', '2': 'on', '3': 'off', '4': 'on' })

    act(() => { circuitApi.importCircuit(exported) })
    expect(circuitApi.components[0].channelStates).toEqual({ '1': 'off', '2': 'on', '3': 'off', '4': 'on' })
  })
})
