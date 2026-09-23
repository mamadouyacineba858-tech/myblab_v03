import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DLatch74HC75Part } from '../DLatch74HC75Part.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { createSimulationRuntimeSession, runSimulationWithRuntime, SIMULATION_STEP_MS } from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

/** A9-LATCH1 — 74HC75 DIP-16 : asset FROZEN / CSA LOCKED, catalogue, PhysicalContacts, renderer, assembly. */

const TYPE = 'D_LATCH_74HC75'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/d-latch-74hc75')
const asset = name => resolve(ASSET_DIR, name)
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const FOUNDER_SHA = 'bbdc2ea5ec3e0983a815f7168efcebf895c14bfe5d3dcb69b7c3a7777a8c1813'
const RUNTIME_1X_PNG_SHA = '7a6abf934f45e5ea6b8ffe9b63f6ff92198ea925df2bea5613d90c5877b31cdd'

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §7/§8 : physical pin number -> [electrical pin, x, y] (CSA LOCKED, never recomputed).
const DIP16 = [
  [1, '1NQ', 19, 56], [2, '1D', 31, 56], [3, '2D', 43, 56], [4, 'LE34', 55, 56], [5, 'VCC', 67, 56], [6, '3D', 79, 56], [7, '4D', 91, 56], [8, '4NQ', 103, 56],
  [9, '4Q', 103, 8], [10, '3Q', 91, 8], [11, '3NQ', 79, 8], [12, 'GND', 67, 8], [13, 'LE12', 55, 8], [14, '2NQ', 43, 8], [15, '2Q', 31, 8], [16, '1Q', 19, 8],
]
const TOP = ['1Q', '2Q', '2NQ', 'LE12', 'GND', '3NQ', '3Q', '4Q']
const BOTTOM = ['1NQ', '1D', '2D', 'LE34', 'VCC', '3D', '4D', '4NQ']
const manifestContacts = () => {
  const { top, bottom } = manifest().physicalContacts
  return [...bottom, ...top].map(c => [c.pin, c.name, c.x, c.y]).sort((a, b) => a[0] - b[0])
}

describe('A9-LATCH1 — catalogue, palette and PhysicalContacts (T2 / T3 / T18 / T19)', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('T18: canonical box 120x64, label, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([120, 64])
    expect(def.label).toBe('74HC75 Quad D Latch')
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE).map(r => r.box)).toEqual([[120, 64]])
  })

  it('T2: the palette exposes the component once and instantiates it with its 16 pins', () => {
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component).not.toHaveProperty('state')
    expect(component.pins.map(p => p.id)).toEqual(DIP16.map(([, pin]) => pin))
  })

  it('T3: 16 electrical pins, 16 PhysicalContacts (one per pin), no duplicate id or coordinate', () => {
    expect(def.pins).toHaveLength(16)
    expect(contacts).toHaveLength(16)
    expect(new Set(contacts.map(c => c.id)).size).toBe(16)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(16)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.map(p => p.id)).toEqual(DIP16.map(([, pin]) => pin))
  })

  it('every contact is wireConnectable and breadboardInsertable', () => {
    expect(contacts.every(c => c.wireConnectable === true && c.breadboardInsertable === true)).toBe(true)
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(16)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(16)
  })

  it('top row y=8, bottom row y=56, pitch exactly 12, row spacing 48', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)
    expect(byX(8).map(c => c.id)).toEqual(TOP)
    expect(byX(56).map(c => c.id)).toEqual(BOTTOM)
    for (const y of [8, 56]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual([19, 31, 43, 55, 67, 79, 91, 103])
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(new Set(contacts.map(c => c.dy))).toEqual(new Set([8, 56]))
    expect(56 - 8).toBe(4 * BREADBOARD_PITCH)
  })

  it.each(DIP16)('T19: pin %i %s is exactly at the CSA LOCKED coordinate (%i, %i)', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifestContacts().find(c => c[0] === number)).toEqual([number, pin, x, y])
  })

  it('the catalogue matches the frozen manifest physicalContacts exactly (16 entries)', () => {
    expect(manifestContacts()).toEqual(DIP16)
  })
})

