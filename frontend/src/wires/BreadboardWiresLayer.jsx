import React, { useCallback, useMemo } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "../utils/geometry.js"
import { buildWirePath } from "./wirePath.js"
import { BREADBOARD_PITCH, holeAt } from "../utils/breadboardGeometry.js"
import { parseBreadboardHoleEndpoint } from "../utils/breadboardWireEndpoint.js"
import "./WiresLayer.css"

function resolveEndpoint(endpoint, components, breadboard) {
  if (!endpoint) return null

  const hole = parseBreadboardHoleEndpoint(endpoint.uid, endpoint.pinId)
  if (hole) {
    if (!breadboard || hole.breadboardId !== breadboard.id) return null
    const x = breadboard.position.x + hole.column * BREADBOARD_PITCH
    const y = breadboard.position.y + hole.row * BREADBOARD_PITCH
    return holeAt(breadboard, x, y) ? { x, y } : null
  }

  const component = components.find((item) => item?.uid === endpoint.uid)
  if (!component) return null
  const def = getComponentDef(component.type)
  const pin = def?.pins?.find((item) => item.id === endpoint.pinId)
  return pin ? getPinPosition(component, pin) : null
}

/** MB-BREADBOARD-012 — renders and selects persisted wires with hole endpoints. */
export function BreadboardWiresLayer() {
  const { components, wires, breadboard, isSelected, selectOnly, toggleSelection } = useCircuit()

  const paths = useMemo(() => {
    const result = []
    for (const wire of wires || []) {
      const fromHole = parseBreadboardHoleEndpoint(wire?.fromUid, wire?.fromPin)
      const toHole = parseBreadboardHoleEndpoint(wire?.toUid, wire?.toPin)
      if (!fromHole && !toHole) continue

      const from = resolveEndpoint({ uid: wire.fromUid, pinId: wire.fromPin }, components, breadboard)
      const to = resolveEndpoint({ uid: wire.toUid, pinId: wire.toPin }, components, breadboard)
      if (!from || !to) continue

      const d = buildWirePath(from, to, wire.waypoints)
      if (d) result.push({ id: wire.id, d })
    }
    return result
  }, [components, wires, breadboard])

  const handleSelect = useCallback((wireId) => (event) => {
    event.stopPropagation()
    if (event.ctrlKey || event.metaKey) {
      toggleSelection({ type: "wire", id: wireId })
    } else {
      selectOnly({ type: "wire", id: wireId })
    }
  }, [selectOnly, toggleSelection])

  if (paths.length === 0) return null

  return (
    <svg className="wires-layer wires-layer--breadboard" aria-hidden="true">
      {paths.map((path) => {
        const selected = isSelected({ type: "wire", id: path.id })
        return (
          <g key={path.id}>
            <path
              d={path.d}
              fill="none"
              stroke="transparent"
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "stroke" }}
              onClick={handleSelect(path.id)}
            />
            <path
              d={path.d}
              fill="none"
              stroke={selected ? "#22c55e" : "#f97316"}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
              aria-label={path.id}
            />
          </g>
        )
      })}
    </svg>
  )
}
