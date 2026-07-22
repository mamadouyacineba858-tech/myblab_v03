import { useCallback, useRef } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { GridBackground } from "./GridBackground.jsx"
import { CircuitComponent } from "./CircuitComponent.jsx"
import { WiresLayer } from "../wires/WiresLayer.jsx"
import { MarqueeOverlay } from "./MarqueeOverlay.jsx"
import { GRID_SIZE } from "../utils/grid.js"
import "./SimulationCanvas.css"
import { useKeyboardSystem } from "../keyboard/useKeyboardSystem.js"

export function SimulationCanvas() {
  const {
    components, wirePaths, isWiringActive, cancelWiring, addComponent,
    canvasRef, zoom, showGrid,
    activeItem, clearSelection,
    startMarquee,
    marqueeRect,
  } = useCircuit()

  // Référence pour savoir si le marquee est actif
  const isMarqueeActiveRef = useRef(false)

  useKeyboardSystem()

  const setRef = useCallback((node) => { 
    if (canvasRef) canvasRef.current = node 
  }, [canvasRef])

  const handleCanvasPointerDown = useCallback((e) => {
    // Vérifier que le clic est sur le fond du canvas
    const target = e.target
    const isCanvasBackground = 
      target === canvasRef?.current ||
      target?.classList?.contains('simulation-canvas') ||
      target?.closest?.('.simulation-canvas') === canvasRef?.current
    
    if (!isCanvasBackground) return
    
    // Ne pas démarrer de marquee si on clique sur un composant
    if (e.target?.closest?.('.circuit-component')) return
    
    // Ne pas démarrer de marquee si le câblage est actif
    if (isWiringActive) return
    
    // Démarrer le marquee
    isMarqueeActiveRef.current = true
    startMarquee(e)
  }, [canvasRef, isWiringActive, startMarquee])

 const handleCanvasClick = useCallback(() => {
    // Si un marquee vient de se terminer avec sélection, ignorer le clic
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
    if (!type) return
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / zoom - GRID_SIZE * 2
    const y = (e.clientY - rect.top) / zoom - GRID_SIZE
    addComponent(type, x, y)
  }, [canvasRef, addComponent, zoom])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const hasComponents = components.length > 0

  return (
    <div 
      ref={setRef} 
      className="simulation-canvas" 
      onPointerDown={handleCanvasPointerDown}
      onClick={handleCanvasClick}
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
    >
      <div className="simulation-canvas__zoom-layer" style={{ transform: `scale(${zoom})` }}>
        {showGrid && <GridBackground />}
        <WiresLayer wirePaths={wirePaths} />
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