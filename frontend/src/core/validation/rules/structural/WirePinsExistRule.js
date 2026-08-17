/**
 * STR-003 — WirePinsExistRule (ERROR)
 * Chaque extrémité de wire doit référencer un composant existant et un pin
 * existant pour ce composant, résolu via canonicalRegistry.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getCanonicalEntry } from '../../../../simulator/canonicalRegistry.js'
import { getEffectiveComponents, getEffectiveWires, findComponent } from '../shared/documentHelpers.js'

function checkEndpoint(components, endpoint) {
  if (!endpoint || !endpoint.componentId) return 'missing_component_id'
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
        const reason = checkEndpoint(components, endpoint)
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
          ? `Le wire "${invalidEndpoints[0].wireId}" référence un pin ou un composant introuvable.`
          : `${invalidEndpoints.length} extrémités de wire référencent un pin ou un composant introuvable.`,
      explanation:
        'Chaque extrémité de wire doit référencer un composant existant et un pin déclaré dans sa définition canonique.',
      suggestion: 'Supprimez ou corrigez les wires référençant des pins/composants invalides.',
      context: { invalidEndpoints },
    }
  },
}