describe('A9-LATCH1 — asset pack FROZEN / CSA LOCKED (T17)', () => {
  it('asset directory (frozen path) contains exactly the frozen pack', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([
      '74hc75.default.1x.png', '74hc75.default.1x.webp', '74hc75.default.3x.png', '74hc75.default.3x.webp',
      '74hc75.founder-reference.png', 'README.md', 'SHA256SUMS.txt', 'manifest.json',
    ])
  })

  it('SHA256SUMS match the files; Founder and runtime 1x SHA unchanged; manifest identity', () => {
    const lines = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(7)
    for (const line of lines) {
      const [sha, name] = line.trim().split(/\s+/)
      expect(hash(readFileSync(asset(name))), name).toBe(sha)
    }
    expect(hash(readFileSync(asset('74hc75.founder-reference.png')))).toBe(FOUNDER_SHA)
    expect(hash(readFileSync(asset('74hc75.default.1x.png')))).toBe(RUNTIME_1X_PNG_SHA)
    const m = manifest()
    expect(m).toMatchObject({ ticket: 'A9-LATCH1', component: '74HC75', status: 'FOUNDER_PASS_CSA_LOCKED' })
    expect(m.normalization.targetPitchPx).toBe(BREADBOARD_PITCH)
  })

  it('runtime derivatives: 120x64 at 1x, 360x192 at 3x, canvas = canonical box', () => {
    expect(manifest().runtimeCanvas).toEqual({ width: 120, height: 64 })
    for (const [file, format, expected] of [
      ['74hc75.default.1x.png', 'png', [120, 64]], ['74hc75.default.3x.png', 'png', [360, 192]],
      ['74hc75.default.1x.webp', 'webp', [120, 64]], ['74hc75.default.3x.webp', 'webp', [360, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })
})

describe('A9-LATCH1 — renderer and assembly (T17 / T20 / T21)', () => {
  it('renderer registered (raster) and renders only the frozen picture, no logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: DLatch74HC75Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<DLatch74HC75Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['120px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 64])
    expect(img.getAttribute('src')).toBe('/assets/components/d-latch-74hc75/74hc75.default.1x.png')
    expect(img.getAttribute('srcset')).toBe('/assets/components/d-latch-74hc75/74hc75.default.1x.png 1x, /assets/components/d-latch-74hc75/74hc75.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toBe('/assets/components/d-latch-74hc75/74hc75.default.1x.webp 1x, /assets/components/d-latch-74hc75/74hc75.default.3x.webp 3x')
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.style.objectFit).toBe('contain')
    expect(img.style.pointerEvents).toBe('none')
    const source = src('components', 'parts', 'DLatch74HC75Part.jsx')
    expect(source).not.toMatch(/Signal|scheduler|timedDigital|pinSignals|useState|useEffect/i)
  })

  it('assembly profile: 16 metallic-wire leads rooted on the CSA LOCKED contacts, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP16.map(([, pin]) => pin).sort())
    for (const [, pin, x, y] of DIP16) {
      expect(profile.leads[pin].style).toBe('metallic-wire')
      expect(profile.leads[pin].root).toEqual({ dx: x, dy: y })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(16)
    const byId = Object.fromEntries(DIP16.map(([, pin, x, y]) => [pin, { x, y }]))
    for (const c of g.contacts) {
      expect(c.target).toEqual(byId[c.contactId ?? c.pinId])
      expect(c.root.y).toBe(c.target.y)
      expect(Math.abs(c.root.x - c.target.x)).toBeLessThan(BREADBOARD_PITCH / 4)
    }
  })
})

describe('A9-LATCH1 — real DIP-16 insertion on STANDARD_V1 (T21)', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef(TYPE)
  const contactDy = Object.fromEntries(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dy]))
  const straddling = []
  for (let x = -30; x <= 10; x++) {
    for (let y = 30; y <= 80; y++) {
      if ((x + 19) % 12 !== 0 || (y + 8) % 12 !== 0) continue
      const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
      if (results.length !== 16 || !results.every(r => r.resolved)) continue
      const sideOf = dy => new Set(results.filter(r => contactDy[r.contactId] === dy).map(r => r.hole.groupKey.split(':').pop()))
      if (results.every(r => r.hole.kind === 'STRIP') && sideOf(56).size === 1 && sideOf(8).size === 1 && sideOf(56).has('bottom') && sideOf(8).has('top')) {
        straddling.push({ x, y })
      }
    }
  }

  it('the 16 contacts land exactly on hole centres, one row on each side of the trench, 16 distinct nets', () => {
    expect(straddling.length).toBeGreaterThan(0)
    const origin = straddling[0]
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: origin })
    const g = resolveAssemblyGeometry(createComponent(TYPE, origin.x, origin.y), bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(16)
    for (const c of g.contacts) expect(c.holePosition).toEqual(c.target)
    expect(new Set(g.contacts.map(c => `${c.hole.column}:${c.hole.row}`)).size).toBe(16)
    const rows = [...new Set(g.contacts.map(c => c.hole.row))].sort((a, b) => a - b)
    expect(rows).toHaveLength(2)
    expect(rows[1] - rows[0]).toBe(4)
    expect(new Set(g.contacts.map(c => holeAt(bb, c.target.x, c.target.y).groupKey)).size).toBe(16)
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(16)
  })

  it('inserted on the breadboard, the real Document adapter drives the latch (transparent then hold)', () => {
    const origin = straddling[0]
    const pos = { x: -500, y: -500 }
    const doc = levels => ({
      breadboard: bb,
      components: [{ id: 'p', type: 'POWER', position: pos }, { id: 'l', type: TYPE, position: origin }],
      wires: Object.entries({ VCC: true, GND: false, ...levels }).map(([pin, high], i) => ({
        id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'l', pinId: pin },
      })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      return [signals.get('l:1Q'), signals.get('l:1NQ'), signals.get('l:4Q'), signals.get('l:4NQ')]
    }
    expect(step({ LE12: true, '1D': true, LE34: true, '4D': false })).toEqual([Signal.HIGH, Signal.LOW, Signal.LOW, Signal.HIGH])
    expect(step({ LE12: false, '1D': false, LE34: false, '4D': true })).toEqual([Signal.HIGH, Signal.LOW, Signal.LOW, Signal.HIGH])
  })

  it('no type-specific branch in CircuitComponent / Pin / Breadboard / PartRenderer / geometry', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx']]) {
      expect(src(...path), path.join('/')).not.toMatch(/D_LATCH|74HC75|DLatch|d-latch/)
    }
  })
})
