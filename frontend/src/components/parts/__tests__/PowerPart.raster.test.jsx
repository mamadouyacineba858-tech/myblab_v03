/**
 * PowerPart.raster.test.jsx — MB-VIS-COMP-036 + MB-L1-POWER-001.
 *
 * Le backend reste raster et le pipeline central reste inchangé. Le rendu
 * visible emploie désormais une référence WebP haute résolution approuvée,
 * tandis que le manifest historique 1x/3x reste conservé comme catalogue.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { PowerPart } from '../PowerPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import {
  DEFAULT_REGISTRATIONS,
  getComponentByType,
  getComponentPresentation,
} from '../../../visualization/defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../../../visualization/factory.js'
import { getPinPresentationPosition } from '../../../utils/pinPresentationGeometry.js'
import { getPinPosition } from '../../../utils/geometry.js'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(__dirname, '../../../../public/assets/components/power')

describe('MB-VIS-COMP-036 / MB-L1-POWER-001 — POWER raster', () => {
  it('POWER reste enregistré sur le backend raster réel', () => {
    expect(getComponentByType('POWER')).toBe(PowerPart)
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'POWER' && e.component === PowerPart)).toBe(true)
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    expect(manager.render('POWER', {})).not.toBeNull()
    expect(manager.getBackend('POWER')).toBe('raster')
    expect(getComponentPresentation('POWER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('rend uniquement la référence WebP approuvée, sans SVG ni overlay DOM', () => {
    const { container } = render(<PowerPart />)
    const img = container.querySelector('.part-power__img--approved-reference')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('/assets/components/power/power.reference.hires.webp')
    expect(img.getAttribute('width')).toBe('70')
    expect(img.getAttribute('height')).toBe('90')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('.part-power__facade-overlay')).toBeNull()
    expect(container.querySelector('.part-power__facade-label')).toBeNull()
    expect(container.querySelector('[aria-label="Alimentation"]')).not.toBeNull()
  })

  it('conserve le catalogue historique 70×90 / 210×270 dans le manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, 'manifest.json'), 'utf-8'))
    expect(manifest.canonical.width).toBe(70)
    expect(manifest.canonical.height).toBe(90)
    const byScale = Object.fromEntries(
      manifest.variants.map((a) => [`${a.file.includes('.3x.') ? '3x' : '1x'}.${a.format}`, [a.width, a.height]])
    )
    expect(byScale['1x.png']).toEqual([70, 90])
    expect(byScale['1x.webp']).toEqual([70, 90])
    expect(byScale['3x.png']).toEqual([210, 270])
    expect(byScale['3x.webp']).toEqual([210, 270])
  })
})

describe('MB-VIS-COMP-036 — pins de présentation, électrique inchangé', () => {
  const powerDef = getComponentDef('POWER')
  const pinById = Object.fromEntries(powerDef.pins.map((p) => [p.id, p]))
  const component = { type: 'POWER', x: 0, y: 0 }

  it('projette GND=(22,67) et 5V=(35,67)', () => {
    expect(getPinPresentationPosition(component, pinById.GND)).toEqual({ x: 22, y: 67 })
    expect(getPinPresentationPosition(component, pinById['5V'])).toEqual({ x: 35, y: 67 })
  })

  it('préserve les coordonnées électriques canoniques et les rôles', () => {
    expect(getPinPosition(component, pinById['5V'])).toEqual({ x: 70, y: 37 })
    expect(getPinPosition(component, pinById.GND)).toEqual({ x: 58, y: 25 })
    expect(getCanonicalEntry('POWER').pins.map((p) => p.id)).toEqual(['5V', 'GND'])
    expect([powerDef.width, powerDef.height]).toEqual([70, 90])
  })
})

describe('MB-VIS-COMP-036 — pipeline réel', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('rend 2 pins projetés et un backend raster markerless', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POWER', 50, 60) })
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(2)
    const positions = [...pins].map((el) => [Number(el.style.left.replace('px', '')), Number(el.style.top.replace('px', ''))])
    expect(positions).toEqual(expect.arrayContaining([[22, 67], [35, 67]]))
    expect(container.querySelector('.circuit-component__body img')).not.toBeNull()
    expect(container.querySelector('.circuit-component').getAttribute('data-backend')).toBe('raster')
    for (const p of pins) expect(p.style.opacity).toBe('0')
  })

  it("l'image ne capte pas les événements", () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('POWER', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component__body img'))
    expect(got).toBe(1)
  })
})
