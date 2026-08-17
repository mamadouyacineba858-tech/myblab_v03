/**
 * STR-001 — ComponentTypeRule (ERROR)
 * Le type du composant doit exister dans canonicalRegistry.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { hasCanonicalType } from '../../../../simulator/canonicalRegistry.js'
import { getEffectiveComponents } from '../shared/documentHelpers.js'

export const ComponentTypeRule = {
  id: 'STR-001',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const invalid = components.filter((c) => !hasCanonicalType(c.type))
    if (invalid.length === 0) return null

    return {
      id: 'STR-001',
      message:
        invalid.length === 1
          ? `Le composant "${invalid[0].id}" a un type inconnu ("${invalid[0].type}").`
          : `${invalid.length} composants ont un type inconnu.`,
      explanation:
        "Le type d'un composant doit exister dans le registre canonique (canonicalRegistry).",
      suggestion: 'Utilisez un type de composant reconnu par le simulateur.',
      context: {
        componentIds: invalid.map((c) => c.id),
        types: invalid.map((c) => c.type),
      },
    }
  },
}
