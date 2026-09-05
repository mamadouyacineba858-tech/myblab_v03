/**
 * LatchingButtonPart.raster.test.jsx — MB-VIS-PROTOTYPE-008.
 *
 * Prouve l'intégration raster STATEFUL et INTERACTIVE de BUTTON_LATCHING via
 * le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par
 * type, aucune règle CSS spécifique) :
 *  1. BUTTON_LATCHING rend correctement (élément racine
 *     `.part-latching-button`, aria-label selon state) ;
 *  2. le renderer ne produit plus de <svg> (ni <line>/<rect>) ;
 *  3. l'asset raster attendu
 *     (/assets/components/button-latching/button-latching.<state>.<res>.<ext>)
 *     est utilisé ;
 *  4. variantes 1x/3x cohérentes avec le patron LED/RESISTOR/DIODE
 *     (<picture>/<source webp> + <img> srcset) — les 4 variantes de l'état
 *     référencées ;
 *  5. l'état off/on est piloté par la prop `state` existante : classe
 *     `.is-on`, aria-label et jeu d'assets basculent ensemble, sans <svg> ;
 *  6. le gestionnaire onClick (mécanisme ToggleLatchingButtonCommand /
 *     undo-redo) et onPointerDown restent attachés à l'élément racine
 *     (contrat de props strictement inchangé, LOCK-19/VIS-TEST-08) ;
 *  7. l'<img> ne porte aucun gestionnaire, draggable=false,
 *     pointer-events:none (le hit-test reste sur le wrapper) ;
 *  8. le backend résolu pour BUTTON_LATCHING est bien 'raster' (via
 *     getComponentPresentation) ;
 *  9. la géométrie canonique 60×60, pin1(0,30)/pin2(60,30) reste inchangée
 *     (componentDefinitions.js) ;
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
import { LatchingButtonPart } from '../LatchingButtonPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/button-latching\/button-latching\.(off|on)\.(1x|3x)\.(webp|png)( \dx)?$/

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe("MB-VIS-PROTOTYPE-008 — BUTTON_LATCHING rend le paquet d'assets raster validé", () => {
  it('1/9 — élément racine .part-latching-button aux dimensions canoniques 60×60', () => {
    const def = getComponentDef('BUTTON_LATCHING')
    expect([def.width, def.height]).toEqual([60, 60])
    const { container } = render(<LatchingButtonPart state="off" />)
    const root = container.querySelector('.part-latching-button')
    expect(root).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG (boîtier/levier)', () => {
    for (const state of ['off', 'on']) {
      const { container, unmount } = render(<LatchingButtonPart state={state} />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('line')).toBeNull()
      expect(container.querySelector('rect')).toBeNull()
      unmount()
    }
  })

  it('3/4 — off : <picture>/<source webp> + <img> vers .../button-latching.off.* ; les 4 variantes référencées', () => {
    const { container } = render(<LatchingButtonPart state="off" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('button-latching.off.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('button-latching.off.')
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/button-latching\.off\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['off.1x.webp', 'off.3x.webp', 'off.1x.png', 'off.3x.png']) {
      expect(all).toContain(`/assets/components/button-latching/button-latching.${f}`)
    }
  })

  it('3/4 — on : <picture>/<source webp> + <img> vers .../button-latching.on.* ; les 4 variantes référencées', () => {
    const { container } = render(<LatchingButtonPart state="on" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('button-latching.on.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('button-latching.on.')
    }
    const source = container.querySelector('picture > source')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/button-latching\.on\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['on.1x.webp', 'on.3x.webp', 'on.1x.png', 'on.3x.png']) {
      expect(all).toContain(`/assets/components/button-latching/button-latching.${f}`)
    }
  })

  it('5 — état off : pas de classe is-on, aria-label "Interrupteur désactivé", asset off', () => {
    const { container } = render(<LatchingButtonPart state="off" />)
    const root = container.querySelector('.part-latching-button')
    expect(root.getAttribute('class')).not.toMatch(/is-on/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur désactivé')
    expect(container.querySelector('img').getAttribute('src')).toContain('button-latching.off.')
  })

  it('5 — état on : classe is-on présente, aria-label "Interrupteur activé", asset on', () => {
    const { container } = render(<LatchingButtonPart state="on" />)
    const root = container.querySelector('.part-latching-button')
    expect(root.getAttribute('class')).toMatch(/is-on/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur activé')
    expect(container.querySelector('img').getAttribute('src')).toContain('button-latching.on.')
  })

  it('6 — les gestionnaires onPointerDown/onClick restent attachés à la racine (contrat de props inchangé)', () => {
    let clicked = false
    let pointerDowns = 0
    const { container } = render(
      <LatchingButtonPart
        state="off"
        onPointerDown={() => { pointerDowns += 1 }}
        onClick={() => { clicked = true }}
      />
    )
    const root = container.querySelector('.part-latching-button')
    fireEvent.pointerDown(root)
    fireEvent.click(root)
    expect(pointerDowns).toBe(1)
    expect(clicked).toBe(true)
  })

  it('7 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<LatchingButtonPart state="off" />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
  })

  it('8 — backend résolu pour BUTTON_LATCHING = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('BUTTON_LATCHING')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('9 — géométrie canonique inchangée : 60×60, pins pin1(0,30)/pin2(60,30)', () => {
    const def = getComponentDef('BUTTON_LATCHING')
    expect(def.width).toBe(60)
    expect(def.height).toBe(60)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.pin1).toEqual([0, 30])
    expect(byId.pin2).toEqual([60, 30])
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique (off puis on)', () => {
    for (const state of ['off', 'on']) {
      const a = render(<LatchingButtonPart state={state} />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<LatchingButtonPart state={state} />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2).toBe(h1)
    }
  })
})

describe('MB-VIS-PROTOTYPE-008 — pipeline réel : pins, click et undo/redo BUTTON_LATCHING inchangés', () => {
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

  it('10 — CircuitComponent produit les 2 pins BUTTON_LATCHING à pin1(0,30)/pin2(60,30) ; asset raster dans le wrapper, chrome neutralisé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON_LATCHING', 50, 60) })

    const def = getComponentDef('BUTTON_LATCHING')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 30], [60, 30]]))

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it('11 — un clic réel sur le wrapper bascule component.state off -> on -> off (ToggleLatchingButtonCommand non régressé)', () => {
    let api
    render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON_LATCHING', 0, 0) })

    expect(api.components[0].state).toBe('off')

    const root = document.querySelector('.part-latching-button')
    expect(root).not.toBeNull()

    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('on')

    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('off')
  })

  it('12 — undo/redo restent fonctionnels après le clic sur le rendu raster (mécanisme de commande inchangé)', () => {
    let api
    render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON_LATCHING', 0, 0) })

    const root = document.querySelector('.part-latching-button')
    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('on')

    act(() => { api.undo?.() })
    expect(api.components[0].state).toBe('off')

    act(() => { api.redo?.() })
    expect(api.components[0].state).toBe('on')
  })

  it('13 — aucune logique spécifique BUTTON_LATCHING dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "BUTTON_LATCHING"`).not.toMatch(/\btype\s*===?\s*["']BUTTON_LATCHING["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-latching-button[^)]*\)/)
    expect(css).not.toMatch(/!important/)
  })

  it('14 — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON_LATCHING', 0, 0) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('click', () => { got += 1 })
    fireEvent.click(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
