/**
 * STR-003 — WirePinsExistRule (ERROR)
 *
 * A wire endpoint may reference either a canonical component pin or a real
 * breadboard hole (MB-BREADBOARD-012). Hole endpoints are validated against
 * the existing breadboard geometry oracle; no synthetic component is added
 * to the Document.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getCanonicalEntry } from '../../../../simulator/canonicalRegistry.js'
import { getEffectiveComponents, getEffectiveWires, findComponent } from '../shared/documentHelpers.js'
import { BREADBOARD_PITCH, holeAt } from '../../../../utils/breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from '../../../../utils/breadboardWireEndpoint.js'

function checkEndpoint(document, components, endpoint) {
  if (!endpoint || !endpoint.componentId) return 'missing_component_id'

  const hole = parseBreadboardHoleEndpoint(endpoint.componentId, endpoint.pinId)
  if (hole) {
    const breadboard = document?.breadboard
    if (!breadboard || breadboard.id !== hole.breadboardId) return 'breadboard_not_found'
    const x = breadboard.position.x + hole.column * BREADBOARD_PITCH
    const y = breadboard.position.y + hole.row * BREADBOARD_PITCH
    return holeAt(breadboard, x, y) ? null : 'breadboard_hole_not_found'
  }

  const component = findComponent(components, endpoint.componentId)
  if (!component) return 'component_not_found'
  const entry = getCanonicalEntry(component.type)
  const pinExists = entry && Array.isArray(entry.pins) && entry.pins.some((p) => p.id === endpoint.pinId)
  if (!pinExists) return 'pin_not_found'
  return null
}

export const WirePinsExistRule = {
  id: 'STR-003',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document)
    const invalidEndpoints = []

    for (const wire of wires) {
      for (const [side, endpoint] of [['pinA', wire.pinA], ['pinB', wire.pinB]]) {
        const reason = checkEndpoint(document, components, endpoint)
        if (reason) {
          invalidEndpoints.push({
            wireId: wire.id,
            side,
            componentId: endpoint && endpoint.componentId,
            pinId: endpoint && endpoint.pinId,
            reason,
          })
        }
      }
    }

    if (invalidEndpoints.length === 0) return null

    return {
      id: 'STR-003',
      message:
        invalidEndpoints.length === 1
          ? `Le wire "${invalidEndpoints[0].wireId}" référence un pin, un composant ou un trou Breadboard introuvable.`
          : `${invalidEndpoints.length} extrémités de wire référencent un pin, un composant ou un trou Breadboard introuvable.`,
      explanation:
        'Chaque extrémité de wire doit référencer soit un pin déclaré d’un composant canonique, soit un trou réel du breadboard courant.',
      suggestion: 'Supprimez ou corrigez les wires référençant des endpoints invalides.',
      context: { invalidEndpoints },
    }
  },
}
