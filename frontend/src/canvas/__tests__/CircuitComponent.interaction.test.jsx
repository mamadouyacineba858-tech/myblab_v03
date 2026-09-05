/**
 * CircuitComponent.interaction.test.jsx — MB-VIS-COMP-002 (Phase 7)
 *
 * Couvre le remplacement, dans CircuitComponent.jsx, des tests explicites
 * `type === "BUTTON"` / `type === "BUTTON_LATCHING"` par la capacité
 * déclarative `def.interaction.type` (componentDefinitions.js).
 *
 * TEST 5 : BUTTON conserve son interaction (pointerdown/pointerup → state).
 * TEST 6 : BUTTON_LATCHING conserve son interaction (click → toggle).
 * TEST 1/7/8 (complément architectural) : un type SANS `interaction`
 * déclarée (ex: RESISTOR, représentatif de tout futur composant statique)
 * ne reçoit aucun des deux comportements — preuve que isButton/
 * isLatchingButton sont désormais purement dérivés de la déclaration, et
 * qu'un nouveau type statique n'a besoin d'aucune modification de
 * CircuitComponent.jsx pour fonctionner correctement (il se comporte comme
 * RESISTOR ici).
 */
import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, act, cleanup } from '@testing-library/react'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../CircuitComponent.jsx'

const circuitWrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

function CanvasHarness({ onReady }) {
  const circuit = useCircuit()
  // MB-VIS-CANVAS-051 : `components` (componentsForRender) est désormais
  // exposé par useCircuitInteraction() (state haute fréquence) — fusionné
  // dans l'objet transmis à onReady() pour que les assertions existantes
  // (circuitApi.components...) restent inchangées.
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

// Ce fichier ne dépend d'aucun setup global de cleanup automatique
// (vitest.config.js ne déclare pas de setupFiles) : chaque test rend son
// propre <CanvasHarness>, donc un cleanup() explicite entre tests est requis
// pour éviter qu'un élément .part-button/.part-latching-button d'un test
// précédent ne pollue les querySelector globaux du test suivant.
afterEach(() => {
  cleanup()
})

describe('MB-VIS-COMP-002 — CircuitComponent : interaction dérivée de def.interaction (TEST 5, TEST 6)', () => {
  it('TEST 5 — BUTTON : pointerdown/pointerup met à jour le state via le mécanisme de capacité (interaction.type === "momentary")', () => {
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

  it('TEST 6 — BUTTON_LATCHING : click bascule le state via le mécanisme de capacité (interaction.type === "latching")', () => {
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

  it('TEST 1/7/8 — un type sans interaction déclarée (RESISTOR) ne déclenche ni le comportement BUTTON ni BUTTON_LATCHING', () => {
    let circuitApi = null
    const { container } = render(<CanvasHarness onReady={(api) => { circuitApi = api }} />, { wrapper: circuitWrapper })

    act(() => { circuitApi.addComponent('RESISTOR', 0, 0) })

    // Aucun state ajouté à l'instance (pas d'initialState déclaré non plus).
    expect(circuitApi.components[0].state).toBeUndefined()

    // Le renderer RESISTOR n'a ni bouton-pressoir ni interrupteur latching.
    expect(container.querySelector('.part-button')).toBeNull()
    expect(container.querySelector('.part-latching-button')).toBeNull()
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBeNull()
  })
})
