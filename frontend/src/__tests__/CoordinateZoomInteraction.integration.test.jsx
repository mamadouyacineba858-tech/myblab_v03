/**
 * CoordinateZoomInteraction.integration.test.jsx — MB-VIS-CANVAS-049.
 *
 * Verrouille la Décision CSA du Blueprint : « Le repère de vérité pour les
 * interactions est le repère Document/Canvas. Toute entrée de coordonnées
 * provenant du viewport doit être convertie vers ce repère avant d'alimenter
 * les opérations de sélection, drag, waypoint ou snapping. Le zoom est un
 * facteur de projection entre Document et écran ; il ne modifie jamais les
 * coordonnées du Document. »
 *
 * Avant ce ticket, `clientToCanvas()` (utils/geometry.js) ne divisait pas
 * par `zoom` — un pixel écran valait un pixel Document quel que soit le
 * niveau de zoom. Chaque test ci-dessous choisit un delta écran (`dx`/`dy`)
 * volontairement construit pour produire un résultat DIFFÉRENT selon que la
 * conversion compense le zoom ou non — chaque test échouerait donc contre
 * l'ancien comportement et documente explicitement, en commentaire, la
 * valeur qu'il aurait obtenue sous l'ancien bug (§EXP3-RECALAGE-002).
 *
 * Patron de harnais identique à MoveComponentMutationChannel.integration.test.jsx
 * (CircuitProvider + canvasRef réel attaché à un noeud DOM ; `getBoundingClientRect()`
 * de jsdom renvoie un rect à zéro, donc `clientToCanvas` se réduit à
 * `event.clientX / zoom` — exactement ce qui permet de choisir des `dx`/`dy`
 * qui distinguent sans ambiguïté la conversion correcte de l'ancienne.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { GRID_SIZE } from '../utils/grid.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => useCircuit(), { wrapper })
}

let _result = null
function lastResult() { return _result.current }

function setZoom(target) {
  // zoomIn/zoomOut avancent par pas de 0.1, bornés [0.5, 2] — cf.
  // useCircuitState.js. On repart toujours de 1 (valeur initiale du hook).
  const steps = Math.round((target - 1) / 0.1)
  act(() => {
    for (let i = 0; i < Math.abs(steps); i++) {
      if (steps > 0) lastResult().zoomIn()
      else lastResult().zoomOut()
    }
  })
  expect(lastResult().zoom).toBeCloseTo(target, 5)
}

function pointerDown(clientX, clientY, uid) {
  const event = {
    button: 0,
    clientX,
    clientY,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => {
    lastResult().startDrag(event, uid)
  })
}

function pointerMove(clientX, clientY) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY }))
  })
}

function pointerUp() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
}

describe('MB-VIS-CANVAS-049 — Coordinate & Interaction Foundation (zoom != 1)', () => {
  // ==========================================================================
  // DRAG COMPOSANT
  // ==========================================================================
  describe('Drag composant', () => {
    it('zoom > 1 (2.0×) : un drag de 240px écran déplace le composant de 120 unités Document (240/2), pas 240', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      setZoom(2.0)

      pointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 240, component.y + 10)
      pointerUp()

      const moved = result.current.components.find((c) => c.uid === component.uid)
      // Correct : 100 + (240/2.0) = 220 (déjà multiple de 20, aucun arrondi).
      // Ancien bug (non corrigé par ce ticket) aurait produit 100 + 240 = 340.
      expect(moved.x).toBe(220)
      expect(moved.x).not.toBe(340)
      expect(moved.y).toBe(component.y)
    })

    it('zoom < 1 (0.5×) : un drag de 100px écran déplace le composant de 200 unités Document (100/0.5), pas 100', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      setZoom(0.5)

      pointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 100, component.y + 10)
      pointerUp()

      const moved = result.current.components.find((c) => c.uid === component.uid)
      // Correct : 100 + (100/0.5) = 300. Ancien bug aurait produit 100 + 100 = 200.
      expect(moved.x).toBe(300)
      expect(moved.x).not.toBe(200)
    })

    it('zoom = 1 (référence) : comportement strictement inchangé — un drag de 60px déplace de 60 unités Document', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      expect(result.current.zoom).toBe(1)

      pointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 60, component.y + 10 + 40)
      pointerUp()

      const moved = result.current.components.find((c) => c.uid === component.uid)
      expect(moved.x).toBe(160)
      expect(moved.y).toBe(140)
    })

    it('zoom > 1 : le snapping (GRID_SIZE=20) s\'applique sur la position Document déjà corrigée par le zoom', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      setZoom(1.5)

      // Delta écran de 23px -> delta Document brut 23/1.5 = 15.33..., non
      // multiple de 20 : le résultat doit malgré tout être aligné sur la
      // grille (comportement préservé, pas contourné par la correction zoom).
      pointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 23, component.y + 10)
      pointerUp()

      const moved = result.current.components.find((c) => c.uid === component.uid)
      expect(moved.x % GRID_SIZE).toBe(0)
    })

    it('zoom > 1 : une seule entrée d\'historique par drag (I-H10 préservé), Undo restaure la position zoom-correcte', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      const initial = { x: component.x, y: component.y }
      setZoom(2.0)
      const undoCountBefore = result.current.getUndoCount()

      pointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 240, component.y + 10)
      pointerUp()

      expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
      const moved = result.current.components.find((c) => c.uid === component.uid)
      expect(moved.x).toBe(220)

      act(() => { result.current.undo() })
      const afterUndo = result.current.components.find((c) => c.uid === component.uid)
      expect({ x: afterUndo.x, y: afterUndo.y }).toEqual(initial)
    })
  })

  // ==========================================================================
  // MARQUEE
  // ==========================================================================
  describe('Marquee', () => {
    it('zoom = 2.0 : un marquee tracé visuellement autour du composant à l\'écran le sélectionne (converti en Document avant comparaison)', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      setZoom(2.0)

      // Le composant (boîte Document 80x64 depuis (100,100)) apparaît à
      // l'écran, à ce zoom, entre (200,200) et (360,328). Un marquee tracé
      // par l'utilisateur visuellement autour de cette zone à l'écran :
      act(() => {
        result.current.startMarquee({
          clientX: 190, clientY: 190, ctrlKey: false, metaKey: false,
          preventDefault: () => {}, stopPropagation: () => {},
        })
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 370, clientY: 340 }))
      })
      pointerUp()

      // Correct : rect Document (190/2,190/2)-(370/2,340/2) = (95,95)-(185,170),
      // qui recouvre largement (100,100)-(180,164) -> sélectionné.
      // Ancien bug : rect Document restait (190,190)-(370,340) (jamais divisé
      // par zoom), qui NE RECOUVRE PAS (100,100)-(180,164) (190 > 180 en x)
      // -> le composant n'aurait PAS été sélectionné malgré un tracé visuel
      // qui l'entoure clairement à l'écran.
      expect(result.current.isSelected({ type: 'component', id: component.uid })).toBe(true)
    })

    it('zoom = 0.5 : un marquee tracé visuellement autour du composant à l\'écran le sélectionne', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]
      setZoom(0.5)

      // Le composant apparaît à l'écran entre (50,50) et (90,82) à ce zoom.
      act(() => {
        result.current.startMarquee({
          clientX: 30, clientY: 30, ctrlKey: false, metaKey: false,
          preventDefault: () => {}, stopPropagation: () => {},
        })
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 80, clientY: 80 }))
      })
      pointerUp()

      // Correct : rect Document (30/0.5,30/0.5)-(80/0.5,80/0.5) = (60,60)-(160,160),
      // qui recouvre ~56% de (100,100)-(180,164) -> sélectionné (seuil 0.5).
      // Ancien bug : rect Document restait (30,30)-(80,80), qui NE RECOUVRE
      // PAS (100,100)-(180,164) -> pas de sélection.
      expect(result.current.isSelected({ type: 'component', id: component.uid })).toBe(true)
    })

    it('zoom = 1 (référence) : un marquee entourant le composant le sélectionne toujours', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]

      act(() => {
        result.current.startMarquee({
          clientX: 90, clientY: 90, ctrlKey: false, metaKey: false,
          preventDefault: () => {}, stopPropagation: () => {},
        })
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 190, clientY: 175 }))
      })
      pointerUp()

      expect(result.current.isSelected({ type: 'component', id: component.uid })).toBe(true)
    })
  })

  // ==========================================================================
  // WAYPOINT DE FIL
  // ==========================================================================
  describe('Waypoint de fil', () => {
    it('zoom = 2.0 : un drag de waypoint de 240px écran le déplace de 120 unités Document', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => {
        result.current.addComponent('LED', 100, 100)
        result.current.addComponent('RESISTOR', 400, 100)
      })
      const [led, resistor] = result.current.components
      act(() => { result.current.addWire(led.uid, 'anode', resistor.uid, 'A') })
      const wireId = result.current.wires[0].id
      act(() => { result.current.updateWireWaypoints(wireId, [{ x: 200, y: 150 }]) })

      setZoom(2.0)

      act(() => {
        result.current.startWaypointDrag(
          { clientX: 300, clientY: 300, preventDefault: () => {}, stopPropagation: () => {} },
          wireId,
          0
        )
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 + 240, clientY: 300 }))
      })
      pointerUp()

      const waypoint = result.current.wires.find((w) => w.id === wireId).waypoints[0]
      // Correct : 200 + (240/2.0) = 320. Ancien bug aurait produit 200 + 240 = 440.
      expect(waypoint.x).toBe(320)
      expect(waypoint.x).not.toBe(440)
      expect(waypoint.y).toBe(150)
    })

    it('zoom = 1 (référence) : un drag de waypoint de 50px le déplace de 50 unités Document', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => {
        result.current.addComponent('LED', 100, 100)
        result.current.addComponent('RESISTOR', 400, 100)
      })
      const [led, resistor] = result.current.components
      act(() => { result.current.addWire(led.uid, 'anode', resistor.uid, 'A') })
      const wireId = result.current.wires[0].id
      act(() => { result.current.updateWireWaypoints(wireId, [{ x: 200, y: 150 }]) })

      act(() => {
        result.current.startWaypointDrag(
          { clientX: 300, clientY: 300, preventDefault: () => {}, stopPropagation: () => {} },
          wireId,
          0
        )
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 350, clientY: 300 }))
      })
      pointerUp()

      const waypoint = result.current.wires.find((w) => w.id === wireId).waypoints[0]
      expect(waypoint.x).toBe(250)
    })
  })

  // ==========================================================================
  // DRAG BREADBOARD
  // ==========================================================================
  describe('Drag Breadboard', () => {
    it('zoom = 2.0 : un drag de 240px écran déplace le Breadboard de 120 unités Document (pas de BREADBOARD_PITCH)', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addBreadboard(120, 180) })
      const breadboardBefore = result.current.breadboard
      expect(breadboardBefore).toBeTruthy()
      setZoom(2.0)

      act(() => {
        result.current.selectOnly({ type: 'breadboard', id: breadboardBefore.id })
        result.current.startBreadboardDrag({
          clientX: 300, clientY: 300, preventDefault: () => {}, stopPropagation: () => {},
        })
      })
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 + 240, clientY: 300 }))
      })
      pointerUp()

      const breadboardAfter = result.current.breadboard
      // Correct : deltaX Document = 240/2.0 = 120 (déjà multiple de
      // BREADBOARD_PITCH=12) -> position.x = breadboardBefore.x + 120.
      // Ancien bug aurait appliqué un delta de 240 (non divisé).
      expect(breadboardAfter.position.x).toBe(breadboardBefore.position.x + 120)
      expect(breadboardAfter.position.x).not.toBe(breadboardBefore.position.x + 240)
      expect(breadboardAfter.position.x % BREADBOARD_PITCH).toBe(0)
    })
  })

  // ==========================================================================
  // SIDEBAR — modèle de coordonnées partagé (pas de formule concurrente)
  // ==========================================================================
  // La preuve architecturale que Sidebar drop/preview partage désormais
  // EXACTEMENT le même point de conversion (clientToCanvas) que
  // drag/marquee/waypoint/Breadboard est apportée par
  // coordinateConversionSingleModelGuard.test.js (critère d'acceptation #10)
  // — ce test-ci se limite à vérifier, au niveau intégration, que le chemin
  // Sidebar reste opérationnel à zoom != 1 (aucune régression fonctionnelle
  // introduite par la centralisation).
  describe('Sidebar drop/preview — reste opérationnel à zoom != 1', () => {
    it('startSidebarComponentDrag / updateSidebarComponentDragPosition / endSidebarComponentDrag fonctionnent sans erreur à zoom=2.0', () => {
      const { result } = renderWithCanvas()
      _result = result

      act(() => { result.current.addBreadboard(0, 0) })
      setZoom(2.0)

      act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
      expect(() => {
        act(() => { result.current.updateSidebarComponentDragPosition(200, 200) })
      }).not.toThrow()
      act(() => { result.current.endSidebarComponentDrag() })
      expect(result.current.breadboardInsertPreview).toBeNull()
    })
  })
})
