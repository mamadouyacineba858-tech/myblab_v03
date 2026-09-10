/**
 * breadboardAssociation.test.js — FT-C-BREAD-MULTI-001-C (CSA D1)
 *
 * Primitive canonique `resolveComponentBreadboardAssociation` + wrapper de
 * placement multi-candidat `computeMultiBreadboardPlacement`. Capacités
 * C1–C20, C26–C33 du ticket. Un composant physique appartient à ZÉRO OU UN
 * breadboard ; une seule politique D1 gouverne ownership et placement.
 *
 * Géométrie : POTENTIOMETER a 3 contacts enfichables (left/wiper/right, local
 * x = 36/60/84, y = 108) -> permet de distinguer 1/3, 2/3, 3/3.
 * RESISTOR : 2 contacts (A dx0, B dx84, y 14).
 */
import { describe, it, expect } from 'vitest'
import {
  resolveComponentBreadboardAssociation,
  computeMultiBreadboardPlacement,
} from '../breadboardAssociation.js'

const bb = (id, x, y = 0) => ({ id, position: { x, y }, layout: 'STANDARD_V1' })
const ownerOf = (breadboards, componentType, position, otherComponents = []) =>
  resolveComponentBreadboardAssociation({ breadboards, componentType, position, otherComponents, mode: 'ownership' }).breadboardId
const placeOn = (breadboards, componentType, position, otherComponents = []) =>
  resolveComponentBreadboardAssociation({ breadboards, componentType, position, otherComponents, mode: 'placement' }).breadboardId

describe('FT-C-BREAD-MULTI-001-C — resolver : cas de base (C1–C6, C13, C14)', () => {
  it('C1 — aucun breadboard => owner null', () => {
    expect(ownerOf([], 'RESISTOR', { x: 0, y: 22 })).toBeNull()
  })

  it('C2 — un seul breadboard, composant dessus => owner A', () => {
    expect(ownerOf([bb('A', 0)], 'RESISTOR', { x: 0, y: 22 })).toBe('A')
  })

  it('C3 — composant hors de tous les breadboards => owner null', () => {
    expect(ownerOf([bb('A', 0), bb('B', 480)], 'RESISTOR', { x: 5000, y: 5000 })).toBeNull()
  })

  it('C4 — composant géométriquement sur A parmi [A,B] disjoints => A', () => {
    expect(ownerOf([bb('A', 0), bb('B', 480)], 'RESISTOR', { x: 0, y: 22 })).toBe('A')
  })

  it('C5 — composant géométriquement sur B parmi [A,B] disjoints => B', () => {
    expect(ownerOf([bb('A', 0), bb('B', 480)], 'RESISTOR', { x: 480, y: 22 })).toBe('B')
  })

  it('C6 / C13 — l\'ordre du tableau n\'affecte pas un cas non ambigu ; jamais de fallback breadboards[0]', () => {
    expect(ownerOf([bb('A', 0), bb('B', 480)], 'RESISTOR', { x: 480, y: 22 })).toBe('B')
    expect(ownerOf([bb('B', 480), bb('A', 0)], 'RESISTOR', { x: 480, y: 22 })).toBe('B')
    // composant sur A : jamais B même si B est index 0
    expect(ownerOf([bb('B', 480), bb('A', 0)], 'RESISTOR', { x: 0, y: 22 })).toBe('A')
  })

  it('C14 — composant wire-only (POWER : aucun contact enfichable) => owner null', () => {
    const r = resolveComponentBreadboardAssociation({
      breadboards: [bb('A', 0)], componentType: 'POWER', position: { x: 0, y: 0 }, mode: 'ownership',
    })
    expect(r.breadboardId).toBeNull()
    expect(r.totalInsertableContactCount).toBe(0)
  })
})

