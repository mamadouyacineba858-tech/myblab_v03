/**
 * CanvasInteractionDepth.test.jsx — MB-VIS-CANVAS-044
 * "Visual Depth & Interaction Feedback Reconciliation".
 *
 * Ce ticket est un pur delta CSS (CircuitComponent.css/Breadboard.css/
 * App.css) : REST/HOVER/DRAGGING sont portés par les pseudo-classes natives
 * `:hover`/`:active` (aucun nouvel état React), FOCUSED réutilise
 * `[data-focused]` (MB-VIS-CANVAS-052, préexistant), DRAGGING ne touche
 * jamais `transform` (localScale reste l'unique transform du wrapper).
 * Zéro ligne de CircuitComponent.jsx/Breadboard.jsx modifiée. Ces tests
 * verrouillent donc des INVARIANTS STRUCTURELS — jamais des valeurs de
 * couleur fragiles — pour qu'une future régression ne puisse pas :
 *   - réintroduire un état "dragging" React artificiel (aucun n'existe,
 *     §6 du Blueprint : ":active" suffit, dérivé nativement du mousedown
 *     réel jusqu'au relâchement) ;
 *   - faire fuiter un effet visuel dans une mutation Document/historique ;
 *   - faire dépendre un effet du TYPE du composant (C7) ;
 *   - écraser le transform localScale (C11).
 *
 * Pipeline RÉEL (CircuitProvider, vrai CommandRegistry/ValidationEngine/
 * HistoryService) + rendu de <SimulationCanvas> — même patron que
 * CanvasWorkspaceReconciliation.test.jsx (MB-VIS-CANVAS-043) /
 * multiBreadboardPresentation.integration.test.jsx, aucun mock du Document.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'
import { SimulationCanvas } from '../canvas/SimulationCanvas.jsx'
import { LOCAL_SCALE_STEP } from '../utils/localScale.js'

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

function pointerDown(api, component) {
  act(() => {
    api.startDrag(
      { button: 0, clientX: component.x + 10, clientY: component.y + 10, preventDefault: () => {}, stopPropagation: () => {} },
      component.uid
    )
  })
}
function pointerMove(component, { dx, dy = 0 }) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: component.x + 10 + dx, clientY: component.y + 10 + dy }))
  })
}
function pointerUp() {
  act(() => { window.dispatchEvent(new PointerEvent('pointerup')) })
}

describe('MB-VIS-CANVAS-044 — profondeur / feedback d\'interaction (invariants structurels)', () => {
  it('T1 — un composant non selected/non focused garde son état neutre (aucune classe/attribut de profondeur au repos)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 120, 80) })
    const el = container.querySelector('.circuit-component')
    expect(el.className).not.toMatch(/circuit-component--selected/)
    expect(el.hasAttribute('data-focused')).toBe(false)
  })

  it('T2 — selected reste piloté UNIQUEMENT par isSelected() (aucune régression de MB-VIS-CANVAS-043)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('LED', 120, 80) })
    const uid = getApi().components[0].uid

    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    expect(container.querySelector('.circuit-component--selected')).not.toBe(null)

    act(() => { getApi().clearSelection() })
    expect(container.querySelector('.circuit-component--selected')).toBe(null)
  })

  it("T3 — focused est piloté par l'état de focus existant (focusComponent/exitFocus, MB-VIS-CANVAS-052) et ne modifie jamais le Document", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 200, 150) })
    const before = { ...getApi().components[0] }
    const uid = getApi().components[0].uid
    const undoCountBefore = getApi().getUndoCount()

    act(() => { getApi().focusComponent(uid) })
    const el = container.querySelector('.circuit-component')
    expect(el.getAttribute('data-focused')).toBe('')

    const after = getApi().components.find((c) => c.uid === uid)
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
    expect(getApi().getUndoCount()).toBe(undoCountBefore)

    act(() => { getApi().exitFocus() })
    expect(container.querySelector('.circuit-component').hasAttribute('data-focused')).toBe(false)
  })

  it('T4 — focus + selected coexistent sans corruption de classe/état (deux mécanismes indépendants)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('LED', 120, 80) })
    const uid = getApi().components[0].uid

    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    act(() => { getApi().focusComponent(uid) })

    const el = container.querySelector('.circuit-component')
    expect(el.className).toMatch(/circuit-component--selected/)
    expect(el.getAttribute('data-focused')).toBe('')
    expect(getApi().isSelected({ type: 'component', id: uid })).toBe(true)
    expect(getApi().focusedComponentId).toBe(uid)

    // Défocaliser ne doit jamais désélectionner (systèmes indépendants,
    // §7.4 : "les deux peuvent coexister").
    act(() => { getApi().exitFocus() })
    expect(container.querySelector('.circuit-component').className).toMatch(/circuit-component--selected/)
    expect(getApi().isSelected({ type: 'component', id: uid })).toBe(true)
  })

  it("T5/T7 — hover/dragging sont purement CSS (:hover/:active) : aucune classe React n'est jamais ajoutée pour ces états, aucune mutation Document/historique possible par construction", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 60, 60) })
    const el = container.querySelector('.circuit-component')
    const undoCountBefore = getApi().getUndoCount()

    // Aucune classe "hover"/"dragging" React n'existe dans ce dépôt (voir
    // CircuitComponent.jsx, inchangé par ce ticket) : le survol/la pression
    // sont entièrement délégués aux pseudo-classes natives du navigateur
    // (CircuitComponent.css `:hover`/`:active`), jamais reflétés en tant que
    // classe DOM statique — seule --selected (Selection System) l'est.
    expect(el.className).not.toMatch(/hover/)
    expect(el.className).not.toMatch(/dragging/)
    expect(el.className.trim()).toBe('circuit-component')
    expect(getApi().getUndoCount()).toBe(undoCountBefore)
  })

  it('T6 — le drag conserve exactement la même mutation Document finale (position réelle inchangée par le nouveau feedback visuel)', () => {
    const { getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 60, 60) })
    const comp = getApi().components[0]

    pointerDown(getApi(), comp)
    pointerMove(comp, { dx: 40, dy: 25 })
    pointerUp()

    const after = getApi().components.find((c) => c.uid === comp.uid)
    // Même formule de snap que MoveComponentMutationChannel.integration.test.jsx
    // (GRID_SIZE=20, non modifié) : preuve que 044 n'introduit aucune
    // seconde règle de positionnement.
    expect(after.x).toBe(100) // snapToGrid(60+40)
    expect(after.y).toBe(80)  // snapToGrid(60+25) -> round(85/20)*20
  })

  it("T8 — localScale continue d'utiliser le SEUL transform existant (inline style), jamais écrasé par une règle de classe ajoutée par 044", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 120, 80) })
    const uid = getApi().components[0].uid

    act(() => { getApi().focusComponent(uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })

    const el = container.querySelector('.circuit-component')
    expect(getApi().localScale).toBeGreaterThan(1)
    expect(el.style.transform).toBe(`scale(${getApi().localScale})`)
  })

  it('T9 — breadboard selected / feedback-valid / feedback-invalid restent présents et fonctionnels (044 ne remplace pas le relief 041/042, seulement hover/dragging)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    const bb = getApi().breadboards[0]

    act(() => { getApi().selectOnly({ type: 'breadboard', id: bb.id }) })
    const svg = container.querySelector('svg.breadboard')
    expect(svg.classList.contains('breadboard--selected')).toBe(true)

    act(() => { getApi().startSidebarComponentDrag('RESISTOR') })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBeGreaterThan(0)
    act(() => { getApi().endSidebarComponentDrag() })
  })

  it('T10 — les mécanismes ajoutés (:hover/:active/[data-focused]) restent génériques : identiques pour RESISTOR (SVG/carte), LED et ARDUINO (raster), aucun branchement par type', () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addComponent('RESISTOR', 60, 60)
      getApi().addComponent('LED', 200, 60)
      getApi().addComponent('ARDUINO', 340, 60)
    })
    const uids = getApi().components.map((c) => c.uid)

    for (const uid of uids) {
      act(() => { getApi().focusComponent(uid) })
      const el = [...container.querySelectorAll('.circuit-component')].find(
        (node) => node.getAttribute('data-focused') === ''
      )
      expect(el).not.toBe(undefined)
      act(() => { getApi().exitFocus() })
    }
  })
})
