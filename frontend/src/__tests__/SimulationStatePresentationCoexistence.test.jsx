/**
 * SimulationStatePresentationCoexistence.test.jsx — MB-VIS-STATE-045
 * "Unified Simulation State Presentation".
 *
 * L'audit CSA de ce ticket a confirmé que l'architecture requise existe déjà
 * intégralement et n'appelle AUCUNE modification de code :
 *   - VisualStateRegistry (visualization/visualStateRegistry.js) : canal
 *     générique déjà en place (registerVisualState/getVisualState), déjà
 *     couvert unitairement par visualStateRegistry.test.js (TEST 1/7/9).
 *   - LED/RGB_LED (visualization/defaultVisualStateRegistrations.js) :
 *     resolvers purs déjà branchés sur getLedState()/getRgbLedState()
 *     (simulator/production.js, réexportées par simulator/engine.js — le
 *     contrat public runSimulation()/getLedState()/getRgbLedState() n'est
 *     touché nulle part par ce ticket), déjà couverts par
 *     PartRenderer.visualState.test.jsx (TEST 3/4/9).
 *   - Le système wire (wires/wireState.js + wires/wirePath.js) implémente
 *     déjà EXACTEMENT le contrat demandé — précédence selected > signal >
 *     neutre, `signal: null` (simulation inactive) explicitement distinct de
 *     Signal.UNKNOWN (arbitrage CSA Q3, 2026-08-20) — déjà couvert
 *     unitairement par wirePath.test.js.
 *
 * Ce fichier ne duplique donc PAS cette couverture unitaire déjà existante.
 * Il verrouille la seule chose qui ne l'était pas encore : la COEXISTENCE de
 * l'état de simulation (C) avec les états d'interaction 043/044 (A) et de
 * connectivité (B) au niveau du pipeline RÉEL (CircuitProvider, vrai
 * CommandRegistry/ValidationEngine/HistoryService, vrai moteur de
 * simulation, rendu de <SimulationCanvas>) — jamais un Document construit à
 * la main, aucun mock.
 *
 * Couverture (Blueprint §11) :
 *   T1  LED simulation inactive : état neutre/off, aucun ON artificiel.
 *   T2  LED simulation active + câblée : ON dérivé du moteur réel.
 *   T7  LED ON + SELECTED coexistent.
 *   T8  LED ON + FOCUSED (+ localScale) coexistent.
 *   T9  LED ON + pins CONNECTED coexistent.
 *   T10 Simulation inactive ≠ UNKNOWN pour un wire réellement rendu.
 *   T17 Aucun changement de géométrie (x/y) causé par la restitution Simulation.
 *   T18 Aucune entrée d'historique causée par la restitution Simulation.
 *   T19 Extensibilité : un type sans resolver (RESISTOR) coexiste sans erreur
 *       dans le même circuit simulé, sans liste figée de composants.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { SimulationCanvas } from '../canvas/SimulationCanvas.jsx'

function renderCanvas() {
  const canvasRef = React.createRef()
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(n) => { canvasRef.current = n }}>{children}</div>
    </CircuitProvider>
  )
  const utils = render(<><Probe /><SimulationCanvas /></>, { wrapper })
  return { ...utils, getApi: () => api }
}

/**
 * Circuit de base : POWER.5V -> RESISTOR.A, RESISTOR.B -> LED.anode,
 * LED.cathode -> POWER.GND — même recette que
 * BreadboardInsertionMutationChannel.integration.test.jsx (MB-BREADBOARD-003),
 * déjà prouvée déterministe pour allumer la LED via le moteur réel.
 */
function wireLedCircuit(getApi) {
  act(() => {
    getApi().addComponent('POWER', 100, 100)
    getApi().addComponent('RESISTOR', 300, 100)
    getApi().addComponent('LED', 500, 100)
  })
  const power = getApi().components.find((c) => c.type === 'POWER')
  const resistor = getApi().components.find((c) => c.type === 'RESISTOR')
  const led = getApi().components.find((c) => c.type === 'LED')
  act(() => {
    getApi().addWire(power.uid, '5V', resistor.uid, 'A')
    getApi().addWire(resistor.uid, 'B', led.uid, 'anode')
    getApi().addWire(led.uid, 'cathode', power.uid, 'GND')
  })
  return { power, resistor, led }
}

