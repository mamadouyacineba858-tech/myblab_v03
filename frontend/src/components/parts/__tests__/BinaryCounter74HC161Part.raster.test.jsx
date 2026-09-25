import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BinaryCounter74HC161Part } from '../BinaryCounter74HC161Part.jsx'
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

/**
 * A9-COUNTER1 — 74HC161 DIP-16 : asset FROZEN / CSA LOCKED, catalogue, PhysicalContacts
 * NORMALISES (le Founder est une photographie en perspective : aucun pixel-probe), renderer,
 * assembly, insertion breadboard réelle.
 */

const TYPE = 'BINARY_COUNTER_74HC161'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/counter-74hc161')
const asset = name => resolve(ASSET_DIR, name)
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const FOUNDER_SHA = '095f2c38ce4870cee8d5af645043d1d2530916e32c9be27f60a8cb811942023a'
const RUNTIME_1X_PNG_SHA = '898a28cd8b3d5bdbecfe1a84c1741f44f4c9be52135706ab26938b368c94da7e'
const RUNTIME_1X_WEBP_SHA = '2112ae182ce5e84751fbdfcfae3771e266d3c62ad82a8be1f1877777ce726ad9'
const PACK = [
  'ASSET-INTEGRITY.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt',
  'counter-74hc161.default.1x.png', 'counter-74hc161.default.1x.webp', 'counter-74hc161.default.3x.png', 'counter-74hc161.default.3x.webp',
  'counter-74hc161.founder-reference.png', 'manifest.json',
]

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §2/§3 : broche physique -> [pin canonique, alias manifest (Nexperia_TI), x, y] (CSA LOCKED).
const DIP16 = [
  [1, 'MR', 'MR_CLR', 18, 56], [2, 'CP', 'CP_CLK', 30, 56], [3, 'D0', 'D0_A', 42, 56], [4, 'D1', 'D1_B', 54, 56],
  [5, 'D2', 'D2_C', 66, 56], [6, 'D3', 'D3_D', 78, 56], [7, 'CEP', 'CEP_ENP', 90, 56], [8, 'GND', 'GND', 102, 56],
  [9, 'PE', 'PE_LOAD', 102, 8], [10, 'CET', 'CET_ENT', 90, 8], [11, 'Q3', 'Q3_QD', 78, 8], [12, 'Q2', 'Q2_QC', 66, 8],
  [13, 'Q1', 'Q1_QB', 54, 8], [14, 'Q0', 'Q0_QA', 42, 8], [15, 'TC', 'TC_RCO', 30, 8], [16, 'VCC', 'VCC', 18, 8],
]
const TOP = ['VCC', 'TC', 'Q0', 'Q1', 'Q2', 'Q3', 'CET', 'PE']
const BOTTOM = ['MR', 'CP', 'D0', 'D1', 'D2', 'D3', 'CEP', 'GND']
const XS = [18, 30, 42, 54, 66, 78, 90, 102]

