/**
 * STR-004 — SelfLoopRule (WARNING)
 * Détecte un wire dont les deux extrémités sont exactement le même
 * componentId + pinId.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveWires } from '../shared/documentHelpers.js'

export const SelfLoopRule = {
  id: 'STR-004',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.WARNING,
  validate(document) {
    const wires = getEffectiveWires(document)
    const loops = wires.filter(
      (w) =>
        w.pinA &&
        w.pinB &&
        w.pinA.componentId === w.pinB.componentId &&
        w.pinA.pinId === w.pinB.pinId
    )
    if (loops.length === 0) return null

    return {
      id: 'STR-004',
      message:
        loops.length === 1
          ? `Le wire "${loops[0].id}" boucle sur lui-même (même composant, même pin).`
          : `${loops.length} wires bouclent sur eux-mêmes (même composant, même pin).`,
      explanation: 'Une extrémité de wire ne devrait pas être connectée à elle-même.',
      suggestion: 'Vérifiez la connexion : les deux extrémités doivent référencer des pins différents.',
      context: { wireIds: loops.map((w) => w.id) },
    }
  },
}
