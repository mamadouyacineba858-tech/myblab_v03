/**
 * Génération de chemins SVG pour les fils.
 * Coordonnées toujours passées en live (jamais stockées dans le modèle wire).
 */

/**
 * Chemin en L (horizontal puis vertical) — style breadboard.
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @returns {string} attribut d du path SVG
 */
export function buildWirePath(from, to) {
  if (!from || !to) return ""
  const { x: x1, y: y1 } = from
  const { x: x2, y: y2 } = to
  if (![x1, y1, x2, y2].every(Number.isFinite)) return ""

  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
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
