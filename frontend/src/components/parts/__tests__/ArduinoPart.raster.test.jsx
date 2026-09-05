/**
 * ArduinoPart.raster.test.jsx — MB-VIS-COMP-037.
 *
 * Verrouille l'intégration raster de la carte Arduino UNO (16ᵉ et dernier
 * composant du catalogue à passer en raster) via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001, en suivant le patron de
 * PowerPart/ServoPart/NpnTransistorPart.raster.test.jsx.
 *
 *  1. ARDUINO est enregistré ;
 *  2. la résolution passe par le renderer réel / pipeline existant ;
 *  3. backend résolu = "raster" ;
 *  4. le renderer ne produit pas de SVG ;
 *  5. le raster ARDUINO est bien référencé (webp + png, 4 variantes) ;
 *  6. dimensions 1x/3x conformes : 120×140 / 360×420 ;
 *  7. présentation des pins : D2=(3,50) D3=(15,75) GND=(15,108) 5V=(115,50) ;
 *  8. coordonnées électriques canoniques inchangées : D2 dx=0/dy=50,
 *     D3 dx=0/dy=75, GND dx=0/dy=110, 5V dx=120/dy=50 ;
 *  9. la projection de présentation ne déplace jamais l'électrique ;
 * 10. aucun couplage générique type==="ARDUINO" dans la couche de rendu
 *     centrale ; pipeline réel : 4 pins projetés.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { ArduinoPart } from '../ArduinoPart.jsx'
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
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/arduino')
const SRC_RE = /^\/assets\/components\/arduino\/arduino\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-037 — ARDUINO raster : enregistrement + résolution (TEST 1/2/3)', () => {
  it('TEST 1 — ARDUINO est enregistré vers ArduinoPart', () => {
    expect(getComponentByType('ARDUINO')).toBe(ArduinoPart)
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'ARDUINO' && e.component === ArduinoPart)).toBe(true)
  })

  it('TEST 2 — résolution via VisualizationManager.render (pipeline réel de PartRenderer)', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.render('ARDUINO', {})).not.toBeNull()
  })

  it('TEST 3 — backend résolu = "raster" ; bareBody + markerless dérivés', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.getBackend('ARDUINO')).toBe('raster')
    expect(getComponentPresentation('ARDUINO')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-037 — ARDUINO raster : rendu (TEST 4/5/6)', () => {
  it('TEST 4 — aucun <svg>/<line>/<rect>/<circle>/<path>/<text>, aucun id ; .part-arduino + aria-label', () => {
    const { container } = render(<ArduinoPart />)
    for (const tag of ['svg', 'line', 'rect', 'circle', 'path', 'text']) expect(container.querySelector(tag)).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-arduino')).not.toBeNull()
    expect(container.querySelector('[aria-label="Arduino UNO"]')).not.toBeNull()
  })

  it('TEST 5 — le raster ARDUINO est référencé : <picture>/<source webp> + <img> png fallback, 4 variantes', () => {
    const { container } = render(<ArduinoPart />)
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
      expect(all).toContain(`/assets/components/arduino/arduino.default.${f}`)
    }
  })

  it('TEST 6 — dimensions : <img> = getComponentDef (120×140) ; manifest 1x 120×140 / 3x 360×420', () => {
    const def = getComponentDef('ARDUINO')
    expect([def.width, def.height]).toEqual([120, 140])
    const img = render(<ArduinoPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe('120')
    expect(img.getAttribute('height')).toBe('140')

    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.canonical.width).toBe(120)
    expect(manifest.canonical.height).toBe(140)
    expect(manifest.complexity).toBe('complex')
    // Clé dérivée du NOM DE FICHIER (`.1x.`/`.3x.`), pas de `a.scale` — comme
    // pour ServoPart/PowerPart.raster.test.jsx : le gate T10 lui-même ne lit
    // jamais `scale`, uniquement le nom de fichier.
    const byScale = Object.fromEntries(
      manifest.variants.map((a) => [`${a.file.includes('.3x.') ? '3x' : '1x'}.${a.format}`, [a.width, a.height]])
    )
    expect(byScale['1x.png']).toEqual([120, 140])
    expect(byScale['1x.webp']).toEqual([120, 140])
    expect(byScale['3x.png']).toEqual([360, 420])
    expect(byScale['3x.webp']).toEqual([360, 420])
  })

  it("l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none ; rendu déterministe", () => {
    const { container } = render(<ArduinoPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    const a = render(<ArduinoPart />).container.innerHTML
    const b = render(<ArduinoPart />).container.innerHTML
    expect(b).toBe(a)
  })
})

describe('MB-VIS-COMP-037 — pins : présentation projetée, électrique inchangé (TEST 7/8/9/10)', () => {
  const arduinoDef = getComponentDef('ARDUINO')
  const pinById = Object.fromEntries(arduinoDef.pins.map((p) => [p.id, p]))
  const component = { type: 'ARDUINO', x: 0, y: 0 }

  it('TEST 7 — getPinPresentationPosition projette D2=(3,50) D3=(15,75) GND=(15,108) 5V=(115,50)', () => {
    expect(getPinPresentationPosition(component, pinById.D2)).toEqual({ x: 3, y: 50 })
    expect(getPinPresentationPosition(component, pinById.D3)).toEqual({ x: 15, y: 75 })
    expect(getPinPresentationPosition(component, pinById.GND)).toEqual({ x: 15, y: 108 })
    expect(getPinPresentationPosition(component, pinById['5V'])).toEqual({ x: 115, y: 50 })
  })

  it('TEST 7b — la projection est relative à component.x/y (aucune coordonnée absolue codée en dur)', () => {
    const moved = { type: 'ARDUINO', x: 100, y: 200 }
    expect(getPinPresentationPosition(moved, pinById.D2)).toEqual({ x: 103, y: 250 })
    expect(getPinPresentationPosition(moved, pinById['5V'])).toEqual({ x: 215, y: 250 })
  })

  it('TEST 8 — coordonnées électriques canoniques INCHANGÉES : D2 dx=0/dy=50, D3 dx=0/dy=75, GND dx=0/dy=110, 5V dx=120/dy=50', () => {
    expect({ dx: pinById.D2.dx, dy: pinById.D2.dy }).toEqual({ dx: 0, dy: 50 })
    expect({ dx: pinById.D3.dx, dy: pinById.D3.dy }).toEqual({ dx: 0, dy: 75 })
    expect({ dx: pinById.GND.dx, dy: pinById.GND.dy }).toEqual({ dx: 0, dy: 110 })
    expect({ dx: pinById['5V'].dx, dy: pinById['5V'].dy }).toEqual({ dx: 120, dy: 50 })
    // canonicalRegistry : mêmes ids/rôles
    expect(getCanonicalEntry('ARDUINO').pins.map((p) => p.id)).toEqual(['D2', 'D3', 'GND', '5V'])
    // dimensions canoniques inchangées
    expect([arduinoDef.width, arduinoDef.height]).toEqual([120, 140])
  })

  it('TEST 9 — la projection de présentation ne déplace JAMAIS la position électrique (I8)', () => {
    expect(getPinPosition(component, pinById.D2)).toEqual({ x: 0, y: 50 })
    expect(getPinPosition(component, pinById.D3)).toEqual({ x: 0, y: 75 })
    expect(getPinPosition(component, pinById.GND)).toEqual({ x: 0, y: 110 })
    expect(getPinPosition(component, pinById['5V'])).toEqual({ x: 120, y: 50 })
    // un type sans projection retombe sur l'électrique
    const other = { type: 'RESISTOR', x: 0, y: 0 }
    const rPin = getComponentDef('RESISTOR').pins[0]
    expect(getPinPresentationPosition(other, rPin)).toEqual(getPinPosition(other, rPin))
    // le renderer ARDUINO n'importe rien de simulator/
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const src = strip(readFileSync(resolve(__dirname, '../ArduinoPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })

  it('TEST 10 — aucun couplage générique type==="ARDUINO" dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, rel).not.toMatch(/\btype\s*===?\s*["']ARDUINO["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-arduino[^)]*\)/)
  })
})

describe('MB-VIS-COMP-037 — pipeline réel : 4 pins projetés sur les bords réels de la carte', () => {
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

  it('CircuitComponent rend 4 pins aux positions de PRÉSENTATION (3,50)/(15,75)/(15,108)/(115,50) ; asset raster, markerless', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('ARDUINO', 50, 60) })

    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(4)
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[3, 50], [15, 75], [15, 108], [115, 50]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it("l'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('ARDUINO', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
