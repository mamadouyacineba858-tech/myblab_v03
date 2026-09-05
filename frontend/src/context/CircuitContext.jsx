import React, { useMemo } from "react"
import { useCircuitState } from "../hooks/useCircuitState.js"
import { CircuitContext, CircuitInteractionContext } from "./CircuitContext.js"

/**
 * Fournit l'état circuit unifié
 * (composants, fils, câblage, drag, simulation).
 *
 * MB-ARDUINO-BRIDGE-001 (Blueprint §3) : `orchestrators` (optionnel) est le
 * container runtime Arduino (Map<uid, RuntimeOrchestrator>), possédé au
 * niveau application (App.jsx) et simplement relayé ici — ce fichier ne crée
 * ni RuntimeOrchestrator ni ArduinoSimulator, et ne possède aucun état
 * propre au sujet du runtime. Si omis (ex. tests existants ne fournissant
 * aucun prop), useCircuitState() applique son propre repli interne.
 *
 * MB-VIS-CANVAS-051 (Canvas Performance Isolation) : useCircuitState()
 * continue de renvoyer UN SEUL objet fusionné (aucun changement de forme —
 * non-régression pour tout test qui l'appelle directement via renderHook).
 * L'isolation se fait ICI, en aval : deux useMemo séparés, chacun avec son
 * propre tableau de dépendances restreint aux champs qu'il expose. Comme
 * chaque champ individuel de `state` (safeWires, pinSignals, selection,
 * les callbacks stables, etc.) garde sa PROPRE identité de useMemo/useCallback
 * dans useCircuitState.js (inchangée par ce ticket), `stableValue` ne change
 * de référence QUE si l'un de ces champs stables change réellement — même si
 * `state` lui-même (l'objet retourné par le hook) est reconstruit à chaque
 * frame d'un drag/pan/marquee (Blueprint D1/D2). `interactionValue` regroupe
 * à l'inverse exactement les champs haute fréquence identifiés par le
 * Blueprint (C1/C4/C5) : viewport, aperçus de drag/breadboard/marquee,
 * géométrie dérivée qui suit le preview.
 *
 * Les deux Provider sont imbriqués (interaction à l'intérieur) : un
 * changement de `stableValue` seul (rare) ne force pas la reconstruction de
 * `interactionValue`, et réciproquement — chaque Provider ne notifie que ses
 * propres consommateurs (React re-render un composant à chaque changement du
 * SEUL Context qu'il consomme réellement via useContext).
 */
