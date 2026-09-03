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
  [{}, 'off'], [{ r: true }, 'red'], [{ g: true }, 'green'], [{ b: true }, 'blue'],
  [{ r: true, g: true }, 'yellow'], [{ r: true, b: true }, 'magenta'],
  [{ g: true, b: true }, 'cyan'], [{ r: true, g: true, b: true }, 'white'],
]

describe('MB-VIS-COMP-033 — RgbLedPart : rendu raster + 8 états', () => {
  it('compose un corps raster + 4 crops de pattes, aucun SVG/shape/id', () => {
    const { container } = render(<RgbLedPart />)
    expect(container.querySelectorAll('img').length).toBe(5)
    for (const tag of ['svg', 'line', 'circle', 'path']) expect(container.querySelector(tag)).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-rgb-led')).not.toBeNull()
  })

  it('les 8 combinaisons sélectionnent le bon état', () => {
    for (const [props, state] of STATE_CASES) {
      const { container, unmount } = render(<RgbLedPart {...props} />)
      expect(container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe(state)
      expect(container.querySelectorAll('img').length).toBe(5)
      for (const img of container.querySelectorAll('img')) {
        expect(img.getAttribute('src')).toBe(`/assets/components/rgb-led/rgb-led.${state}.3x.png`)
        expect(img.getAttribute('srcset')).toBe(`/assets/components/rgb-led/rgb-led.${state}.1x.png 1x, /assets/components/rgb-led/rgb-led.${state}.3x.png 3x`)
      }
      expect(container.querySelectorAll('source[type="image/webp"]').length).toBe(5)
      unmount()
    }
  })

  it('false et valeurs non strictement true donnent off', () => {
    expect(render(<RgbLedPart r={false} g={false} b={false} />).container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('off')
    expect(render(<RgbLedPart r={1} />).container.querySelector('.part-rgb-led').getAttribute('data-state')).toBe('off')
  })

  it('mêmes props → HTML identique', () => {
    for (const [props] of STATE_CASES) {
      const a = render(<RgbLedPart {...props} />); const h1 = a.container.innerHTML; a.unmount()
      const b = render(<RgbLedPart {...props} />); const h2 = b.container.innerHTML; b.unmount()
      expect(h2).toBe(h1)
    }
  })

  it('dimensions dérivées de getComponentDef', () => {
    const def = getComponentDef('RGB_LED')
    expect([def.width, def.height]).toEqual([90, 56])
    const img = render(<RgbLedPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('toutes les images sont non interactives', () => {
    const { container } = render(<RgbLedPart r />)
    for (const img of container.querySelectorAll('img')) {
      expect(img.draggable).toBe(false)
      expect(img.style.pointerEvents).toBe('none')
      expect(img.onclick).toBeNull()
      expect(img.onpointerdown).toBeNull()
    }
  })

  it('backend RGB_LED = raster avec bareBody + markerless', () => {
    expect(getComponentPresentation('RGB_LED')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-033 — découplage renderer / couche centrale', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  it('RgbLedPart.jsx n’importe rien depuis simulator/', () => {
    const src = strip(readFileSync(resolve(__dirname, '../RgbLedPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })
  it('aucun couplage générique RGB_LED dans le renderer central', () => {
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src).not.toMatch(/\btype\s*===?\s*["']RGB_LED["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-rgb-led[^)]*\)/)
  })
})

describe('MB-VIS-COMP-033 — paquet assets', () => {
  const STATES = ['off', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white']
  it('8 états × 1x/3x × png/webp = 32 fichiers', () => {
    for (const s of STATES) for (const scale of ['1x', '3x']) for (const ext of ['png', 'webp']) {
      expect(existsSync(resolve(ASSET_DIR, `rgb-led.${s}.${scale}.${ext}`))).toBe(true)
    }
  })
  it('manifest et integrity cohérents avec la géométrie physique', () => {
    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.component).toBe('RGB_LED'); expect(manifest.backend).toBe('raster')
    const def = getComponentDef('RGB_LED')
    expect(manifest.canonical.width).toBe(def.width); expect(manifest.canonical.height).toBe(def.height)
    expect(manifest.canonical.pins).toEqual({ R: [19, 56], common: [35, 56], G: [53, 56], B: [71, 56] })
    expect([...manifest.states].sort()).toEqual([...STATES].sort())
    expect(manifest.assets.filter((a) => /\.(png|webp)$/.test(a.file)).length).toBe(32)
    const integrity = JSON.parse(readFileSync(resolve(ASSET_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const byFile = new Map(integrity.map((r) => [r.file, r]))
    for (const a of manifest.assets) { expect(byFile.has(a.file)).toBe(true); expect(typeof byFile.get(a.file).sha256).toBe('string') }
  })
})

describe('MB-VIS-COMP-033 — pipeline réel : 4 pins physiques rapprochés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit(); onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }
  it('CircuitComponent produit R(19,56)/common(35,56)/G(53,56)/B(71,56)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RGB_LED', 50, 60) })
    const def = getComponentDef('RGB_LED'); const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(4); expect(def.pins.map((p) => p.id)).toEqual(['R', 'common', 'G', 'B'])
    const positions = [...pins].map((el) => [Number(el.style.left.replace('px', '')), Number(el.style.top.replace('px', ''))])
    expect(positions).toEqual(expect.arrayContaining([[19, 56], [35, 56], [53, 56], [71, 56]]))
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(5)
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })
  it('une image ne capte pas les événements — le wrapper les reçoit', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RGB_LED', 50, 60) })
    const wrap = container.querySelector('.circuit-component'); let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
