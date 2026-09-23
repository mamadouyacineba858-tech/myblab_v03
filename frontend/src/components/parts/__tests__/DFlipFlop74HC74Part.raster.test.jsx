import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DFlipFlop74HC74Part } from '../DFlipFlop74HC74Part.jsx'
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

/** A9-DFF1 — 74HC74 DIP-14 : asset FROZEN / CSA LOCKED, catalogue, PhysicalContacts, renderer, assembly. */

const TYPE = 'D_FLIP_FLOP_74HC74'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/d-flip-flop-74hc74')
const asset = name => resolve(ASSET_DIR, name)
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const FOUNDER_SHA = 'a0eba66ea7d120cc2787a527b5c59bd10a7357f2ee32b247479a2cee18f673d0'
const RUNTIME_1X_PNG_SHA = '31ecd0a5a45ad289a88493dc78453735e7ceaf2bce0e18fe79bead8070e99e81'

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §5 : physical pin number -> [electrical pin, x, y] (CSA LOCKED, never recomputed).
const DIP14 = [
  [1, '1CLR', 25, 68], [2, '1D', 37, 68], [3, '1CLK', 49, 68], [4, '1PRE', 61, 68], [5, '1Q', 73, 68], [6, '1NQ', 85, 68], [7, 'GND', 97, 68],
  [8, '2NQ', 97, 20], [9, '2Q', 85, 20], [10, '2PRE', 73, 20], [11, '2CLK', 61, 20], [12, '2D', 49, 20], [13, '2CLR', 37, 20], [14, 'VCC', 25, 20],
]
const TOP = ['VCC', '2CLR', '2D', '2CLK', '2PRE', '2Q', '2NQ']
const BOTTOM = ['1CLR', '1D', '1CLK', '1PRE', '1Q', '1NQ', 'GND']

describe('A9-DFF1 — catalogue and PhysicalContacts (CSA LOCKED)', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('canonical box 120x88, label, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([120, 88])
    expect(def.label).toBe('74HC74 Dual D Flip-Flop')
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE).map(r => r.box)).toEqual([[120, 88]])
  })

  it('14 electrical pins, 14 PhysicalContacts (one per pin), no duplicate id or coordinate', () => {
    expect(def.pins).toHaveLength(14)
    expect(contacts).toHaveLength(14)
    expect(new Set(contacts.map(c => c.id)).size).toBe(14)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(14)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
  })

  it('every contact is wireConnectable and breadboardInsertable', () => {
    expect(contacts.every(c => c.wireConnectable === true && c.breadboardInsertable === true)).toBe(true)
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(14)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(14)
  })

  it('top row y=20, bottom row y=68, pitch exactly 12, row spacing 48', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(contacts.filter(c => c.dy === 20).map(c => c.id).sort()).toEqual([...TOP].sort())
    expect(contacts.filter(c => c.dy === 68).map(c => c.id).sort()).toEqual([...BOTTOM].sort())
    for (const y of [20, 68]) {
      const xs = contacts.filter(c => c.dy === y).map(c => c.dx).sort((a, b) => a - b)
      expect(xs).toEqual([25, 37, 49, 61, 73, 85, 97])
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(new Set(contacts.map(c => c.dy))).toEqual(new Set([20, 68]))
    expect(68 - 20).toBe(4 * BREADBOARD_PITCH)
  })

  it.each(DIP14)('pin %i %s is exactly at the CSA LOCKED coordinate (%i, %i)', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.find(c => c.pin === number)).toEqual({ pin: number, name: pin, x, y })
  })

  it('the catalogue matches the frozen manifest physicalContacts exactly (14 entries)', () => {
    const fromManifest = manifest().physicalContacts.map(c => [c.pin, c.name, c.x, c.y]).sort((a, b) => a[0] - b[0])
    expect(fromManifest).toEqual(DIP14)
    expect(def.pins.map(p => p.id)).toEqual(DIP14.map(([, pin]) => pin))
  })
})

