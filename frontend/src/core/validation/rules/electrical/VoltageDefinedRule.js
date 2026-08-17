/**
 * ELE-003 — VoltageDefinedRule (ERROR)
 * Pour POWER : si le paramètre de type "voltage" est explicitement présent,
 * il doit être numérique et > 0. Si absent, le defaultParameters canonique
 * s'applique (pas d'erreur).
 *
 * [CSA-CF4-001-A — amendement anti-duplication] Le nom de la clé de
 * paramètre n'est plus codé en dur ("voltage") : il est dérivé du
 * parameterSchema déclaré dans canonicalRegistry.js pour POWER via
 * getCanonicalParameterKeyByType.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getCanonicalParameterKeyByType } from '../shared/documentHelpers.js'

function isInvalidExplicitValue(value) {
  if (value === undefined || value === null) return false
  return typeof value !== 'number' || Number.isNaN(value) || !(value > 0)
}

export const VoltageDefinedRule = {
  id: 'ELE-003',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const key = getCanonicalParameterKeyByType('POWER', 'voltage')
    const invalid = key
      ? components.filter((c) => c.type === 'POWER' && isInvalidExplicitValue(c.parameters && c.parameters[key]))
      : []
    if (invalid.length === 0) return null

    return {
      id: 'ELE-003',
      message:
        invalid.length === 1
          ? `Le composant "${invalid[0].id}" a une tension invalide (${invalid[0].parameters[key]}).`
          : `${invalid.length} sources d'alimentation ont une tension invalide.`,
      explanation: 'Une tension explicitement définie sur une source POWER doit être numérique et strictement positive.',
      suggestion: "Corrigez la valeur de tension pour qu'elle soit supérieure à 0 V.",
      context: { componentIds: invalid.map((c) => c.id) },
    }
  },
}
