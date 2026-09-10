/**
 * breadboardElectricalIdentity.test.js — FT-C-BREAD-MULTI-001-B (CSA D2, B5/B6/B24).
 *
 * Primitive UNIQUE d'identité électrique globale d'un groupe de breadboard :
 * déterministe, stable, collision-safe même pour des ids / groupKeys
 * contenant le séparateur naïf ':'.
 */
import { describe, it, expect } from 'vitest'
import {
  makeBreadboardGroupKey,
  parseBreadboardGroupKey,
} from '../breadboardElectricalIdentity.js'

describe('FT-C-BREAD-MULTI-001-B — makeBreadboardGroupKey (D2)', () => {
  it('B24 — même breadboard, groupes locaux différents => clés différentes', () => {
    expect(makeBreadboardGroupKey('A', 'group1')).not.toBe(makeBreadboardGroupKey('A', 'group2'))
  })

  it('B24 — même groupe local, breadboards différents => clés différentes (isolation)', () => {
    expect(makeBreadboardGroupKey('A', 'group1')).not.toBe(makeBreadboardGroupKey('B', 'group1'))
  })

  it('B5 — stable / déterministe : mêmes entrées => même clé', () => {
    expect(makeBreadboardGroupKey('A', 'group1')).toBe(makeBreadboardGroupKey('A', 'group1'))
    expect(makeBreadboardGroupKey('bb-17', 'strip:col5:top')).toBe(
      makeBreadboardGroupKey('bb-17', 'strip:col5:top')
    )
  })

  it('B6 — collision-safe : aucun couple (id, local) distinct ne produit la même clé, même avec des \':\'', () => {
    const pairs = [
      ['a', 'b:c'],
      ['a:b', 'c'],
      ['a:b:c', ''],
      ['', 'a:b:c'],
      ['a', 'b', /* leurre */],
      ['x"y', 'z\\w'],
      ['[1]', '{2}'],
    ].map(([id, local]) => [id, local])
    const keys = pairs.map(([id, local]) => makeBreadboardGroupKey(id, local))
    // toutes distinctes
    expect(new Set(keys).size).toBe(keys.length)
    // en particulier le classique piège de la concaténation :
    expect(makeBreadboardGroupKey('a', 'b:c')).not.toBe(makeBreadboardGroupKey('a:b', 'c'))
  })

  it('B6 — utilisable comme clé Map / Set', () => {
    const m = new Map()
    m.set(makeBreadboardGroupKey('A', 'g'), 1)
    m.set(makeBreadboardGroupKey('B', 'g'), 2)
    expect(m.get(makeBreadboardGroupKey('A', 'g'))).toBe(1)
    expect(m.get(makeBreadboardGroupKey('B', 'g'))).toBe(2)
    expect(m.size).toBe(2)
  })

  it('coerce les entrées non-string sans exception', () => {
    expect(() => makeBreadboardGroupKey(42, null)).not.toThrow()
    expect(makeBreadboardGroupKey(42, 'g')).toBe(makeBreadboardGroupKey('42', 'g'))
  })

  it('parseBreadboardGroupKey round-trip', () => {
    const k = makeBreadboardGroupKey('bb-1', 'rail:top:+')
    expect(parseBreadboardGroupKey(k)).toEqual({ breadboardId: 'bb-1', localGroupKey: 'rail:top:+' })
    expect(parseBreadboardGroupKey('not json')).toBeNull()
    expect(parseBreadboardGroupKey(JSON.stringify(['other', 'a', 'b']))).toBeNull()
  })
})
