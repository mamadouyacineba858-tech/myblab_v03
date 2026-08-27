/**
 * STR-005 — ReferenceCoherenceRule (ERROR)
 *
 * Component references must resolve to real components. MB-BREADBOARD-012
 * adds one explicit exception: a componentId encoded as a breadboard-hole
 * endpoint is coherent when the hole exists on the current breadboard.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getEffectiveWires, findComponent } from '../shared/documentHelpers.js'
import { BREADBOARD_PITCH, holeAt } from '../../../../utils/breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from '../../../../utils/breadboardWireEndpoint.js'

function isCoherentEndpoint(document, endpoint) {
  if (!endpoint?.componentId) return false
  const hole = parseBreadboardHoleEndpoint(endpoint.componentId, endpoint.pinId)
  if (!hole) return false
  const breadboard = document?.breadboard
  if (!breadboard || breadboard.id !== hole.breadboardId) return false
  const x = breadboard.position.x + hole.column * BREADBOARD_PITCH
  const y = breadboard.position.y + hole.row * BREADBOARD_PITCH
  return !!holeAt(breadboard, x, y)
}

export const ReferenceCoherenceRule = {
  id: 'STR-005',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document)
    const dangling = []

    for (const wire of wires) {
      for (const endpoint of [wire.pinA, wire.pinB]) {
        if (!endpoint || !endpoint.componentId) continue
        if (isCoherentEndpoint(document, endpoint)) continue
        if (!findComponent(components, endpoint.componentId)) {
          dangling.push({ wireId: wire.id, componentId: endpoint.componentId })
        }
      }
    }

    if (dangling.length === 0) return null

    return {
      id: 'STR-005',
      message:
        dangling.length === 1
          ? `Le wire "${dangling[0].wireId}" référence un composant inexistant ("${dangling[0].componentId}").`
          : `${dangling.length} références de wire pointent vers un composant inexistant.`,
      explanation: 'Toute référence componentId dans un wire doit correspondre à un composant présent dans le Document, sauf pour un endpoint trou Breadboard valide.',
      suggestion: 'Supprimez les wires orphelins ou corrigez la référence de composant/trou.',
      context: { dangling },
    }
  },
}