describe('FT-C-BREAD-MULTI-001-C — classement D1 (C7–C12, C15)', () => {
  it('C7 — D1.1 : full resolution gagne sur partial', () => {
    // comp@{0,0} : POT résout 3/3 sur A@(0,0). Sur B très décalé (x=-312) seul
    // `left` résout (1/3, partial). A (full) gagne.
    expect(ownerOf([bb('A', 0), bb('B', -312)], 'POTENTIOMETER', { x: 0, y: 0 })).toBe('A')
  })

  it('C8 — D1.2 : à catégorie égale, le plus grand nombre de contacts résolus gagne', () => {
    // comp@{276,0} : sur A@(0,0) -> left col26 / wiper col28 / right col30 OUT = 2/3 (partial).
    // sur B@(-36,0) -> left col29 / wiper OUT / right OUT = 1/3 (partial).
    // Les deux partiels -> D1.2 -> A (2 > 1).
    expect(ownerOf([bb('A', 0), bb('B', -36)], 'POTENTIOMETER', { x: 276, y: 0 })).toBe('A')
  })

  it('C9 / C19 — D1.3 : placement valide gagne sur placement collisionné', () => {
    // A@(0,0) : POT@{0,0} plein mais un RESISTOR occupe déjà A col3 -> collision -> invalide.
    // B@(84,0) : POT snappe à {48,0}, plein, libre -> valide. B gagne malgré snapDist > 0.
    const occ = { id: 'occ', type: 'RESISTOR', x: 36, y: 94 } // pinA -> A col3/row9
    const r = resolveComponentBreadboardAssociation({
      breadboards: [bb('A', 0), bb('B', 84)],
      componentType: 'POTENTIOMETER',
      position: { x: 0, y: 0 },
      otherComponents: [occ],
      mode: 'placement',
    })
    expect(r.breadboardId).toBe('B')
    expect(r.placement.valid).toBe(true)
  })

  it('C10 — D1.4 : à égalité, la plus petite distance de snap départage', () => {
    // A@(0,0), B@(6,0) se chevauchent. POT@{0,0} : snap 0 sur A, snap ~36 sur B
    // (composant décalé de +6 pour aligner la grille de B). A gagne.
    expect(placeOn([bb('A', 0), bb('B', 6)], 'POTENTIOMETER', { x: 0, y: 0 })).toBe('A')
  })

  it('C11 — D1.5 : égalité parfaite => le DERNIER breadboard de breadboards[] gagne', () => {
    expect(ownerOf([bb('A', 0), bb('B', 0)], 'POTENTIOMETER', { x: 0, y: 0 })).toBe('B')
    expect(ownerOf([bb('B', 0), bb('A', 0)], 'POTENTIOMETER', { x: 0, y: 0 })).toBe('A')
  })

  it('C12 — D1.6 : fallback id déterministe si l\'ordre ne tranche pas (même index impossible, mais règle stable)', () => {
    // deux appels successifs sur exactement le même état -> même résultat.
    const s1 = ownerOf([bb('zeta', 0), bb('alpha', 0)], 'POTENTIOMETER', { x: 0, y: 0 })
    const s2 = ownerOf([bb('zeta', 0), bb('alpha', 0)], 'POTENTIOMETER', { x: 0, y: 0 })
    expect(s1).toBe(s2)
    expect(s1).toBe('alpha') // D1.5 : dernier = index 1 = 'alpha'
  })

  it('C15 — multi-contact BUTTON : le décompte porte sur les CONTACTS physiques (4), pas les pinIds (2)', () => {
    const r = resolveComponentBreadboardAssociation({
      breadboards: [bb('A', 0)], componentType: 'BUTTON', position: { x: 0, y: 48 }, mode: 'ownership',
    })
    expect(r.totalInsertableContactCount).toBe(4)
    expect(r.breadboardId).toBe('A')
    expect(r.resolvedContactCount).toBe(4)
    expect(r.fullyResolved).toBe(true)
  })
})

