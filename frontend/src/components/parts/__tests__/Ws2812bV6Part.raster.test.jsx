import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ws2812bV6Part } from '../Ws2812bV6Part.jsx'
import { PartRenderer } from '../PartRenderer.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { hasVisualStateResolver } from '../../../visualization/visualStateRegistry.js'
import '../../../visualization/defaultVisualStateRegistrations.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { isSimulationModelAvailable, getSimulationModel } from '../../../simulator/simulationRegistry.js'
import { hasTimedDigitalContribution } from '../../../simulator/timedDigitalContributionRegistry.js'
import { hasDcContribution } from '../../../simulator/dcContributionRegistry.js'
import { hasDigitalEventContribution } from '../../../simulator/digitalEventContributionRegistry.js'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { createSimulationRuntimeSession, runSimulationWithRuntime, SIMULATION_STEP_MS } from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

/**
 * A12-NEOPIXEL-CANVAS-VISUAL-GATE-001 — WORLDSEMI WS2812B-V6 exposé VISUAL-ONLY pour le Founder Canvas
 * Visual Gate : registre, palette, renderer raster FROZEN, 4 PhysicalContacts FROZEN, AUCUNE simulation.
 */

const TYPE = 'WS2812B_V6'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/ws2812b-v6')
const asset = name => resolve(ASSET_DIR, name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')

// CSA FROZEN : broche physique -> [pin, role canonique, x, y] dans l'espace electrique 72x72.
const CONTACTS = [[1, 'VDD', 'power', 0, 18], [2, 'DOUT', 'output', 0, 54], [3, 'VSS', 'ground', 72, 54], [4, 'DIN', 'input', 72, 18]]
const RUNTIME = {
  'ws2812b-v6.default.1x.png': ['c2944c523f4951e282dcac61cfaaefa416b8a607c043b564459ec1de2ee75068', 72],
  'ws2812b-v6.default.1x.webp': ['da232f2816d83c35eb0dd4be0ec7782aae8e812ff5426f045fc4d731f95f9a65', 72],
  'ws2812b-v6.default.3x.png': ['992b2d05f2aae6e63f2d1b46e21c3513bc2b82e17eb02c7fdea0bf9ad791246a', 216],
  'ws2812b-v6.default.3x.webp': ['e7eb49ae861f72dfcfce795a0eb583c5e114c03fca1a81d7325e2ebf0aa2be55', 216],
}

function size(raw) {
  if (raw.toString('ascii', 12, 16) === 'IHDR') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const v = raw.readUInt32LE(21) // VP8L (WebP lossless)
  return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]
}

describe('A12-NEOPIXEL — registry, palette and definition', () => {
  const def = getComponentDef(TYPE)

  it('canonical entry: 4 electrical pins in physical order 1..4, no simulation model', () => {
    const entry = getCanonicalEntry(TYPE)
    expect(entry.pins.map(p => [p.id, p.role])).toEqual(CONTACTS.map(([, id, role]) => [id, role]))
    expect(entry.modelAvailable).toBe(false)
    expect(entry.parameterSchema).toBeNull()
    expect(entry.defaultParameters).toBeNull()
    expect(entry.capabilities).toBeNull()
  })

  it('canonical box 72x72, label, manufacturer, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([72, 72])
    expect(def.label).toBe('NeoPixel — WS2812B-V6')
    expect(def.manufacturer).toBe('WORLDSEMI')
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE).map(r => r.box)).toEqual([[72, 72]])
  })

  it('palette drop creates a plain component (no state, no channel state)', () => {
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component).not.toHaveProperty('state')
    expect(component).not.toHaveProperty('channelStates')
    expect(component.pins.map(p => p.id)).toEqual(['VDD', 'DOUT', 'VSS', 'DIN'])
  })
})

