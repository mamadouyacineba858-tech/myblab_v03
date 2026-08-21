// MB-VIS-005 (correction ciblée de validation Phase E) : import explicite de
// React, conformément à la convention déjà en usage dans ce dépôt pour tout
// fichier .jsx rendu sous la configuration de test jsdom secondaire
// (frontend/vitest.config.js) — cf. context/CircuitContext.jsx,
// components/parts/ResistorPart.jsx/LedPart.jsx/DiodePart.jsx/
// CapacitorPart.jsx. Sans redondance fonctionnelle avec le runtime JSX
// automatique utilisé par le build de production (vite.config.js,
// tsconfig.app.json "jsx": "react-jsx") — build non affecté (voir rapport).
import React, { useCallback, useMemo, useState } from "react"
import "./WiresLayer.css"
import { useCircuit } from "../context/useCircuit.js"
import { getWireStrokeColor, getWireStateClassName } from "./wirePath.js"
import { getWireLogicalState, Signal } from "./wireState.js"
import { clientToCanvas, extractPointsFromPathData } from "../utils/geometry.js"
import { nearestSegmentInsertIndex } from "./waypointInsertion.js"

/**
 * Rendu d'un fil individuel (MB-VIS-004 ; poignées de waypoint MB-VIS-005).
 *
 * Extrait de WiresLayer pour porter localement l'état hover, exactement
 * comme Pin.jsx (useState local + onMouseEnter/onMouseLeave) — aucun suivi
 * de position de curseur, aucune prévisualisation (arbitrage CSA Q1,
 * 2026-08-20 : option (a) exclusivement, interactions déjà supportées).
 *
 * MB-VIS-005 (ruling CSA du 2026-08-21, Phase E) : les poignées de waypoint
 * sont des <circle>, gatées par SÉLECTION (pas par survol) — un type
 * d'élément interactif nouveau et distinct de la prévisualisation de tracé
 * écartée par l'arbitrage Q1, qui ne visait que le flux de création de wire
 * MB-VIS-004. L'invariant « exactement deux <path> par fil » n'est pas
 * affecté : les poignées ne sont jamais des <path>.
 */
function WireVisual({
  id,
  d,
  fromUid,
  fromPin,
  toUid,
  toPin,
  pinSignals,
  selected,
  onSelect,
  waypoints,
  onWaypointPointerDown,
  onWaypointDoubleClick,
  onHitzoneDoubleClick,
}) {
  const [hover, setHover] = useState(false)

  const { signal } = getWireLogicalState({ fromUid, fromPin, toUid, toPin }, pinSignals)
  const stroke = getWireStrokeColor({ selected, signal })
  const stateClassName = getWireStateClassName({ signal })
  const isFloating = signal === Signal.FLOATING

  const visibleClassName = [
    "wires-layer__wire",
    stateClassName,
    hover && "wires-layer__wire--hover",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <g>
      {/* Hitzone invisible pour faciliter le clic et détecter le survol */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wires-layer__hitzone"
        style={{ pointerEvents: 'stroke' }}
        onClick={onSelect}
        onDoubleClick={selected ? onHitzoneDoubleClick : undefined}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />

      {/* Rendu visuel du fil */}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isFloating ? "6 4" : undefined}
        className={visibleClassName}
        style={{ pointerEvents: 'none' }}
        aria-label={id}
      />

      {/*
        MB-VIS-005 (Phase E) : poignées de waypoint existant — déplacement
        (pointerdown, délégué à startWaypointDrag) et suppression
        (dblclick). Visibles uniquement quand ce wire est sélectionné.
      */}
      {selected &&
        Array.isArray(waypoints) &&
        waypoints.map((wp, index) => (
          <circle
            key={index}
            cx={wp.x}
            cy={wp.y}
            r={5}
            className="wires-layer__waypoint-handle"
            onPointerDown={(e) => onWaypointPointerDown(e, index)}
            onDoubleClick={(e) => onWaypointDoubleClick(e, index)}
          />
        ))}
    </g>
  )
}

