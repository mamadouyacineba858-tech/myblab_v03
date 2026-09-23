import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JkFlipFlop74HC73Part } from '../JkFlipFlop74HC73Part.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { createSimulationRuntimeSession, runSimulationWithRuntime, SIMULATION_STEP_MS } from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

/** A9-JK1 — 74HC73 DIP-14 : asset CSA LOCKED, catalogue, PhysicalContacts, renderer (PHY-01..PHY-15). */

const TYPE = 'JK_FLIP_FLOP_74HC73'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/jk-flip-flop')
const asset = name => resolve(ASSET_DIR, name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const FOUNDER_SHA = 'a6b05836d7a998f7a7e6957955c11da89fa47bdc7535e04565886a74493b17f6'
const RUNTIME_1X_PNG_SHA = 'd1443f2a8784034bbf588cafcbb5aeb8627b82e04b0f19f4d520da15155bf51b'

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §3 / §6 : physical pin number -> [electrical pin, x, y] (CSA LOCKED).
const DIP14 = [
  [1, '1CP', 25, 68], [2, '1R', 37, 68], [3, '1K', 49, 68], [4, 'VCC', 61, 68], [5, '2CP', 73, 68], [6, '2R', 85, 68], [7, '2J', 97, 68],
  [8, '2NQ', 97, 20], [9, '2Q', 85, 20], [10, '2K', 73, 20], [11, 'GND', 61, 20], [12, '1Q', 49, 20], [13, '1NQ', 37, 20], [14, '1J', 25, 20],
]
const TOP_VISUAL = [24.5, 36.5, 48.5, 60.5, 72.5, 84.5, 96.5] // 1J 1NQ 1Q GND 2K 2Q 2NQ
const BOTTOM_VISUAL = [25.0, 37.0, 48.0, 60.0, 72.0, 84.0, 96.5] // 1CP 1R 1K VCC 2CP 2R 2J

describe('A9-JK1 — catalogue and PhysicalContacts (CSA LOCKED)', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('PHY-01: canonical box 120x88, label and palette entry (PHY-13)', () => {
    expect([def.width, def.height]).toEqual([120, 88])
    expect(def.label).toBe('74HC73 Dual J-K Flip-Flop')
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
  })

  it('PHY-02/PHY-03: 14 electrical pins, 14 PhysicalContacts (one per pin)', () => {
    expect(def.pins).toHaveLength(14)
    expect(contacts).toHaveLength(14)
    expect(new Set(contacts.map(c => c.id)).size).toBe(14)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
  })

  it('PHY-04/PHY-05: every contact is wireConnectable and breadboardInsertable', () => {
    expect(contacts.every(c => c.wireConnectable === true && c.breadboardInsertable === true)).toBe(true)
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(14)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(14)
  })

  it('PHY-06/PHY-07: horizontal pitch exactly 12, row spacing exactly 48', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    for (const y of [20, 68]) {
      const xs = contacts.filter(c => c.dy === y).map(c => c.dx).sort((a, b) => a - b)
      expect(xs).toEqual([25, 37, 49, 61, 73, 85, 97])
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(new Set(contacts.map(c => c.dy))).toEqual(new Set([20, 68]))
    expect(68 - 20).toBe(4 * BREADBOARD_PITCH)
  })

  it('PHY-08: physical pinout exactly matches the Blueprint and the manifest', () => {
    const byId = Object.fromEntries(contacts.map(c => [c.id, [c.dx, c.dy]]))
    for (const [, pin, x, y] of DIP14) expect(byId[pin], pin).toEqual([x, y])
    const derivation = json('manifest.json').derivation
    expect(derivation.physicalContacts).toEqual(byId)
    expect(Object.entries(derivation.physicalPinNumbers).sort((a, b) => a[1] - b[1]).map(([pin]) => pin)).toEqual(DIP14.map(([, pin]) => pin))
    // Electrical pin order follows physical pins 1..14.
    expect(def.pins.map(p => p.id)).toEqual(DIP14.map(([, pin]) => pin))
  })
})

