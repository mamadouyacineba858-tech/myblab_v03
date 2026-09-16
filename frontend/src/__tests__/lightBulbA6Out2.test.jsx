/**
 * lightBulbA6Out2.test.jsx — Ticket A6-OUT2 (Light Bulb) — DOM rendering
 * assertions only (T14-T17).
 *
 * The bulk of A6-OUT2's test coverage (T01-T13, T18-T36) lives in the
 * sibling `.js` file `lightBulbA6Out2.test.js`, which needs neither JSX nor
 * `render()`. This `.jsx` file is intentionally small: it holds ONLY the
 * assertions that require actually rendering `<LightBulbPart />` (backend
 * raster proof, <picture>/<source>/<img> DOM shape, WebP-with-PNG-fallback).
 *
 * NOTE (pre-existing, unrelated to this ticket): the repo's test harness has
 * a pre-existing environment defect on the current base commit (3318c543,
 * verified reproducible across 2 independent baseline runs) — collecting
 * `import React from 'react'` fails with "Cannot find package 'react'" for
 * essentially every *.test.jsx file in this project, INCLUDING this
 * ticket's own reference file `vibrationMotorA6Out1R1.test.jsx`. This file
 * therefore inherits that same pre-existing, deterministic, unrelated
 * environment failure — it is not a regression introduced by A6-OUT2, and
 * fixing the repo-wide test-harness module resolution is out of scope for a
 * light bulb component ticket (would require deep changes to the test
 * runner/build config, forbidden by this ticket's scope).
 */
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.raster.test.jsx du dépôt qui portent le même import + la même règle désactivée)
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { getComponentDef } from '../config/componentDefinitions.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { LightBulbPart } from '../components/parts/LightBulbPart.jsx'

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe('A6-OUT2 — T14 : renderer utilise réellement le backend raster', () => {
  it('getComponentPresentation("LIGHT_BULB") === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('LIGHT_BULB')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique', () => {
    const def = getComponentDef('LIGHT_BULB')
    const { container } = render(<LightBulbPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })
})

describe('A6-OUT2 — T15/T16/T17 : résolution d\'asset (défaut 1x + haute densité 3x), fallback WebP/PNG', () => {
  const ASSET_RE = /^\/assets\/components\/light-bulb\/light-bulb\.default\.(1x|3x)\.(webp|png)( \dx)?$/

  it('T15 — le fallback PNG @1x-capable (src) résout vers des candidats bien formés', () => {
    const { container } = render(<LightBulbPart />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
  })

  it('T16 — la variante haute densité 3x est référencée dans le srcSet (système de résolution par densité existant, <picture>/srcSet natif)', () => {
    const { container } = render(<LightBulbPart />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(/light-bulb\.default\.3x\.png$/)
  })

  it('T17 — fallback WebP/PNG : <picture><source type="image/webp"> avant <img src=".png">, même patron que VIBRATION_MOTOR/BUZZER/…', () => {
    const { container } = render(<LightBulbPart />)
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture.firstElementChild.tagName).toBe('SOURCE')
    expect(picture.querySelector('img').getAttribute('src')).toMatch(/\.png$/)
  })
})
