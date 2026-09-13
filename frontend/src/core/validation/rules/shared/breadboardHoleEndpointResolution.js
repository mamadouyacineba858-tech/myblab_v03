/**
 * breadboardHoleEndpointResolution.js — L1-WIRE-001
 *
 * Frontière PARTAGÉE unique de résolution d'un endpoint de trou Breadboard
 * pour les règles de validation structurelles (STR-003 WirePinsExistRule,
 * STR-005 ReferenceCoherenceRule). Avant ce ticket, chaque règle dupliquait
 * indépendamment la même séquence — parse -> recherche du breadboard ->
 * reconstruction x/y -> holeAt() — et résolvait le breadboard contre le
 * singleton legacy `document.breadboard` (breadboards[0] uniquement),
 * rejetant à tort tout endpoint valide sur un breadboard suivant.
 *
 * Cette primitive consolide la résolution UNE fois et la fait porter sur
 * `document.breadboards[]` (via toCanonicalBreadboards, jamais de fallback
 * positionnel vers breadboards[0]). Elle n'introduit aucun second oracle :
 * - format d'endpoint : parseBreadboardHoleEndpoint (breadboardWireEndpoint.js) ;
 * - collection canonique : toCanonicalBreadboards (normalizeDocumentBreadboards.js) ;
 * - géométrie du trou : holeAt (breadboardGeometry.js).
 *
 * Fonction pure : ne mute jamais le Document, ne calcule aucune identité
 * électrique ni topologie dérivée (réservées à breadboardConnectivity.js),
 * ne connaît ni React, ni Presentation, ni Simulation.
 */
import { BREADBOARD_PITCH, holeAt } from '../../../../utils/breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from '../../../../utils/breadboardWireEndpoint.js'
import { toCanonicalBreadboards } from '../../../../utils/normalizeDocumentBreadboards.js'

/**
 * Résout un endpoint de wire `{componentId, pinId}` contre la collection
 * canonique de breadboards du document.
 *
 * @returns {{
 *   shaped: boolean,   // true si l'endpoint a le FORMAT d'un endpoint-trou
 *   hole: object|null, // résultat holeAt() si le trou existe réellement
 *   reason: 'breadboard_not_found'|'breadboard_hole_not_found'|null,
 *   breadboard: object|null,
 *   breadboardId: string|null,
 *   column: number|null,
 *   row: number|null,
 * }}
 *   `shaped: false` signifie que l'endpoint ne suit pas du tout le format
 *   endpoint-trou (breadboardWireEndpoint.js) — l'appelant doit alors le
 *   traiter comme une référence de composant/pin classique.
 */
export function resolveBreadboardHoleEndpoint(document, endpoint) {
  const NOT_SHAPED = { shaped: false, hole: null, reason: null, breadboard: null, breadboardId: null, column: null, row: null }

  if (!endpoint || !endpoint.componentId) return NOT_SHAPED
  const parsed = parseBreadboardHoleEndpoint(endpoint.componentId, endpoint.pinId)
  if (!parsed) return NOT_SHAPED

  const { breadboardId, column, row } = parsed
  const breadboard = toCanonicalBreadboards(document).find((b) => b && b.id === breadboardId) || null
  if (!breadboard || !breadboard.position) {
    return { shaped: true, hole: null, reason: 'breadboard_not_found', breadboard: null, breadboardId, column, row }
  }

  const x = breadboard.position.x + column * BREADBOARD_PITCH
  const y = breadboard.position.y + row * BREADBOARD_PITCH
  const hole = holeAt(breadboard, x, y)
  if (!hole) {
    return { shaped: true, hole: null, reason: 'breadboard_hole_not_found', breadboard, breadboardId, column, row }
  }

  return { shaped: true, hole, reason: null, breadboard, breadboardId, column, row }
}