export function CircuitProvider({ children, canvasRef, orchestrators }) {
  const state = useCircuitState(canvasRef, orchestrators)

  // MB-VIS-CANVAS-051 (D2 du Blueprint — state stable/Document) : Document,
  // sélection, simulation, actions. Aucun de ces champs n'est mis à jour
  // pendant un drag/pan/marquee — un consommateur qui ne lit QUE ce contexte
  // (CircuitComponent.jsx, Sidebar.jsx, Navbar.jsx, StatusBar.jsx,
  // SettingsPanel.jsx, useKeyboardSystem.js, Breadboard.jsx) ne re-rend donc
  // plus pendant ces interactions.
  const stableValue = useMemo(() => ({
    canvasRef: state.canvasRef,
    wires: state.wires,
    connectedPins: state.connectedPins,
    pinSignals: state.pinSignals,
    pendingPin: state.pendingPin,
    isWiringActive: state.isWiringActive,
    selection: state.selection,
    activeItem: state.activeItem,
    simulationActive: state.simulationActive,
    showGrid: state.showGrid,
    theme: state.theme,
    addComponent: state.addComponent,
    addWire: state.addWire,
    addBreadboard: state.addBreadboard,
    clearCircuit: state.clearCircuit,
    onPinClick: state.onPinClick,
    cancelWiring: state.cancelWiring,
    isPinPending: state.isPinPending,
    isPinConnected: state.isPinConnected,
    startSidebarComponentDrag: state.startSidebarComponentDrag,
    updateSidebarComponentDragPosition: state.updateSidebarComponentDragPosition,
    endSidebarComponentDrag: state.endSidebarComponentDrag,
    updateWireWaypoints: state.updateWireWaypoints,
    startWaypointDrag: state.startWaypointDrag,
    startDrag: state.startDrag,
    startBreadboardDrag: state.startBreadboardDrag,
    startSimulation: state.startSimulation,
    stopSimulation: state.stopSimulation,
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
    startPan: state.startPan,
    zoomAtScreenPoint: state.zoomAtScreenPoint,
    zoomByFactorAtScreenPoint: state.zoomByFactorAtScreenPoint,
    resetViewport: state.resetViewport,
    fitToContent: state.fitToContent,
    fitToSelection: state.fitToSelection,
    centerViewportOnRect: state.centerViewportOnRect,
    centerViewportOnPoint: state.centerViewportOnPoint,
    exportCircuit: state.exportCircuit,
    importCircuit: state.importCircuit,
    toggleGrid: state.toggleGrid,
    setThemeMode: state.setThemeMode,
    setButtonState: state.setButtonState,
    selectOnly: state.selectOnly,
    toggleLatchingButton: state.toggleLatchingButton,
    toggleSelection: state.toggleSelection,
    isSelected: state.isSelected,
    clearSelection: state.clearSelection,
    deleteSelection: state.deleteSelection,
    selectItem: state.selectItem,
    deselectWire: state.deselectWire,
    deleteSelectedWire: state.deleteSelectedWire,
    removeWire: state.removeWire,
    removeComponent: state.removeComponent,
    removeConnectedWires: state.removeConnectedWires,
    deleteComponent: state.deleteComponent,
    updateComponentPositions: state.updateComponentPositions,
    startMarquee: state.startMarquee,
    cancelMarquee: state.cancelMarquee,
    resetMarqueeClickFlag: state.resetMarqueeClickFlag,
    undo: state.undo,
    redo: state.redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    getUndoCount: state.getUndoCount,
  }), [
    state.canvasRef, state.wires, state.connectedPins, state.pinSignals,
    state.pendingPin, state.isWiringActive, state.selection, state.activeItem,
    state.simulationActive, state.showGrid, state.theme,
    state.addComponent, state.addWire, state.addBreadboard, state.clearCircuit,
    state.onPinClick, state.cancelWiring, state.isPinPending, state.isPinConnected,
    state.startSidebarComponentDrag, state.updateSidebarComponentDragPosition, state.endSidebarComponentDrag,
    state.updateWireWaypoints, state.startWaypointDrag,
    state.startDrag, state.startBreadboardDrag,
    state.startSimulation, state.stopSimulation,
    state.zoomIn, state.zoomOut, state.startPan, state.zoomAtScreenPoint, state.zoomByFactorAtScreenPoint,
    state.resetViewport, state.fitToContent, state.fitToSelection,
    state.centerViewportOnRect, state.centerViewportOnPoint,
    state.exportCircuit, state.importCircuit, state.toggleGrid, state.setThemeMode, state.setButtonState,
    state.selectOnly, state.toggleLatchingButton, state.toggleSelection, state.isSelected,
    state.clearSelection, state.deleteSelection,
    state.selectItem, state.deselectWire, state.deleteSelectedWire,
    state.removeWire, state.removeComponent, state.removeConnectedWires, state.deleteComponent,
    state.updateComponentPositions,
    state.startMarquee, state.cancelMarquee, state.resetMarqueeClickFlag,
    state.undo, state.redo, state.canUndo, state.canRedo, state.getUndoCount,
  ])

  // MB-VIS-CANVAS-051 (D2 du Blueprint — state haute fréquence) : viewport,
  // aperçus de drag/breadboard/marquee, géométrie dérivée qui suit le
  // preview. Seul SimulationCanvas.jsx (racine du rendu Canvas) et
  // WiresLayer.jsx (pour `viewport`, création de waypoint par clic) lisent ce
  // contexte — l'isolation attendue par le Ticket vient du fait qu'aucun
  // AUTRE consommateur (en particulier CircuitComponent.jsx, monté une fois
  // par composant du circuit) n'y souscrit.
  const interactionValue = useMemo(() => ({
    components: state.components,
    breadboard: state.breadboard,
    breadboardFeedback: state.breadboardFeedback,
    breadboardInsertPreview: state.breadboardInsertPreview,
    wirePaths: state.wirePaths,
    viewport: state.viewport,
    zoom: state.zoom,
    marqueeRect: state.marqueeRect,
  }), [
    state.components, state.breadboard, state.breadboardFeedback, state.breadboardInsertPreview,
    state.wirePaths, state.viewport, state.zoom, state.marqueeRect,
  ])

  return (
    <CircuitContext.Provider value={stableValue}>
      <CircuitInteractionContext.Provider value={interactionValue}>
        {children}
      </CircuitInteractionContext.Provider>
    </CircuitContext.Provider>
  )
}