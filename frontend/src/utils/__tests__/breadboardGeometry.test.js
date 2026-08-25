/**
 * breadboardGeometry.test.js — MB-BREADBOARD-002.
 *
 * Couvre holeAt() et snapToBreadboardPitch() : fonctions pures, aucune
 * dépendance au Document ni au canvas React (Blueprint §4).
 */
import { describe, it, expect } from 'vitest'
import { holeAt, snapToBreadboardPitch, BREADBOARD_PITCH } from '../breadboardGeometry.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }

describe('breadboardGeometry — holeAt', () => {
  it('retourne null sans breadboard', () => {
    expect(holeAt(null, 0, 0)).toBeNull()
  })

  it('retourne null pour un point hors grille (TB-09)', () => {
    expect(holeAt(breadboard, 3, 3)).toBeNull()
  })

  it('résout un trou du rail haut +', () => {
    const hole = holeAt(breadboard, 0, 0)
    expect(hole).toMatchObject({ kind: 'RAIL', groupKey: 'bb1:rail:top:+' })
  })

  it('résout un trou du rail haut - (TB-05 : différent du rail +)', () => {
    const hole = holeAt(breadboard, 0, BREADBOARD_PITCH)
    expect(hole).toMatchObject({ kind: 'RAIL', groupKey: 'bb1:rail:top:-' })
  })

  it('deux trous du même groupe de cinq (strip top, même colonne) partagent le groupKey (TB-01)', () => {
    const rowStripStart = 3 * BREADBOARD_PITCH
    const a = holeAt(breadboard, 5 * BREADBOARD_PITCH, rowStripStart)
    const b = holeAt(breadboard, 5 * BREADBOARD_PITCH, rowStripStart + BREADBOARD_PITCH)
    expect(a.kind).toBe('STRIP')
    expect(a.groupKey).toBe(b.groupKey)
  })

  it('deux colonnes voisines de la même strip ont des groupKey différents (TB-02)', () => {
    const rowStripStart = 3 * BREADBOARD_PITCH
    const a = holeAt(breadboard, 5 * BREADBOARD_PITCH, rowStripStart)
    const b = holeAt(breadboard, 6 * BREADBOARD_PITCH, rowStripStart)
    expect(a.groupKey).not.toBe(b.groupKey)
  })

  it('deux trous de part et d\'autre de la rainure centrale ont des groupKey différents (TB-03, LOCK-09)', () => {
    const top = holeAt(breadboard, 5 * BREADBOARD_PITCH, 3 * BREADBOARD_PITCH) // strip top, col 5
    const bottom = holeAt(breadboard, 5 * BREADBOARD_PITCH, 9 * BREADBOARD_PITCH) // strip bottom, col 5
    expect(top.groupKey).not.toBe(bottom.groupKey)
    expect(top.groupKey).toContain(':top')
    expect(bottom.groupKey).toContain(':bottom')
  })

  it('la rainure centrale elle-même ne résout aucun trou', () => {
    expect(holeAt(breadboard, 5 * BREADBOARD_PITCH, 8 * BREADBOARD_PITCH)).toBeNull()
  })

  it('deux positions éloignées sur le même rail + partagent le groupKey (TB-04, rail continu AC-05)', () => {
    const a = holeAt(breadboard, 1 * BREADBOARD_PITCH, 0)
    const b = holeAt(breadboard, 20 * BREADBOARD_PITCH, 0)
    expect(a.groupKey).toBe('bb1:rail:top:+')
    expect(b.groupKey).toBe('bb1:rail:top:+')
  })

  it('retourne null hors des limites de colonnes du breadboard', () => {
    expect(holeAt(breadboard, 999 * BREADBOARD_PITCH, 0)).toBeNull()
  })

  it('tolère un breadboard positionné à une origine non nulle', () => {
    const offsetBoard = { id: 'bb2', position: { x: 100, y: 200 } }
    const hole = holeAt(offsetBoard, 100, 200)
    expect(hole).toMatchObject({ kind: 'RAIL', groupKey: 'bb2:rail:top:+' })
  })
})

describe('breadboardGeometry — snapToBreadboardPitch', () => {
  it('aligne un point sur le pas du breadboard', () => {
    expect(snapToBreadboardPitch({ x: 5, y: 7 })).toEqual({ x: 0, y: 12 })
  })

  it('retourne {0,0} pour une entrée invalide (défensif)', () => {
    expect(snapToBreadboardPitch(null)).toEqual({ x: 0, y: 0 })
    expect(snapToBreadboardPitch({ x: NaN, y: 1 })).toEqual({ x: 0, y: 0 })
  })
})
