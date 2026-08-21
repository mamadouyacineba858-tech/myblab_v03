/**
 * circuitModel.test.js — MB-VIS-005.
 *
 * Aucune couverture de test n'existait pour normalizeWire()/normalizeComponent()
 * avant ce ticket. Ce fichier couvre uniquement normalizeWire() et
 * normalizeWaypoints(), seules fonctions concernées par MB-VIS-005 dans ce
 * module (préservation des waypoints, AC-13, G-11, docs/pmo/tickets/
 * MB-VIS-005.md §5.1/§9.13) — normalizeComponent() reste hors périmètre.
 */
import { describe, it, expect } from 'vitest'
import { normalizeWire, normalizeWaypoints } from '../circuitModel.js'

describe('MB-VIS-005 — normalizeWire (préservation des waypoints)', () => {
  it('renvoie null pour un wire structurellement invalide (inchangé)', () => {
    expect(normalizeWire(null)).toBeNull()
    expect(normalizeWire({ id: 'w1' })).toBeNull()
  })

  it('un wire historique sans waypoints obtient waypoints: [] (AC-08, rétrocompatibilité)', () => {
    const wire = { id: 'w1', fromUid: 'a', fromPin: 'p1', toUid: 'b', toPin: 'p2' }
    const normalized = normalizeWire(wire)
    expect(normalized.waypoints).toEqual([])
  })

  it('préserve waypoints: [] à l\'identique', () => {
    const wire = { id: 'w1', fromUid: 'a', fromPin: 'p1', toUid: 'b', toPin: 'p2', waypoints: [] }
    expect(normalizeWire(wire).waypoints).toEqual([])
  })

  it('préserve un waypoint unique à l\'identique', () => {
    const wire = {
      id: 'w1', fromUid: 'a', fromPin: 'p1', toUid: 'b', toPin: 'p2',
      waypoints: [{ x: 10, y: 20 }],
    }
    expect(normalizeWire(wire).waypoints).toEqual([{ x: 10, y: 20 }])
  })

  it('préserve plusieurs waypoints à l\'identique et dans leur ordre', () => {
    const wire = {
      id: 'w1', fromUid: 'a', fromPin: 'p1', toUid: 'b', toPin: 'p2',
      waypoints: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    }
    expect(normalizeWire(wire).waypoints).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])
  })

  it('ne modifie pas les autres champs du wire (non-régression)', () => {
    const wire = {
      id: 42, fromUid: 'a', fromPin: 'p1', toUid: 'b', toPin: 'p2',
      waypoints: [{ x: 1, y: 1 }],
    }
    const normalized = normalizeWire(wire)
    expect(normalized.id).toBe('42')
    expect(normalized.fromUid).toBe('a')
    expect(normalized.toUid).toBe('b')
  })
})

describe('MB-VIS-005 — normalizeWaypoints', () => {
  it('renvoie [] si waypoints est absent ou non un tableau', () => {
    expect(normalizeWaypoints(undefined)).toEqual([])
    expect(normalizeWaypoints(null)).toEqual([])
    expect(normalizeWaypoints('not-an-array')).toEqual([])
  })

  it('écarte défensivement un point aux coordonnées non finies (NaN, Infinity)', () => {
    expect(normalizeWaypoints([{ x: NaN, y: 1 }])).toEqual([])
    expect(normalizeWaypoints([{ x: 1, y: Infinity }])).toEqual([])
  })

  it('écarte défensivement une entrée malformée (null, non-objet)', () => {
    expect(normalizeWaypoints([null, 'x', 42])).toEqual([])
  })

  it('conserve les points valides tout en écartant les points invalides du même tableau', () => {
    const result = normalizeWaypoints([{ x: 1, y: 1 }, { x: NaN, y: 1 }, { x: 3, y: 3 }])
    expect(result).toEqual([{ x: 1, y: 1 }, { x: 3, y: 3 }])
  })
})