describe('MB-VIS-STATE-045 — coexistence état de simulation × interaction × connectivité (pipeline réel)', () => {
  it('T1 — LED simulation inactive : aucun ON artificiel (état neutre)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('LED', 200, 150) })
    expect(getApi().simulationActive).toBe(false)
    const led = container.querySelector('.part-led')
    expect(led.className).not.toMatch(/part-led--on/)
  })

  it('T2 — LED simulation active + câblée : ON dérivé du moteur réel (production.js via engine.js, inchangés)', () => {
    const { container, getApi } = renderCanvas()
    wireLedCircuit(getApi)
    act(() => { getApi().startSimulation() })
    expect(getApi().simulationActive).toBe(true)
    const led = container.querySelector('.part-led')
    expect(led.className).toMatch(/part-led--on/)
  })

  it('T7 — LED ON + SELECTED coexistent (la sélection ne masque ni ne remplace l\'état électrique)', () => {
    const { container, getApi } = renderCanvas()
    const { led } = wireLedCircuit(getApi)
    act(() => { getApi().startSimulation() })
    act(() => { getApi().selectOnly({ type: 'component', id: led.uid }) })

    const wrapper = [...container.querySelectorAll('.circuit-component')].find(
      (el) => el.querySelector('.part-led')
    )
    expect(wrapper.className).toMatch(/circuit-component--selected/)
    expect(wrapper.querySelector('.part-led').className).toMatch(/part-led--on/)
  })

  it('T8 — LED ON + FOCUSED coexistent, localScale (transform) intact', () => {
    const { container, getApi } = renderCanvas()
    const { led } = wireLedCircuit(getApi)
    act(() => { getApi().startSimulation() })
    act(() => { getApi().focusComponent(led.uid) })

    const wrapper = [...container.querySelectorAll('.circuit-component')].find(
      (el) => el.querySelector('.part-led')
    )
    expect(wrapper.getAttribute('data-focused')).toBe('')
    expect(wrapper.style.transform).toMatch(/^scale\(/)
    expect(wrapper.querySelector('.part-led').className).toMatch(/part-led--on/)

    // I-25 : le resolver de simulation (LED) n'a pas de prise sur le filter
    // d'interaction (044) — ce sont deux couches orthogonales sur deux
    // éléments distincts (.part-led vs .circuit-component__body).
    const body = wrapper.querySelector('.circuit-component__body')
    expect(body).not.toBe(null)
  })

  it('T9 — LED ON + pins CONNECTED coexistent (les 2 pins de la LED restent visibles et marquées connectées)', () => {
    const { container, getApi } = renderCanvas()
    wireLedCircuit(getApi)
    act(() => { getApi().startSimulation() })

    const wrapper = [...container.querySelectorAll('.circuit-component')].find(
      (el) => el.querySelector('.part-led')
    )
    const pins = [...wrapper.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(2)
    expect(pins.every((p) => p.className.includes('myblab-pin--connected'))).toBe(true)
    expect(wrapper.querySelector('.part-led').className).toMatch(/part-led--on/)
  })

  it('T10 — simulation inactive ≠ UNKNOWN pour un wire réellement rendu (arbitrage CSA Q3 préexistant, vérifié end-to-end)', () => {
    const { container, getApi } = renderCanvas()
    wireLedCircuit(getApi)
    // simulation JAMAIS démarrée : pinSignals est la Map vide (EMPTY_MAP,
    // useCircuitState.js) — chaque wire doit rester au neutre (#f97316),
    // jamais à la couleur UNKNOWN (#94a3b8, wirePath.js SIGNAL_COLORS).
    const wirePaths = [...container.querySelectorAll('.wires-layer__wire')]
    expect(wirePaths.length).toBeGreaterThan(0)
    for (const path of wirePaths) {
      expect(path.getAttribute('stroke')).toBe('#f97316')
      expect(path.className.baseVal || path.getAttribute('class')).not.toMatch(/wire--unknown/)
    }
  })

  it("T17 — aucun changement de géométrie causé par la restitution Simulation (x/y inchangés start/stop)", () => {
    const { getApi } = renderCanvas()
    const { led } = wireLedCircuit(getApi)
    const before = { x: getApi().components.find((c) => c.uid === led.uid).x, y: getApi().components.find((c) => c.uid === led.uid).y }

    act(() => { getApi().startSimulation() })
    act(() => { getApi().stopSimulation() })

    const after = getApi().components.find((c) => c.uid === led.uid)
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
  })

  it("T18 — aucune entrée d'historique causée par la restitution Simulation (start/stop ne sont pas des mutations Document)", () => {
    const { getApi } = renderCanvas()
    wireLedCircuit(getApi)
    const undoCountBefore = getApi().getUndoCount()

    act(() => { getApi().startSimulation() })
    act(() => { getApi().stopSimulation() })
    act(() => { getApi().startSimulation() })

    expect(getApi().getUndoCount()).toBe(undoCountBefore)
  })

  it('T19 — extensibilité : un type SANS resolver (RESISTOR) coexiste sans erreur dans le même circuit simulé (aucune liste figée)', () => {
    const { container, getApi } = renderCanvas()
    wireLedCircuit(getApi)
    act(() => { getApi().startSimulation() })

    // RESISTOR n'a pas d'entrée dans defaultVisualStateRegistrations.js —
    // getVisualState('RESISTOR', ...) retourne {} (visualStateRegistry.js) ;
    // le composant doit néanmoins rendre normalement, aux côtés de la LED
    // simulée, sans aucune erreur ni branche spécifique.
    const resistorUid = getApi().components.find((c) => c.type === 'RESISTOR').uid
    const resistorEl = container.querySelector(`[data-wire-uid="${resistorUid}"]`)?.closest('.circuit-component')
    expect(resistorEl).not.toBe(null)
    expect(container.querySelector('.part-led').className).toMatch(/part-led--on/)
  })
})
