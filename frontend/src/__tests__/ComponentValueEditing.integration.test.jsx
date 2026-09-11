/**
 * ComponentValueEditing.integration.test.jsx — MB-L1-CVE-001 (§17, TEST
 * T7, T12-T15, T20-T21).
 *
 * Pipeline réel (CircuitProvider, vraies actions addComponent/selectOnly/
 * updateComponentParameters/exportCircuit/importCircuit/undo/redo) — aucun
 * mock du Document. Même patron Probe que LaboratoryWorkspaceCohesion.test.jsx
 * (MB-VIS-LAB-046) : `{...useCircuit(), ...useCircuitInteraction()}` pour le
 * TEST uniquement — ComponentInspector.jsx, lui, ne consomme jamais
 * useCircuitInteraction() (voir T21, garde structurelle).
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { ComponentInspector } from '../components/ComponentInspector.jsx'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function renderInspector() {
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const utils = render(
    <CircuitProvider>
      <Probe />
      <ComponentInspector />
    </CircuitProvider>
  )
  return { ...utils, getApi: () => api }
}

describe('MB-L1-CVE-001 — TEST T7 : ADD_COMPONENT matérialise les defaults canoniques', () => {
  it('un nouveau RESISTOR possède parameters.resistance === 220 dans le Document', () => {
    const { getApi } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    expect(getApi().components[0].parameters).toEqual({ resistance: 220 })
  })

  it('un type sans modèle de simulation (LED) reçoit parameters: {} (comportement identique à avant ce ticket)', () => {
    const { getApi } = renderInspector()
    act(() => { getApi().addComponent('LED', 100, 100) })
    expect(getApi().components[0].parameters).toEqual({})
  })
})

describe('MB-L1-CVE-001 — TEST T12/T13 : ComponentInspector.jsx', () => {
  it('T12 — aucune sélection : panneau neutre "Aucun composant sélectionné"', () => {
    const { getByText, queryByText } = renderInspector()
    expect(getByText('Aucun composant sélectionné')).toBeTruthy()
    expect(queryByText('Résistance')).toBe(null)
  })

  it('T13 — RESISTOR sélectionné : affiche 220 et Ω', () => {
    const { getApi, getByDisplayValue, getByText } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    expect(getByText('Résistance')).toBeTruthy()
    expect(getByDisplayValue('220')).toBeTruthy()
    expect(getByText('Ω')).toBeTruthy()
  })

  it('composant sans modèle de simulation (LED) : message neutre, aucun input numérique', () => {
    const { getApi, getByText, container } = renderInspector()
    act(() => { getApi().addComponent('LED', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    expect(getByText('Aucun paramètre configurable pour ce composant')).toBeTruthy()
    expect(container.querySelector('input[type="number"]')).toBe(null)
  })

  it('sélection perdue (composant supprimé) : selectedComponent redevient null, panneau neutre', () => {
    const { getApi, getByText } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    expect(getApi().selectedComponent?.uid).toBe(uid)

    act(() => { getApi().deleteComponent(uid) })
    expect(getApi().selectedComponent).toBe(null)
    expect(getByText('Aucun composant sélectionné')).toBeTruthy()
  })
})

describe('MB-L1-CVE-001 — TEST T14 : généricité (POTENTIOMETER, aucune branche par type)', () => {
  it('POTENTIOMETER expose ses deux paramètres (resistance + position) sans logique spécifique', () => {
    const { getApi, getByDisplayValue, getByText } = renderInspector()
    act(() => { getApi().addComponent('POTENTIOMETER', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    expect(getByDisplayValue('10000')).toBeTruthy()
    expect(getByDisplayValue('0.5')).toBeTruthy()
    expect(getByText('Ω')).toBeTruthy()
  })

  it('ComponentInspector.jsx ne contient aucune comparaison littérale de type (CV-16)', () => {
    const source = readFileSync(resolve(__dirname, '../components/ComponentInspector.jsx'), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const found = [...source.matchAll(/\btype\s*(===|!==)\s*["']([A-Z0-9_]+)["']/g)].map((m) => m[2])
    expect(found, `comparaison(s) de type non attendue(s) : ${found.join(', ')}`).toEqual([])
  })
})

describe('MB-L1-CVE-001 — TEST T15 : commit UX (blur/Enter = une seule commande History)', () => {
  it('édition 220 -> 1000 via blur produit exactement une entrée History, Undo restaure 220, Redo réapplique 1000', () => {
    const { getApi, getByDisplayValue } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    const before = getApi().getUndoCount()
    const input = getByDisplayValue('220')
    fireEvent.change(input, { target: { value: '1000' } })
    fireEvent.blur(input)

    expect(getApi().getUndoCount()).toBe(before + 1)
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 1000 })

    act(() => { getApi().undo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 220 })

    act(() => { getApi().redo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 1000 })
  })

  it('re-taper la même valeur (220 -> 220) ne produit aucune nouvelle commande History (idempotence §8.5)', () => {
    const { getApi, getByDisplayValue } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    const before = getApi().getUndoCount()
    const input = getByDisplayValue('220')
    fireEvent.change(input, { target: { value: '220' } })
    fireEvent.blur(input)

    expect(getApi().getUndoCount()).toBe(before)
  })

  it('une valeur invalide (hors range) est rejetée avant toute mutation persistante (CV-12)', () => {
    const { getApi, getByDisplayValue } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    const before = getApi().getUndoCount()
    const input = getByDisplayValue('220')
    fireEvent.change(input, { target: { value: '99999999999999' } })
    fireEvent.blur(input)

    expect(getApi().getUndoCount()).toBe(before)
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 220 })
  })

  it('un paramètre figé (BATTERY_AA.voltage) est affiché en lecture seule, aucun input', () => {
    const { getApi, getByText, container } = renderInspector()
    act(() => { getApi().addComponent('BATTERY_AA', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    expect(getByText('1.5')).toBeTruthy()
    expect(container.querySelector('input[type="number"]')).toBe(null)
  })
})

describe('MB-L1-CVE-001 — TEST T20 : export/import préserve component.parameters', () => {
  it('220 -> 1000 -> export -> import -> Inspector affiche 1000, Document.parameters.resistance === 1000', () => {
    const { getApi, getByDisplayValue } = renderInspector()
    act(() => { getApi().addComponent('RESISTOR', 100, 100) })
    const uid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    fireEvent.change(getByDisplayValue('220'), { target: { value: '1000' } })
    fireEvent.blur(getByDisplayValue('1000'))

    const exported = getApi().exportCircuit()
    expect(exported.components[0].parameters).toEqual({ resistance: 1000 })

    act(() => { getApi().importCircuit(JSON.parse(JSON.stringify(exported))) })
    const reimportedUid = getApi().components[0].uid
    act(() => { getApi().selectOnly({ type: 'component', id: reimportedUid }) })

    expect(getByDisplayValue('1000')).toBeTruthy()
    expect(getApi().components[0].parameters).toEqual({ resistance: 1000 })
  })
})

describe('MB-L1-CVE-001 — TEST T21 : isolation du contexte haute fréquence (CV-15/AC-19)', () => {
  it('ComponentInspector.jsx n\'importe et ne consomme jamais useCircuitInteraction()/CircuitInteractionContext', () => {
    // Commentaires exclus (le JSDoc du fichier nomme volontairement ces
    // identifiants pour documenter ce qu'il NE faut PAS faire) — seul le
    // CODE compte, même patron stripComments que componentLibraryRolloutGate.test.js.
    const codeOnly = readFileSync(resolve(__dirname, '../components/ComponentInspector.jsx'), 'utf-8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(codeOnly).not.toMatch(/useCircuitInteraction/)
    expect(codeOnly).not.toMatch(/CircuitInteractionContext/)
    expect(codeOnly).not.toMatch(/componentsForRender/)
    expect(codeOnly).not.toMatch(/dragPreview/)
  })
})
