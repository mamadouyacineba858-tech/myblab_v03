/**
 * sceneBounds.test.js — MB-VIS-CANVAS-050.
 *
 * computeSceneBounds() est purement géométrique (aucune lecture de zoom ou
 * d'écran) : elle alimente fitToContent()/fitToSelection() (useCircuitState.js)
 * en bounds Document, jamais calculées à partir d'une géométrie déjà
 * transformée par le viewport (condition de refus explicite du Ticket).
 */
import { describe, it, expect } from 'vitest'
import { computeSceneBounds } from '../sceneBounds.js'
import { BREADBOARD_PITCH, STANDARD_V1_LAYOUT, STANDARD_V1_TOTAL_ROWS } from '../breadboardGeometry.js'

describe('MB-VIS-CANVAS-050 — computeSceneBounds', () => {
  it('scène totalement vide -> null (no-op sûr pour fitToContent)', () => {
    expect(computeSceneBounds([], [], null)).toBeNull()
    expect(computeSceneBounds()).toBeNull()
  })

  it('un seul composant -> bounds = sa boîte approximative (fallback 80x40, même formule que endMarquee)', () => {
    const bounds = computeSceneBounds([{ uid: 'a', x: 100, y: 50 }], [], null)
    expect(bounds).toEqual({ minX: 100, minY: 50, maxX: 180, maxY: 90 })
  })

  it('plusieurs composants -> bounds englobante (min/max sur tous)', () => {
    const bounds = computeSceneBounds(
      [
        { uid: 'a', x: 0, y: 0 },
        { uid: 'b', x: 300, y: 200 },
      ],
      [],
      null
    )
    expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 380, maxY: 240 })
  })

  it('un composant avec width/height explicites (si jamais présents) les utilise plutôt que le fallback', () => {
    const bounds = computeSceneBounds([{ uid: 'a', x: 0, y: 0, width: 200, height: 10 }], [], null)
    expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 200, maxY: 10 })
  })

  it('composant à coordonnées non finies est ignoré plutôt que de corrompre les bounds', () => {
    const bounds = computeSceneBounds([{ uid: 'a', x: NaN, y: 10 }, { uid: 'b', x: 10, y: 10 }], [], null)
    expect(bounds).toEqual({ minX: 10, minY: 10, maxX: 90, maxY: 50 })
  })

  it('les waypoints de fils étendent les bounds', () => {
    const bounds = computeSceneBounds(
      [{ uid: 'a', x: 0, y: 0 }],
      [{ id: 'w1', waypoints: [{ x: 500, y: 500 }] }],
      null
    )
    expect(bounds.maxX).toBe(500)
    expect(bounds.maxY).toBe(500)
  })

  it('un breadboard seul (aucun composant) produit des bounds via la même formule géométrique que endMarquee', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }
    const bounds = computeSceneBounds([], [], breadboard)
    const padding = BREADBOARD_PITCH
    const width = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + padding * 2
    const height = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + padding * 2
    expect(bounds).toEqual({ minX: -padding, minY: -padding, maxX: -padding + width, maxY: -padding + height })
  })

  it('composants + breadboard + wires combinés -> bounds englobant les trois', () => {
    const bounds = computeSceneBounds(
      [{ uid: 'a', x: 1000, y: 1000 }],
      [{ id: 'w1', waypoints: [{ x: -50, y: -50 }] }],
      { id: 'bb1', position: { x: 0, y: 0 } }
    )
    expect(bounds.minX).toBeLessThanOrEqual(-50)
    expect(bounds.minY).toBeLessThanOrEqual(-50)
    expect(bounds.maxX).toBeGreaterThanOrEqual(1080)
    expect(bounds.maxY).toBeGreaterThanOrEqual(1040)
  })
})
