/**
 * ELE-006 — PowerSourcePresenceRule (INFO)
 * Signale une information si aucun composant exposant un pin "source
 * d'alimentation" (rôle "power_out" dans canonicalRegistry.js) n'existe
 * dans le Document. INFO ne bloque jamais la commande.
 *
 * [CSA-CF4-001-A — amendement anti-duplication] Ne code plus en dur le nom
 * de type "POWER" : la notion de "source d'alimentation" est dérivée du
 * rôle de pin "power_out" réellement déclaré dans canonicalRegistry.js
 * (via typeHasCanonicalPinRole), pour ne pas dupliquer une connaissance de
 * type déjà présente dans le Registry.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, typeHasCanonicalPinRole } from '../shared/documentHelpers.js'

export const PowerSourcePresenceRule = {
  id: 'ELE-006',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.INFO,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const hasPower = components.some((c) => typeHasCanonicalPinRole(c.type, 'power_out'))
    if (hasPower) return null

    return {
      id: 'ELE-006',
      message: "Aucune source d'alimentation (POWER) n'est présente dans le circuit.",
      explanation: 'Un circuit sans source POWER ne pourra pas être simulé de façon exploitable.',
      suggestion: 'Ajoutez un composant POWER pour alimenter le circuit.',
      context: {},
    }
  },
}
