/**
 * waypointInsertion.js — MB-VIS-005 (§4.7 / Phase E, interaction utilisateur).
 *
 * Fonction pure de géométrie Presentation : détermine, pour un point cliqué
 * sur le tracé d'un wire, à quel index du tableau `waypoints` un nouveau
 * point doit être inséré (création d'un waypoint par double-clic sur le
 * tracé). N'écrit rien, ne dispatche rien — WiresLayer.jsx compose ensuite
 * le nouveau tableau complet et le confie à updateWireWaypoints() (mutation
 * atomique unique, CF3), conformément à MB-VIS-005 §5.3 : aucune mutation
 * granulaire (addWireWaypoint) n'est introduite.
 */
import { distance } from '../utils/geometry.js'

function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return distance(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/**
 * `points` est la liste ordonnée des points du tracé rendu (typiquement
 * extraite de l'attribut `d` du path SVG via extractPointsFromPathData) :
 * [from, ...waypoints, to] pour un wire déjà routé. Pour un wire sans
 * waypoint, `points` correspond aux points du chemin en L historique
 * (4 points) plutôt qu'aux deux seules extrémités logiques — l'insertion
 * reste néanmoins géométriquement raisonnable, au plus près du point
 * cliqué sur la ligne effectivement visible.
 *
 * @param {Array<{x:number,y:number}>} points
 * @param {{x:number,y:number}} clickPoint
 * @returns {number} index d'insertion dans le tableau `waypoints` du wire
 *   (0 = avant le premier waypoint existant, waypoints.length = après le
 *   dernier).
 */
export function nearestSegmentInsertIndex(points, clickPoint) {
  if (!Array.isArray(points) || points.length < 2 || !clickPoint) return 0

  let bestIndex = 0
  let bestDistance = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const segmentDistance = pointToSegmentDistance(clickPoint, points[i], points[i + 1])
    if (segmentDistance < bestDistance) {
      bestDistance = segmentDistance
      bestIndex = i
    }
  }
  return bestIndex
}
