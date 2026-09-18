import React from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'
import { createHash } from 'node:crypto'
import { PnpTransistorPart } from '../PnpTransistorPart.jsx'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { getSimulationModel } from '../../../simulator/simulationRegistry.js'
import { getDcContribution } from '../../../simulator/dcContributionRegistry.js'
import { Signal } from '../../../simulator/signals.js'
import { createComponent, getComponentDef, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { getComponentByType, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { resolveContacts } from '../../../utils/contactModel.js'
import { getPinPresentationPosition } from '../../../utils/pinPresentationGeometry.js'
import { BREADBOARD_PITCH } from '../../../utils/breadboardGeometry.js'
import { normalizeComponent } from '../../../utils/circuitModel.js'
import { ReactDocumentMapper } from '../../../bridge/ReactDocumentMapper.js'
const dir = dirname(fileURLToPath(import.meta.url))
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { ComponentInspector } from '../../ComponentInspector.jsx'
const asset = (name) => resolve(dir, '../../../../public/assets/components/pnp-transistor', name)
const manifest = JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const def = getComponentDef('PNP_TRANSISTOR')
describe('A8-PNP electrical contract', () => {
  it('declares pins, schema, defaults, capabilities and executable model', () => {
    const entry = getCanonicalEntry('PNP_TRANSISTOR')
    expect(entry.pins).toEqual([{ id: 'collector', role: 'input' }, { id: 'base', role: 'input' }, { id: 'emitter', role: 'output' }])
    expect(entry.parameterSchema.map((p) => p.key)).toEqual(['onResistance'])
    expect(entry.parameterSchema[0].description).toMatch(/BASE LOW/)
    expect(entry.defaultParameters).toEqual({ onResistance: 1 })
    expect(entry.capabilities).toEqual(['digital', 'dc'])
    expect(entry.modelAvailable).toBe(true)
    expect(getSimulationModel('PNP_TRANSISTOR').validate(entry.defaultParameters)).toBe(true)
  })
  for (const [collector, emitter] of [[Signal.HIGH, Signal.LOW], [Signal.LOW, Signal.HIGH]]) {
    it.each(Object.values(Signal))(`C/E ${collector}/${emitter}, BASE %s`, (base) => {
      const ctx = { pins: Object.freeze({ collector, emitter, base }), params: Object.freeze({ onResistance: 20 }), supplyVoltage: 12 }
      expect(getDcContribution('PNP_TRANSISTOR')(ctx)).toEqual({ voltage: 12, current: base === Signal.LOW ? 0.6 : 0 })
      expect(getDcContribution('NPN_TRANSISTOR')(ctx)).toEqual({ voltage: 12, current: base === Signal.HIGH ? 0.6 : 0 })
    })
  }
  it.each([[Signal.HIGH, Signal.HIGH], [Signal.LOW, Signal.LOW], [Signal.UNKNOWN, Signal.LOW], [Signal.HIGH, Signal.FLOATING]])('incomplete C/E %s/%s returns null', (collector, emitter) => {
    expect(getDcContribution('PNP_TRANSISTOR')({ pins: { collector, emitter, base: Signal.LOW }, params: { onResistance: 1 }, supplyVoltage: 5 })).toBeNull()
  })
  it('keeps PNP absent from generic engines', () => {
    for (const file of ['resolution.js', 'engine.js', 'electricalAnalysis.js', 'scheduler.js', 'simulationRuntimeIntegration.js']) expect(readFileSync(resolve(dir, `../../../simulator/${file}`), 'utf8')).not.toMatch(/PNP_TRANSISTOR/)
  })
})
describe('A8-PNP frozen raster', () => {
  it('registers renderer, raster presentation and palette', () => {
    expect(getComponentByType('PNP_TRANSISTOR')).toBe(PnpTransistorPart)
    expect(getComponentPresentation('PNP_TRANSISTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(PALETTE_ITEMS.find((p) => p.id === 'PNP_TRANSISTOR').label).toBe('Transistor PNP')
  })
  it('uses WebP picture, PNG fallback and both density srcsets without SVG, distortion or data URLs', () => {
    const { container } = render(<PnpTransistorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('picture source').getAttribute('srcset')).toBe('/assets/components/pnp-transistor/pnp-transistor.default.1x.webp 1x, /assets/components/pnp-transistor/pnp-transistor.default.3x.webp 3x')
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('/assets/components/pnp-transistor/pnp-transistor.default.1x.png')
    expect(img.getAttribute('srcset')).toMatch(/1x\.png 1x, .*3x\.png 3x$/)
    expect(container.innerHTML).not.toMatch(/data:|base64/)
    expect(img.style.objectFit).toBe('contain')
    expect(def.width / manifest.canonical.width).toBe(1)
    expect(def.height / manifest.canonical.height).toBe(1)
  })
  it('matches every frozen hash, byte length and PNG dimension', () => {
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    for (const expected of integrity.files) {
      const name = expected.file
      const bytes = readFileSync(asset(name)); expect(bytes.length, name).toBe(expected.bytes)
      expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(expected.sha256)
    }
    expect(manifest.assets).toHaveLength(4)
    for (const entry of manifest.assets.filter((e) => e.file.endsWith('.png'))) {
      const png = readFileSync(asset(entry.file))
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([entry.width, entry.height])
      expect(entry.width).toBe(manifest.canonical.width * entry.scale)
      expect(entry.height).toBe(manifest.canonical.height * entry.scale)
    }
    expect(createHash('sha256').update(readFileSync(asset('REFERENCE.png'))).digest('hex'))
      .toBe('1ff4e4fe2db68537ce6f526c5dd86646e353aa4dd0f88072dc38d790f784d1d7')
  })
})
describe('A8-PNP physical contacts and persistence', () => {
  it('joins three pins to three connectable and insertable contacts at exact pitch', () => {
    expect(def.pins.map((p) => p.id)).toEqual(['collector', 'base', 'emitter'])
    const contacts = def.pins.flatMap(resolveContacts); expect(contacts).toHaveLength(3)
    contacts.forEach((c) => expect(c).toMatchObject({ wireConnectable: true, breadboardInsertable: true, dy: 62 }))
    expect(contacts[1].dx - contacts[0].dx).toBeCloseTo(BREADBOARD_PITCH)
    expect(contacts[2].dx - contacts[1].dx).toBeCloseTo(BREADBOARD_PITCH)
  })
  it('bridges probed roots to actual breadboard holes and pin targets, clipping baked leads', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const component = { uid: 'pnp', type: 'PNP_TRANSISTOR', x: 36 - 54, y: 60 - 62 }
    const geometry = resolveAssemblyGeometry(component, bb); expect(geometry.inserted).toBe(true)
    expect(geometry.contacts).toHaveLength(3)
    const roots = [[59, 25], [66, 25], [72.5, 25]]
    geometry.contacts.forEach((contact, index) => {
      expect(contact.pinId).toBe(def.pins[index].id)
      expect(contact.root.x).toBeCloseTo(component.x + roots[index][0])
      expect(contact.root.y).toBeCloseTo(component.y + roots[index][1])
      expect(contact.target.x).toBeCloseTo(36 + index * 12); expect(contact.target.y).toBeCloseTo(60)
      expect(contact.target).toEqual(getPinPresentationPosition(component, def.pins[index]))
      expect(contact.holePosition.x).toBeCloseTo(contact.target.x)
      expect(contact.holePosition.y).toBeCloseTo(contact.target.y)
    })
    const { container } = render(<AssemblyLeadsLayer geometry={geometry} originX={component.x} originY={component.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(3)
    expect(def.height - getAssemblyProfile('PNP_TRANSISTOR').bodyClip.bottom).toBeCloseTo(25)
  })
  it('round-trips edited resistance and properties through Core and JSON', () => {
    const component = { ...createComponent('PNP_TRANSISTOR', 10, 20), parameters: { onResistance: 47 }, properties: { label: 'Q1' } }
    const core = ReactDocumentMapper.toCore({ components: [component], wires: [], breadboards: [] })
    const restored = ReactDocumentMapper.toReact(JSON.parse(JSON.stringify(core)))
    const result = normalizeComponent(restored.components[0])
    expect(result).toMatchObject({ type: 'PNP_TRANSISTOR', parameters: { onResistance: 47 }, properties: { label: 'Q1' } })
    expect(result.pins.map((p) => p.id)).toEqual(['collector', 'base', 'emitter'])
  })
})

let circuitApi
function InspectorProbe() { const api = useCircuit(); React.useEffect(() => { circuitApi = api }, [api]); return <ComponentInspector /> }
it('PNP uses generic creation, Inspector resistance editing, export and import', () => {
  render(<CircuitProvider><InspectorProbe /></CircuitProvider>)
  act(() => circuitApi.addComponent('PNP_TRANSISTOR', 20, 40))
  const uid = circuitApi.exportCircuit().components[0].uid
  expect(circuitApi.exportCircuit().components[0].parameters).toEqual({ onResistance: 1 })
  act(() => circuitApi.selectOnly({ type: 'component', id: uid }))
  expect(screen.getByText('Transistor PNP')).toBeTruthy()
  const input = screen.getByDisplayValue('1')
  fireEvent.change(input, { target: { value: '47' } })
  fireEvent.blur(input)
  expect(circuitApi.exportCircuit().components[0].parameters).toEqual({ onResistance: 47 })
  const saved = JSON.parse(JSON.stringify(circuitApi.exportCircuit()))
  act(() => circuitApi.importCircuit(saved))
  expect(circuitApi.exportCircuit().components[0]).toMatchObject({ type: 'PNP_TRANSISTOR', parameters: { onResistance: 47 } })
})
