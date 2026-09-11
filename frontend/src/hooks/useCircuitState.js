import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { snapToGrid, GRID_SIZE } from "../utils/grid.js"
// MB-BREADBOARD-003 (Blueprint §3) : snapping/validité de placement pendant le
// drag d'un composant. FT-C-BREAD-MULTI-001-C : le hook consomme désormais le
// resolver de placement MULTI-CANDIDAT (D1) — `computeMultiBreadboardPlacement`
// teste chaque breadboard de `breadboards[]` via `computeBreadboardPlacement`
// (breadboardPlacementAdapter.js, INCHANGÉE) et retourne UN gagnant. Preview et
// drop partagent cette primitive (I-C5).
import { computeMultiBreadboardPlacement } from "../utils/breadboardAssociation.js"
import { ReactDocumentMapper } from "../bridge/ReactDocumentMapper.js"
import { toEngineInput } from "../simulator/engineAdapter.js"
import {
  clientToCanvas,
  hasPositionsChanged,
  rectsOverlap,
  getWireBoundingBox,
  extractPointsFromPathData
} from "../utils/geometry.js"
import { normalizeComponent, normalizeWire } from "../utils/circuitModel.js"
// MB-VIS-CANVAS-050 : modèle de viewport (zoom + pan) et calcul de bounds de
// scène — fonctions pures, aucune duplication de la conversion screen→Document
// (clientToCanvas reste l'unique oracle, consommé PAR ces utilitaires).
import {
  createDefaultViewport,
  zoomViewportAtScreenPoint,
  centerOnRect,
  centerOnPoint,
  fitViewportToBounds,
} from "../utils/viewport.js"
import { computeSceneBounds } from "../utils/sceneBounds.js"
// MB-VIS-CANVAS-052 : focus de composant + échelle visuelle locale —
// présentation pure (jamais un second viewport, jamais une géométrie
// électrique). Constantes/clamp/formule de mise à l'échelle centralisées
// dans utils/localScale.js, même patron que clampZoom (utils/viewport.js).
import {
  LOCAL_SCALE_DEFAULT,
  clampLocalScale,
} from "../utils/localScale.js"
import {
  buildConnectedPinsSet,
  buildWirePaths,
  pinRefKey,
  wireAlreadyExists,
} from "../utils/circuitSelectors.js"
// MB-ARDUINO-BRIDGE-001 : remplace l'ancien appel direct au moteur nu
// (engine.js) par runSimulationWithRuntime (simulationRuntimeIntegration.js
// — seul point de composition Runtime ↔ Simulation, voir
// runtimeArchitecture.test.js). Ce fichier n'importe ni runtimeOrchestrator.js
// ni ArduinoSimulator.js : ces instances ne sont créées que lazily, à
// l'intérieur de simulationRuntimeIntegration.js.
import { runSimulationWithRuntime } from "../simulator/simulationRuntimeIntegration.js"
import { getSelectionKey, parseSelectionKey, promoteActiveItem } from "../utils/selection.js"
import { HistoryManager } from "../history/HistoryManager.js"
import { DeleteCommand } from "../history/commands/DeleteCommand.js"
import { ToggleLatchingButtonCommand } from "../history/commands/ToggleLatchingButtonCommand.js"
// MB-CF3-001 (amendement CSA-CF3-001-A) : canal de mutation cible
// (CommandBus -> Handler -> HistoryService).
// MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001) : étendu à ADD_WIRE.
// MB-VIS-005 (ruling CSA du 2026-08-21) : étendu à UPDATE_WIRE_WAYPOINTS.
// MB-CF3-003 (ruling CSA-CF3-003-MOVE-001 du 2026-08-22) : étendu à
// MOVE_COMPONENT — quatre commandes au total, et rien de plus (verrou
// cf1DocumentArchitecture.test.js).
import { Command } from "../core/command/Command.js"
import { CommandBus } from "../core/command/CommandBus.js"
import { CommandRegistry } from "../core/command/CommandRegistry.js"
import { AddComponentHandler } from "../core/handlers/component/AddComponentHandler.js"
import { AddWireHandler } from "../core/handlers/wire/AddWireHandler.js"
// MB-VIS-005 (ruling CSA — autorisation du 2026-08-21, "CSA RULING — MB-VIS-005
// / Command Registry") : troisième type autorisé sur ce canal, strictement
// limité à UPDATE_WIRE_WAYPOINTS. Voir
// frontend/src/bridge/tests/cf1DocumentArchitecture.test.js pour le verrou
// amendé en conséquence.
import { UpdateWireWaypointsHandler } from "../core/handlers/wire/UpdateWireWaypointsHandler.js"
// MB-CF3-003 (ruling CSA-CF3-003-MOVE-001, 2026-08-22 — traçable dans
// docs/pmo/tickets/MB-CF3-003.md §R) : quatrième et dernier type
// actuellement autorisé sur ce canal — déplacement d'un ou plusieurs
// composants, contrat canonique { moves: [...] }, toujours une seule
// commande conceptuelle. Remplace le canal legacy MoveCommand/HistoryManager
// pour le drag de production (MoveCommand.js n'est plus instancié ici, mais
// reste présent et testé séparément — MoveCommand.test.js).
import { MoveComponentHandler } from "../core/handlers/component/MoveComponentHandler.js"
import { AddBreadboardHandler } from "../core/handlers/breadboard/AddBreadboardHandler.js"
// MB-BREADBOARD-006 (CSA Ruling — Option B, §1/§7/§8, traçable dans
// docs/pmo/tickets/MB-BREADBOARD-006.md) : cinquième et sixième types
// autorisés sur ce canal — déplacement solidaire du breadboard (avec les
// composants insérés sur ses trous) et suppression du breadboard. Handlers
// dédiés (pas de réutilisation de MoveComponentHandler/RemoveComponentHandler,
// interdite par le Ruling §8). resolveSolidaryComponentIds() est la seule
// source de vérité pour la solidarité, consommée ici (aperçu de drag) ET par
// MoveBreadboardHandler (mutation réelle) — jamais recalculée différemment.
import { MoveBreadboardHandler } from "../core/handlers/breadboard/MoveBreadboardHandler.js"
import { DeleteBreadboardHandler } from "../core/handlers/breadboard/DeleteBreadboardHandler.js"
import { resolveSolidaryComponentIds } from "../core/handlers/breadboard/breadboardSolidarity.js"
import { normalizeDocumentBreadboards } from "../utils/normalizeDocumentBreadboards.js"
import {
  snapToBreadboardPitch,
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
} from "../utils/breadboardGeometry.js"
import { HistoryService } from "../core/history/HistoryService.js"
import { ValidationEngine } from "../core/validation/ValidationEngine.js"
import { createDefaultValidationRegistry } from "../core/validation/createValidationRegistry.js"

const EMPTY_MAP = new Map()

