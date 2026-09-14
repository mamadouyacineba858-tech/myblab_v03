/**
 * DcMotorPart.raster.test.jsx — MB-VIS-PROTOTYPE-007 + MB-L1-PROP-009.
 *
 * MB-L1-PROP-009 conserve le Core DC_MOTOR et le raster réaliste existant,
 * mais sépare enfin l'arbre mécanique des deux bornes électriques :
 * - coordonnées électriques canoniques inchangées (+ 0,25 / - 84,25) ;
 * - deux PhysicalContacts de présentation distincts sur les cosses arrière ;
 * - overlay asset SVG chargé comme <img>, jamais comme DOM <svg> ;
 * - hit targets / wires rendus aux contacts (3.5,16) et (3.5,34).
 *
 * NOTE outil : la config Vitest secondaire compile ce fichier JSX sans
 * automatic JSX runtime. React doit donc rester importé ici, même si ESLint
 * le considère autrement inutilisé au niveau lexical.
 */
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DcMotorPart } from '../DcMotorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RASTER_RE = /^\/assets\/components\/dc-motor\/dc-motor\.default\.(1x|3x)\.(webp|png)( \dx)?$/
const TERMINAL_ASSET = '/assets/components/dc-motor/dc-motor.terminals.svg'

describe('MB-L1-PROP-009 — DC_MOTOR physical electrical terminals', () => {
  it('rend le raster 84×50 et un overlay dédié aux deux cosses', () => {
    const def = getComponentDef('DC_MOTOR')
    expect([def.width, def.height]).toEqual([84, 50])
    const { container } = render(<DcMotorPart />)

    const motor = container.querySelector('.part-dc-motor__img')
    const terminals = container.querySelector('.part-dc-motor__terminals')
    expect(motor).not.toBeNull()
    expect(terminals).not.toBeNull()
    expect(motor.getAttribute('width')).toBe('84')
    expect(motor.getAttribute('height')).toBe('50')
    expect(terminals.getAttribute('src')).toBe(TERMINAL_ASSET)
    expect(motor.style.clipPath).toBe('inset(0 0 0 15px)')
  })

  it('conserve picture/webp/png pour le corps raster', () => {
    const { container } = render(<DcMotorPart />)
    const motor = container.querySelector('.part-dc-motor__img')
    expect(motor.getAttribute('src')).toMatch(RASTER_RE)
    for (const cand of (motor.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(RASTER_RE)
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
  })

  it('n’introduit aucun SVG DOM ni gestionnaire sur les assets', () => {
    const { container } = render(<DcMotorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelectorAll('[id]').length).toBe(0)
    for (const img of container.querySelectorAll('img')) {
      expect(img.draggable).toBe(false)
      expect(img.style.pointerEvents).toBe('none')
      expect(img.onclick).toBeNull()
      expect(img.onpointerdown).toBeNull()
    }
  })

  it('préserve le Core +/− mais expose deux PhysicalContacts arrière distincts', () => {
    const def = getComponentDef('DC_MOTOR')
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, p]))

    expect([byId.plus.dx, byId.plus.dy]).toEqual([0, 25])
    expect([byId.minus.dx, byId.minus.dy]).toEqual([84, 25])

    expect(byId.plus.contacts).toEqual([
      { id: 'plus', dx: 3.5, dy: 16, wireConnectable: true, breadboardInsertable: false },
    ])
    expect(byId.minus.contacts).toEqual([
      { id: 'minus', dx: 3.5, dy: 34, wireConnectable: true, breadboardInsertable: false },
    ])
    expect(byId.plus.contacts[0]).not.toEqual(byId.minus.contacts[0])
  })

  it('backend reste raster / bareBody / markerless', () => {
    expect(getComponentPresentation('DC_MOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('deux rendus restent déterministes', () => {
    const a = render(<DcMotorPart />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<DcMotorPart />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })
})

describe('MB-L1-PROP-009 — pipeline réel contacts / câblage', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('place les deux hit targets exactement sur les deux cosses physiques', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 50, 60) })

    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(2)
    const positions = pins.map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[3.5, 16], [3.5, 34]]))
    expect(positions).not.toContainEqual([84, 25])

    const contacts = pins.map((el) => el.getAttribute('data-wire-contact')).sort()
    expect(contacts).toEqual(['minus', 'plus'])
  })

  it('deux moteurs produisent 4 contacts physiques, 2 rasters et 2 overlays', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 20, 20) })
    act(() => { api.addComponent('DC_MOTOR', 200, 200) })

    const pins = [...container.querySelectorAll('.myblab-pin')]
    expect(pins.length).toBe(4)
    const rel = pins.map((el) => `${el.style.left}/${el.style.top}`)
    expect(rel.filter((r) => r === '3.5px/16px').length).toBe(2)
    expect(rel.filter((r) => r === '3.5px/34px').length).toBe(2)
    expect(container.querySelectorAll('.part-dc-motor__img').length).toBe(2)
    expect(container.querySelectorAll('.part-dc-motor__terminals').length).toBe(2)
    expect(container.querySelectorAll('.circuit-component__body svg').length).toBe(0)
  })

  it('la couche de rendu centrale reste générique, sans branche DC_MOTOR', () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const rel of ['../../../canvas/CircuitComponent.jsx', '../../../canvas/Pin.jsx', '../PartRenderer.jsx']) {
      const src = strip(readFileSync(resolve(__dirname, rel), 'utf-8'))
      expect(src).not.toMatch(/\btype\s*===?\s*["']DC_MOTOR["']/)
    }
  })

  it('les assets ne capturent pas les événements du wrapper', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('DC_MOTOR', 50, 60) })
    const wrap = container.querySelector('.circuit-component')
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.part-dc-motor__img'))
    expect(got).toBe(1)
  })
})