describe('A9-COUNTER1 — CTR-03 catalogue, palette and PhysicalContacts', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('canonical box 120x64, label, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([120, 64])
    expect(def.label).toBe('74HC161 4-bit Binary Counter')
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE).map(r => r.box)).toEqual([[120, 64]])
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component).not.toHaveProperty('state')
    expect(component.pins.map(p => p.id)).toEqual(DIP16.map(([, pin]) => pin))
  })

  it('16 electrical pins, 16 PhysicalContacts (one per pin, no alias pin), no duplicate id or coordinate', () => {
    expect(def.pins).toHaveLength(16)
    expect(contacts).toHaveLength(16)
    expect(new Set(contacts.map(c => c.id)).size).toBe(16)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(16)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    // Une seule nomenclature : aucun alias TI dupliqué en pin.
    for (const alias of ['CLR', 'CLK', 'A', 'B', 'C', 'D', 'ENP', 'LOAD', 'ENT', 'QA', 'QB', 'QC', 'QD', 'RCO']) {
      expect(def.pins.some(p => p.id === alias), alias).toBe(false)
    }
  })

  it('every contact is wireConnectable and breadboardInsertable', () => {
    expect(contacts.every(c => c.wireConnectable === true && c.breadboardInsertable === true)).toBe(true)
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(16)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(16)
  })

  it('top row y=8 (16..9 left -> right), bottom row y=56 (1..8 left -> right), pitch exactly 12, row spacing 48', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)
    expect(byX(8).map(c => c.id)).toEqual(TOP)
    expect(byX(56).map(c => c.id)).toEqual(BOTTOM)
    for (const y of [8, 56]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(new Set(contacts.map(c => c.dy))).toEqual(new Set([8, 56]))
    expect(56 - 8).toBe(4 * BREADBOARD_PITCH)
  })

  it.each(DIP16)('pin %i %s is exactly at the CSA LOCKED coordinate and matches the frozen manifest', (number, pin, alias, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.contacts.filter(c => c.pin === number)).toEqual([{ pin: number, name: alias, x, y }])
    expect(alias.split('_')[0]).toBe(pin)
  })

  it('the catalogue matches the frozen manifest physicalContacts exactly (16 entries, pitch 12, 120x64 space)', () => {
    const m = manifest().physicalContacts
    expect(m).toMatchObject({ coordinateSpace: '120x64', pitchPx: 12, count: 16 })
    expect(m.contacts.map(c => [c.pin, c.name, c.x, c.y]).sort((a, b) => a[0] - b[0])).toEqual(DIP16.map(([n, , alias, x, y]) => [n, alias, x, y]))
  })
})

