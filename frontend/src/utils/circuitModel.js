import { snapToGrid } from "./grid.js"

/**
 * Normalise un composant pour le rendu (évite undefined / NaN).
 * @param {object | null | undefined} component
 * @returns {object | null}
 */
export function normalizeComponent(component) {
  if (!component?.uid || !component?.type) return null

  return {
    uid: String(component.uid),
    type: String(component.type),
    x: Number.isFinite(component.x) ? snapToGrid(component.x) : 0,
    y: Number.isFinite(component.y) ? snapToGrid(component.y) : 0,
    pins: Array.isArray(component.pins) ? [...component.pins] : [],
    ...(component.type === "BUTTON"
      ? { state: component.state === "pressed" ? "pressed" : "released" }
      : {}),
    ...(component.type === "BUTTON_LATCHING"
      ? { state: component.state === "on" ? "on" : "off" }
      : {}),
    }
}

/**
 * Normalise le tableau de waypoints d'un wire (MB-VIS-005, ADR-008 amendé).
 *
 * Préserve intégralement chaque point {x, y} numérique et fini, dans son
 * ordre persistant (AC-13, docs/pmo/tickets/MB-VIS-005.md §5.1/§9.13/
 * G-11). Un waypoint malformé (coordonnée manquante, non numérique, NaN,
 * Infinity) est écarté défensivement ici — en pratique il ne devrait
 * jamais atteindre ce point : la Validation CF3 pré-exécution (STR-006,
 * ADR-010) rejette toute mutation UPDATE_WIRE_WAYPOINTS malformée avant
 * qu'elle n'atteigne le Document. Absence de `waypoints` normalisée en
 * tableau vide (rétrocompatibilité stricte, AC-08).
 *
 * @param {Array | undefined} waypoints
 * @returns {Array<{x: number, y: number}>}
 */
export function normalizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) return []
  return waypoints
    .filter((wp) => wp && Number.isFinite(wp.x) && Number.isFinite(wp.y))
    .map((wp) => ({ x: wp.x, y: wp.y }))
}

/**
 * @param {object} wire
 * @returns {object | null}
 */
export function normalizeWire(wire) {
  if (!wire?.id || !wire.fromUid || !wire.fromPin || !wire.toUid || !wire.toPin) {
    return null
  }
  return {
    id: String(wire.id),
    fromUid: String(wire.fromUid),
    fromPin: String(wire.fromPin),
    toUid: String(wire.toUid),
    toPin: String(wire.toPin),
    // MB-VIS-005 : les trois chemins d'appel de normalizeWire() (safeWires,
    // documentApi.applyDocument, import de document — cf.
    // frontend/src/hooks/useCircuitState.js) partagent cette même fonction ;
    // les corriger tous les trois revient donc à corriger ce seul point,
    // exactement comme le prévoit la dépendance obligatoire du ticket.
    waypoints: normalizeWaypoints(wire.waypoints),
  }
}
