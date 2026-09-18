import React from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'
import { createHash } from 'node:crypto'
import { NmosPart } from '../NmosPart.jsx'
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
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { BREADBOARD_PITCH } from '../../../utils/breadboardGeometry.js'
import { normalizeComponent } from '../../../utils/circuitModel.js'
import { ReactDocumentMapper } from '../../../bridge/ReactDocumentMapper.js'
const dir = dirname(fileURLToPath(import.meta.url))
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'
import { ComponentInspector } from '../../ComponentInspector.jsx'
const asset = (name) => resolve(dir, '../../../../public/assets/components/nmos', name)
const manifest = JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const def = getComponentDef('NMOS')
describe('A8-NMOS electrical contract', () => {
  it('declares pins, schema, defaults, capabilities and executable model', () => {
    const entry = getCanonicalEntry('NMOS')
    expect(entry.pins).toEqual([{ id: 'drain', role: 'input' }, { id: 'gate', role: 'input' }, { id: 'source', role: 'output' }])
    expect(entry.parameterSchema.map((p) => p.key)).toEqual(['onResistance'])
    expect(entry.parameterSchema[0]).toMatchObject({ minimum: 0.001, maximum: 1e6, defaultValue: 1, parameterType: 'resistance', unit: 'Ω' })
    expect(entry.parameterSchema[0].description).toMatch(/GATE HIGH/)
    expect(entry.defaultParameters).toEqual({ onResistance: 1 })
    expect(entry.capabilities).toEqual(['digital', 'dc'])
    expect(entry.modelAvailable).toBe(true)
    expect(getSimulationModel('NMOS').validate(entry.defaultParameters)).toBe(true)
  })
  for (const [drain, source] of [[Signal.HIGH, Signal.LOW], [Signal.LOW, Signal.HIGH]]) {
    it.each(Object.values(Signal))(`D/S ${drain}/${source}, GATE %s`, (gate) => {
      const pins = Object.freeze({ drain, source, gate })
      const params = Object.freeze({ onResistance: 20 })
      expect(getDcContribution('NMOS')({ pins, params, supplyVoltage: 12 })).toEqual({ voltage: 12, current: gate === Signal.HIGH ? 0.6 : 0 })
      const transistorPins = Object.freeze({ collector: drain, emitter: source, base: gate })
      expect(getDcContribution('NPN_TRANSISTOR')({ pins: transistorPins, params, supplyVoltage: 12 })).toEqual({ voltage: 12, current: gate === Signal.HIGH ? 0.6 : 0 })
      expect(getDcContribution('PNP_TRANSISTOR')({ pins: transistorPins, params, supplyVoltage: 12 })).toEqual({ voltage: 12, current: gate === Signal.LOW ? 0.6 : 0 })
      expect(pins).toEqual({ drain, source, gate })
    })
  }
  it.each([[Signal.HIGH, Signal.HIGH], [Signal.LOW, Signal.LOW], [Signal.UNKNOWN, Signal.LOW], [Signal.HIGH, Signal.FLOATING]])('incomplete D/S %s/%s returns null', (drain, source) => {
    expect(getDcContribution('NMOS')({ pins: { drain, source, gate: Signal.HIGH }, params: { onResistance: 1 }, supplyVoltage: 5 })).toBeNull()
  })
  it('keeps NMOS absent from generic engines', () => {
    for (const file of ['resolution.js', 'engine.js', 'electricalAnalysis.js', 'scheduler.js', 'simulationRuntimeIntegration.js']) expect(readFileSync(resolve(dir, `../../../simulator/${file}`), 'utf8')).not.toMatch(/NMOS/)
  })
})
describe('A8-NMOS frozen raster', () => {
  it('registers renderer, raster presentation and palette', () => {
    expect(getComponentByType('NMOS')).toBe(NmosPart)
    expect(getComponentPresentation('NMOS')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(PALETTE_ITEMS.find((p) => p.id === 'NMOS').label).toBe('MOSFET canal N')
  })
  it('uses WebP picture, PNG fallback and both density srcsets without SVG, distortion or data URLs', () => {
    const { container } = render(<NmosPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(readFileSync(resolve(dir, '../NmosPart.jsx'), 'utf8')).toMatch(/<img\s/)
    expect(container.querySelector('picture source').getAttribute('srcset')).toBe('/assets/components/nmos/nmos.default.1x.webp 1x, /assets/components/nmos/nmos.default.3x.webp 3x')
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('/assets/components/nmos/nmos.default.1x.png')
    expect(img.getAttribute('srcset')).toMatch(/1x\.png 1x, .*3x\.png 3x$/)
    expect(container.innerHTML).not.toMatch(/data:|base64/)
    expect(img.getAttribute('width')).toBe('144'); expect(img.getAttribute('height')).toBe('288')
    expect(img.getAttribute('draggable')).toBe('false'); expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('aria-hidden')).toBe('true'); expect(img.style.pointerEvents).toBe('none')
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
    expect(manifest.complexity).toBe('complex'); expect(manifest.states).toEqual(['default'])
    manifest.assets.forEach((entry) => expect(entry.bytes).toBeLessThanOrEqual(179200))
    for (const entry of manifest.assets.filter((e) => e.file.endsWith('.png'))) {
      const png = readFileSync(asset(entry.file))
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([entry.width, entry.height])
      expect(entry.width).toBe(manifest.canonical.width * entry.scale)
      expect(entry.height).toBe(manifest.canonical.height * entry.scale)
    }
    expect(createHash('sha256').update(readFileSync(asset('REFERENCE.png'))).digest('hex'))
      .toBe('6d6311bcd8c1faa3c8c0f30239a1c79dd65b73b824b42c552503e4cba6b3dc04')
  })
})
describe('A8-NMOS physical contacts and persistence', () => {
  it('joins three pins to three connectable and insertable contacts at exact pitch', () => {
    expect(def.pins.map((p) => p.id)).toEqual(['drain', 'gate', 'source'])
    const contacts = def.pins.flatMap(resolveContacts); expect(contacts).toHaveLength(3)
    contacts.forEach((c) => expect(c).toMatchObject({ wireConnectable: true, breadboardInsertable: true, dy: 204 }))
    contacts.sort((a, b) => a.dx - b.dx)
    expect(contacts.map((c) => c.dx)).toEqual([64, 76, 88])
    expect(contacts[1].dx - contacts[0].dx).toBeCloseTo(BREADBOARD_PITCH)
    expect(contacts[2].dx - contacts[1].dx).toBeCloseTo(BREADBOARD_PITCH)
  })
  it('bridges probed roots to actual breadboard holes and pin targets, clipping baked leads', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const component = { uid: 'nmos', type: 'NMOS', x: 36 - 64, y: 60 - 204 }
    const placement = computeBreadboardPlacement(bb, 'NMOS', { x: component.x + 1, y: component.y + 1 }, [])
    expect(placement).toMatchObject({ compatible: true, valid: true, breadboardActive: true })
    expect(new Set(placement.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(3)
    const geometry = resolveAssemblyGeometry(component, bb); expect(geometry.inserted).toBe(true)
    expect(geometry.contacts).toHaveLength(3)
    const roots = [[75.5, 170], [45, 170], [107, 170]]
    const targetXs = [48, 36, 60]
    geometry.contacts.forEach((contact, index) => {
      expect(contact.pinId).toBe(def.pins[index].id)
      expect(contact.root.x).toBeCloseTo(component.x + roots[index][0])
      expect(contact.root.y).toBeCloseTo(component.y + roots[index][1])
      expect(contact.target.x).toBeCloseTo(targetXs[index]); expect(contact.target.y).toBeCloseTo(60)
      expect(contact.target).toEqual(getPinPresentationPosition(component, def.pins[index]))
      expect(contact.holePosition.x).toBeCloseTo(contact.target.x)
      expect(contact.holePosition.y).toBeCloseTo(contact.target.y)
    })
    const { container } = render(<AssemblyLeadsLayer geometry={geometry} originX={component.x} originY={component.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(3)
    expect(def.height - getAssemblyProfile('NMOS').bodyClip.bottom).toBeCloseTo(170)
  })
  it('round-trips edited resistance and properties through Core and JSON', () => {
    const component = { ...createComponent('NMOS', 10, 20), parameters: { onResistance: 47 }, properties: { label: 'Q1' } }
    const core = ReactDocumentMapper.toCore({ components: [component], wires: [], breadboards: [] })
    const restored = ReactDocumentMapper.toReact(JSON.parse(JSON.stringify(core)))
    const result = normalizeComponent(restored.components[0])
    expect(result).toMatchObject({ type: 'NMOS', parameters: { onResistance: 47 }, properties: { label: 'Q1' } })
    expect(result.pins.map((p) => p.id)).toEqual(['drain', 'gate', 'source'])
  })
})

let circuitApi
function InspectorProbe() { const api = useCircuit(); React.useEffect(() => { circuitApi = api }, [api]); return <ComponentInspector /> }
it('PNP uses generic creation, Inspector resistance editing, export and import', () => {
  render(<CircuitProvider><InspectorProbe /></CircuitProvider>)
  act(() => circuitApi.addComponent('NMOS', 20, 40))
  const uid = circuitApi.exportCircuit().components[0].uid
  expect(circuitApi.exportCircuit().components[0].parameters).toEqual({ onResistance: 1 })
  act(() => circuitApi.selectOnly({ type: 'component', id: uid }))
  expect(screen.getByText('MOSFET canal N')).toBeTruthy()
  const input = screen.getByDisplayValue('1')
  fireEvent.change(input, { target: { value: '47' } })
  fireEvent.blur(input)
  expect(circuitApi.exportCircuit().components[0].parameters).toEqual({ onResistance: 47 })
  const saved = JSON.parse(JSON.stringify(circuitApi.exportCircuit()))
  act(() => circuitApi.importCircuit(saved))
  expect(circuitApi.exportCircuit().components[0]).toMatchObject({ type: 'NMOS', parameters: { onResistance: 47 } })
})

it('clips the runtime at y170 through the existing CircuitComponent body convention', () => {
  const component = createComponent('NMOS', 20, 40)
  const { container } = render(<CircuitProvider><CircuitComponent component={component} /></CircuitProvider>)
  expect(container.querySelector('.circuit-component__body').style.clipPath).toBe('inset(0 0 118px 0)')
  expect(def.height - 118).toBe(170)
})
