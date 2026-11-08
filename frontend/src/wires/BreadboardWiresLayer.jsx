import React, { useMemo } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "../utils/geometry.js"
import { resolveContact } from "../utils/contactModel.js"
import { buildWirePath } from "./wirePath.js"
import { WiresLayer } from "./WiresLayer.jsx"
import { BREADBOARD_PITCH, holeAt } from "../utils/breadboardGeometry.js"
import { parseBreadboardHoleEndpoint } from "../utils/breadboardWireEndpoint.js"
import "./WiresLayer.css"

function resolveEndpoint(endpoint, components, breadboards) {
  if (!endpoint) return null

  const hole = parseBreadboardHoleEndpoint(endpoint.uid, endpoint.pinId)
  if (hole) {
    // FT-C-BREAD-MULTI-001-E : l'endpoint de trou est résolu contre EXACTEMENT
    // le breadboard de son `breadboardId` dans la collection canonique — plus
    // aucun repli sur `breadboards[0]`. Un fil câblé sur un trou de la carte B
    // ou C se rend donc correctement.
    const board = (breadboards || []).find((b) => b && b.id === hole.breadboardId)
    if (!board || !board.position) return null
    const x = board.position.x + hole.column * BREADBOARD_PITCH
    const y = board.position.y + hole.row * BREADBOARD_PITCH
    return holeAt(board, x, y) ? { x, y } : null
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
  const { wires } = useCircuit()
  // FT-C-BREAD-MULTI-001-E : collection preview-aware, jamais la projection
  // singleton. Chaque endpoint de trou est résolu contre SA carte (par id).
  const { components, breadboardsForRender } = useCircuitInteraction()

  const paths = useMemo(() => {
    const breadboards = Array.isArray(breadboardsForRender) ? breadboardsForRender : []
    const result = []
    for (const wire of wires || []) {
      const fromHole = parseBreadboardHoleEndpoint(wire?.fromUid, wire?.fromPin)
      const toHole = parseBreadboardHoleEndpoint(wire?.toUid, wire?.toPin)
      if (!fromHole && !toHole) continue

      const from = resolveEndpoint({ uid: wire.fromUid, pinId: wire.fromPin, contactId: wire.fromContact }, components, breadboards)
      const to = resolveEndpoint({ uid: wire.toUid, pinId: wire.toPin, contactId: wire.toContact }, components, breadboards)
      if (!from || !to) continue

      const d = buildWirePath(from, to, wire.waypoints)
      if (d) result.push({ id: wire.id, d })
    }
    return result
  }, [components, wires, breadboardsForRender])

  if (paths.length === 0) return null

  // Breadboard and component-to-component cables must share the exact same
  // visual and interaction surface: insulation palette, rounded bends,
  // selection, waypoint insertion, drag and removal. Geometry above remains
  // anchored to the canonical breadboard hole and physical contact.
  return <WiresLayer wirePaths={paths} className="wires-layer--breadboard" showPreview={false} />
}
