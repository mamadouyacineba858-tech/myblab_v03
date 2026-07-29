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
  }
}
