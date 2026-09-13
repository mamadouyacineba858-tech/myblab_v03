/**
 * resistorColorCode.js — MB-L1-PROP-004
 *
 * Primitive pure : dérive le code couleur visuel d'une résistance à partir
 * de SA SEULE valeur électrique (`component.parameters.resistance`). Aucune
 * bande n'est jamais persistée ailleurs (Document/History/export) — cette
 * fonction est appelée à chaque rendu, jamais stockée.
 *
 * Pas de React, pas de DOM, pas de CSS, aucune mutation de simulateur :
 * fonction pure `resistance -> modèle visuel`, testable isolément.
 *
 * Le calcul est générique (arithmétique sur l'exposant décimal et la
 * mantisse à 2 chiffres significatifs) — aucune table `if (resistance ===
 * 220)`. Une valeur non représentable exactement par le modèle à bandes
 * supporté ne doit JAMAIS produire un faux code couleur (mensonge visuel) :
 * elle retourne `exact: false`, `bands: []`.
 */

const DIGIT_COLORS = [
  'black', 'brown', 'red', 'orange', 'yellow',
  'green', 'blue', 'violet', 'gray', 'white',
]

// Couvre les exposants standard de la table couleur (argent -2 à blanc 9).
const MULTIPLIER_COLOR_BY_EXPONENT = {
  '-2': 'silver',
  '-1': 'gold',
  '0': 'black',
  '1': 'brown',
  '2': 'red',
  '3': 'orange',
  '4': 'yellow',
  '5': 'green',
  '6': 'blue',
  '7': 'violet',
  '8': 'gray',
  '9': 'white',
}

const TOLERANCE_COLOR_V1 = 'gold'
const TOLERANCE_PERCENT_V1 = 5

// Tolérance numérique réservée à la comparaison flottante (ex. 4.7/0.1 en
// IEEE 754) — ne sert jamais à altérer/arrondir la valeur électrique
// elle-même, uniquement à décider si elle correspond mathématiquement à une
// représentation à bandes exacte.
const RELATIVE_MATCH_TOLERANCE = 1e-9

function encode4Band(resistance) {
  const exponents = Object.keys(MULTIPLIER_COLOR_BY_EXPONENT).map(Number)
  for (const exponent of exponents) {
    const mantissa = resistance / 10 ** exponent
    const rounded = Math.round(mantissa)
    if (rounded < 10 || rounded > 99) continue

    const reconstructed = rounded * 10 ** exponent
    const relativeError = Math.abs(reconstructed - resistance) / resistance
    if (relativeError > RELATIVE_MATCH_TOLERANCE) continue

    const digit1 = Math.floor(rounded / 10)
    const digit2 = rounded % 10

    return {
      exact: true,
      bandCount: 4,
      representedResistance: reconstructed,
      tolerancePercent: TOLERANCE_PERCENT_V1,
      bands: [
        { role: 'digit', digit: digit1, color: DIGIT_COLORS[digit1] },
        { role: 'digit', digit: digit2, color: DIGIT_COLORS[digit2] },
        { role: 'multiplier', exponent, color: MULTIPLIER_COLOR_BY_EXPONENT[String(exponent)] },
        { role: 'tolerance', tolerancePercent: TOLERANCE_PERCENT_V1, color: TOLERANCE_COLOR_V1 },
      ],
    }
  }
  return null
}

// Point d'extension pour de futurs modèles à 5/6 bandes (3 chiffres
// significatifs, tolérance non figée sur or) — aucune réécriture du
// renderer ne sera nécessaire : il consomme uniquement `bands`/`exact`.
const BAND_COUNT_STRATEGIES = {
  4: encode4Band,
}

function unrepresentable(bandCount) {
  return { exact: false, bandCount, representedResistance: null, bands: [] }
}

/**
 * @param {unknown} resistance valeur électrique en Ohms (source de vérité
 *   unique — jamais modifiée, jamais arrondie silencieusement ici).
 * @param {{ bandCount?: number }} [options]
 * @returns {{
 *   exact: boolean,
 *   bandCount: number,
 *   representedResistance: number|null,
 *   tolerancePercent?: number,
 *   bands: Array<Record<string, unknown>>,
 * }}
 */
export function encodeResistorColorCode(resistance, options = {}) {
  const bandCount = options?.bandCount ?? 4
  const strategy = BAND_COUNT_STRATEGIES[bandCount]
  if (!strategy) return unrepresentable(bandCount)

  if (typeof resistance !== 'number' || !Number.isFinite(resistance) || resistance <= 0) {
    return unrepresentable(bandCount)
  }

  return strategy(resistance) ?? unrepresentable(bandCount)
}