describe('A12-NEOPIXEL — PhysicalContacts FROZEN', () => {
  const def = getComponentDef(TYPE)

  it('exactly one PhysicalContact per pin at the CSA FROZEN coordinates, wire-only', () => {
    expect(def.pins).toHaveLength(4)
    for (const [, id, , x, y] of CONTACTS) {
      const pin = def.pins.find(p => p.id === id)
      expect([pin.dx, pin.dy]).toEqual([x, y])
      const contacts = resolveContacts(pin)
      expect(contacts).toHaveLength(1)
      expect(contacts[0]).toMatchObject({ id, dx: x, dy: y, wireConnectable: true, breadboardInsertable: false })
      expect(resolveWireConnectableContacts(pin)).toHaveLength(1)
      expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
    }
  })

  it('catalogue contacts == frozen manifest.json == CONTACT-VALIDATION.json (72x72, pixelProbed false)', () => {
    const manifest = json('manifest.json')
    const validation = json('CONTACT-VALIDATION.json')
    const expected = CONTACTS.map(([pin, id, , x, y]) => [pin, id, x, y])
    expect(manifest.physicalContacts.map(c => [Number(c.pin), c.name, c.dx, c.dy])).toEqual(expected)
    expect(validation.contacts.map(c => [c.pin, c.name, c.x, c.y])).toEqual(expected)
    expect(def.pins.map(p => [p.id, p.dx, p.dy])).toEqual(expected.map(([, id, x, y]) => [id, x, y]))
    expect(manifest.runtimeCanvasPx).toEqual({ width: 72, height: 72 })
    expect(validation.coordinateSpace).toEqual({ width: 72, height: 72 })
    expect(validation.pixelProbed).toBe(false)
    expect(manifest.geometryBasis.pixelProbed).toBe(false)
  })
})

describe('A12-NEOPIXEL — frozen raster renderer', () => {
  it('runtime files are the CSA FROZEN derivatives (sha256 + dimensions 72 / 216)', () => {
    for (const [file, [sha, side]] of Object.entries(RUNTIME)) {
      expect(existsSync(asset(file)), file).toBe(true)
      const raw = readFileSync(asset(file))
      expect(hash(raw), file).toBe(sha)
      expect(size(raw), file).toEqual([side, side])
    }
  })

  it('renders <picture> WebP 1x/3x with PNG 1x/3x fallback at 72x72, no emitted colour or glow', () => {
    const { container } = render(<Ws2812bV6Part />)
    const root = container.querySelector('.part-ws2812b-v6')
    expect(root.style.width).toBe('72px')
    expect(root.style.height).toBe('72px')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    expect(source.getAttribute('srcset')).toBe('/assets/components/ws2812b-v6/ws2812b-v6.default.1x.webp 1x, /assets/components/ws2812b-v6/ws2812b-v6.default.3x.webp 3x')
    const img = container.querySelector('picture > img')
    expect(img.getAttribute('src')).toBe('/assets/components/ws2812b-v6/ws2812b-v6.default.1x.png')
    expect(img.getAttribute('srcset')).toBe('/assets/components/ws2812b-v6/ws2812b-v6.default.1x.png 1x, /assets/components/ws2812b-v6/ws2812b-v6.default.3x.png 3x')
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['72', '72'])
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.innerHTML).not.toMatch(/drop-shadow|box-shadow|filter/)
  })

  it('registered once as raster renderer and rendered through the generic PartRenderer', () => {
    const regs = DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)
    expect(regs).toHaveLength(1)
    expect(regs[0].component).toBe(Ws2812bV6Part)
    expect(getComponentPresentation(TYPE).backend).toBe('raster')
    const { container } = render(<PartRenderer type={TYPE} uid="px" pinSignals={new Map()} />)
    expect(container.querySelector('.part-ws2812b-v6 picture > img')).not.toBeNull()
  })
})

