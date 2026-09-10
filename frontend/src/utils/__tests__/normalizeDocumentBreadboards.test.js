/**
 * normalizeDocumentBreadboards.test.js — FT-C-BREAD-MULTI-001-A (CSA D3 / §5).
 *
 * Frontière de normalisation UNIQUE `document.breadboard` (singleton legacy)
 * -> `document.breadboards[]` (canonique). Déterministe, idempotente, sans
 * perte (id / position / layout / propriétés inconnues). Preuve la
 * compatibilité legacy exigée par §5 (T37).
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeDocumentBreadboards,
  toCanonicalBreadboards,
} from '../normalizeDocumentBreadboards.js'

const BB = (id, x = 0, y = 0) => ({ id, position: { x, y }, layout: 'STANDARD_V1' })

describe('FT-C-BREAD-MULTI-001-A — normalizeDocumentBreadboards (T37, §5)', () => {
  it('legacy { breadboard: null } -> { breadboards: [] }', () => {
    const out = normalizeDocumentBreadboards({ components: [], wires: [], breadboard: null })
    expect(out.breadboards).toEqual([])
    expect(out.breadboard).toBeNull()
  })

  it('legacy absent (aucune clé breadboard) -> { breadboards: [] }', () => {
    const out = normalizeDocumentBreadboards({ components: [], wires: [] })
    expect(out.breadboards).toEqual([])
    expect(out.breadboard).toBeNull()
  })

  it('legacy { breadboard: B } -> { breadboards: [B] }, aucune perte, aucune duplication', () => {
    const b = { ...BB('bb-1', 12, 24), customFlag: 'x' }
    const out = normalizeDocumentBreadboards({ components: [], wires: [], breadboard: b })
    expect(out.breadboards).toHaveLength(1)
    expect(out.breadboards[0]).toEqual(b)
    expect(out.breadboards[0]).not.toBe(b) // cloné
    expect(out.breadboards[0].position).not.toBe(b.position)
    // propriété inconnue conservée (§5)
    expect(out.breadboards[0].customFlag).toBe('x')
    // projection transitoire = première entrée
    expect(out.breadboard).toEqual(b)
  })

  it('nouveau { breadboards: [A, B, C] } -> conservé tel quel, cloné, ordre préservé', () => {
    const bbs = [BB('A', 0), BB('B', 200), BB('C', 400)]
    const out = normalizeDocumentBreadboards({ components: [], wires: [], breadboards: bbs })
    expect(out.breadboards.map((b) => b.id)).toEqual(['A', 'B', 'C'])
    expect(out.breadboards[0]).not.toBe(bbs[0])
    expect(out.breadboard.id).toBe('A')
  })

  it('breadboards[] a PRIORITÉ sur un breadboard legacy présent simultanément (une seule source canonique)', () => {
    const out = normalizeDocumentBreadboards({
      breadboard: BB('legacy-ignored'),
      breadboards: [BB('canonical-1'), BB('canonical-2')],
    })
    expect(out.breadboards.map((b) => b.id)).toEqual(['canonical-1', 'canonical-2'])
    expect(out.breadboard.id).toBe('canonical-1')
  })

  it('idempotente : normalize(normalize(doc)) === normalize(doc)', () => {
    const doc = { components: [{ id: 'r1' }], wires: [], breadboard: BB('bb-1', 36, 48) }
    const once = normalizeDocumentBreadboards(doc)
    const twice = normalizeDocumentBreadboards(once)
    expect(twice.breadboards).toEqual(once.breadboards)
    expect(twice.breadboard).toEqual(once.breadboard)
  })

  it('préserve les autres propriétés du Document (components / wires / clés inconnues)', () => {
    const out = normalizeDocumentBreadboards({
      components: [{ id: 'r1' }],
      wires: [{ id: 'w1' }],
      version: 7,
      breadboard: BB('bb-1'),
    })
    expect(out.components).toEqual([{ id: 'r1' }])
    expect(out.wires).toEqual([{ id: 'w1' }])
    expect(out.version).toBe(7)
  })

  it('entrées nulles dans breadboards[] écartées', () => {
    const out = normalizeDocumentBreadboards({ breadboards: [BB('A'), null, undefined, BB('B')] })
    expect(out.breadboards.map((b) => b.id)).toEqual(['A', 'B'])
  })

  it('document null / non-objet -> forme canonique vide, jamais d\'exception', () => {
    expect(normalizeDocumentBreadboards(null)).toEqual({ breadboards: [], breadboard: null })
    expect(normalizeDocumentBreadboards(undefined)).toEqual({ breadboards: [], breadboard: null })
    expect(normalizeDocumentBreadboards(42)).toEqual({ breadboards: [], breadboard: null })
  })

  it('toCanonicalBreadboards : accès direct à la collection clonée', () => {
    expect(toCanonicalBreadboards({ breadboard: null })).toEqual([])
    expect(toCanonicalBreadboards({ breadboard: BB('x') }).map((b) => b.id)).toEqual(['x'])
    expect(toCanonicalBreadboards({ breadboards: [BB('a'), BB('b')] }).map((b) => b.id)).toEqual(['a', 'b'])
  })
})
