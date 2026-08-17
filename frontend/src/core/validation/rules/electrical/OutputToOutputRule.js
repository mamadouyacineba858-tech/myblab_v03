/**
 * ELE-005 — OutputToOutputRule (WARNING)
 * Détecte une connexion entre deux pins dont le rôle canonique est
 * explicitement "output" (rôle lu directement depuis canonicalRegistry via
 * resolvePinRole, comparé au point d'usage — aucune constante locale ne
 * redéclare ce nom de rôle comme source canonique concurrente, conformément
 * à CSA-CF4-001-A).
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getEffectiveWires, resolvePinRole } from '../shared/documentHelpers.js'

export const OutputToOutputRule = {
  id: 'ELE-005',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.WARNING,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document)

    const offending = wires.filter((w) => {
      if (!w.pinA || !w.pinB) return false
      const roleA = resolvePinRole(components, w.pinA.componentId, w.pinA.pinId)
      const roleB = resolvePinRole(components, w.pinB.componentId, w.pinB.pinId)
      return roleA === 'output' && roleB === 'output'
    })

    if (offending.length === 0) return null

    return {
      id: 'ELE-005',
      message:
        offending.length === 1
          ? `Le wire "${offending[0].id}" connecte deux pins de sortie ("output") entre elles.`
          : `${offending.length} wires connectent deux pins de sortie ("output") entre elles.`,
      explanation: "Deux pins explicitement marquées comme sorties ne devraient pas être connectées ensemble.",
      suggestion: 'Vérifiez le câblage : une sortie doit généralement être connectée à une entrée.',
      context: { wireIds: offending.map((w) => w.id) },
    }
  },
}
