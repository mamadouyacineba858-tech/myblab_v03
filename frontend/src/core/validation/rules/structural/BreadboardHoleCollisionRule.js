/**
 * STR-007 — BreadboardHoleCollisionRule (ERROR)
 *
 * MB-BREADBOARD-003 (Blueprint §4, LOCK-12/AC-12/AC-13). Bloque toute
 * commande ADD_COMPONENT/MOVE_COMPONENT qui ferait atterrir 2+ pins
 * distinctes (componentId+pinId) sur le MÊME trou exact (column,row) d'un
 * breadboard.
 *
 * [Correction disclosed — Delivery Report MB-BREADBOARD-003 §Déviations]
 * Le Blueprint §4 proposait l'id `STR-005` pour cette règle. Ce préfixe est
 * déjà pris par ReferenceCoherenceRule (STR-005, MB-CF4-001, voir
 * structural/ReferenceCoherenceRule.js) — collision d'id non détectée avant
 * l'écriture de ce fichier (le Blueprint a été rédigé sans relire la liste
 * complète des ids déjà attribués). `STR-006` est également pris
 * (WireWaypointsStructureRule, MB-VIS-005). Cette règle utilise donc
 * `STR-007`, le prochain id structurel disponible — aucun autre changement
 * de comportement par rapport au Blueprint §4.
 *
 * Auto-contenue (LOCK-12, arbitrage Q1 du Blueprint §0) : ne modifie ni
 * documentHelpers.js, ni breadboardConnectivity.js, ni nets.js (LOCK-07/08
 * préservés). Réutilise getEffectiveComponents() (non modifié) pour
 * ADD_COMPONENT, et lit directement command.payload.moves pour
 * MOVE_COMPONENT (getEffectiveComponents ne connaît pas ce contrat — audit
 * pré-implémentation §C, docs/pmo/tickets/MB-BREADBOARD-003.md).
 *
 * N'active aucune vérification lorsque document.breadboard est absent —
 * coût nul, aucune régression sur tout Document sans breadboard (même
 * garantie que TB-14/TB-15, MB-BREADBOARD-002).
 *
 * Non-goal explicite (Blueprint §4, disclosed) : ADD_BREADBOARD lui-même
 * n'est pas couvert par cette règle — le Document reçu par validate() n'a
 * pas encore de breadboard au moment de cette commande précise. Poser un
 * breadboard sous des composants déjà positionnés en collision potentielle
 * n'est pas détecté en V1. Aucun AC/UI du ticket ne l'exige explicitement.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'
import { getEffectiveComponents } from '../shared/documentHelpers.js'
import { getComponentDef } from '../../../../config/componentDefinitions.js'
import { holeAt } from '../../../../utils/breadboardGeometry.js'

export const BreadboardHoleCollisionRule = {
  id: 'STR-007',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    const breadboard = document && document.breadboard
    if (!breadboard) return null

    let components = (document && document.components) || []
    if (command && command.type === 'ADD_COMPONENT') {
      components = getEffectiveComponents(document, command)
    } else if (command && command.type === 'MOVE_COMPONENT' && Array.isArray(command.payload?.moves)) {
      const overrides = new Map(command.payload.moves.map((m) => [m.componentId, m.toPosition]))
      components = components.map((c) => (overrides.has(c.id) ? { ...c, position: overrides.get(c.id) } : c))
    }

    const byHole = new Map()
    for (const component of components) {
      if (!component || !component.position) continue
      const def = getComponentDef(component.type)
      if (!def || !Array.isArray(def.pins)) continue

      for (const pin of def.pins) {
        const x = component.position.x + pin.dx
        const y = component.position.y + pin.dy
        const hole = holeAt(breadboard, x, y)
        if (!hole) continue
        const key = `${hole.column}:${hole.row}`
        if (!byHole.has(key)) byHole.set(key, [])
        byHole.get(key).push({ componentId: component.id, pinId: pin.id })
      }
    }

    const collisions = []
    for (const [hole, entries] of byHole.entries()) {
      const distinct = new Set(entries.map((e) => `${e.componentId}:${e.pinId}`))
      if (distinct.size >= 2) {
        collisions.push({ hole, pins: entries })
      }
    }

    if (collisions.length === 0) return null

    return {
      id: 'STR-007',
      message:
        collisions.length === 1
          ? `Deux pins (ou plus) occupent le même trou de breadboard (${collisions[0].hole}).`
          : `${collisions.length} trous de breadboard sont occupés par plusieurs pins simultanément.`,
      explanation: "Un trou de breadboard ne peut accueillir qu'une seule patte de composant à la fois.",
      suggestion: 'Déplacez le composant vers un trou libre du breadboard.',
      context: { collisions },
    }
  },
}
