/**
 * ServoPart.raster.test.jsx — MB-VIS-COMP-035.
 *
 * Verrouille l'intégration raster du micro servo SG90 via le mécanisme
 * déclaratif de MB-VIS-INDUSTRIAL-001, en suivant le patron de
 * Buzzer/Led/NpnTransistorPart.raster.test.jsx.
 *
 *  1. SERVO est enregistré ;
 *  2. la résolution passe par le renderer réel / pipeline existant ;
 *  3. backend résolu = "raster" ;
 *  4. le renderer ne produit pas de SVG ;
 *  5. le raster SERVO est bien référencé (webp + png, 4 variantes) ;
 *  6. dimensions 1x/3x conformes : 90×70 / 270×210 ;
 *  7. coordonnées électriques canoniques inchangées : signal(90,20) /
 *     vcc(90,35) / gnd(90,50) ;
 *  8. AUCUNE projection de présentation dédiée : getPinPresentationPosition
 *     retombe sur getPinPosition (contrairement à LED / NPN_TRANSISTOR) ;
 *  9. aucun couplage simulation dans le renderer ;
 * 10. aucun branchement générique type==="SERVO" dans la couche de rendu
 *     centrale ; pipeline réel : 3 pins aux positions canoniques.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { ServoPart } from '../ServoPart.jsx'
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
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/servo')
const SRC_RE = /^\/assets\/components\/servo\/servo\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-035 — SERVO raster : enregistrement + résolution (TEST 1/2/3)', () => {
  it('TEST 1 — SERVO est enregistré vers ServoPart', () => {
    expect(getComponentByType('SERVO')).toBe(ServoPart)
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'SERVO' && e.component === ServoPart)).toBe(true)
  })

  it('TEST 2 — résolution via VisualizationManager.render (pipeline réel de PartRenderer)', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.render('SERVO', {})).not.toBeNull()
  })

  it('TEST 3 — backend résolu = "raster" ; bareBody + markerless dérivés', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.getBackend('SERVO')).toBe('raster')
    expect(getComponentPresentation('SERVO')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-035 — SERVO raster : rendu (TEST 4/5/6)', () => {
  it('TEST 4 — aucun <svg>/<line>/<rect>/<circle>/<path>/<text>, aucun id ; .part-servo + aria-label', () => {
    const { container } = render(<ServoPart />)
    for (const tag of ['svg', 'line', 'rect', 'circle', 'path', 'text']) expect(container.querySelector(tag)).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-servo')).not.toBeNull()
    expect(container.querySelector('[aria-label="Micro Servo"]')).not.toBeNull()
  })

  it('TEST 5 — le raster SERVO est référencé : <picture>/<source webp> + <img> png fallback, 4 variantes', () => {
    const { container } = render(<ServoPart />)
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
      expect(all).toContain(`/assets/components/servo/servo.default.${f}`)
    }
  })

  it('TEST 6 — dimensions : <img> = getComponentDef (90×70) ; manifest 1x 90×70 / 3x 270×210', () => {
    const def = getComponentDef('SERVO')
    expect([def.width, def.height]).toEqual([90, 70])
    const img = render(<ServoPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe('90')
    expect(img.getAttribute('height')).toBe('70')

    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.canonical.width).toBe(90)
    expect(manifest.canonical.height).toBe(70)
    // Clé dérivée du NOM DE FICHIER (`.1x.`/`.3x.`), pas de `a.scale` — ce champ
    // n'a pas de type figé dans le contrat T10 (chaîne "1x" chez POTENTIOMETER/
    // NPN_TRANSISTOR, nombre 1/3 chez SERVO V3) ; le gate lui-même (T10,
    // renderQualityGate.test.jsx) ne lit d'ailleurs jamais `scale`, uniquement
    // le nom de fichier — même principe ici.
    const byScale = Object.fromEntries(
      manifest.assets.map((a) => [`${a.file.includes('.3x.') ? '3x' : '1x'}.${a.format}`, [a.width, a.height]])
    )
    expect(byScale['1x.png']).toEqual([90, 70])
    expect(byScale['1x.webp']).toEqual([90, 70])
    expect(byScale['3x.png']).toEqual([270, 210])
    expect(byScale['3x.webp']).toEqual([270, 210])
  })

  it("l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none ; rendu déterministe", () => {
    const { container } = render(<ServoPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    const a = render(<ServoPart />).container.innerHTML
    const b = render(<ServoPart />).container.innerHTML
    expect(b).toBe(a)
  })
})

describe('MB-VIS-COMP-035 — pins : géométrie électrique inchangée, aucune projection dédiée (TEST 7/8/9/10)', () => {
  const servoDef = getComponentDef('SERVO')
  const pinById = Object.fromEntries(servoDef.pins.map((p) => [p.id, p]))
  const component = { type: 'SERVO', x: 0, y: 0 }

  it('TEST 7 — coordonnées électriques canoniques INCHANGÉES : signal(90,20) vcc(90,35) gnd(90,50)', () => {
    expect({ dx: pinById.signal.dx, dy: pinById.signal.dy }).toEqual({ dx: 90, dy: 20 })
    expect({ dx: pinById.vcc.dx, dy: pinById.vcc.dy }).toEqual({ dx: 90, dy: 35 })
    expect({ dx: pinById.gnd.dx, dy: pinById.gnd.dy }).toEqual({ dx: 90, dy: 50 })
    // canonicalRegistry : mêmes ids/rôles
    expect(getCanonicalEntry('SERVO').pins.map((p) => p.id)).toEqual(['signal', 'vcc', 'gnd'])
    // dimensions canoniques inchangées
    expect([servoDef.width, servoDef.height]).toEqual([90, 70])
  })

  it('TEST 8 — getPinPresentationPosition retombe sur getPinPosition (AUCUNE projection SERVO dédiée)', () => {
    expect(getPinPresentationPosition(component, pinById.signal)).toEqual(getPinPosition(component, pinById.signal))
    expect(getPinPresentationPosition(component, pinById.vcc)).toEqual(getPinPosition(component, pinById.vcc))
    expect(getPinPresentationPosition(component, pinById.gnd)).toEqual(getPinPosition(component, pinById.gnd))
    expect(getPinPresentationPosition(component, pinById.signal)).toEqual({ x: 90, y: 20 })
    expect(getPinPresentationPosition(component, pinById.vcc)).toEqual({ x: 90, y: 35 })
    expect(getPinPresentationPosition(component, pinById.gnd)).toEqual({ x: 90, y: 50 })
    // pinPresentationGeometry.js n'a aucune entrée SERVO
    const src = readFileSync(resolve(__dirname, '../../../utils/pinPresentationGeometry.js'), 'utf-8')
    expect(src).not.toMatch(/SERVO_VISUAL_PINS/)
    expect(src).not.toMatch(/component\.type\s*===\s*["']SERVO["']/)
  })

  it('TEST 9 — aucun couplage simulation dans le renderer', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const src = strip(readFileSync(resolve(__dirname, '../ServoPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })

  it('TEST 10 — aucun couplage générique type==="SERVO" dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, rel).not.toMatch(/\btype\s*===?\s*["']SERVO["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-servo[^)]*\)/)
  })
})

describe('MB-VIS-COMP-035 — pipeline réel : 3 pins aux positions électriques canoniques', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('CircuitComponent rend 3 pins aux positions (90,20)/(90,35)/(90,50) relatives au composant ; asset raster, markerless', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SERVO', 50, 60) })

    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(3)
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[90, 20], [90, 35], [90, 50]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it("l'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SERVO', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
