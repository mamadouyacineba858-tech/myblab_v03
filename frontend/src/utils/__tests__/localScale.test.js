/**
 * localScale.test.js — MB-VIS-CANVAS-052.
 *
 * Unitaires purs sur utils/localScale.js : bornes CSA verrouillées
 * (Authority §D), clamp défensif (même patron que clampZoom,
 * viewport.js/viewportModel.test.js), formule de mise à l'échelle autour
 * d'un centre (partagée par pinPresentationGeometry.js/circuitSelectors.js).
 */
import { describe, it, expect } from 'vitest'
import {
  LOCAL_SCALE_MIN,
  LOCAL_SCALE_MAX,
  LOCAL_SCALE_STEP,
  LOCAL_SCALE_DEFAULT,
  clampLocalScale,
  scalePointAroundCenter,
} from '../localScale.js'

describe('MB-VIS-CANVAS-052 — constantes CSA verrouillées', () => {
  it('correspond exactement aux valeurs de l\'Authority', () => {
    expect(LOCAL_SCALE_MIN).toBe(1.0)
    expect(LOCAL_SCALE_MAX).toBe(3.0)
    expect(LOCAL_SCALE_STEP).toBe(0.1)
    expect(LOCAL_SCALE_DEFAULT).toBe(1.5)
  })

  it('LOCAL_SCALE_DEFAULT est strictement compris dans [MIN, MAX]', () => {
    expect(LOCAL_SCALE_DEFAULT).toBeGreaterThanOrEqual(LOCAL_SCALE_MIN)
    expect(LOCAL_SCALE_DEFAULT).toBeLessThanOrEqual(LOCAL_SCALE_MAX)
  })
})

describe('MB-VIS-CANVAS-052 — clampLocalScale', () => {
  it('laisse passer une valeur déjà dans les bornes', () => {
    expect(clampLocalScale(2.0)).toBe(2.0)
    expect(clampLocalScale(LOCAL_SCALE_MIN)).toBe(LOCAL_SCALE_MIN)
    expect(clampLocalScale(LOCAL_SCALE_MAX)).toBe(LOCAL_SCALE_MAX)
  })

  it('borne au minimum et au maximum', () => {
    expect(clampLocalScale(0.2)).toBe(LOCAL_SCALE_MIN)
    expect(clampLocalScale(0)).toBe(LOCAL_SCALE_MIN)
    expect(clampLocalScale(-5)).toBe(LOCAL_SCALE_MIN)
    expect(clampLocalScale(10)).toBe(LOCAL_SCALE_MAX)
  })

  it('ne produit jamais NaN ni infini (D2 du Blueprint)', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, 'x']) {
      const result = clampLocalScale(bad)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).toBe(LOCAL_SCALE_DEFAULT)
    }
  })

  it('un pas de LOCAL_SCALE_STEP appliqué successivement depuis LOCAL_SCALE_DEFAULT reste fini et borné', () => {
    let scale = LOCAL_SCALE_DEFAULT
    for (let i = 0; i < 50; i++) {
      scale = clampLocalScale(scale + LOCAL_SCALE_STEP)
    }
    expect(scale).toBe(LOCAL_SCALE_MAX)
    for (let i = 0; i < 50; i++) {
      scale = clampLocalScale(scale - LOCAL_SCALE_STEP)
    }
    expect(scale).toBe(LOCAL_SCALE_MIN)
  })
})

describe('MB-VIS-CANVAS-052 — scalePointAroundCenter', () => {
  it('scale=1 renvoie le point inchangé (référence identique, non-régression)', () => {
    const point = { x: 10, y: 20 }
    expect(scalePointAroundCenter(point, { x: 0, y: 0 }, 1)).toBe(point)
  })

  it('le centre lui-même reste fixe quel que soit le facteur', () => {
    const center = { x: 50, y: 50 }
    expect(scalePointAroundCenter(center, center, 2)).toEqual({ x: 50, y: 50 })
    expect(scalePointAroundCenter(center, center, 3)).toEqual({ x: 50, y: 50 })
  })

  it('projette un point proportionnellement à sa distance au centre', () => {
    const center = { x: 100, y: 100 }
    const point = { x: 110, y: 100 } // +10 en x, 0 en y
    expect(scalePointAroundCenter(point, center, 2)).toEqual({ x: 120, y: 100 })
    expect(scalePointAroundCenter(point, center, 3)).toEqual({ x: 130, y: 100 })
  })

  it('fonctionne symétriquement pour un point situé avant le centre', () => {
    const center = { x: 100, y: 100 }
    const point = { x: 84, y: 115 } // -16 en x, +15 en y
    expect(scalePointAroundCenter(point, center, 2)).toEqual({ x: 68, y: 130 })
  })

  it('scale non fini retombe sur le point inchangé (défense NaN/infini)', () => {
    const point = { x: 5, y: 5 }
    expect(scalePointAroundCenter(point, { x: 0, y: 0 }, NaN)).toBe(point)
    expect(scalePointAroundCenter(point, { x: 0, y: 0 }, Infinity)).toBe(point)
  })

  it('point ou centre absent renvoie le point tel quel', () => {
    expect(scalePointAroundCenter(null, { x: 0, y: 0 }, 2)).toBe(null)
    expect(scalePointAroundCenter({ x: 1, y: 1 }, null, 2)).toEqual({ x: 1, y: 1 })
  })
})
