/**
 * ELE-007 — PowerGroundShortCircuitRule (ERROR)
 * Détecte un même réseau électrique (net) reliant directement ou
 * indirectement une pin de la famille de rôles "power" et une pin de la
 * famille de rôles "ground" (familles dérivées dynamiquement des rôles
 * réels observés dans canonicalRegistry.js — voir
 * shared/documentHelpers.js#roleMatchesFamily ; aucune liste de rôles
 * codée en dur ici, conformément à CSA-CF4-001-A).
 *
 * Les nets sont construits uniquement à partir des wires du Document
 * (Union-Find, cf. shared/nets.js) — aucun état persistant, aucune
 * modification du Document, aucune dépendance à resolution.js.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents, getEffectiveWires, resolvePinRole, roleMatchesFamily } from '../shared/documentHelpers.js'
import { buildNets } from '../shared/nets.js'

export const PowerGroundShortCircuitRule = {
  id: 'ELE-007',
  category: CATEGORIES.ELECTRICAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document)
    const nets = buildNets(wires)

    const shortedNets = []
    for (const net of nets) {
      let hasPower = false
      let hasGround = false
      for (const node of net) {
        const role = resolvePinRole(components, node.componentId, node.pinId)
        if (roleMatchesFamily(role, 'power')) hasPower = true
        if (roleMatchesFamily(role, 'ground')) hasGround = true
      }
      if (hasPower && hasGround) shortedNets.push(net)
    }

    if (shortedNets.length === 0) return null

    return {
      id: 'ELE-007',
      message:
        shortedNets.length === 1
          ? 'Un réseau électrique relie directement une pin power et une pin ground (court-circuit).'
          : `${shortedNets.length} réseaux électriques relient directement une pin power et une pin ground (court-circuit).`,
      explanation: "Un réseau connectant une pin d'alimentation et une pin de masse crée un court-circuit direct.",
      suggestion: 'Retirez la connexion directe entre alimentation et masse.',
      context: { nets: shortedNets },
    }
  },
}
