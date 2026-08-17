/**
 * ELE-001 — ResistancePositiveRule (ERROR)
 * Pour RESISTOR : si le paramètre de type "resistance" est explicitement
 * présent, il doit être > 0. Si absent, le default canonique s'applique
 * (pas d'erreur).
 *
 * [CSA-CF4-001-A — amendement anti-duplication] Le nom de la clé de
 * paramètre à valider n'est plus codé en dur ("resistance") : il est
 * dérivé du parameterSchema déclaré dans canonicalRegistry.js pour RESISTOR
 * via getCanonicalParameterKeyByType, afin de ne pas créer une seconde
 * source de vérité pour ce nom de champ.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getCanonicalParameterKeyByType } from '../shared/documentHelpers.js'

function isInvalidExplicitValue(value) {
  if (value === undefined || value === null) return false // absent -> default canonique
  return typeof value !== 'number' || Number.isNaN(value) || !(value > 0)
}

export const ResistancePositiveRule = {
  id: 'ELE-001',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const key = getCanonicalParameterKeyByType('RESISTOR', 'resistance')
    const invalid = key
      ? components.filter((c) => c.type === 'RESISTOR' && isInvalidExplicitValue(c.parameters && c.parameters[key]))
      : []
    if (invalid.length === 0) return null

    return {
      id: 'ELE-001',
      message:
        invalid.length === 1
          ? `Le composant "${invalid[0].id}" a une résistance invalide (${invalid[0].parameters[key]}).`
          : `${invalid.length} résistances ont une valeur invalide.`,
      explanation: 'Une résistance explicitement définie doit avoir une valeur numérique strictement positive.',
      suggestion: 'Corrigez la valeur de résistance pour qu\'elle soit supérieure à 0 Ω.',
      context: { componentIds: invalid.map((c) => c.id) },
    }
  },
}