describe('A9-DFF1 — asset pack FROZEN / CSA LOCKED', () => {
  it('asset directory (frozen path) contains exactly the frozen pack', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([
      '74hc74.default.1x.png', '74hc74.default.1x.webp', '74hc74.default.3x.png', '74hc74.default.3x.webp',
      '74hc74.founder-reference.png', 'README.md', 'SHA256SUMS.txt', 'manifest.json',
    ])
  })

  it('SHA256SUMS and manifest hashes match the files; Founder and runtime 1x SHA unchanged', () => {
    for (const line of readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
      const [sha, name] = line.trim().split(/\s+/)
      expect(hash(readFileSync(asset(name))), name).toBe(sha)
    }
    const m = manifest()
    expect(m.ticket).toBe('A9-DFF1')
    expect(m.founderReference).toMatchObject({ file: '74hc74.founder-reference.png', sha256: FOUNDER_SHA, unchanged: true })
    expect(hash(readFileSync(asset('74hc74.founder-reference.png')))).toBe(FOUNDER_SHA)
    expect(size(readFileSync(asset('74hc74.founder-reference.png')), 'png')).toEqual(m.founderReference.dimensions)
    expect(m.runtime.png1x.sha256).toBe(RUNTIME_1X_PNG_SHA)
    expect(hash(readFileSync(asset('74hc74.default.1x.png')))).toBe(RUNTIME_1X_PNG_SHA)
    for (const entry of Object.values(m.runtime)) expect(hash(readFileSync(asset(entry.file))), entry.file).toBe(entry.sha256)
  })

  it('runtime derivatives: 120x88 at 1x, 360x264 at 3x, canvas = canonical box', () => {
    const m = manifest()
    expect(m.normalization.runtimeCanvas).toEqual([120, 88])
    expect(m.normalization.canonicalPitch).toBe(BREADBOARD_PITCH)
    for (const [file, format, expected] of [
      ['74hc74.default.1x.png', 'png', [120, 88]], ['74hc74.default.3x.png', 'png', [360, 264]],
      ['74hc74.default.1x.webp', 'webp', [120, 88]], ['74hc74.default.3x.webp', 'webp', [360, 264]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })
})

describe('A9-DFF1 — renderer and assembly', () => {
  it('renderer registered (raster) and renders only the frozen picture, no logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: DFlipFlop74HC74Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<DFlipFlop74HC74Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['120px', '88px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 88])
    expect(img.getAttribute('src')).toBe('/assets/components/d-flip-flop-74hc74/74hc74.default.1x.png')
    expect(img.getAttribute('srcset')).toBe('/assets/components/d-flip-flop-74hc74/74hc74.default.1x.png 1x, /assets/components/d-flip-flop-74hc74/74hc74.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toBe('/assets/components/d-flip-flop-74hc74/74hc74.default.1x.webp 1x, /assets/components/d-flip-flop-74hc74/74hc74.default.3x.webp 3x')
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.style.objectFit).toBe('contain')
    expect(img.style.pointerEvents).toBe('none')
    const source = src('components', 'parts', 'DFlipFlop74HC74Part.jsx')
    expect(source).not.toMatch(/Signal|scheduler|timedDigital|pinSignals|useState|useEffect/i)
  })

  it('assembly profile: 14 metallic-wire leads, roots from the CSA manifest normalization, targets = locked contacts', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP14.map(([, pin]) => pin).sort())
    const n = manifest().normalization
    const legX = n.sourceLeadCentersPx.map(s => n.offset[0] + (s - n.alphaBBox[0]) * n.scale)
    for (const [row, y] of [[TOP, 20], [BOTTOM, 68]]) {
      row.forEach((pin, i) => {
        const lead = profile.leads[pin]
        expect(lead.style).toBe('metallic-wire')
        expect(lead.root.dy).toBe(y)
        expect(lead.root.dx).toBeCloseTo(legX[i], 3)
      })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(14)
    const byId = Object.fromEntries(DIP14.map(([, pin, x, y]) => [pin, { x, y }]))
    for (const c of g.contacts) {
      expect(c.target).toEqual(byId[c.contactId ?? c.pinId])
      // The generic lead only bridges each visual leg to its locked contact (same row, < pitch / 4).
      expect(c.root.y).toBe(c.target.y)
      expect(Math.abs(c.root.x - c.target.x)).toBeLessThan(BREADBOARD_PITCH / 4)
    }
  })
})

describe('A9-DFF1 — real DIP-14 insertion on STANDARD_V1', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef(TYPE)
  const contactDy = Object.fromEntries(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dy]))
  const straddling = []
  for (let x = -30; x <= 10; x++) {
    for (let y = 30; y <= 60; y++) {
      if ((x + 25) % 12 !== 0 || (y + 20) % 12 !== 0) continue
      const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
      if (results.length !== 14 || !results.every(r => r.resolved)) continue
      const sideOf = dy => new Set(results.filter(r => contactDy[r.contactId] === dy).map(r => r.hole.groupKey.split(':').pop()))
      if (results.every(r => r.hole.kind === 'STRIP') && sideOf(68).size === 1 && sideOf(20).size === 1 && sideOf(68).has('bottom') && sideOf(20).has('top')) {
        straddling.push({ x, y })
      }
    }
  }

  it('the 14 contacts land exactly on hole centres, one row on each side of the trench, 14 distinct nets', () => {
    expect(straddling.length).toBeGreaterThan(0)
    const origin = straddling[0]
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: origin })
    const g = resolveAssemblyGeometry(createComponent(TYPE, origin.x, origin.y), bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(14)
    for (const c of g.contacts) expect(c.holePosition).toEqual(c.target)
    expect(new Set(g.contacts.map(c => `${c.hole.column}:${c.hole.row}`)).size).toBe(14)
    const rows = [...new Set(g.contacts.map(c => c.hole.row))].sort((a, b) => a - b)
    expect(rows).toHaveLength(2)
    expect(rows[1] - rows[0]).toBe(4)
    expect(new Set(g.contacts.map(c => holeAt(bb, c.target.x, c.target.y).groupKey)).size).toBe(14)
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(14)
  })

  it('inserted on the breadboard, the real Document adapter drives the flip-flop on a rising edge', () => {
    const origin = straddling[0]
    const pos = { x: -500, y: -500 }
    const wires = levels => Object.entries(levels).map(([pin, high], i) => ({
      id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'ff', pinId: pin },
    }))
    const doc = levels => ({
      breadboard: bb,
      components: [{ id: 'p', type: 'POWER', position: pos }, { id: 'ff', type: TYPE, position: origin }],
      wires: wires({ VCC: true, GND: false, '1PRE': true, '1CLR': true, '1D': true, ...levels }),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      return [signals.get('ff:1Q'), signals.get('ff:1NQ')]
    }
    expect(step({ '1CLR': false, '1CLK': false })).toEqual([Signal.LOW, Signal.HIGH])
    expect(step({ '1CLK': false })).toEqual([Signal.LOW, Signal.HIGH])
    expect(step({ '1CLK': true })).toEqual([Signal.HIGH, Signal.LOW])
  })

  it('no type-specific branch in CircuitComponent / Pin / Breadboard / PartRenderer / geometry', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx']]) {
      expect(src(...path), path.join('/')).not.toMatch(/D_FLIP_FLOP|74HC74|DFlipFlop|d-flip-flop/)
    }
  })
})
