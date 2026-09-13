import { describe, it, expect } from 'vitest'
import { encodeResistorColorCode } from '../resistorColorCode.js'

// MB-L1-PROP-004 — table couleur standard 4 bandes (digit, digit,
// multiplicateur), tolérance V1 toujours or/±5 %.
const EXACT_CASES = [
  [1, ['brown', 'black', 'gold']],
  [2.2, ['red', 'red', 'gold']],
  [4.7, ['yellow', 'violet', 'gold']],
  [10, ['brown', 'black', 'black']],
  [22, ['red', 'red', 'black']],
  [47, ['yellow', 'violet', 'black']],
  [68, ['blue', 'gray', 'black']],
  [100, ['brown', 'black', 'brown']],
  [150, ['brown', 'green', 'brown']],
  [220, ['red', 'red', 'brown']],
  [330, ['orange', 'orange', 'brown']],
  [470, ['yellow', 'violet', 'brown']],
  [680, ['blue', 'gray', 'brown']],
  [1000, ['brown', 'black', 'red']],
  [1500, ['brown', 'green', 'red']],
  [2200, ['red', 'red', 'red']],
  [3300, ['orange', 'orange', 'red']],
  [4700, ['yellow', 'violet', 'red']],
  [6800, ['blue', 'gray', 'red']],
  [10000, ['brown', 'black', 'orange']],
  [22000, ['red', 'red', 'orange']],
  [47000, ['yellow', 'violet', 'orange']],
  [100000, ['brown', 'black', 'yellow']],
  [220000, ['red', 'red', 'yellow']],
  [470000, ['yellow', 'violet', 'yellow']],
  [1000000, ['brown', 'black', 'green']],
  [2200000, ['red', 'red', 'green']],
  [4700000, ['yellow', 'violet', 'green']],
  [10000000, ['brown', 'black', 'blue']],
]

describe('encodeResistorColorCode — valeurs exactement représentables (4 bandes)', () => {
  it.each(EXACT_CASES)('%s Ω -> %j (+ tolérance gold)', (resistance, expectedColors) => {
    const result = encodeResistorColorCode(resistance)

    expect(result.exact).toBe(true)
    expect(result.bandCount).toBe(4)
    expect(result.representedResistance).toBeCloseTo(resistance, 6)
    expect(result.bands).toHaveLength(4)
    expect(result.bands.map((b) => b.color)).toEqual([...expectedColors, 'gold'])
    expect(result.bands[0].role).toBe('digit')
    expect(result.bands[1].role).toBe('digit')
    expect(result.bands[2].role).toBe('multiplier')
    expect(result.bands[3].role).toBe('tolerance')
    expect(result.tolerancePercent).toBe(5)
  })
})

describe('encodeResistorColorCode — jamais de mensonge visuel sur une valeur non représentable', () => {
  const NEVER_LIE_CASES = [
    ['1234 Ω (3 chiffres significatifs, non représentable en 4 bandes)', 1234],
    ['0.001 Ω (hors plage du multiplicateur minimal supporté, argent -2)', 0.001],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['-1 (résistance négative invalide)', -1],
    ['0 (résistance nulle invalide)', 0],
    ['null', null],
    ['undefined', undefined],
    ['une chaîne numérique ("220")', '220'],
  ]

  it.each(NEVER_LIE_CASES)('%s -> exact:false, bands:[], representedResistance:null', (_label, value) => {
    const result = encodeResistorColorCode(value)
    expect(result.exact).toBe(false)
    expect(result.representedResistance).toBeNull()
    expect(result.bands).toEqual([])
    expect(result.bandCount).toBe(4)
  })

  it('ne modifie jamais la valeur électrique fournie (aucun arrondi silencieux)', () => {
    // 1234 ne doit jamais être "silencieusement" traité comme 1200.
    const result = encodeResistorColorCode(1234)
    expect(result.representedResistance).not.toBe(1200)
    expect(result.representedResistance).toBeNull()
  })
})

describe('encodeResistorColorCode — discipline flottante', () => {
  it('4.7 reste exact malgré les artefacts IEEE 754 potentiels sur la division par 10^exposant', () => {
    const result = encodeResistorColorCode(4.7)
    expect(result.exact).toBe(true)
    expect(result.representedResistance).toBeCloseTo(4.7, 9)
  })

  it('1.5k / 6.8k restent exacts malgré la conversion kΩ -> Ω en flottant', () => {
    for (const resistance of [1500, 6800, 2200000, 4700000]) {
      const result = encodeResistorColorCode(resistance)
      expect(result.exact).toBe(true)
      expect(result.representedResistance).toBeCloseTo(resistance, 6)
    }
  })

  it('la tolérance flottante interne ne doit jamais faire accepter une valeur réellement fausse', () => {
    // 220 * 1.001 s'écarte de 220 de bien plus que l'epsilon flottant :
    // ne doit jamais être rapporté comme une projection exacte de 220.
    const result = encodeResistorColorCode(220 * 1.001)
    if (result.exact) {
      expect(result.representedResistance).not.toBe(220)
    }
  })
})

describe('encodeResistorColorCode — pureté et absence de mutation', () => {
  it('est déterministe : deux appels avec la même valeur donnent un résultat structurellement identique', () => {
    const a = encodeResistorColorCode(220)
    const b = encodeResistorColorCode(220)
    expect(a).toEqual(b)
  })

  it("n'accepte aucune table de correspondance littérale par valeur (vérification structurelle du code source)", async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../resistorColorCode.js', import.meta.url), 'utf-8')
    )
    expect(source).not.toMatch(/resistance\s*===\s*\d/)
  })
})
