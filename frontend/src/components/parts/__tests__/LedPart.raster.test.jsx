/**
 * LedPart.raster.test.jsx — MB-VIS-PROTOTYPE-003.
 *
 * Prouve l'intégration raster STATEFUL de LED via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique) :
 *  1. LED rend correctement (élément racine `.part-led`, aria-label selon isOn) ;
 *  2. le renderer ne produit plus de <svg> (ni <line>/<rect>/<defs>/gradient/<text>) ;
 *  3. l'asset raster attendu (/assets/components/led/led.<state>.<res>.<ext>) est utilisé ;
 *  4. variantes 1x/3x cohérentes avec le patron RESISTOR/DIODE (<picture>/<source webp>
 *     + <img> srcset) — les 4 variantes de l'état référencées ;
 *  5. l'état ON/OFF est piloté par la prop `isOn` (dérivée du Visual State
 *     Registry en production) : classe `.part-led--on`, aria-label et jeu
 *     d'assets basculent ensemble, sans translation ni <svg> ;
 *  6. les pins fonctionnels restent produits par CircuitComponent/Pin aux
 *     positions canoniques anode(28,62)/cathode(52,62) ;
 *  7. aucune logique spécifique LED dans la couche de rendu centrale ;
 *  8. le backend résolu pour LED est bien 'raster' (via getComponentPresentation) ;
 *  9. la géométrie canonique 80×64 reste inchangée (componentDefinitions.js).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { LedPart } from '../LedPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/led\/led\.(off|on)\.(1x|3x)\.(webp|png)( \dx)?$/

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe("MB-VIS-PROTOTYPE-003 — LED rend le paquet d'assets raster validé", () => {
  it('1/9 — élément racine .part-led aux dimensions canoniques 80×64', () => {
    const def = getComponentDef('LED')
    expect([def.width, def.height]).toEqual([80, 64])
    const { container } = render(<LedPart isOn={false} />)
    const root = container.querySelector('.part-led')
    expect(root).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG volumétrique', () => {
    for (const isOn of [false, true]) {
      const { container, unmount } = render(<LedPart isOn={isOn} />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('line')).toBeNull()
      expect(container.querySelector('rect')).toBeNull()
      expect(container.querySelector('defs')).toBeNull()
      expect(container.querySelector('linearGradient')).toBeNull()
      expect(container.querySelector('radialGradient')).toBeNull()
      expect(container.querySelector('text')).toBeNull()
      unmount()
    }
  })

  it('3/4 — OFF : <picture>/<source webp> + <img> vers /assets/components/led/led.off.* ; les 4 variantes référencées', () => {
    const { container } = render(<LedPart isOn={false} />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('led.off.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('led.off.')
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toMatch(/led\.off\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['off.1x.webp', 'off.3x.webp', 'off.1x.png', 'off.3x.png']) {
      expect(all).toContain(`/assets/components/led/led.${f}`)
    }
  })

  it('3/4 — ON : <picture>/<source webp> + <img> vers /assets/components/led/led.on.* ; les 4 variantes référencées', () => {
    const { container } = render(<LedPart isOn={true} />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('led.on.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('led.on.')
    }
    const source = container.querySelector('picture > source')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/led\.on\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['on.1x.webp', 'on.3x.webp', 'on.1x.png', 'on.3x.png']) {
      expect(all).toContain(`/assets/components/led/led.${f}`)
    }
  })

  it('3b — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<LedPart isOn={false} />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('5 — état OFF : pas de classe part-led--on, aria-label "LED éteinte", asset off', () => {
    const { container } = render(<LedPart isOn={false} />)
    const root = container.querySelector('.part-led')
    expect(root.getAttribute('class')).not.toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED éteinte')
    expect(container.querySelector('img').getAttribute('src')).toContain('led.off.')
  })

  it('5 — état ON : classe part-led--on, aria-label "LED allumée", asset on', () => {
    const { container } = render(<LedPart isOn={true} />)
    const root = container.querySelector('.part-led')
    expect(root.getAttribute('class')).toMatch(/part-led--on/)
    expect(root.getAttribute('aria-label')).toBe('LED allumée')
    expect(container.querySelector('img').getAttribute('src')).toContain('led.on.')
  })

  it('5 — bascule OFF -> ON : seuls la classe, l\'aria-label et le jeu d\'assets changent (aucun <svg>, aucune translation de dimensions)', () => {
    const def = getComponentDef('LED')
    const off = render(<LedPart isOn={false} />)
    const offImg = off.container.querySelector('img')
    expect(offImg.getAttribute('width')).toBe(String(def.width))
    expect(offImg.getAttribute('height')).toBe(String(def.height))
    off.unmount()
    const on = render(<LedPart isOn={true} />)
    const onImg = on.container.querySelector('img')
    expect(onImg.getAttribute('width')).toBe(String(def.width))
    expect(onImg.getAttribute('height')).toBe(String(def.height))
    expect(on.container.querySelector('svg')).toBeNull()
    on.unmount()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique (OFF puis ON)', () => {
    for (const isOn of [false, true]) {
      const a = render(<LedPart isOn={isOn} uid="led-a" />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<LedPart isOn={isOn} uid="led-b" />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2).toBe(h1)
    }
  })

  it('8 — backend résolu pour LED = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('LED')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('9 — géométrie canonique inchangée : 80×64, pins anode(28,62)/cathode(52,62)', () => {
    const def = getComponentDef('LED')
    expect(def.width).toBe(80)
    expect(def.height).toBe(64)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.anode).toEqual([28, 62])
    expect(byId.cathode).toEqual([52, 62])
  })
})

describe('MB-VIS-PROTOTYPE-003 — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('6 — CircuitComponent produit les 2 pins LED à anode(28,62) / cathode(52,62) ; asset raster dans le wrapper, chrome neutralisé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('LED', 50, 60) })

    const def = getComponentDef('LED')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[28, 62], [52, 62]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('7 — aucune logique spécifique LED dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "LED"`).not.toMatch(/\btype\s*===?\s*["']LED["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-led[^)]*\)/)
    // aucun glow CSS résiduel sur l'état allumé (le halo est cuit dans l'asset ON)
    expect(css).not.toMatch(/\.part-led--on[^{]*\{[^}]*box-shadow/)
    expect(css).not.toMatch(/\.part-led[^{]*\{[^}]*filter/)
  })

  it('8b — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('LED', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
