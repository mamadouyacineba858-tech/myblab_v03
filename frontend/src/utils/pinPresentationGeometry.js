/**
 * Presentation-only pin coordinates.
 *
 * Electrical pin coordinates remain canonical in componentDefinitions.js and
 * continue to drive simulation/connectivity/breadboard placement. This module
 * only defines where a connector is drawn and where a wire visually lands.
 */

const LED_VISUAL_PINS = {
  anode: { x: 28, y: 68 },
  cathode: { x: 52, y: 68 },
}

/**
 * Resolve the presentation coordinate of a component pin.
 * Falls back to the canonical electrical coordinate for every component and
 * every pin that has no presentation override.
 */
export function getPinPresentationPosition(component, pinDef) {
  if (!component || !pinDef) return null

  if (component.type === "LED" && LED_VISUAL_PINS[pinDef.id]) {
    const visual = LED_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  }

  const x = component.x + pinDef.dx
  const y = component.y + pinDef.dy
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

export function getLedVisualPinPosition(pinId) {
  const visual = LED_VISUAL_PINS[pinId]
  return visual ? { ...visual } : null
}
