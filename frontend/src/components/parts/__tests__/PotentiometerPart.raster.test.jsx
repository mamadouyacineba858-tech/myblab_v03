/**
 * PotentiometerPart.raster.test.jsx — MB-VIS-COMP-032.
 *
 * Prouve l'intégration raster du POTENTIOMETER via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (aucun couplage par type, aucune règle CSS spécifique),
 * en suivant EXACTEMENT le patron de
 * Resistor/Diode/Capacitor/Ldr/Thermistor/DcMotor/BuzzerPart.raster.test.jsx.
 *
 * Couvre les 14 points du §9 du ticket :
 *  1. renderer raster (<img>, aucun <svg>) ; 2. <picture> ; 3. source WebP ;
 *  4. fallback PNG ; 5. référence 1x ; 6. référence 3x ;
 *  7. 3 pins ; 8. left présent ; 9. wiper présent ; 10. right présent ;
 *  11. aucune quatrième pin ; 12. déterminisme ; 13. aucun id DOM instable ;
 *  14. aucune interaction ajoutée au renderer.
 *
 * PotentiometerPart ne reçoit aucune prop (composant statique — cf. §3/§14 :
 * comportement électrique strictement inchangé, le renderer se limite à
 * l'état `default`).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PotentiometerPart } from '../PotentiometerPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/potentiometer\/potentiometer\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-COMP-032 — POTENTIOMETER rend l\'asset raster réaliste', () => {
  it('1/13 — rend un <img>, aucun <svg>, aria-label="Potentiomètre", aucun id DOM', () => {
    const { container } = render(<PotentiometerPart />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    expect(container.querySelector('.part-potentiometer')).not.toBeNull()
    expect(container.querySelector('[aria-label="Potentiomètre"]')).not.toBeNull()
  })

  it('4/5 — <img> width/height dérivés de getComponentDef("POTENTIOMETER") (90×50)', () => {
    const def = getComponentDef('POTENTIOMETER')
    expect([def.width, def.height]).toEqual([90, 50])
    const { container } = render(<PotentiometerPart />)
    const img = container.querySelector('img')
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2/3/4/5/6 — <picture>/<source webp> + <img> vers /assets/components/potentiometer/… ; fallback PNG ; variantes 1x et 3x référencées', () => {
    const { container } = render(<PotentiometerPart />)
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
      expect(all).toContain(`/assets/components/potentiometer/potentiometer.default.${f}`)
    }
  })

  it('14 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<PotentiometerPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('backend résolu pour POTENTIOMETER = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('POTENTIOMETER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('12 — rendu déterministe : deux rendus produisent un HTML strictement identique', () => {
    const a = render(<PotentiometerPart />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<PotentiometerPart />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('13 — deux POTENTIOMETER dans le même document : aucun <svg>, aucun id, HTML des deux instances identique', () => {
    const { container } = render(
      <>
        <PotentiometerPart />
        <PotentiometerPart />
      </>
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-potentiometer')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.innerHTML).toBe(b.innerHTML)
  })
})

describe('MB-VIS-COMP-032 — pipeline réel : 3 pins logiques et interactions inchangés', () => {
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

  it('7/8/9/10/11 — CircuitComponent produit exactement les 3 pins logiques left(10,50) / wiper(45,50) / right(80,50) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POTENTIOMETER', 50, 60) })

    const def = getComponentDef('POTENTIOMETER')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(3)
    expect(def.pins.map((p) => p.id).sort()).toEqual(['left', 'right', 'wiper'])

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[10, 50], [45, 50], [80, 50]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('aucune logique spécifique POTENTIOMETER dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "POTENTIOMETER"`).not.toMatch(/\btype\s*===?\s*["']POTENTIOMETER["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-potentiometer[^)]*\)/)
  })

  it('13 (pipeline) — deux POTENTIOMETER sur le canvas : 6 pins distincts aux positions canoniques, 2 <img>, 0 <svg>', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POTENTIOMETER', 20, 20) })
    act(() => { api.addComponent('POTENTIOMETER', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(6)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '10px/50px').length).toBe(2)
    expect(rel.filter((r) => r === '45px/50px').length).toBe(2)
    expect(rel.filter((r) => r === '80px/50px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('14 (pipeline) — l\'<img> ne capte pas les événements — le wrapper .circuit-component les reçoit', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POTENTIOMETER', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
