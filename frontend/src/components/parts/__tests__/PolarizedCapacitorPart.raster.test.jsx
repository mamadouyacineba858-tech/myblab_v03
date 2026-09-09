/**
 * PolarizedCapacitorPart.raster.test.jsx — FT-C-COMP-002
 *
 * Prouve l'intégration raster de POLARIZED_CAPACITOR via le mécanisme
 * déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par type) :
 *  1. le renderer rend un élément racine `.part-polarized-capacitor`,
 *     aria-label="Condensateur polarisé", dimensions canoniques 33×120 ;
 *  2. aucun <svg> — c'est un backend raster pur ;
 *  3. l'asset raster attendu (/assets/components/polarized-capacitor/…) est
 *     utilisé — les 4 variantes 1x/3x webp+png référencées, AUCUN fallback
 *     silencieux vers un autre composant (T15) ;
 *  4. <picture>/<source webp> + <img srcset> — patron RESISTOR/CAPACITOR ;
 *  5. l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none ;
 *  6. le renderer est enregistré dans DEFAULT_REGISTRATIONS (T5) et résout un
 *     composant React ; backend résolu = 'raster' ;
 *  7. le pipeline réel produit les 2 pins canoniques plus/minus, l'asset
 *     dans le wrapper, aucune double patte (le raster est écrêté par
 *     bodyClip, les pattes fonctionnelles viennent d'AssemblyLeadsLayer) ;
 *  8. CAPACITOR (céramique) n'est pas affecté : renderer distinct.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { PolarizedCapacitorPart } from '../PolarizedCapacitorPart.jsx'
import { CapacitorPart } from '../CapacitorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation, getComponentByType, getAvailableTypes } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const ASSET_RE = /^\/assets\/components\/polarized-capacitor\/polarized-capacitor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

describe('FT-C-COMP-002 — POLARIZED_CAPACITOR rend l\'asset raster bleu validé', () => {
  it('1 — élément racine aria-label="Condensateur polarisé", <img> aux dimensions canoniques 33×120', () => {
    const def = getComponentDef('POLARIZED_CAPACITOR')
    expect([def.width, def.height]).toEqual([33, 120])
    const { container } = render(<PolarizedCapacitorPart />)
    expect(container.querySelector('.part-polarized-capacitor')).not.toBeNull()
    expect(container.querySelector('[aria-label="Condensateur polarisé"]')).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun <svg> (raster pur)', () => {
    const { container } = render(<PolarizedCapacitorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
  })

  it('3/4 — <picture>/<source webp> + <img> vers /assets/components/polarized-capacitor/… ; les 4 variantes ; AUCUN fallback silencieux (T15)', () => {
    const { container } = render(<PolarizedCapacitorPart />)
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
      expect(all).toContain(`/assets/components/polarized-capacitor/polarized-capacitor.default.${f}`)
    }
    // T15 : jamais l'asset d'un autre composant (notamment pas le condensateur
    // céramique CAPACITOR).
    expect(all).not.toMatch(/\/assets\/components\/capacitor\//)
  })

  it('5 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<PolarizedCapacitorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<PolarizedCapacitorPart />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<PolarizedCapacitorPart />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })

  it('6 — enregistré dans DEFAULT_REGISTRATIONS (T5), backend raster ; bareBody + markerless dérivés', () => {
    expect(getAvailableTypes()).toContain('POLARIZED_CAPACITOR')
    expect(getComponentByType('POLARIZED_CAPACITOR')).toBe(PolarizedCapacitorPart)
    expect(getComponentPresentation('POLARIZED_CAPACITOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('8 — CAPACITOR (céramique) garde son propre renderer, distinct', () => {
    expect(getComponentByType('CAPACITOR')).toBe(CapacitorPart)
    expect(getComponentByType('CAPACITOR')).not.toBe(getComponentByType('POLARIZED_CAPACITOR'))
  })
})

describe('FT-C-COMP-002 — pipeline réel : pins canoniques plus/minus, asset dans le wrapper, aucune double patte', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('7 — CircuitComponent produit les 2 pins plus/minus, asset raster dans le wrapper, wrapper écrêté par bodyClip', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POLARIZED_CAPACITOR', 100, 100) })

    const def = getComponentDef('POLARIZED_CAPACITOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'minus'])

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)

    // bodyClip appliqué (le raster porte des pattes cuites qu'on masque)
    const body = container.querySelector('.circuit-component__body')
    expect(body.style.clipPath).toBe(`inset(0 0 ${getAssemblyProfile('POLARIZED_CAPACITOR').bodyClip.bottom}px 0)`)

    // les pattes fonctionnelles sont dessinées par AssemblyLeadsLayer (SVG
    // <line>), une par contact — jamais dans l'asset : aucune double patte.
    const leads = container.querySelectorAll('.assembly-leads__lead')
    expect(leads.length).toBe(2)
    expect([...leads].map((l) => l.getAttribute('data-pin')).sort()).toEqual(['minus', 'plus'])
  })

  it('8c — le wrapper .circuit-component reçoit les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POLARIZED_CAPACITOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
