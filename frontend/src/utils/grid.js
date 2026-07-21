/** Taille de la grille Tinkercad (px) */
export const GRID_SIZE = 20

/**
 * Aligne une coordonnée sur la grille.
 * @param {number} value
 * @returns {number}
 */
export function snapToGrid(value) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

/**
 * Aligne un point {x, y} sur la grille.
 * @param {{ x: number, y: number }} point
 */
export function snapPoint(point) {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  }
}
