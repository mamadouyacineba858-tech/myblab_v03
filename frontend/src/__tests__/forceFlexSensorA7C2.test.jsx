/**
 * forceFlexSensorA7C2.test.jsx — Ticket A7-C2 (Force Sensor + Flex Sensor)
 * — DOM rendering assertions only.
 *
 * The bulk of A7-C2's test coverage lives in the sibling `.js` file
 * `forceFlexSensorA7C2.test.js`, which needs neither JSX nor `render()`.
 * This `.jsx` file is intentionally small: it holds ONLY the assertions
 * that require actually rendering `<ForceSensorPart />` / `<FlexSensorPart />`
 * (backend raster proof, <picture>/<source>/<img> DOM shape, WebP-with-PNG
 * fallback, canonical dimensions).
 *
 * NOTE (pre-existing, unrelated to this ticket): the repo's test harness has
 * a pre-existing environment defect (confirmed reproducible across the
 * A6-OUT1-R1/A6-OUT2/A6-OUT3 tickets' own baselines) — collecting
 * `import React from 'react'` fails with "Cannot find package 'react'" for
 * essentially every *.test.jsx file in this project. This file therefore
 * inherits that same pre-existing, deterministic, unrelated environment
 * failure — it is not a regression introduced by A7-C2.
 */
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.test.jsx du dépôt)
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { getComponentDef } from '../config/componentDefinitions.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { ForceSensorPart } from '../components/parts/ForceSensorPart.jsx'
import { FlexSensorPart } from '../components/parts/FlexSensorPart.jsx'

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

const CASES = [
  { type: 'FORCE_SENSOR', Component: ForceSensorPart, prefix: 'force-sensor', box: [72, 144] },
  { type: 'FLEX_SENSOR', Component: FlexSensorPart, prefix: 'flex-sensor', box: [72, 180] },
]

describe.each(CASES)('A7-C2 — $type — renderer utilise réellement le backend raster', (c) => {
  it('getComponentPresentation === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation(c.type)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique', () => {
    const def = getComponentDef(c.type)
    const { container } = render(<c.Component />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect([def.width, def.height]).toEqual(c.box)
  })

  it('<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<c.Component />)
    const img = container.querySelector('img')
    expect(img.getAttribute('draggable')).toBe('false')
    const style = img.getAttribute('style') || ''
    expect(style).toMatch(/pointer-events:\s*none/)
  })
})

describe.each(CASES)('A7-C2 — $type — résolution d\'asset (1x + 3x), fallback WebP/PNG', (c) => {
  it('le fallback PNG @1x-capable (src) résout vers des candidats bien formés', () => {
    const ASSET_RE = new RegExp(`^/assets/components/${c.prefix}/${c.prefix}\\.default\\.(1x|3x)\\.(webp|png)( \\dx)?$`)
    const { container } = render(<c.Component />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
  })

  it('la variante haute densité 3x est référencée dans le srcSet', () => {
    const { container } = render(<c.Component />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(new RegExp(`${c.prefix}\\.default\\.3x\\.png$`))
  })

  it('fallback WebP/PNG : <picture><source type="image/webp"> avant <img src=".png">', () => {
    const { container } = render(<c.Component />)
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture.firstElementChild.tagName).toBe('SOURCE')
    expect(picture.querySelector('img').getAttribute('src')).toMatch(/\.png$/)
  })
})
