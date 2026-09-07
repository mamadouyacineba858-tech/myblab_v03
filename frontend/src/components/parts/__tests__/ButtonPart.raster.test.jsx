/**
 * ButtonPart.raster.test.jsx — MB-VIS-PROTOTYPE-008.
 *
 * Prouve l'intégration raster STATEFUL et INTERACTIVE de BUTTON via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par type,
 * aucune règle CSS spécifique) :
 *  1. BUTTON rend correctement (élément racine `.part-button`, aria-label
 *     "Bouton" fixe) ;
 *  2. le renderer ne produit plus de <svg> (ni <line>/<rect>/<circle>) ;
 *  3. l'asset raster attendu (/assets/components/button/button.<state>.<res>.<ext>)
 *     est utilisé ;
 *  4. variantes 1x/3x cohérentes avec le patron LED/RESISTOR/DIODE
 *     (<picture>/<source webp> + <img> srcset) — les 4 variantes de l'état
 *     référencées ;
 *  5. l'état released/pressed est piloté par la prop `state` existante :
 *     classe `.part-button--pressed` et jeu d'assets basculent ensemble,
 *     sans <svg> ;
 *  6. les gestionnaires onPointerDown/onPointerUp/onPointerCancel/
 *     onLostPointerCapture restent attachés à l'élément racine (LOCK-19/
 *     VIS-TEST-08). `onMouseDown` a été retiré du contrat de props par
 *     MB-VIS-BUTTON-INTERACTION-003 : il interceptait le `mousedown` de
 *     compatibilité destiné à `.circuit-component` (wrapper), empêchant
 *     toute sélection/déplacement de BUTTON en cliquant sur son corps
 *     (cause confirmée par MB-VIS-CONTACT-AUDIT-002) ;
 *  7. l'<img> ne porte aucun gestionnaire, draggable=false,
 *     pointer-events:none (le hit-test reste sur le wrapper) ;
 *  8. le backend résolu pour BUTTON est bien 'raster' (via
 *     getComponentPresentation) ;
 *  9. la géométrie canonique 60×60 reste inchangée ; les pins pin1/pin2 ont
 *     été remesurés par MB-VIS-BUTTON-ASSET-006 sur le nouveau paquet
 *     d'assets Tinkercad-style — pin1(14,30)/pin2(46,30)
 *     (componentDefinitions.js) ;
 *  10. pipeline réel CircuitComponent -> PartRenderer : pins fonctionnels
 *      inchangés, wrapper reçoit les événements, chrome neutralisé.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ButtonPart } from '../ButtonPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getPinPresentationPosition } from '../../../utils/pinPresentationGeometry.js'
import { resolveContacts } from '../../../utils/contactModel.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_RE = /^\/assets\/components\/button\/button\.(released|pressed)\.(1x|3x)\.(webp|png)( \dx)?$/

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe("MB-VIS-PROTOTYPE-008 — BUTTON rend le paquet d'assets raster validé", () => {
  it('1/9 — élément racine .part-button aux dimensions canoniques 60×60, aria-label "Bouton"', () => {
    const def = getComponentDef('BUTTON')
    expect([def.width, def.height]).toEqual([60, 60])
    const { container } = render(<ButtonPart state="released" />)
    const root = container.querySelector('.part-button')
    expect(root).not.toBeNull()
    expect(root.getAttribute('aria-label')).toBe('Bouton')
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })

  it('2 — aucun vestige du renderer SVG (base/capuchon)', () => {
    for (const state of ['released', 'pressed']) {
      const { container, unmount } = render(<ButtonPart state={state} />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('line')).toBeNull()
      expect(container.querySelector('rect')).toBeNull()
      expect(container.querySelector('circle')).toBeNull()
      unmount()
    }
  })

  it('3/4 — released : <picture>/<source webp> + <img> vers /assets/components/button/button.released.* ; les 4 variantes référencées', () => {
    const { container } = render(<ButtonPart state="released" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('button.released.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('button.released.')
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/button\.released\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['released.1x.webp', 'released.3x.webp', 'released.1x.png', 'released.3x.png']) {
      expect(all).toContain(`/assets/components/button/button.${f}`)
    }
  })

  it('3/4 — pressed : <picture>/<source webp> + <img> vers /assets/components/button/button.pressed.* ; les 4 variantes référencées', () => {
    const { container } = render(<ButtonPart state="pressed" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    expect(img.getAttribute('src')).toContain('button.pressed.')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toContain('button.pressed.')
    }
    const source = container.querySelector('picture > source')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/button\.pressed\..*\.webp/)
    }
    const all = container.innerHTML
    for (const f of ['pressed.1x.webp', 'pressed.3x.webp', 'pressed.1x.png', 'pressed.3x.png']) {
      expect(all).toContain(`/assets/components/button/button.${f}`)
    }
  })

  it('5 — état released : pas de classe part-button--pressed, asset released', () => {
    const { container } = render(<ButtonPart state="released" />)
    const root = container.querySelector('.part-button')
    expect(root.getAttribute('class')).not.toMatch(/part-button--pressed/)
    expect(container.querySelector('img').getAttribute('src')).toContain('button.released.')
  })

  it('5 — état pressed : classe part-button--pressed présente, asset pressed', () => {
    const { container } = render(<ButtonPart state="pressed" />)
    const root = container.querySelector('.part-button')
    expect(root.getAttribute('class')).toMatch(/part-button--pressed/)
    expect(container.querySelector('img').getAttribute('src')).toContain('button.pressed.')
  })

  it('6 — les gestionnaires onPointerDown/onPointerUp/onPointerCancel/onLostPointerCapture restent attachés à la racine', () => {
    const calls = []
    const { container } = render(
      <ButtonPart
        state="released"
        onPointerDown={() => calls.push('down')}
        onPointerUp={() => calls.push('up')}
        onPointerCancel={() => calls.push('cancel')}
        onLostPointerCapture={() => calls.push('lost')}
      />
    )
    const root = container.querySelector('.part-button')
    fireEvent.pointerDown(root)
    fireEvent.pointerUp(root)
    fireEvent.pointerCancel(root)
    fireEvent.lostPointerCapture(root)
    expect(calls).toEqual(['down', 'up', 'cancel', 'lost'])
  })

  // MB-VIS-BUTTON-INTERACTION-003 : `onMouseDown` n'est plus un prop du
  // contrat de ButtonPart — un `mousedown` réel sur la racine doit
  // atteindre l'appelant (bulle nativement), jamais être intercepté ici,
  // pour que le wrapper `.circuit-component` (CircuitComponent.jsx) puisse
  // le recevoir et déclencher sélection/drag.
  it("6bis — onMouseDown n'est plus un prop de ButtonPart ; un mousedown natif sur la racine n'est intercepté par aucun handler local", () => {
    const calls = []
    const { container } = render(
      <div onMouseDown={() => calls.push('ancestor-mouse')}>
        <ButtonPart state="released" />
      </div>
    )
    const root = container.querySelector('.part-button')
    fireEvent.mouseDown(root)
    expect(calls).toEqual(['ancestor-mouse'])
  })

  it('7 — l\'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none', () => {
    const { container } = render(<ButtonPart state="released" />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
  })

  it('8 — backend résolu pour BUTTON = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('BUTTON')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  // [MB-VIS-BUTTON-ASSET-006] dx remesurés depuis zéro sur le nouveau
  // paquet d'assets Tinkercad-style (housing carré + 4 pattes physiques) —
  // les anciennes valeurs 8/51 (MB-VIS-CONTACT-FOUNDATION-001) mesuraient
  // un asset visuellement différent et n'ont pas été reconduites. Nouvelle
  // mesure : centre de masse pondéré par alpha sur chaque patte,
  // canvas.getImageData sur button.released.3x.png (voir
  // componentDefinitions.js pour le détail de la méthode).
  it('9 — géométrie canonique inchangée : 60×60, pins pin1(14,30)/pin2(46,30)', () => {
    const def = getComponentDef('BUTTON')
    expect(def.width).toBe(60)
    expect(def.height).toBe(60)
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.pin1).toEqual([14, 30])
    expect(byId.pin2).toEqual([46, 30])
  })

  it('déterminisme — deux rendus produisent un HTML strictement identique (released puis pressed)', () => {
    for (const state of ['released', 'pressed']) {
      const a = render(<ButtonPart state={state} />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<ButtonPart state={state} />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2).toBe(h1)
    }
  })
})

describe('MB-VIS-PROTOTYPE-008 — pipeline réel : pins et interactions BUTTON inchangés', () => {
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

  // [FT-B-001-S2] BUTTON expose désormais 4 CONTACTS PHYSIQUES pour 2 pins
  // ÉLECTRIQUES canoniques (canonicalRegistry INCHANGÉ). Le test vérifie
  // explicitement : 4 hit targets, 2 `data-wire-pin` distincts, 4
  // `data-wire-contact` distincts, la cartographie contact→pin, et la
  // stabilité legacy (contact par défaut = ancienne projection dy:58).
  it('10 — CircuitComponent produit 4 contacts physiques / 2 pins canoniques BUTTON ; asset raster, chrome neutralisé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON', 50, 60) })

    const def = getComponentDef('BUTTON')
    const component = api.components[0]
    const targets = [...container.querySelectorAll('.myblab-pin')]

    // Cardinalité électrique canonique inchangée : 2 pins.
    expect(def.pins.map((p) => p.id)).toEqual(['pin1', 'pin2'])
    // 4 contacts physiques câblables (2 par pin).
    expect(targets.length).toBe(4)
    expect(def.pins.every((p) => resolveContacts(p).length === 2)).toBe(true)

    const distinctPins = new Set(targets.map((el) => el.getAttribute('data-wire-pin')))
    const distinctContacts = new Set(targets.map((el) => el.getAttribute('data-wire-contact')))
    expect([...distinctPins].sort()).toEqual(['pin1', 'pin2'])
    expect([...distinctContacts].sort()).toEqual(['1a', '1b', '2a', '2b'])

    // Cartographie contact -> pin canonique.
    const byPin = {}
    for (const el of targets) {
      const p = el.getAttribute('data-wire-pin')
      ;(byPin[p] ??= []).push(el.getAttribute('data-wire-contact'))
    }
    expect(byPin.pin1.sort()).toEqual(['1a', '1b'])
    expect(byPin.pin2.sort()).toEqual(['2a', '2b'])

    // Positions : chaque contact à component + contact.dx/dy.
    const posOf = (pinId, contactId) => {
      const el = targets.find((t) => t.getAttribute('data-wire-pin') === pinId && t.getAttribute('data-wire-contact') === contactId)
      return [Number(el.style.left.replace('px', '')), Number(el.style.top.replace('px', ''))]
    }
    expect(posOf('pin1', '1a')).toEqual([14, 58]) // patte basse (défaut) = ancienne projection MB-VIS-BUTTON-INTERACTION-008
    expect(posOf('pin1', '1b')).toEqual([14, 2])  // patte haute
    expect(posOf('pin2', '2a')).toEqual([46, 58])
    expect(posOf('pin2', '2b')).toEqual([46, 2])

    // Stabilité legacy : le contact PAR DÉFAUT coïncide avec l'ancienne
    // projection de présentation (aucun `contact` argument).
    for (const p of def.pins) {
      const legacy = getPinPresentationPosition(component, p)
      expect([legacy.x - component.x, legacy.y - component.y]).toEqual([p.dx, 58])
    }

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of targets) expect(p.style.opacity).toBe('0')
  })

  it('11 — pointerdown/pointerup réels sur le wrapper mettent à jour component.state (interaction non régressée)', () => {
    let api
    render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON', 0, 0) })

    const root = document.querySelector('.part-button')
    expect(root).not.toBeNull()

    act(() => { fireEvent.pointerDown(root) })
    expect(api.components[0].state).toBe('pressed')

    act(() => { fireEvent.pointerUp(root) })
    expect(api.components[0].state).toBe('released')
  })

  it('12 — aucune logique spécifique BUTTON dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "BUTTON"`).not.toMatch(/\btype\s*===?\s*["']BUTTON["']/)
    }
    const css = strip(readFileSync(resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-button[^)]*\)/)
    expect(css).not.toMatch(/!important/)
  })

  it('13 — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON', 0, 0) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
