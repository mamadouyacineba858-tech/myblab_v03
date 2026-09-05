/**
 * viewportModel.test.js — MB-VIS-CANVAS-050.
 *
 * Verrouille le modèle pur de viewport (utils/viewport.js) : zoom orienté
 * curseur sans dérive (D4), pan en espace écran (D1/D5), reset déterministe
 * (D6), et fit-to-content/-selection (D7/D8) — no-op sûr (jamais de zoom
 * infini/NaN, D10) quand bounds ou taille de viewport sont invalides.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_VIEWPORT,
  ZOOM_MIN,
  ZOOM_MAX,
  createDefaultViewport,
  clampZoom,
  zoomViewportAtScreenPoint,
  panViewport,
  centerOnRect,
  centerOnPoint,
  fitViewportToBounds,
} from '../viewport.js'
import { clientToCanvas } from '../geometry.js'

describe('MB-VIS-CANVAS-050 — createDefaultViewport / clampZoom', () => {
  it('createDefaultViewport() renvoie {zoom:1, translateX:0, translateY:0}, une nouvelle instance à chaque appel', () => {
    const a = createDefaultViewport()
    const b = createDefaultViewport()
    expect(a).toEqual({ zoom: 1, translateX: 0, translateY: 0 })
    expect(a).toEqual(DEFAULT_VIEWPORT)
    expect(a).not.toBe(b) // instances distinctes (mutation externe sans danger)
  })

  it('clampZoom borne à [ZOOM_MIN, ZOOM_MAX] et retombe sur 1 pour une valeur non finie', () => {
    expect(clampZoom(10)).toBe(ZOOM_MAX)
    expect(clampZoom(0.01)).toBe(ZOOM_MIN)
    expect(clampZoom(1.3)).toBe(1.3)
    for (const bogus of [NaN, undefined, Infinity, -Infinity]) {
      expect(clampZoom(bogus)).toBe(1)
    }
  })
})

describe('MB-VIS-CANVAS-050 — zoomViewportAtScreenPoint (D4 : zoom orienté curseur sans dérive)', () => {
  it('le point Document sous le curseur reste EXACTEMENT sous le même point écran après zoom', () => {
    const viewport = { zoom: 1, translateX: 0, translateY: 0 }
    const screenX = 300
    const screenY = 200
    const before = clientToCanvas({ clientX: screenX, clientY: screenY }, { left: 0, top: 0 }, viewport.zoom, viewport.translateX, viewport.translateY)

    const next = zoomViewportAtScreenPoint(viewport, screenX, screenY, 2)
    const after = clientToCanvas({ clientX: screenX, clientY: screenY }, { left: 0, top: 0 }, next.zoom, next.translateX, next.translateY)

    expect(after.x).toBeCloseTo(before.x, 10)
    expect(after.y).toBeCloseTo(before.y, 10)
    expect(next.zoom).toBe(2)
  })

  it('invariant préservé même en partant d\'un viewport déjà pan+zoomé (pan+zoom combinés)', () => {
    const viewport = { zoom: 1.5, translateX: 40, translateY: -25 }
    const screenX = 120
    const screenY = 340
    const before = clientToCanvas({ clientX: screenX, clientY: screenY }, { left: 0, top: 0 }, viewport.zoom, viewport.translateX, viewport.translateY)

    const next = zoomViewportAtScreenPoint(viewport, screenX, screenY, 0.75)
    const after = clientToCanvas({ clientX: screenX, clientY: screenY }, { left: 0, top: 0 }, next.zoom, next.translateX, next.translateY)

    expect(after.x).toBeCloseTo(before.x, 10)
    expect(after.y).toBeCloseTo(before.y, 10)
  })

  it('le nextZoom demandé est borné [ZOOM_MIN, ZOOM_MAX] (D10 — jamais infini/NaN)', () => {
    const viewport = { zoom: 1, translateX: 0, translateY: 0 }
    expect(zoomViewportAtScreenPoint(viewport, 0, 0, 999).zoom).toBe(ZOOM_MAX)
    expect(zoomViewportAtScreenPoint(viewport, 0, 0, 0.0001).zoom).toBe(ZOOM_MIN)
    const bogus = zoomViewportAtScreenPoint(viewport, 0, 0, NaN)
    expect(Number.isFinite(bogus.zoom)).toBe(true)
    expect(Number.isFinite(bogus.translateX)).toBe(true)
    expect(Number.isFinite(bogus.translateY)).toBe(true)
  })
})

describe('MB-VIS-CANVAS-050 — panViewport (D1/D5 : translation écran pure, indépendante du zoom)', () => {
  it('additionne le delta écran au translateX/Y courant, zoom inchangé', () => {
    const viewport = { zoom: 2, translateX: 10, translateY: -5 }
    const next = panViewport(viewport, 30, 15)
    expect(next).toEqual({ zoom: 2, translateX: 40, translateY: 10 })
  })

  it('un même delta écran produit le même déplacement de translation quel que soit le zoom (D1)', () => {
    const lowZoom = panViewport({ zoom: 0.5, translateX: 0, translateY: 0 }, 100, 0)
    const highZoom = panViewport({ zoom: 2, translateX: 0, translateY: 0 }, 100, 0)
    expect(lowZoom.translateX).toBe(highZoom.translateX)
  })

  it('delta non fini retombe sur 0 (défensif)', () => {
    const next = panViewport({ zoom: 1, translateX: 5, translateY: 5 }, NaN, undefined)
    expect(next).toEqual({ zoom: 1, translateX: 5, translateY: 5 })
  })
})

describe('MB-VIS-CANVAS-050 — resetViewport via createDefaultViewport (D6)', () => {
  it('produit toujours la même vue neutre déterministe, quel que soit le viewport de départ', () => {
    expect(createDefaultViewport()).toEqual({ zoom: 1, translateX: 0, translateY: 0 })
  })
})

describe('MB-VIS-CANVAS-050 — centerOnRect / centerOnPoint (D9 : primitive générique réutilisable)', () => {
  it('centre un rectangle Document au centre écran du viewport, au zoom demandé', () => {
    const rect = { minX: 100, minY: 100, maxX: 200, maxY: 300 } // centre Document (150,200)
    const next = centerOnRect(rect, { width: 800, height: 600 }, 1)
    // screen = translate + document*zoom -> pour que (150,200) tombe au
    // centre écran (400,300) : translateX = 400 - 150*1 = 250.
    expect(next).toEqual({ zoom: 1, translateX: 250, translateY: 100 })
  })

  it('centerOnPoint est le cas dégénéré (rect de largeur/hauteur nulle) de centerOnRect', () => {
    const point = { x: 50, y: 60 }
    const viaPoint = centerOnPoint(point, { width: 400, height: 300 }, 2)
    const viaRect = centerOnRect({ minX: 50, maxX: 50, minY: 60, maxY: 60 }, { width: 400, height: 300 }, 2)
    expect(viaPoint).toEqual(viaRect)
  })

  it('renvoie null si rect ou viewportSize est absent (no-op sûr pour l\'appelant)', () => {
    expect(centerOnRect(null, { width: 100, height: 100 }, 1)).toBeNull()
    expect(centerOnRect({ minX: 0, maxX: 10, minY: 0, maxY: 10 }, null, 1)).toBeNull()
  })
})

describe('MB-VIS-CANVAS-050 — fitViewportToBounds (D7/D8 : fit-to-content / fit-to-selection)', () => {
  it('calcule un zoom qui fait tenir les bounds dans le viewport avec la marge par défaut, et centre le résultat', () => {
    // bounds 200x100 Document, viewport 800x600 écran, padding par défaut 40.
    const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 100 }
    const next = fitViewportToBounds(bounds, { width: 800, height: 600 })
    // available = 720x520 -> scaleX=3.6, scaleY=5.2 -> zoom=min=3.6 (borné à ZOOM_MAX=2)
    expect(next.zoom).toBe(ZOOM_MAX)
    // Le centre Document (100,50) doit tomber au centre écran (400,300).
    expect(next.translateX).toBeCloseTo(400 - 100 * ZOOM_MAX, 10)
    expect(next.translateY).toBeCloseTo(300 - 50 * ZOOM_MAX, 10)
  })

  it('une scène large qui nécessiterait un zoom < ZOOM_MIN pour tout faire tenir reste bornée à ZOOM_MIN (D10, jamais de zoom non borné)', () => {
    const bounds = { minX: 0, minY: 0, maxX: 4000, maxY: 4000 }
    const next = fitViewportToBounds(bounds, { width: 800, height: 600 })
    expect(next.zoom).toBe(ZOOM_MIN)
  })

  it('renvoie null pour une scène vide (bounds null) — no-op sûr, jamais un zoom infini/NaN', () => {
    expect(fitViewportToBounds(null, { width: 800, height: 600 })).toBeNull()
  })

  it('renvoie null si bounds a une largeur ou hauteur nulle/négative (scène dégénérée)', () => {
    expect(fitViewportToBounds({ minX: 10, minY: 10, maxX: 10, maxY: 50 }, { width: 800, height: 600 })).toBeNull()
  })

  it('renvoie null si le viewport écran n\'est pas mesurable (largeur/hauteur 0 — canvas non monté)', () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    expect(fitViewportToBounds(bounds, { width: 0, height: 0 })).toBeNull()
    expect(fitViewportToBounds(bounds, null)).toBeNull()
  })
})
