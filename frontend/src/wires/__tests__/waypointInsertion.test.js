import { describe, it, expect } from 'vitest'
import { nearestSegmentInsertIndex } from '../waypointInsertion.js'

describe('MB-VIS-005 — nearestSegmentInsertIndex', () => {
  it('renvoie 0 pour une entrée invalide', () => {
    expect(nearestSegmentInsertIndex(null, { x: 0, y: 0 })).toBe(0)
    expect(nearestSegmentInsertIndex([{ x: 0, y: 0 }], { x: 0, y: 0 })).toBe(0)
    expect(nearestSegmentInsertIndex([{ x: 0, y: 0 }, { x: 10, y: 0 }], null)).toBe(0)
  })

  it('un point le long de l\'unique segment (wire sans waypoint) renvoie l\'index 0', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    expect(nearestSegmentInsertIndex(points, { x: 50, y: 1 })).toBe(0)
  })

  it('choisit le segment le plus proche parmi plusieurs (wire déjà routé)', () => {
    // points = [from, wp0, wp1, to]
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }]
    // proche du segment wp0->wp1 (index 1)
    expect(nearestSegmentInsertIndex(points, { x: 15, y: 0.5 })).toBe(1)
    // proche du segment from->wp0 (index 0)
    expect(nearestSegmentInsertIndex(points, { x: 5, y: 0.5 })).toBe(0)
    // proche du dernier segment wp1->to (index 2) : insertion en fin de tableau
    expect(nearestSegmentInsertIndex(points, { x: 25, y: 0.5 })).toBe(2)
  })

  it('un point hors du tracé choisit tout de même le segment le plus proche', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    expect(nearestSegmentInsertIndex(points, { x: 1000, y: 1000 })).toBe(0)
  })
})
