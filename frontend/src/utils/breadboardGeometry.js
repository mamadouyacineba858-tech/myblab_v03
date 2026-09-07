/**
 * Géométrie du breadboard V1 (MB-BREADBOARD-001/002).
 *
 * Fonctions pures uniquement : aucune lecture de state React, aucune mesure
 * DOM. `holeAt()` dérive l'appartenance d'un point du canvas à un trou de
 * breadboard, et à quel groupe électrique ce trou appartient, à partir
 * uniquement de la position/du layout du breadboard — conformément à
 * MB-BREADBOARD-001 §K.2/§E et à la Blueprint §4.
 *
 * Aucun état d'occupation n'est stocké ici ni ailleurs : l'appelant
 * (breadboardConnectivity.js) reconstruit l'occupation à chaque appel à
 * partir de document.components (LOCK-07, AC-17).
 */

/** Pas de grille dédié du breadboard (0,1" simulé en px), découplé de GRID_SIZE. */
export const BREADBOARD_PITCH = 12

/**
 * Layout V1 unique et fixe (Q1 : un seul breadboard, une seule taille).
 * columns : nombre de colonnes de la zone de montage (groupes de 5).
 * rowsPerSide : nombre de rangées par côté de la rainure centrale (AC-03).
 */
export const STANDARD_V1_LAYOUT = {
  columns: 30,
  rowsPerSide: 5,
}

// Indices de rangée (en unités de pas, offset depuis breadboard.position.y).
const ROW_RAIL_TOP_PLUS = 0
const ROW_RAIL_TOP_MINUS = 1
const ROW_STRIP_TOP_START = 3
const ROW_STRIP_BOTTOM_START = ROW_STRIP_TOP_START + STANDARD_V1_LAYOUT.rowsPerSide + 1 // +1 = rainure
const ROW_RAIL_BOTTOM_MINUS = ROW_STRIP_BOTTOM_START + STANDARD_V1_LAYOUT.rowsPerSide + 1
const ROW_RAIL_BOTTOM_PLUS = ROW_RAIL_BOTTOM_MINUS + 1

/** Nombre total de rangées occupées par le layout V1 (pour le rendu Presentation). */
export const STANDARD_V1_TOTAL_ROWS = ROW_RAIL_BOTTOM_PLUS + 1

/**
 * Aligne une position {x,y} sur le pas du breadboard (utilisé par
 * AddBreadboardHandler pour positionner le breadboard lui-même).
 */
export function snapToBreadboardPitch(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return { x: 0, y: 0 }
  }
  return {
    x: Math.round(point.x / BREADBOARD_PITCH) * BREADBOARD_PITCH,
    y: Math.round(point.y / BREADBOARD_PITCH) * BREADBOARD_PITCH,
  }
}

/**
 * Résout un point absolu du canvas en trou de breadboard.
 *
 * @param {{ id: string, position: {x,y} }} breadboard
 * @param {number} x
 * @param {number} y
 * @returns {{ kind: 'RAIL'|'STRIP', groupKey: string, column: number, row: number } | null}
 *   `null` si le point ne tombe sur aucun trou valide (hors grille, hors
 *   limites du breadboard, ou sur la rainure centrale / un interstice).
 */
