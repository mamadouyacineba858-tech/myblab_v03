import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Lm339ne4Part } from '../Lm339ne4Part.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'

/**
 * A11-COMP1 — TI LM339NE4 N / PDIP-14 : asset CSA FROZEN, catalogue, PhysicalContacts NORMALISES
 * (geometrie electrique CSA, pixelProbed false), renderer raster purement visuel, assembly, insertion.
 */

const TYPE = 'LM339NE4'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/lm339ne4')
const asset = name => resolve(ASSET_DIR, name)
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt',
  'manifest.json', 'lm339ne4.default.1x.png', 'lm339ne4.default.1x.webp', 'lm339ne4.default.3x.png',
  'lm339ne4.default.3x.webp', 'lm339ne4.founder-reference.png', 'lm339ne4.runtime-master.png',
]

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §3/§9 : broche physique -> [pin canonique, x, y] (PhysicalContacts FROZEN).
const DIP14 = [
  [1, '1OUT', 24, 48], [2, '2OUT', 36, 48], [3, 'VCC', 48, 48], [4, '2IN-', 60, 48], [5, '2IN+', 72, 48],
  [6, '1IN-', 84, 48], [7, '1IN+', 96, 48], [8, '3IN-', 96, 16], [9, '3IN+', 84, 16], [10, '4IN-', 72, 16],
  [11, '4IN+', 60, 16], [12, 'GND', 48, 16], [13, '4OUT', 36, 16], [14, '3OUT', 24, 16],
]
const XS = [24, 36, 48, 60, 72, 84, 96]

describe('A11-COMP1 — catalogue, palette and PhysicalContacts', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('canonical box 120x64, label, manufacturer, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([120, 64])
    expect(def.label).toBe('LM339 Quad Comparator')
    expect(def.manufacturer).toBe('Texas Instruments')
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE)).toEqual([expect.objectContaining({ box: [120, 64], physicalMm: null, impliedUnitsPerMm: null })])
    expect(SCALE_REFERENCE.find(r => r.type === TYPE).ref).toMatch(/Texas Instruments LM339NE4.*PDIP-14.*normalized.*uncalibrated/)
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component.pins.map(p => p.id)).toEqual(DIP14.map(([, pin]) => pin))
  })

  it('14 electrical pins, 14 PhysicalContacts (one per pin), no duplicate id or coordinate', () => {
    expect(def.pins).toHaveLength(14)
    expect(contacts).toHaveLength(14)
    expect(new Set(contacts.map(c => c.id)).size).toBe(14)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(14)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(14)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(14)
  })

  it('bottom row y=48 (1..7), top row y=16 (14..8), left -> right, pitch exactly 12', () => {
    const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)
    expect(byX(48).map(c => c.id)).toEqual(DIP14.slice(0, 7).map(([, pin]) => pin))
    expect(byX(16).map(c => c.id)).toEqual(DIP14.slice(7).reverse().map(([, pin]) => pin))
    for (const y of [16, 48]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
  })

  it.each(DIP14)('pin %i %s is exactly at its FROZEN coordinate from the manifest', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.filter(c => c.pin === String(number))).toEqual([{ pin: String(number), name: pin, dx: x, dy: y }])
    expect(manifest().pinMap[String(number)]).toBe(pin)
  })
})

