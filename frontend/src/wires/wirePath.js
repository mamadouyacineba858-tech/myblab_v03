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

/**
 * Couleur du fil selon état (connexion en cours, HIGH, défaut).
 */
export function getWireColor(options = {}) {
  if (options.pending) return "#f59e0b"
  if (options.highlight) return "#22c55e"
  return "#f97316"
}
