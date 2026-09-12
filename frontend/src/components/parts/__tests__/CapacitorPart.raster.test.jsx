/**
 * CapacitorPart.raster.test.jsx — MB-VIS-PROTOTYPE-004, migré par
 * MB-L1-CONS-002 (renderer contract consolidation).
 *
 * [MB-L1-CONS-002] `CapacitorPart.jsx` a abandonné l'asset raster
 * (MB-VIS-PROTOTYPE-004) pour un renderer CSS/DOM pur : corps céramique
 * radial non polarisé avec marquage "104", aucun <img>/<picture>. Ce fichier
 * conservait encore le contrat raster obsolète (picture/img/asset validé) —
 * migré vers le contrat RÉEL, sans jamais exiger la restauration du raster :
 *  1. CAPACITOR rend un corps CSS/DOM (élément racine `.part-capacitor`,
 *     aria-label complet "Condensateur céramique non polarisé") ;
 *  2. aucun <img>/<picture> (le raster n'est plus la réalité de production) ;
 *  3. aucun <svg> non plus (ni <line>/<rect>/<defs>/gradient/<text>) — le
 *     corps est un <div> stylé CSS pur ;
 *  4. le marquage "104" (identité visible du condensateur céramique) est
 *     présent, aucun marqueur de polarité (ce n'est pas un composant polarisé
 *     — POLARIZED_CAPACITOR reste un type distinct, inchangé) ;
 *  5. les pins fonctionnels (identités électriques pinA/pinB) restent produits
 *     par CircuitComponent/Pin, aux positions du PhysicalContact réel
 *     (23,62)/(47,62) — géométrie Contact/Pin consolidée par MB-L1-CONS-001,
 *     non modifiée ici ;
 *  6. aucune logique spécifique CAPACITOR dans la couche de rendu centrale ;
 *  7. le backend résolu pour CAPACITOR est `svg` (défaut, backend `raster`
 *     retiré de defaultRegistrations.js) ; bareBody/markerless restent `true`
 *     (déclarés explicitement, pour préserver le rendu réel : body sans
 *     habillage carte générique, marqueur de <Pin> masqué au profit des
 *     pattes dessinées par AssemblyLeadsLayer — même contrat que LED/LDR) ;
 *  8. la géométrie canonique 70×40 et les pins pinA(0,20)/pinB(70,20)
 *     (identité électrique) restent inchangés (componentDefinitions.js,
 *     hors périmètre de ce ticket) ;
 *  9. deux CAPACITOR simultanés : rendu déterministe, aucune collision d'id.
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
const ARIA_LABEL = 'Condensateur céramique non polarisé'

describe("MB-VIS-PROTOTYPE-004 — CAPACITOR : renderer CSS/DOM réel (MB-L1-CONS-002)", () => {
  it('1 — rend un élément racine .part-capacitor, aria-label complet, aux dimensions canoniques 70×40 (repli style inline)', () => {
    const def = getComponentDef('CAPACITOR')
    expect([def.width, def.height]).toEqual([70, 40])
    const { container } = render(<CapacitorPart />)
    const root = container.querySelector('.part-capacitor')
    expect(root).not.toBeNull()
    expect(container.querySelector(`[aria-label="${ARIA_LABEL}"]`)).not.toBeNull()
    expect(root.style.width).toBe(`${def.width}px`)
    expect(root.style.height).toBe(`${def.height}px`)
  })

  it('2 — aucun <img>/<picture> : le raster n\'est plus le contrat réel', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('picture')).toBeNull()
  })

  it('3 — aucun vestige du renderer SVG V0 (le corps est un <div> CSS pur)', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
  })

  it('4 — marquage "104" visible, aucun marqueur de polarité (composant non polarisé)', () => {
    const { container } = render(<CapacitorPart />)
    expect(container.textContent).toContain('104')
    expect(container.textContent).not.toMatch(/[+−-]/)
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<CapacitorPart uid="c-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<CapacitorPart uid="c-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('9 — deux CAPACITOR simultanés : aucun id à namespacer, HTML des deux instances identique', () => {
    const { container } = render(
      <>
        <CapacitorPart uid="capacitor-a" />
        <CapacitorPart uid="capacitor-b" />
      </>
    )
    expect(container.querySelectorAll('[id]').length).toBe(0)
    const [a, b] = container.querySelectorAll('.part-capacitor')
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('7 — backend résolu pour CAPACITOR = svg (défaut, raster retiré) ; bareBody + markerless explicitement true (préserve le rendu réel)', () => {
    expect(getComponentPresentation('CAPACITOR')).toEqual({ backend: 'svg', bareBody: true, markerless: true })
  })

  it('8 — géométrie canonique inchangée : 70×40, pins pinA(0,20)/pinB(70,20) (identité électrique, MB-L1-CONS-001 non affecté)', () => {
    const def = getComponentDef('CAPACITOR')
    expect(def.width).toBe(70)
    expect(def.height).toBe(40)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.pinA).toEqual([0, 20])
    expect(byId.pinB).toEqual([70, 20])
  })
})

describe('MB-VIS-PROTOTYPE-004 — pipeline réel : pins et interactions inchangés', () => {
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

  it('5 — CircuitComponent produit les 2 pins CAPACITOR au PhysicalContact réel (23,62)/(47,62) — pas pinA(0,20)/pinB(70,20) legacy (MB-L1-CONS-001)', () => {
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

    expect(container.querySelector('.circuit-component__body img')).toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component__body .part-capacitor')).not.toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('svg')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
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
    expect(container.querySelectorAll('.circuit-component__body img').length).toBe(0)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('8c — le wrapper .circuit-component reçoit toujours les événements (le corps CSS ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('CAPACITOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body .part-capacitor'))
    expect(got).toBe(1)
  })
})