describe('A11-COMP1 — asset pack CSA FROZEN', () => {
  it('asset directory contains exactly the frozen pack declared by ASSET-INTEGRITY', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(integrity).toMatchObject({ asset: 'lm339ne4', status: 'CSA_FROZEN', physicalContactsLocked: true, pixelProbeClaim: false })
    expect([...integrity.requiredFiles].sort()).toEqual([...PACK].sort())
  })

  it('SHA256SUMS cover every payload except itself and match the files', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n').map(line => line.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt').sort())
    // Text payloads are stored LF in Git; a Windows checkout (core.autocrlf) may present CRLF.
    const canonical = name => /\.(json|md|txt)$/.test(name)
      ? Buffer.from(readFileSync(asset(name), 'utf8').replace(/\r\n/g, '\n'), 'utf8') : readFileSync(asset(name))
    for (const [sha, name] of listed) expect(hash(canonical(name)), name).toBe(sha)
  })

  it('manifest identity: TI LM339NE4, PDIP-14, normalized geometry never pixel-probed', () => {
    expect(manifest()).toMatchObject({
      id: 'lm339ne4', manufacturer: 'Texas Instruments', manufacturerReference: 'LM339NE4', package: 'N / PDIP-14', pins: 14,
      physicalContactsStatus: 'FROZEN', runtimeCanvasPx: { width: 120, height: 64 },
    })
    expect(manifest().geometryBasis.pixelProbed).toBe(false)
    expect(JSON.parse(readFileSync(asset('FOUNDER-ASSET.json'), 'utf8'))).toMatchObject({ reference: 'LM339NE4', status: 'FOUNDER_PASS' })
  })

  it('runtime derivatives 120x64 at 1x and 360x192 at 3x', () => {
    for (const [file, format, expected] of [
      ['lm339ne4.default.1x.png', 'png', [120, 64]], ['lm339ne4.default.3x.png', 'png', [360, 192]],
      ['lm339ne4.default.1x.webp', 'webp', [120, 64]], ['lm339ne4.default.3x.webp', 'webp', [360, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
    expect(manifest().runtime.files).toEqual({
      '1x': ['lm339ne4.default.1x.png', 'lm339ne4.default.1x.webp'],
      '3x': ['lm339ne4.default.3x.png', 'lm339ne4.default.3x.webp'],
    })
  })
})

describe('A11-COMP1 — renderer, assembly and breadboard insertion', () => {
  it('renderer registered (raster) and renders only the frozen picture, no comparator logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: Lm339ne4Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<Lm339ne4Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['120px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 64])
    const dir = '/assets/components/lm339ne4/'
    expect(img.getAttribute('src')).toBe(`${dir}lm339ne4.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}lm339ne4.default.1x.png 1x, ${dir}lm339ne4.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}lm339ne4.default.1x.webp 1x, ${dir}lm339ne4.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    const source = src('components', 'parts', 'Lm339ne4Part.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|inputVoltages|contribute|dcVoltage|simulator|useState|useEffect|founder-reference|runtime-master/i)
  })

  it('assembly profile = 14 metallic-wire leads rooted on the FROZEN contacts, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP14.map(([, pin]) => pin).sort())
    for (const [, pin, x, y] of DIP14) {
      expect(profile.leads[pin]).toEqual({ root: { dx: x, dy: y }, style: 'metallic-wire' })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(14)
    for (const c of g.contacts) expect(c.root).toEqual(c.target)
  })

  it('straddling the trench, the 14 contacts resolve to 14 distinct strips (FROZEN 32 px rows: 2 px vertical residual)', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const def = getComponentDef(TYPE)
    let origin = null
    for (let x = -40; x <= 40 && !origin; x++) {
      for (let y = -10; y <= 120 && !origin; y++) {
        const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
        if (results.length !== 14 || !results.every(r => r.resolved && r.hole.kind === 'STRIP')
          || new Set(results.map(r => r.hole.groupKey)).size !== 14) continue
        const g = resolveAssemblyGeometry(createComponent(TYPE, x, y), bb)
        if (g.contacts.every(c => c.holePosition.x === c.target.x)) origin = { x, y }
      }
    }
    expect(origin).not.toBeNull()
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true })
    const g = resolveAssemblyGeometry(createComponent(TYPE, origin.x, origin.y), bb)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map(c => holeAt(bb, c.holePosition.x, c.holePosition.y).groupKey)).size).toBe(14)
    // Horizontal pitch is exact; the FROZEN rows (32 px apart) sit 2 px inside the trench holes (36 px apart).
    for (const c of g.contacts) {
      expect(c.holePosition.x).toBe(c.target.x)
      expect(Math.abs(c.holePosition.y - c.target.y)).toBeLessThanOrEqual(2)
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(14)
  })

  it('no LM339-specific branch in generic canvas, renderer or geometry code', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx'],
      ['simulator', 'resolution.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/LM339|Lm339|lm339/)
    }
  })
})