describe('FT-C-BREAD-MULTI-001-C — owner unique en cas de chevauchement (C16–C20, I-C2)', () => {
  it('C11/C20 — A et B superposés, composant résolvant sur les deux => EXACTEMENT un owner', () => {
    const r = resolveComponentBreadboardAssociation({
      breadboards: [bb('A', 0), bb('B', 0)], componentType: 'POTENTIOMETER', position: { x: 0, y: 0 }, mode: 'ownership',
    })
    expect(typeof r.breadboardId).toBe('string')
    expect(['A', 'B']).toContain(r.breadboardId)
    // un seul gagnant, pas un ensemble
    expect(r.breadboard.id).toBe(r.breadboardId)
  })

  it('C16/C17/C18 — collision scopée par breadboard : occuper A col3 n\'invalide pas B (cartes distinctes)', () => {
    // A@(0,0) et B@(480,0) disjoints. RESISTOR occupe A col5. Une nouvelle POT
    // visée sur B ne doit pas être bloquée par cette occupation de A.
    const occA = { id: 'occA', type: 'RESISTOR', x: 60, y: 94 } // A col5/row9
    const r = resolveComponentBreadboardAssociation({
      breadboards: [bb('A', 0), bb('B', 480)],
      componentType: 'POTENTIOMETER',
      position: { x: 480, y: 0 },
      otherComponents: [occA],
      mode: 'placement',
    })
    expect(r.breadboardId).toBe('B')
    expect(r.placement.valid).toBe(true)
  })
})

describe('FT-C-BREAD-MULTI-001-C — computeMultiBreadboardPlacement (C26–C33)', () => {
  it('C26 / C27 / C28 — placement sur A, B, C selon la position candidate', () => {
    const boards = [bb('A', 0), bb('B', 480), bb('C', 960)]
    expect(computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 0, y: 22 }).breadboardId).toBe('A')
    expect(computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 480, y: 22 }).breadboardId).toBe('B')
    expect(computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 960, y: 22 }).breadboardId).toBe('C')
  })

  it('C29 — transition A -> B : même resolver, cible suit la position candidate', () => {
    const boards = [bb('A', 0), bb('B', 480)]
    expect(computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 0, y: 22 }).breadboardId).toBe('A')
    expect(computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 480, y: 22 }).breadboardId).toBe('B')
  })

  it('C30 — sortie vers le canvas libre : aucun breadboard actif', () => {
    const res = computeMultiBreadboardPlacement([bb('A', 0), bb('B', 480)], 'RESISTOR', { x: 5000, y: 5000 })
    expect(res.breadboardId).toBeNull()
    expect(res.breadboardActive).toBe(false)
  })

  it('C31 — preview et drop pour le MÊME état/position choisissent le MÊME breadboard', () => {
    const boards = [bb('A', 0), bb('B', 60)] // se chevauchent
    const pos = { x: 0, y: 0 }
    const preview = computeMultiBreadboardPlacement(boards, 'POTENTIOMETER', pos, [])
    const drop = computeMultiBreadboardPlacement(boards, 'POTENTIOMETER', pos, [])
    expect(preview.breadboardId).toBe(drop.breadboardId)
    expect(preview.position).toEqual(drop.position)
  })

  it('C32 — position candidate identique => résultat déterministe', () => {
    const boards = [bb('A', 0), bb('B', 480)]
    const a = computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 6, y: 22 })
    const b = computeMultiBreadboardPlacement(boards, 'RESISTOR', { x: 6, y: 22 })
    expect(a).toEqual(b)
  })

  it('C33 — composant incompatible (wire-only) => aucun placement actif', () => {
    const res = computeMultiBreadboardPlacement([bb('A', 0)], 'POWER', { x: 0, y: 0 })
    expect(res.breadboardActive).toBe(false)
    expect(res.compatible).toBe(false)
    expect(res.breadboardId).toBeNull()
  })

  it('shape : computeMultiBreadboardPlacement conserve le contrat computeBreadboardPlacement + breadboardId', () => {
    const res = computeMultiBreadboardPlacement([bb('A', 0)], 'RESISTOR', { x: 0, y: 22 })
    expect(res).toHaveProperty('breadboardActive')
    expect(res).toHaveProperty('compatible')
    expect(res).toHaveProperty('valid')
    expect(res).toHaveProperty('position')
    expect(res).toHaveProperty('holes')
    expect(res).toHaveProperty('breadboardId')
  })
})
