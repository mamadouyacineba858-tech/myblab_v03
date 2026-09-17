/**
 * irReceiverA7C4.test.jsx — Ticket A7-C4-IR (IR Receiver) — DOM rendering
 * assertions only.
 *
 * The bulk of A7-C4-IR's test coverage lives in the sibling `.js` file
 * `irReceiverA7C4.test.js`, which needs neither JSX nor `render()`. This
 * `.jsx` file is intentionally small: it holds ONLY the assertions that
 * require actually rendering `<IrReceiverPart />` (backend raster proof,
 * <picture>/<source>/<img> DOM shape, WebP-with-PNG-fallback) — same split
 * convention as tiltSensorA7C4.test.js/.jsx.
 */
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.raster.test.jsx du dépôt)
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { getComponentDef } from '../config/componentDefinitions.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { IrReceiverPart } from '../components/parts/IrReceiverPart.jsx'

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe('A7-C4-IR — renderer utilise réellement le backend raster', () => {
  it('getComponentPresentation("IR_RECEIVER") === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('IR_RECEIVER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique', () => {
    const def = getComponentDef('IR_RECEIVER')
    const { container } = render(<IrReceiverPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })
})

describe('A7-C4-IR — résolution d\'asset (défaut 1x + haute densité 3x), fallback WebP/PNG', () => {
  const ASSET_RE = /^\/assets\/components\/ir-receiver\/ir-receiver\.default\.(1x|3x)\.(webp|png)( \dx)?$/

  it('le fallback PNG (src) résout vers des candidats bien formés', () => {
    const { container } = render(<IrReceiverPart />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
  })

  it('la variante haute densité 3x est référencée dans le srcSet (système de résolution par densité existant, <picture>/srcSet natif)', () => {
    const { container } = render(<IrReceiverPart />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(/ir-receiver\.default\.3x\.png$/)
  })

  it('fallback WebP/PNG : <picture><source type="image/webp"> avant <img src=".png">, même patron que TILT_SENSOR/PIR_MOTION_SENSOR', () => {
    const { container } = render(<IrReceiverPart />)
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture.firstElementChild.tagName).toBe('SOURCE')
    expect(picture.querySelector('img').getAttribute('src')).toMatch(/\.png$/)
  })

  it('aucun gestionnaire sur <img>, pointer-events désactivés, draggable=false (interactions restent la responsabilité du wrapper .circuit-component)', () => {
    const { container } = render(<IrReceiverPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
  })
})
