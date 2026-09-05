/**
 * PowerPart.raster.test.jsx — MB-VIS-COMP-036.
 *
 * Verrouille l'intégration raster de l'alimentation POWER (benchtop DC lab
 * supply) via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001, en suivant
 * le patron de ServoPart/NpnTransistorPart.raster.test.jsx.
 *
 *  1. POWER est enregistré ;
 *  2. la résolution passe par le renderer réel / pipeline existant ;
 *  3. backend résolu = "raster" ;
 *  4. le renderer ne produit pas de SVG ;
 *  5. le raster POWER est bien référencé (webp + png, 4 variantes) ;
 *  6. dimensions 1x/3x conformes : 70×90 / 210×270 ;
 *  7. présentation des pins : GND=(22,67) 5V=(35,67) ;
 *  8. coordonnées électriques canoniques inchangées : 5V dx=70/dy=37,
 *     GND dx=58/dy=25 ;
 *  9. la projection de présentation ne déplace jamais l'électrique ;
 * 10. aucun couplage générique type==="POWER" dans la couche de rendu
 *     centrale ; pipeline réel : 2 pins projetés.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { PowerPart } from '../PowerPart.jsx'
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
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/power')
const SRC_RE = /^\/assets\/components\/power\/power\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-036 — POWER raster : enregistrement + résolution (TEST 1/2/3)', () => {
  it('TEST 1 — POWER est enregistré vers PowerPart', () => {
    expect(getComponentByType('POWER')).toBe(PowerPart)
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'POWER' && e.component === PowerPart)).toBe(true)
  })

  it('TEST 2 — résolution via VisualizationManager.render (pipeline réel de PartRenderer)', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.render('POWER', {})).not.toBeNull()
  })

  it('TEST 3 — backend résolu = "raster" ; bareBody + markerless dérivés', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.getBackend('POWER')).toBe('raster')
    expect(getComponentPresentation('POWER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('MB-VIS-COMP-036 — POWER raster : rendu (TEST 4/5/6)', () => {
  it('TEST 4 — aucun <svg>/<line>/<rect>/<circle>/<path>/<text>, aucun id ; .part-power + aria-label', () => {
    const { container } = render(<PowerPart />)
    for (const tag of ['svg', 'line', 'rect', 'circle', 'path', 'text']) expect(container.querySelector(tag)).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-power')).not.toBeNull()
    expect(container.querySelector('[aria-label="Alimentation"]')).not.toBeNull()
  })

  it('TEST 5 — le raster POWER est référencé : <picture>/<source webp> + <img> png fallback, 4 variantes', () => {
    const { container } = render(<PowerPart />)
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
      expect(all).toContain(`/assets/components/power/power.default.${f}`)
    }
  })

  it('TEST 6 — dimensions : <img> = getComponentDef (70×90) ; manifest 1x 70×90 / 3x 210×270', () => {
    const def = getComponentDef('POWER')
    expect([def.width, def.height]).toEqual([70, 90])
    const img = render(<PowerPart />).container.querySelector('img')
    expect(img.getAttribute('width')).toBe('70')
    expect(img.getAttribute('height')).toBe('90')

    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.canonical.width).toBe(70)
    expect(manifest.canonical.height).toBe(90)
    // Clé dérivée du NOM DE FICHIER (`.1x.`/`.3x.`), pas de `a.scale` — comme
    // pour ServoPart.raster.test.jsx, le champ `scale` n'a pas de type figé
    // dans le contrat T10 (chaîne "1x" chez d'autres composants, ici aussi
    // chaîne mais la robustesse au nom de fichier reste préférable).
    const byScale = Object.fromEntries(
      manifest.variants.map((a) => [`${a.file.includes('.3x.') ? '3x' : '1x'}.${a.format}`, [a.width, a.height]])
    )
    expect(byScale['1x.png']).toEqual([70, 90])
    expect(byScale['1x.webp']).toEqual([70, 90])
    expect(byScale['3x.png']).toEqual([210, 270])
    expect(byScale['3x.webp']).toEqual([210, 270])
  })

  it("l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none ; rendu déterministe", () => {
    const { container } = render(<PowerPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    const a = render(<PowerPart />).container.innerHTML
    const b = render(<PowerPart />).container.innerHTML
    expect(b).toBe(a)
  })
})

describe('MB-VIS-COMP-036 — pins : présentation projetée, électrique inchangé (TEST 7/8/9/10)', () => {
  const powerDef = getComponentDef('POWER')
  const pinById = Object.fromEntries(powerDef.pins.map((p) => [p.id, p]))
  const component = { type: 'POWER', x: 0, y: 0 }

  it('TEST 7 — getPinPresentationPosition projette GND=(22,67) 5V=(35,67)', () => {
    expect(getPinPresentationPosition(component, pinById.GND)).toEqual({ x: 22, y: 67 })
    expect(getPinPresentationPosition(component, pinById['5V'])).toEqual({ x: 35, y: 67 })
  })

  it('TEST 7b — la projection est relative à component.x/y (aucune coordonnée absolue codée en dur)', () => {
    const moved = { type: 'POWER', x: 100, y: 200 }
    expect(getPinPresentationPosition(moved, pinById.GND)).toEqual({ x: 122, y: 267 })
    expect(getPinPresentationPosition(moved, pinById['5V'])).toEqual({ x: 135, y: 267 })
  })

  it('TEST 8 — coordonnées électriques canoniques INCHANGÉES : 5V dx=70/dy=37, GND dx=58/dy=25', () => {
    expect({ dx: pinById['5V'].dx, dy: pinById['5V'].dy }).toEqual({ dx: 70, dy: 37 })
    expect({ dx: pinById.GND.dx, dy: pinById.GND.dy }).toEqual({ dx: 58, dy: 25 })
    // canonicalRegistry : mêmes ids/rôles
    expect(getCanonicalEntry('POWER').pins.map((p) => p.id)).toEqual(['5V', 'GND'])
    // dimensions canoniques inchangées
    expect([powerDef.width, powerDef.height]).toEqual([70, 90])
  })

  it('TEST 9 — la projection de présentation ne déplace JAMAIS la position électrique (I8)', () => {
    expect(getPinPosition(component, pinById['5V'])).toEqual({ x: 70, y: 37 })
    expect(getPinPosition(component, pinById.GND)).toEqual({ x: 58, y: 25 })
    // un type sans projection retombe sur l'électrique
    const other = { type: 'RESISTOR', x: 0, y: 0 }
    const rPin = getComponentDef('RESISTOR').pins[0]
    expect(getPinPresentationPosition(other, rPin)).toEqual(getPinPosition(other, rPin))
    // le renderer POWER n'importe rien de simulator/
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const src = strip(readFileSync(resolve(__dirname, '../PowerPart.jsx'), 'utf-8'))
    expect(src).not.toMatch(/from\s+["'][^"']*\/simulator\//)
  })

  it('TEST 10 — aucun couplage générique type==="POWER" dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, rel).not.toMatch(/\btype\s*===?\s*["']POWER["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-power[^)]*\)/)
  })
})

describe('MB-VIS-COMP-036 — pipeline réel : 2 pins projetés sur les bornes', () => {
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

  it('CircuitComponent rend 2 pins aux positions de PRÉSENTATION (22,67)/(35,67) ; asset raster, markerless', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POWER', 50, 60) })

    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(2)
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[22, 67], [35, 67]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it("l'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POWER', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
