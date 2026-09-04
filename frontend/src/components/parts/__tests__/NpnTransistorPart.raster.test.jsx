/**
 * NpnTransistorPart.raster.test.jsx — MB-VIS-COMP-034.
 *
 * Verrouille l'intégration raster du transistor NPN (boîtier TO-92) via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001, en suivant le patron de
 * Buzzer/Led/DcMotorPart.raster.test.jsx. Couvre les 10 TESTS du §10 :
 *
 *  1. NPN_TRANSISTOR est enregistré ;
 *  2. la résolution passe par le renderer réel / pipeline existant ;
 *  3. backend résolu = "raster" ;
 *  4. le renderer ne produit pas de SVG ;
 *  5. le raster NPN est bien référencé ;
 *  6. dimensions 1x/3x conformes : 90×60 / 270×180 ;
 *  7. présentation des pins : B=(32,60) C=(42,60) E=(51,60) ;
 *  8. coordonnées électriques canoniques inchangées : C=(45,0) B=(0,45) E=(90,45) ;
 *  9. aucun couplage simulation dans le renderer / la présentation ne
 *     déplace jamais l'électrique ;
 * 10. componentDefinitions.js inchangé pour le NPN (mêmes pins électriques).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { NpnTransistorPart } from '../NpnTransistorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import {
  DEFAULT_REGISTRATIONS,
  getComponentByType,
  getComponentPresentation,
} from '../../../visualization/defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../../../visualization/factory.js'
import { getPinPresentationPosition } from '../../../utils/pinPresentationGeometry.js'
import { getPinPosition } from '../../../utils/geometry.js'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/npn-transistor')
const SRC_RE = /^\/assets\/components\/npn-transistor\/npn-transistor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-034 — NPN raster : enregistrement + résolution (TEST 1/2/3)', () => {
  it('TEST 1 — NPN_TRANSISTOR est enregistré vers NpnTransistorPart', () => {
    expect(getComponentByType('NPN_TRANSISTOR')).toBe(NpnTransistorPart)
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'NPN_TRANSISTOR' && e.component === NpnTransistorPart)).toBe(true)
  })

  it('TEST 2 — résolution via VisualizationManager.render (pipeline réel de PartRenderer)', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.render('NPN_TRANSISTOR', {})).not.toBeNull()
  })

  it('TEST 3 — backend résolu = "raster" ; bareBody + markerless dérivés', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.getBackend('NPN_TRANSISTOR')).toBe('raster')
    expect(getComponentPresentation('NPN_TRANSISTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-034 — NPN raster : rendu (TEST 4/5/6)', () => {
  it('TEST 4 — aucun <svg>/<line>/<path>/<text>, aucun id ; .part-npn-transistor + aria-label', () => {
    const { container } = render(<NpnTransistorPart />)
    for (const tag of ['svg', 'line', 'path', 'text', 'circle']) expect(container.querySelector(tag)).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-npn-transistor')).not.toBeNull()
    expect(container.querySelector('[aria-label="Transistor NPN"]')).not.toBeNull()
  })

  it('TEST 5 — le raster NPN est référencé : <picture>/<source webp> + <img> png fallback, 4 variantes', () => {
    const { container } = render(<NpnTransistorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toMatch(SRC_RE)
    expect(img.getAttribute('src')).toMatch(/\.png$/)
    for (const cand of (img.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(SRC_RE)
      expect(cand).toMatch(/\.png/)
    }
    const source = container.querySelector('picture > source[type="image/webp"]')
    expect(source).not.toBeNull()
    for (const cand of (source.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(SRC_RE)
      expect(cand).toMatch(/\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['1x.webp', '3x.webp', '1x.png', '3x.png']) {
      expect(all).toContain(`/assets/components/npn-transistor/npn-transistor.default.${f}`)
    }
  })

  it('TEST 6 — dimensions : <img> = getComponentDef (90×60) ; manifest 1x 90×60 / 3x 270×180', () => {
    const def = getComponentDef('NPN_TRANSISTOR')
    expect([def.width, def.height]).toEqual([90, 60])
    const img = render(<NpnTransistorPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe('90')
    expect(img.getAttribute('height')).toBe('60')

    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.canonical.width).toBe(90)
    expect(manifest.canonical.height).toBe(60)
    const byScale = Object.fromEntries(manifest.assets.map((a) => [`${a.scale}.${a.format}`, [a.width, a.height]]))
    expect(byScale['1x.png']).toEqual([90, 60])
    expect(byScale['1x.webp']).toEqual([90, 60])
    expect(byScale['3x.png']).toEqual([270, 180])
    expect(byScale['3x.webp']).toEqual([270, 180])
  })

  it("l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none ; rendu déterministe", () => {
    const { container } = render(<NpnTransistorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    const a = render(<NpnTransistorPart />).container.innerHTML
    const b = render(<NpnTransistorPart />).container.innerHTML
    expect(b).toBe(a)
  })
})

describe('MB-VIS-COMP-034 — pins : présentation projetée, électrique inchangé (TEST 7/8/9/10)', () => {
  const npnDef = getComponentDef('NPN_TRANSISTOR')
  const pinById = Object.fromEntries(npnDef.pins.map((p) => [p.id, p]))
  const component = { type: 'NPN_TRANSISTOR', x: 0, y: 0 }

  it('TEST 7 — getPinPresentationPosition projette B=(32,60) C=(42,60) E=(51,60)', () => {
    expect(getPinPresentationPosition(component, pinById.base)).toEqual({ x: 32, y: 60 })
    expect(getPinPresentationPosition(component, pinById.collector)).toEqual({ x: 42, y: 60 })
    expect(getPinPresentationPosition(component, pinById.emitter)).toEqual({ x: 51, y: 60 })
  })

  it('TEST 7b — la projection est relative à component.x/y (aucune coordonnée absolue codée en dur)', () => {
    const moved = { type: 'NPN_TRANSISTOR', x: 100, y: 200 }
    expect(getPinPresentationPosition(moved, pinById.base)).toEqual({ x: 132, y: 260 })
    expect(getPinPresentationPosition(moved, pinById.emitter)).toEqual({ x: 151, y: 260 })
  })

  it('TEST 8 — coordonnées électriques canoniques INCHANGÉES : C=(45,0) B=(0,45) E=(90,45)', () => {
    expect({ dx: pinById.collector.dx, dy: pinById.collector.dy }).toEqual({ dx: 45, dy: 0 })
    expect({ dx: pinById.base.dx, dy: pinById.base.dy }).toEqual({ dx: 0, dy: 45 })
    expect({ dx: pinById.emitter.dx, dy: pinById.emitter.dy }).toEqual({ dx: 90, dy: 45 })
    // canonicalRegistry : mêmes ids/rôles
    expect(getCanonicalEntry('NPN_TRANSISTOR').pins.map((p) => p.id)).toEqual(['collector', 'base', 'emitter'])
    // dimensions canoniques inchangées
    expect([npnDef.width, npnDef.height]).toEqual([90, 60])
  })

  it('TEST 9 — la projection de présentation ne déplace JAMAIS la position électrique (I8)', () => {
    // getPinPosition (géométrie électrique canonique) reste C/B/E aux positions déclarées
    expect(getPinPosition(component, pinById.collector)).toEqual({ x: 45, y: 0 })
    expect(getPinPosition(component, pinById.base)).toEqual({ x: 0, y: 45 })
    expect(getPinPosition(component, pinById.emitter)).toEqual({ x: 90, y: 45 })
    // un type sans projection retombe sur l'électrique
    const other = { type: 'RESISTOR', x: 0, y: 0 }
    const rPin = getComponentDef('RESISTOR').pins[0]
    expect(getPinPresentationPosition(other, rPin)).toEqual(getPinPosition(other, rPin))
    // le renderer NPN n'importe rien de simulator/
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const src = strip(readFileSync(resolve(__dirname, '../NpnTransistorPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })

  it('TEST 10 — aucun couplage générique type==="NPN_TRANSISTOR" dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, rel).not.toMatch(/\btype\s*===?\s*["']NPN_TRANSISTOR["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-npn-transistor[^)]*\)/)
  })
})

describe('MB-VIS-COMP-034 — pipeline réel : 3 pins projetés sur les pattes', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('CircuitComponent rend 3 pins aux positions de PRÉSENTATION (32,60)/(42,60)/(51,60) ; asset raster, markerless', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('NPN_TRANSISTOR', 50, 60) })

    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(3)
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[32, 60], [42, 60], [51, 60]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it("l'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('NPN_TRANSISTOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