export function holeAt(breadboard, x, y) {
  if (!breadboard || !breadboard.position) return null
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const relX = x - breadboard.position.x
  const relY = y - breadboard.position.y
  const column = Math.round(relX / BREADBOARD_PITCH)
  const row = Math.round(relY / BREADBOARD_PITCH)

  // Tolérance d'insertion volontairement petite (très inférieure à
  // BREADBOARD_PITCH / 2) : un point "au round le plus proche" par
  // construction de Math.round n'est donc PAS suffisant pour être considéré
  // inséré — la pin doit être effectivement alignée sur un trou, pas
  // simplement la plus proche d'un trou parmi d'autres (sinon TOUT point du
  // canvas résoudrait trivialement vers un trou, ce qui viderait "hors
  // grille" / insertion invalide de tout sens, cf. TB-09).
  const INSERTION_TOLERANCE = 2

  if (Math.abs(relX - column * BREADBOARD_PITCH) > INSERTION_TOLERANCE) return null
  if (Math.abs(relY - row * BREADBOARD_PITCH) > INSERTION_TOLERANCE) return null
  if (column < 0 || column >= STANDARD_V1_LAYOUT.columns) return null
  if (row < 0 || row > ROW_RAIL_BOTTOM_PLUS) return null

  if (row === ROW_RAIL_TOP_PLUS) {
    return { kind: 'RAIL', groupKey: `${breadboard.id}:rail:top:+`, column, row }
  }
  if (row === ROW_RAIL_TOP_MINUS) {
    return { kind: 'RAIL', groupKey: `${breadboard.id}:rail:top:-`, column, row }
  }
  if (row >= ROW_STRIP_TOP_START && row < ROW_STRIP_TOP_START + STANDARD_V1_LAYOUT.rowsPerSide) {
    return { kind: 'STRIP', groupKey: `${breadboard.id}:strip:col${column}:top`, column, row }
  }
  if (row >= ROW_STRIP_BOTTOM_START && row < ROW_STRIP_BOTTOM_START + STANDARD_V1_LAYOUT.rowsPerSide) {
    return { kind: 'STRIP', groupKey: `${breadboard.id}:strip:col${column}:bottom`, column, row }
  }
  if (row === ROW_RAIL_BOTTOM_MINUS) {
    return { kind: 'RAIL', groupKey: `${breadboard.id}:rail:bottom:-`, column, row }
  }
  if (row === ROW_RAIL_BOTTOM_PLUS) {
    return { kind: 'RAIL', groupKey: `${breadboard.id}:rail:bottom:+`, column, row }
  }

  // Rainure centrale (LOCK-09) ou interstice rail/strip : aucun trou.
  return null
}

/**
 * FT-B-001-S1 — Primitive générique UNIQUE de classification pin → trou.
 *
 * Centralise, SANS en changer la sémantique, le motif dupliqué jusqu'ici dans
 * breadboardPlacementAdapter / breadboardConnectivity /
 * BreadboardHoleCollisionRule / breadboardSolidarity :
 *
 *     holeAt(breadboard, origin.x + pin.dx, origin.y + pin.dy)   pour chaque pin
 *
 * Delta ZÉRO : `holeAt()` (arrondi, tolérance ±2 inclusive par axe, limites,
 * rainure, groupKey) est appelé à l'identique. La primitive :
 *  - ne déplace PAS le composant ;
 *  - ne cherche AUCUNE meilleure origine (le search reste la responsabilité de
 *    breadboardPlacementAdapter) ;
 *  - ne décide d'AUCUNE politique de placement — chaque consommateur applique
 *    la sienne sur `results` : PLACEMENT = toutes résolues ; CONNECTIVITÉ /
 *    COLLISION = par pin résolue ; SOLIDARITÉ = au moins une résolue.
 *
 * Résultats PARTIELS préservés (une pin non résolue n'invalide pas les
 * autres) et ordre des pins préservé (identique à `pins`).
 *
 * @param {{ id: string, position: {x:number,y:number} } | null} breadboard
 * @param {Array<{ id: string, dx: number, dy: number }>} pins  typiquement `getComponentDef(type).pins`
 * @param {{ x: number, y: number }} origin  position d'instance du composant (forme Presentation {x,y} ou Core {position:{x,y}} déjà déréférencée par l'appelant)
 * @returns {{
 *   results: Array<{ pinId: string, hole: (ReturnType<typeof holeAt>)|null, resolved: boolean }>,
 *   allResolved: boolean,
 *   anyResolved: boolean,
 * }}
 */
export function resolveComponentPinHoles(breadboard, pins, origin) {
  const list = Array.isArray(pins) ? pins : []
  const ox = origin && Number.isFinite(origin.x) ? origin.x : NaN
  const oy = origin && Number.isFinite(origin.y) ? origin.y : NaN

  const results = list.map((pin) => {
    const hole = holeAt(breadboard, ox + (pin ? pin.dx : NaN), oy + (pin ? pin.dy : NaN))
    return { pinId: pin ? pin.id : undefined, hole: hole ?? null, resolved: hole != null }
  })

  return {
    results,
    allResolved: results.length > 0 && results.every((r) => r.resolved),
    anyResolved: results.some((r) => r.resolved),
  }
}
