/**
 * CanvasWorkspaceReconciliation.test.jsx — MB-VIS-CANVAS-043
 * "Tinkercad-Level Workspace Visual Reconciliation".
 *
 * Ce ticket est volontairement VISUEL (workspace clair, grille discrète,
 * sélection réaccordée) : viewport.js, clientToCanvas(), le pipeline de
 * placement breadboard (BREAD-042) et la sémantique de Selection System
 * (selectOnly/isSelected/activeItem) sont LOCKED, non modifiés. Ce fichier
 * ne teste donc pas des valeurs de couleur (fragile, hors sujet du contrat
 * fonctionnel) mais les INVARIANTS STRUCTURELS que la réconciliation
 * visuelle ne doit jamais casser :
 *
 *   T1  GridBackground (.myblab-grid) présent ssi showGrid=true.
 *   T2  La grille vit dans .simulation-canvas__zoom-layer (repère canonique).
 *   T3  Aucune seconde transformation viewport n'est introduite : SEUL
 *       .simulation-canvas__zoom-layer porte un `transform`, la grille n'en
 *       porte aucun propre.
 *   T4  La sélection composant reste purement Presentation : la classe
 *       .circuit-component--selected apparaît/disparaît avec isSelected(),
 *       sans aucune mutation du Document ni entrée d'historique.
 *   T5  Le rendu multi-breadboard reste compatible (N instances, FT-C-BREAD-
 *       MULTI-001-D non affecté).
 *   T6  Le ghost BREAD-042 (ComponentInsertGhost) reste rendu à l'intérieur
 *       de la MÊME scène transformée que la grille/les composants/les
 *       breadboards (pas une seconde couche indépendante).
 *   T7  zoom/pan/sélection ne mutent JAMAIS le Document ni l'historique
 *       (aucune régression fonctionnelle cachée derrière le changement
 *       visuel).
 *
 * Pipeline RÉEL (CircuitProvider, vrai CommandRegistry/ValidationEngine/
 * flux pointer, vrai HistoryService) + rendu de <SimulationCanvas> — même
 * patron que multiBreadboardPresentation.integration.test.jsx /
 * MB-VIS-BREAD-042-InsertionSnapFeedback.integration.test.jsx, aucun mock du
 * Document.
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

describe('MB-VIS-CANVAS-043 — réconciliation visuelle du workspace (invariants structurels)', () => {
  it('le thème par défaut est "light" (workspace Tinkercad-level, mécanisme theme/setThemeMode inchangé — SettingsPanel.jsx)', () => {
    const { getApi } = renderCanvas()
    expect(getApi().theme).toBe('light')
  })

  it('T1 — GridBackground (.myblab-grid) présent ssi showGrid=true', () => {
    const { container, getApi } = renderCanvas()
    expect(container.querySelector('.myblab-grid')).not.toBe(null)

    act(() => { getApi().toggleGrid() })
    expect(container.querySelector('.myblab-grid')).toBe(null)

    act(() => { getApi().toggleGrid() })
    expect(container.querySelector('.myblab-grid')).not.toBe(null)
  })

  it('T2 — la grille vit dans .simulation-canvas__zoom-layer (repère canonique partagé, pas une couche indépendante)', () => {
    const { container } = renderCanvas()
    const zoomLayer = container.querySelector('.simulation-canvas__zoom-layer')
    expect(zoomLayer).not.toBe(null)
    expect(zoomLayer.querySelector('.myblab-grid')).not.toBe(null)
    // La grille n'existe nulle part HORS de la zoom-layer.
    const gridOutside = [...container.querySelectorAll('.myblab-grid')].filter(
      (el) => !zoomLayer.contains(el)
    )
    expect(gridOutside.length).toBe(0)
  })

  it("T3 — aucune seconde transformation viewport : SEUL .simulation-canvas__zoom-layer porte un `transform`, la grille n'en porte aucun propre", () => {
    const { container, getApi } = renderCanvas()

    act(() => { getApi().zoomByFactorAtScreenPoint(100, 100, 1.1) })
    const { zoom, translateX, translateY } = getApi().viewport
    expect(zoom).toBeCloseTo(1.1, 5)

    const zoomLayer = container.querySelector('.simulation-canvas__zoom-layer')
    expect(zoomLayer.style.transform).toBe(
      `translate(${translateX}px, ${translateY}px) scale(${zoom})`
    )

    // La grille suit passivement (aucun transform propre) : c'est le SEUL
    // point d'application du viewport (Blueprint §7/D2).
    const grid = zoomLayer.querySelector('.myblab-grid')
    expect(grid.style.transform).toBe('')
  })

  it('T4 — la sélection composant reste purement Presentation : classe .circuit-component--selected pilotée par isSelected(), aucune mutation Document/historique', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addComponent('RESISTOR', 120, 80) })
    const uid = getApi().components[0].uid
    const undoCountBefore = getApi().getUndoCount()
    const before = { ...getApi().components[0] }

    let el = container.querySelector(`[data-backend]`)
    expect(el.className).not.toMatch(/circuit-component--selected/)

    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    expect(getApi().isSelected({ type: 'component', id: uid })).toBe(true)
    el = container.querySelector(`[data-backend]`)
    expect(el.className).toMatch(/circuit-component--selected/)

    // Aucune mutation Document, aucune entrée d'historique pour un simple
    // changement de sélection (purement visuel).
    const after = getApi().components.find((c) => c.uid === uid)
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
    expect(after.type).toBe(before.type)
    expect(getApi().getUndoCount()).toBe(undoCountBefore)

    act(() => { getApi().clearSelection() })
    expect(getApi().isSelected({ type: 'component', id: uid })).toBe(false)
    el = container.querySelector(`[data-backend]`)
    expect(el.className).not.toMatch(/circuit-component--selected/)
  })

  it('T5 — le rendu multi-breadboard reste compatible (N instances, FT-C-BREAD-MULTI-001-D non affecté)', () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addBreadboard(500, 0)
      getApi().addBreadboard(1000, 0)
    })
    expect(container.querySelectorAll('svg.breadboard').length).toBe(3)
  })

  it('T6 — le ghost BREAD-042 reste rendu dans la MÊME scène transformée que la grille/les breadboards (pas une seconde couche)', () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })

    act(() => { getApi().startSidebarComponentDrag('RESISTOR') })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    const zoomLayer = container.querySelector('.simulation-canvas__zoom-layer')
    const ghost = zoomLayer.querySelector('.component-insert-ghost')
    expect(ghost).not.toBe(null)
    // Le ghost n'a, lui non plus, aucun transform viewport propre : il suit
    // la zoom-layer exactement comme la grille (T3) et les composants réels.
    expect(ghost.style.transform === '' || ghost.style.transform === undefined).toBe(true)
  })

  it("T7 — zoom/pan/sélection ne mutent JAMAIS le Document ni l'historique (non-régression fonctionnelle derrière le changement visuel)", () => {
    const { getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addComponent('LED', 300, 300)
    })
    const uid = getApi().components[0].uid
    const componentsSnapshot = JSON.stringify(getApi().components)
    const breadboardsSnapshot = JSON.stringify(getApi().breadboards)
    const undoCountBefore = getApi().getUndoCount()

    act(() => { getApi().zoomByFactorAtScreenPoint(50, 50, 1.2) })
    act(() => { getApi().selectOnly({ type: 'component', id: uid }) })
    act(() => { getApi().resetViewport() })
    act(() => { getApi().clearSelection() })

    expect(JSON.stringify(getApi().components)).toBe(componentsSnapshot)
    expect(JSON.stringify(getApi().breadboards)).toBe(breadboardsSnapshot)
    expect(getApi().getUndoCount()).toBe(undoCountBefore)
  })
})
