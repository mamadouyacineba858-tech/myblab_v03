/**
 * WiresLayer.test.jsx — MB-VIS-004.
 *
 * Test de rendu isolé : wrapping direct de CircuitContext.Provider (context
 * brut, cf. context/CircuitContext.js) avec une valeur minimale mockée,
 * plutôt que le CircuitProvider complet (useCircuitState) — WiresLayer ne
 * consomme que isSelected/selectOnly/toggleSelection/wires/pinSignals.
 * Précédent le plus proche en forme : RealisticRenderers.test.jsx
 * (MB-VIS-002), qui rend directement les composants de rendu réels.
 */
// MB-VIS-005 (correction ciblée de validation Phase E) : import explicite de
// React, même convention que les tests d'intégration frères
// (AddWireMutationChannel.integration.test.jsx,
// AddComponentMutationChannel.integration.test.jsx,
// DeleteCommand.integration.test.jsx) — nécessaire au rendu JSX sous la
// configuration de test jsdom secondaire (frontend/vitest.config.js).
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { WiresLayer } from '../WiresLayer.jsx'
import { CircuitContext } from '../../context/CircuitContext.js'
import { Signal } from '../../simulator/signals.js'

const WIRE = { id: 'wire-1', fromUid: 'A', fromPin: 'anode', toUid: 'B', toPin: 'A' }
const PATH = { id: 'wire-1', d: 'M 0 0 L 50 0 L 50 50 L 100 50' }

function renderWithContext({
  wirePaths = [PATH],
  wires = [WIRE],
  pinSignals = new Map(),
  isSelected = () => false,
  selectOnly = vi.fn(),
  toggleSelection = vi.fn(),
  canvasRef,
  updateWireWaypoints,
  startWaypointDrag,
} = {}) {
  const value = {
    isSelected,
    selectOnly,
    toggleSelection,
    wires,
    pinSignals,
    canvasRef,
    updateWireWaypoints,
    startWaypointDrag,
  }
  const utils = render(
    <CircuitContext.Provider value={value}>
      <WiresLayer wirePaths={wirePaths} />
    </CircuitContext.Provider>
  )
  const visiblePath = utils.container.querySelector('[aria-label="wire-1"]')
  const hitzone = utils.container.querySelector('.wires-layer__hitzone')
  return { ...utils, visiblePath, hitzone, selectOnly, toggleSelection, updateWireWaypoints, startWaypointDrag }
}

// MB-VIS-005 (ruling CSA du 2026-08-21, Phase E) : canvasRef minimal, une
// DOMRect nulle suffit puisque seuls les deltas clientX/clientY - rect
// comptent (clientToCanvas, utils/geometry.js).
function makeCanvasRef() {
  return { current: { getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) } }
}

describe('MB-VIS-004 — WiresLayer, non-régression', () => {
  it('rend un fil sans état particulier avec la couleur neutre historique', () => {
    const { visiblePath } = renderWithContext()
    expect(visiblePath).not.toBeNull()
    expect(visiblePath.getAttribute('stroke')).toBe('#f97316')
  })

  it('rend un fil sélectionné avec la couleur de sélection historique, quel que soit l\'état logique', () => {
    const { visiblePath } = renderWithContext({
      isSelected: () => true,
      pinSignals: new Map([['A:anode', Signal.HIGH]]),
    })
    expect(visiblePath.getAttribute('stroke')).toBe('#22c55e')
  })

  it('le clic simple sur un fil appelle selectOnly avec {type:"wire", id}', () => {
    const { hitzone, selectOnly } = renderWithContext()
    fireEvent.click(hitzone)
    expect(selectOnly).toHaveBeenCalledWith({ type: 'wire', id: 'wire-1' })
  })

  it('le ctrl+clic sur un fil appelle toggleSelection avec {type:"wire", id}', () => {
    const { hitzone, toggleSelection } = renderWithContext()
    fireEvent.click(hitzone, { ctrlKey: true })
    expect(toggleSelection).toHaveBeenCalledWith({ type: 'wire', id: 'wire-1' })
  })

  it('ne rend rien pour une entrée wirePaths sans id ou d', () => {
    const { container } = renderWithContext({ wirePaths: [{ id: null, d: 'M 0 0' }] })
    expect(container.querySelectorAll('.wires-layer__hitzone')).toHaveLength(0)
  })
})

