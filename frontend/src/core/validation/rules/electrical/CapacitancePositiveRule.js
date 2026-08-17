/**
 * ELE-002 — CapacitancePositiveRule (ERROR)
 * Pour CAPACITOR : si le paramètre de type "capacitance" est explicitement
 * présent, il doit être > 0. Si absent, le defaultParameters canonique
 * s'applique (pas d'erreur).
 *
 * [CSA-CF4-001-A — amendement anti-duplication] Le nom de la clé de
 * paramètre n'est plus codé en dur ("capacitance") : il est dérivé du
 * parameterSchema déclaré dans canonicalRegistry.js pour CAPACITOR via
 * getCanonicalParameterKeyByType.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getCanonicalParameterKeyByType } from '../shared/documentHelpers.js'

function isInvalidExplicitValue(value) {
  if (value === undefined || value === null) return false
  return typeof value !== 'number' || Number.isNaN(value) || !(value > 0)
}

export const CapacitancePositiveRule = {
  id: 'ELE-002',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const key = getCanonicalParameterKeyByType('CAPACITOR', 'capacitance')
    const invalid = key
      ? components.filter((c) => c.type === 'CAPACITOR' && isInvalidExplicitValue(c.parameters && c.parameters[key]))
      : []
    if (invalid.length === 0) return null

    return {
      id: 'ELE-002',
      message:
        invalid.length === 1
          ? `Le composant "${invalid[0].id}" a une capacité invalide (${invalid[0].parameters[key]}).`
          : `${invalid.length} condensateurs ont une valeur invalide.`,
      explanation: 'Une capacité explicitement définie doit avoir une valeur numérique strictement positive.',
      suggestion: "Corrigez la valeur de capacité pour qu'elle soit supérieure à 0 F.",
      context: { componentIds: invalid.map((c) => c.id) },
    }
  },
}
