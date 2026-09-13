import { describe, it, expect } from 'vitest'
import { encodeCapacitorMarking } from '../capacitorMarking.js'

// MB-L1-PROP-005 — code EIA 3 chiffres standard (ABN, valeur en pF).
const EXACT_CASES = [
  [10e-12, '100'],
  [47e-12, '470'],
  [100e-12, '101'],
  [1e-9, '102'],
  [2.2e-9, '222'],
  [4.7e-9, '472'],
  [10e-9, '103'],
  [47e-9, '473'],
  [100e-9, '104'],
  [220e-9, '224'],
  [470e-9, '474'],
  [1e-6, '105'],
]

describe('encodeCapacitorMarking — valeurs exactement représentables (domaine 10 pF..1 µF)', () => {
  it.each(EXACT_CASES)('%s F -> "%s"', (capacitance, expectedMarking) => {
    const result = encodeCapacitorMarking(capacitance)
    expect(result.exact).toBe(true)
    expect(result.marking).toBe(expectedMarking)
    expect(result.picofarads).toBeCloseTo(capacitance * 1e12, 6)
    expect(result.reason).toBeNull()
  })
})

describe('encodeCapacitorMarking — jamais de mensonge visuel sur une valeur non représentable ou hors domaine', () => {
  const NEVER_LIE_CASES = [
    ['1 pF (sous le plancher de domaine 10 pF)', 1e-12, 'below-domain-min'],
    ['4.7 pF (sous le plancher de domaine, non représentable en 2 chiffres significatifs dans ce contrat)', 4.7e-12, 'below-domain-min'],
    ['123 nF (3 chiffres significatifs, non représentable en code ABN)', 123e-9, 'not-representable'],
    ['2.2 µF (au-dessus du plafond de domaine V1 1 µF)', 2.2e-6, 'above-domain-max'],
    ['100 µF (ancien default historique — désormais hors domaine V1)', 100e-6, 'above-domain-max'],
    ['1 F (bien au-dessus du domaine)', 1, 'above-domain-max'],
    ['NaN', NaN, 'invalid-input'],
    ['Infinity', Infinity, 'invalid-input'],
    ['-Infinity', -Infinity, 'invalid-input'],
    ['0 (capacitance nulle invalide)', 0, 'invalid-input'],
    ['valeur négative invalide', -1e-9, 'invalid-input'],
    ['null', null, 'invalid-input'],
    ['undefined', undefined, 'invalid-input'],
    ['une chaîne numérique ("1e-7")', '1e-7', 'invalid-input'],
  ]

  it.each(NEVER_LIE_CASES)('%s -> exact:false, marking:null, picofarads:null, reason:%s', (_label, value, expectedReason) => {
    const result = encodeCapacitorMarking(value)
    expect(result.exact).toBe(false)
    expect(result.marking).toBeNull()
    expect(result.picofarads).toBeNull()
    expect(result.reason).toBe(expectedReason)
  })

  it('123 nF ne devient jamais silencieusement 120 nF ou 124 (aucun code fabriqué)', () => {
    const result = encodeCapacitorMarking(123e-9)
    expect(result.marking).not.toBe('124')
    expect(result.marking).not.toBe('123')
    expect(result.marking).toBeNull()
  })
})

describe('encodeCapacitorMarking — discipline flottante (artefacts IEEE 754 sur farads * 1e12)', () => {
  const FLOAT_STRESS_CASES = [
    [1e-9, '102'],
    [4.7e-9, '472'],
    [1e-7, '104'],
    [4.7e-7, '474'],
    [1e-6, '105'],
  ]

  it.each(FLOAT_STRESS_CASES)('%s F reste exact malgré les artefacts flottants potentiels -> "%s"', (capacitance, expectedMarking) => {
    const result = encodeCapacitorMarking(capacitance)
    expect(result.exact).toBe(true)
    expect(result.marking).toBe(expectedMarking)
  })

  it('la tolérance flottante interne ne doit jamais faire accepter une valeur réellement fausse', () => {
    const result = encodeCapacitorMarking(100e-9 * 1.001)
    if (result.exact) {
      expect(result.picofarads).not.toBeCloseTo(100000, 0)
    }
  })
})

describe('encodeCapacitorMarking — pureté et absence de mutation', () => {
  it('est déterministe : deux appels avec la même valeur donnent un résultat structurellement identique', () => {
    const a = encodeCapacitorMarking(100e-9)
    const b = encodeCapacitorMarking(100e-9)
    expect(a).toEqual(b)
  })

  it("n'accepte aucune table de correspondance littérale par valeur (vérification structurelle du code source)", async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../capacitorMarking.js', import.meta.url), 'utf-8')
    )
    expect(source).not.toMatch(/capacitanceFarads\s*===\s*[\d.]/)
  })
})
