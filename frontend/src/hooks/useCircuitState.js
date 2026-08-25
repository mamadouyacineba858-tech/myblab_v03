import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { snapToGrid } from "../utils/grid.js"
// MB-BREADBOARD-003 (Blueprint §3) : snapping/validité de placement pendant
// le drag d'un composant existant. Fonction pure, aucun état — voir
// breadboardPlacementAdapter.js pour le contrat complet.
import { computeBreadboardPlacement } from "../utils/breadboardPlacementAdapter.js"
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
import { HistoryService } from "../core/history/HistoryService.js"
import { ValidationEngine } from "../core/validation/ValidationEngine.js"
import { createDefaultValidationRegistry } from "../core/validation/createValidationRegistry.js"

const EMPTY_MAP = new Map()

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
  const [pendingPin, setPendingPin] = useState(null)

  const [selection, setSelection] = useState(new Set())
  const [activeItem, setActiveItem] = useState(null)

  const [simulationActive, setSimulationActive] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [theme, setTheme] = useState("dark")

  const dragSessionRef = useRef(null)
  const marqueeSessionRef = useRef(null)
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

  // MB-VIS-004 : buildWirePaths ne prend plus selectedWireId (géométrie pure,
  // cf. circuitSelectors.js) — la sélection est désormais lue directement par
  // WiresLayer.jsx via isSelected(), sans variable dérivée intermédiaire ici.
  // MB-CF3-003 : componentsForRender (et non plus safeComponents) alimente la
  // géométrie visuelle des wires, afin que les wires suivent visuellement
  // l'aperçu de drag — le Document réel (safeComponents) n'est pas concerné.
  const wirePaths = useMemo(() => buildWirePaths(componentsForRender, wiresForGeometry), [componentsForRender, wiresForGeometry])
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
    const coreDoc = ReactDocumentMapper.toCore({
      components: safeComponents,
      wires: safeWires,
      breadboard,
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
}, [safeComponents, safeWires, breadboard, simulationActive, orchestrators])

  const isWiringActive = pendingPin !== null

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
    getDocument: () => ReactDocumentMapper.toCore({
      components: componentsRef.current,
      wires: wiresRef.current,
      // MB-BREADBOARD-002 : breadboardRef.current est soit null (aucun
      // breadboard), soit {id,position,layout} — ReactDocumentMapper.toCore
      // recopie cette propriété inconnue telle quelle (_copyUnknownProperties),
      // aucune extension du mapping déclaratif n'est nécessaire.
      breadboard: breadboardRef.current,
    }),
    applyDocument: (coreDocument) => {
      const reactDocument = ReactDocumentMapper.toReact(coreDocument)
      const nextComponents = (reactDocument.components || [])
        .map(normalizeComponent)
        .filter((c) => c !== null)
      const nextWires = (reactDocument.wires || [])
        .map(normalizeWire)
        .filter((w) => w !== null)
      // MB-BREADBOARD-002 : reactDocument.breadboard est absent (clé non
      // copiée par _copyUnknownProperties) aussi bien quand aucun breadboard
      // n'a jamais existé que juste après un undo (AddBreadboardHandler
      // pose alors document.breadboard = null explicitement) — ?? null
      // normalise les deux cas vers le même état "aucun breadboard".
      const nextBreadboard = reactDocument.breadboard ?? null
      // Synchronisation immédiate (pas seulement via l'effet MB-004.5) :
      // sans cela, deux dispatches successifs dans le même batch React (avant
      // tout rendu) liraient tous deux le même componentsRef/wiresRef périmé
      // via getDocument(), et le second applyDocument() écraserait le premier
      // (remplacement non fonctionnel de l'état). Vérifié empiriquement via
      // DeleteCommand.integration.test.jsx (deux addComponent() consécutifs
      // dans le même act()). Même raisonnement appliqué à breadboardRef.
      componentsRef.current = nextComponents
      wiresRef.current = nextWires
      breadboardRef.current = nextBreadboard
      setComponents(nextComponents)
      setWires(nextWires)
      setBreadboard(nextBreadboard)
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
    const snappedX = snapToGrid(x)
    const snappedY = snapToGrid(y)
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_COMPONENT", {
        componentType: type,
        position: { x: snappedX, y: snappedY },
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
  const addWire = useCallback((fromUid, fromPin, toUid, toPin) => {
    if (!fromUid || !fromPin || !toUid || !toPin) return
    if (fromUid === toUid && fromPin === toPin) return
    if (!commandBusRef.current) return
    if (wireAlreadyExists(wiresRef.current, fromUid, fromPin, toUid, toPin)) return
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_WIRE", {
        fromUid,
        fromPin,
        toUid,
        toPin,
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
  // patron que addComponent/addWire. LOCK-01 (un seul breadboard) est
  // appliqué côté Handler (refus explicite) — la garde ci-dessous
  // (documentApi.getDocument().breadboard) évite en plus un dispatch inutile
  // depuis l'UI, même précédent que la garde wireAlreadyExists() d'addWire.
  // =========================================================================
  const addBreadboard = useCallback((x = 120, y = 180) => {
    if (!commandBusRef.current) return
    if (documentApi.getDocument().breadboard) return
    try {
      const coreDocument = documentApi.getDocument()
      const command = new Command("ADD_BREADBOARD", { position: { x, y } })
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
    // interaction de pointeur active simultanément.
    if (dragSessionRef.current !== null) return
    if (marqueeSessionRef.current !== null) return
    if (pendingPin !== null) return

    const wire = wiresRef.current.find((w) => w.id === wireId)
    if (!wire || !Array.isArray(wire.waypoints) || !wire.waypoints[index]) return

    event.stopPropagation()

    const rect = canvasRef.current.getBoundingClientRect()
    const pointer = clientToCanvas(event, rect)
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

  const cancelWiring = useCallback(() => setPendingPin(null), [])

  const onPinClick = useCallback((uid, pinId) => {
    if (!uid || !pinId) return

    // Garde I-M1 : vérifier qu'aucune autre interaction n'est active
    if (dragSessionRef.current !== null) return
    if (marqueeSessionRef.current !== null) return

    const current = { uid, pinId }
    if (!pendingPin) { setPendingPin(current); return }
    setPendingPin(null)
    if (pendingPin.uid === uid && pendingPin.pinId === pinId) return
    addWire(pendingPin.uid, pendingPin.pinId, uid, pinId)
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

  const selectMarquee = useCallback((componentIds, wireIds, keepExisting = false) => {
    const totalItems = (componentIds?.size || 0) + (wireIds?.size || 0)
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
    if (pendingPin !== null) return

    event.stopPropagation()

    // TODO MB-003.6 : utiliser setPointerCapture(event.pointerId)

    const selectedIds = getSelectedComponentIds()
    const idsToDrag = selectedIds.has(uid) ? selectedIds : new Set([uid])

    const rect = canvasRef.current.getBoundingClientRect()
    const pointer = clientToCanvas(event, rect)

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
  // POINTER INTERACTION SYSTEM Marquee (MB-003.4)
  // =========================================================================

  const startMarquee = useCallback((event) => {
    if (!canvasRef?.current) return

    // Garde I-M1 : vérifier qu'aucune autre interaction n'est active
    if (dragSessionRef.current !== null) return
    if (pendingPin !== null) return

    const rect = canvasRef.current.getBoundingClientRect()
    const pointer = clientToCanvas(event, rect)

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

  const updateMarquee = useCallback((event) => {
    const session = marqueeSessionRef.current
    if (!session) return
    if (!canvasRef?.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const pointer = clientToCanvas(event, rect)

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

    const wireIds = new Set()
    wirePaths.forEach((path) => {
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

    const hadSelection = componentIds.size > 0 || wireIds.size > 0
    if (hadSelection) {
      selectMarquee(componentIds, wireIds, ctrlKey)
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
  }, [components, wirePaths, selectMarquee, clearSelection])

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
  // POINTER INTERACTION SYSTEM  Gestion des événements (useEffect)
  // =========================================================================

  useEffect(() => {
    const handlePointerMove = (event) => {
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
        const pointer = clientToCanvas(event, rect)
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
      const pointer = clientToCanvas(event, rect)
      const deltaX = pointer.x - session.pointerStart.x
      const deltaY = pointer.y - session.pointerStart.y

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
      const breadboard = breadboardRef.current
      let feedback = null
      session.componentsStart.forEach((startPos, uid) => {
        const raw = { x: startPos.startX + deltaX, y: startPos.startY + deltaY }
        const placement = breadboard
          ? computeBreadboardPlacement(
              breadboard,
              startPos.type,
              raw,
              componentsRef.current.filter((c) => c.uid !== uid)
            )
          : { breadboardActive: false }

        if (placement.breadboardActive) {
          positionsMap.set(uid, placement.position)
          if (!feedback) feedback = { draggedIds: new Set(), valid: true }
          feedback.draggedIds.add(uid)
          if (!placement.valid) feedback.valid = false
        } else {
          positionsMap.set(uid, {
            x: snapToGrid(raw.x),
            y: snapToGrid(raw.y)
          })
        }
      })

      if (positionsMap.size > 0) {
        session.livePositions = positionsMap
        setDragPreview(positionsMap)
      }
      setBreadboardFeedback(feedback)
    }

    const handlePointerUp = () => {
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
  }, [canvasRef, updateMarquee, endMarquee, documentApi, updateWireWaypoints])

  // =========================================================================
  // WRAPPERS DE COMPATIBILITé
  // =========================================================================

  const selectItem = useCallback((item) => selectOnly(item), [selectOnly])
  const deselectWire = useCallback(() => clearSelection(), [clearSelection])
  const deleteSelectedWire = useCallback(() => deleteSelection(), [deleteSelection])

  const clearCircuit = useCallback(() => {
    setComponents([])
    setWires([])
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
    // MB-ARDUINO-BRIDGE-001 (§5/§17 du Blueprint) : un nouveau Document (vide)
    // ne doit jamais hériter de l'état runtime d'un circuit précédent.
    orchestrators.clear()
  }, [orchestrators])

  // MB-BREADBOARD-003 (Blueprint §6, AC-23) : `breadboard` était absent de
  // l'objet exporté et ignoré à l'import (lacune préexistante, explicitement
  // mise hors scope par MB-BREADBOARD-002 Delivery Report §5.2 faute d'AC
  // qui l'exigeait alors — AC-23 de ce ticket la rend explicitement in-scope).
  const exportCircuit = useCallback(
    () => ({ version: 1, components: safeComponents, wires: safeWires, breadboard }),
    [safeComponents, safeWires, breadboard]
  )

  const importCircuit = useCallback((data) => {
    if (!data || typeof data !== "object") return
    setComponents(Array.isArray(data.components) ? data.components.map(normalizeComponent).filter((c) => c !== null) : [])
    setWires(Array.isArray(data.wires) ? data.wires.map(normalizeWire).filter((w) => w !== null) : [])
    // MB-BREADBOARD-003 (AC-23) : restaure document.breadboard tel quel (même
    // repli ?? null qu'applyDocument, MB-BREADBOARD-002). breadboardRef se
    // resynchronise via son propre useEffect existant (safeComponents/
    // safeWires suivent le même patron aujourd'hui pour componentsRef/
    // wiresRef dans importCircuit — pas de synchronisation manuelle
    // immédiate nécessaire ici, à la différence d'applyDocument).
    setBreadboard(data.breadboard ? data.breadboard : null)
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
    // MB-ARDUINO-BRIDGE-001 (§5/§17 du Blueprint) : un Document importé ne
    // doit jamais hériter de l'état runtime du circuit précédemment chargé.
    orchestrators.clear()
  }, [orchestrators])

  const startSimulation = useCallback(() => setSimulationActive(true), [])
  const stopSimulation = useCallback(() => setSimulationActive(false), [])
  const zoomIn = useCallback(() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2))), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2))), [])
  const toggleGrid = useCallback(() => setShowGrid((v) => !v), [])
  const setButtonState = useCallback((uid, state) => {
    if (!uid) return
    if (state !== "pressed" && state !== "released") return

    setComponents((prev) =>
      prev.map((c) => {
        // A1.6 : mutation d'Ã©tat transitoire, hors historique.
        // Garde d'idempotence : aucune modification si l'état est inchangé.
        if (c.uid !== uid || c.type !== "BUTTON" || c.state === state) {
          return c
        }
        return { ...c, state }
      })
    )
  }, [])

  const toggleLatchingButton = useCallback((uid) => {
    const comp = components.find(c => c.uid === uid && c.type === "BUTTON_LATCHING")
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
  canvasRef,
  // MB-CF3-003 (ruling CSA-CF3-003-MOVE-001) : componentsForRender (aperçu
  // de drag superposé à safeComponents) — jamais safeComponents seul,
  // sinon le rendu ne refléterait pas l'aperçu de drag en cours.
  components: componentsForRender,
  wires: safeWires,
  // MB-BREADBOARD-002 (Blueprint §8) : exposé pour Breadboard.jsx (Presentation,
  // lecture seule) — null tant qu'aucun ADD_BREADBOARD n'a été dispatché.
  breadboard,
  // MB-BREADBOARD-003 (Blueprint §3/§5) : exposé pour Breadboard.jsx — null
  // en dehors d'un drag, sinon { draggedIds, valid } (voir déclaration plus
  // haut dans ce hook).
  breadboardFeedback,
  wirePaths,
  connectedPins,
  pinSignals,

  pendingPin,
  isWiringActive,

  selection,
  activeItem,

  simulationActive,
  zoom,
  showGrid,
  theme,

  addComponent,
  addWire,
  addBreadboard,
  clearCircuit,
  onPinClick,
  cancelWiring,
  isPinPending,
  isPinConnected,

  // MB-VIS-005 (ruling CSA du 2026-08-21, Phase E) : mutation atomique
  // unique (création/déplacement/suppression de waypoints composent toutes
  // le nouveau tableau complet côté Presentation puis appellent cette seule
  // fonction) et déclenchement du drag d'un waypoint existant.
  updateWireWaypoints,
  startWaypointDrag,

  startDrag,
  startSimulation,
  stopSimulation,
  zoomIn,
  zoomOut,
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
  canvasRef,
  componentsForRender,
  safeWires,
  breadboard,
  breadboardFeedback,
  wirePaths,
  connectedPins,
  pinSignals,

  pendingPin,
  isWiringActive,

  selection,
  activeItem,

  simulationActive,
  zoom,
  showGrid,
  theme,

  addComponent,
  addWire,
  addBreadboard,
  clearCircuit,
  onPinClick,
  cancelWiring,
  isPinPending,
  isPinConnected,

  updateWireWaypoints,
  startWaypointDrag,

  startDrag,
  startSimulation,
  stopSimulation,
  zoomIn,
  zoomOut,
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

