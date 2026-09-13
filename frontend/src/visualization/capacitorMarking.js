/**
 * capacitorMarking.js — MB-L1-PROP-005
 *
 * Primitive pure : dérive le marquage EIA 3 chiffres (« 104 », etc.) d'un
 * condensateur céramique à partir de SA SEULE valeur électrique
 * (`component.parameters.capacitance`, en Farads). Jamais persisté ailleurs
 * (Document/History/export) — appelée à chaque rendu, jamais stockée.
 *
 * Pas de React, pas de DOM, pas de CSS, aucune mutation de simulateur :
 * fonction pure `capacitance -> modèle de marquage`, testable isolément.
 *
 * Calcul générique (mantisse à 2 chiffres significatifs × exposant en pF) —
 * aucune table `if (capacitance === 1e-7)`. Une valeur non représentable
 * exactement par le code à 3 chiffres, ou hors du domaine physique qualifié
 * V1, ne produit JAMAIS un marquage inventé (mensonge visuel) : `exact:
 * false`, `marking: null`. L'électrique reste exactement la valeur choisie
 * — ce module ne la modifie, n'en arrondit, jamais.
 */

// Domaine physique qualifié V1 pour le corps Candidate C (§17 du ticket) :
// 10 pF à 1 µF inclus. En dehors -> rendu neutre (aucune extrapolation
// visuelle non qualifiée). Ne restreint PAS la plage canonique du paramètre
// `capacitance` (canonicalRegistry.js, minimum 1e-12 / maximum 1 F, non
// modifiée) — seule la PROJECTION visuelle est bornée ici.
const DOMAIN_MIN_PICOFARADS = 10
const DOMAIN_MAX_PICOFARADS = 1_000_000 // 1 µF

// Exposants (en pF) couverts par le code EIA 3 chiffres standard.
const EXPONENT_MIN = 0
const EXPONENT_MAX = 9

// Tolérance numérique réservée à la comparaison flottante (ex. artefacts
// IEEE 754 sur `farads * 1e12`) — ne sert jamais à altérer/arrondir la
// valeur électrique, uniquement à décider si elle correspond
// mathématiquement à un code ABN exact.
const RELATIVE_MATCH_TOLERANCE = 1e-9

function unrepresentable(reason) {
  return { exact: false, marking: null, picofarads: null, reason }
}

/**
 * @param {unknown} capacitanceFarads valeur électrique en Farads (source de
 *   vérité unique — jamais modifiée, jamais arrondie silencieusement ici).
 * @returns {{
 *   exact: boolean,
 *   marking: string|null,
 *   picofarads: number|null,
 *   reason: string|null,
 * }}
 */
export function encodeCapacitorMarking(capacitanceFarads) {
  if (typeof capacitanceFarads !== 'number' || !Number.isFinite(capacitanceFarads) || capacitanceFarads <= 0) {
    return unrepresentable('invalid-input')
  }

  const picofarads = capacitanceFarads * 1e12

  if (picofarads < DOMAIN_MIN_PICOFARADS) return unrepresentable('below-domain-min')
  if (picofarads > DOMAIN_MAX_PICOFARADS) return unrepresentable('above-domain-max')

  for (let exponent = EXPONENT_MIN; exponent <= EXPONENT_MAX; exponent++) {
    const mantissa = picofarads / 10 ** exponent
    const rounded = Math.round(mantissa)
    if (rounded < 10 || rounded > 99) continue

    const reconstructed = rounded * 10 ** exponent
    const relativeError = Math.abs(reconstructed - picofarads) / picofarads
    if (relativeError > RELATIVE_MATCH_TOLERANCE) continue

    return {
      exact: true,
      marking: `${rounded}${exponent}`,
      picofarads: reconstructed,
      reason: null,
    }
  }

  return unrepresentable('not-representable')
}
