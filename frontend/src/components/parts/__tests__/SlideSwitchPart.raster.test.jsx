/**
 * SlideSwitchPart.raster.test.jsx — A3-SW1-R1
 *
 * Prouve l'intégration raster STATEFUL et INTERACTIVE de SLIDE_SWITCH via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par type,
 * aucune règle CSS spécifique), même patron que LatchingButtonPart.raster.test.jsx :
 *  1. SLIDE_SWITCH rend correctement (élément racine `.part-slide-switch`,
 *     aria-label selon state) ;
 *  2. le renderer ne produit plus de <svg> (ni les primitives CSS
 *     schématiques housing/track/knob du renderer initial A3-SW1) ;
 *  3. l'asset raster attendu
 *     (/assets/components/slide-switch/slide-switch.<state>.<res>.<ext>)
 *     est utilisé ;
 *  4. variantes 1x/3x cohérentes (<picture>/<source webp> + <img> srcset) —
 *     les 4 variantes de l'état référencées ;
 *  5. l'état left/right est piloté par la prop `state` existante : classe
 *     `.is-left`/`.is-right`, aria-label et jeu d'assets basculent
 *     ensemble, sans <svg> ;
 *  6. les gestionnaires onPointerDown/onPointerMove/onClick (mécanisme
 *     SetComponentStateCommand / undo-redo) restent attachés à l'élément
 *     racine (contrat de props strictement inchangé) ;
 *  7. l'<img> ne porte aucun gestionnaire, draggable=false,
 *     pointer-events:none (le hit-test reste sur le wrapper) ;
 *  8. le backend résolu pour SLIDE_SWITCH est bien 'raster' (via
 *     getComponentPresentation) ;
 *  9. la géométrie canonique 72×48 reste inchangée ; les pins
 *     throwA/common/throwB restent celles de componentDefinitions.js ;
 *  10. pipeline réel CircuitComponent -> PartRenderer : pins fonctionnels
 *      inchangés, click réel bascule component.state, chrome neutralisé.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { SlideSwitchPart } from '../SlideSwitchPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { resolveContacts } from '../../../utils/contactModel.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/slide-switch\/slide-switch\.(left|right)\.(1x|3x)\.(webp|png)( \dx)?$/

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe("A3-SW1-R1 — SLIDE_SWITCH rend le paquet d'assets raster validé", () => {
  it('1/9 — élément racine .part-slide-switch aux dimensions canoniques 72×48', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    expect([def.width, def.height]).toEqual([72, 48])
    const { container } = render(<SlideSwitchPart state="left" />)
    const root = container.querySelector('.part-slide-switch')
    expect(root).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer CSS schématique initial (housing/track/knob) ni de <svg>', () => {
    for (const state of ['left', 'right']) {
      const { container, unmount } = render(<SlideSwitchPart state={state} />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('.part-slide-switch__housing')).toBeNull()
      expect(container.querySelector('.part-slide-switch__track')).toBeNull()
      expect(container.querySelector('.part-slide-switch__knob')).toBeNull()
      unmount()
    }
  })

  it('3/4 — left : <picture>/<source webp> + <img> vers .../slide-switch.left.* ; les 4 variantes référencées', () => {
    const { container } = render(<SlideSwitchPart state="left" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('slide-switch.left.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('slide-switch.left.')
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/slide-switch\.left\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['left.1x.webp', 'left.3x.webp', 'left.1x.png', 'left.3x.png']) {
      expect(all).toContain(`/assets/components/slide-switch/slide-switch.${f}`)
    }
  })

  it('3/4 — right : <picture>/<source webp> + <img> vers .../slide-switch.right.* ; les 4 variantes référencées', () => {
    const { container } = render(<SlideSwitchPart state="right" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('slide-switch.right.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('slide-switch.right.')
    }
    const source = container.querySelector('picture > source')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/slide-switch\.right\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['right.1x.webp', 'right.3x.webp', 'right.1x.png', 'right.3x.png']) {
      expect(all).toContain(`/assets/components/slide-switch/slide-switch.${f}`)
    }
  })

  it('5 — état left : classe is-left, aria-label "position gauche", asset left', () => {
    const { container } = render(<SlideSwitchPart state="left" />)
    const root = container.querySelector('.part-slide-switch')
    expect(root.getAttribute('class')).toMatch(/is-left/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur à glissière : position gauche')
    expect(container.querySelector('img').getAttribute('src')).toContain('slide-switch.left.')
  })

  it('5 — état right : classe is-right, aria-label "position droite", asset right', () => {
    const { container } = render(<SlideSwitchPart state="right" />)
    const root = container.querySelector('.part-slide-switch')
    expect(root.getAttribute('class')).toMatch(/is-right/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur à glissière : position droite')
    expect(container.querySelector('img').getAttribute('src')).toContain('slide-switch.right.')
  })

  it('6 — les gestionnaires onPointerDown/onPointerMove/onClick restent attachés à la racine (contrat de props inchangé)', () => {
    let clicked = false
    let pointerDowns = 0
    let pointerMoves = 0
    const { container } = render(
      <SlideSwitchPart
        state="left"
        onPointerDown={() => { pointerDowns += 1 }}
        onPointerMove={() => { pointerMoves += 1 }}
        onClick={() => { clicked = true }}
      />
    )
    const root = container.querySelector('.part-slide-switch')
    fireEvent.pointerDown(root)
    fireEvent.pointerMove(root)
    fireEvent.click(root)
    expect(pointerDowns).toBe(1)
    expect(pointerMoves).toBe(1)
    expect(clicked).toBe(true)
  })

  it('7 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<SlideSwitchPart state="left" />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
  })

  it('8 — backend résolu pour SLIDE_SWITCH = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('SLIDE_SWITCH')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('9 — géométrie canonique inchangée : 72×48, pins throwA(12,44)/common(36,44)/throwB(60,44)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    expect(def.width).toBe(72)
    expect(def.height).toBe(48)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.throwA).toEqual([12, 44])
    expect(byId.common).toEqual([36, 44])
    expect(byId.throwB).toEqual([60, 44])
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique (left puis right)', () => {
    for (const state of ['left', 'right']) {
      const a = render(<SlideSwitchPart state={state} />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<SlideSwitchPart state={state} />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2).toBe(h1)
    }
  })
})

describe('A3-SW1-R1 — pipeline réel : pins, click et undo/redo SLIDE_SWITCH inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('10 — CircuitComponent produit 3 contacts physiques / 3 pins canoniques SLIDE_SWITCH ; asset raster, chrome neutralisé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 50, 60) })

    const def = getComponentDef('SLIDE_SWITCH')
    const targets = [...container.querySelectorAll('.myblab-pin')]

    expect(def.pins.map((p) => p.id)).toEqual(['throwA', 'common', 'throwB'])
    expect(targets.length).toBe(3)
    expect(def.pins.every((p) => resolveContacts(p).length === 1)).toBe(true)

    expect([...new Set(targets.map((el) => el.getAttribute('data-wire-pin')))].sort()).toEqual(['common', 'throwA', 'throwB'])

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of targets) expect(p.style.opacity).toBe('0')
  })

  it('11 — un clic réel sur le wrapper bascule component.state left -> right -> left (SetComponentStateCommand non régressé)', () => {
    let api
    render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })

    expect(api.components[0].state).toBe('left')

    const root = document.querySelector('.part-slide-switch')
    expect(root).not.toBeNull()

    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('right')

    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('left')
  })

  it('12 — undo/redo restent fonctionnels après le clic sur le rendu raster (mécanisme de commande inchangé)', () => {
    let api
    render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })

    const root = document.querySelector('.part-slide-switch')
    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('right')

    act(() => { api.undo?.() })
    expect(api.components[0].state).toBe('left')

    act(() => { api.redo?.() })
    expect(api.components[0].state).toBe('right')
  })

  it('13 — aucune logique spécifique SLIDE_SWITCH dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "SLIDE_SWITCH"`).not.toMatch(/\btype\s*===?\s*["']SLIDE_SWITCH["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-slide-switch[^)]*\)/)
  })

  it('14 — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('click', () => { got += 1 })
    fireEvent.click(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