// FT-C-BREAD-MULTI-001-D : placement par défaut d'un nouveau breadboard ajouté
// depuis l'UI, décalé horizontalement selon le nombre de cartes déjà posées.
// Presentation only — aucune règle Core, aucune modification de holeAt/pitch.
const NEW_BREADBOARD_BASE_X = 108
const NEW_BREADBOARD_BASE_Y = 168
const NEW_BREADBOARD_OFFSET_X =
  (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + BREADBOARD_PITCH * 2 + 48

export function useCircuitState(canvasRef, injectedOrchestrators) {
  const [components, setComponents] = useState([])
  const [wires, setWires] = useState([])
  // MB-BREADBOARD-002 (Blueprint MB-BREADBOARD-001 §3/§8) : état React pour
  // document.breadboard (null | {id,position,layout}). Sans cet état, la
  // valeur posée par AddBreadboardHandler via applyDocument() ne survivrait
  // à aucun re-rendu (getDocument() la lirait, mais aucune source React ne
  // la conserverait entre deux dispatches) — c'est ce state, et sa lecture
  // par SimulationCanvas.jsx/Breadboard.jsx, qui rend le breadboard visible
  // à l'écran (Presentation, LOCK-08 : lecture seule, aucune logique de
  // connectivité propre).
  const [breadboard, setBreadboard] = useState(null)
  // FT-C-BREAD-MULTI-001-A : collection canonique multi-breadboard. `breadboard`
  // (ci-dessus) devient une PROJECTION TRANSITOIRE lecture seule
  // (`breadboards[0] ?? null`, dérivée par normalizeDocumentBreadboards) tant
  // que la Presentation / la connectivité / l'engine ne consomment pas encore
  // `breadboards[]` (FT-C-BREAD-MULTI-001-B / -D). Aucune logique de mutation
  // n'écrit `breadboard` directement à partir de cette unité : ADD/MOVE/DELETE
  // passent par les handlers qui muent `breadboards[]`.
  const [breadboards, setBreadboards] = useState([])
  const [pendingPin, setPendingPin] = useState(null)
  const [wireGesture, setWireGesture] = useState(null)
  const wireGestureRef = useRef(null)
  const suppressWireClickRef = useRef(false)

  const [selection, setSelection] = useState(new Set())
  const [activeItem, setActiveItem] = useState(null)

  const [simulationActive, setSimulationActive] = useState(false)
  // MB-VIS-CANVAS-050 : `viewport` remplace l'ancien état `zoom` isolé —
  // SEUL modèle de state pour zoom+pan (Décision CSA D1/D4, contrainte non
  // négociable #4 : « un seul modèle screen↔Document »). `zoom` reste exposé
  // plus bas dans la valeur de retour comme alias dérivé (`viewport.zoom`),
  // pour compatibilité avec tout consommateur existant (049) qui lit
  // `zoom` directement — ce n'est jamais une seconde source d'état.
  const [viewport, setViewport] = useState(createDefaultViewport)
  const [showGrid, setShowGrid] = useState(true)
  // MB-VIS-CANVAS-043 : défaut "light" (workspace Tinkercad-level) — le
  // mécanisme de thème lui-même (theme/setThemeMode, `.theme-${theme}` sur
  // myblab-root, App.jsx) est INCHANGÉ et préexistant ; seule la valeur
  // initiale change. "dark" reste entièrement disponible via le panneau
  // Réglages (SettingsPanel.jsx), zéro régression du thème sombre.
  const [theme, setTheme] = useState("light")

  // =========================================================================
  // MB-VIS-CANVAS-052 : focus de composant + échelle visuelle locale.
  // `focusedComponentId` (uid | null, au plus un composant) est un état de
  // PRÉSENTATION/NAVIGATION — jamais un champ du Document, jamais passé au
  // CommandBus/HistoryManager (Blueprint D1/D8). Change à basse fréquence
  // (Enter/Escape/suppression du composant focalisé uniquement) : exposé via
  // le state STABLE (CircuitContext.jsx), comme `selection`/`activeItem`
  // (Blueprint D6 : « Le focus ID peut être exposé via le state stable
  // puisqu'il ne varie pas à chaque pas de zoom local »).
  // `localScale` change à HAUTE fréquence (molette) : exposé via le state
  // haute fréquence (CircuitInteractionContext, MB-VIS-CANVAS-051), jamais
  // lu par CircuitComponent.jsx (qui le reçoit en PROP, uniquement pour
  // l'instance focalisée — voir SimulationCanvas.jsx) afin de ne jamais
  // réveiller les composants non focalisés à chaque pas de molette
  // (Blueprint D6, contrainte non négociable #12 de l'Authority).
  // =========================================================================
  const [focusedComponentId, setFocusedComponentId] = useState(null)
  const [localScale, setLocalScale] = useState(LOCAL_SCALE_DEFAULT)

  const dragSessionRef = useRef(null)
  const marqueeSessionRef = useRef(null)
  // MB-VIS-CANVAS-050 : session de pan — même patron que dragSessionRef/
  // marqueeSessionRef (ref, pas de state : aucun re-rendu requis pour la
  // session elle-même, seul `viewport` déclenche le re-rendu). Le pan ne
  // touche jamais le Document ni HistoryManager (contrainte #8) : la
  // translation vive EST l'état final, il n'y a pas de « preview vs commit »
  // distinct comme pour un drag de composant.
  const panSessionRef = useRef(null)
  const [marqueeRect, setMarqueeRect] = useState(null)
  const justFinishedMarqueeWithSelectionRef = useRef(false)

  // =========================================================================
  // MB-VIS-005 (Phase E) : session de déplacement d'un waypoint existant.
  // Même patron que dragSessionRef (composants) : la position est mise à
  // jour localement, en aperçu (waypointPreview), pendant le drag ; une
  // seule mutation CF3 (updateWireWaypoints) est dispatchée au relâchement,
  // uniquement si la position a réellement changé — jamais une mutation par
  // pixel. waypointPreview n'écrit jamais dans `wires` : il n'influence que
  // le calcul de géométrie (wirePaths), afin qu'aucun code Presentation ne
  // mute jamais le Document en dehors du canal CF3 (AC-03/AC-11).
  // =========================================================================
  const waypointDragSessionRef = useRef(null)
  const [waypointPreview, setWaypointPreview] = useState(null)

  // =========================================================================
  // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001, 2026-08-22 — traçable dans
  // docs/pmo/tickets/MB-CF3-003.md §R) : dragPreview, Presentation-only,
  // même patron que waypointPreview ci-dessus. Pendant un drag de
  // composant(s), la position affichée est un aperçu local
  // (Map<uid,{x,y}>) — JAMAIS une écriture dans `components`/le Document
  // réel. Le Document persistant (safeComponents, componentsRef,
  // documentApi.getDocument(), la simulation, exportCircuit) reste
  // inchangé pendant tout pointermove ; seule componentsForRender (dérivée
  // ci-dessous) reflète l'aperçu, pour le rendu visuel et la géométrie des
  // wires. Une seule mutation CF3 (MOVE_COMPONENT) est dispatchée au
  // relâchement (pointerup), uniquement si la position a réellement changé.
  // C'est cette séparation qui corrige à la racine le bug
  // oldPosition === newPosition (le Document réel n'est plus jamais
  // pré-muté avant dispatch).
  // =========================================================================
  const [dragPreview, setDragPreview] = useState(null)

  // =========================================================================
  // MB-BREADBOARD-003 (Blueprint §3) : breadboardFeedback, Presentation-only,
  // même patron que dragPreview ci-dessus. `null` en dehors d'un drag ;
  // sinon `{ draggedIds: Set<uid>, valid: boolean }` — uid des composants en
  // cours de drag actuellement "actifs" sur le breadboard (breadboardActive
  // du placement calculé), et validité globale (false si au moins un des
  // composants draggés en breadboardActive est invalide — collision ou pin
  // hors trou). Consommé par Breadboard.jsx (nouveau prop) pour colorer en
  // vert/rouge les trous candidats du composant en cours de déplacement
  // (AC-08/AC-09). Nettoyé systématiquement dans handlePointerUp/
  // handlePointerCancel/handleBlur, même garde I-P10 que dragPreview.
  // =========================================================================
  const [breadboardFeedback, setBreadboardFeedback] = useState(null)

  // =========================================================================
  // MB-BREADBOARD-008 (CSA GO — "Native Breadboard Component Insertion",
  // O1-O7) : aperçu de placement EN DIRECT pendant un drag HTML5 natif
  // depuis la Sidebar (dragstart/dragover/drop — Sidebar.jsx/
  // SimulationCanvas.jsx), pour un composant qui N'EXISTE PAS ENCORE dans le
  // Document (aucun uid). Volontairement séparé de dragSessionRef/
  // dragPreview/breadboardFeedback ci-dessus (réservés au déplacement d'un
  // composant DÉJÀ présent, MB-BREADBOARD-003/MB-CF3-003, non modifiés par
  // ce ticket — deux systèmes d'événements distincts : pointerdown/move/up
  // pour le premier, dragstart/dragover/drop natif du navigateur pour
  // celui-ci, qui ne se déclenchent jamais simultanément).
  //
  // sidebarDragRef (ref, pas de state — inutile de re-rendre à chaque
  // frame) ne mémorise QUE le type en cours de drag. Il n'est JAMAIS lu via
  // event.dataTransfer.getData() pendant un dragover : la spécification
  // HTML5 Drag and Drop restreint la lecture de getData() aux événements
  // dragstart/drop (protection anti-fingerprinting) — un getData() pendant
  // dragover renvoie une chaîne vide dans la plupart des navigateurs.
  // Sidebar.jsx pousse donc le type explicitement au dragstart
  // (startSidebarComponentDrag), lu ici en synchrone à chaque dragover.
  const sidebarDragRef = useRef(null)

  // { holes: Array<{column:number,row:number}>, valid: boolean } | null.
  // Contrairement à breadboardFeedback (qui identifie les trous concernés
  // INDIRECTEMENT via occupiedBy + draggedIds, puisque le composant déplacé
  // existe déjà dans components[]/componentsForRender), ce nouvel état
  // porte DIRECTEMENT la liste des trous à mettre en évidence — seule
  // représentation possible ici, puisqu'aucun composant/uid n'existe encore
  // pour ce drag. Consommé par un nouveau prop dédié de Breadboard.jsx
  // (breadboardInsertPreview), strictement additif au rendu existant :
  // aucune modification de la logique de breadboardFeedback/occupiedBy.
  const [breadboardInsertPreview, setBreadboardInsertPreview] = useState(null)

  // MB-BREADBOARD-008 (O1) : détection d'entrée en mode "drag Sidebar" —
  // appelé depuis Sidebar.jsx au dragstart. Garde défensive symétrique à
  // addComponent (type inconnu -> no-op).
  const startSidebarComponentDrag = useCallback((type) => {
    if (!getComponentDef(type)) return
    sidebarDragRef.current = { type }
    setBreadboardInsertPreview(null)
  }, [])

  // MB-BREADBOARD-008 (O2/O3/O5) : appelé depuis SimulationCanvas.jsx à
  // chaque dragover. Résout la position candidate via computeBreadboardPlacement()
  // — même unique oracle (holeAt(), via breadboardPlacementAdapter.js,
  // aucune réimplémentation de géométrie ici, R1/R7 du CSA) — et publie
  // uniquement les trous concernés + la validité globale, pour un rendu
  // vert/rouge par Breadboard.jsx (O5). `clientX`/`clientY` sont convertis
  // en coordonnées Document via `clientToCanvas()` — [MB-VIS-CANVAS-049]
  // même point de conversion centralisé que toutes les autres interactions
  // pointeur (drag, marquee, waypoint, Breadboard), plutôt qu'une seconde
  // formule inline concurrente — puis recentrées (offset `GRID_SIZE`) avec
  // EXACTEMENT la même logique que handleDrop() (SimulationCanvas.jsx) :
  // l'aperçu affiché doit correspondre à la position où le composant
  // atterrira réellement au relâchement, sous peine d'un feedback trompeur.
  const updateSidebarComponentDragPosition = useCallback((clientX, clientY) => {
    const session = sidebarDragRef.current
    if (!session || !canvasRef?.current) {
      setBreadboardInsertPreview(null)
      return
    }
    // FT-C-BREAD-MULTI-001-C : résolution du breadboard cible par le resolver
    // multi-candidat D1 (computeMultiBreadboardPlacement) — plus la projection
    // singleton. `breadboardsRef` a ≤1 entrée tant que 001-D n'a pas ouvert
    // l'ajout de N breadboards : comportement identique dans ce cas.
    const currentBreadboards = breadboardsRef.current
    if (!Array.isArray(currentBreadboards) || currentBreadboards.length === 0) {
      setBreadboardInsertPreview(null)
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    // MB-VIS-CANVAS-051 (D3) : lecture via viewportRef (jamais `viewport`
    // directement) — cette fonction est appelée à chaque `dragover` HTML5
    // natif (potentiellement aussi fréquent qu'un pointermove) ; dépendre de
    // `viewport` lui ferait changer d'identité à chaque pixel de pan, sans
    // aucun bénéfice puisque seule la valeur AU MOMENT DE L'APPEL compte ici
    // (aucune closure de longue durée, contrairement au gros effect
    // pointermove qui, lui, a un besoin réel de stabilité de listener).
    const point = clientToCanvas({ clientX, clientY }, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)
    const x = point.x - GRID_SIZE * 2
    const y = point.y - GRID_SIZE
    const placement = computeMultiBreadboardPlacement(currentBreadboards, session.type, { x, y }, componentsRef.current)
    if (!placement.breadboardActive) {
      setBreadboardInsertPreview(null)
      return
    }
    const holes = placement.holes
      .filter((h) => h.column !== null && h.row !== null)
      .map((h) => ({ column: h.column, row: h.row }))
    // FT-C-BREAD-MULTI-001-C (§20) : `breadboardId` du breadboard gagnant —
    // métadonnée pour que 001-D scope le feedback à la bonne instance ; le
    // preview et le drop partagent ce même resolver (I-C5).
    // MB-VIS-BREAD-042 (§4/§13 INV-042-02/03) : `type`/`position` rejoignent
    // le contrat, strictement additifs (aucun consommateur existant ne lit
    // au-delà de `breadboardId`/`holes`/`valid` — voir Breadboard.jsx/
    // BreadboardInsertionMutationChannel.integration.test.jsx). `position`
    // est EXACTEMENT `placement.position` (même sortie de
    // computeMultiBreadboardPlacement que celle réappliquée par addComponent()
    // au drop, ADD-COMPONENT-008/842 — aucun second calcul), pour que le
    // ghost affiché consomme la même vérité de placement que le drop final.
    setBreadboardInsertPreview({
      breadboardId: placement.breadboardId,
      type: session.type,
      position: placement.position,
      holes,
      valid: placement.valid,
    })
  }, [canvasRef])

  // MB-BREADBOARD-008 (I-P10, même garde que dragPreview/breadboardFeedback
  // existants) : nettoyage systématique — appelé au drop réel
  // (SimulationCanvas.jsx handleDrop), à la sortie du canvas (dragleave) et
  // à la fin du drag quelle qu'en soit l'issue (Sidebar.jsx dragend), pour
  // n'y laisser JAMAIS d'état fantôme (O6).
  const endSidebarComponentDrag = useCallback(() => {
    sidebarDragRef.current = null
    setBreadboardInsertPreview(null)
  }, [])
  // =========================================================================
  // FIN MB-BREADBOARD-008 (aperçu de drag Sidebar)
  // =========================================================================

  // =========================================================================
  // MB-004.3 : Historique (infrastructure uniquement)
  // =========================================================================

  const historyManagerRef = useRef(new HistoryManager(50))
  // MB-CF3-001 (GATE 3/4) : assigné plus bas, une fois documentApi prêt (même
  // instance de historyManagerRef.current — cf. commandBusRef ci-dessous).
  const historyServiceRef = useRef(null)

  // =========================================================================
  // MB-ARDUINO-BRIDGE-001 (Blueprint §3/§4) : container runtime Arduino
  // =========================================================================
  // `orchestrators` est un Map<uid, RuntimeOrchestrator>, volatile, jamais
  // historisé, jamais sérialisé avec le Document (§14 du Blueprint). Sa
  // possession normale (architecture approuvée) est au niveau application
  // (App.jsx → CircuitProvider → ici, via `injectedOrchestrators`) — ce hook
  // ne crée alors qu'une référence, jamais l'objet lui-même. `ownOrchestratorsFallback`
  // n'est qu'un repli pour les appelants qui n'injectent rien (tests,
  // compatibilité ascendante avec les nombreux `<CircuitProvider>` existants
  // sans prop `orchestrators`) : il ne crée qu'un Map vide, jamais un
  // RuntimeOrchestrator ni un ArduinoSimulator — ces instances ne sont créées
  // que lazily par simulationRuntimeIntegration.js (AC-02). useState (et non
  // useRef) : sa valeur est lue pendant le rendu, ce qui est interdit pour un
  // ref (règle react-hooks/refs — même correction déjà appliquée plus bas
  // dans ce fichier pour commandBusRef/historyServiceRef) ; l'initialisation
  // paresseuse garantit que `new Map()` n'est construit qu'une seule fois.
  const [ownOrchestratorsFallback] = useState(() => new Map())
  const orchestrators = injectedOrchestrators instanceof Map ? injectedOrchestrators : ownOrchestratorsFallback
  // =========================================================================
  // FIN MB-ARDUINO-BRIDGE-001 (container)
  // =========================================================================

  const undo = useCallback(() => {
    // MB-CF3-001 : délègue à HistoryService (et non plus à HistoryManager
    // directement) pour que les commandes issues du canal CommandBus
    // (AdaptedHistoryCommand) réappliquent correctement leur document au
    // documentApi lors d'un undo — comportement déjà prouvé par
    // AddComponentHandler.test.js (« should support undo/redo through the
    // real HistoryManager »). Les commandes legacy (MoveCommand/DeleteCommand/
    // ToggleLatchingButtonCommand) s'auto-appliquent toujours via
    // HistoryManager.undo() en interne — HistoryService ne fait qu'envelopper
    // cet appel, sans changer leur comportement.
    return historyServiceRef.current.undo()
  }, [])

  const redo = useCallback(() => {
    return historyServiceRef.current.redo()
  }, [])

  const canUndo = useCallback(() => {
    return historyManagerRef.current.canUndo()
  }, [])

  const canRedo = useCallback(() => {
    return historyManagerRef.current.canRedo()
  }, [])
const getUndoCount = useCallback(() => {
  return historyManagerRef.current.getUndoCount()
}, [])
  // =========================================================================
  // FIN MB-004.3
  // =========================================================================

  const safeComponents = useMemo(() => components.map(normalizeComponent).filter((c) => c !== null), [components])
  const safeWires = useMemo(() => wires.map(normalizeWire).filter((w) => w !== null), [wires])

  // MB-VIS-005 (Phase E) : pendant un drag de waypoint, la géométrie rendue
  // doit refléter la position en cours SANS que `wires`/le Document ne soit
  // muté (AC-03/AC-11 — seul updateWireWaypoints(), au relâchement, passe
  // par CF3). wiresForGeometry substitue localement les waypoints du seul
  // wire en cours de drag pour le calcul de tracé ; safeWires (donc le
  // Document réel) reste inchangé jusqu'au commit.
  const wiresForGeometry = useMemo(() => {
    if (!waypointPreview) return safeWires
    return safeWires.map((w) =>
      w.id === waypointPreview.wireId ? { ...w, waypoints: waypointPreview.waypoints } : w
    )
  }, [safeWires, waypointPreview])

  // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001) : componentsForRender superpose
  // dragPreview à safeComponents UNIQUEMENT pour le rendu visuel et la
  // géométrie des wires (wirePaths ci-dessous, et le `components` renvoyé en
  // bas de ce hook). Tous les autres consommateurs (componentsRef,
  // documentApi.getDocument/applyDocument, pinSignals/simulation,
  // exportCircuit, startDrag, deleteSelection, endMarquee,
  // toggleLatchingButton) continuent d'utiliser safeComponents/components
  // (état réel) directement — jamais componentsForRender. Confirmé par audit
  // de code (Phase 1, MB-CF3-003) : aucun autre point de lecture n'a besoin
  // de basculer.
  const componentsForRender = useMemo(() => {
    if (!dragPreview || dragPreview.size === 0) return safeComponents
    return safeComponents.map((c) => {
      const preview = dragPreview.get(c.uid)
      return preview ? { ...c, x: preview.x, y: preview.y } : c
    })
  }, [safeComponents, dragPreview])

  // MB-BREADBOARD-006 (CSA Ruling — Option B, §6/§11) : même patron que
  // componentsForRender ci-dessus, pour le breadboard lui-même — le MÊME
  // dragPreview (Map<uid|breadboardId,{x,y}>) est réutilisé sans aucune
  // seconde structure d'aperçu (§6 du Ruling : « réutiliser le dragPreview
  // existant »). Pendant un drag de breadboard, startBreadboardDrag() insère
  // à la fois l'entrée du breadboard (clé breadboard.id) ET celles de ses
  // composants solidaires (clé uid) dans ce même Map — componentsForRender
  // ci-dessus reflète donc déjà, sans aucune modification, l'aperçu des
  // composants solidaires. `breadboard` (état réel, non l'aperçu) reste
  // inchangé pendant tout pointermove — seul breadboardForRender en tient
  // compte, exactement comme pour componentsForRender/safeComponents.
  const breadboardForRender = useMemo(() => {
    if (!breadboard || !dragPreview) return breadboard
    const preview = dragPreview.get(breadboard.id)
    return preview ? { ...breadboard, position: { x: preview.x, y: preview.y } } : breadboard
  }, [breadboard, dragPreview])

  // FT-C-BREAD-MULTI-001-D : projection preview-aware de la COLLECTION
  // canonique. Chaque entrée déplacée pendant un drag de breadboard prend sa
  // position d'aperçu (dragPreview keyé par breadboard.id — même Map que les
  // composants solidaires, MB-BREADBOARD-006) ; les entrées non déplacées
  // conservent leur référence exacte (aucun re-render inutile). Le Document
  // réel n'est jamais muté pendant pointermove.
  const breadboardsForRender = useMemo(() => {
    if (!dragPreview || dragPreview.size === 0) return breadboards
    let changed = false
    const next = breadboards.map((bb) => {
      const preview = dragPreview.get(bb.id)
      if (!preview) return bb
      changed = true
      return { ...bb, position: { x: preview.x, y: preview.y } }
    })
    return changed ? next : breadboards
  }, [breadboards, dragPreview])

  // MB-VIS-004 : buildWirePaths ne prend plus selectedWireId (géométrie pure,
  // cf. circuitSelectors.js) — la sélection est désormais lue directement par
  // WiresLayer.jsx via isSelected(), sans variable dérivée intermédiaire ici.
  // MB-CF3-003 : componentsForRender (et non plus safeComponents) alimente la
  // géométrie visuelle des wires, afin que les wires suivent visuellement
  // l'aperçu de drag — le Document réel (safeComponents) n'est pas concerné.
  // MB-VIS-CANVAS-052 : `focusInfo` propage l'échelle visuelle locale du
  // SEUL composant focalisé jusqu'à l'extrémité de fil dessinée
  // (buildWirePaths -> getPinPresentationPosition), afin qu'elle reste
  // synchronisée avec le `transform: scale()` CSS appliqué par
  // CircuitComponent.jsx sur ce même composant (Blueprint D5/E). `null` en
  // dehors de tout focus — comportement 2-arguments strictement inchangé.
  const focusInfo = useMemo(
    () => (focusedComponentId ? { uid: focusedComponentId, scale: localScale } : null),
    [focusedComponentId, localScale]
  )
  const wirePaths = useMemo(() => buildWirePaths(componentsForRender, wiresForGeometry, focusInfo), [componentsForRender, wiresForGeometry, focusInfo])
  const connectedPins = useMemo(() => buildConnectedPinsSet(safeWires), [safeWires])

  const pinSignals = useMemo(() => {
  if (!simulationActive) return EMPTY_MAP
  try {
    // 1. Convertir React → Core Document
    // MB-BREADBOARD-003 [correction disclosed, voir Delivery Report §Déviations] :
    // `breadboard` était absent de ce coreDoc construit localement (à la
    // différence de documentApi.getDocument(), qui l'inclut depuis
    // MB-BREADBOARD-002). Conséquence : toEngineInput() ne recevait jamais
    // de breadboard ici, donc deriveBreadboardVirtualWiresBridge() ne
    // produisait jamais aucune arête — la connectivité breadboard était
    // invisible à la simulation LIVE (pinSignals), bien que
    // breadboardSimulationIntegration.test.js (MB-BREADBOARD-002) l'ait déjà
    // prouvée correcte sur un Document construit à la main, hors du hook.
    // Découvert via BreadboardInsertionMutationChannel.integration.test.jsx
    // (TEST 1), qui exerce pour la première fois ce chemin de bout en bout.
    // FT-C-BREAD-MULTI-001-B : la couche électrique consomme la collection
    // canonique `breadboards[]` (deriveBreadboardVirtualWires itère tous les
    // breadboards, groupes namespacés par id) — plus la projection transitoire
    // `breadboard`.
    const coreDoc = ReactDocumentMapper.toCore({
      components: safeComponents,
      wires: safeWires,
      breadboards,
    });

    // 2. Adapter le Document Core vers le format attendu par engine.js
const adapted = toEngineInput(coreDoc);
    
    // 3. Appeler le moteur avec les données adaptées
    // MB-ARDUINO-BRIDGE-001 : runSimulationWithRuntime délègue intégralement
    // au chemin historique du moteur nu (GATE 0, non-régression prouvée par
    // simulationRuntimeIntegration.test.js) tant qu'aucun composant ARDUINO
    // n'est présent — même résultat, même cadence de recalcul qu'avant ce
    // ticket. `orchestrators` est passé tel quel (jamais recréé ici) afin
    // que l'état runtime (pinOutputs, PWM) survive aux recalculs successifs
    // de ce useMemo (§16 du Blueprint).

    const result = runSimulationWithRuntime(adapted.components, adapted.wires, { orchestrators }) ?? EMPTY_MAP

    return result
  } catch (error) {
    console.error("MYBlab simulation error:", error)
    return EMPTY_MAP
  }
}, [safeComponents, safeWires, breadboards, simulationActive, orchestrators])

  const isWiringActive = pendingPin !== null || wireGesture !== null

  // =========================================================================
  // MB-004.5 : Référence synchrone pour aƒéiter la stale closure
  // =========================================================================

  const componentsRef = useRef(safeComponents)
  useEffect(() => {
    componentsRef.current = safeComponents
  }, [safeComponents])

  // MB-CF3-001 : référence synchrone équivalente pour les wires, nécessaire
  // à documentApi.getDocument() (GATE 3 — canal de mutation cible).
  const wiresRef = useRef(safeWires)
  useEffect(() => {
    wiresRef.current = safeWires
  }, [safeWires])

  // MB-BREADBOARD-002 : référence synchrone équivalente pour breadboard,
  // même patron/motivation que componentsRef/wiresRef ci-dessus.
  const breadboardRef = useRef(breadboard)
  useEffect(() => {
    breadboardRef.current = breadboard
  }, [breadboard])

  // FT-C-BREAD-MULTI-001-A : référence synchrone pour la collection canonique
  // `breadboards[]` — lue par documentApi.getDocument() pour construire le
  // Document Core remis aux handlers ADD/MOVE/DELETE_BREADBOARD.
  const breadboardsRef = useRef(breadboards)
  useEffect(() => {
    breadboardsRef.current = breadboards
  }, [breadboards])

  // MB-VIS-CANVAS-050 : référence synchrone équivalente pour `viewport`,
  // consommée UNIQUEMENT par le gros effect pointermove/up/cancel/blur
  // ci-dessous. Contrairement à `zoom` (049 — changements discrets, quelques
  // fois par session via zoomIn/zoomOut), `viewport` change en continu à
  // chaque pixel pendant un pan actif : le lire depuis une ref plutôt que de
  // l'ajouter au tableau de dépendances de cet effect évite de désabonner/
  // réabonner les listeners `window` à chaque `pointermove` d'un pan (la
  // navigation doit « rester fluide », Ticket CANVAS-050 §Performances) —
  // sans réintroduire de stale closure, exactement le même raisonnement que
  // componentsRef/wiresRef/breadboardRef ci-dessus.
  const viewportRef = useRef(viewport)
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  // MB-VIS-CANVAS-051 : référence synchrone équivalente pour `wirePaths`,
  // consommée UNIQUEMENT par endMarquee ci-dessous. `wirePaths` change à
  // chaque frame d'un drag de composant/waypoint (D5 du Blueprint : la
  // géométrie des fils suit volontairement le preview) — sans cette ref,
  // endMarquee (qui n'en a besoin qu'au relâchement du marquee, jamais en
  // continu) devrait dépendre de `wirePaths` et changerait donc d'identité à
  // chaque pixel d'un drag, désabonnant/réabonnant inutilement les listeners
  // `window` du gros effect pointermove/up/cancel/blur (même raisonnement que
  // viewportRef pour le pan).
  const wirePathsRef = useRef(wirePaths)
  useEffect(() => {
    wirePathsRef.current = wirePaths
  }, [wirePaths])

  // =========================================================================
  // FIN MB-004.5
  // =========================================================================

  // =========================================================================
  // MB-ARDUINO-BRIDGE-001 (Blueprint §5/§17) : purge du container runtime.
  // Tout orchestrator dont l'UID Arduino n'existe plus parmi les composants
  // ARDUINO du Document courant est éliminé du container — aucun état
  // runtime d'un composant supprimé ne doit subsister indéfiniment. N'écrit
  // jamais dans components/wires/Document/HistoryManager : seul le container
  // runtime (Map, volatile) est affecté.
  // =========================================================================
  useEffect(() => {
    const liveArduinoUids = new Set(
      safeComponents.filter((c) => c.type === "ARDUINO").map((c) => c.uid)
    )
    for (const uid of Array.from(orchestrators.keys())) {
      if (!liveArduinoUids.has(uid)) orchestrators.delete(uid)
    }
  }, [safeComponents, orchestrators])

  // =========================================================================
  // MB-VIS-CANVAS-052 : un composant focalisé qui disparaît du Document
  // (suppression, Undo d'un ADD_COMPONENT, import d'un nouveau circuit) ne
  // doit jamais laisser `focusedComponentId` pointer vers un uid inexistant
  // (Blueprint G : « L'entrée en focus est autorisée uniquement pour un
  // composant existant »). N'écrit jamais dans components/wires/Document/
  // HistoryManager — purge purement défensive, même filet de sécurité que
  // la purge des orchestrators Arduino ci-dessus.
  // =========================================================================
  useEffect(() => {
    if (focusedComponentId && !safeComponents.some((c) => c.uid === focusedComponentId)) {
      setFocusedComponentId(null)
      setLocalScale(LOCAL_SCALE_DEFAULT)
    }
  }, [safeComponents, focusedComponentId])
  // =========================================================================
  // FIN MB-ARDUINO-BRIDGE-001 (purge)
  // =========================================================================

  // =========================================================================
  // DOCUMENT SYSTEM Point d'écriture unique (MB-003.3.3)
  // =========================================================================

  const updateComponentPositions = useCallback((positionsMap) => {
    if (!positionsMap || positionsMap.size === 0) return

    setComponents((prev) => prev.map((c) => {
      const pos = positionsMap.get(c.uid)
      if (pos) {
        return {
          ...c,
          x: snapToGrid(pos.x),
          y: snapToGrid(pos.y)
        }
      }
      return c
    }))
  }, [])

  // =========================================================================
  // MB-004.5 : Document API pour les commandes
  // =========================================================================

  const documentApi = useMemo(() => ({
    updateComponentPositions,
    updateComponentState: (uid, state) => {
      setComponents(prev => prev.map(c => c.uid === uid ? { ...c, state } : c))
    },
    removeComponents: (componentIds) => {
      setComponents(prev => prev.filter(c => !componentIds.includes(c.uid)))
    },
    removeWires: (wireIds) => {
      setWires(prev => prev.filter(w => !wireIds.includes(w.id)))
    },
    restoreComponents: (componentsToRestore) => {
      setComponents(prev => {
        const newComponents = [...prev]
        for (const comp of componentsToRestore) {
          if (!newComponents.find(c => c.uid === comp.uid)) {
            newComponents.push(comp)
          }
        }
        return newComponents
      })
    },
    restoreWires: (wiresToRestore) => {
      setWires(prev => {
        const newWires = [...prev]
        for (const wire of wiresToRestore) {
          if (!newWires.find(w => w.id === wire.id)) {
            newWires.push(wire)
          }
        }
        return newWires
      })
    },
    // MB-CF3-001 (amendement CSA-CF3-001-A, AC-006 levé/évolutif) : contrat
    // requis par HistoryService/HistoryCommandAdapter pour le canal de
    // mutation cible. Dérivés d'API Core existantes (ReactDocumentMapper,
    // déjà en production pour toCore) — aucune API inventée.
    getDocument: () => normalizeDocumentBreadboards(ReactDocumentMapper.toCore({
      components: componentsRef.current,
      wires: wiresRef.current,
      // FT-C-BREAD-MULTI-001-A : la collection canonique `breadboards[]` est
      // recopiée telle quelle par ReactDocumentMapper.toCore
      // (_copyUnknownProperties — un tableau non nul survit). normalizeDocument-
      // Breadboards ajoute ensuite la projection transitoire `breadboard`
      // (`breadboards[0] ?? null`) pour les lecteurs pas encore migrés.
      breadboards: breadboardsRef.current,
    })),
    applyDocument: (coreDocument) => {
      const reactDocument = ReactDocumentMapper.toReact(coreDocument)
      const nextComponents = (reactDocument.components || [])
        .map(normalizeComponent)
        .filter((c) => c !== null)
      const nextWires = (reactDocument.wires || [])
        .map(normalizeWire)
        .filter((w) => w !== null)
      // FT-C-BREAD-MULTI-001-A : frontière de normalisation UNIQUE. Le
      // Document remonté par un handler porte `breadboards[]` (canonique) ;
      // normalizeDocumentBreadboards absorbe indifféremment cette forme ou
      // l'ancienne `{ breadboard }` (undo, import legacy) et re-dérive la
      // projection transitoire `breadboard`.
      const norm = normalizeDocumentBreadboards(reactDocument)
      const nextBreadboards = norm.breadboards
      const nextBreadboard = norm.breadboard
      // Synchronisation immédiate (pas seulement via l'effet MB-004.5) :
      // sans cela, deux dispatches successifs dans le même batch React (avant
      // tout rendu) liraient tous deux le même componentsRef/wiresRef périmé
      // via getDocument(), et le second applyDocument() écraserait le premier
      // (remplacement non fonctionnel de l'état). Vérifié empiriquement via
      // DeleteCommand.integration.test.jsx (deux addComponent() consécutifs
      // dans le même act()). Même raisonnement appliqué à breadboard(s)Ref.
      componentsRef.current = nextComponents
      wiresRef.current = nextWires
      breadboardRef.current = nextBreadboard
      breadboardsRef.current = nextBreadboards
      setComponents(nextComponents)
      setWires(nextWires)
      setBreadboard(nextBreadboard)
      setBreadboards(nextBreadboards)
    },
  }), [updateComponentPositions])

  // =========================================================================
  // FIN MB-004.5
  // =========================================================================

  // =========================================================================
  // MB-CF3-001 (GATE 3, amendement CSA-CF3-001-A) : canal de mutation cible —
  // CommandBus -> Handler -> HistoryService. Enveloppe historyManagerRef.current
  // (même instance que le canal legacy) pour préserver une pile Undo/Redo
  // unique. Portée : addComponent uniquement. addWire reste hors périmètre.
  //
  // [ESLint react-hooks/refs, correction] La construction ne doit pas lire
  // historyManagerRef.current ni écrire commandBusRef.current/historyServiceRef.current
  // pendant le rendu (interdit par la règle — accès/écriture de ref hors
  // event handler/effect). Déplacée dans un useEffect : sans risque de
  // fenêtre d'indisponibilité, car un effect s'exécute de façon synchrone
  // juste après le commit, avant que le navigateur ne puisse traiter un
  // quelconque événement utilisateur (JS mono-thread) — addComponent() ne
  // peut donc jamais être invoqué avant que cet effect n'ait tourné. Vérifié
  // par ailleurs qu'aucun autre effect du fichier n'appelle addComponent.
  // Le garde-fou de idempotence (if === null) est conservé pour rester
  // robuste au double-rendu de React StrictMode en développement.
  //
  // [MB-CF4-001] Câblage du Validation Engine (ADR-010) dans le CommandBus,
  // via le mécanisme d'injection déjà existant (constructor(registry,
  // validators = {})). Aucune règle métier ici : le registre de règles par
  // défaut est construit par la factory Core createDefaultValidationRegistry
  // (frontend/src/core/validation/createValidationRegistry.js). Le hook ne
  // fait qu'assembler et injecter — la validation elle-même reste
  // entièrement dans le Core.
  // =========================================================================

  const commandBusRef = useRef(null)
  useEffect(() => {
    if (commandBusRef.current === null) {
      const registry = new CommandRegistry()
      const historyService = new HistoryService(historyManagerRef.current, documentApi)
      registry.register("ADD_COMPONENT", new AddComponentHandler({ historyService, documentApi }))
      // MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001) : deuxième et dernier
      // type actuellement autorisé sur ce canal. REMOVE_COMPONENT/
      // MOVE_COMPONENT/UPDATE_COMPONENT restent explicitement hors périmètre
      // (verrou CSA-CF3-001-A, étendu par CSA-CF3-002-ADD-WIRE-001, voir
      // cf1DocumentArchitecture.test.js).
      registry.register("ADD_WIRE", new AddWireHandler({ historyService, documentApi }))
      // MB-VIS-005 (ruling CSA du 2026-08-21) : troisième et dernier type
      // actuellement autorisé sur ce canal — mutation atomique unique du
      // tableau waypoints d'un wire existant. Aucune autre commande
      // (REMOVE_COMPONENT/MOVE_COMPONENT/UPDATE_COMPONENT, ou toute mutation
      // granulaire de waypoint) n'est autorisée par ce ruling — voir
      // cf1DocumentArchitecture.test.js.
      registry.register("UPDATE_WIRE_WAYPOINTS", new UpdateWireWaypointsHandler({ historyService, documentApi }))
      // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001 du 2026-08-22) : quatrième
      // type autorisé sur ce canal — déplacement d'un ou plusieurs
      // composants, contrat canonique { moves: [...] } (voir
      // MoveComponentHandler.js). REMOVE_COMPONENT/UPDATE_COMPONENT restent
      // explicitement hors périmètre — voir cf1DocumentArchitecture.test.js.
      registry.register("MOVE_COMPONENT", new MoveComponentHandler({ historyService, documentApi }))
      // MB-BREADBOARD-002 (CSA Ruling GO du 2026-08-25) : cinquième et
      // dernier type actuellement autorisé sur ce canal — pose l'entité
      // document.breadboard (LOCK-01 : un seul breadboard par Document,
      // refus explicite d'un second ADD_BREADBOARD). Aucune commande
      // d'insertion/retrait dédiée n'est ajoutée : l'occupation d'un trou de
      // breadboard est dérivée de la position des composants existants
      // (ADD_COMPONENT/MOVE_COMPONENT, déjà gouvernés) — voir
      // frontend/src/utils/breadboardConnectivity.js et Blueprint
      // MB-BREADBOARD-001 §6. REMOVE_COMPONENT/UPDATE_COMPONENT restent
      // explicitement hors périmètre — voir cf1DocumentArchitecture.test.js.
      registry.register("ADD_BREADBOARD", new AddBreadboardHandler({ historyService, documentApi }))
      // MB-BREADBOARD-006 (CSA Ruling — Option B, §1/§2/§8, traçable dans
      // docs/pmo/tickets/MB-BREADBOARD-006.md) : sixième et septième types
      // autorisés sur ce canal — déplacement solidaire du breadboard (avec
      // les composants insérés sur ses trous, une seule mutation/une seule
      // entrée d'historique) et suppression du breadboard (minimale, ne
      // touche ni components ni wires — voir DeleteBreadboardHandler.js).
      // REMOVE_COMPONENT/UPDATE_COMPONENT restent explicitement hors
      // périmètre — voir cf1DocumentArchitecture.test.js.
      registry.register("MOVE_BREADBOARD", new MoveBreadboardHandler({ historyService, documentApi }))
      registry.register("DELETE_BREADBOARD", new DeleteBreadboardHandler({ historyService, documentApi }))
      const validationEngine = new ValidationEngine(createDefaultValidationRegistry())
      commandBusRef.current = new CommandBus(registry, { validationEngine })
      // undo()/redo() (définis plus haut, MB-004.3) délèguent à cette même
      // instance de HistoryService pour que les commandes CommandBus se
      // réappliquent correctement à documentApi lors d'un undo/redo.
      historyServiceRef.current = historyService
    }
  }, [documentApi])

  const addComponent = useCallback((type, x = 120, y = 180) => {
    if (!getComponentDef(type)) return
    // Garde défensive : ne devrait jamais être atteinte en pratique (voir
    // justification ci-dessus), conservée par robustesse plutôt que par
    // nécessité démontrée.
    if (!commandBusRef.current) return

    // MB-BREADBOARD-003 (correctif ciblé — dépôt initial) : jusqu'ici, seul
    // MOVE_COMPONENT (handlePointerMove ci-dessous) consultait
    // computeBreadboardPlacement() ; le dépôt initial depuis la Sidebar
    // (ADD_COMPONENT) appliquait inconditionnellement snapToGrid(), même
    // quand un breadboard était présent et le type compatible — un
    // composant pouvait donc atterrir sur une position incompatible avec
    // les trous du breadboard. Même mécanisme, mêmes références synchrones
    // (breadboardRef/componentsRef, MB-BREADBOARD-002/003) que MOVE, pour
    // éviter toute stale closure — aucun nouvel état React introduit.
    // computeBreadboardPlacement() reste l'unique arbitre du placement
    // physique : aucune réimplémentation de holeAt()/tolérance/collision
    // ici. Le composant en cours d'ajout n'existe pas encore dans
    // componentsRef.current (il ne sera créé que par le Handler après
    // dispatch) : aucun filtre d'auto-exclusion n'est donc nécessaire,
    // contrairement au chemin MOVE.
    // FT-C-BREAD-MULTI-001-C : drop Sidebar résolu par le resolver multi-candidat
    // D1 — le breadboard cible n'est plus supposé unique.
    const placement = computeMultiBreadboardPlacement(
      breadboardsRef.current,
      type,
      { x, y },
      componentsRef.current
    )

    // Point de régression principal : quand breadboardActive est vrai,
    // placement.position est DÉJÀ la position physiquement alignée sur la
    // géométrie du breadboard (BREADBOARD_PITCH), pas GRID_SIZE — un second
    // snapToGrid() l'écraserait silencieusement (même défaut que celui déjà
    // corrigé dans normalizeComponent(), circuitModel.js, cf. Delivery
    // Report MB-BREADBOARD-003 §3.3). Ne jamais repasser placement.position
    // dans snapToGrid(). La validité (collision de trou) n'est pas
    // vérifiée ici : elle reste entièrement déléguée à
    // BreadboardHoleCollisionRule (STR-007) au moment de la validation
    // CommandBus, exactement comme pour MOVE_COMPONENT — aucune nouvelle
    // règle métier introduite.
    const position = placement.breadboardActive
      ? placement.position
      : { x: snapToGrid(x), y: snapToGrid(y) }

    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_COMPONENT", {
        componentType: type,
        position,
      })
      commandBusRef.current.dispatch(command, coreDocument)
    } catch (error) {
      console.error("addComponent: échec du dispatch via CommandBus", error)
    }
  }, [documentApi])

  // =========================================================================
  // FIN MB-CF3-001 (GATE 3 — addComponent)
  // =========================================================================

  // =========================================================================
  // MB-CF3-002 (ruling CSA-CF3-002-ADD-WIRE-001) : canal de mutation cible —
  // CommandBus -> AddWireHandler -> HistoryService. Même patron que
  // addComponent (MB-CF3-001). La détection de doublon (wireAlreadyExists)
  // n'est pas déplacée côté Core (instruction CSA explicite) : elle reste
  // appliquée ici, côté UI, avant tout dispatch — seul le mécanisme de
  // mutation change (CommandBus au lieu d'un setWires() direct), pas la
  // garantie elle-même. wiresRef.current (MB-CF3-001, référence synchrone)
  // est utilisé plutôt que safeWires pour éviter toute stale closure.
  // =========================================================================
  // [FT-B-001-S2] `contactAnchors` : 5ᵉ argument OPTIONNEL
  // `{ fromContact?, toContact? }` — ancres de contact physique de
  // présentation. Additif : tout appelant existant à 4 arguments est
  // inchangé. La déduplication (`wireAlreadyExists`) reste STRICTEMENT par
  // paire de pins canoniques (jamais contact-aware) : deux contacts d'une
  // même paire d'endpoints ne créent pas un second fil électrique.
  const addWire = useCallback((fromUid, fromPin, toUid, toPin, contactAnchors) => {
    if (!fromUid || !fromPin || !toUid || !toPin) return
    if (fromUid === toUid && fromPin === toPin) return
    if (!commandBusRef.current) return
    if (wireAlreadyExists(wiresRef.current, fromUid, fromPin, toUid, toPin)) return
    const fromContact = contactAnchors?.fromContact
    const toContact = contactAnchors?.toContact
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_WIRE", {
        fromUid,
        fromPin,
        toUid,
        toPin,
        ...(fromContact != null ? { fromContact: String(fromContact) } : {}),
        ...(toContact != null ? { toContact: String(toContact) } : {}),
      })
      commandBusRef.current.dispatch(command, coreDocument)
    } catch (error) {
      console.error("addWire: échec du dispatch via CommandBus", error)
    }
  }, [documentApi])
  // =========================================================================
  // FIN MB-CF3-002 (ADD_WIRE)
  // =========================================================================

  // =========================================================================
  // MB-BREADBOARD-002 (CSA Ruling GO du 2026-08-25) : canal de mutation
  // cible — CommandBus -> AddBreadboardHandler -> HistoryService. Même
  // patron que addComponent/addWire.
  // FT-C-BREAD-MULTI-001-D : LOCK-01 levé (001-A). La garde singleton UI est
  // retirée — l'utilisateur peut ajouter N breadboards. Sans position
  // explicite, chaque nouvelle carte est décalée horizontalement (constantes
  // NEW_BREADBOARD_* de module) selon le nombre de cartes déjà posées, pour
  // qu'elles soient IMMÉDIATEMENT distinguables (Presentation / default
  // placement — aucune règle Core ; le chevauchement volontaire reste
  // possible après un drag).
  // =========================================================================
  const addBreadboard = useCallback((x, y) => {
    if (!commandBusRef.current) return
    const explicit = Number.isFinite(x) && Number.isFinite(y)
    const count = breadboardsRef.current.length
    const position = explicit
      ? { x, y }
      : {
          x: NEW_BREADBOARD_BASE_X + count * NEW_BREADBOARD_OFFSET_X,
          y: NEW_BREADBOARD_BASE_Y,
        }
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_BREADBOARD", { position })
      commandBusRef.current.dispatch(command, coreDocument)
    } catch (error) {
      console.error("addBreadboard: échec du dispatch via CommandBus", error)
    }
  }, [documentApi])
  // =========================================================================
  // FIN MB-BREADBOARD-002 (ADD_BREADBOARD)
  // =========================================================================

  // =========================================================================
  // MB-VIS-005 (ruling CSA du 2026-08-21) : canal de mutation cible —
  // CommandBus -> UpdateWireWaypointsHandler -> HistoryService. Même patron
  // que addComponent/addWire : mutation atomique unique du tableau complet
  // des waypoints (§5.3 du ticket parent — aucune mutation granulaire).
  // wiresRef.current (référence synchrone, même précédent que addWire) évite
  // toute stale closure.
  // =========================================================================
  const updateWireWaypoints = useCallback((wireId, waypoints) => {
    if (!wireId || !Array.isArray(waypoints)) return
    if (!commandBusRef.current) return
    if (!wiresRef.current.some((w) => w.id === wireId)) return
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("UPDATE_WIRE_WAYPOINTS", { wireId, waypoints })
      commandBusRef.current.dispatch(command, coreDocument)
    } catch (error) {
      console.error("updateWireWaypoints: échec du dispatch via CommandBus", error)
    }
  }, [documentApi])
  // =========================================================================
  // FIN MB-VIS-005 (UPDATE_WIRE_WAYPOINTS)
  // =========================================================================

  // =========================================================================
  // MB-VIS-005 (Phase E) : déplacement d'un waypoint existant par
  // pointer-drag. Même patron que startDrag (composants) : la position
  // affichée pendant le drag est un aperçu local (waypointPreview), jamais
  // une écriture dans `wires` — seul le relâchement dispatche
  // updateWireWaypoints() (mutation CF3 unique), et seulement si la
  // position a réellement changé.
  // =========================================================================
  const startWaypointDrag = useCallback((event, wireId, index) => {
    if (!wireId || !Number.isInteger(index) || !canvasRef?.current) return

    // Garde I-M1 (même principe que startDrag/startMarquee) : aucune autre
    // interaction de pointeur active simultanément. MB-VIS-CANVAS-050 :
    // ajout de panSessionRef (contrainte #6 — une seule interaction pointer
    // active à la fois, étendue au pan).
    if (dragSessionRef.current !== null) return
    if (marqueeSessionRef.current !== null) return
    if (panSessionRef.current !== null) return
    if (pendingPin !== null || wireGestureRef.current !== null) return

    const wire = wiresRef.current.find((w) => w.id === wireId)
    if (!wire || !Array.isArray(wire.waypoints) || !wire.waypoints[index]) return

    event.stopPropagation()

    const rect = canvasRef.current.getBoundingClientRect()
    // MB-VIS-CANVAS-051 (D3) : viewportRef — lu une seule fois au pointerdown.
    const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)
    const baseWaypoints = wire.waypoints.map((wp) => ({ ...wp }))

    waypointDragSessionRef.current = {
      wireId,
      index,
      pointerStart: { x: pointer.x, y: pointer.y },
      baseWaypoints,
      liveWaypoints: baseWaypoints,
    }
    setWaypointPreview({ wireId, waypoints: baseWaypoints })

    event.preventDefault()
  }, [canvasRef, pendingPin])
  // =========================================================================
  // FIN MB-VIS-005 (Phase E — déplacement de waypoint)
  // =========================================================================

  const cancelWiring = useCallback(() => {
    if (wireGestureRef.current) suppressWireClickRef.current = true
    wireGestureRef.current = null
    setWireGesture(null)
    setPendingPin(null)
  }, [])

  // Presentation only: no temporary wire, Document mutation or history entry.
  // [FT-B-001-S2] `contactId` optionnel : identité du CONTACT PHYSIQUE cliqué
  // (présentation). Transporté tel quel jusqu'au preview, puis à ADD_WIRE.
  // Absent ⇒ comportement historique (repli sur le contact par défaut à la
  // résolution du tracé).
  const startWireGesture = useCallback((event, uid, pinId, contactId) => {
    if (event.button !== 0 || !uid || !pinId || wireGestureRef.current) return
    if (dragSessionRef.current || marqueeSessionRef.current || panSessionRef.current || waypointDragSessionRef.current) return
    const gesture = { uid, pinId,
      contactId: contactId != null ? String(contactId) : undefined,
      pointerId: event.pointerId,
      clientX: event.clientX, clientY: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false }
    wireGestureRef.current = gesture
    setWireGesture(gesture)
    // Release implicit touch capture so the physical destination remains hittable.
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  useEffect(() => {
    const move = (event) => {
      const gesture = wireGestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      const next = { ...gesture, clientX: event.clientX, clientY: event.clientY,
        moved: gesture.moved || Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 3 }
      wireGestureRef.current = next
      setWireGesture(next)
    }
    const up = (event) => {
      const gesture = wireGestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      const target = typeof document.elementFromPoint === "function"
        ? document.elementFromPoint(event.clientX, event.clientY) : event.target
      const pin = target?.closest?.("[data-wire-uid][data-wire-pin]")
      const same = pin?.dataset.wireUid === gesture.uid && pin?.dataset.wirePin === gesture.pinId
      wireGestureRef.current = null
      setWireGesture(null)
      // A stationary release on A remains the existing click-pin interaction.
      if (same && !gesture.moved) return
      suppressWireClickRef.current = true
      setPendingPin(null)
      if (pin && canvasRef?.current?.contains(pin)) {
        // [FT-B-001-S2] Ancres de contact physique : contact source =
        // gesture.contactId ; contact destination = data-wire-contact de la
        // cible. Optionnelles — addWire tombe sur le contact par défaut si
        // absentes.
        addWire(gesture.uid, gesture.pinId, pin.dataset.wireUid, pin.dataset.wirePin, {
          fromContact: gesture.contactId,
          toContact: pin.dataset.wireContact,
        })
      }
    }
    const cancel = () => { if (wireGestureRef.current) cancelWiring() }
    const key = (event) => { if (event.key === "Escape") cancel() }
    const resetClick = () => { suppressWireClickRef.current = false }
    const click = (event) => {
      if (!suppressWireClickRef.current || event.detail === 0) return
      suppressWireClickRef.current = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    window.addEventListener("pointerdown", resetClick, true)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    window.addEventListener("blur", cancel)
    window.addEventListener("keydown", key, true)
    window.addEventListener("click", click, true)
    return () => {
      window.removeEventListener("pointerdown", resetClick, true)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      window.removeEventListener("blur", cancel)
      window.removeEventListener("keydown", key, true)
      window.removeEventListener("click", click, true)
    }
  }, [addWire, canvasRef, cancelWiring])

  const onPinClick = useCallback((uid, pinId, contactId) => {
    if (!uid || !pinId) return

    // Garde I-M1 : vérifier qu'aucune autre interaction n'est active
    if (dragSessionRef.current !== null) return
    if (marqueeSessionRef.current !== null) return
    if (panSessionRef.current !== null) return

    // [FT-B-001-S2] `contactId` (ancre de contact physique) mémorisé dans
    // pendingPin puis transmis à addWire — même sémantique que le geste de
    // drag. Optionnel : une pin mono-contact garde le comportement d'avant.
    const current = { uid, pinId, contactId: contactId != null ? String(contactId) : undefined }
    if (!pendingPin) { setPendingPin(current); return }
    setPendingPin(null)
    if (pendingPin.uid === uid && pendingPin.pinId === pinId) return
    addWire(pendingPin.uid, pendingPin.pinId, uid, pinId, {
      fromContact: pendingPin.contactId,
      toContact: current.contactId,
    })
  }, [pendingPin, addWire])

  const isPinPending = useCallback((uid, pinId) => pendingPin?.uid === uid && pendingPin?.pinId === pinId, [pendingPin])
  const isPinConnected = useCallback((uid, pinId) => connectedPins.has(pinRefKey(uid, pinId)), [connectedPins])

  // =========================================================================
  // SELECTION SYSTEM (MBA-001)
  // =========================================================================

  const selectOnly = useCallback((item) => {
    if (!item || !item.type || !item.id) {
      setSelection(new Set())
      setActiveItem(null)
      return
    }
    const key = getSelectionKey(item.type, item.id)
const nextSelection = new Set([key])

setSelection(nextSelection)
setActiveItem(item)

if (import.meta.env.DEV) {
  console.assert(
    nextSelection.has(getSelectionKey(item.type, item.id)),
    "Invariant IA-01 violÃƒÂ© : activeItem doit appartenir ÃƒÂ  selection"
  )
}
  }, [])

  const toggleSelection = useCallback((item) => {
    if (!item || !item.type || !item.id) return

    const key = getSelectionKey(item.type, item.id)

    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      const newActiveItem = promoteActiveItem(next)
      setActiveItem(newActiveItem)

      if (import.meta.env.DEV) {
        console.assert(
          newActiveItem === null || next.has(getSelectionKey(newActiveItem.type, newActiveItem.id)),
          "Invariant IA-01 violÃƒÂ© : activeItem doit appartenir ÃƒÂ  selection"
        )
      }

      return next
    })
  }, [])

  const isSelected = useCallback((item) => {
    if (!item || !item.type || !item.id) return false
    return selection.has(getSelectionKey(item.type, item.id))
  }, [selection])

  const clearSelection = useCallback(() => {
    setSelection(new Set())
    setActiveItem(null)
  }, [])

  // =========================================================================
  // SELECTION SYSTEM Marquee (MB-003.4)
  // =========================================================================

  // TEST-08 : `breadboardIds` ajouté en 4e paramètre (après `keepExisting`,
  // jamais inséré entre les paramètres existants) pour que tout appel
  // existant à 3 arguments positionnels (componentIds, wireIds, ctrlKey)
  // reste valide sans modification — breadboardIds vaut alors `undefined`,
  // traité ci-dessous exactement comme `wireIds`/`componentIds` absents.
  const selectMarquee = useCallback((componentIds, wireIds, keepExisting = false, breadboardIds) => {
    const totalItems = (componentIds?.size || 0) + (wireIds?.size || 0) + (breadboardIds?.size || 0)
    if (totalItems === 0) {
      if (!keepExisting) {
        setSelection(new Set())
        setActiveItem(null)
      }
      return
    }

    setSelection((prev) => {
      let next = new Set()

      if (keepExisting) {
        next = new Set(prev)
      }

      if (componentIds) {
        componentIds.forEach(id => {
          next.add(getSelectionKey('component', id))
        })
      }

      if (wireIds) {
        wireIds.forEach(id => {
          next.add(getSelectionKey('wire', id))
        })
      }

      // TEST-08 : même clé que la sélection par clic (Breadboard.jsx,
      // MB-BREADBOARD-006) — getSelectionKey('breadboard', id) — aucune
      // nouvelle convention de clé introduite.
      if (breadboardIds) {
        breadboardIds.forEach(id => {
          next.add(getSelectionKey('breadboard', id))
        })
      }

      const newActiveItem = promoteActiveItem(next)
      setActiveItem(newActiveItem)

      if (import.meta.env.DEV) {
        console.assert(
          newActiveItem === null || next.has(getSelectionKey(newActiveItem.type, newActiveItem.id)),
          "Invariant IA-01 violÃƒÂ© : activeItem doit appartenir ÃƒÂ  selection"
        )
      }

      return next
    })
  }, [])

  // =========================================================================
  // DOCUMENT SYSTEM  & SRP (MB-003.2)
  // =========================================================================

  const removeWire = useCallback((wireId) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId))
  }, [])

  const removeComponent = useCallback((uid) => {
    setComponents((prev) => prev.filter((c) => c.uid !== uid))
  }, [])

  const removeConnectedWires = useCallback((uid) => {
    setWires((prev) => prev.filter((w) => w.fromUid !== uid && w.toUid !== uid))
  }, [])

  const deleteComponent = useCallback((uid) => {
    if (!uid) return
    removeConnectedWires(uid)
    removeComponent(uid)
  }, [removeConnectedWires, removeComponent])

  // =========================================================================
  // MB-004.6 : DeleteCommand Suppression avec historique
  // =========================================================================

  const deleteSelection = useCallback(() => {
    const keysToDelete = Array.from(selection)
    if (keysToDelete.length === 0) return

    // MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§7/§8) : sélection
    // breadboard EXCLUSIVE (jamais mélangée à des composants/wires, §5 du
    // Ruling — garanti par selectOnly()) — si la sélection est exactement
    // {breadboard}, dispatcher DELETE_BREADBOARD via CommandBus, JAMAIS via
    // le canal legacy DeleteCommand/historyManagerRef.current.execute()
    // (réservé aux composants/wires, inchangé ci-dessous).
    if (keysToDelete.length === 1) {
      const parsed = parseSelectionKey(keysToDelete[0])
      if (parsed.type === 'breadboard') {
        if (commandBusRef.current) {
          try {
            const coreDocument = documentApi.getDocument()
            const command = new Command("DELETE_BREADBOARD", { breadboardId: parsed.id })
            commandBusRef.current.dispatch(command, coreDocument)
          } catch (error) {
            console.error("deleteBreadboard: échec du dispatch via CommandBus", error)
          }
        }
        setSelection(new Set())
        setActiveItem(null)
        return
      }
    }

    const componentsToDelete = new Set()
    const initialWiresToDelete = new Set()

    keysToDelete.forEach((key) => {
      const { type, id } = parseSelectionKey(key)
      if (type === 'component') {
        componentsToDelete.add(id)
      } else if (type === 'wire') {
        initialWiresToDelete.add(id)
      }
    })

    // Capturer les données réelles AVANT suppression
    const deletedComponents = new Map()
    const deletedWires = new Map()

    const componentMap = new Map(safeComponents.map(c => [c.uid, c]))
    const wireMap = new Map(safeWires.map(w => [w.id, w]))

    // 1. Capturer les composants sélectionnés
    componentsToDelete.forEach(uid => {
      const comp = componentMap.get(uid)
      if (comp) {
        deletedComponents.set(uid, { ...comp })
      }
    })

    // 2. Capturer les wires sélectionnés
    initialWiresToDelete.forEach(wireId => {
      const wire = wireMap.get(wireId)
      if (wire) {
        deletedWires.set(wireId, { ...wire })
      }
    })

    // 3. Capturer les wires connectés aux composants supprimés
    componentsToDelete.forEach(uid => {
      const connected = safeWires.filter(w => w.fromUid === uid || w.toUid === uid)
      for (const wire of connected) {
        if (!deletedWires.has(wire.id)) {
          deletedWires.set(wire.id, { ...wire })
        }
      }
    })

    // 4. Vérifier qu'il y a quelque chose à supprimer
    if (deletedComponents.size === 0 && deletedWires.size === 0) {
      setSelection(new Set())
      setActiveItem(null)
      return
    }

    // 5. Créer et exécuter la commande
    const command = new DeleteCommand(
      documentApi,
      deletedComponents,
      deletedWires
    )
    historyManagerRef.current.execute(command)

    // 6. Vider la sélection
    setSelection(new Set())
    setActiveItem(null)
  }, [selection, safeComponents, safeWires, documentApi])

  // =========================================================================
  // FIN MB-004.6
  // =========================================================================

  // =========================================================================
  // POINTER INTERACTION SYSTEM Drag (MB-003.3.3 + MB-004.5)
  // =========================================================================

  const getSelectedComponentIds = useCallback(() => {
    const ids = new Set()
    selection.forEach(key => {
      const parsed = parseSelectionKey(key)
      if (parsed.type === 'component') {
        ids.add(parsed.id)
      }
    })
    return ids
  }, [selection])


  const startDrag = useCallback((event, uid) => {
    if (!uid || !canvasRef?.current) return

    // Garde I-M1 : vérifier qu'aucune autre interaction n'est active
    if (marqueeSessionRef.current !== null) return
    if (panSessionRef.current !== null) return
    if (pendingPin !== null || wireGestureRef.current !== null) return

    event.stopPropagation()

    // TODO MB-003.6 : utiliser setPointerCapture(event.pointerId)

    const selectedIds = getSelectedComponentIds()
    const idsToDrag = selectedIds.has(uid) ? selectedIds : new Set([uid])

    const rect = canvasRef.current.getBoundingClientRect()
    // MB-VIS-CANVAS-051 (D3) : viewportRef (jamais `viewport`) — startDrag ne
    // lit le viewport qu'à l'instant du pointerdown (jamais en continu) ;
    // dépendre de `viewport` ferait changer l'identité de startDrag à chaque
    // pixel de pan, sans aucun bénéfice fonctionnel.
    const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)

    const componentMap = new Map(components.map(c => [c.uid, c]))

    // MB-004.5 : Capture beforePositions pour l'historique
    const beforePositions = new Map()
    const componentsStart = new Map()
    idsToDrag.forEach(id => {
      const comp = componentMap.get(id)
      if (comp) {
        beforePositions.set(id, { x: comp.x, y: comp.y })
        // MB-BREADBOARD-003 (Blueprint §3) : `type` nécessaire à
        // computeBreadboardPlacement() dans handlePointerMove (absent avant
        // ce ticket, seule extension nécessaire côté capture de session).
        componentsStart.set(id, { startX: comp.x, startY: comp.y, type: comp.type })
      }
    })

    dragSessionRef.current = {
      pointerStart: { x: pointer.x, y: pointer.y },
      beforePositions: beforePositions,
      componentsStart: componentsStart,
      // MB-CF3-003 : miroir mutable de l'aperçu courant (même patron que
      // waypointDragSessionRef.liveWaypoints) — lu par handlePointerUp pour
      // éviter toute stale closure sur l'état React dragPreview (cet effect
      // ne se ré-exécute pas à chaque pointermove).
      livePositions: beforePositions,
    }

    event.preventDefault()
  }, [canvasRef, getSelectedComponentIds, components, pendingPin])

  // =========================================================================
  // MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§6) : drag du breadboard.
  // Même forme de session que startDrag (pointerStart/componentsStart/
  // livePositions), étendue par un discriminant isBreadboardDrag — AUCUNE
  // nouvelle machine à états : le même effect pointermove/pointerup/
  // pointercancel/blur (ci-dessous) est simplement branché. La solidarité
  // (quels composants suivent le breadboard) est déterminée UNE SEULE FOIS,
  // au pointerdown, via resolveSolidaryComponentIds() — seule source de
  // vérité, la même que celle utilisée par MoveBreadboardHandler côté Core
  // (INV-06). Sélection exclusive (§5 du Ruling) : aucune gestion Ctrl+clic
  // ici, toujours selectOnly() côté appelant (Breadboard.jsx).
  // =========================================================================
  const startBreadboardDrag = useCallback((event, breadboardId) => {
    if (!canvasRef?.current) return
    // FT-C-BREAD-MULTI-001-D : la carte draggée est résolue par son id exact
    // (transmis par l'instance <Breadboard> cliquée) dans la collection
    // canonique — plus de projection singleton. `breadboardId` omis : repli sûr
    // sur la première carte (compat appelant historique) ; introuvable : no-op.
    const boards = breadboardsRef.current || []
    const currentBreadboard = breadboardId
      ? boards.find((b) => b && b.id === breadboardId) || null
      : boards[0] || null
    if (!currentBreadboard || !currentBreadboard.position) return

    // Garde I-M1 : aucune autre interaction active.
    if (marqueeSessionRef.current !== null) return
    if (panSessionRef.current !== null) return
    if (pendingPin !== null) return

    event.stopPropagation()

    const rect = canvasRef.current.getBoundingClientRect()
    // MB-VIS-CANVAS-051 (D3) : viewportRef, même raisonnement que startDrag.
    const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)

    // FT-C-BREAD-MULTI-001-C : ownership canonique D1 (3ᵉ argument breadboards) —
    // même source de vérité que MoveBreadboardHandler côté Core (INV-06).
    const solidaryIds = resolveSolidaryComponentIds(currentBreadboard, componentsRef.current, breadboardsRef.current)
    const componentsStart = new Map()
    componentsRef.current.forEach((c) => {
      if (solidaryIds.has(c.uid)) {
        componentsStart.set(c.uid, { startX: c.x, startY: c.y })
      }
    })

    dragSessionRef.current = {
      pointerStart: { x: pointer.x, y: pointer.y },
      isBreadboardDrag: true,
      breadboardId: currentBreadboard.id,
      breadboardStart: { x: currentBreadboard.position.x, y: currentBreadboard.position.y },
      componentsStart,
      livePositions: null,
    }

    event.preventDefault()
  }, [canvasRef, pendingPin])
  // =========================================================================
  // FIN MB-BREADBOARD-006 (startBreadboardDrag)
  // =========================================================================

  // =========================================================================
  // POINTER INTERACTION SYSTEM Marquee (MB-003.4)
  // =========================================================================

  const startMarquee = useCallback((event) => {
    if (!canvasRef?.current) return

    // Garde I-M1 : vérifier qu'aucune autre interaction n'est active
    if (dragSessionRef.current !== null) return
    if (panSessionRef.current !== null) return
    if (pendingPin !== null || wireGestureRef.current !== null) return

    const rect = canvasRef.current.getBoundingClientRect()
    // MB-VIS-CANVAS-051 (D3) : viewportRef — lu une seule fois au pointerdown.
    const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)

    marqueeSessionRef.current = {
      start: { x: pointer.x, y: pointer.y },
      current: { x: pointer.x, y: pointer.y },
      ctrlKey: event.ctrlKey || event.metaKey,
    }

    setMarqueeRect({
      start: { x: pointer.x, y: pointer.y },
      current: { x: pointer.x, y: pointer.y }
    })
  }, [canvasRef, pendingPin])

  // MB-VIS-CANVAS-051 (D3, correction du bug de désabonnement identifié en
  // C4/D2 du Blueprint) : `viewport` retiré des dépendances — updateMarquee
  // est appelé à chaque pointermove d'un marquee actif, jamais pendant un pan
  // (garde I-M1, mutuellement exclusifs), mais figurait comme dépendance du
  // gros effect pointermove/up/cancel/blur ci-dessous. Avant ce correctif,
  // `viewport` changeant à chaque pixel de PAN forçait cet effect à
  // désabonner/réabonner ses 4 listeners `window` à chaque pixel de pan (même
  // si aucun marquee n'était en cours) — coût mesuré par ce ticket (voir
  // Delivery Report §Mesure). viewportRef élimine ce coût sans stale closure,
  // même patron que handlePointerMove plus bas dans ce fichier.
  const updateMarquee = useCallback((event) => {
    const session = marqueeSessionRef.current
    if (!session) return
    if (!canvasRef?.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)

    session.current = { x: pointer.x, y: pointer.y }

    setMarqueeRect({
      start: session.start,
      current: { x: pointer.x, y: pointer.y }
    })
  }, [canvasRef])

  const endMarquee = useCallback(() => {
    const session = marqueeSessionRef.current
    if (!session) return

    const { start, current, ctrlKey } = session
    const rect = {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y)
    }

    if (rect.width < 2 && rect.height < 2) {
      marqueeSessionRef.current = null
      setMarqueeRect(null)
      return
    }

    const componentIds = new Set()
    const componentMap = new Map(components.map(c => [c.uid, c]))
    componentMap.forEach((comp, uid) => {
      const compRect = {
        x: comp.x,
        y: comp.y,
        width: comp.width || 80,
        height: comp.height || 40
      }
      if (rectsOverlap(
        rect.x, rect.y, rect.width, rect.height,
        compRect.x, compRect.y, compRect.width, compRect.height,
        0.5
      )) {
        componentIds.add(uid)
      }
    })

    // MB-VIS-CANVAS-051 (D3, correction du bug de désabonnement identifié en
    // C4/C5/D2 du Blueprint) : wirePathsRef (jamais `wirePaths` directement)
    // — wirePaths change à chaque frame d'un drag de composant/waypoint (D5 :
    // la géométrie des fils suit volontairement le preview), mais endMarquee
    // n'en a besoin qu'AU RELÂCHEMENT du marquee. `wirePaths` figurait comme
    // dépendance directe d'endMarquee, elle-même dépendance du gros effect
    // pointermove/up/cancel/blur ci-dessous : cela désabonnait/réabonnait les
    // 4 listeners `window` à CHAQUE PIXEL d'un drag de composant (même sans
    // aucun marquee en cours) — coût mesuré par ce ticket (voir Delivery
    // Report §Mesure).
    const wireIds = new Set()
    wirePathsRef.current.forEach((path) => {
      if (!path || !path.d) return
      const points = extractPointsFromPathData(path.d)
      if (points.length < 2) return
      const from = points[0]
      const to = points[points.length - 1]
      const wireBBox = getWireBoundingBox(
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
        10
      )
      if (rectsOverlap(
        rect.x, rect.y, rect.width, rect.height,
        wireBBox.x, wireBBox.y, wireBBox.width, wireBBox.height,
        0.1
      )) {
        wireIds.add(path.id)
      }
    })

    // TEST-08 : sélection du Breadboard par rectangle. Géométrie IDENTIQUE
    // à celle réellement rendue par Breadboard.jsx (mêmes constantes
    // breadboardGeometry.js, même formule PADDING/width/height — aucune
    // duplication de logique de placement, aucun recalcul via holeAt()).
    // breadboardRef (déjà utilisé ailleurs dans ce fichier pour la même
    // raison — cf. computeBreadboardPlacement) donne un accès synchrone au
    // breadboard courant sans élargir le tableau de dépendances de ce
    // useCallback.
    // FT-C-BREAD-MULTI-001-D : marquee sur N breadboards — même géométrie de
    // rectangle (constantes breadboardGeometry.js), appliquée à chaque carte
    // de la collection canonique. Plus de projection singleton.
    const breadboardIds = new Set()
    const bbPadding = BREADBOARD_PITCH
    const bbWidth = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + bbPadding * 2
    const bbHeight = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + bbPadding * 2
    for (const bbEntry of breadboardsRef.current || []) {
      if (!bbEntry || !bbEntry.position) continue
      const bbX = bbEntry.position.x - bbPadding
      const bbY = bbEntry.position.y - bbPadding
      if (rectsOverlap(
        rect.x, rect.y, rect.width, rect.height,
        bbX, bbY, bbWidth, bbHeight,
        0.5
      )) {
        breadboardIds.add(bbEntry.id)
      }
    }

    const hadSelection = componentIds.size > 0 || wireIds.size > 0 || breadboardIds.size > 0
    if (hadSelection) {
      selectMarquee(componentIds, wireIds, ctrlKey, breadboardIds)
    } else {
      if (!ctrlKey) {
        clearSelection()
      }
    }

    marqueeSessionRef.current = null
    setMarqueeRect(null)

    if (hadSelection) {
      justFinishedMarqueeWithSelectionRef.current = true
    }
  }, [components, selectMarquee, clearSelection])

  const cancelMarquee = useCallback(() => {
    if (marqueeSessionRef.current !== null) {
      marqueeSessionRef.current = null
      setMarqueeRect(null)
      justFinishedMarqueeWithSelectionRef.current = false
      return true
    }
    return false
  }, [])

  const resetMarqueeClickFlag = useCallback(() => {
    justFinishedMarqueeWithSelectionRef.current = false
  }, [])

  // =========================================================================
  // MB-VIS-CANVAS-050 : Pan du viewport. Geste dédié — clic MOLETTE
  // (event.button === 1), jamais le clic gauche déjà utilisé par le marquee
  // ni le clic droit (réservé). Ce choix évite par construction toute
  // concurrence avec drag/marquee/waypoint/Breadboard/câblage (contrainte
  // #6/#7) sans avoir à suivre un état clavier supplémentaire. La
  // translation est exprimée en pixels ÉCRAN bruts (pointerStart/
  // translateStart, jamais convertis via clientToCanvas) — conforme à D1 :
  // le pan ne dépend jamais du zoom courant. Aucune mutation du Document,
  // aucun HistoryManager impliqué (contrainte #2/#8) : `viewport` est mis à
  // jour directement, sans aperçu séparé (contrairement à dragPreview).
  // =========================================================================
  const startPan = useCallback((event) => {
    // Garde I-M1 : aucune autre interaction pointer active.
    if (dragSessionRef.current !== null) return
    if (marqueeSessionRef.current !== null) return
    if (waypointDragSessionRef.current !== null) return
    if (pendingPin !== null || wireGestureRef.current !== null) return

    // MB-VIS-CANVAS-051 (D3) : viewportRef — lu une seule fois au pointerdown
    // (jamais en continu), même raisonnement que startDrag/startMarquee.
    panSessionRef.current = {
      pointerStart: { x: event.clientX, y: event.clientY },
      translateStart: { x: viewportRef.current.translateX, y: viewportRef.current.translateY },
    }

    event.preventDefault?.()
    event.stopPropagation?.()
  }, [pendingPin])

  // =========================================================================
  // MB-VIS-CANVAS-050 : zoom orienté curseur (D4). `screenX`/`screenY` sont
  // relatifs au coin haut-gauche du Canvas — même repère que `clientToCanvas`
  // (l'appelant, SimulationCanvas.jsx, les calcule identiquement via
  // canvasRef.current.getBoundingClientRect()).
  // =========================================================================
  const zoomAtScreenPoint = useCallback((screenX, screenY, nextZoom) => {
    setViewport((v) => zoomViewportAtScreenPoint(v, screenX, screenY, nextZoom))
  }, [])

  // MB-VIS-CANVAS-050 : variante relative (molette) — le zoom cible est
  // `zoom courant * factor`, résolu à l'INTÉRIEUR du updater `setViewport`
  // (donc toujours contre la valeur `viewport.zoom` la plus fraîche, jamais
  // celle capturée par la fermeture du gestionnaire `wheel` appelant). Cette
  // fonction reste stable (deps `[]`) : SimulationCanvas.jsx l'utilise depuis
  // un listener natif attaché une seule fois au montage (nécessaire pour
  // pouvoir appeler `preventDefault()` — React attache `onWheel` en
  // `passive`), qui ne doit donc pas dépendre de `viewport.zoom`.
  const zoomByFactorAtScreenPoint = useCallback((screenX, screenY, factor) => {
    setViewport((v) => zoomViewportAtScreenPoint(v, screenX, screenY, v.zoom * factor))
  }, [])

  // MB-VIS-CANVAS-050 (D6) : viewport neutre déterministe.
  const resetViewport = useCallback(() => {
    setViewport(createDefaultViewport())
  }, [])

  // MB-VIS-CANVAS-050 (D7) : ajuste le viewport pour faire tenir l'ensemble
  // de la scène (composants + waypoints de fils + breadboard) — no-op sûr
  // (aucun setViewport) si le canvas n'est pas mesurable ou la scène vide.
  const fitToContent = useCallback(() => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return
    // FT-C-BREAD-MULTI-001-D : la scène englobe TOUTES les cartes de breadboards[].
    const bounds = computeSceneBounds(componentsRef.current, wiresRef.current, breadboardsRef.current)
    const next = fitViewportToBounds(bounds, { width: rect.width, height: rect.height })
    if (next) setViewport(next)
  }, [canvasRef])

  // MB-VIS-CANVAS-050 (D8) : idem, restreint aux éléments sélectionnés —
  // no-op sûr si aucune sélection exploitable (aucun composant/wire
  // sélectionné, ou bounds non calculables) n'existe.
  const fitToSelection = useCallback(() => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return

    const selectedComponentIds = new Set()
    const selectedWireIds = new Set()
    const selectedBreadboardIds = new Set()
    selection.forEach((key) => {
      const parsed = parseSelectionKey(key)
      if (parsed.type === 'component') selectedComponentIds.add(parsed.id)
      if (parsed.type === 'wire') selectedWireIds.add(parsed.id)
      if (parsed.type === 'breadboard') selectedBreadboardIds.add(parsed.id)
    })
    if (selectedComponentIds.size === 0 && selectedWireIds.size === 0 && selectedBreadboardIds.size === 0) return

    const selectedComponents = componentsRef.current.filter((c) => selectedComponentIds.has(c.uid))
    const selectedWires = wiresRef.current.filter((w) => selectedWireIds.has(w.id))
    // FT-C-BREAD-MULTI-001-D : les breadboards sélectionnés étendent aussi les bounds.
    const selectedBreadboards = (breadboardsRef.current || []).filter((b) => selectedBreadboardIds.has(b.id))
    const bounds = computeSceneBounds(selectedComponents, selectedWires, selectedBreadboards)
    const next = fitViewportToBounds(bounds, { width: rect.width, height: rect.height })
    if (next) setViewport(next)
  }, [canvasRef, selection])

  // MB-VIS-CANVAS-050 (D9) : primitive générique de centrage, réutilisable
  // par un futur focus composant (052) sans que ce ticket n'implémente lui-
  // même le focus/local zoom (hors périmètre explicite). `zoomOverride`
  // optionnel — omis, le zoom courant est conservé (recentrage pur).
  const centerViewportOnRect = useCallback((rectDoc, zoomOverride) => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return
    const next = centerOnRect(rectDoc, { width: rect.width, height: rect.height }, zoomOverride ?? viewport.zoom)
    if (next) setViewport(next)
  }, [canvasRef, viewport.zoom])

  const centerViewportOnPoint = useCallback((pointDoc, zoomOverride) => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return
    const next = centerOnPoint(pointDoc, { width: rect.width, height: rect.height }, zoomOverride ?? viewport.zoom)
    if (next) setViewport(next)
  }, [canvasRef, viewport.zoom])

  // =========================================================================
  // MB-VIS-CANVAS-052 : Focus de composant + échelle visuelle locale.
  //
  // `focusComponent(uid)` calcule les bounds du composant EN ESPACE DOCUMENT
  // (position `x/y` + dimensions de componentDefinitions.js, jamais un
  // getBoundingClientRect() déjà transformé par le viewport ou le local
  // scale — Blueprint H) puis réutilise `centerViewportOnRect()` (primitive
  // MB-VIS-CANVAS-050 existante, D9) — aucune seconde caméra, aucun second
  // modèle screen↔Document (contraintes non négociables #6/#7 de
  // l'Authority). Le zoom global courant est conservé (`zoomOverride` omis) :
  // seul le centrage change, jamais le niveau de zoom global — ce ticket
  // n'invente pas de comportement de type « fit ». Au plus un focus actif :
  // focaliser un nouveau composant remplace silencieusement l'ancien (§G du
  // Blueprint), sans mutation Document ni entrée HistoryManager.
  // =========================================================================
  const focusComponent = useCallback((uid) => {
    if (!uid) return
    const comp = componentsRef.current.find((c) => c.uid === uid)
    if (!comp) return
    const def = getComponentDef(comp.type)
    if (def) {
      const rect = {
        minX: comp.x,
        minY: comp.y,
        maxX: comp.x + def.width,
        maxY: comp.y + def.height,
      }
      centerViewportOnRect(rect)
    }
    setFocusedComponentId(uid)
    setLocalScale(LOCAL_SCALE_DEFAULT)
  }, [centerViewportOnRect])

  // Sortie fiable du focus (Escape) : conserve le viewport courant tel quel
  // (Blueprint G — « aucune restauration automatique d'une ancienne caméra
  // n'est demandée »), aucune mutation Document, aucune entrée History.
  const exitFocus = useCallback(() => {
    setFocusedComponentId(null)
    setLocalScale(LOCAL_SCALE_DEFAULT)
  }, [])

  // Variation de l'échelle locale par pas fixe (molette au-dessus du
  // composant focalisé, SimulationCanvas.jsx) — no-op si aucun focus actif.
  // `deltaSteps` est déjà signé (+LOCAL_SCALE_STEP / -LOCAL_SCALE_STEP) par
  // l'appelant ; clampLocalScale() borne et sécurise (jamais NaN/infini,
  // Blueprint D2). Mise à jour fonctionnelle (`prev =>`) : stable (deps
  // `[]`), donc n'entraîne jamais le désabonnement/réabonnement d'un
  // listener qui en dépendrait (même précédent que zoomByFactorAtScreenPoint,
  // MB-VIS-CANVAS-050).
  const adjustLocalScale = useCallback((deltaSteps) => {
    if (!focusedComponentId) return
    setLocalScale((prev) => clampLocalScale(prev + deltaSteps))
  }, [focusedComponentId])
  // =========================================================================
  // FIN MB-VIS-CANVAS-052 (focus + local scale)
  // =========================================================================

  // =========================================================================
  // POINTER INTERACTION SYSTEM  Gestion des événements (useEffect)
  // =========================================================================

  useEffect(() => {
    const handlePointerMove = (event) => {
      // MB-VIS-CANVAS-050 : pan — translation écran brute, jamais convertie
      // via clientToCanvas (D1 : le pan ne dépend pas du zoom). Traité en
      // premier, comme marqueeSessionRef, car il exclut mutuellement toutes
      // les autres interactions (garde I-M1 posée dans startPan).
      const panSession = panSessionRef.current
      if (panSession) {
        const deltaX = event.clientX - panSession.pointerStart.x
        const deltaY = event.clientY - panSession.pointerStart.y
        setViewport((v) => ({
          ...v,
          translateX: panSession.translateStart.x + deltaX,
          translateY: panSession.translateStart.y + deltaY,
        }))
        return
      }

      if (marqueeSessionRef.current !== null) {
        updateMarquee(event)
        return
      }

      // MB-VIS-005 (Phase E) : déplacement d'un waypoint existant — aperçu
      // local uniquement (setWaypointPreview), aucune mutation du Document
      // tant que le pointeur n'est pas relâché (AC-03/AC-11).
      const waypointSession = waypointDragSessionRef.current
      if (waypointSession && canvasRef?.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)
        const deltaX = pointer.x - waypointSession.pointerStart.x
        const deltaY = pointer.y - waypointSession.pointerStart.y

        const liveWaypoints = waypointSession.baseWaypoints.map((wp, i) =>
          i === waypointSession.index
            ? { x: wp.x + deltaX, y: wp.y + deltaY }
            : wp
        )
        waypointSession.liveWaypoints = liveWaypoints
        setWaypointPreview({ wireId: waypointSession.wireId, waypoints: liveWaypoints })
        return
      }

      const session = dragSessionRef.current
      if (!session || !canvasRef?.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const pointer = clientToCanvas(event, rect, viewportRef.current.zoom, viewportRef.current.translateX, viewportRef.current.translateY)
      const deltaX = pointer.x - session.pointerStart.x
      const deltaY = pointer.y - session.pointerStart.y

      // MB-BREADBOARD-006 (CSA Ruling — Option B, §6) : aperçu du drag de
      // breadboard — translation pure par delta (jamais computeBreadboardPlacement,
      // qui snappe un composant SUR les trous du breadboard : ici c'est le
      // breadboard lui-même qui bouge). Le breadboard est arrondi au pas
      // BREADBOARD_PITCH (snapToBreadboardPitch, même fonction qu'à sa
      // création — AddBreadboardHandler), puis le delta RÉEL (post-arrondi)
      // est appliqué identiquement à chaque composant solidaire, pour que
      // leur position relative au breadboard reste EXACTEMENT inchangée
      // (holeAt() redonnera donc les mêmes column/row relatifs — AC-06).
      // Même Map dragPreview que le drag de composant (aucune seconde
      // structure d'aperçu, §6/§11 du Ruling) : componentsForRender lira
      // directement les entrées des composants solidaires sans aucune
      // modification de son propre code.
      if (session.isBreadboardDrag) {
        const newBreadboardPos = snapToBreadboardPitch({
          x: session.breadboardStart.x + deltaX,
          y: session.breadboardStart.y + deltaY,
        })
        const actualDeltaX = newBreadboardPos.x - session.breadboardStart.x
        const actualDeltaY = newBreadboardPos.y - session.breadboardStart.y

        const positionsMap = new Map()
        positionsMap.set(session.breadboardId, newBreadboardPos)
        session.componentsStart.forEach((startPos, uid) => {
          positionsMap.set(uid, {
            x: startPos.startX + actualDeltaX,
            y: startPos.startY + actualDeltaY,
          })
        })

        session.livePositions = positionsMap
        setDragPreview(positionsMap)
        return
      }

      // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001) : aperçu local uniquement
      // (setDragPreview) — AUCUNE mutation persistante, AUCUNE entrée
      // d'historique, AUCUN dispatch tant que le pointeur n'est pas relâché.
      // Le snap-to-grid est appliqué ici (même comportement visuel qu'avant
      // cette extension, auparavant assuré par updateComponentPositions).
      //
      // MB-BREADBOARD-003 (Blueprint §3) : si un breadboard est posé et que
      // le composant déplacé tombe dans son empreinte avec un type
      // compatible (exactement 2 pins), la position est alignée sur les
      // trous du breadboard (computeBreadboardPlacement, breadboardRef/
      // componentsRef — références synchrones existantes, MB-BREADBOARD-002/
      // Point 1 — évitent toute stale closure sans étendre le tableau de
      // dépendances de cet effect, inchangé ci-dessous). Sinon, repli
      // strict sur le snapToGrid GRID_SIZE existant (non-régression
      // LOCK-13/AC-20).
      const positionsMap = new Map()
      // FT-C-BREAD-MULTI-001-C : placement pendant le drag d'un composant résolu
      // par le resolver multi-candidat D1. `breadboardsRef` (référence synchrone
      // canonique, même motivation que l'ancien `breadboardRef` — pas de stale
      // closure sans étendre les deps de cet effect). Le breadboard ne bouge pas
      // pendant un drag de COMPOSANT, donc pas d'écart avec l'aperçu.
      const dragBreadboards = breadboardsRef.current
      // FT-C-BREAD-MULTI-001-D : feedback SCOPÉ par breadboard — Map<breadboardId,
      // { draggedIds:Set<uid>, valid }>. Une multi-sélection dont les composants
      // tombent sur des cartes différentes produit un feedback distinct par
      // carte, sans feedback fantôme sur les autres.
      const feedbackById = new Map()
      session.componentsStart.forEach((startPos, uid) => {
        const raw = { x: startPos.startX + deltaX, y: startPos.startY + deltaY }
        const placement = computeMultiBreadboardPlacement(
          dragBreadboards,
          startPos.type,
          raw,
          componentsRef.current.filter((c) => c.uid !== uid)
        )

        if (placement.breadboardActive && placement.breadboardId) {
          positionsMap.set(uid, placement.position)
          let fb = feedbackById.get(placement.breadboardId)
          if (!fb) {
            fb = { draggedIds: new Set(), valid: true }
            feedbackById.set(placement.breadboardId, fb)
          }
          fb.draggedIds.add(uid)
          if (!placement.valid) fb.valid = false
        } else {
          positionsMap.set(uid, {
            x: snapToGrid(raw.x),
            y: snapToGrid(raw.y)
          })
        }
      })
      const feedback = feedbackById.size > 0 ? feedbackById : null

      if (positionsMap.size > 0) {
        session.livePositions = positionsMap
        setDragPreview(positionsMap)
      }
      setBreadboardFeedback(feedback)
    }

    const handlePointerUp = () => {
      // MB-VIS-CANVAS-050 : fin de pan — aucun commit, `viewport` est déjà
      // l'état final (contrainte #8 : aucune entrée Undo/Redo).
      if (panSessionRef.current !== null) {
        panSessionRef.current = null
        return
      }

      if (marqueeSessionRef.current !== null) {
        endMarquee()
        return
      }

      // MB-VIS-005 (Phase E) : commit du déplacement de waypoint — une seule
      // mutation CF3 (updateWireWaypoints), uniquement si la position a
      // effectivement changé (même garde que I-H10 pour le drag de
      // composant), puis nettoyage systématique de la session/aperçu.
      const waypointSession = waypointDragSessionRef.current
      if (waypointSession) {
        const { wireId, baseWaypoints, liveWaypoints } = waypointSession
        const changed =
          liveWaypoints.length !== baseWaypoints.length ||
          liveWaypoints.some((wp, i) => wp.x !== baseWaypoints[i].x || wp.y !== baseWaypoints[i].y)

        if (changed) {
          updateWireWaypoints(wireId, liveWaypoints)
        }

        waypointDragSessionRef.current = null
        setWaypointPreview(null)
        return
      }

      // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001, 2026-08-22) : commit du
      // drag — une seule commande MOVE_COMPONENT via CommandBus, quelle que
      // soit la taille de la sélection (I-H10 : une seule entrée
      // d'historique par drag). `after` est lu depuis dragPreview
      // (Presentation), JAMAIS depuis componentsRef.current/le Document réel
      // — celui-ci n'a subi aucune mutation pendant pointermove. Le canal
      // legacy MoveCommand/HistoryManager n'est plus utilisé pour ce drag.
      const session = dragSessionRef.current

      // MB-BREADBOARD-006 (CSA Ruling — Option B, §6) : commit du drag de
      // breadboard — UNE SEULE commande MOVE_BREADBOARD via CommandBus, qui
      // mute breadboard ET composants solidaires en une seule mutation/une
      // seule entrée d'historique (§2 du Ruling). Le payload ne transporte
      // QUE la position du breadboard (fromPosition/toPosition) — jamais les
      // composants solidaires : c'est MoveBreadboardHandler, côté Core, qui
      // les redétermine via resolveSolidaryComponentIds() (§4 du Ruling,
      // déviation disclosed au contrat CSA-CF3-003-MOVE-001 — voir
      // MoveBreadboardHandler.js). `toPosition` est lu depuis
      // session.livePositions (Presentation), jamais depuis
      // breadboardRef.current/le Document réel — celui-ci n'a subi aucune
      // mutation pendant pointermove.
      if (session && session.isBreadboardDrag) {
        const preview = session.livePositions
        const previewBreadboardPos = preview && preview.get(session.breadboardId)
        const fromPosition = { ...session.breadboardStart }
        const toPosition = previewBreadboardPos
          ? { x: previewBreadboardPos.x, y: previewBreadboardPos.y }
          : { ...fromPosition }

        if ((toPosition.x !== fromPosition.x || toPosition.y !== fromPosition.y) && commandBusRef.current) {
          try {
            const coreDocument = documentApi.getDocument()
            const command = new Command("MOVE_BREADBOARD", {
              breadboardId: session.breadboardId,
              fromPosition,
              toPosition,
            })
            commandBusRef.current.dispatch(command, coreDocument)
          } catch (error) {
            console.error("moveBreadboard: échec du dispatch via CommandBus", error)
          }
        }

        dragSessionRef.current = null
        setDragPreview(null)
        setBreadboardFeedback(null)
        return
      }

      if (session) {
        const before = session.beforePositions
        if (before && before.size > 0) {
          // Lu depuis le ref de session (livePositions), jamais depuis la
          // closure de l'état React dragPreview — cet effect (donc ce
          // handler) n'est pas recréé à chaque pointermove (mêmes
          // dépendances stables que waypointDragSessionRef/liveWaypoints).
          const preview = session.livePositions
          const after = new Map()
          const moves = []
          before.forEach((pos, uid) => {
            const previewPos = preview && preview.get(uid)
            const toPosition = previewPos ? { x: previewPos.x, y: previewPos.y } : { x: pos.x, y: pos.y }
            after.set(uid, toPosition)
            moves.push({
              componentId: uid,
              fromPosition: { x: pos.x, y: pos.y },
              toPosition,
            })
          })

          // I-H10 : Une seule commande par drag, uniquement si changement.
          if (hasPositionsChanged(before, after) && commandBusRef.current) {
            try {
              const coreDocument = documentApi.getDocument()
              const command = new Command("MOVE_COMPONENT", { moves })
              commandBusRef.current.dispatch(command, coreDocument)
            } catch (error) {
              console.error("moveComponents: échec du dispatch via CommandBus", error)
            }
          }
        }
      }

      // I-P10 : Nettoyage systématique (MB-BREADBOARD-003 : breadboardFeedback
      // suit la même garde que dragPreview).
      dragSessionRef.current = null
      setDragPreview(null)
      setBreadboardFeedback(null)
    }

    const handlePointerCancel = () => {
      // MB-VIS-CANVAS-050 : I-P10 — pan annulé sans effet (déjà l'état final,
      // aucun commit à annuler).
      if (panSessionRef.current !== null) {
        panSessionRef.current = null
        return
      }
      if (marqueeSessionRef.current !== null) {
        marqueeSessionRef.current = null
        setMarqueeRect(null)
        return
      }
      // MB-VIS-005 (Phase E) : I-P10 — nettoyage sans historique, aucun
      // commit CF3.
      if (waypointDragSessionRef.current !== null) {
        waypointDragSessionRef.current = null
        setWaypointPreview(null)
        return
      }
      // I-P10 : Nettoyage sans historique (dragPreview également réinitialisé
      // — MB-CF3-003, aucun commit sur annulation ; breadboardFeedback suit
      // la même garde, MB-BREADBOARD-003).
      dragSessionRef.current = null
      setDragPreview(null)
      setBreadboardFeedback(null)
    }

    const handleBlur = () => {
      // MB-VIS-CANVAS-050 : I-P10 — même repli que handlePointerCancel.
      if (panSessionRef.current !== null) {
        panSessionRef.current = null
        return
      }
      if (marqueeSessionRef.current !== null) {
        marqueeSessionRef.current = null
        setMarqueeRect(null)
        return
      }
      // MB-VIS-005 (Phase E) : I-P10 — nettoyage sans historique, aucun
      // commit CF3.
      if (waypointDragSessionRef.current !== null) {
        waypointDragSessionRef.current = null
        setWaypointPreview(null)
        return
      }
      // I-P10 : Nettoyage sans historique (dragPreview également réinitialisé
      // — MB-CF3-003, aucun commit sur perte de focus ; breadboardFeedback
      // suit la même garde, MB-BREADBOARD-003).
      dragSessionRef.current = null
      setDragPreview(null)
      setBreadboardFeedback(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
      window.removeEventListener("blur", handleBlur)
    }
    // MB-VIS-CANVAS-050 : `viewport` n'est PAS dans ce tableau de dépendances
    // — `handlePointerMove` (drag composant/breadboard, waypoint) lit
    // `viewportRef.current` (ref synchrone, cf. déclaration plus haut),
    // jamais la valeur `viewport` capturée par la fermeture de cet effect.
    // Sans cette ref, `viewport` devrait figurer ici (même raisonnement que
    // MB-VIS-CANVAS-049 pour `zoom`) — mais `viewport` change désormais en
    // continu à chaque pixel pendant un pan actif, ce qui désabonnerait/
    // réabonnerait les listeners `window` à chaque `pointermove` (contraire
    // à l'exigence de fluidité du Ticket §Performances). La ref élimine ce
    // coût sans réintroduire de stale closure : `viewportRef.current` est
    // toujours à jour, quel que soit le moment de création de la fermeture.
  }, [canvasRef, updateMarquee, endMarquee, documentApi, updateWireWaypoints])

  // =========================================================================
  // WRAPPERS DE COMPATIBILITé
  // =========================================================================

  const selectItem = useCallback((item) => selectOnly(item), [selectOnly])
  const deselectWire = useCallback(() => clearSelection(), [clearSelection])
  const deleteSelectedWire = useCallback(() => deleteSelection(), [deleteSelection])

  const clearCircuit = useCallback(() => {
    wireGestureRef.current = null
    setWireGesture(null)
    setComponents([])
    setWires([])
    // FT-C-BREAD-MULTI-001-D (§20) : « Effacer le circuit » vide aussi la
    // collection canonique de breadboards ET la projection transitoire —
    // aucun breadboard fantôme ne subsiste. Les refs se resynchronisent via
    // leurs useEffect existants (même patron que setComponents/setWires
    // ci-dessus, qui ne touchent pas non plus componentsRef/wiresRef ici).
    setBreadboards([])
    setBreadboard(null)
    setBreadboardInsertPreview(null)
    setPendingPin(null)
    setSelection(new Set())
    setActiveItem(null)
    dragSessionRef.current = null
    setDragPreview(null)
    setBreadboardFeedback(null)
    marqueeSessionRef.current = null
    setMarqueeRect(null)
    justFinishedMarqueeWithSelectionRef.current = false
    historyManagerRef.current.clear()
    // MB-VIS-CANVAS-052 : un nouveau Document (vide) ne conserve jamais le
    // focus/l'échelle locale du circuit précédent.
    setFocusedComponentId(null)
    setLocalScale(LOCAL_SCALE_DEFAULT)
    // MB-ARDUINO-BRIDGE-001 (§5/§17 du Blueprint) : un nouveau Document (vide)
    // ne doit jamais hériter de l'état runtime d'un circuit précédent.
    orchestrators.clear()
  }, [orchestrators])

  // MB-BREADBOARD-003 (Blueprint §6, AC-23) : `breadboard` était absent de
  // l'objet exporté et ignoré à l'import (lacune préexistante, explicitement
  // mise hors scope par MB-BREADBOARD-002 Delivery Report §5.2 faute d'AC
  // qui l'exigeait alors — AC-23 de ce ticket la rend explicitement in-scope).
  // FT-C-BREAD-MULTI-001-A : l'export porte la collection canonique
  // `breadboards[]` ET la projection transitoire `breadboard` (rétro-compat
  // des consommateurs / tests pas encore migrés — retiré en 001-E).
  const exportCircuit = useCallback(
    () => ({ version: 1, components: safeComponents, wires: safeWires, breadboards, breadboard }),
    [safeComponents, safeWires, breadboards, breadboard]
  )

  const importCircuit = useCallback((data) => {
    if (!data || typeof data !== "object") return
    wireGestureRef.current = null
    setWireGesture(null)
    setComponents(Array.isArray(data.components) ? data.components.map(normalizeComponent).filter((c) => c !== null) : [])
    setWires(Array.isArray(data.wires) ? data.wires.map(normalizeWire).filter((w) => w !== null) : [])
    // FT-C-BREAD-MULTI-001-A : normalisation legacy à l'import — accepte
    // `{ breadboards: [...] }` (nouveau), `{ breadboard: B }` ou
    // `{ breadboard: null }` (ancien), via la frontière UNIQUE
    // normalizeDocumentBreadboards. breadboard(s)Ref se resynchronisent via
    // leurs useEffect existants (même patron que componentsRef/wiresRef ici).
    const normImport = normalizeDocumentBreadboards(data)
    setBreadboards(normImport.breadboards)
    setBreadboard(normImport.breadboard)
    setPendingPin(null)
    setSelection(new Set())
    setActiveItem(null)
    dragSessionRef.current = null
    setDragPreview(null)
    setBreadboardFeedback(null)
    marqueeSessionRef.current = null
    setMarqueeRect(null)
    justFinishedMarqueeWithSelectionRef.current = false
    historyManagerRef.current.clear()
    // MB-VIS-CANVAS-052 : un Document importé ne conserve jamais le focus/
    // l'échelle locale du circuit précédemment chargé.
    setFocusedComponentId(null)
    setLocalScale(LOCAL_SCALE_DEFAULT)
    // MB-ARDUINO-BRIDGE-001 (§5/§17 du Blueprint) : un Document importé ne
    // doit jamais hériter de l'état runtime du circuit précédemment chargé.
    orchestrators.clear()
  }, [orchestrators])

  const startSimulation = useCallback(() => setSimulationActive(true), [])
  const stopSimulation = useCallback(() => setSimulationActive(false), [])
  // MB-VIS-CANVAS-050 : zoomIn/zoomOut restent des pas fixes de 0.1 borné
  // [0.5,2] (comportement 049 strictement préservé — mêmes tests), mais
  // ancrent désormais le zoom au CENTRE du Canvas plutôt que de laisser le
  // coin (0,0) fixe implicitement (ancien comportement quand seul `zoom`
  // existait) — ancrage déterministe requis par D4 pour un bouton (pas de
  // position de curseur pertinente ici, contrairement à la molette). Dans
  // l'environnement de test (jsdom, `getBoundingClientRect()` renvoie un
  // rect nul), l'ancre retombe sur (0,0) : translateX/Y restent à 0, seul
  // `zoom` change — comportement numériquement identique à avant ce ticket.
  const zoomIn = useCallback(() => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    const anchorX = rect ? rect.width / 2 : 0
    const anchorY = rect ? rect.height / 2 : 0
    setViewport((v) => zoomViewportAtScreenPoint(v, anchorX, anchorY, +(v.zoom + 0.1).toFixed(2)))
  }, [canvasRef])
  const zoomOut = useCallback(() => {
    const rect = canvasRef?.current?.getBoundingClientRect()
    const anchorX = rect ? rect.width / 2 : 0
    const anchorY = rect ? rect.height / 2 : 0
    setViewport((v) => zoomViewportAtScreenPoint(v, anchorX, anchorY, +(v.zoom - 0.1).toFixed(2)))
  }, [canvasRef])
  const toggleGrid = useCallback(() => setShowGrid((v) => !v), [])
  // MB-VIS-COMP-003 : la garde ne teste plus littéralement le type concret
  // ("BUTTON") mais la capacité déclarative interaction.type === "momentary"
  // (componentDefinitions.js, introduite par MB-VIS-COMP-002). Un futur type
  // déclarant cette même capacité fonctionne ici sans modification de ce
  // fichier. Infrastructure strictement inchangée : mutation transitoire
  // hors historique (A1.6) — voir DÉCISION ARCHITECTURALE du rapport
  // MB-VIS-COMP-003 sur la non-unification avec toggleLatchingButton.
  const setButtonState = useCallback((uid, state) => {
    if (!uid) return
    if (state !== "pressed" && state !== "released") return

    setComponents((prev) =>
      prev.map((c) => {
        // A1.6 : mutation d'état transitoire, hors historique.
        // Garde d'idempotence : aucune modification si l'état est inchangé.
        if (c.uid !== uid || getComponentDef(c.type)?.interaction?.type !== "momentary" || c.state === state) {
          return c
        }
        return { ...c, state }
      })
    )
  }, [])

  // MB-VIS-COMP-003 : idem, capacité interaction.type === "latching" au lieu
  // du type concret "BUTTON_LATCHING". Infrastructure inchangée : passe par
  // ToggleLatchingButtonCommand + HistoryManager (Undo/Redo préservé —
  // ToggleLatchingButtonCommand ne teste déjà aucun type concret).
  const toggleLatchingButton = useCallback((uid) => {
    const comp = components.find(c => c.uid === uid && getComponentDef(c.type)?.interaction?.type === "latching")
    if (!comp) return

    const oldState = comp.state
    const newState = oldState === "on" ? "off" : "on"

    const command = new ToggleLatchingButtonCommand(
      documentApi,
      uid,
      oldState,
      newState
    )
    historyManagerRef.current.execute(command)
  }, [components, documentApi])
  const setThemeMode = useCallback((mode) => { if (mode !== "dark" && mode !== "light") return; setTheme(mode) }, [])

  return useMemo(() => ({
  wireGesture,
  startWireGesture,
  canvasRef,
  // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001) : componentsForRender (aperçu
  // de drag superposé à safeComponents) — jamais safeComponents seul,
  // sinon le rendu ne refléterait pas l'aperçu de drag en cours.
  components: componentsForRender,
  wires: safeWires,
  // MB-BREADBOARD-002 (Blueprint §8) : exposé pour Breadboard.jsx (Presentation,
  // lecture seule) — null tant qu'aucun ADD_BREADBOARD n'a été dispatché.
  // MB-BREADBOARD-006 (CSA Ruling — Option B, §6) : breadboardForRender (et
  // non plus l'état brut) — même patron que components/componentsForRender
  // ci-dessus, reflète l'aperçu de drag pendant un déplacement du breadboard.
  breadboard: breadboardForRender,
  // FT-C-BREAD-MULTI-001-A : collection canonique multi-breadboard.
  breadboards,
  // FT-C-BREAD-MULTI-001-D : projection preview-aware de la collection —
  // consommée par SimulationCanvas pour rendre N <Breadboard> / N
  // <BreadboardWireEndpoints>. `breadboard` (singulier) reste une projection
  // transitoire (breadboards[0]) pour les consommateurs résiduels.
  breadboardsForRender,
  // MB-BREADBOARD-003 (Blueprint §3/§5) : exposé pour Breadboard.jsx.
  // FT-C-BREAD-MULTI-001-D : désormais Map<breadboardId, { draggedIds:Set, valid }>
  // (feedback scopé par carte) ou null.
  breadboardFeedback,
  // MB-BREADBOARD-008 (O5) : aperçu de drop Sidebar — voir déclaration plus
  // haut dans ce hook. `null` en dehors d'un drag Sidebar actif.
  breadboardInsertPreview,
  wirePaths,
  connectedPins,
  pinSignals,

  pendingPin,
  isWiringActive,

  selection,
  activeItem,

  simulationActive,
  // MB-VIS-CANVAS-050 : `viewport` est désormais le SEUL état de zoom/pan —
  // `zoom` reste exposé comme alias dérivé (`viewport.zoom`) pour tout
  // consommateur/test existant (049) qui le lit directement, jamais une
  // seconde source de vérité.
  viewport,
  zoom: viewport.zoom,
  showGrid,
  theme,

  // MB-VIS-CANVAS-052 : focus de composant (state stable, bas débit) +
  // échelle visuelle locale (state haute fréquence — voir CircuitContext.jsx
  // pour la répartition exacte entre CircuitContext et
  // CircuitInteractionContext, même patron que `viewport`/MB-VIS-CANVAS-051).
  focusedComponentId,
  localScale,
  focusComponent,
  exitFocus,
  adjustLocalScale,

  addComponent,
  addWire,
  addBreadboard,
  clearCircuit,
  onPinClick,
  cancelWiring,
  isPinPending,
  isPinConnected,

  // MB-BREADBOARD-008 (O1/O2/O5/O6) : cycle de vie de l'aperçu de drop
  // Sidebar — consommés par Sidebar.jsx (dragstart/dragend) et
  // SimulationCanvas.jsx (dragover/dragleave/drop).
  startSidebarComponentDrag,
  updateSidebarComponentDragPosition,
  endSidebarComponentDrag,

  // MB-VIS-005 (ruling CSA du 2026-08-21, Phase E) : mutation atomique
  // unique (création/déplacement/suppression de waypoints composent toutes
  // le nouveau tableau complet côté Presentation puis appellent cette seule
  // fonction) et déclenchement du drag d'un waypoint existant.
  updateWireWaypoints,
  startWaypointDrag,

  startDrag,
  // MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§6) : déclenchement du drag
  // du breadboard — même patron d'exposition que startDrag/startWaypointDrag.
  startBreadboardDrag,
  startSimulation,
  stopSimulation,
  zoomIn,
  zoomOut,
  // MB-VIS-CANVAS-050 : navigation de viewport — pan (geste dédié, consommé
  // par SimulationCanvas.jsx), zoom orienté curseur (molette), reset,
  // fit-to-content/sélection et primitive générique de centrage (D9,
  // réutilisable par un futur focus composant — non implémenté ici).
  startPan,
  zoomAtScreenPoint,
  zoomByFactorAtScreenPoint,
  resetViewport,
  fitToContent,
  fitToSelection,
  centerViewportOnRect,
  centerViewportOnPoint,
  exportCircuit,
  importCircuit,
  toggleGrid,
  setThemeMode,

  setButtonState,

  selectOnly,
  toggleLatchingButton,
  toggleSelection,
  isSelected,
  clearSelection,
  deleteSelection,

  selectItem,
  deselectWire,
  deleteSelectedWire,

  removeWire,
  removeComponent,
  removeConnectedWires,
  deleteComponent,

  updateComponentPositions,

  startMarquee,
  cancelMarquee,
  resetMarqueeClickFlag,
  marqueeRect,

  undo,
  redo,
  canUndo,
  canRedo,
  getUndoCount,
}), [
  wireGesture,
  startWireGesture,
  canvasRef,
  componentsForRender,
  safeWires,
  breadboardForRender,
  breadboards,
  breadboardsForRender,
  breadboardFeedback,
  breadboardInsertPreview,
  wirePaths,
  connectedPins,
  pinSignals,

  pendingPin,
  isWiringActive,

  selection,
  activeItem,

  simulationActive,
  viewport,
  showGrid,
  theme,

  focusedComponentId,
  localScale,
  focusComponent,
  exitFocus,
  adjustLocalScale,

  addComponent,
  addWire,
  addBreadboard,
  clearCircuit,
  onPinClick,
  cancelWiring,
  isPinPending,
  isPinConnected,

  startSidebarComponentDrag,
  updateSidebarComponentDragPosition,
  endSidebarComponentDrag,

  updateWireWaypoints,
  startWaypointDrag,

  startDrag,
  startBreadboardDrag,
  startSimulation,
  stopSimulation,
  zoomIn,
  zoomOut,
  startPan,
  zoomAtScreenPoint,
  zoomByFactorAtScreenPoint,
  resetViewport,
  fitToContent,
  fitToSelection,
  centerViewportOnRect,
  centerViewportOnPoint,
  exportCircuit,
  importCircuit,
  toggleGrid,
  setThemeMode,
  setButtonState,

  selectOnly,
  toggleLatchingButton,
  toggleSelection,
  isSelected,
  clearSelection,
  deleteSelection,

  selectItem,
  deselectWire,
  deleteSelectedWire,

  removeWire,
  removeComponent,
  removeConnectedWires,
  deleteComponent,

  updateComponentPositions,

  startMarquee,
  cancelMarquee,
  resetMarqueeClickFlag,
  marqueeRect,

  undo,
  redo,
  canUndo,
  canRedo,
  getUndoCount,
])
}

