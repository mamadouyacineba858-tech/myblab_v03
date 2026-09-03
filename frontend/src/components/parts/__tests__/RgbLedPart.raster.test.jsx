/**
 * RgbLedPart.raster.test.jsx — MB-VIS-COMP-033.
 *
 * Prouve l'intégration raster du RGB_LED (8 états visuels) via le mécanisme
 * déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle
 * CSS spécifique), en suivant le patron de LedPart / BuzzerPart / …
 *
 * Couvre les 10 points du §10 du ticket :
 *  1. plus de <svg> ; 2. un <img> ; 3. les 8 combinaisons r/g/b → bon état ;
 *  4. mêmes props → HTML identique ; 5. aucun import simulator/ ;
 *  6. aucune comparaison générique type === "RGB_LED" ;
 *  7. dimensions dérivées de getComponentDef ; 8. WebP + PNG présents ;
 *  9. 1x + 3x présents ; 10. manifest + integrity cohérents.
 *
 * Contrat de props inchangé : { r, g, b } (boolean | undefined) fournis par
 * le Visual State Registry existant. Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { RgbLedPart } from '../RgbLedPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/rgb-led')

const STATE_CASES = [
  [{}, 'off'],
  [{ r: true }, 'red'],
  [{ g: true }, 'green'],
  [{ b: true }, 'blue'],
  [{ r: true, g: true }, 'yellow'],
  [{ r: true, b: true }, 'magenta'],
  [{ g: true, b: true }, 'cyan'],
  [{ r: true, g: true, b: true }, 'white'],
]

describe('MB-VIS-COMP-033 — RgbLedPart : rendu raster + 8 états', () => {
  it('1/2 — rend un <img>, aucun <svg>/<line>/<circle>/<path>, aucun id, .part-rgb-led + aria-label', () => {
    const { container } = render(<RgbLedPart />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('path')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-rgb-led')).not.toBeNull()
    expect(container.querySelector('[aria-label="LED RGB"]')).not.toBeNull()
  })

  it('3 — les 8 combinaisons r/g/b sélectionnent le bon état d\'asset (webp source + png fallback + 1x/3x)', () => {
    for (const [props, state] of STATE_CASES) {
      const { container, unmount } = render(<RgbLedPart {...props} />)
      expect(container.querySelector('.part-rgb-led').getAttribute('data-state'), JSON.stringify(props)).toBe(state)
      const img = container.querySelector('img')
      expect(img.getAttribute('src')).toBe(`/assets/components/rgb-led/rgb-led.${state}.3x.png`)
      expect(img.getAttribute('srcset')).toBe(
        `/assets/components/rgb-led/rgb-led.${state}.1x.png 1x, /assets/components/rgb-led/rgb-led.${state}.3x.png 3x`,
      )
      const source = container.querySelector('picture > source[type="image/webp"]')
      expect(source.getAttribute('srcset')).toBe(
        `/assets/components/rgb-led/rgb-led.${state}.1x.webp 1x, /assets/components/rgb-led/rgb-led.${state}.3x.webp 3x`,
      )
      unmount()
    }
  })

  it('3b — r/g/b === false (non undefined) → "off" ; r/g/b non-strict-true ignoré', () => {
    expect(render(<RgbLedPart r={false} g={false} b={false} />).container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('off')
    expect(render(<RgbLedPart r={1} />).container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('off')
  })

  it('4 — mêmes props → HTML strictement identique (déterministe, 8 états)', () => {
    for (const [props] of STATE_CASES) {
      const a = render(<RgbLedPart {...props} />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<RgbLedPart {...props} />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2, JSON.stringify(props)).toBe(h1)
    }
  })

  it('7 — <img> width/height dérivés de getComponentDef("RGB_LED") (90×56)', () => {
    const def = getComponentDef('RGB_LED')
    expect([def.width, def.height]).toEqual([90, 56])
    const img = render(<RgbLedPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const img = render(<RgbLedPart r={true} />).container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
  })

  it('backend résolu pour RGB_LED = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('RGB_LED')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-033 — 5/6 : découplage renderer / couche centrale', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('5 — RgbLedPart.jsx n\'importe rien depuis simulator/', () => {
    const src = strip(readFileSync(resolve(__dirname, '../RgbLedPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })

  it('6 — aucune comparaison générique type === "RGB_LED" dans la couche de rendu centrale', () => {
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel}`).not.toMatch(/\btype\s*===?\s*["']RGB_LED["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-rgb-led[^)]*\)/)
  })
})

describe('MB-VIS-COMP-033 — 8/9/10 : paquet d\'assets sur disque', () => {
  const STATES = ['off', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white']

  it('8/9 — 8 états × {1x,3x} × {png,webp} = 32 fichiers présents', () => {
    for (const s of STATES) {
      for (const scale of ['1x', '3x']) {
        for (const ext of ['png', 'webp']) {
          expect(existsSync(resolve(ASSET_DIR, `rgb-led.${s}.${scale}.${ext}`)), `rgb-led.${s}.${scale}.${ext}`).toBe(true)
        }
      }
    }
  })

  it('10 — manifest.json cohérent (component/backend/canonical/8 états/32 assets) et ASSET-INTEGRITY.json présent', () => {
    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.component).toBe('RGB_LED')
    expect(manifest.backend).toBe('raster')
    const def = getComponentDef('RGB_LED')
    expect(manifest.canonical.width).toBe(def.width)
    expect(manifest.canonical.height).toBe(def.height)
    expect(manifest.canonical.pins).toEqual({ R: [12, 56], common: [34, 56], G: [56, 56], B: [78, 56] })
    expect([...manifest.states].sort()).toEqual([...STATES].sort())
    expect(manifest.assets.filter((a) => /\.(png|webp)$/.test(a.file)).length).toBe(8 * 2 * 2)

    const integrity = JSON.parse(readFileSync(resolve(ASSET_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    expect(Array.isArray(integrity)).toBe(true)
    const byFile = new Map(integrity.map((r) => [r.file, r]))
    for (const a of manifest.assets) {
      expect(byFile.has(a.file), `integrity manque ${a.file}`).toBe(true)
      expect(typeof byFile.get(a.file).sha256).toBe('string')
    }
  })
})

describe('MB-VIS-COMP-033 — pipeline réel : 4 pins logiques inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('CircuitComponent produit les 4 pins R(12,56)/common(34,56)/G(56,56)/B(78,56) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RGB_LED', 50, 60) })

    const def = getComponentDef('RGB_LED')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(4)
    expect(def.pins.map((p) => p.id)).toEqual(['R', 'common', 'G', 'B'])

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[12, 56], [34, 56], [56, 56], [78, 56]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('l\'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RGB_LED', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
