/**
 * hobbyGearmotorA6Out3.test.jsx — Ticket A6-OUT3 (Hobby Gearmotor) — DOM
 * rendering assertions only.
 *
 * The bulk of A6-OUT3's test coverage lives in the sibling `.js` file
 * `hobbyGearmotorA6Out3.test.js`, which needs neither JSX nor `render()`.
 * This `.jsx` file is intentionally small: it holds ONLY the assertions
 * that require actually rendering `<HobbyGearmotorPart />` (backend raster
 * proof, <picture>/<source>/<img> DOM shape, WebP-with-PNG-fallback,
 * canonical VERTICAL 72×120 dimensions, no CSS rotation applied).
 *
 * NOTE (pre-existing, unrelated to this ticket): the repo's test harness has
 * a pre-existing environment defect (confirmed reproducible across the
 * A6-OUT1-R1 and A6-OUT2 tickets' own baselines) — collecting
 * `import React from 'react'` fails with "Cannot find package 'react'" for
 * essentially every *.test.jsx file in this project, INCLUDING this
 * ticket's own reference files (vibrationMotorA6Out1R1.test.jsx,
 * lightBulbA6Out2.test.jsx, partDimensionsCanonical.test.jsx). This file
 * therefore inherits that same pre-existing, deterministic, unrelated
 * environment failure — it is not a regression introduced by A6-OUT3, and
 * fixing the repo-wide test-harness module resolution is out of scope for a
 * single component ticket (would require deep changes to the test
 * runner/build config, forbidden by this ticket's scope).
 */
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.raster.test.jsx du dépôt qui portent le même import + la même règle désactivée)
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { getComponentDef } from '../config/componentDefinitions.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { HobbyGearmotorPart } from '../components/parts/HobbyGearmotorPart.jsx'

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe('A6-OUT3 — T32/T45 : renderer utilise réellement le backend raster VERTICAL', () => {
  it('getComponentPresentation("HOBBY_GEARMOTOR") === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('HOBBY_GEARMOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique VERTICALE 72×120', () => {
    const def = getComponentDef('HOBBY_GEARMOTOR')
    const { container } = render(<HobbyGearmotorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(def.width).toBe(72)
    expect(def.height).toBe(120)
  })

  it('T33 — aucune transformation CSS rotate() appliquée au rendu (asset source déjà vertical)', () => {
    const { container } = render(<HobbyGearmotorPart />)
    const img = container.querySelector('img')
    const style = img.getAttribute('style') || ''
    expect(style).not.toMatch(/rotate\(/)
    const root = container.firstElementChild
    expect((root.getAttribute('style') || '')).not.toMatch(/rotate\(/)
  })
})

describe('A6-OUT3 — T09/T10 : résolution d\'asset (défaut 1x + haute densité 3x), fallback WebP/PNG', () => {
  const ASSET_RE = /^\/assets\/components\/hobby-gearmotor\/hobby-gearmotor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

  it('le fallback PNG @1x-capable (src) résout vers des candidats bien formés', () => {
    const { container } = render(<HobbyGearmotorPart />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
  })

  it('la variante haute densité 3x est référencée dans le srcSet (système de résolution par densité existant, <picture>/srcSet natif)', () => {
    const { container } = render(<HobbyGearmotorPart />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(/hobby-gearmotor\.default\.3x\.png$/)
  })

  it('fallback WebP/PNG : <picture><source type="image/webp"> avant <img src=".png">, même patron que VIBRATION_MOTOR/LIGHT_BULB/BUZZER', () => {
    const { container } = render(<HobbyGearmotorPart />)
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture.firstElementChild.tagName).toBe('SOURCE')
    expect(picture.querySelector('img').getAttribute('src')).toMatch(/\.png$/)
  })
})
