import { getComponentDef } from "../config/componentDefinitions.js"

export function normalizeRotation(value) {
  return Number.isFinite(value) && value % 90 === 0 ? ((value % 360) + 360) % 360 : 0
}

export function canRotateComponent(component) {
  const def = getComponentDef(component?.type)
  return Boolean(def && def.rotatable !== false)
}

export function getComponentRotation(component) {
  return canRotateComponent(component) ? normalizeRotation(component?.rotation) : 0
}

/** Quarter-turn around the component centre, in document coordinates. */
export function rotateLocalPoint(def, point, rotation) {
  const x = point.dx - def.width / 2
  const y = point.dy - def.height / 2
  switch (normalizeRotation(rotation)) {
    case 90: return { dx: def.width / 2 - y, dy: def.height / 2 + x }
    case 180: return { dx: def.width / 2 - x, dy: def.height / 2 - y }
    case 270: return { dx: def.width / 2 + y, dy: def.height / 2 - x }
    default: return { dx: point.dx, dy: point.dy }
  }
}

export function orientComponentDefinition(def, rotation) {
  if (!def || !normalizeRotation(rotation) || def.rotatable === false) return def
  return {
    ...def,
    pins: def.pins.map(pin => ({
      ...pin,
      ...rotateLocalPoint(def, pin, rotation),
      ...(pin.contacts ? { contacts: pin.contacts.map(contact => ({
        ...contact, ...rotateLocalPoint(def, contact, rotation),
      })) } : {}),
    })),
  }
}

export function getOrientedComponentDef(component) {
  return orientComponentDefinition(getComponentDef(component?.type), getComponentRotation(component))
}

export function getRotatedBounds(component) {
  const def = getComponentDef(component?.type)
  const quarter = getComponentRotation(component) % 180 !== 0
  const width = quarter ? def.height : def.width
  const height = quarter ? def.width : def.height
  return {
    x: component.x + (def.width - width) / 2,
    y: component.y + (def.height - height) / 2,
    width, height,
  }
}
