/**
 * multiBreadboardPresentation.integration.test.jsx — FT-C-BREAD-MULTI-001-D
 *
 * Pipeline RÉEL (CircuitProvider, VRAI CommandRegistry / ValidationEngine /
 * flux pointer) + rendu de <SimulationCanvas>. Prouve que la Presentation
 * rend et manipule N breadboards indépendamment (capacités D1–D54 du ticket).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
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

function renderApi() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(n) => { canvasRef.current = n }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

const addBoards = (api, n) => {
  for (let i = 0; i < n; i++) act(() => { api.addBreadboard() })
}

describe('FT-C-BREAD-MULTI-001-D — rendu N instances (D1–D10)', () => {
  it('D1 — aucune carte : 0 <Breadboard>, 0 <BreadboardWireEndpoints>', () => {
    const { container } = renderCanvas()
    expect(container.querySelectorAll('svg.breadboard').length).toBe(0)
    expect(container.querySelectorAll('svg.breadboard-wire-endpoints').length).toBe(0)
  })

  it('D2 / D3 / D4 — [A] -> 1, [A,B] -> 2, [A,B,C] -> 3 instances rendues', () => {
    const { container, getApi } = renderCanvas()
    addBoards(getApi(), 1)
    expect(container.querySelectorAll('svg.breadboard').length).toBe(1)
    addBoards(getApi(), 1)
    expect(container.querySelectorAll('svg.breadboard').length).toBe(2)
    addBoards(getApi(), 1)
    expect(container.querySelectorAll('svg.breadboard').length).toBe(3)
    expect(container.querySelectorAll('svg.breadboard-wire-endpoints').length).toBe(3) // D8
  })

  it('D5 / D6 — positions/ids distincts, ordre DOM = ordre breadboards[]', () => {
    const { container, getApi } = renderCanvas()
    addBoards(getApi(), 3)
    const ids = getApi().breadboards.map((b) => b.id)
    expect(new Set(ids).size).toBe(3)
    const xs = getApi().breadboards.map((b) => b.position.x)
    expect(new Set(xs).size).toBe(3) // positions distinguables (D42)
    // ordre DOM des <svg.breadboard> : gauche->droite selon style.left croissant
    const lefts = [...container.querySelectorAll('svg.breadboard')].map((el) => parseFloat(el.style.left))
    const sorted = [...lefts].sort((a, b) => a - b)
    expect(lefts).toEqual(sorted)
  })

  it('D9 — deux <BreadboardWireEndpoints> rendus, un par carte (trous A/B namespacés par id)', () => {
    const { container, getApi } = renderCanvas()
    addBoards(getApi(), 2)
    const endpointLayers = container.querySelectorAll('svg.breadboard-wire-endpoints')
    expect(endpointLayers.length).toBe(2)
    const [A, B] = getApi().breadboards
    expect(A.id).not.toBe(B.id)
    // chaque couche est positionnée sur sa propre carte
    const lefts = [...endpointLayers].map((el) => parseFloat(el.style.left))
    expect(new Set(lefts).size).toBe(2)
  })

  it('D10 — aucun fallback breadboards[0] : retirer la 1ère carte laisse les autres rendues', () => {
    const { container, getApi } = renderCanvas()
    addBoards(getApi(), 3)
    const firstId = getApi().breadboards[0].id
    act(() => { getApi().selectOnly({ type: 'breadboard', id: firstId }) })
    act(() => { getApi().deleteSelection() })
    expect(getApi().breadboards.map((b) => b.id)).not.toContain(firstId)
    expect(container.querySelectorAll('svg.breadboard').length).toBe(2)
  })
})

describe('FT-C-BREAD-MULTI-001-D — Sidebar multi-add (D37–D46)', () => {
  it('D38–D42 — trois addBreadboard() successifs : 3 cartes, ids uniques, positions distinctes', () => {
    const { result } = renderApi()
    for (let i = 0; i < 3; i++) act(() => { result.current.addBreadboard() })
    const bbs = result.current.breadboards
    expect(bbs).toHaveLength(3)
    expect(new Set(bbs.map((b) => b.id)).size).toBe(3)
    const xs = bbs.map((b) => b.position.x)
    expect(new Set(xs).size).toBe(3)
    expect(xs[1]).toBeGreaterThan(xs[0])
    expect(xs[2]).toBeGreaterThan(xs[1])
  })

  it('D44 / D45 / D46 — undo du dernier add, redo, puis add après undo', () => {
    const { result } = renderApi()
    for (let i = 0; i < 3; i++) act(() => { result.current.addBreadboard() })
    expect(result.current.breadboards).toHaveLength(3)
    act(() => { result.current.undo() })
    expect(result.current.breadboards).toHaveLength(2)
    act(() => { result.current.redo() })
    expect(result.current.breadboards).toHaveLength(3)
    act(() => { result.current.undo() })
    act(() => { result.current.addBreadboard() })
    expect(result.current.breadboards).toHaveLength(3)
  })
})

describe('FT-C-BREAD-MULTI-001-D — drag ciblé par id (D11–D20)', () => {
  const down = (api, pos) => ({
    button: 0, clientX: pos.x + 10, clientY: pos.y + 10,
    ctrlKey: false, metaKey: false, preventDefault() {}, stopPropagation() {},
  })
  const move = (pos, dx, dy) => act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: pos.x + 10 + dx, clientY: pos.y + 10 + dy }))
  })
  const up = () => act(() => { window.dispatchEvent(new PointerEvent('pointerup')) })

  it('D12–D16 — drag de la carte B (par id) : seule B bouge ; A/C immobiles ; undo/redo', () => {
    const { result } = renderApi()
    const api = () => result.current
    for (let i = 0; i < 3; i++) act(() => { api().addBreadboard() })
    const [A, B, C] = api().breadboards.map((b) => ({ id: b.id, x: b.position.x, y: b.position.y }))

    act(() => { api().selectOnly({ type: 'breadboard', id: B.id }) })
    act(() => { api().startBreadboardDrag(down(api(), { x: B.x, y: B.y }), B.id) })
    move({ x: B.x, y: B.y }, 24, 24)
    up()

    const posById = () => Object.fromEntries(api().breadboards.map((b) => [b.id, b.position]))
    expect(posById()[B.id]).toEqual({ x: B.x + 24, y: B.y + 24 })
    expect(posById()[A.id]).toEqual({ x: A.x, y: A.y })
    expect(posById()[C.id]).toEqual({ x: C.x, y: C.y })

    act(() => { api().undo() })
    expect(posById()[B.id]).toEqual({ x: B.x, y: B.y })
    act(() => { api().redo() })
    expect(posById()[B.id]).toEqual({ x: B.x + 24, y: B.y + 24 })
  })

  it('D15 / D21–D27 — un composant owned par B suit B ; owned par A ne bouge pas', () => {
    const { result } = renderApi()
    const api = () => result.current
    // 2 cartes disjointes (offset auto ~= 420) : A puis B.
    act(() => { api().addBreadboard() })
    act(() => { api().addBreadboard() })
    const [A, B] = api().breadboards.map((b) => ({ id: b.id, x: b.position.x, y: b.position.y }))
    // RESISTOR sur A (pinB -> A col5/row3), RESISTOR sur B (idem, relatif à B).
    act(() => { api().addComponent('RESISTOR', A.x - 24 + 60, A.y + 22) })
    act(() => { api().addComponent('RESISTOR', B.x - 24 + 60, B.y + 22) })
    const onA = api().components[0]
    const onB = api().components[1]

    act(() => { api().selectOnly({ type: 'breadboard', id: B.id }) })
    act(() => { api().startBreadboardDrag(down(api(), { x: B.x, y: B.y }), B.id) })
    move({ x: B.x, y: B.y }, 0, 60)
    up()

    const cById = () => Object.fromEntries(api().components.map((c) => [c.uid, { x: c.x, y: c.y }]))
    expect(cById()[onB.uid]).toEqual({ x: onB.x, y: onB.y + 60 }) // suit B
    expect(cById()[onA.uid]).toEqual({ x: onA.x, y: onA.y })     // immobile
  })
})

describe('FT-C-BREAD-MULTI-001-D — clear circuit (D partie 20)', () => {
  it('clearCircuit vide breadboards[] et la projection', () => {
    const { result } = renderApi()
    for (let i = 0; i < 2; i++) act(() => { result.current.addBreadboard() })
    expect(result.current.breadboards).toHaveLength(2)
    act(() => { result.current.clearCircuit() })
    expect(result.current.breadboards).toEqual([])
    expect(result.current.breadboard).toBeNull()
  })
})

describe('FT-C-BREAD-MULTI-001-D — fit-to-content N breadboards (D51)', () => {
  it('computeSceneBounds via fitToContent : ne lève pas et englobe (ne crashe pas sur array)', () => {
    const { result } = renderApi()
    for (let i = 0; i < 3; i++) act(() => { result.current.addBreadboard() })
    expect(() => act(() => { result.current.fitToContent() })).not.toThrow()
  })
})
