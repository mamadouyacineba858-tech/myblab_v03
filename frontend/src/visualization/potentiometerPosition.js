/**
 * potentiometerPosition.js — MB-L1-PROP-008
 *
 * Projection visuelle PURE de la position électrique persistante du curseur
 * (`parameters.position`, domaine canonique 0..1) vers l'angle mécanique du
 * repère blanc du bouton. Aucune mutation, aucune simulation et aucune
 * persistance supplémentaire : la valeur du Document reste l'unique vérité.
 */

export const POTENTIOMETER_MIN_ANGLE_DEG = -135
export const POTENTIOMETER_MAX_ANGLE_DEG = 135
export const POTENTIOMETER_DEFAULT_POSITION = 0.5

function normalizedPosition(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return POTENTIOMETER_DEFAULT_POSITION
  return Math.min(1, Math.max(0, value))
}

/**
 * @param {unknown} position
 * @returns {{position:number, angleDeg:number}}
 */
export function resolvePotentiometerVisualPosition(position) {
  const normalized = normalizedPosition(position)
  return {
    position: normalized,
    angleDeg: POTENTIOMETER_MIN_ANGLE_DEG + normalized * (POTENTIOMETER_MAX_ANGLE_DEG - POTENTIOMETER_MIN_ANGLE_DEG),
  }
}
