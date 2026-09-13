/**
 * CapacitorPart.raster.test.jsx — MB-VIS-PROTOTYPE-004, migré par
 * MB-L1-CONS-002, puis MB-L1-PROP-005 (retour au raster réel, Candidate C).
 *
 * [MB-L1-PROP-005] `CapacitorPart.jsx` abandonne le renderer CSS/DOM
 * (MB-L1-CONS-002, corps céramique + marquage "104" figé) pour l'asset
 * raster réaliste Candidate C (`capacitor.base.*`, sélection CSA/CTO après
 * R&D) + un marquage EIA 3 chiffres dérivé dynamiquement de
 * `parameters.capacitance` (`encodeCapacitorMarking`, jamais peint dans
 * l'image, jamais persisté) :
 *  1. CAPACITOR rend un `<picture>`/`<img>` (le raster est de nouveau la
 *     réalité de production) ;
 *  2. src/srcset pointent vers `capacitor.base.*` sous
 *     /assets/components/capacitor/ (jamais les `capacitor.default.*`
 *     historiques, préservés mais orphelins) ;
 *  3/4. draggable=false, pointer-events:none (image ET marquage) ;
 *  5. aucun vestige du renderer SVG/CSS antérieur (<svg>/<line>/<rect>/
 *     <defs>/gradient) ;
 *  6. aucune bande de polarité (composant non polarisé — POLARIZED_CAPACITOR
 *     reste un type distinct, inchangé) ;
 *  7. le backend résolu pour CAPACITOR est `raster` ; bareBody/markerless
 *     restent `true` ;
 *  8. la géométrie canonique 70×40 reste inchangée (componentDefinitions.js,
 *     hors périmètre de ce ticket) ;
 *  9. deux CAPACITOR simultanés : rendu déterministe, aucune collision d'id ;
 *  10. le marquage suit `parameters.capacitance` (dérivé, jamais persisté,
 *      absent quand la valeur n'est pas exactement représentable).
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { CapacitorPart } from '../CapacitorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/capacitor\/capacitor\.base\.(1x|3x)\.(webp|png)( \dx)?$/

describe('MB-L1-PROP-005 — CAPACITOR rend l\'asset raster neutre Candidate C', () => {
  it('1 — rend un <img> aux dimensions de getComponentDef("CAPACITOR") (70×40)', () => {
    const def = getComponentDef('CAPACITOR')
    const { container } = render(<CapacitorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(def.width).toBe(70)
    expect(def.height).toBe(40)
  })

  it('2 — src + srcset (img et <source>) pointent vers /assets/components/capacitor/capacitor.base.…', () => {
    const { container } = render(<CapacitorPart />)
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
      expect(all).toContain(`/assets/components/capacitor/capacitor.base.${f}`)
    }
    // jamais les anciens assets `default.*`, historiques mais orphelins
    expect(all).not.toContain('capacitor.default.')
  })

  it('3/4 — draggable=false, pointer-events:none, aucun handler d\'interaction sur l\'<img>', () => {
    const { container } = render(<CapacitorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('5 — aucun vestige du renderer SVG/CSS antérieur', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('[aria-label="Condensateur céramique non polarisé"]')).not.toBeNull()
  })

  it('6 — aucun marqueur de polarité (composant non polarisé)', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 1e-7 }} />)
    expect(container.textContent).not.toMatch(/[+−]/)
  })

  it('déterminisme (sans paramètres) — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<CapacitorPart uid="c-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<CapacitorPart uid="c-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('9 — deux CAPACITOR simultanés : aucun id à namespacer, HTML identique pour la même capacitance', () => {
    const { container } = render(
      <>
        <CapacitorPart uid="capacitor-a" parameters={{ capacitance: 1e-7 }} />
        <CapacitorPart uid="capacitor-b" parameters={{ capacitance: 1e-7 }} />
      </>
    )
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-capacitor')
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('7 — backend résolu pour CAPACITOR = raster ; bareBody + markerless explicitement true', () => {
    expect(getComponentPresentation('CAPACITOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 70×40, pins pinA(0,20)/pinB(70,20) (identité électrique)', () => {
    const def = getComponentDef('CAPACITOR')
    expect(def.width).toBe(70)
    expect(def.height).toBe(40)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.pinA).toEqual([0, 20])
    expect(byId.pinB).toEqual([70, 20])
  })
})

describe('MB-L1-PROP-005 — marquage EIA dynamique dérivé de parameters.capacitance', () => {
  function marking(container) {
    const el = container.querySelector('.part-capacitor__marking')
    return el ? el.textContent : null
  }

  it('100 nF (1e-7 F) -> "104"', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 1e-7 }} />)
    expect(marking(container)).toBe('104')
  })

  it('1 nF (1e-9 F) -> "102" (différent de 100 nF)', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 1e-9 }} />)
    expect(marking(container)).toBe('102')
  })

  it('deux valeurs valides différentes produisent des marquages indépendants', () => {
    const a = render(<CapacitorPart parameters={{ capacitance: 1e-7 }} />)
    const b = render(<CapacitorPart parameters={{ capacitance: 470e-9 }} />)
    expect(marking(a.container)).not.toBe(marking(b.container))
    expect(marking(b.container)).toBe('474')
  })

  it('123 nF (non représentable en code ABN) -> aucun marquage, corps neutre seul', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 123e-9 }} />)
    expect(container.querySelector('.part-capacitor__marking')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('aucune prop parameters (contrat direct) -> corps neutre, aucun marquage inventé', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('.part-capacitor__marking')).toBeNull()
  })

  it('le marquage ne porte aucun handler et est neutre à l\'interaction (pointer-events:none)', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 1e-7 }} />)
    const markingEl = container.querySelector('.part-capacitor__marking')
    expect(markingEl).not.toBeNull()
    expect(markingEl.style.pointerEvents).toBe('none')
    expect(markingEl.onclick).toBeNull()
    expect(markingEl.onpointerdown).toBeNull()
  })

  it('aria-label reflète le marquage exact quand représentable', () => {
    const { container } = render(<CapacitorPart parameters={{ capacitance: 1e-7 }} />)
    expect(container.querySelector('[aria-label="Condensateur céramique non polarisé, marquage 104"]')).not.toBeNull()
  })
})

describe('MB-L1-PROP-005 — pipeline réel : PhysicalContacts, paramètres et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('5 — CircuitComponent produit les 2 pins CAPACITOR au PhysicalContact réel (23,62)/(47,62)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })

    const def = getComponentDef('CAPACITOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[23, 62], [47, 62]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('9 — une nouvelle CAPACITOR (défaut 100 nF, canonicalRegistry.js) affiche "104" via le pipeline réel', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })
    expect(api.components[0].parameters).toEqual({ capacitance: 1e-7 })
    expect(container.querySelector('.part-capacitor__marking').textContent).toBe('104')
  })

  it('10 — éditer capacitance via updateComponentParameters change le marquage sans toucher les contacts', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })
    const uid = api.components[0].uid

    act(() => { api.updateComponentParameters(uid, { capacitance: 1e-9 }) })
    expect(container.querySelector('.part-capacitor__marking').textContent).toBe('102')

    const pins = container.querySelectorAll('.myblab-pin')
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[23, 62], [47, 62]]))
  })

  it('6 — aucune logique spécifique CAPACITOR dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "CAPACITOR"`).not.toMatch(/\btype\s*===?\s*["']CAPACITOR["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-capacitor[^)]*\)/)
  })

  it('8b — deux CAPACITOR sur le canvas : 4 pins distincts, chacun au PhysicalContact réel', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 20, 20) })
    act(() => { api.addComponent('CAPACITOR', 200, 200) })
    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '23px/62px').length).toBe(2)
    expect(rel.filter((r) => r === '47px/62px').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body .part-capacitor').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8c — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
