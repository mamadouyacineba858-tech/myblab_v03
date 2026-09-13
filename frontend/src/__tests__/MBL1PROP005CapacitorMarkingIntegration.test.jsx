/**
 * MBL1PROP005CapacitorMarkingIntegration.test.jsx — MB-L1-PROP-005
 *
 * Pipeline réel (CircuitProvider, vraies actions addComponent/
 * updateComponentParameters/undo/redo/exportCircuit/importCircuit,
 * CircuitComponent -> PartRenderer -> CapacitorPart) — aucun mock du
 * Document. La projection de marquage doit suivre exactement les mêmes
 * transitions Document (édition/undo/redo/import) sans qu'aucun marquage ne
 * soit jamais lui-même persisté.
 *
 * Scénarios ticket (§28) : T1-T12.
 */
import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { CircuitComponent } from '../canvas/CircuitComponent.jsx'

function renderHarness() {
  let api = null
  function Harness() {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    api = { ...c, components }
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }
  const utils = render(
    <CircuitProvider>
      <Harness />
    </CircuitProvider>
  )
  return { ...utils, getApi: () => api }
}

function markingOf(el) {
  const m = el.querySelector('.part-capacitor__marking')
  return m ? m.textContent : null
}

describe('MB-L1-PROP-005 — T1/T2 : défaut 100 nF', () => {
  it('une nouvelle CAPACITOR (100 nF canonique) affiche "104"', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })

    expect(getApi().components[0].parameters).toEqual({ capacitance: 1e-7 })
    expect(markingOf(container)).toBe('104')
  })
})

describe('MB-L1-PROP-005 — T3/T4/T5 : édition 100 nF -> 1 nF, Undo, Redo', () => {
  it('éditer capacitance change le marquage, Undo restaure 104, Redo réapplique 102', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid

    act(() => { getApi().updateComponentParameters(uid, { capacitance: 1e-9 }) })
    expect(markingOf(container)).toBe('102')

    act(() => { getApi().undo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ capacitance: 1e-7 })
    expect(markingOf(container)).toBe('104')

    act(() => { getApi().redo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ capacitance: 1e-9 })
    expect(markingOf(container)).toBe('102')
  })
})

describe('MB-L1-PROP-005 — T6/T7 : autres valeurs exactes', () => {
  it('4.7 nF -> "472"', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { capacitance: 4.7e-9 }) })
    expect(markingOf(container)).toBe('472')
  })

  it('470 nF -> "474"', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { capacitance: 470e-9 }) })
    expect(markingOf(container)).toBe('474')
  })
})

describe('MB-L1-PROP-005 — T8 : 123 nF ne ment jamais visuellement', () => {
  it('123 nF persiste électriquement mais rend un corps neutre, sans aucun marquage faux', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { capacitance: 123e-9 }) })

    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ capacitance: 123e-9 })
    expect(container.querySelector('.part-capacitor__marking')).toBeNull()
    expect(container.querySelector('.circuit-component img')).not.toBeNull()
  })
})

describe('MB-L1-PROP-005 — T9 : deux condensateurs, projections indépendantes', () => {
  it('100 nF -> 104 et 470 nF -> 474 simultanément, indépendants', () => {
    const { container, getApi } = renderHarness()
    act(() => {
      getApi().addComponent('CAPACITOR', 50, 60)
      getApi().addComponent('CAPACITOR', 200, 60)
    })
    const [uidA, uidB] = getApi().components.map((c) => c.uid)
    act(() => { getApi().updateComponentParameters(uidB, { capacitance: 470e-9 }) })

    const wrappers = [...container.querySelectorAll('.circuit-component')]
    expect(wrappers).toHaveLength(2)
    expect(markingOf(wrappers[0])).toBe('104')
    expect(markingOf(wrappers[1])).toBe('474')

    // changer A ne modifie pas B
    act(() => { getApi().updateComponentParameters(uidA, { capacitance: 1e-9 }) })
    expect(getApi().components.find((c) => c.uid === uidB).parameters).toEqual({ capacitance: 470e-9 })
    expect(markingOf(wrappers[1])).toBe('474')
  })
})

describe('MB-L1-PROP-005 — T10 : export/import ne transporte aucun marquage', () => {
  it('exportCircuit() ne contient aucune clé liée au marquage ; import recalcule la projection', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { capacitance: 470e-9 }) })

    const exported = getApi().exportCircuit()
    const serialized = JSON.stringify(exported)

    expect(exported.components[0].parameters).toEqual({ capacitance: 470e-9 })
    expect(exported.components[0]).not.toHaveProperty('marking')
    expect(exported.components[0].properties ?? {}).not.toHaveProperty('marking')
    expect(serialized).not.toMatch(/"marking"/i)

    act(() => { getApi().importCircuit(JSON.parse(serialized)) })
    const reimportedUid = getApi().components[0].uid
    expect(getApi().components.find((c) => c.uid === reimportedUid).parameters).toEqual({ capacitance: 470e-9 })
    expect(markingOf(container)).toBe('474')
  })
})

describe('MB-L1-PROP-005 — T11/T12 : le rendu ne pollue jamais History ni ne mute les paramètres', () => {
  it('T11 — sélectionner/désélectionner (re-rendus induits) ne crée aucune entrée History au-delà de l\'ajout', () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    const after_add = getApi().getUndoCount()

    // Provoque plusieurs re-rendus réels de CapacitorPart (sélection change
    // `selected`/`focused`, donc re-render du sous-arbre) sans jamais éditer
    // capacitance : purement des lectures/rendus.
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    act(() => { getApi().selectOnly(null) })
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })

    expect(getApi().getUndoCount()).toBe(after_add)
  })

  it('T12 — le rendu ne mute jamais l\'objet parameters du Document (même référence après re-rendus)', () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    const before = getApi().components.find((c) => c.uid === uid).parameters

    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    act(() => { getApi().selectOnly(null) })

    const after = getApi().components.find((c) => c.uid === uid).parameters
    expect(after).toBe(before) // même référence : aucune mutation/replacement induit par le rendu
  })
})

describe('MB-L1-PROP-005 — pins/box canoniques inchangés après édition', () => {
  it('éditer capacitance ne modifie ni les contacts (23,62)/(47,62) ni la boîte 70×40', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('CAPACITOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { capacitance: 4.7e-9 }) })

    const wrap = container.querySelector('.circuit-component')
    expect(wrap.style.width).toBe('70px')
    expect(wrap.style.height).toBe('40px')

    const pins = [...container.querySelectorAll('.myblab-pin')].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(pins).toEqual(expect.arrayContaining([[23, 62], [47, 62]]))
  })
})
