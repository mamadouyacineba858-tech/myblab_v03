/**
 * STR-002 — ComponentPinsRule (ERROR)
 * Le type doit posséder une définition canonique de pins valide.
 * Source de vérité : canonicalRegistry (jamais componentDefinitions).
 *
 * Note : à l'état actuel de canonicalRegistry.js (auto-validé au chargement
 * du module via validateCanonicalEntrySet), tout type déclaré possède déjà
 * au moins un pin — cette règle ne devrait donc jamais se déclencher en
 * pratique aujourd'hui. Elle est conservée telle que spécifiée par le
 * contrat CF4, en défense contre une future entrée canonique incomplète.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getCanonicalEntry, hasCanonicalType } from '../../../../simulator/canonicalRegistry.js'
import { getEffectiveComponents } from '../shared/documentHelpers.js'

export const ComponentPinsRule = {
  id: 'STR-002',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const invalid = components.filter((c) => {
      if (!hasCanonicalType(c.type)) return false // couvert par STR-001
      const entry = getCanonicalEntry(c.type)
      return !entry || !Array.isArray(entry.pins) || entry.pins.length === 0
    })
    if (invalid.length === 0) return null

    return {
      id: 'STR-002',
      message:
        invalid.length === 1
          ? `Le type "${invalid[0].type}" ne possède aucune définition de pins valide.`
          : `${invalid.length} composants ont un type sans définition de pins valide.`,
      explanation:
        'Un type canonique doit déclarer au moins un pin dans canonicalRegistry.',
      suggestion: 'Complétez la définition canonique du type concerné.',
      context: {
        componentIds: invalid.map((c) => c.id),
        types: invalid.map((c) => c.type),
      },
    }
  },
}
