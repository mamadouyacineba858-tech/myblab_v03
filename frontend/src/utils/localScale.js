/**
 * Échelle visuelle locale d'un composant focalisé — MB-VIS-CANVAS-052.
 *
 * Présentation pure, jamais un zoom de viewport (voir Blueprint D2/D5) :
 * ce module ne connaît ni `component.x/y`, ni le Document, ni le viewport
 * global (`utils/viewport.js`, non touché). Il fournit uniquement :
 *  - les bornes CSA verrouillées (Authority §D) ;
 *  - une fonction de clamp défensive (même patron que `clampZoom`,
 *    utils/viewport.js — jamais de valeur infinie/NaN, D2) ;
 *  - la formule géométrique pure de mise à l'échelle autour d'un centre,
 *    partagée par CircuitComponent.jsx (implicitement, via `transform:
 *    scale()`, dont c'est exactement l'effet visuel) et
 *    pinPresentationGeometry.js (explicitement, pour que l'extrémité d'un
 *    fil dessinée par WiresLayer corresponde AU PIXEL PRÈS à la position
 *    visuelle du pin après application du même `transform: scale()`).
 */

export const LOCAL_SCALE_MIN = 1.0
export const LOCAL_SCALE_MAX = 3.0
export const LOCAL_SCALE_STEP = 0.1
export const LOCAL_SCALE_DEFAULT = 1.5

/** Borne et sécurise une échelle locale — jamais infinie, jamais NaN. */
export function clampLocalScale(scale) {
  if (!Number.isFinite(scale)) return LOCAL_SCALE_DEFAULT
  return Math.min(LOCAL_SCALE_MAX, Math.max(LOCAL_SCALE_MIN, scale))
}

/**
 * Projette `point` autour de `center` par le facteur `scale` — l'inverse
 * exact d'un CSS `transform: scale(scale)` posé avec `transform-origin:
 * center center` sur un élément dont le coin visuel correspondant à
 * `center` reste fixe à l'écran. Utilisée par
 * `pinPresentationGeometry.js::getPinPresentationPosition()` pour que la
 * position de présentation d'un pin (donc l'extrémité de fil dessinée par
 * WiresLayer) prédise exactement où ce pin apparaît visuellement une fois
 * le composant focalisé mis à l'échelle localement — sans que
 * CircuitComponent.jsx ait besoin de recalculer la position DOM de son
 * <Pin>, qui hérite déjà de la mise à l'échelle par héritage CSS naturel
 * (Pin est un enfant DOM du wrapper transformé).
 */
export function scalePointAroundCenter(point, center, scale) {
  if (!point || !center) return point
  if (!Number.isFinite(scale) || scale === 1) return point
  return {
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }
}