describe('A9-COUNTER1 — CTR-35 / CTR-36 asset pack FROZEN / CSA LOCKED', () => {
  it('asset directory contains exactly the 11-file frozen pack (ASSET-INTEGRITY requiredFiles)', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(integrity).toMatchObject({ asset: 'counter-74hc161', status: 'CSA_LOCKED', physicalContactCount: 16, pinPitchPx: 12 })
    expect([...integrity.requiredFiles].sort()).toEqual([...PACK].sort())
  })

  it('CTR-36: SHA256SUMS cover every payload except itself and match; Founder SHA frozen', () => {
    const lines = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n')
    const listed = lines.map(line => line.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    expect(hash(readFileSync(asset('counter-74hc161.founder-reference.png')))).toBe(FOUNDER_SHA)
    expect(hash(readFileSync(asset('counter-74hc161.default.1x.png')))).toBe(RUNTIME_1X_PNG_SHA)
    expect(hash(readFileSync(asset('counter-74hc161.default.1x.webp')))).toBe(RUNTIME_1X_WEBP_SHA)
  })

  it('CTR-36: FOUNDER-ASSET and manifest identity (SN74HC161N, PDIP-16, FOUNDER_PASS, same SHA)', () => {
    const founder = JSON.parse(readFileSync(asset('FOUNDER-ASSET.json'), 'utf8'))
    expect(founder).toMatchObject({ ticket: 'A9-COUNTER1', reference: 'SN74HC161N', package: 'PDIP-16', status: 'FOUNDER_PASS', sha256: FOUNDER_SHA })
    const m = manifest()
    expect(m).toMatchObject({ id: 'counter-74hc161', ticket: 'A9-COUNTER1', family: '74HC161', pins: 16 })
    expect(m.founderReference).toEqual({ file: 'counter-74hc161.founder-reference.png', status: 'FOUNDER_PASS', sha256: FOUNDER_SHA })
    expect(readFileSync(asset('README.md'), 'utf8')).toBe(readFileSync(asset('README.txt'), 'utf8'))
  })

  it('CTR-35: runtime derivatives 120x64 at 1x, 360x192 at 3x, canvas = canonical box', () => {
    expect(manifest().canvasSize).toEqual({ width: 120, height: 64 })
    for (const [file, format, expected] of [
      ['counter-74hc161.default.1x.png', 'png', [120, 64]], ['counter-74hc161.default.3x.png', 'png', [360, 192]],
      ['counter-74hc161.default.1x.webp', 'webp', [120, 64]], ['counter-74hc161.default.3x.webp', 'webp', [360, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
    expect(manifest().images).toEqual({
      '1x': { png: 'counter-74hc161.default.1x.png', webp: 'counter-74hc161.default.1x.webp' },
      '3x': { png: 'counter-74hc161.default.3x.png', webp: 'counter-74hc161.default.3x.webp' },
    })
  })
})

describe('A9-COUNTER1 — CTR-34 / CTR-38 renderer and assembly', () => {
  it('CTR-34: renderer registered (raster) and renders only the frozen picture, no logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: BinaryCounter74HC161Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<BinaryCounter74HC161Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['120px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 64])
    const dir = '/assets/components/counter-74hc161/'
    expect(img.getAttribute('src')).toBe(`${dir}counter-74hc161.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}counter-74hc161.default.1x.png 1x, ${dir}counter-74hc161.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}counter-74hc161.default.1x.webp 1x, ${dir}counter-74hc161.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.style.objectFit).toBe('contain')
    expect(img.style.pointerEvents).toBe('none')
    const source = src('components', 'parts', 'BinaryCounter74HC161Part.jsx')
    expect(source).not.toMatch(/Signal|scheduler|timedDigital|pinSignals|useState|useEffect|founder-reference/i)
  })

  it('CTR-38: assembly profile = 16 metallic-wire leads rooted on the CSA normalized contacts (no photographic probe), no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP16.map(([, pin]) => pin).sort())
    for (const [, pin, , x, y] of DIP16) {
      expect(profile.leads[pin].style).toBe('metallic-wire')
      expect(profile.leads[pin].root).toEqual({ dx: x, dy: y })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(16)
    const byId = Object.fromEntries(DIP16.map(([, pin, , x, y]) => [pin, { x, y }]))
    for (const c of g.contacts) {
      expect(c.target).toEqual(byId[c.contactId ?? c.pinId])
      expect(c.root).toEqual(c.target)
    }
  })
})

describe('A9-COUNTER1 — CTR-37 real DIP-16 insertion on STANDARD_V1', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef(TYPE)
  const contactDy = Object.fromEntries(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dy]))
  const straddling = []
  for (let x = -30; x <= 10; x++) {
    for (let y = 30; y <= 80; y++) {
      if ((x + 18) % 12 !== 0 || (y + 8) % 12 !== 0) continue
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

  it('inserted on the breadboard, the real Document adapter drives the counter (reset, count, load)', () => {
    const origin = straddling[0]
    const pos = { x: -500, y: -500 }
    const doc = levels => ({
      breadboard: bb,
      components: [{ id: 'p', type: 'POWER', position: pos }, { id: 'c', type: TYPE, position: origin }],
      wires: Object.entries({ VCC: true, GND: false, MR: true, PE: true, CEP: true, CET: true, CP: false, D0: false, D1: false, D2: false, D3: false, ...levels })
        .map(([pin, high], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'c', pinId: pin } })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      return ['Q0', 'Q1', 'Q2', 'Q3', 'TC'].map(pin => signals.get(`c:${pin}`))
    }
    const { HIGH, LOW } = Signal
    expect(step({ MR: false })).toEqual([LOW, LOW, LOW, LOW, LOW])
    expect(step({ CP: true })).toEqual([HIGH, LOW, LOW, LOW, LOW])
    step({ PE: false, D0: true, D1: true, D2: true, D3: true })
    expect(step({ CP: true, PE: false, D0: true, D1: true, D2: true, D3: true })).toEqual([HIGH, HIGH, HIGH, HIGH, HIGH])
  })

  it('CTR-39: no type-specific branch in CircuitComponent / Pin / Breadboard / PartRenderer / geometry', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx']]) {
      expect(src(...path), path.join('/')).not.toMatch(/BINARY_COUNTER|74HC161|BinaryCounter|counter-74hc161/)
    }
  })
})
