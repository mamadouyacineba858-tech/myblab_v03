/**
 * engineAdapter.js
 *
 * Convertit un Document Core vers le format plat attendu par engine.js.
 * MB-BREADBOARD-012 : les wires qui utilisent un endpoint trou sont résolus
 * par breadboardConnectivity.js et ne doivent donc pas être transmis comme
 * des références de composants fictifs au moteur.
 */
import { deriveBreadboardVirtualWiresBridge } from '../utils/breadboardConnectivity.js'
import { isBreadboardHoleEndpoint } from '../utils/breadboardWireEndpoint.js'

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

    if (isBreadboardHoleEndpoint(fromUid, fromPin) || isBreadboardHoleEndpoint(toUid, toPin)) {
      continue
    }

    if (fromUid === undefined || fromUid === null || toUid === undefined || toUid === null) {
      continue
    }

    result.wires.push({ fromUid, fromPin, toUid, toPin })
  }

  // Explicit hole-terminated wires are translated into real pin-to-pin edges
  // through their breadboard electrical groups. Existing breadboard virtual
  // connectivity remains the single source of truth for that derivation.
  result.wires.push(...deriveBreadboardVirtualWiresBridge(coreDocument))

  return result
}
