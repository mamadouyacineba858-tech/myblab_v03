import { useCallback, useEffect, useRef } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { GridBackground } from "./GridBackground.jsx"
import { Breadboard } from "./Breadboard.jsx"
import { BreadboardWireEndpoints } from "./BreadboardWireEndpoints.jsx"
import { CircuitComponent } from "./CircuitComponent.jsx"
import { WiresLayer } from "../wires/WiresLayer.jsx"
import { BreadboardWiresLayer } from "../wires/BreadboardWiresLayer.jsx"
import { MarqueeOverlay } from "./MarqueeOverlay.jsx"
import { GRID_SIZE } from "../utils/grid.js"
import { clientToCanvas } from "../utils/geometry.js"
import { LOCAL_SCALE_STEP } from "../utils/localScale.js"
import "./SimulationCanvas.css"
import { useKeyboardSystem } from "../keyboard/useKeyboardSystem.js"

export function SimulationCanvas() {
  const {
    isWiringActive, cancelWiring, addComponent,
    canvasRef, showGrid,
    activeItem, clearSelection,
    startMarquee,
    // MB-BREADBOARD-008 (O2/O5/O6) : aperçu de placement en direct pendant
    // un drag HTML5 natif depuis la Sidebar.
    updateSidebarComponentDragPosition,
    endSidebarComponentDrag,
    // MB-VIS-CANVAS-050 : pan (clic molette) et zoom orienté curseur (molette).
    startPan,
    zoomByFactorAtScreenPoint,
    // MB-VIS-CANVAS-052 : focus de composant (state stable, bas débit — voir
    // context/CircuitContext.jsx) et action de variation de l'échelle
    // locale (référence stable, appelée à haute fréquence par la molette
    // sans jamais changer elle-même, même précédent que
    // zoomByFactorAtScreenPoint ci-dessus).
    focusedComponentId,
    adjustLocalScale,
  } = useCircuit()

  // MB-VIS-CANVAS-051 : state haute fréquence — SimulationCanvas est la
  // racine du rendu Canvas, il doit re-rendre à chaque frame de drag/pan/
  // marquee (aucune régression attendue ici). L'isolation vient du fait que
  // ses enfants (CircuitComponent, via React.memo + stableValue inchangé)
  // n'ont, eux, plus besoin de re-rendre pour les composants non concernés.
  // MB-VIS-CANVAS-052 : `localScale` (nouveau) rejoint ce même state haute
  // fréquence — transmis en PROP à la SEULE instance CircuitComponent
  // focalisée ci-dessous, jamais lu par les autres (D6 du Blueprint 052).
  const {
    components, breadboard, breadboardFeedback, breadboardInsertPreview,
    wirePaths, viewport, marqueeRect, localScale,
  } = useCircuitInteraction()

  // Référence pour savoir si le marquee est actif
  const isMarqueeActiveRef = useRef(false)

  useKeyboardSystem()

  const setRef = useCallback((node) => {
    if (canvasRef) canvasRef.current = node
  }, [canvasRef])

  const handleCanvasPointerDown = useCallback((e) => {
    // MB-VIS-CANVAS-050 : pan — clic MOLETTE, n'importe où sur le Canvas
    // (composants inclus, comme dans la plupart des outils de CAO/design :
    // Figma, Blender), jamais concurrent du marquee (clic gauche) ni d'un
    // futur menu contextuel (clic droit, non utilisé aujourd'hui). Le
    // navigateur déclenche par défaut un « auto-scroll » sur le clic
    // molette — preventDefault() le supprime.
    if (e.button === 1) {
      e.preventDefault()
      startPan(e)
      return
    }

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
  }, [canvasRef, isWiringActive, startMarquee, startPan])

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
    // [MB-VIS-CANVAS-049/050] point de conversion centralisé unique
    // (clientToCanvas), partagé avec drag/marquee/waypoint/Breadboard —
    // plus de formule inline concurrente pour ce chemin. Intègre désormais
    // le pan (viewport.translateX/Y) en plus du zoom.
    const point = clientToCanvas(e, rect, viewport.zoom, viewport.translateX, viewport.translateY)
    const x = point.x - GRID_SIZE * 2
    const y = point.y - GRID_SIZE
    addComponent(type, x, y)
  }, [canvasRef, addComponent, viewport, endSidebarComponentDrag])

  // MB-VIS-CANVAS-050 (D4) : zoom orienté curseur — molette sur le Canvas.
  // `screenX`/`screenY` relatifs au coin haut-gauche du Canvas, même repère
  // que `clientToCanvas`. `deltaY < 0` (molette vers le haut/avant) zoome
  // avant, conforme à la convention usuelle des outils de CAO/design.
  //
  // MB-VIS-CANVAS-052 (D3 du Blueprint) : lorsqu'un composant est focalisé,
  // la MÊME molette pilote désormais l'échelle visuelle LOCALE de ce
  // composant (pas de second listener, pas de second geste) — hors focus,
  // elle conserve strictement son rôle de zoom global 050. Les deux restent
  // mutuellement exclusifs par construction (un seul `if` avec `return`,
  // jamais les deux appliqués au même événement).
  //
  // Attaché en listener NATIF (useEffect + addEventListener, jamais
  // `onWheel` JSX) avec `{ passive: false }` : React attache son propre
  // listener délégué pour `wheel` en mode passif, ce qui rend
  // `e.preventDefault()` inopérant (avertissement navigateur « Unable to
  // preventDefault inside passive event listener invocation », vérifié
  // empiriquement — sans quoi la molette zoome ET fait défiler la page sous
  // le Canvas). `zoomByFactorAtScreenPoint`/`adjustLocalScale` sont stables
  // (useCircuitState.js) : `focusedComponentId` (dépendance ci-dessous)
  // change à basse fréquence (Enter/Escape) — cet effect ne se réattache
  // donc jamais à chaque pas de molette, seulement à l'entrée/sortie de
  // focus (même raisonnement de fluidité que MB-VIS-CANVAS-051 §D3).
  useEffect(() => {
    const node = canvasRef?.current
    if (!node) return
    const handleWheel = (e) => {
      e.preventDefault()
      if (focusedComponentId) {
        adjustLocalScale(e.deltaY < 0 ? LOCAL_SCALE_STEP : -LOCAL_SCALE_STEP)
        return
      }
      const rect = node.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      zoomByFactorAtScreenPoint(screenX, screenY, factor)
    }
    node.addEventListener("wheel", handleWheel, { passive: false })
    return () => node.removeEventListener("wheel", handleWheel)
  }, [canvasRef, zoomByFactorAtScreenPoint, focusedComponentId, adjustLocalScale])

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
      {/* MB-VIS-CANVAS-050 (D2) : un seul point d'application du viewport —
          `translate(...) scale(...)` réalise `screen = translation +
          document * zoom` (les fonctions CSS s'appliquent de l'interne vers
          l'externe : scale d'abord, translate ensuite). Aucun objet enfant
          (composant, fil, breadboard) ne reçoit sa propre transformation
          indépendante (contrainte #5/#7). */}
      <div
        className="simulation-canvas__zoom-layer"
        style={{ transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.zoom})` }}
      >
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
            <CircuitComponent
              key={comp.uid}
              component={comp}
              // MB-VIS-CANVAS-052 : `focused`/`localScale` en PROPS, jamais
              // via un Context — pour les 119+ composants NON focalisés,
              // ces deux valeurs restent `false`/`1` à l'identique à chaque
              // pas de molette (égalité par valeur, `Object.is`), donc
              // React.memo les saute ; seule l'instance dont le uid
              // correspond à `focusedComponentId` reçoit une prop qui
              // change réellement (même mécanisme, déjà prouvé par
              // MB-VIS-CANVAS-051, que `component` pendant un drag).
              focused={comp.uid === focusedComponentId}
              localScale={comp.uid === focusedComponentId ? localScale : 1}
            />
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
