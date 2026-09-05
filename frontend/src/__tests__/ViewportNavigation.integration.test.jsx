/**
 * ViewportNavigation.integration.test.jsx — MB-VIS-CANVAS-050.
 *
 * Verrouille le contrat de navigation de viewport au niveau du hook complet
 * (useCircuitState via CircuitProvider) : pan (D1/D5), zoom orienté curseur
 * (D4), reset (D6), fit-to-content/-selection (D7/D8), primitive générique
 * de centrage (D9), garde I-M1 (contrainte #6) et absence totale de mutation
 * Document / entrée Undo-Redo pour toute opération de viewport (contraintes
 * #2/#8).
 *
 * Patron de harnais identique à CoordinateZoomInteraction.integration.test.jsx
 * (049), étendu par `renderWithCanvasSize()` : contrairement au drag/marquee
 * (dont la correction ne dépend que d'un RATIO, donc indifférente à un rect
 * de canvas nul en jsdom), fit-to-content/-selection ont besoin d'une taille
 * de viewport RÉELLE (width/height > 0) pour produire un résultat — le noeud
 * canvasRef reçoit donc un `getBoundingClientRect` mocké après montage.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { clientToCanvas } from '../utils/geometry.js'

function renderWithCanvasSize(width = 800, height = 600) {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div
        ref={(node) => {
          if (node) {
            node.getBoundingClientRect = () => ({
              left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0,
            })
          }
          canvasRef.current = node
        }}
      >
        {children}
      </div>
    </CircuitProvider>
  )
  return renderHook(() => useCircuit(), { wrapper })
}

let _result = null
function lastResult() { return _result.current }

function middlePointerDown(clientX, clientY) {
  const event = {
    button: 1,
    clientX,
    clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => {
    lastResult().startPan(event)
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

function leftPointerDown(clientX, clientY, uid) {
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

describe('MB-VIS-CANVAS-050 — Canvas Navigation (viewport pan/zoom/reset/fit)', () => {
  // ==========================================================================
  // PAN
  // ==========================================================================
  describe('Pan', () => {
    it('pan horizontal : translateX avance exactement du delta écran, translateY et zoom inchangés', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      middlePointerDown(100, 100)
      pointerMove(180, 100)
      pointerUp()

      expect(result.current.viewport.translateX).toBe(80)
      expect(result.current.viewport.translateY).toBe(0)
      expect(result.current.viewport.zoom).toBe(1)
    })

    it('pan vertical : translateY avance exactement du delta écran', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      middlePointerDown(50, 50)
      pointerMove(50, 130)
      pointerUp()

      expect(result.current.viewport.translateX).toBe(0)
      expect(result.current.viewport.translateY).toBe(80)
    })

    it('un pan de N pixels écran produit le MÊME déplacement de translation quel que soit le zoom courant (D1)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => { result.current.zoomIn() }) // zoom = 1.1, translateX potentiellement non nul (ancrage centre)
      const translateXBeforePan = result.current.viewport.translateX

      middlePointerDown(0, 0)
      pointerMove(150, 0)
      pointerUp()

      // Le pan ajoute EXACTEMENT le delta écran, quel que soit translateX de
      // départ ou le zoom courant (D1) — jamais 150/zoom ou 150*zoom.
      expect(result.current.viewport.translateX).toBeCloseTo(translateXBeforePan + 150, 10)
    })

    it('le pan ne modifie AUCUN objet du Document et ne crée AUCUNE entrée Undo/Redo (AC #2/#13)', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      act(() => { result.current.addComponent('LED', 100, 100) })
      const before = result.current.components[0]
      const undoCountBefore = result.current.getUndoCount()

      middlePointerDown(0, 0)
      pointerMove(200, 150)
      pointerUp()

      const after = result.current.components.find((c) => c.uid === before.uid)
      expect(after.x).toBe(before.x)
      expect(after.y).toBe(before.y)
      expect(result.current.getUndoCount()).toBe(undoCountBefore)
    })

    it('pointercancel pendant un pan nettoie la session sans effet résiduel', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      middlePointerDown(0, 0)
      pointerMove(100, 0)
      act(() => { window.dispatchEvent(new PointerEvent('pointercancel')) })

      // La translation appliquée jusqu'à l'annulation N'EST PAS annulée (pas
      // de commit/rollback séparé pour le pan, cf. commentaire startPan) —
      // seule la SESSION est nettoyée : un pointermove ultérieur sans pan actif
      // ne doit plus rien déplacer.
      const afterCancel = { ...result.current.viewport }
      pointerMove(500, 500)
      expect(result.current.viewport).toEqual(afterCancel)
    })
  })

  // ==========================================================================
  // ZOOM PAR FACTEUR (molette) — variante utilisée par SimulationCanvas.jsx
  // via un listener natif non-passif (cf. commentaire dans le composant :
  // React attache `onWheel` en mode passif, rendant preventDefault() inopérant
  // — vérifié empiriquement en navigateur, corrigé par un addEventListener
  // natif `{ passive: false }` consommant cette fonction).
  // ==========================================================================
  describe('zoomByFactorAtScreenPoint (molette)', () => {
    it('applique le facteur au zoom COURANT (pas une valeur figée), même après plusieurs appels successifs', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      act(() => { result.current.zoomByFactorAtScreenPoint(0, 0, 1.1) })
      expect(result.current.viewport.zoom).toBeCloseTo(1.1, 5)

      act(() => { result.current.zoomByFactorAtScreenPoint(0, 0, 1.1) })
      expect(result.current.viewport.zoom).toBeCloseTo(1.21, 5)
    })

    it('reste borné [0.5,2] comme zoomAtScreenPoint (D10)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      for (let i = 0; i < 30; i++) act(() => { result.current.zoomByFactorAtScreenPoint(0, 0, 1.1) })
      expect(result.current.viewport.zoom).toBe(2)
    })
  })

  // ==========================================================================
  // ZOOM ORIENTÉ CURSEUR
  // ==========================================================================
  describe('Zoom orienté curseur (zoomAtScreenPoint)', () => {
    it('le point Document visé reste sous le même point écran après un zoom via zoomAtScreenPoint (D4, sans dérive)', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      const before = { ...result.current.viewport }
      const documentPointBefore = clientToCanvas({ clientX: 300, clientY: 200 }, { left: 0, top: 0 }, before.zoom, before.translateX, before.translateY)

      act(() => { result.current.zoomAtScreenPoint(300, 200, 2) })
      expect(result.current.viewport.zoom).toBe(2)

      const after = result.current.viewport
      const documentPointAfter = clientToCanvas({ clientX: 300, clientY: 200 }, { left: 0, top: 0 }, after.zoom, after.translateX, after.translateY)
      expect(documentPointAfter.x).toBeCloseTo(documentPointBefore.x, 5)
      expect(documentPointAfter.y).toBeCloseTo(documentPointBefore.y, 5)
    })

    it('zoomAtScreenPoint est borné [0.5, 2] — jamais de zoom infini/NaN', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      act(() => { result.current.zoomAtScreenPoint(0, 0, 999) })
      expect(result.current.viewport.zoom).toBe(2)

      act(() => { result.current.zoomAtScreenPoint(0, 0, 0.0001) })
      expect(result.current.viewport.zoom).toBe(0.5)
    })

    it('zoomIn/zoomOut restent bornés [0.5,2] par pas de 0.1 (non-régression 049)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      for (let i = 0; i < 20; i++) act(() => { result.current.zoomIn() })
      expect(result.current.viewport.zoom).toBe(2)
      for (let i = 0; i < 20; i++) act(() => { result.current.zoomOut() })
      expect(result.current.viewport.zoom).toBe(0.5)
    })
  })

  // ==========================================================================
  // RESET
  // ==========================================================================
  describe('Reset viewport (D6)', () => {
    it('resetViewport ramène systématiquement à {zoom:1, translateX:0, translateY:0}, quel que soit l\'état de départ', () => {
      const { result } = renderWithCanvasSize()
      _result = result

      middlePointerDown(0, 0)
      pointerMove(300, 150)
      pointerUp()
      act(() => { result.current.zoomAtScreenPoint(100, 100, 1.7) })

      expect(result.current.viewport).not.toEqual({ zoom: 1, translateX: 0, translateY: 0 })

      act(() => { result.current.resetViewport() })
      expect(result.current.viewport).toEqual({ zoom: 1, translateX: 0, translateY: 0 })
    })
  })

  // ==========================================================================
  // FIT-TO-CONTENT
  // ==========================================================================
  describe('fitToContent (D7)', () => {
    it('scène vide -> no-op sûr (viewport inchangé)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      const before = { ...result.current.viewport }
      act(() => { result.current.fitToContent() })
      expect(result.current.viewport).toEqual(before)
    })

    it('scène non vide -> le viewport change pour cadrer le contenu (zoom/translation recalculés)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => {
        result.current.addComponent('LED', 0, 0)
        result.current.addComponent('RESISTOR', 2000, 1500)
      })
      act(() => { result.current.fitToContent() })
      expect(result.current.viewport).not.toEqual({ zoom: 1, translateX: 0, translateY: 0 })
      expect(Number.isFinite(result.current.viewport.zoom)).toBe(true)
      expect(result.current.viewport.zoom).toBeGreaterThanOrEqual(0.5)
      expect(result.current.viewport.zoom).toBeLessThanOrEqual(2)
    })

    it('fitToContent ne mute aucun composant du Document et ne crée aucune entrée Undo/Redo', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => { result.current.addComponent('LED', 500, 500) })
      const before = result.current.components[0]
      const undoCountBefore = result.current.getUndoCount()

      act(() => { result.current.fitToContent() })

      const after = result.current.components.find((c) => c.uid === before.uid)
      expect(after.x).toBe(before.x)
      expect(after.y).toBe(before.y)
      expect(result.current.getUndoCount()).toBe(undoCountBefore)
    })
  })

  // ==========================================================================
  // FIT-TO-SELECTION
  // ==========================================================================
  describe('fitToSelection (D8)', () => {
    it('aucune sélection exploitable -> no-op sûr (viewport inchangé)', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => { result.current.addComponent('LED', 100, 100) })
      const before = { ...result.current.viewport }
      act(() => { result.current.fitToSelection() })
      expect(result.current.viewport).toEqual(before)
    })

    it('avec une sélection non vide -> le viewport cadre uniquement les éléments sélectionnés', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => {
        result.current.addComponent('LED', 0, 0)
        result.current.addComponent('RESISTOR', 3000, 3000)
      })
      const [led] = result.current.components
      act(() => { result.current.selectOnly({ type: 'component', id: led.uid }) })

      act(() => { result.current.fitToSelection() })
      // Cadrer uniquement la LED (petite boîte ~80x40) doit produire un zoom
      // bien plus élevé que cadrer toute la scène (qui inclurait le
      // RESISTOR à (3000,3000), forçant un zoom minimal ZOOM_MIN=0.5).
      expect(result.current.viewport.zoom).toBeGreaterThan(0.5)
    })
  })

  // ==========================================================================
  // PRIMITIVE GÉNÉRIQUE DE CENTRAGE (D9)
  // ==========================================================================
  describe('Primitive générique de centrage (centerViewportOnRect / centerViewportOnPoint)', () => {
    it('centerViewportOnPoint centre le point Document donné au centre écran du canvas, zoom inchangé par défaut', () => {
      const { result } = renderWithCanvasSize(800, 600)
      _result = result
      act(() => { result.current.centerViewportOnPoint({ x: 150, y: 75 }) })
      const { translateX, translateY, zoom } = result.current.viewport
      expect(zoom).toBe(1)
      expect(translateX).toBeCloseTo(400 - 150 * zoom, 5)
      expect(translateY).toBeCloseTo(300 - 75 * zoom, 5)
    })
  })

  // ==========================================================================
  // GARDE I-M1 : le pan exclut mutuellement les autres interactions pointeur
  // ==========================================================================
  describe('I-M1 — une seule interaction pointer active à la fois', () => {
    it('un pan actif empêche le démarrage d\'un drag de composant', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]

      middlePointerDown(0, 0)
      leftPointerDown(component.x + 10, component.y + 10, component.uid)
      pointerMove(component.x + 10 + 500, component.y + 10)
      pointerUp()

      // Le pan a consommé l'unique geste : le composant n'a pas bougé via un
      // drag concurrent (le pan lui-même ne mute jamais le Document).
      const after = result.current.components.find((c) => c.uid === component.uid)
      expect(after.x).toBe(component.x)
      expect(after.y).toBe(component.y)
    })

    it('un drag de composant actif empêche le démarrage d\'un pan', () => {
      const { result } = renderWithCanvasSize()
      _result = result
      act(() => { result.current.addComponent('LED', 100, 100) })
      const component = result.current.components[0]

      leftPointerDown(component.x + 10, component.y + 10, component.uid)
      middlePointerDown(component.x + 10, component.y + 10)
      pointerMove(component.x + 10 + 60, component.y + 10)
      pointerUp()

      // Le drag (déjà actif) a consommé le geste : la translation n'a pas
      // bougé (le pan n'a jamais démarré, panSessionRef gardé par I-M1).
      expect(result.current.viewport.translateX).toBe(0)
      expect(result.current.viewport.translateY).toBe(0)
      const after = result.current.components.find((c) => c.uid === component.uid)
      expect(after.x).toBe(component.x + 60)
    })
  })
})
