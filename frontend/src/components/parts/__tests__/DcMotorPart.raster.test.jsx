/**
 * DcMotorPart.raster.test.jsx — MB-VIS-PROTOTYPE-007.
 *
 * Prouve l'intégration raster de DC_MOTOR via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique),
 * en suivant EXACTEMENT le patron de
 * Resistor/Diode/Led/Capacitor/Ldr/ThermistorPart.raster.test.jsx :
 *  1. racine `.part-dc-motor`, aria-label="Moteur DC", dimensions 84×50 ;
 *  2. aucun <svg>/<line>/<rect>/<circle> résiduel ;
 *  3. <picture>/<source webp> + <img> vers /assets/components/dc-motor/dc-motor.default.* ;
 *  4. 4 variantes 1x/3x webp+png référencées ;
 *  5. pipeline réel : pins plus(0,25)/minus(84,25) via CircuitComponent/Pin ;
 *  6. aucune logique spécifique DC_MOTOR dans la couche de rendu centrale ;
 *  7. backend résolu = raster (bareBody + markerless dérivés) ;
 *  8. géométrie canonique 84×50 inchangée (componentDefinitions.js) ;
 *  9. plusieurs instances : rendu déterministe, aucun id SVG, aucune collision.
 *
 * DcMotorPart ne reçoit aucune prop (composant statique historique) : le
 * déterminisme et l'indépendance entre instances sont donc vérifiés sans uid.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DcMotorPart } from '../DcMotorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/dc-motor\/dc-motor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-PROTOTYPE-007 — DC_MOTOR rend l\'asset raster validé', () => {
  it('1/8 — racine .part-dc-motor, aria-label="Moteur DC", <img> aux dimensions canoniques 84×50', () => {
    const def = getComponentDef('DC_MOTOR')
    expect([def.width, def.height]).toEqual([84, 50])
    const { container } = render(<DcMotorPart />)
    expect(container.querySelector('.part-dc-motor')).not.toBeNull()
    expect(container.querySelector('[aria-label="Moteur DC"]')).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG V0', () => {
    const { container } = render(<DcMotorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
  })

  it('3/4 — <picture>/<source webp> + <img> vers /assets/components/dc-motor/… ; les 4 variantes référencées', () => {
    const { container } = render(<DcMotorPart />)
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
      expect(all).toContain(`/assets/components/dc-motor/dc-motor.default.${f}`)
    }
  })

  it('3b — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<DcMotorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<DcMotorPart />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<DcMotorPart />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('9 — deux DC_MOTOR dans le même document : aucun <svg>, aucun id, HTML des deux instances identique', () => {
    const { container } = render(
      <>
        <DcMotorPart />
        <DcMotorPart />
      </>
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-dc-motor')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('7 — backend résolu pour DC_MOTOR = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('DC_MOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 84×50, pins plus(0,25)/minus(84,25)', () => {
    const def = getComponentDef('DC_MOTOR')
    expect(def.width).toBe(84)
    expect(def.height).toBe(50)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.plus).toEqual([0, 25])
    expect(byId.minus).toEqual([84, 25])
  })
})

describe('MB-VIS-PROTOTYPE-007 — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins DC_MOTOR à plus(0,25) / minus(84,25) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 50, 60) })

    const def = getComponentDef('DC_MOTOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 25], [84, 25]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('6 — aucune logique spécifique DC_MOTOR dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "DC_MOTOR"`).not.toMatch(/\btype\s*===?\s*["']DC_MOTOR["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-dc-motor[^)]*\)/)
  })

  it('5b — deux DC_MOTOR sur le canvas : 4 pins distincts aux positions canoniques, 2 <img>, 0 <svg>', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 20, 20) })
    act(() => { api.addComponent('DC_MOTOR', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '0px/25px').length).toBe(2)
    expect(rel.filter((r) => r === '84px/25px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8b — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
