import React, { useCallback, useMemo } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "../utils/geometry.js"
import { resolveContact } from "../utils/contactModel.js"
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
  if (!pin) return null
  // FT-B-001-S3 (§10) : honore l'ancre de contact physique S2 (fromContact /
  // toContact). `resolveContact` applique le repli DÉTERMINISTE : contactId
  // absent, inconnu ou périmé ⇒ contact par défaut de LA MÊME pin canonique,
  // jamais une autre pin, jamais d'erreur (INV-S3-15, TEST S3-H/S3-L). Pour une
  // pin mono-contact, le contact par défaut est en pin.dx/dy ⇒ position
  // identique à getPinPosition() (delta zéro).
  const contact = resolveContact(pin, endpoint.contactId)
  if (!contact) return getPinPosition(component, pin)
  const x = component.x + contact.dx
  const y = component.y + contact.dy
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

/** MB-BREADBOARD-012 — renders and selects persisted wires with hole endpoints. */
export function BreadboardWiresLayer() {
  const { wires, isSelected, selectOnly, toggleSelection } = useCircuit()
  const { components, breadboard } = useCircuitInteraction()

  const paths = useMemo(() => {
    const result = []
    for (const wire of wires || []) {
      const fromHole = parseBreadboardHoleEndpoint(wire?.fromUid, wire?.fromPin)
      const toHole = parseBreadboardHoleEndpoint(wire?.toUid, wire?.toPin)
      if (!fromHole && !toHole) continue

      const from = resolveEndpoint({ uid: wire.fromUid, pinId: wire.fromPin, contactId: wire.fromContact }, components, breadboard)
      const to = resolveEndpoint({ uid: wire.toUid, pinId: wire.toPin, contactId: wire.toContact }, components, breadboard)
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
