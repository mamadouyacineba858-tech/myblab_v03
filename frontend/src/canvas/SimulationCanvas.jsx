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
    // MB-BREADBOARD-008 (O2/O5/O6) : aperçu de placement en direct pendant
    // un drag HTML5 natif depuis la Sidebar.
    updateSidebarComponentDragPosition,
    endSidebarComponentDrag,
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

    // MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§6) : ne pas démarrer de
    // marquee si on clique sur le breadboard — même garde que pour un
    // composant ci-dessus. Breadboard.jsx gère sa propre sélection/son
    // propre drag (handleMouseDown -> selectOnly + startBreadboardDrag) ;
    // sans cette garde, handleCanvasPointerDown démarrerait un marquee EN
    // PLUS (deux interactions pointer concurrentes), violant la garde I-M1
    // déjà appliquée côté useCircuitState.js.
    if (e.target?.closest?.('.breadboard')) return

    // MB-BREADBOARD-012 : l'overlay des trous possède sa propre interaction
    // de câblage ; le canvas ne doit donc pas démarrer de marquee ici.
    if (e.target?.closest?.('.breadboard-wire-endpoints')) return

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
    // MB-BREADBOARD-008 (O6) : nettoyage systématique de l'aperçu Sidebar au
    // drop réel, que `type` soit vide ou non (I-P10, aucun état fantôme).
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
    // MB-BREADBOARD-008 (O2/O5) : aperçu de placement en direct — voir
    // updateSidebarComponentDragPosition (useCircuitState.js) pour le détail
    // de la résolution (holeAt() via computeBreadboardPlacement(), unique
    // oracle, non dupliqué ici).
    updateSidebarComponentDragPosition(e.clientX, e.clientY)
  }, [updateSidebarComponentDragPosition])

  // MB-BREADBOARD-008 (O6, I-P10) : sortie du canvas pendant un drag Sidebar
  // en cours — nettoyer l'aperçu pour éviter un feedback fantôme figé sur
  // les derniers trous survolés. `e.currentTarget.contains(e.relatedTarget)`
  // ignore les dragleave "internes" (survol d'un enfant du canvas, ex. un
  // composant déjà posé) : seule une VRAIE sortie du canvas déclenche le
  // nettoyage.
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
