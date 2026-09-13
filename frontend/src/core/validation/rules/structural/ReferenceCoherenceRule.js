/**
 * STR-005 — ReferenceCoherenceRule (ERROR)
 *
 * Component references must resolve to real components. MB-BREADBOARD-012
 * adds one explicit exception: a componentId encoded as a breadboard-hole
 * endpoint is coherent when the hole exists on its exact breadboard.
 * L1-WIRE-001 : resolved against the canonical `breadboards[]` collection
 * (shared resolveBreadboardHoleEndpoint primitive), never against the
 * legacy singleton `document.breadboard`.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getEffectiveWires, findComponent } from '../shared/documentHelpers.js'
import { resolveBreadboardHoleEndpoint } from '../shared/breadboardHoleEndpointResolution.js'

function isCoherentEndpoint(document, endpoint) {
  const resolved = resolveBreadboardHoleEndpoint(document, endpoint)
  return resolved.shaped && resolved.hole !== null
}

export const ReferenceCoherenceRule = {
  id: 'STR-005',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document, command)
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
