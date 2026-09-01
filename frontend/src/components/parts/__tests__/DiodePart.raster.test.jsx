/**
 * DiodePart.raster.test.jsx — MB-VIS-PROTOTYPE-002 (remplace DiodePart.uid.test.jsx,
 * qui verrouillait le renderer SVG V0 — MB-VIS-LED-012 — désormais retiré).
 *
 * Prouve l'intégration raster de DIODE via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique) :
 *  1. DIODE rend correctement (élément racine, aria-label) ;
 *  2. le renderer ne produit plus de <svg> (ni <line>/<rect>/<defs>/gradient) ;
 *  3. l'asset raster attendu (/assets/components/diode/…) est utilisé ;
 *  4. variantes 1x/3x cohérentes avec le patron RESISTOR (<picture>/<source webp>
 *     + <img> srcset) — les 4 variantes référencées ;
 *  5. les pins fonctionnels restent produits par CircuitComponent/Pin aux
 *     positions canoniques anode(0,15)/cathode(84,15) ;
 *  6. aucune logique spécifique DIODE dans la couche de rendu centrale ;
 *  7. le backend résolu pour DIODE est bien 'raster' (via getComponentPresentation) ;
 *  8. la géométrie canonique 84×30 reste inchangée (componentDefinitions.js).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DiodePart } from '../DiodePart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/diode\/diode\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-PROTOTYPE-002 — DIODE rend l\'asset raster validé', () => {
  it('1/8 — rend un élément racine aria-label="Diode" aux dimensions canoniques 84×30', () => {
    const def = getComponentDef('DIODE')
    expect([def.width, def.height]).toEqual([84, 30])
    const { container } = render(<DiodePart />)
    expect(container.querySelector('[aria-label="Diode"]')).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG V0', () => {
    const { container } = render(<DiodePart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
  })

  it('3/4 — <picture>/<source webp> + <img> vers /assets/components/diode/… ; les 4 variantes référencées', () => {
    const { container } = render(<DiodePart />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    for (const cand of (img.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of (source.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toMatch(/\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['1x.webp', '3x.webp', '1x.png', '3x.png']) {
      expect(all).toContain(`/assets/components/diode/diode.default.${f}`)
    }
  })

  it('3b — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<DiodePart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<DiodePart uid="d-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<DiodePart uid="d-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('7 — backend résolu pour DIODE = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('DIODE')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 84×30, pins anode(0,15)/cathode(84,15)', () => {
    const def = getComponentDef('DIODE')
    expect(def.width).toBe(84)
    expect(def.height).toBe(30)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.anode).toEqual([0, 15])
    expect(byId.cathode).toEqual([84, 15])
  })
})

describe('MB-VIS-PROTOTYPE-002 — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins DIODE à anode(0,15) / cathode(84,15) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIODE', 50, 60) })

    const def = getComponentDef('DIODE')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 15], [84, 15]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    // mécanisme déclaratif MB-VIS-INDUSTRIAL-001 : chrome neutralisé + marqueurs masqués
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('6 — aucune logique spécifique DIODE dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "DIODE"/"RESISTOR"`).not.toMatch(/\btype\s*===?\s*["'](DIODE|RESISTOR)["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-diode[^)]*\)/)
    expect(css).not.toMatch(/\bpart-diode__(lead|body|cathode-band)\b[^{]*\{[^}]*!important/)
  })

  it('8b — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIODE', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
