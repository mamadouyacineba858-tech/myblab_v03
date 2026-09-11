// MB-VIS-CANVAS-052 (correction disclosed, même raison que CircuitComponent.jsx/
// WiresLayer.jsx/Breadboard.jsx) : import React explicite requis par la config
// vitest secondaire (frontend/src/simulator/vitest.config.ts, sans
// @vitejs/plugin-react) pour tout fichier .jsx rendu sous cette config.
// SimulationCanvas.jsx n'avait jamais été rendu directement sous cette config
// avant les tests de molette scopée au focus ajoutés par ce ticket
// (ComponentFocusLocalZoom.integration.test.jsx). Aucun changement de
// comportement : ajout d'import pur.
import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { resolveComponentBreadboardAssociation } from "../utils/breadboardAssociation.js"
import { GridBackground } from "./GridBackground.jsx"
import { Breadboard } from "./Breadboard.jsx"
import { BreadboardWireEndpoints } from "./BreadboardWireEndpoints.jsx"
import { CircuitComponent } from "./CircuitComponent.jsx"
import { ComponentInsertGhost } from "./ComponentInsertGhost.jsx"
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
    components, breadboardsForRender, breadboardFeedback, breadboardInsertPreview,
    wirePaths, viewport, marqueeRect, localScale,
  } = useCircuitInteraction()

  // FT-C-BREAD-MULTI-001-D : collection preview-aware, jamais un singleton.
  const renderedBreadboards = useMemo(
    () => (Array.isArray(breadboardsForRender) ? breadboardsForRender : []),
    [breadboardsForRender]
  )

  // FT-C-BREAD-MULTI-001-D : owner mécanique D1 de CHAQUE composant, dérivé de
  // `componentsForRender` (aperçu-aware) + `breadboardsForRender` (aperçu-aware)
  // — cohérent pendant un drag de breadboard comme de composant. Aucun stockage
  // de `component.breadboardId` ; aucune nouvelle règle physique (réutilise D1).
  // Map<uid, breadboardEntry|null> mémoïsée : recalcul uniquement quand la liste
  // des composants (aperçu inclus) ou celle des breadboards change.
  const ownerBreadboardByUid = useMemo(() => {
    const map = new Map()
    for (const comp of components) {
      const assoc = resolveComponentBreadboardAssociation({
        breadboards: renderedBreadboards,
        componentType: comp.type,
        position: { x: comp.x, y: comp.y },
        mode: "ownership",
      })
      map.set(comp.uid, assoc.breadboard || null)
    }
    return map
  }, [components, renderedBreadboards])

  // FT-C-BREAD-MULTI-001-D : feedback scopé par carte. Le hook expose
  // `breadboardFeedback` sous forme Map<breadboardId, { draggedIds, valid }>
  // (ou null) ; chaque <Breadboard> ne reçoit QUE le sien.
  const feedbackByBreadboardId = breadboardFeedback instanceof Map ? breadboardFeedback : null

  // MB-VIS-BREAD-042 (§4/§12, Phase C) : ghost physique du composant en
  // cours de drag Sidebar — dérivé du MÊME `breadboardInsertPreview` que les
  // trous verts/rouges de <Breadboard> (aucun second état, INV-042-03).
  // `breadboard` transmis au ghost est l'entrée `renderedBreadboards` (donc
  // déjà preview-aware si un drag de breadboard était concurrent — jamais le
  // cas en pratique, deux gestes mutuellement exclusifs) correspondant à
  // `breadboardId`, nécessaire pour que AssemblyLeadsLayer positionne les
  // pattes exactement comme elles le seraient une fois le composant posé.
  const insertGhost = useMemo(() => {
    if (!breadboardInsertPreview || !breadboardInsertPreview.type || !breadboardInsertPreview.position) {
      return null
    }
    const owner = renderedBreadboards.find((bb) => bb.id === breadboardInsertPreview.breadboardId) ?? null
    return {
      type: breadboardInsertPreview.type,
      position: breadboardInsertPreview.position,
      valid: breadboardInsertPreview.valid,
      breadboard: owner,
    }
  }, [breadboardInsertPreview, renderedBreadboards])

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
  // MB-VIS-CANVAS-052 (D3 du Blueprint, corrigé — CSA NO-GO du relevé
  // initial) : la MÊME molette pilote l'échelle visuelle LOCALE du
  // composant focalisé UNIQUEMENT quand le pointeur est physiquement
  // au-dessus de ce composant (`e.target.closest('.circuit-component
  // [data-focused]')`, DOM réel — jamais une coordonnée recalculée à la
  // main). Première version livrée : la seule condition était
  // `focusedComponentId` (n'importe où sur le Canvas), ce qui empêchait
  // tout zoom global pendant qu'un composant restait focalisé — contraire
  // au contrat exact de l'Authority (« molette AU-DESSUS du composant
  // focalisé » / « la molette hors focus conserve son rôle de zoom
  // global »). Hors de cette zone précise — y compris avec un focus actif
  // — la molette conserve strictement son rôle de zoom global 050. Pas de
  // second listener, pas de second geste : un seul `if` avec `return`.
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
        // MB-VIS-CANVAS-052 (correctif CSA) : `e.target` est l'élément DOM
        // réel sous le pointeur au moment de l'événement wheel natif — la
        // même primitive que `closest('.circuit-component')` déjà utilisée
        // par handleCanvasPointerDown ci-dessus, jamais une seconde
        // géométrie/heuristique de survol. Le composant focalisé porte
        // `data-focused` (CircuitComponent.jsx) uniquement lui-même — un
        // survol d'un AUTRE composant, focalisé ou non, ne matche pas ce
        // sélecteur et retombe donc sur le zoom global ci-dessous.
        const overFocusedComponent = e.target?.closest?.('.circuit-component[data-focused]')
        if (overFocusedComponent) {
          adjustLocalScale(e.deltaY < 0 ? LOCAL_SCALE_STEP : -LOCAL_SCALE_STEP)
          return
        }
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
        {/* FT-C-BREAD-MULTI-001-D : N instances rendues dans l'ordre de
            breadboards[] (dernier = topmost, cohérent avec D1). Chaque
            <Breadboard> ne reçoit QUE son feedback / son aperçu d'insertion
            (scoping par breadboard.id — 001-C a déjà posé
            breadboardInsertPreview.breadboardId). */}
        {renderedBreadboards.map((bb) => (
          <Breadboard
            key={bb.id}
            breadboard={bb}
            components={components}
            breadboardFeedback={feedbackByBreadboardId ? feedbackByBreadboardId.get(bb.id) ?? null : null}
            breadboardInsertPreview={
              breadboardInsertPreview && breadboardInsertPreview.breadboardId === bb.id
                ? breadboardInsertPreview
                : null
            }
          />
        ))}
        <WiresLayer wirePaths={wirePaths} />
        <BreadboardWiresLayer />
        {renderedBreadboards.map((bb) => (
          <BreadboardWireEndpoints key={bb.id} breadboard={bb} />
        ))}
        <div className="simulation-canvas__components">
          {components.map((comp) => (
            <CircuitComponent
              key={comp.uid}
              component={comp}
              // FT-C-BREAD-MULTI-001-D : Assembly Geometry attachée à l'OWNER
              // MÉCANIQUE D1 du composant (résolu à partir des collections
              // aperçu-aware) — jamais toute la collection, jamais breadboards[0].
              // `null` si le composant n'appartient à aucune carte.
              breadboard={ownerBreadboardByUid.get(comp.uid) ?? null}
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
        {/* MB-VIS-BREAD-042 : rendu APRÈS les composants réels — le ghost
            reste visuellement au-dessus (ordre DOM, aucun z-index en
            compétition avec `focused` qui monte à 20, cf. CircuitComponent.jsx). */}
        {insertGhost && (
          <ComponentInsertGhost
            type={insertGhost.type}
            position={insertGhost.position}
            valid={insertGhost.valid}
            breadboard={insertGhost.breadboard}
          />
        )}
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
