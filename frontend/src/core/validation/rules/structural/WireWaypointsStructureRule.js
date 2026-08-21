/**
 * STR-006 — WireWaypointsStructureRule (ERROR)
 *
 * MB-VIS-005 — docs/pmo/tickets/MB-VIS-005.md §5.4 / AC-04.
 *
 * Valide la structure des waypoints proposés par une commande
 * UPDATE_WIRE_WAYPOINTS en attente, avant toute application au Document
 * (ADR-010, pré-check CommandBus.dispatch()) : suit exactement le même
 * patron que ComponentTypeRule/ComponentPinsRule, qui ne valident le
 * composant proposé QUE pour une commande ADD_COMPONENT en attente. Ici,
 * la règle ne s'applique qu'à UPDATE_WIRE_WAYPOINTS et ignore tout autre
 * type de commande (y compris l'absence de commande) — un Wire existant
 * dépourvu de waypoints n'est jamais concerné (rétrocompatibilité,
 * AC-01/AC-08).
 *
 * N'inspecte jamais le Document existant : l'existence du wireId référencé
 * est du ressort du Handler (WireNotFoundError), pas de cette règle —
 * même partage des responsabilités que UpdateComponentHandler/
 * ComponentNotFoundError, pour lequel aucune règle de pré-validation
 * d'existence n'a été introduite non plus.
 */
import { CATEGORIES, LEVELS } from '../../constants.js'

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidWaypoint(waypoint) {
  return (
    waypoint !== null &&
    typeof waypoint === 'object' &&
    isFiniteNumber(waypoint.x) &&
    isFiniteNumber(waypoint.y)
  )
}

export const WireWaypointsStructureRule = {
  id: 'STR-006',
  category: CATEGORIES.STRUCTURAL,
  level: LEVELS.ERROR,
  validate(document, command) {
    if (!command || command.type !== 'UPDATE_WIRE_WAYPOINTS' || !command.payload) {
      return null
    }

    const { wireId, waypoints } = command.payload

    if (!Array.isArray(waypoints)) {
      return {
        id: 'STR-006',
        message: `La mutation de waypoints pour le wire "${wireId}" ne fournit pas un tableau.`,
        explanation: 'Le contrat ADR-008 amendé exige waypoints: Array<{x, y}>.',
        suggestion: 'Fournissez un tableau (éventuellement vide) de points {x, y}.',
        context: { wireId },
      }
    }

    const invalidIndexes = waypoints
      .map((wp, index) => (isValidWaypoint(wp) ? null : index))
      .filter((index) => index !== null)

    if (invalidIndexes.length > 0) {
      return {
        id: 'STR-006',
        message:
          invalidIndexes.length === 1
            ? `Le waypoint à l'index ${invalidIndexes[0]} du wire "${wireId}" est invalide (coordonnées manquantes, non numériques ou non finies).`
            : `${invalidIndexes.length} waypoints du wire "${wireId}" sont invalides (coordonnées manquantes, non numériques ou non finies).`,
        explanation:
          'Chaque waypoint doit posséder des coordonnées x et y numériques et finies. NaN, Infinity et toute structure malformée sont rejetés.',
        suggestion: 'Corrigez ou retirez les waypoints invalides avant application.',
        context: { wireId, invalidIndexes },
      }
    }

    return null
  },
}
