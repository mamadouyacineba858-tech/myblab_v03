/**
 * LiveMeasurementPanel.test.jsx — MB-MEASURE-002 (§15, TEST T1-T12).
 *
 * Pipeline réel (CircuitProvider + Navbar, vraies actions addComponent/
 * addWire/updateComponentParameters/undo/redo) — aucun mock du Document,
 * aucune fixture measure()/observe() réécrite : la preuve VALID/UNAVAILABLE
 * passe par le vrai chemin measure() -> observe() -> Simulation, exactement
 * comme measurementContract.test.js (fixtures POWER->RESISTOR reprises à
 * l'identique).
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { Navbar } from '../../components/Navbar.jsx'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function renderApp() {
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const utils = render(
    <CircuitProvider>
      <Probe />
      <Navbar />
    </CircuitProvider>
  )
  return { ...utils, getApi: () => api }
}

function wirePoweredResistor(getApi) {
  act(() => {
    getApi().addComponent('POWER', 100, 100)
    getApi().addComponent('RESISTOR', 300, 100)
  })
  const power = getApi().components.find((c) => c.type === 'POWER')
  const resistor = getApi().components.find((c) => c.type === 'RESISTOR')
  act(() => {
    getApi().addWire(power.uid, '5V', resistor.uid, 'A')
    getApi().addWire(resistor.uid, 'B', power.uid, 'GND')
  })
  return { power, resistor }
}

describe('MB-MEASURE-002 — TEST T1 : accessibilité (ouverture/fermeture)', () => {
  it('le panneau est absent par défaut, apparaît au clic "Mesures", disparaît à la fermeture', () => {
    const { getByTitle, queryByText, getByLabelText } = renderApp()
    expect(queryByText('Mesures')).toBe(null)

    fireEvent.click(getByTitle('Mesures'))
    expect(queryByText('Mesures')).toBeTruthy()

    fireEvent.click(getByLabelText('Fermer'))
    expect(queryByText('Mesures')).toBe(null)
  })
})

describe('MB-MEASURE-002 — TEST T2 : circuit vide (AC-05)', () => {
  it('aucune target sélectionnable, aucune exception, bouton Measure désactivé', () => {
    const { getByTitle, getByRole } = renderApp()
    expect(() => fireEvent.click(getByTitle('Mesures'))).not.toThrow()
    const measureButton = getByRole('button', { name: 'Measure' })
    expect(measureButton.disabled).toBe(true)
  })
})

describe('MB-MEASURE-002 — TEST T3/T8 : targets réelles dérivées du circuit (AC-04/AC-06)', () => {
  it('un circuit avec RESISTOR expose une target par pin réel (A, B), aucune target statique', () => {
    const { getApi, getByTitle, getByLabelText } = renderApp()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    fireEvent.click(getByTitle('Mesures'))

    const targetSelect = getByLabelText('Target')
    const optionLabels = [...targetSelect.querySelectorAll('option')].map((o) => o.textContent)
    expect(optionLabels).toEqual(['Résistance · A', 'Résistance · B'])
  })

  it('T8 — ajouter un second composant fait grandir la liste de targets ; le supprimer la fait rétrécir', () => {
    const { getApi, getByTitle, getByLabelText } = renderApp()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    fireEvent.click(getByTitle('Mesures'))
    const targetSelect = getByLabelText('Target')
    expect(targetSelect.querySelectorAll('option').length).toBe(2)

    const resistorUid = getApi().components[0].uid
    act(() => { getApi().addComponent('LED', 200, 100) })
    expect(getByLabelText('Target').querySelectorAll('option').length).toBe(4)

    act(() => { getApi().deleteComponent(resistorUid) })
    expect(getByLabelText('Target').querySelectorAll('option').length).toBe(2)
  })
})

function selectTargetByLabel(getByLabelText, labelPrefix) {
  const targetSelect = getByLabelText('Target')
  const index = [...targetSelect.querySelectorAll('option')].findIndex((o) => o.textContent.startsWith(labelPrefix))
  fireEvent.change(targetSelect, { target: { value: String(index) } })
}

describe('MB-MEASURE-002 — TEST T4/T6 : VOLTAGE VALID (AC-07)', () => {
  it('mesurer VOLTAGE sur RESISTOR.A dans un circuit POWER->RESISTOR->GND affiche value + V + VALID', () => {
    const { getApi, getByTitle, getByLabelText, getByRole } = renderApp()
    wirePoweredResistor(getApi)
    fireEvent.click(getByTitle('Mesures'))

    fireEvent.change(getByLabelText('Mode'), { target: { value: 'VOLTAGE' } })
    selectTargetByLabel(getByLabelText, 'Résistance · A')
    fireEvent.click(getByRole('button', { name: 'Measure' }))

    const result = getByLabelText('measurement-result')
    expect(result.textContent).toContain('5')
    expect(result.textContent).toContain('V')
    expect(result.textContent).toContain('VALID')
  })
})

describe('MB-MEASURE-002 — TEST T5/T6 : CURRENT VALID (AC-08)', () => {
  it('mesurer CURRENT sur RESISTOR.A dans le même circuit affiche value + A + VALID = 5/220', () => {
    const { getApi, getByTitle, getByLabelText, getByRole } = renderApp()
    wirePoweredResistor(getApi)
    fireEvent.click(getByTitle('Mesures'))

    fireEvent.change(getByLabelText('Mode'), { target: { value: 'CURRENT' } })
    selectTargetByLabel(getByLabelText, 'Résistance · A')
    fireEvent.click(getByRole('button', { name: 'Measure' }))

    const result = getByLabelText('measurement-result')
    expect(result.textContent).toContain(String(5 / 220))
    expect(result.textContent).toContain('A')
    expect(result.textContent).toContain('VALID')
  })
})

describe('MB-MEASURE-002 — TEST T7 : UNAVAILABLE (AC-09)', () => {
  it('mesurer CURRENT sur une LED (type non enregistré dans dcContributionRegistry) affiche UNAVAILABLE + reason, sans crash ni valeur inventée', () => {
    const { getApi, getByTitle, getByLabelText, getByRole } = renderApp()
    const { power } = wirePoweredResistor(getApi)
    act(() => { getApi().addComponent('LED', 500, 100) })
    const led = getApi().components.find((c) => c.type === 'LED')
    act(() => {
      getApi().addWire(power.uid, '5V', led.uid, 'anode')
    })
    fireEvent.click(getByTitle('Mesures'))

    fireEvent.change(getByLabelText('Mode'), { target: { value: 'CURRENT' } })
    selectTargetByLabel(getByLabelText, 'LED')
    fireEvent.click(getByRole('button', { name: 'Measure' }))

    const result = getByLabelText('measurement-result')
    expect(result.textContent).toContain('UNAVAILABLE')
    expect(result.textContent).toMatch(/reason|no canonical/i)
  })
})

describe('MB-MEASURE-002 — TEST T9/T10/T13/T14 : non-mutation Document et History', () => {
  it('effectuer une mesure ne modifie ni components, ni wires, ni la sélection, ni l\'historique', () => {
    const { getApi, getByTitle, getByLabelText, getByRole } = renderApp()
    wirePoweredResistor(getApi)
    const componentsBefore = JSON.stringify(getApi().components)
    const wiresBefore = JSON.stringify(getApi().wires)
    const undoCountBefore = getApi().getUndoCount()
    const selectionBefore = getApi().selection

    fireEvent.click(getByTitle('Mesures'))
    fireEvent.change(getByLabelText('Mode'), { target: { value: 'VOLTAGE' } })
    fireEvent.change(getByLabelText('Target'), { target: { value: '0' } })
    fireEvent.click(getByRole('button', { name: 'Measure' }))

    expect(JSON.stringify(getApi().components)).toBe(componentsBefore)
    expect(JSON.stringify(getApi().wires)).toBe(wiresBefore)
    expect(getApi().getUndoCount()).toBe(undoCountBefore)
    expect(getApi().selection).toBe(selectionBefore)
  })
})

describe('MB-MEASURE-002 — TEST T11 : compatibilité Component Values (MB-L1-CVE-001, AC-18)', () => {
  it('un RESISTOR dont la résistance a été éditée via updateComponentParameters produit un courant mesuré différent, sans calcul I=V/R dans l\'UI', () => {
    const { getApi, getByTitle, getByLabelText, getByRole } = renderApp()
    const { resistor } = wirePoweredResistor(getApi)

    fireEvent.click(getByTitle('Mesures'))
    fireEvent.change(getByLabelText('Mode'), { target: { value: 'CURRENT' } })
    selectTargetByLabel(getByLabelText, 'Résistance · A')
    fireEvent.click(getByRole('button', { name: 'Measure' }))
    const i1 = getByLabelText('measurement-result').textContent

    act(() => { getApi().updateComponentParameters(resistor.uid, { resistance: 1000 }) })
    fireEvent.click(getByRole('button', { name: 'Measure' }))
    const i2 = getByLabelText('measurement-result').textContent

    expect(i1).toContain(String(5 / 220))
    expect(i2).toContain(String(5 / 1000))
    expect(i1).not.toBe(i2)
  })
})

describe('MB-MEASURE-002 — TEST T12 : garde architecturale (verrou d\'import)', () => {
  it('LiveMeasurementPanel.jsx n\'importe jamais resolution.js, preparation.js, dcContributionRegistry.js, canonicalRegistry.js ni engine.js', () => {
    const source = readFileSync(resolve(__dirname, '../LiveMeasurementPanel.jsx'), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(source).not.toMatch(/resolution\.js/)
    expect(source).not.toMatch(/preparation\.js/)
    expect(source).not.toMatch(/dcContributionRegistry\.js/)
    expect(source).not.toMatch(/canonicalRegistry\.js/)
    expect(source).not.toMatch(/engine\.js/)
    expect(source).not.toMatch(/resolveSignals|dcAnalysis|pinSignals/)
  })

  it('LiveMeasurementPanel.jsx ne calcule aucune physique (aucune division/formule électrique propre)', () => {
    const source = readFileSync(resolve(__dirname, '../LiveMeasurementPanel.jsx'), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(source).not.toMatch(/voltage\s*\/\s*resistance|current\s*\*|Ohm/i)
  })
})