describe('MB-VIS-004 — WiresLayer, survol (hover)', () => {
  it('applique la classe --hover après mouseEnter sur la hitzone, la retire après mouseLeave', () => {
    const { hitzone, visiblePath } = renderWithContext()
    expect(visiblePath.getAttribute('class')).not.toMatch(/--hover/)

    fireEvent.mouseEnter(hitzone)
    expect(visiblePath.getAttribute('class')).toMatch(/--hover/)

    fireEvent.mouseLeave(hitzone)
    expect(visiblePath.getAttribute('class')).not.toMatch(/--hover/)
  })
})

describe('MB-VIS-004 — WiresLayer, états logiques HIGH/LOW/UNKNOWN/FLOATING', () => {
  it.each([
    [Signal.HIGH, 'wires-layer__wire--high'],
    [Signal.LOW, 'wires-layer__wire--low'],
    [Signal.UNKNOWN, 'wires-layer__wire--unknown'],
    [Signal.FLOATING, 'wires-layer__wire--floating'],
  ])('signal %s -> classe %s, couleur distincte du neutre et de la sélection', (signal, expectedClass) => {
    const { visiblePath } = renderWithContext({
      pinSignals: new Map([['A:anode', signal]]),
    })
    expect(visiblePath.getAttribute('class')).toMatch(expectedClass)
    expect(visiblePath.getAttribute('stroke')).not.toBe('#f97316')
    expect(visiblePath.getAttribute('stroke')).not.toBe('#22c55e')
  })

  it('un wire non sélectionné avec des waypoints ne rend aucune poignée', () => {
    const { container } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [{ x: 10, y: 10 }] }],
      isSelected: () => false,
    })
    expect(container.querySelectorAll('.wires-layer__waypoint-handle')).toHaveLength(0)
    // Invariant préservé : toujours exactement deux <path> par fil.
    expect(container.querySelectorAll('path')).toHaveLength(2)
  })

  it('FLOATING est en outre tracé en pointillés (distinguable sans dépendre uniquement de la couleur)', () => {
    const { visiblePath } = renderWithContext({
      pinSignals: new Map([['A:anode', Signal.FLOATING]]),
    })
    expect(visiblePath.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('HIGH/LOW/UNKNOWN ne sont pas tracés en pointillés', () => {
    for (const signal of [Signal.HIGH, Signal.LOW, Signal.UNKNOWN]) {
      const { visiblePath } = renderWithContext({ pinSignals: new Map([['A:anode', signal]]) })
      expect(visiblePath.getAttribute('stroke-dasharray')).toBeFalsy()
    }
  })
})

describe('MB-VIS-004 — WiresLayer, [Q3] simulation inactive', () => {
  it('pinSignals vide (Map()) -> état neutre, jamais assimilé à UNKNOWN', () => {
    const { visiblePath } = renderWithContext({ pinSignals: new Map() })
    expect(visiblePath.getAttribute('stroke')).toBe('#f97316')
    expect(visiblePath.getAttribute('class')).not.toMatch(/--unknown/)
    expect(visiblePath.getAttribute('class')).not.toMatch(/--high|--low|--floating/)
  })
})

describe('MB-VIS-004 — WiresLayer, [Q1] aucune prévisualisation de fil', () => {
  it("ne rend aucun élément de prévisualisation même pendant un survol", () => {
    // Garde de non-régression de périmètre : hover ne doit produire qu'un
    // accent visuel sur le fil déjà rendu (classe --hover), jamais un
    // nouvel élément de tracé provisoire. Toute apparition d'un élément de
    // type "preview"/"ghost"/"draft" signalerait une dérive vers l'option
    // (b), explicitement écartée par l'arbitrage CSA Q1 (2026-08-20).
    const { hitzone, container } = renderWithContext()
    fireEvent.mouseEnter(hitzone)
    expect(container.querySelectorAll('.wires-layer__preview, .wires-layer__ghost, .wires-layer__draft')).toHaveLength(0)
    // Toujours exactement deux <path> par fil (hitzone + trait visible).
    expect(container.querySelectorAll('path')).toHaveLength(2)
  })
})

describe('MB-VIS-005 (ruling CSA du 2026-08-21, Phase E) — poignées de waypoint', () => {
  it('un wire sélectionné avec des waypoints rend une poignée <circle> par waypoint, positionnée à ses coordonnées', () => {
    const { container } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }],
      isSelected: () => true,
    })
    const handles = container.querySelectorAll('.wires-layer__waypoint-handle')
    expect(handles).toHaveLength(2)
    expect(handles[0].getAttribute('cx')).toBe('10')
    expect(handles[0].getAttribute('cy')).toBe('20')
    expect(handles[1].getAttribute('cx')).toBe('30')
    expect(handles[1].getAttribute('cy')).toBe('40')
    // Les poignées sont des <circle>, jamais des <path> : l'invariant
    // "exactement deux <path> par fil" reste vrai.
    expect(container.querySelectorAll('path')).toHaveLength(2)
  })

  it('un wire sélectionné sans waypoints ne rend aucune poignée', () => {
    const { container } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [] }],
      isSelected: () => true,
    })
    expect(container.querySelectorAll('.wires-layer__waypoint-handle')).toHaveLength(0)
  })

  it('pointerdown sur une poignée délègue à startWaypointDrag(event, wireId, index) sans muter directement wires (AC-03/AC-11)', () => {
    const startWaypointDrag = vi.fn()
    const { container } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [{ x: 10, y: 20 }] }],
      isSelected: () => true,
      startWaypointDrag,
    })
    const handle = container.querySelector('.wires-layer__waypoint-handle')
    fireEvent.pointerDown(handle)
    expect(startWaypointDrag).toHaveBeenCalledTimes(1)
    expect(startWaypointDrag.mock.calls[0][1]).toBe('wire-1')
    expect(startWaypointDrag.mock.calls[0][2]).toBe(0)
  })

  it('double-clic sur une poignée appelle updateWireWaypoints avec le tableau amputé de cet index (suppression, mutation atomique unique)', () => {
    const updateWireWaypoints = vi.fn()
    const { container } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }],
      isSelected: () => true,
      updateWireWaypoints,
    })
    const handles = container.querySelectorAll('.wires-layer__waypoint-handle')
    fireEvent.doubleClick(handles[0])
    expect(updateWireWaypoints).toHaveBeenCalledTimes(1)
    expect(updateWireWaypoints).toHaveBeenCalledWith('wire-1', [{ x: 30, y: 40 }])
  })

  it('double-clic sur le tracé (hitzone) d\'un wire sélectionné insère un nouveau waypoint via updateWireWaypoints (création, mutation atomique unique)', () => {
    const updateWireWaypoints = vi.fn()
    const { hitzone } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [] }],
      isSelected: () => true,
      updateWireWaypoints,
      canvasRef: makeCanvasRef(),
    })
    fireEvent.doubleClick(hitzone, { clientX: 50, clientY: 0 })
    expect(updateWireWaypoints).toHaveBeenCalledTimes(1)
    const [wireId, nextWaypoints] = updateWireWaypoints.mock.calls[0]
    expect(wireId).toBe('wire-1')
    expect(nextWaypoints).toEqual([{ x: 50, y: 0 }])
  })

  it('double-clic sur le tracé d\'un wire NON sélectionné ne fait rien (création réservée à un wire déjà sélectionné)', () => {
    const updateWireWaypoints = vi.fn()
    const { hitzone } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [] }],
      isSelected: () => false,
      updateWireWaypoints,
      canvasRef: makeCanvasRef(),
    })
    fireEvent.doubleClick(hitzone, { clientX: 50, clientY: 0 })
    expect(updateWireWaypoints).not.toHaveBeenCalled()
  })

  it('sans canvasRef/updateWireWaypoints/startWaypointDrag fournis par le contexte (garde défensive), aucune interaction ne lève d\'erreur', () => {
    const { container, hitzone } = renderWithContext({
      wires: [{ ...WIRE, waypoints: [{ x: 10, y: 20 }] }],
      isSelected: () => true,
    })
    const handle = container.querySelector('.wires-layer__waypoint-handle')
    expect(() => {
      fireEvent.pointerDown(handle)
      fireEvent.doubleClick(handle)
      fireEvent.doubleClick(hitzone, { clientX: 50, clientY: 0 })
    }).not.toThrow()
  })
})
