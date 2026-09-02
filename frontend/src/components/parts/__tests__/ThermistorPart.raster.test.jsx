/**
 * ThermistorPart.raster.test.jsx — MB-VIS-PROTOTYPE-006.
 *
 * Migration de `ThermistorPart.uid.test.jsx` (MB-VIS-LED-014), qui verrouillait
 * le contrat de namespace SVG (`<defs>` + gradients `metal`/`bead`/`edge` dont
 * les ids étaient dérivés de `uid`). Ce contrat SVG a disparu avec le passage
 * au backend raster : les assertions devenues obsolètes (préfixe d'id,
 * `url(#…)`, `const id = String(uid ?? 'thermistor').replace(…)`) sont adaptées,
 * la vérification RÉELLEMENT pertinente est conservée sous une forme
 * équivalente pour le raster :
 *   « deux thermistances sur le même canvas ne provoquent aucune collision »
 * → en raster : plus AUCUN id à namespacer, donc `[id].length === 0` et les
 *   deux instances rendent un HTML identique (aucun comportement dépendant du
 *   uid).
 * Le déterminisme (mêmes props → même HTML) est conservé tel quel.
 *
 * S'y ajoute la couverture d'intégration raster commune à
 * Resistor/Diode/Led/Capacitor/LdrPart.raster.test.jsx.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ThermistorPart } from '../ThermistorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../ThermistorPart.jsx')
const ASSET_RE = /^\/assets\/components\/thermistor\/thermistor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-VIS-PROTOTYPE-006 — THERMISTOR : contrat UID adapté au backend raster', () => {
  it('A (adapté) — uid absent : rendu valide, aria-label="Thermistance", aucun id à namespacer', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector('[aria-label="Thermistance"]')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
  })

  it('B (adapté) — uid fourni : n\'a aucun effet observable (plus aucun <defs> à namespacer)', () => {
    const withUid = render(<ThermistorPart uid="thermistor-a" />).container.innerHTML
    const withoutUid = render(<ThermistorPart />).container.innerHTML
    expect(withUid).toBe(withoutUid)
    expect(withUid).not.toMatch(/url\(#/)
  })

  it('C (conservé, forme raster) — deux THERMISTOR dans le même document : aucun id, HTML des deux instances identique (aucune collision possible)', () => {
    const { container } = render(
      <>
        <ThermistorPart uid="thermistor-a" />
        <ThermistorPart uid="thermistor-b" />
      </>
    )
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-thermistor')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('F (adapté) — uid avec caractères spéciaux : accepté, aucun effet, aucun id', () => {
    const { container } = render(<ThermistorPart uid="th #1/α" />)
    expect(container.querySelector('[aria-label="Thermistance"]')).not.toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
  })

  it('G (adapté) — le CODE (hors commentaires) ne contient plus de <svg>/<defs>/gradient ni d\'id (statique ou interpolé)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/<svg\b/)
    expect(code).not.toMatch(/<defs\b/)
    expect(code).not.toMatch(/[lL]inearGradient|[rR]adialGradient/)
    expect(code).not.toMatch(/\bid="/)
    expect(code).not.toMatch(/const id = String\(uid/)
    expect(code).toMatch(
      /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
    )
  })

  it('H (conservé) — déterminisme : deux rendus identiques pour un même uid', () => {
    const first = render(<ThermistorPart uid="thermistor-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<ThermistorPart uid="thermistor-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})

describe('MB-VIS-PROTOTYPE-006 — THERMISTOR : intégration raster', () => {
  it('1/8 — racine .part-thermistor, aria-label="Thermistance", <img> aux dimensions canoniques 84×36', () => {
    const def = getComponentDef('THERMISTOR')
    expect([def.width, def.height]).toEqual([84, 36])
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector('.part-thermistor')).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG V0', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('ellipse')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('radialGradient')).toBeNull()
  })

  it('3/4 — <picture>/<source webp> + <img> vers /assets/components/thermistor/… ; les 4 variantes référencées', () => {
    const { container } = render(<ThermistorPart />)
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
      expect(all).toContain(`/assets/components/thermistor/thermistor.default.${f}`)
    }
  })

  it('3b — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<ThermistorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('7 — backend résolu pour THERMISTOR = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('THERMISTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 84×36, pins A(0,18)/B(84,18)', () => {
    const def = getComponentDef('THERMISTOR')
    expect(def.width).toBe(84)
    expect(def.height).toBe(36)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.A).toEqual([0, 18])
    expect(byId.B).toEqual([84, 18])
  })
})

describe('MB-VIS-PROTOTYPE-006 — pipeline réel : pins et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    onReady(c)
    return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins THERMISTOR à A(0,18) / B(84,18) ; asset raster dans le wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('THERMISTOR', 50, 60) })

    const def = getComponentDef('THERMISTOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 18], [84, 18]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('6 — aucune logique spécifique THERMISTOR dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "THERMISTOR"`).not.toMatch(/\btype\s*===?\s*["']THERMISTOR["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-thermistor[^)]*\)/)
  })

  it('5b — deux THERMISTOR sur le canvas : 4 pins distincts aux positions canoniques, 2 <img>, 0 <svg>', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('THERMISTOR', 20, 20) })
    act(() => { api.addComponent('THERMISTOR', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '0px/18px').length).toBe(2)
    expect(rel.filter((r) => r === '84px/18px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8b — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('THERMISTOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
