/**
 * BuzzerPart.raster.test.jsx — MB-VIS-COMP-031.
 *
 * Prouve l'intégration raster du BUZZER via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique),
 * en suivant EXACTEMENT le patron de
 * Resistor/Diode/Capacitor/Ldr/Thermistor/DcMotorPart.raster.test.jsx.
 *
 * Couvre les 15 points du §16 du ticket :
 *  1. rend un <img> ; 2. aucun <svg> ; 3. aria-label="Buzzer" ;
 *  4/5. width/height = getComponentDef("BUZZER") ; 6. src dans /assets/components/buzzer/ ;
 *  7. <picture> ; 8. source WebP ; 9. fallback PNG ;
 *  10. draggable=false ; 11. pointer-events:none ; 12. backend BUZZER = raster ;
 *  13. pipeline réel : 2 pins logiques plus/minus conservés ;
 *  14. plusieurs instances sans collision (aucun id) ; 15. rendu déterministe.
 *
 * BuzzerPart ne reçoit aucune prop (composant statique — cf. §11 : le pipeline
 * n'expose aucun état électrique exploitable, le renderer se limite à `default`).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { BuzzerPart } from '../BuzzerPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/buzzer\/buzzer\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-031 — BUZZER rend l\'asset raster réaliste', () => {
  it('1/2/3 — rend un <img>, aucun <svg>, aria-label="Buzzer"', () => {
    const { container } = render(<BuzzerPart />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-buzzer')).not.toBeNull()
    expect(container.querySelector('[aria-label="Buzzer"]')).not.toBeNull()
  })

  it('4/5 — <img> width/height dérivés de getComponentDef("BUZZER")', () => {
    const def = getComponentDef('BUZZER')
    expect([def.width, def.height]).toEqual([70, 50])
    const { container } = render(<BuzzerPart />)
    const img = container.querySelector('img')
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('6/7/8/9 — <picture>/<source webp> + <img> vers /assets/components/buzzer/… ; fallback PNG ; 4 variantes référencées', () => {
    const { container } = render(<BuzzerPart />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toMatch(/\.png$/) // fallback PNG
    for (const cand of (img.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toMatch(/\.png/)
    }
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of (source.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toMatch(/\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['1x.webp', '3x.webp', '1x.png', '3x.png']) {
      expect(all).toContain(`/assets/components/buzzer/buzzer.default.${f}`)
    }
  })

  it('10/11 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<BuzzerPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('12 — backend résolu pour BUZZER = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('BUZZER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('15 — rendu déterministe : deux rendus produisent un HTML strictement identique', () => {
    const a = render(<BuzzerPart />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<BuzzerPart />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('14 — deux BUZZER dans le même document : aucun <svg>, aucun id, HTML des deux instances identique', () => {
    const { container } = render(
      <>
        <BuzzerPart />
        <BuzzerPart />
      </>
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-buzzer')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.innerHTML).toBe(b.innerHTML)
  })
})

describe('MB-VIS-COMP-031 — pipeline réel : pins logiques et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('13 — CircuitComponent produit exactement les 2 pins logiques BUZZER plus(10,50) / minus(60,50) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUZZER', 50, 60) })

    const def = getComponentDef('BUZZER')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[10, 50], [60, 50]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('aucune logique spécifique BUZZER dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "BUZZER"`).not.toMatch(/\btype\s*===?\s*["']BUZZER["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-buzzer[^)]*\)/)
  })

  it('14 (pipeline) — deux BUZZER sur le canvas : 4 pins distincts aux positions canoniques, 2 <img>, 0 <svg>', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUZZER', 20, 20) })
    act(() => { api.addComponent('BUZZER', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '10px/50px').length).toBe(2)
    expect(rel.filter((r) => r === '60px/50px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('l\'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUZZER', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
