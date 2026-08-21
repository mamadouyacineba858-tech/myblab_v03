/**
 * Génération de chemins SVG pour les fils.
 * Les extrémités (`from`/`to`) sont toujours passées en live, dérivées de
 * la position courante des composants (jamais stockées dans le modèle
 * wire). Les points intermédiaires (`waypoints`), lorsqu'ils sont fournis,
 * sont en revanche des données persistantes du Wire Core (ADR-008 amendé,
 * MB-VIS-005) — seule leur consommation ici est en lecture pure.
 */

/**
 * Chemin SVG d'un wire.
 *
 * Sans waypoint (comportement historique, MB-VIS-004, non-régression
 * stricte bit à bit — AC-08) : chemin en L (horizontal puis vertical) —
 * style breadboard.
 *
 * Avec waypoints persistants (MB-VIS-005, ADR-008 amendé) : segments
 * droits successifs de `from` à travers chaque waypoint, dans leur ordre
 * persistant, jusqu'à `to` (AC-06). Aucune courbe/interpolation n'est
 * mandatée par ADR-008 ni par docs/pmo/tickets/MB-VIS-005.md §5.6 : ce
 * choix de segments droits reste un détail d'implémentation borné par le
 * contrat de géométrie existant, pas une nouvelle décision architecturale
 * sur le modèle Wire.
 *
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {Array<{ x: number, y: number }>} [waypoints] Points intermédiaires persistants, dans l'ordre pinA -> pinB (MB-VIS-005).
 * @returns {string} attribut d du path SVG
 */
export function buildWirePath(from, to, waypoints = []) {
  if (!from || !to) return ""
  const { x: x1, y: y1 } = from
  const { x: x2, y: y2 } = to
  if (![x1, y1, x2, y2].every(Number.isFinite)) return ""

  const points = Array.isArray(waypoints)
    ? waypoints.filter((wp) => wp && Number.isFinite(wp.x) && Number.isFinite(wp.y))
    : []

  if (points.length === 0) {
    const midX = (x1 + x2) / 2
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
  }

  const segments = [`M ${x1} ${y1}`]
  for (const wp of points) {
    segments.push(`L ${wp.x} ${wp.y}`)
  }
  segments.push(`L ${x2} ${y2}`)
  return segments.join(" ")
}

import { Signal } from "../simulator/signals.js"

/**
 * Couleurs des fils (MB-VIS-004).
 *
 * NEUTRAL_COLOR et SELECTED_COLOR reprennent exactement les deux valeurs
 * historiques de l'ancien getWireColor({highlight}) (non-régression :
 * même orange par défaut, même vert de sélection). SIGNAL_COLORS est
 * l'ajout de ce ticket — un fil "flottant" (FLOATING) est en outre tracé
 * en pointillés (cf. WiresLayer.jsx) pour rester distinguable sans
 * dépendre uniquement de la couleur.
 */
const NEUTRAL_COLOR = "#f97316"
const SELECTED_COLOR = "#22c55e"

const SIGNAL_COLORS = {
  [Signal.HIGH]: "#ef4444",
  [Signal.LOW]: "#3b82f6",
  [Signal.UNKNOWN]: "#94a3b8",
  [Signal.FLOATING]: "#a855f7",
}

/**
 * Couleur de trait d'un fil, par ordre de précédence : sélection > état
 * logique disponible > neutre. La sélection prévaut toujours (non-
 * régression du comportement existant). `signal` à `null` (simulation
 * inactive ou donnée absente, cf. wireState.js) retombe sur le neutre —
 * jamais assimilé à Signal.UNKNOWN (arbitrage CSA Q3, 2026-08-20).
 *
 * @param {{ selected?: boolean, signal?: string|null }} [options]
 * @returns {string}
 */
export function getWireStrokeColor({ selected = false, signal = null } = {}) {
  if (selected) return SELECTED_COLOR
  if (signal && SIGNAL_COLORS[signal]) return SIGNAL_COLORS[signal]
  return NEUTRAL_COLOR
}

/**
 * Classe CSS modifiant l'état logique d'un fil, indépendante de la couleur
 * inline (utile pour des styles additionnels — cf. WiresLayer.css). Ne
 * renvoie rien pour `signal: null` (état neutre, pas de modificateur).
 *
 * @param {{ signal?: string|null }} [options]
 * @returns {string|null}
 */
export function getWireStateClassName({ signal = null } = {}) {
  switch (signal) {
    case Signal.HIGH: return "wires-layer__wire--high"
    case Signal.LOW: return "wires-layer__wire--low"
    case Signal.UNKNOWN: return "wires-layer__wire--unknown"
    case Signal.FLOATING: return "wires-layer__wire--floating"
    default: return null
  }
}
