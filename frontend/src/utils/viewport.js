/**
 * Modèle de viewport du Canvas — MB-VIS-CANVAS-050.
 *
 * Un seul objet d'état viewport `{ zoom, translateX, translateY }` intègre
 * le zoom (déjà présent depuis avant ce ticket) et le pan (nouveau). La
 * translation est exprimée en espace ÉCRAN (Décision CSA D1 du Blueprint) :
 * un pan de N pixels écran déplace translateX/Y de N, quel que soit le zoom
 * courant — ce n'est PAS une coordonnée Document.
 *
 * Relation canonique (Décision CSA D2) : `screen = viewportTranslation +
 * document * zoom`. C'est exactement ce que réalise la composition CSS
 * `transform: translate(translateX px, translateY px) scale(zoom)` posée
 * sur `.simulation-canvas__zoom-layer` (SimulationCanvas.jsx) — les
 * fonctions de transform CSS s'appliquent de la plus interne (scale) vers
 * la plus externe (translate), donc un point local (x,y) devient
 * (translateX + zoom*x, translateY + zoom*y), conforme à la relation.
 *
 * L'inverse (Document→écran n'est jamais nécessaire pour interpréter un
 * événement pointeur — c'est `clientToCanvas()`, utils/geometry.js, qui
 * reste l'unique oracle screen→Document, seul et même modèle consommé par
 * toutes les interactions (049 + 050). Ce module ne réimplémente jamais
 * cette conversion : `zoomViewportAtScreenPoint()` ci-dessous délègue à
 * `clientToCanvas()` pour calculer le point Document à préserver sous le
 * curseur, plutôt que de rederiver la division par zoom localement.
 */
import { clientToCanvas } from "./geometry.js"

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2

export const DEFAULT_VIEWPORT = Object.freeze({ zoom: 1, translateX: 0, translateY: 0 })

export function createDefaultViewport() {
  return { ...DEFAULT_VIEWPORT }
}

/** Borne et sécurise une valeur de zoom — jamais infinie, jamais NaN (D10). */
export function clampZoom(zoom) {
  if (!Number.isFinite(zoom)) return DEFAULT_VIEWPORT.zoom
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

/**
 * Recalcule le viewport pour qu'un zoom vers `nextZoomRaw`, ancré au point
 * écran (screenX, screenY) — relatif au coin haut-gauche du Canvas, comme
 * `clientToCanvas` — conserve EXACTEMENT le même point Document sous ce
 * point écran (Décision CSA D4 : zoom orienté curseur sans dérive).
 */
export function zoomViewportAtScreenPoint(viewport, screenX, screenY, nextZoomRaw) {
  const nextZoom = clampZoom(nextZoomRaw)
  const documentPoint = clientToCanvas(
    { clientX: screenX, clientY: screenY },
    { left: 0, top: 0 },
    viewport.zoom,
    viewport.translateX,
    viewport.translateY
  )
  return {
    zoom: nextZoom,
    translateX: screenX - documentPoint.x * nextZoom,
    translateY: screenY - documentPoint.y * nextZoom,
  }
}

/** Pan pur : translation écran additive, zoom inchangé (D1/D5). */
export function panViewport(viewport, deltaScreenX, deltaScreenY) {
  const dx = Number.isFinite(deltaScreenX) ? deltaScreenX : 0
  const dy = Number.isFinite(deltaScreenY) ? deltaScreenY : 0
  return { ...viewport, translateX: viewport.translateX + dx, translateY: viewport.translateY + dy }
}

/**
 * Centre un rectangle Document (`{minX,minY,maxX,maxY}`) dans un viewport
 * écran de taille `viewportSize` (`{width,height}`), au zoom `zoom` fourni
 * (le zoom courant si l'appelant ne veut que recentrer sans rezoomer —
 * primitive générique réutilisable par un futur focus composant, D9).
 */
export function centerOnRect(rectDoc, viewportSize, zoom) {
  if (!rectDoc || !viewportSize) return null
  const z = clampZoom(zoom)
  const centerX = (rectDoc.minX + rectDoc.maxX) / 2
  const centerY = (rectDoc.minY + rectDoc.maxY) / 2
  return {
    zoom: z,
    translateX: viewportSize.width / 2 - centerX * z,
    translateY: viewportSize.height / 2 - centerY * z,
  }
}

/** Centre un point Document unique — cas dégénéré de centerOnRect (D9). */
export function centerOnPoint(pointDoc, viewportSize, zoom) {
  if (!pointDoc) return null
  return centerOnRect(
    { minX: pointDoc.x, maxX: pointDoc.x, minY: pointDoc.y, maxY: pointDoc.y },
    viewportSize,
    zoom
  )
}

/**
 * Calcule le viewport (zoom + translation) qui fait tenir `bounds` (Document)
 * dans `viewportSize` (écran, px) avec une marge `padding` (écran, px) de
 * chaque côté (D7/D8). Retourne `null` si les bounds ou la taille de
 * viewport ne permettent aucun calcul valide (scène vide, canvas non
 * mesurable) — no-op sûr pour l'appelant plutôt qu'un zoom infini/NaN (D10).
 */
export function fitViewportToBounds(bounds, viewportSize, { padding = 40 } = {}) {
  if (!bounds || !viewportSize) return null
  if (!(viewportSize.width > 0) || !(viewportSize.height > 0)) return null
  const boundsWidth = bounds.maxX - bounds.minX
  const boundsHeight = bounds.maxY - bounds.minY
  if (!(boundsWidth > 0) || !(boundsHeight > 0)) return null
  const availableWidth = Math.max(1, viewportSize.width - padding * 2)
  const availableHeight = Math.max(1, viewportSize.height - padding * 2)
  const zoom = clampZoom(Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight))
  return centerOnRect(bounds, viewportSize, zoom)
}
