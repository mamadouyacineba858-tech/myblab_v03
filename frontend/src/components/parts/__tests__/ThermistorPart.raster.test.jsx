/**
 * ThermistorPart.raster.test.jsx — MB-VIS-PROTOTYPE-006, migré par
 * MB-L1-CONS-002 (renderer contract consolidation).
 *
 * [MB-L1-CONS-002] `ThermistorPart.jsx` a abandonné l'asset raster
 * (MB-VIS-PROTOTYPE-006) pour un renderer CSS/DOM pur — perle NTC verticale
 * avec identité visible "NTC"/"100-9", aucun <img>/<picture>. Ce fichier
 * conservait encore le contrat raster obsolète (picture/img/asset validé) —
 * migré vers le contrat RÉEL, sans jamais exiger la restauration du raster.
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
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = resolve(__dirname, '../ThermistorPart.jsx')
const ARIA_LABEL = 'Thermistance NTC'

describe('MB-VIS-PROTOTYPE-006 — THERMISTOR : contrat de rendu (MB-L1-CONS-002)', () => {
  it('A — uid absent : rendu valide, aria-label="Thermistance NTC", aucun id à namespacer', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector(`[aria-label="${ARIA_LABEL}"]`)).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
  })

  it('B — uid fourni : n\'a aucun effet observable', () => {
    const withUid = render(<ThermistorPart uid="thermistor-a" />).container.innerHTML
    const withoutUid = render(<ThermistorPart />).container.innerHTML
    expect(withUid).toBe(withoutUid)
    expect(withUid).not.toMatch(/url\(#/)
  })

  it('C — deux THERMISTOR dans le même document : aucun id, HTML des deux instances identique (aucune collision possible)', () => {
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

  it('F — uid avec caractères spéciaux : accepté, aucun effet, aucun id', () => {
    const { container } = render(<ThermistorPart uid="th #1/α" />)
    expect(container.querySelector(`[aria-label="${ARIA_LABEL}"]`)).not.toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
  })

  it('G — le CODE (hors commentaires) ne contient ni <svg>/<defs>/gradient/id, ni <img>/<picture> : le raster n\'est plus le contrat réel', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/<svg\b/)
    expect(code).not.toMatch(/<defs\b/)
    expect(code).not.toMatch(/[lL]inearGradient|[rR]adialGradient/)
    expect(code).not.toMatch(/\bid="/)
    expect(code).not.toMatch(/const id = String\(uid/)
    expect(code).not.toMatch(/<img\b/)
    expect(code).not.toMatch(/<picture\b/)
    expect(code).toMatch(
      /import\s*\{\s*getComponentDef\s*\}\s*from\s*["']\.\.\/\.\.\/config\/componentDefinitions\.js["']/
    )
  })

  it('H — déterminisme : deux rendus identiques pour un même uid', () => {
    const first = render(<ThermistorPart uid="thermistor-a" />)
    const html1 = first.container.innerHTML
    first.unmount()
    const second = render(<ThermistorPart uid="thermistor-a" />)
    const html2 = second.container.innerHTML
    second.unmount()
    expect(html2).toBe(html1)
  })
})

describe('MB-VIS-PROTOTYPE-006 — THERMISTOR : intégration renderer CSS/DOM réel', () => {
  it('1 — racine .part-thermistor, aria-label="Thermistance NTC", dimensions canoniques 84×36 (repli style inline)', () => {
    const def = getComponentDef('THERMISTOR')
    expect([def.width, def.height]).toEqual([84, 36])
    const { container } = render(<ThermistorPart />)
    const root = container.querySelector('.part-thermistor')
    expect(root).not.toBeNull()
    expect(root.style.width).toBe(`${def.width}px`)
    expect(root.style.height).toBe(`${def.height}px`)
  })

  it('2 — aucun vestige du renderer SVG V0, aucun <img>/<picture> raster', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('ellipse')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('radialGradient')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('picture')).toBeNull()
  })

  it('3 — identité NTC visible ("NTC" et "100-9")', () => {
    const { container } = render(<ThermistorPart />)
    expect(container.textContent).toContain('NTC')
    expect(container.textContent).toContain('100-9')
  })

  it('7 — backend résolu pour THERMISTOR = svg (défaut, raster retiré) ; bareBody + markerless explicitement true (préserve le rendu réel)', () => {
    expect(getComponentPresentation('THERMISTOR')).toEqual({ backend: 'svg', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 84×36, pins A(0,18)/B(84,18) (identité électrique, MB-L1-CONS-001 non affecté)', () => {
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
    // MB-VIS-CANVAS-051 : `components` (componentsForRender) est désormais
    // exposé par useCircuitInteraction() (state haute fréquence) — fusionné
    // dans l'objet transmis à onReady() pour que les assertions existantes
    // (api.components...) restent inchangées.
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins THERMISTOR au PhysicalContact réel (30,62)/(54,62) — pas A(0,18)/B(84,18) legacy (MB-L1-CONS-001)', () => {
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
    expect(positions).toEqual(expect.arrayContaining([[30, 62], [54, 62]]))

    expect(container.querySelector('.circuit-component__body img')).toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component__body .part-thermistor')).not.toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('svg')
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

  it('5b — deux THERMISTOR sur le canvas : 4 pins distincts au PhysicalContact réel, 0 <img>, 0 <svg>', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('THERMISTOR', 20, 20) })
    act(() => { api.addComponent('THERMISTOR', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '30px/62px').length).toBe(2)
    expect(rel.filter((r) => r === '54px/62px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body .part-thermistor').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(0)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8b — le wrapper .circuit-component reçoit toujours les événements (le corps CSS ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('THERMISTOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body .part-thermistor'))
    expect(got).toBe(1)
  })
})
