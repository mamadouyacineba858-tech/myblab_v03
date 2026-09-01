/**
 * ResistorPart.raster.test.jsx — MB-VIS-PROTOTYPE-001C
 *
 * Prouve le branchement réel de l'asset raster RESISTOR validé en 001B :
 *  1. RESISTOR rend un <img> ;
 *  2. src / srcset pointent vers les assets sous /assets/components/resistor/ ;
 *  3. draggable = false ;
 *  4. pointer-events: none ;
 *  5. aucun vestige de l'ancien renderer SVG (<svg>/<line>/<rect>/<defs>/gradient) ;
 *  6. la boîte logique reste 84×28 (dimensions dérivées de getComponentDef) ;
 *  7. les pins A(0,14)/B(84,14) restent produits par CircuitComponent/Pin ;
 *  8. aucune régression d'interaction : l'<img> ne porte aucun handler, les
 *     événements restent au wrapper .circuit-component.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { ResistorPart } from '../ResistorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const ASSET_RE = /^\/assets\/components\/resistor\/resistor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('001C — RESISTOR rend l\'asset raster validé', () => {
  it('1/6 — rend un <img> aux dimensions de getComponentDef("RESISTOR") (84×28)', () => {
    const def = getComponentDef('RESISTOR')
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(def.width).toBe(84)
    expect(def.height).toBe(28)
  })

  it('2 — src + srcset (img et <source>) pointent vers /assets/components/resistor/…', () => {
    const { container } = render(<ResistorPart />)
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
    // les 4 variantes validées apparaissent au total
    const all = container.innerHTML
    for (const f of ['1x.webp', '3x.webp', '1x.png', '3x.png']) {
      expect(all).toContain(`/assets/components/resistor/resistor.default.${f}`)
    }
  })

  it('3/4/8 — draggable=false, pointer-events:none, aucun handler d\'interaction sur l\'<img>', () => {
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
    expect(img.onpointerup).toBeNull()
  })

  it('5 — aucun vestige de l\'ancien renderer SVG', () => {
    const { container } = render(<ResistorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBeNull()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<ResistorPart uid="r-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<ResistorPart uid="r-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })
})

describe('001C — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('7 — CircuitComponent produit les 2 pins RESISTOR à A(0,14) / B(84,14)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })

    const def = getComponentDef('RESISTOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 14], [84, 14]]))

    // le composant rend bien l'asset raster à l'intérieur du wrapper
    expect(container.querySelector('.circuit-component img')).not.toBeNull()
    expect(container.querySelector('.circuit-component svg')).toBeNull()
  })

  it('8 — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })

    const wrap = container.querySelector('.circuit-component')
    expect(wrap).not.toBeNull()
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component img'))
    expect(got).toBe(1) // l'événement remonte au wrapper
  })
})
