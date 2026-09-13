/**
 * MBL1PROP004ResistorColorCodeIntegration.test.jsx — MB-L1-PROP-004
 *
 * Pipeline réel (CircuitProvider, vraies actions addComponent/
 * updateComponentParameters/undo/redo/exportCircuit/importCircuit,
 * CircuitComponent -> PartRenderer -> ResistorPart) — aucun mock du
 * Document. Complète ComponentValueEditing.integration.test.jsx (qui
 * prouve déjà la persistance de `parameters.resistance` au niveau
 * Document/Inspector, MB-L1-CVE-001) en couvrant la COUCHE VISUELLE :
 * la projection de bandes doit suivre exactement les mêmes transitions
 * Document (édition/undo/redo/import) sans qu'aucune bande ne soit
 * jamais elle-même persistée.
 *
 * Scénarios ticket (§18) : T1-T2 (défaut 220 Ω -> rouge/rouge/brun/or),
 * T3 (édition 220 -> 1000), T4/T5 (Undo/Redo), T6 (export/import ne
 * transporte aucune bande, recalcul après import), T7/T8 (deux résistances
 * indépendantes), T9 (1234 Ω non représentable -> corps neutre).
 */
import React from 'react'
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

describe('MB-L1-PROP-004 — T1/T2 : défaut 220 Ω', () => {
  it('une nouvelle RESISTOR (220 Ω canonique) affiche rouge / rouge / brun / or', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('RESISTOR', 50, 60) })

    const bands = [...container.querySelectorAll('.part-resistor__band')].map((el) => el.dataset.color)
    expect(bands).toEqual(['red', 'red', 'brown', 'gold'])
    expect(getApi().components[0].parameters).toEqual({ resistance: 220 })
  })
})

describe('MB-L1-PROP-004 — T3/T4/T5 : édition 220 -> 1000, Undo, Redo', () => {
  it('éditer resistance change la projection, Undo restaure 220 (bandes incluses), Redo réapplique 1000', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('RESISTOR', 50, 60) })
    const uid = getApi().components[0].uid

    act(() => { getApi().updateComponentParameters(uid, { resistance: 1000 }) })
    expect([...container.querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color))
      .toEqual(['brown', 'black', 'red', 'gold'])

    act(() => { getApi().undo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 220 })
    expect([...container.querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color))
      .toEqual(['red', 'red', 'brown', 'gold'])

    act(() => { getApi().redo() })
    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 1000 })
    expect([...container.querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color))
      .toEqual(['brown', 'black', 'red', 'gold'])
  })
})

describe('MB-L1-PROP-004 — T6 : export/import ne transporte aucune bande', () => {
  it('exportCircuit() ne contient aucune clé liée aux bandes ; import recalcule la projection visuelle', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('RESISTOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { resistance: 1000 }) })

    const exported = getApi().exportCircuit()
    const serialized = JSON.stringify(exported)

    // Invariant PROP04-11 : seule `resistance` traverse l'export, jamais de
    // bande/couleur persistée (ni sur le composant, ni ailleurs dans le
    // document sérialisé).
    expect(exported.components[0].parameters).toEqual({ resistance: 1000 })
    expect(exported.components[0]).not.toHaveProperty('bands')
    expect(exported.components[0]).not.toHaveProperty('colorBands')
    expect(exported.components[0].properties ?? {}).not.toHaveProperty('band1')
    expect(exported.components[0].properties ?? {}).not.toHaveProperty('band2')
    expect(serialized).not.toMatch(/"band/i)
    expect(serialized).not.toMatch(/"bandColor"/i)

    act(() => { getApi().importCircuit(JSON.parse(serialized)) })
    const reimportedUid = getApi().components[0].uid
    expect(getApi().components.find((c) => c.uid === reimportedUid).parameters).toEqual({ resistance: 1000 })

    // La projection visuelle est RECALCULÉE après import (jamais restaurée
    // depuis un état de bandes stocké, puisqu'aucun n'existe) — même résultat
    // que la valeur électrique 1000 Ω le prescrit.
    expect([...container.querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color))
      .toEqual(['brown', 'black', 'red', 'gold'])
  })
})

describe('MB-L1-PROP-004 — T7/T8 : deux résistances, projections indépendantes', () => {
  it('deux RESISTOR avec deux valeurs différentes affichent deux codes couleur indépendants', () => {
    const { container, getApi } = renderHarness()
    act(() => {
      getApi().addComponent('RESISTOR', 50, 60)
      getApi().addComponent('RESISTOR', 200, 60)
    })
    const [uidA, uidB] = getApi().components.map((c) => c.uid)
    act(() => { getApi().updateComponentParameters(uidA, { resistance: 220 }) })
    act(() => { getApi().updateComponentParameters(uidB, { resistance: 4700 }) })

    const wrappers = [...container.querySelectorAll('.circuit-component')]
    expect(wrappers).toHaveLength(2)
    const [bandsA, bandsB] = wrappers.map((w) =>
      [...w.querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color)
    )
    expect(bandsA).toEqual(['red', 'red', 'brown', 'gold'])
    expect(bandsB).toEqual(['yellow', 'violet', 'red', 'gold'])
    expect(bandsA).not.toEqual(bandsB)
  })

  it('changer une résistance ne modifie ni la valeur électrique ni la projection de l\'autre', () => {
    const { container, getApi } = renderHarness()
    act(() => {
      getApi().addComponent('RESISTOR', 50, 60)
      getApi().addComponent('RESISTOR', 200, 60)
    })
    const [uidA, uidB] = getApi().components.map((c) => c.uid)
    act(() => { getApi().updateComponentParameters(uidB, { resistance: 4700 }) })

    act(() => { getApi().updateComponentParameters(uidA, { resistance: 1000 }) })

    expect(getApi().components.find((c) => c.uid === uidB).parameters).toEqual({ resistance: 4700 })
    const wrappers = [...container.querySelectorAll('.circuit-component')]
    const bandsB = [...wrappers[1].querySelectorAll('.part-resistor__band')].map((b) => b.dataset.color)
    expect(bandsB).toEqual(['yellow', 'violet', 'red', 'gold'])
  })
})

describe('MB-L1-PROP-004 — T9 : valeur non représentable (1234 Ω) ne ment jamais visuellement', () => {
  it('1234 Ω persiste électriquement mais rend un corps neutre, sans aucune bande fausse', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('RESISTOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { resistance: 1234 }) })

    expect(getApi().components.find((c) => c.uid === uid).parameters).toEqual({ resistance: 1234 })
    expect(container.querySelector('.part-resistor__bands')).toBeNull()
    expect(container.querySelectorAll('.part-resistor__band')).toHaveLength(0)
    // le corps raster neutre reste rendu
    expect(container.querySelector('.circuit-component img')).not.toBeNull()
  })
})

describe('MB-L1-PROP-004 — T10/PROP04-06/07 : pins et boîte canonique inchangés après édition', () => {
  it('éditer resistance ne modifie ni les pins A(0,14)/B(84,14) ni la boîte 84×28', () => {
    const { container, getApi } = renderHarness()
    act(() => { getApi().addComponent('RESISTOR', 50, 60) })
    const uid = getApi().components[0].uid
    act(() => { getApi().updateComponentParameters(uid, { resistance: 4700 }) })

    const wrap = container.querySelector('.circuit-component')
    expect(wrap.style.width).toBe('84px')
    expect(wrap.style.height).toBe('28px')

    const pins = [...container.querySelectorAll('.myblab-pin')].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(pins).toEqual(expect.arrayContaining([[0, 14], [84, 14]]))
  })
})

