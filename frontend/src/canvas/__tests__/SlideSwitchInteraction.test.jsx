/**
 * SlideSwitchInteraction.test.jsx — A3-SW1
 *
 * Couvre les tests d'acceptation UI/History T-SW1-10 à T-SW1-20, dans le
 * même patron que CircuitComponent.interaction.test.jsx (MB-VIS-COMP-002) :
 * CircuitComponent.jsx ne reçoit aucune connaissance du type SLIDE_SWITCH,
 * seulement de la capacité déclarative interaction.type === "state-toggle".
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

describe('A3-SW1 — architecture guards (fichiers de dispatch)', () => {
  it('T-SW1-10 : PartRenderer.jsx ne contient aucune référence à SLIDE_SWITCH', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../components/parts/PartRenderer.jsx'), 'utf-8')
    expect(source).not.toMatch(/SLIDE_SWITCH/)
  })

  it("T-SW1-11 : CircuitComponent.jsx ne contient aucune branche type-spécifique SLIDE_SWITCH", () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../CircuitComponent.jsx'), 'utf-8')
    expect(source).not.toMatch(/comp\.type\s*===\s*["']SLIDE_SWITCH["']/)
    expect(source).not.toMatch(/type\s*===\s*["']SLIDE_SWITCH["']/)
  })

  it('T-SW1-12 : le renderer SLIDE_SWITCH est résolu via le VisualizationManager (getComponentByType)', () => {
    expect(getComponentByType('SLIDE_SWITCH')).not.toBeNull()
  })
})

describe('A3-SW1 — palette et présentation', () => {
  it('T-SW1-13 : SLIDE_SWITCH apparaît exactement une fois dans PALETTE_ITEMS', async () => {
    const { PALETTE_ITEMS } = await import('../../config/componentDefinitions.js')
    const occurrences = PALETTE_ITEMS.filter((item) => item.id === 'SLIDE_SWITCH').length
    expect(occurrences).toBe(1)
  })

  it('T-SW1-14 : pins canoniques et présentation cohérents — 3 pins rendues, composant sélectionnable', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('SLIDE_SWITCH', 0, 0) })

    const root = container.querySelector('.part-slide-switch')
    expect(root).not.toBeNull()

    // Les pins rendues (composant CircuitComponent -> <Pin>) dérivent de
    // componentDefinitions.js (def.pins), pas d'un champ `.pins` porté par le
    // composant Document (ce dernier ne transporte pas cette clé — même
    // comportement pour tout type, cf. normalizeComponent()/circuitModel.js).
    const pinButtons = container.querySelectorAll('[data-wire-pin]')
    expect(Array.from(pinButtons).map((el) => el.getAttribute('data-wire-pin'))).toEqual(['throwA', 'common', 'throwB'])

    const wrapper = container.querySelector('.circuit-component')
    expect(wrapper).not.toBeNull()
    act(() => { fireEvent.mouseDown(wrapper) })
    expect(circuitApi.isSelected({ type: 'component', id: circuitApi.components[0].uid })).toBe(true)
  })
})

describe('A3-SW1 — interaction utilisateur (T-SW1-15/16/17)', () => {
  it('T-SW1-15/16 : un clic bascule left -> right, le suivant right -> left', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('SLIDE_SWITCH', 0, 0) })
    expect(circuitApi.components[0].state).toBe('left')

    const root = container.querySelector('.part-slide-switch')
    expect(root).not.toBeNull()

    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('right')

    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('left')
  })

  it("T-SW1-17 : un pointerdown suivi d'un mouvement au-delà du seuil (>= 4px) n'entraîne aucun toggle involontaire", () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('SLIDE_SWITCH', 0, 0) })
    expect(circuitApi.components[0].state).toBe('left')

    const root = container.querySelector('.part-slide-switch')

    act(() => {
      fireEvent.pointerDown(root, { clientX: 10, clientY: 10 })
      fireEvent.pointerMove(root, { clientX: 40, clientY: 10 })
      fireEvent.click(root, { clientX: 40, clientY: 10 })
    })

    expect(circuitApi.components[0].state).toBe('left')
  })
})

describe('A3-SW1 — History / Undo / Redo (T-SW1-18/19/20)', () => {
  it('undo restaure la position précédente, redo restaure la nouvelle, une nouvelle action invalide le redo', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('SLIDE_SWITCH', 0, 0) })
    const root = container.querySelector('.part-slide-switch')
    const uid = circuitApi.components[0].uid

    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('right')

    act(() => { circuitApi.undo() })
    expect(circuitApi.components.find((c) => c.uid === uid).state).toBe('left')

    act(() => { circuitApi.redo() })
    expect(circuitApi.components.find((c) => c.uid === uid).state).toBe('right')

    act(() => { circuitApi.undo() })
    expect(circuitApi.components.find((c) => c.uid === uid).state).toBe('left')

    // T-SW1-20 : une nouvelle action après undo invalide le redo précédent
    // (invariant HistoryManager existant, non modifié par ce ticket).
    const rootAfterUndo = container.querySelector('.part-slide-switch')
    act(() => { fireEvent.click(rootAfterUndo) })
    expect(circuitApi.components.find((c) => c.uid === uid).state).toBe('right')
    expect(circuitApi.canRedo()).toBe(false)
  })
})

describe('A3-SW1 — non-régression BUTTON / BUTTON_LATCHING (I-SW1-12, T-SW1-21/22)', () => {
  it('T-SW1-21 : BUTTON_LATCHING on/off inchangé', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('BUTTON_LATCHING', 0, 0) })
    expect(circuitApi.components[0].state).toBe('off')

    const root = container.querySelector('.part-latching-button')
    expect(root).not.toBeNull()

    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('on')

    act(() => { fireEvent.click(root) })
    expect(circuitApi.components[0].state).toBe('off')
  })

  it('T-SW1-22 : BUTTON momentary pressed/released inchangé', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('BUTTON', 0, 0) })

    const root = container.querySelector('.part-button')
    expect(root).not.toBeNull()

    act(() => { fireEvent.pointerDown(root) })
    expect(circuitApi.components[0].state).toBe('pressed')

    act(() => { fireEvent.pointerUp(root) })
    expect(circuitApi.components[0].state).toBe('released')
  })
})
