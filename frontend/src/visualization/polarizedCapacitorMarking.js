/**
 * polarizedCapacitorMarking.js — MB-L1-PROP-010
 *
 * Projection VISUELLE pure de la capacitance persistante vers un marquage
 * lisible de condensateur électrolytique. La valeur électrique reste en F et
 * n'est jamais modifiée/persistée ici.
 *
 * Le formatter choisit une unité d'ingénierie adaptée (F / µF / nF / pF) et
 * n'affiche une valeur que si elle est représentable, à la tolérance flottante
 * près, avec au plus 6 décimales dans l'unité choisie. Cela évite tout arrondi
 * silencieux qui ferait mentir le corps par rapport au Document.
 */
const RELATIVE_TOLERANCE = 1e-9
const MAX_DECIMALS = 6

function invalid(reason) {
  return { exact: false, marking: null, value: null, unit: null, reason }
}

function normalizeDecimal(value) {
  for (let decimals = 0; decimals <= MAX_DECIMALS; decimals++) {
    const rounded = Number(value.toFixed(decimals))
    const scale = Math.max(1, Math.abs(value))
    if (Math.abs(rounded - value) / scale <= RELATIVE_TOLERANCE) return rounded
  }
  return null
}

/**
 * @param {unknown} capacitanceFarads
 * @returns {{exact:boolean, marking:string|null, value:number|null, unit:string|null, reason:string|null}}
 */
export function formatPolarizedCapacitanceMarking(capacitanceFarads) {
  if (typeof capacitanceFarads !== 'number' || !Number.isFinite(capacitanceFarads) || capacitanceFarads <= 0) {
    return invalid('invalid-input')
  }

  let scale
  let unit
  if (capacitanceFarads >= 1) {
    scale = 1
    unit = 'F'
  } else if (capacitanceFarads >= 1e-6) {
    scale = 1e6
    unit = 'µF'
  } else if (capacitanceFarads >= 1e-9) {
    scale = 1e9
    unit = 'nF'
  } else {
    scale = 1e12
    unit = 'pF'
  }

  const normalized = normalizeDecimal(capacitanceFarads * scale)
  if (normalized == null) return invalid('not-exactly-displayable')

  return {
    exact: true,
    marking: `${normalized}${unit}`,
    value: normalized,
    unit,
    reason: null,
  }
}
