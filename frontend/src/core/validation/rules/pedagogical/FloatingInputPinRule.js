/**
 * PED-001 — FloatingInputPinRule (WARNING)
 * Détecte les pins dont le rôle canonique est "input" et qui ne sont
 * connectées à aucun wire. Règle pédagogique : ne bloque jamais une
 * commande (WARNING uniquement). Ne considère PAS tout pin non connecté
 * comme un problème — uniquement ceux de rôle "input" (rôle lu directement
 * depuis canonicalRegistry, comparé au point d'usage — aucune constante
 * locale ne redéclare ce nom de rôle comme source canonique concurrente,
 * conformément à CSA-CF4-001-A).
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getCanonicalEntry } from '../../../../simulator/canonicalRegistry.js'
import { getEffectiveComponents, getEffectiveWires } from '../shared/documentHelpers.js'

const SEP = ' '

export const FloatingInputPinRule = {
  id: 'PED-001',
  category: CATEGORIES.PEDAGOGICAL,
  level: LEVELS.WARNING,
  validate(document, command) {
    const components = getEffectiveComponents(document, command)
    const wires = getEffectiveWires(document)

    const connected = new Set()
    for (const wire of wires) {
      if (wire.pinA && wire.pinA.componentId) connected.add(`${wire.pinA.componentId}${SEP}${wire.pinA.pinId}`)
      if (wire.pinB && wire.pinB.componentId) connected.add(`${wire.pinB.componentId}${SEP}${wire.pinB.pinId}`)
    }

    const floating = []
    for (const component of components) {
      const entry = getCanonicalEntry(component.type)
      if (!entry || !Array.isArray(entry.pins)) continue
      for (const pin of entry.pins) {
        if (pin.role === 'input' && !connected.has(`${component.id}${SEP}${pin.id}`)) {
          floating.push({ componentId: component.id, pinId: pin.id })
        }
      }
    }

    if (floating.length === 0) return null

    return {
      id: 'PED-001',
      message:
        floating.length === 1
          ? `Le pin d'entrée "${floating[0].pinId}" du composant "${floating[0].componentId}" n'est connecté à aucun wire.`
          : `${floating.length} pins d'entrée ne sont connectés à aucun wire.`,
      explanation: "Un pin d'entrée non connecté ne recevra aucun signal lors de la simulation.",
      suggestion: 'Connectez ce pin, ou ignorez cet avertissement si cela est intentionnel à ce stade.',
      context: { floating },
    }
  },
}
