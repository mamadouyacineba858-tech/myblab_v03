/**
 * STR-005 — ReferenceCoherenceRule (ERROR)
 * Toutes les références componentId présentes dans les wires doivent
 * correspondre à des composants existants.
 *
 * Portée volontairement plus étroite que STR-003 : STR-005 vérifie
 * uniquement l'existence du composant référencé (pas la résolution du
 * pin) — les deux règles sont demandées séparément par le contrat CF4.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getEffectiveWires, findComponent } from '../shared/documentHelpers.js'

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
        if (endpoint && endpoint.componentId && !findComponent(components, endpoint.componentId)) {
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
      explanation: 'Toute référence componentId dans un wire doit correspondre à un composant présent dans le Document.',
      suggestion: 'Supprimez les wires orphelins ou corrigez la référence de composant.',
      context: { dangling },
    }
  },
}