describe('A12-NEOPIXEL — FROZEN asset pack untouched (P35)', () => {
  it('every file of SHA256SUMS.txt (Founder, master, 1x/3x, metadata) still matches its CSA hash', () => {
    const sums = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split(/\r?\n/).map((line) => line.split('  '))
    expect(sums).toHaveLength(12)
    for (const [sha, file] of sums) {
      const raw = readFileSync(asset(file), 'utf8').includes('\r') && !/\.(png|webp)$/.test(file)
        ? Buffer.from(readFileSync(asset(file), 'utf8').replace(/\r\n/g, '\n'))
        : readFileSync(asset(file))
      expect(hash(raw), file).toBe(sha)
    }
    expect(sums.find(([, f]) => f === 'ws2812b-v6.founder-reference.png')[0]).toBe('ad19fe2c09e8e82502b41155415808fa09b1ed17c862732cd39b19a367ac45c1')
    expect(sums.find(([, f]) => f === 'ws2812b-v6.runtime-master.png')[0]).toBe('0788e2bb013db597f4b4e29698d83315e1b7e9bee092ca75581bedb7eb94292c')
  })
})

// A12-NEOPIXEL-FUNC-WS2812B-V6-001 : le pixel n'est plus visual-only. Son comportement est
// UNIQUEMENT événementiel (digitalEventContributionRegistry + ws2812bV6Protocol) : toujours ni
// modèle DC/simulation, ni producteur timed ; la Presentation ne fait que projeter la couleur.
describe('A12-NEOPIXEL — WS2812B behaviour lives only in the event contributor', () => {
  it('event contributor + Visual State projection ; no simulation model, no timed/DC contribution', () => {
    expect(hasDigitalEventContribution(TYPE)).toBe(true)
    expect(hasVisualStateResolver(TYPE)).toBe(true)
    expect(isSimulationModelAvailable(TYPE)).toBe(false)
    expect(() => getSimulationModel(TYPE)).toThrow()
    expect(hasTimedDigitalContribution(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
  })

  it('powered on the canvas without data: DOUT is never driven at level, no timed state, no colour', () => {
    const doc = {
      components: [
        { id: 'p', type: 'POWER', position: { x: 0, y: 0 } },
        { id: 'px', type: TYPE, position: { x: 200, y: 0 } },
      ],
      wires: [
        { id: 'w1', pinA: { componentId: 'p', pinId: '5V' }, pinB: { componentId: 'px', pinId: 'VDD' } },
        { id: 'w2', pinA: { componentId: 'p', pinId: 'GND' }, pinB: { componentId: 'px', pinId: 'VSS' } },
      ],
    }
    const input = toEngineInput(doc)
    const runtimeSession = createSimulationRuntimeSession()
    const pinSignals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
    expect(pinSignals.get('px:VDD')).toBe(Signal.HIGH)
    expect(pinSignals.get('px:VSS')).toBe(Signal.LOW)
    expect([Signal.HIGH, Signal.LOW]).not.toContain(pinSignals.get('px:DOUT'))
    expect(runtimeSession.timedDigitalStates.has('px')).toBe(false)
    expect(runtimeSession.digitalEventStates.get('px')?.color).toBeNull()
  })

  it('no WS2812B / NeoPixel branch in the temporal engine, runtime, scheduler, clock or generic canvas', () => {
    for (const path of [['simulator', 'digitalTransitions.js'], ['simulator', 'scheduler.js'], ['simulator', 'clock.js'],
      ['simulator', 'engine.js'], ['simulator', 'resolution.js'], ['simulator', 'simulationRuntimeIntegration.js'],
      ['simulator', 'timedDigitalContributionRegistry.js'], ['simulator', 'dcContributionRegistry.js'], ['hooks', 'useCircuitState.js'],
      ['components', 'parts', 'PartRenderer.jsx'], ['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx']]) {
      // ticket ids (A12-NEOPIXEL-...) legitimately appear in comments: code only is checked
      const code = src(...path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      expect(code, path.join('/')).not.toMatch(/WS2812|Adafruit_NeoPixel|NeoPixel/i)
    }
  })
})
