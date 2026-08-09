/**
 * engineAdapter.js
 *
 * Convertit un Document Core (ReactDocumentMapper.toCore()) vers le format
 * plat attendu par engine.js : uid/type/x/y/state/pins (composants),
 * fromUid/fromPin/toUid/toPin (wires). Composants et wires incomplets sont
 * silencieusement ignorés.
 *
 * @param {{ components: Array<object>, wires: Array<object> }} coreDocument
 * @returns {{ components: Array<object>, wires: Array<object> }}
 */

function clone(value) {
  if (value === undefined) return undefined
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value))
  }
}

export function toEngineInput(coreDocument) {
  const result = { components: [], wires: [] }

  if (!coreDocument || typeof coreDocument !== "object") {
    return result
  }

  const components = Array.isArray(coreDocument.components) ? coreDocument.components : []
  const wires = Array.isArray(coreDocument.wires) ? coreDocument.wires : []

  for (const component of components) {
    const id = component?.id
    const type = component?.type
    const x = component?.position?.x
    const y = component?.position?.y

    if (
      id === undefined || id === null ||
      type === undefined || type === null ||
      x === undefined || x === null ||
      y === undefined || y === null
    ) {
      continue
    }

    result.components.push({
      uid: id,
      type,
      x,
      y,
      parameters: clone(component.parameters),
      state: clone(component.state),
      pins: clone(component.pins),
    })
  }

  for (const wire of wires) {
    const fromUid = wire?.pinA?.componentId
    const fromPin = wire?.pinA?.pinId
    const toUid = wire?.pinB?.componentId
    const toPin = wire?.pinB?.pinId

    if (fromUid === undefined || fromUid === null || toUid === undefined || toUid === null) {
      continue
    }

    result.wires.push({ fromUid, fromPin, toUid, toPin })
  }

  return result
}