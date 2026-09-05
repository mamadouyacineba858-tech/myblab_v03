/**
 * CapacitorPart.raster.test.jsx — MB-VIS-PROTOTYPE-004 (remplace
 * CapacitorPart.uid.test.jsx, qui verrouillait le contrat de namespace SVG V0
 * — MB-VIS-COMP-011, `<defs>` + gradients namespacés `uid` — désormais retiré).
 *
 * Prouve l'intégration raster de CAPACITOR via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique) :
 *  1. CAPACITOR rend correctement (élément racine `.part-capacitor`, aria-label) ;
 *  2. le renderer ne produit plus de <svg> (ni <line>/<rect>/<defs>/gradient/<text>) ;
 *  3. l'asset raster attendu (/assets/components/capacitor/capacitor.default.*) est utilisé ;
 *  4. variantes 1x/3x cohérentes avec le patron RESISTOR/DIODE/LED (<picture>/<source webp>
 *     + <img> srcset) — les 4 variantes référencées ;
 *  5. les pins fonctionnels restent produits par CircuitComponent/Pin aux
 *     positions canoniques pinA(0,20)/pinB(70,20) ;
 *  6. aucune logique spécifique CAPACITOR dans la couche de rendu centrale ;
 *  7. le backend résolu pour CAPACITOR est bien 'raster' (via getComponentPresentation) ;
 *  8. la géométrie canonique 70×40 reste inchangée (componentDefinitions.js) ;
 *  9. deux CAPACITOR simultanés : rendu déterministe, aucune collision d'id
 *     (plus aucun id SVG à namespacer).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { CapacitorPart } from '../CapacitorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/capacitor\/capacitor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-PROTOTYPE-004 — CAPACITOR rend l\'asset raster validé', () => {
  it('1/8 — rend un élément racine aria-label="Condensateur" aux dimensions canoniques 70×40', () => {
    const def = getComponentDef('CAPACITOR')
    expect([def.width, def.height]).toEqual([70, 40])
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('.part-capacitor')).not.toBeNull()
    expect(container.querySelector('[aria-label="Condensateur"]')).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG V0', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
  })

  it('3/4 — <picture>/<source webp> + <img> vers /assets/components/capacitor/… ; les 4 variantes référencées', () => {
    const { container } = render(<CapacitorPart />)
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
      expect(all).toContain(`/assets/components/capacitor/capacitor.default.${f}`)
    }
  })

  it('3b — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<CapacitorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<CapacitorPart uid="c-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<CapacitorPart uid="c-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('9 — deux CAPACITOR simultanés : aucun <svg>, aucun id à namespacer, HTML des deux instances identique', () => {
    const { container } = render(
      <>
        <CapacitorPart uid="capacitor-a" />
        <CapacitorPart uid="capacitor-b" />
      </>
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-capacitor')
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('7 — backend résolu pour CAPACITOR = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('CAPACITOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 70×40, pins pinA(0,20)/pinB(70,20)', () => {
    const def = getComponentDef('CAPACITOR')
    expect(def.width).toBe(70)
    expect(def.height).toBe(40)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.pinA).toEqual([0, 20])
    expect(byId.pinB).toEqual([70, 20])
  })
})

describe('MB-VIS-PROTOTYPE-004 — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    // MB-VIS-CANVAS-051 : `components` (componentsForRender) est désormais
    // exposé par useCircuitInteraction() (state haute fréquence) — fusionné
    // dans l'objet transmis à onReady() pour que les assertions existantes
    // (api.components...) restent inchangées.
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins CAPACITOR à pinA(0,20) / pinB(70,20) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })

    const def = getComponentDef('CAPACITOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 20], [70, 20]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('6 — aucune logique spécifique CAPACITOR dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "CAPACITOR"`).not.toMatch(/\btype\s*===?\s*["']CAPACITOR["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-capacitor[^)]*\)/)
  })

  it('8b — deux CAPACITOR sur le canvas : 4 pins distincts, chacun aux positions canoniques', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 20, 20) })
    act(() => { api.addComponent('CAPACITOR', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '0px/20px').length).toBe(2)
    expect(rel.filter((r) => r === '70px/20px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8c — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