describe('A9-JK1 — asset pack FROZEN / CSA LOCKED', () => {
  it('PHY-09: asset directory complete', () => {
    for (const file of ['ASSET-INTEGRITY.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt', 'manifest.json',
      'jk-flip-flop.default.1x.png', 'jk-flip-flop.default.1x.webp', 'jk-flip-flop.default.3x.png', 'jk-flip-flop.default.3x.webp',
      'jk-flip-flop.founder-reference.png']) {
      expect(existsSync(asset(file)), file).toBe(true)
    }
  })

  it('PHY-10: manifest and integrity are present and truthful (hashes, bytes, dimensions, budget)', () => {
    const m = json('manifest.json')
    expect(m).toMatchObject({
      component: TYPE, assetStatus: 'FOUNDER_PASS_FROZEN__CSA_PROBE_LOCKED', referenceDevice: '74HC73', package: 'DIP-14',
      backend: 'raster', canonical: { width: 120, height: 88 },
    })
    expect(m.assets.map(a => a.file).sort()).toEqual(['jk-flip-flop.default.1x.png', 'jk-flip-flop.default.1x.webp', 'jk-flip-flop.default.3x.png', 'jk-flip-flop.default.3x.webp'])
    for (const a of m.assets) {
      const raw = readFileSync(asset(a.file))
      expect(size(raw, a.format), a.file).toEqual([120 * a.scale, 88 * a.scale])
      expect([a.width, a.height]).toEqual(size(raw, a.format))
      expect(hash(raw)).toBe(a.sha256)
      expect(raw.length).toBe(a.bytes)
      expect(raw.length / 1024).toBeLessThanOrEqual(getRasterWeightLimitKb(m))
    }
    expect(hash(readFileSync(asset('jk-flip-flop.default.1x.png')))).toBe(RUNTIME_1X_PNG_SHA)
    for (const [name, record] of Object.entries(json('ASSET-INTEGRITY.json').files)) {
      const raw = readFileSync(asset(name))
      expect(hash(raw), name).toBe(record.sha256)
      expect(raw.length, name).toBe(record.bytes)
    }
    for (const line of readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
      const [sha, name] = line.trim().split(/\s+/)
      expect(hash(readFileSync(asset(name))), name).toBe(sha)
    }
  })

  it('PHY-11: Founder reference SHA unchanged', () => {
    const raw = readFileSync(asset('jk-flip-flop.founder-reference.png'))
    expect(hash(raw)).toBe(FOUNDER_SHA)
    expect(size(raw, 'png')).toEqual([1400, 789])
    expect(json('manifest.json').reference.sha256).toBe(FOUNDER_SHA)
  })
})

describe('A9-JK1 — renderer and assembly', () => {
  it('PHY-12: renderer registered (raster) and renders only the approved picture, no logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: JkFlipFlop74HC73Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<JkFlipFlop74HC73Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 88])
    expect(img.getAttribute('src')).toBe('/assets/components/jk-flip-flop/jk-flip-flop.default.1x.png')
    expect(img.getAttribute('srcset')).toBe('/assets/components/jk-flip-flop/jk-flip-flop.default.1x.png 1x, /assets/components/jk-flip-flop/jk-flip-flop.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toBe('/assets/components/jk-flip-flop/jk-flip-flop.default.1x.webp 1x, /assets/components/jk-flip-flop/jk-flip-flop.default.3x.webp 3x')
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.style.objectFit).toBe('contain')
    expect(img.style.pointerEvents).toBe('none')
    const source = src('components', 'parts', 'JkFlipFlop74HC73Part.jsx')
    expect(source).not.toMatch(/Signal|scheduler|timedDigital|pinSignals|useState|useEffect/i)
  })

  it('PHY-15: assembly profile covers the 14 pins with CSA visual roots, metallic-wire, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP14.map(([, pin]) => pin).sort())
    const top = ['1J', '1NQ', '1Q', 'GND', '2K', '2Q', '2NQ']
    const bottom = ['1CP', '1R', '1K', 'VCC', '2CP', '2R', '2J']
    top.forEach((pin, i) => expect(profile.leads[pin]).toEqual({ root: { dx: TOP_VISUAL[i], dy: 20 }, style: 'metallic-wire' }))
    bottom.forEach((pin, i) => expect(profile.leads[pin]).toEqual({ root: { dx: BOTTOM_VISUAL[i], dy: 68 }, style: 'metallic-wire' }))
    const probe = json('manifest.json').derivation.runtimeVisualProbe
    expect(probe.topLegCentersPx).toEqual(TOP_VISUAL)
    expect(probe.bottomLegCentersPx).toEqual(BOTTOM_VISUAL)
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(14)
    for (const c of g.contacts) expect(Math.hypot(c.root.x - c.target.x, c.root.y - c.target.y)).toBeLessThanOrEqual(1)
  })
})

describe('A9-JK1 — real DIP-14 insertion on STANDARD_V1', () => {
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

  it('inserted on the breadboard, the real Document adapter drives the flip-flop through strip nets', () => {
    const origin = straddling[0]
    const pos = { x: -500, y: -500 }
    // Document wires target the flip-flop pins directly while it sits inserted on the breadboard.
    const wires = (levels) => Object.entries(levels).map(([pin, high], i) => ({
      id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'ff', pinId: pin },
    }))
    const doc = levels => ({
      breadboard: bb,
      components: [{ id: 'p', type: 'POWER', position: pos }, { id: 'ff', type: TYPE, position: origin }],
      wires: wires({ VCC: true, GND: false, '1R': true, '1J': true, '1K': false, ...levels }),
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
    expect(step({ '1R': false, '1CP': true })).toEqual([Signal.LOW, Signal.HIGH])
    expect(step({ '1CP': true })).toEqual([Signal.LOW, Signal.HIGH])
    expect(step({ '1CP': false })).toEqual([Signal.HIGH, Signal.LOW])
  })

  it('PHY-14: no type-specific branch in CircuitComponent / Pin / Breadboard / PartRenderer / breadboard geometry', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx']]) {
      expect(src(...path), path.join('/')).not.toMatch(/JK_FLIP_FLOP|74HC73|JkFlipFlop|jk-flip-flop/)
    }
  })
})
