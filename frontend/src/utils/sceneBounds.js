/**
 * Bounds Document de la scène — MB-VIS-CANVAS-050 (fit-to-content /
 * fit-to-selection, Décision CSA D7/D8).
 *
 * Purement géométrique (aucun état, aucune lecture de zoom/écran) : reçoit
 * des composants/wires/breadboard déjà en coordonnées Document et retourne
 * `{minX,minY,maxX,maxY}` ou `null` si rien n'est exploitable (scène vide —
 * no-op sûr pour l'appelant, jamais une bounding box 0×0 artificielle).
 *
 * L'approximation de taille de composant (`comp.width || 80`,
 * `comp.height || 40`) reprend EXACTEMENT celle déjà utilisée par
 * `endMarquee()` (useCircuitState.js, MB-003.4) — `component.width/height`
 * n'existe sur aucun Document réel (componentDefinitions.js ne déclare pas
 * ces champs), donc ce repli est systématiquement celui appliqué en
 * pratique. Aucune nouvelle géométrie n'est inventée ici ; le fallback du
 * breadboard reprend de même la formule déjà utilisée par `endMarquee()`
 * pour son rectangle de sélection (mêmes constantes breadboardGeometry.js).
 */
import { BREADBOARD_PITCH, STANDARD_V1_LAYOUT, STANDARD_V1_TOTAL_ROWS } from "./breadboardGeometry.js"

function extendBounds(bounds, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return bounds
  if (!bounds) return { minX: x, minY: y, maxX: x, maxY: y }
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
  }
}

export function computeSceneBounds(components = [], wires = [], breadboard = null) {
  let bounds = null

  for (const c of components || []) {
    if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue
    const width = c.width || 80
    const height = c.height || 40
    bounds = extendBounds(bounds, c.x, c.y)
    bounds = extendBounds(bounds, c.x + width, c.y + height)
  }

  for (const w of wires || []) {
    if (!Array.isArray(w?.waypoints)) continue
    for (const wp of w.waypoints) {
      bounds = extendBounds(bounds, wp?.x, wp?.y)
    }
  }

  if (breadboard && breadboard.position) {
    const padding = BREADBOARD_PITCH
    const width = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + padding * 2
    const height = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + padding * 2
    const bbX = breadboard.position.x - padding
    const bbY = breadboard.position.y - padding
    bounds = extendBounds(bounds, bbX, bbY)
    bounds = extendBounds(bounds, bbX + width, bbY + height)
  }

  return bounds
}
