/**
 * DipSwitchPart.raster.test.jsx — A3-SW2-R1
 *
 * Prouve l'intégration raster STATEFUL et INTERACTIVE de DIP_SWITCH via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (aucun couplage par type,
 * aucune règle CSS spécifique), même patron que SlideSwitchPart.raster.test.jsx
 * (A3-SW1-R1) adapté au contrat multi-canal (channelStates, 4 canaux
 * indépendants, 8 pins) :
 *  T-R1-01/02/03/04/05 : backend raster, WebP + fallback PNG, 1x/3x, aucun
 *    chemin d'asset inexistant ;
 *  T-R1-06/07 : manifest.json / ASSET-INTEGRITY.json cohérents avec les
 *    octets/hash réels des fichiers commités ;
 *  T-R1-08/09/10/11 : les 4 data-channel-id existent, reflètent
 *    individuellement channelStates, la combinaison 1=ON/2=OFF/3=ON/4=OFF
 *    produit 4 états visuels distincts, un clic sur un canal n'affecte pas
 *    les autres ;
 *  T-R1-12/13 : drag (pointerdown + move ≥ seuil) ne bascule aucun canal ;
 *    8 pins toujours rendues ;
 *  T-R1-14 : IDs de pins inchangés (1A..4B) ;
 *  T-R1-15/16 : Undo/Redo et topologie électrique A3-SW2 non régressés ;
 *  T-R1-17/18/19 : BUTTON / BUTTON_LATCHING / SLIDE_SWITCH non régressés ;
 *  T-R1-20 (RÉVISÉ A3-SW3) : DIP_SWITCH est désormais breadboardInsertable
 *    (géométrie corrigée pitch-12, cf. breadboardSwitchFit.test.js) — la
 *    couverture géométrique/enfichage vit dans ce nouveau fichier dédié,
 *    non dupliquée ici.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { DipSwitchPart } from '../DipSwitchPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = path.resolve(__dirname, '../../../../public/assets/components/dip-switch')
const ASSET_RE = /^\/assets\/components\/dip-switch\/dip-switch\.reference\.(1x|3x)\.(webp|png)( \dx)?$/

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

const ALL_OFF = { '1': 'off', '2': 'off', '3': 'off', '4': 'off' }
const MIXED = { '1': 'on', '2': 'off', '3': 'on', '4': 'off' }

describe("A3-SW2-R1 — DIP_SWITCH rend le paquet d'assets raster validé", () => {
  it('T-R1-01/T-R1-04 — élément racine .part-dip-switch aux dimensions canoniques 112×56, <img> référence 1x/3x', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect([def.width, def.height]).toEqual([112, 56])
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const root = container.querySelector('.part-dip-switch')
    expect(root).not.toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    for (const cand of srcsetList(img, 'srcset')) expect(cand).toMatch(ASSET_RE)
  })

  it('T-R1-02 — WebP proposé via <picture>/<source type="image/webp">', () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of srcsetList(source, 'srcset')) {
      expect(cand).toMatch(/dip-switch\.reference\..*\.webp/)
    }
  })

  it('T-R1-03 — fallback PNG présent (src + srcset)', () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(/dip-switch\.reference\.3x\.png$/)
    for (const cand of srcsetList(img, 'srcset')) expect(cand).toMatch(/\.png( \dx)?$/)
  })

  it('T-R1-04 — les 4 variantes (1x/3x × webp/png) sont référencées', () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const all = container.innerHTML
    for (const f of ['reference.1x.webp', 'reference.3x.webp', 'reference.1x.png', 'reference.3x.png']) {
      expect(all).toContain(`/assets/components/dip-switch/dip-switch.${f}`)
    }
  })

  it('T-R1-05 — aucun asset path inexistant : les 4 fichiers référencés existent réellement sur disque', () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const all = container.innerHTML
    const refs = new Set()
    for (const m of all.matchAll(/\/assets\/components\/dip-switch\/([a-zA-Z0-9.\-]+\.(?:png|webp))/g)) refs.add(m[1])
    expect(refs.size).toBeGreaterThan(0)
    for (const file of refs) {
      expect(fs.existsSync(path.join(ASSET_DIR, file)), `${file} doit exister sur disque`).toBe(true)
    }
  })

  it('T-R1-06 — manifest.json cohérent (composant, dimensions canoniques référencées, backend raster)', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.component).toBe('DIP_SWITCH')
    expect(manifest.backend).toBe('raster')
    expect(manifest.formats.sort()).toEqual(['png', 'webp'])
    expect(manifest.scales.sort()).toEqual(['1x', '3x'])
    expect(manifest.visualContract.physicalLeads).toBe(8)
    expect(manifest.visualContract.channels).toBe(4)
  })

  it('T-R1-07 — ASSET-INTEGRITY.json cohérent avec les octets/hash réels des fichiers commités', () => {
    const integrity = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    expect(Array.isArray(integrity)).toBe(true)
    for (const entry of integrity) {
      const full = path.join(ASSET_DIR, entry.file)
      expect(fs.existsSync(full), `${entry.file} doit exister`).toBe(true)
      const buf = fs.readFileSync(full)
      expect(buf.length).toBe(entry.bytes)
      const hash = crypto.createHash('sha256').update(buf).digest('hex')
      expect(hash).toBe(entry.sha256)
    }
  })

  it('T-R1-08 — les 4 data-channel-id existent (1,2,3,4)', () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    for (const ch of ['1', '2', '3', '4']) {
      expect(container.querySelector(`[data-channel-id="${ch}"]`)).not.toBeNull()
    }
  })

  it('T-R1-09 — chaque canal reflète individuellement channelStates (classe is-on/is-off)', () => {
    const { container } = render(<DipSwitchPart channelStates={{ '1': 'on', '2': 'off', '3': 'off', '4': 'off' }} />)
    expect(container.querySelector('[data-channel-id="1"]').className).toMatch(/is-on/)
    expect(container.querySelector('[data-channel-id="2"]').className).toMatch(/is-off/)
    expect(container.querySelector('[data-channel-id="3"]').className).toMatch(/is-off/)
    expect(container.querySelector('[data-channel-id="4"]').className).toMatch(/is-off/)
  })

  it('T-R1-10 — 1=ON,2=OFF,3=ON,4=OFF produit quatre états visuels distincts (classes + position verticale du curseur)', () => {
    const { container } = render(<DipSwitchPart channelStates={MIXED} />)
    const byChannel = Object.fromEntries(['1', '2', '3', '4'].map((ch) => [ch, container.querySelector(`[data-channel-id="${ch}"]`)]))
    expect(byChannel['1'].className).toMatch(/is-on/)
    expect(byChannel['2'].className).toMatch(/is-off/)
    expect(byChannel['3'].className).toMatch(/is-on/)
    expect(byChannel['4'].className).toMatch(/is-off/)

    const thumbTop = (el) => el.querySelector('.part-dip-switch__thumb').style.top
    // ON -> curseur en haut ; OFF -> curseur en bas : positions distinctes.
    expect(thumbTop(byChannel['1'])).not.toBe(thumbTop(byChannel['2']))
    expect(thumbTop(byChannel['3'])).not.toBe(thumbTop(byChannel['4']))
    expect(thumbTop(byChannel['1'])).toBe(thumbTop(byChannel['3']))
    expect(thumbTop(byChannel['2'])).toBe(thumbTop(byChannel['4']))
  })

  it('T-R1-11 — au niveau du renderer, changer channelStates du canal 2 seul ne modifie ni la géométrie ni les classes des canaux 1/3/4', () => {
    const a = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const before = { 1: a.container.querySelector('[data-channel-id="1"]').className, 3: a.container.querySelector('[data-channel-id="3"]').className, 4: a.container.querySelector('[data-channel-id="4"]').className }
    a.unmount()
    const b = render(<DipSwitchPart channelStates={{ ...ALL_OFF, '2': 'on' }} />)
    expect(b.container.querySelector('[data-channel-id="1"]').className).toBe(before[1])
    expect(b.container.querySelector('[data-channel-id="3"]').className).toBe(before[3])
    expect(b.container.querySelector('[data-channel-id="4"]').className).toBe(before[4])
    expect(b.container.querySelector('[data-channel-id="2"]').className).toMatch(/is-on/)
  })

  it("l'<img> ne porte aucun gestionnaire, draggable=false, pointer-events:none", () => {
    const { container } = render(<DipSwitchPart channelStates={ALL_OFF} />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
  })

  it('backend résolu pour DIP_SWITCH = raster ; bareBody + markerless dérivés', () => {
    expect(getComponentPresentation('DIP_SWITCH')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('géométrie canonique inchangée : 112×56, 8 pins 1A..4B (T-R1-14)', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect(def.width).toBe(112)
    expect(def.height).toBe(56)
    expect(def.pins.map((p) => p.id)).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'])
    for (const p of def.pins) {
      expect(p.wireConnectable).toBe(true)
    }
  })

  it('T-R1-20 (RÉVISÉ A3-SW3) — DIP_SWITCH est désormais breadboardInsertable:true (géométrie pitch-12 prouvée, cf. breadboardSwitchFit.test.js)', () => {
    const def = getComponentDef('DIP_SWITCH')
    for (const p of def.pins) expect(p.breadboardInsertable).toBe(true)
  })

  it('déterminisme — deux rendus du même state produisent un HTML strictement identique', () => {
    for (const states of [ALL_OFF, MIXED]) {
      const a = render(<DipSwitchPart channelStates={states} />)
      const h1 = a.container.innerHTML
      a.unmount()
      const b = render(<DipSwitchPart channelStates={states} />)
      const h2 = b.container.innerHTML
      b.unmount()
      expect(h2).toBe(h1)
    }
  })
})

describe('A3-SW2-R1 — pipeline réel : pins, click, drag, undo/redo DIP_SWITCH inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('T-R1-12/T-R1-13 — CircuitComponent produit 8 pins fonctionnelles, asset raster, chrome neutralisé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIP_SWITCH', 50, 60) })

    const def = getComponentDef('DIP_SWITCH')
    const targets = [...container.querySelectorAll('.myblab-pin')]
    expect(def.pins.map((p) => p.id)).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'])
    expect(targets.length).toBe(8)
    expect([...new Set(targets.map((el) => el.getAttribute('data-wire-pin')))].sort()).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'])

    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component__body svg')).toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    expect(container.querySelector('.circuit-component__body').hasAttribute('data-bare-body')).toBe(true)
    for (const p of targets) expect(p.style.opacity).toBe('0')
  })

  it('T-R1-11bis — un clic réel sur le canal 2 ne bascule que la voie 2 (pipeline complet)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIP_SWITCH', 0, 0) })

    act(() => { fireEvent.click(container.querySelector('[data-channel-id="2"]')) })
    expect(api.components[0].channelStates).toEqual({ '1': 'off', '2': 'on', '3': 'off', '4': 'off' })
  })

  it("T-R1-12 — un pointerdown suivi d'un mouvement au-delà du seuil (>= 4px) n'entraîne aucun toggle involontaire (drag ne toggle aucun canal)", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIP_SWITCH', 0, 0) })

    const root = container.querySelector('.part-dip-switch')
    const target = container.querySelector('[data-channel-id="2"]')

    act(() => {
      fireEvent.pointerDown(root, { clientX: 10, clientY: 10 })
      fireEvent.pointerMove(root, { clientX: 40, clientY: 10 })
      fireEvent.click(target, { clientX: 40, clientY: 10 })
    })

    expect(api.components[0].channelStates).toEqual({ '1': 'off', '2': 'off', '3': 'off', '4': 'off' })
  })

  it('T-R1-15 — undo/redo restent fonctionnels après le clic sur le rendu raster', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIP_SWITCH', 0, 0) })

    act(() => { fireEvent.click(container.querySelector('[data-channel-id="1"]')) })
    expect(api.components[0].channelStates['1']).toBe('on')

    act(() => { api.undo?.() })
    expect(api.components[0].channelStates['1']).toBe('off')

    act(() => { api.redo?.() })
    expect(api.components[0].channelStates['1']).toBe('on')
  })

  it('T-R1-16 — aucune logique spécifique DIP_SWITCH dans la couche de rendu centrale', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(fs.readFileSync(path.resolve(__dirname, rel), 'utf-8'))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "DIP_SWITCH"`).not.toMatch(/\btype\s*===?\s*["']DIP_SWITCH["']/)
    }
    const css = strip(fs.readFileSync(path.resolve(__dirname, '../../../canvas/CircuitComponent.css'), 'utf-8'))
    expect(css).not.toMatch(/:has\([^)]*\.part-dip-switch[^)]*\)/)
  })

  it('T-R1-17 — BUTTON non régressé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON', 0, 0) })
    const root = container.querySelector('.part-button')
    act(() => { fireEvent.pointerDown(root) })
    expect(api.components[0].state).toBe('pressed')
    act(() => { fireEvent.pointerUp(root) })
    expect(api.components[0].state).toBe('released')
  })

  it('T-R1-18 — BUTTON_LATCHING non régressé', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('BUTTON_LATCHING', 0, 0) })
    expect(api.components[0].state).toBe('off')
    const root = container.querySelector('.part-latching-button')
    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('on')
  })

  it('T-R1-19 — SLIDE_SWITCH non régressé fonctionnellement', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })
    expect(api.components[0].state).toBe('left')
    const root = container.querySelector('.part-slide-switch')
    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('right')
  })

  it('le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DIP_SWITCH', 0, 0) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('click', () => { got += 1 })
    fireEvent.click(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
