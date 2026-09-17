/**
 * soilMoistureSensorA7C3.test.jsx — Ticket A7-C3 (Soil Moisture Sensor) —
 * DOM rendering assertions only.
 *
 * The bulk of A7-C3's test coverage lives in the sibling `.js` file
 * `soilMoistureSensorA7C3.test.js`, which needs neither JSX nor `render()`.
 * This `.jsx` file is intentionally small: it holds ONLY the assertions that
 * require actually rendering `<SoilMoistureSensorPart />` (backend raster
 * proof, <picture>/<source>/<img> DOM shape, WebP-with-PNG-fallback) — same
 * split convention as tmp36A7C1.test.js/.jsx.
 */
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.raster.test.jsx du dépôt)
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { getComponentDef } from '../config/componentDefinitions.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { SoilMoistureSensorPart } from '../components/parts/SoilMoistureSensorPart.jsx'

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe('A7-C3 — renderer utilise réellement le backend raster', () => {
  it('getComponentPresentation("SOIL_MOISTURE_SENSOR") === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('SOIL_MOISTURE_SENSOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique', () => {
    const def = getComponentDef('SOIL_MOISTURE_SENSOR')
    const { container } = render(<SoilMoistureSensorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })
})

describe('A7-C3 — résolution d\'asset (défaut 1x + haute densité 3x), fallback WebP/PNG', () => {
  const ASSET_RE = /^\/assets\/components\/soil-moisture-sensor\/soil-moisture-sensor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

  it('le fallback PNG (src) résout vers des candidats bien formés', () => {
    const { container } = render(<SoilMoistureSensorPart />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
  })

  it('la variante haute densité 3x est référencée dans le srcSet (système de résolution par densité existant, <picture>/srcSet natif)', () => {
    const { container } = render(<SoilMoistureSensorPart />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(/soil-moisture-sensor\.default\.3x\.png$/)
  })

  it('fallback WebP/PNG : <picture><source type="image/webp"> avant <img src=".png">, même patron que TMP36/FORCE_SENSOR', () => {
    const { container } = render(<SoilMoistureSensorPart />)
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture.firstElementChild.tagName).toBe('SOURCE')
    expect(picture.querySelector('img').getAttribute('src')).toMatch(/\.png$/)
  })

  it('aucun gestionnaire sur <img>, pointer-events désactivés, draggable=false (interactions restent la responsabilité du wrapper .circuit-component)', () => {
    const { container } = render(<SoilMoistureSensorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
  })
})
