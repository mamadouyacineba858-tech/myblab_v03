import { useCallback, useRef } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { GridBackground } from "./GridBackground.jsx"
import { Breadboard } from "./Breadboard.jsx"
import { BreadboardWireEndpoints } from "./BreadboardWireEndpoints.jsx"
import { CircuitComponent } from "./CircuitComponent.jsx"
import { WiresLayer } from "../wires/WiresLayer.jsx"
import { BreadboardWiresLayer } from "../wires/BreadboardWiresLayer.jsx"
import { MarqueeOverlay } from "./MarqueeOverlay.jsx"
import { GRID_SIZE } from "../utils/grid.js"
import "./SimulationCanvas.css"
import { useKeyboardSystem } from "../keyboard/useKeyboardSystem.js"

export function SimulationCanvas() {
  const {
    components, breadboard, breadboardFeedback, breadboardInsertPreview, wirePaths, isWiringActive, cancelWiring, addComponent,
    canvasRef, zoom, showGrid,
    activeItem, clearSelection,
    startMarquee,
    marqueeRect,
    updateSidebarComponentDragPosition,
    endSidebarComponentDrag,
  } = useCircuit()

  const isMarqueeActiveRef = useRef(false)

  useKeyboardSystem()

  const setRef = useCallback((node) => {
    if (canvasRef) canvasRef.current = node
  }, [canvasRef])

  const handleCanvasPointerDown = useCallback((e) => {
    const target = e.target
    const isCanvasBackground =
      target === canvasRef?.current ||
      target?.classList?.contains('simulation-canvas') ||
      target?.closest?.('.simulation-canvas') === canvasRef?.current

    if (!isCanvasBackground) return
    if (e.target?.closest?.('.circuit-component')) return
    if (e.target?.closest?.('.breadboard')) return
    if (e.target?.closest?.('.breadboard-wire-endpoints')) return
    if (isWiringActive) return

    isMarqueeActiveRef.current = true
    startMarquee(e)
  }, [canvasRef, isWiringActive, startMarquee])

  const handleCanvasClick = useCallback(() => {
    if (isMarqueeActiveRef.current) {
      isMarqueeActiveRef.current = false
      return
    }

    if (isWiringActive) {
      cancelWiring()
      return
    }
    if (activeItem) {
      clearSelection()
    }
  }, [isWiringActive, cancelWiring, activeItem, clearSelection])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("application/myblab-component")
    endSidebarComponentDrag()
    if (!type) return
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / zoom - GRID_SIZE * 2
    const y = (e.clientY - rect.top) / zoom - GRID_SIZE
    addComponent(type, x, y)
  }, [canvasRef, addComponent, zoom, endSidebarComponentDrag])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    updateSidebarComponentDragPosition(e.clientX, e.clientY)
  }, [updateSidebarComponentDragPosition])

  const handleDragLeave = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    endSidebarComponentDrag()
  }, [endSidebarComponentDrag])

  const hasComponents = components.length > 0

  return (
    <div
      ref={setRef}
      className="simulation-canvas"
      onPointerDown={handleCanvasPointerDown}
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="simulation-canvas__zoom-layer" style={{ transform: `scale(${zoom})` }}>
        {showGrid && <GridBackground />}
        <Breadboard
          breadboard={breadboard}
          components={components}
          breadboardFeedback={breadboardFeedback}
          breadboardInsertPreview={breadboardInsertPreview}
        />
        <WiresLayer wirePaths={wirePaths} />
        <BreadboardWiresLayer />
        <BreadboardWireEndpoints breadboard={breadboard} />
        <div className="simulation-canvas__components">
          {components.map((comp) => (
            <CircuitComponent key={comp.uid} component={comp} />
          ))}
        </div>
        <MarqueeOverlay rect={marqueeRect} />
      </div>
      {!hasComponents && (
        <p className="simulation-canvas__hint">
          Glissez un composant depuis la barre latérale ou cliquez pour l&apos;ajouter au centre
        </p>
      )}
    </div>
  )
}