export function WiresLayer({ wirePaths = [] }) {
  const paths = Array.isArray(wirePaths) ? wirePaths : []

  // pinSignals et wires sont déjà exposés par useCircuit() (useCircuitState.js) —
  // aucun nouveau prop threading requis depuis SimulationCanvas.jsx.
  // MB-VIS-005 (ruling CSA du 2026-08-21) : canvasRef/updateWireWaypoints/
  // startWaypointDrag sont eux aussi déjà exposés par useCircuitState.js —
  // gardés optionnels ci-dessous (contexte de test minimal existant,
  // WiresLayer.test.jsx, ne les fournit pas).
  const {
    isSelected,
    selectOnly,
    toggleSelection,
    wires,
    pinSignals,
    canvasRef,
    updateWireWaypoints,
    startWaypointDrag,
  } = useCircuit()

  // Jointure géométrie (wirePaths: {id, d}, géométrie pure — cf. circuitSelectors.js)
  // ↔ topologie (wires: {id, fromUid, fromPin, toUid, toPin, waypoints}), par id.
  const wiresById = useMemo(() => {
    const map = new Map()
    if (Array.isArray(wires)) {
      for (const wire of wires) {
        if (wire?.id) map.set(wire.id, wire)
      }
    }
    return map
  }, [wires])

  const handleSelect = useCallback(
    (wireId) => (e) => {
      e.stopPropagation()
      const isMultiSelect = e.ctrlKey || e.metaKey
      if (isMultiSelect) {
        toggleSelection({ type: 'wire', id: wireId })
      } else {
        selectOnly({ type: 'wire', id: wireId })
      }
    },
    [selectOnly, toggleSelection]
  )

  // MB-VIS-005 (Phase E) : déplacement — délègue entièrement à
  // startWaypointDrag() exposé par useCircuitState.js, qui gère lui-même
  // l'aperçu local (waypointPreview) et le commit CF3 unique au
  // relâchement (updateWireWaypoints, une seule fois, seulement si
  // changement).
  const handleWaypointPointerDown = useCallback(
    (wireId) => (event, index) => {
      event.stopPropagation()
      if (typeof startWaypointDrag !== 'function') return
      startWaypointDrag(event, wireId, index)
    },
    [startWaypointDrag]
  )

  // MB-VIS-005 (Phase E) : suppression — composition locale du nouveau
  // tableau complet (filter) côté Presentation, puis une seule mutation
  // CF3 via updateWireWaypoints() ; aucune mutation granulaire
  // (removeWireWaypoint) n'est introduite, conformément au ruling.
  const handleWaypointDoubleClick = useCallback(
    (wireId) => (event, index) => {
      event.stopPropagation()
      if (typeof updateWireWaypoints !== 'function') return
      const wire = wiresById.get(wireId)
      const waypoints = Array.isArray(wire?.waypoints) ? wire.waypoints : []
      const next = waypoints.filter((_, i) => i !== index)
      updateWireWaypoints(wireId, next)
    },
    [updateWireWaypoints, wiresById]
  )

  // MB-VIS-005 (Phase E) : création — double-clic sur le tracé (hitzone),
  // uniquement lorsque le wire est déjà sélectionné (WireVisual ne câble
  // ce gestionnaire que dans ce cas). Index d'insertion dérivé du tracé
  // effectivement rendu (extractPointsFromPathData, réutilisé — pas de
  // résolution indépendante de position de pin ici), via
  // nearestSegmentInsertIndex (waypointInsertion.js). Composition locale
  // du tableau complet (splice) puis une seule mutation CF3 ; aucune
  // mutation granulaire (addWireWaypoint) n'est introduite.
  const handleHitzoneDoubleClick = useCallback(
    (wireId, pathD) => (event) => {
      event.stopPropagation()
      if (typeof updateWireWaypoints !== 'function') return
      if (!canvasRef?.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const clickPoint = clientToCanvas(event, rect)
      const points = extractPointsFromPathData(pathD)
      const wire = wiresById.get(wireId)
      const waypoints = Array.isArray(wire?.waypoints) ? wire.waypoints : []
      const insertIndex = nearestSegmentInsertIndex(points, clickPoint)
      const next = [...waypoints]
      next.splice(insertIndex, 0, { x: clickPoint.x, y: clickPoint.y })
      updateWireWaypoints(wireId, next)
    },
    [updateWireWaypoints, wiresById, canvasRef]
  )

  return (
    <svg className="wires-layer" aria-hidden="true">
      {paths.map((p) => {
        if (!p?.id || !p?.d) return null
        const wire = wiresById.get(p.id)
        const selected = isSelected({ type: 'wire', id: p.id })
        return (
          <WireVisual
            key={p.id}
            id={p.id}
            d={p.d}
            fromUid={wire?.fromUid}
            fromPin={wire?.fromPin}
            toUid={wire?.toUid}
            toPin={wire?.toPin}
            pinSignals={pinSignals}
            selected={selected}
            onSelect={handleSelect(p.id)}
            waypoints={wire?.waypoints}
            onWaypointPointerDown={handleWaypointPointerDown(p.id)}
            onWaypointDoubleClick={handleWaypointDoubleClick(p.id)}
            onHitzoneDoubleClick={handleHitzoneDoubleClick(p.id, p.d)}
          />
        )
      })}
    </svg>
  )
}
