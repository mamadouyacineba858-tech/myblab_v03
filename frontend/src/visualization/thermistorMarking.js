/**
 * thermistorMarking.js — MB-L1-PROP-006
 *
 * Primitive pure : derive un marquage nominal EIA 3 chiffres depuis
 * component.parameters.resistance (Ohms). Le marquage est une projection
 * visuelle uniquement : jamais persiste, jamais arrondi silencieusement.
 */
const DOMAIN_MIN_OHMS = 100
const DOMAIN_MAX_OHMS = 1_000_000
const EXPONENT_MIN = 0
const EXPONENT_MAX = 9
const RELATIVE_MATCH_TOLERANCE = 1e-9

function unrepresentable(reason) {
  return { exact: false, marking: null, ohms: null, reason }
}

/**
 * @param {unknown} resistanceOhms
 * @returns {{ exact:boolean, marking:string|null, ohms:number|null, reason:string|null }}
 */
export function encodeThermistorMarking(resistanceOhms) {
  if (typeof resistanceOhms !== 'number' || !Number.isFinite(resistanceOhms) || resistanceOhms <= 0) {
    return unrepresentable('invalid-input')
  }

  if (resistanceOhms < DOMAIN_MIN_OHMS) return unrepresentable('below-domain-min')
  if (resistanceOhms > DOMAIN_MAX_OHMS) return unrepresentable('above-domain-max')

  for (let exponent = EXPONENT_MIN; exponent <= EXPONENT_MAX; exponent++) {
    const mantissa = resistanceOhms / 10 ** exponent
    const rounded = Math.round(mantissa)
    if (rounded < 10 || rounded > 99) continue

    const reconstructed = rounded * 10 ** exponent
    const relativeError = Math.abs(reconstructed - resistanceOhms) / resistanceOhms
    if (relativeError > RELATIVE_MATCH_TOLERANCE) continue

    return {
      exact: true,
      marking: `${rounded}${exponent}`,
      ohms: reconstructed,
      reason: null,
    }
  }

  return unrepresentable('not-representable')
}
