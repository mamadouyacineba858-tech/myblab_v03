import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Lm393pPart } from '../Lm393pPart.jsx'
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
 * A11-COMP2 — TI LM393P P / PDIP-8 : asset CSA FROZEN (Founder PASS, pixel-probe CSA PASS),
 * catalogue, PhysicalContacts CSA LOCKED, renderer raster purement visuel, assembly, insertion.
 */

const TYPE = 'LM393P'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/lm393p')
const asset = name => resolve(ASSET_DIR, name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const manifest = () => json('manifest.json')
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
// Text payloads are stored LF in Git; a Windows checkout (core.autocrlf) may present CRLF.
const canonical = name => /\.(json|md|txt)$/.test(name)
  ? Buffer.from(readFileSync(asset(name), 'utf8').replace(/\r\n/g, '\n'), 'utf8') : readFileSync(asset(name))
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'EXEC-004-FINAL-REPORT.txt', 'FOUNDER-ASSET.json', 'README.md',
  'README.txt', 'SHA256SUMS.txt', 'manifest.json', 'lm393p.default.1x.png', 'lm393p.default.1x.webp',
  'lm393p.default.3x.png', 'lm393p.default.3x.webp', 'lm393p.founder-reference.png', 'lm393p.runtime-master.png',
]

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Ticket §4/§5 : broche physique -> [pin canonique, x, y] (PhysicalContacts CSA LOCKED).
const DIP8 = [
  [1, '1OUT', 24, 48], [2, '1IN-', 36, 48], [3, '1IN+', 48, 48], [4, 'GND', 60, 48],
  [5, '2IN+', 60, 16], [6, '2IN-', 48, 16], [7, '2OUT', 36, 16], [8, 'VCC', 24, 16],
]
const XS = [24, 36, 48, 60]

describe('A11-COMP2 — catalogue, palette and PhysicalContacts', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('canonical box 84x64, label, manufacturer, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([84, 64])
    expect(def.label).toBe('LM393 Dual Comparator')
    expect(def.manufacturer).toBe('Texas Instruments')
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE)).toEqual([expect.objectContaining({ box: [84, 64], physicalMm: null, impliedUnitsPerMm: null })])
    expect(SCALE_REFERENCE.find(r => r.type === TYPE).ref).toMatch(/Texas Instruments LM393P.*P \/ PDIP-8.*CSA frozen raster.*CSA qualified electrical geometry/)
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component.pins.map(p => p.id)).toEqual(DIP8.map(([, pin]) => pin))
  })

  it('8 electrical pins, 8 PhysicalContacts (one per pin), no duplicate id or coordinate', () => {
    expect(def.pins).toHaveLength(8)
    expect(contacts).toHaveLength(8)
    expect(new Set(contacts.map(c => c.id)).size).toBe(8)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(8)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(8)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(8)
  })

  it('bottom row y=48 (1..4), top row y=16 (8..5), left -> right, pitch exactly 12', () => {
    const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)
    expect(byX(48).map(c => c.id)).toEqual(DIP8.slice(0, 4).map(([, pin]) => pin))
    expect(byX(16).map(c => c.id)).toEqual(DIP8.slice(4).reverse().map(([, pin]) => pin))
    for (const y of [16, 48]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
  })

  it.each(DIP8)('pin %i %s is exactly at its CSA LOCKED coordinate from the pack', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.contacts.filter(c => c.pin === number)).toEqual([{ pin: number, name: pin, x, y }])
    expect(json('CONTACT-VALIDATION.json').contacts.filter(c => c.pin === number)).toEqual([{ pin: number, name: pin, x, y }])
    expect(manifest().pinout[String(number)]).toBe(pin)
  })
})

describe('A11-COMP2 — asset pack CSA FROZEN', () => {
  it('asset directory contains exactly the frozen pack (required files + EXEC-004 report)', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    const integrity = json('ASSET-INTEGRITY.json')
    expect(integrity).toMatchObject({ asset: 'lm393p', status: 'CSA_LOCKED', physicalContactCount: 8, pinPitchPx: 12, runtimeCanvas: '84x64' })
    expect([...integrity.requiredFiles].sort()).toEqual(PACK.filter(f => f !== 'EXEC-004-FINAL-REPORT.txt').sort())
  })

  it('SHA256SUMS cover every payload except itself and match the files; ASSET-INTEGRITY agrees', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n').map(line => line.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(canonical(name)), name).toBe(sha)
    for (const [name, { sha256, bytes }] of Object.entries(json('ASSET-INTEGRITY.json').files)) {
      expect(hash(canonical(name)), name).toBe(sha256)
      expect(canonical(name).length, name).toBe(bytes)
    }
  })

  it('Founder PASS, manifest identity TI LM393P PDIP-8, pixel-probed CSA contact qualification', () => {
    const m = manifest()
    expect(m).toMatchObject({
      id: 'lm393p', manufacturer: 'Texas Instruments', manufacturerReference: 'LM393P', package: 'P / PDIP-8', pins: 8,
      backend: 'raster', canvasSize: { width: 84, height: 64 }, breadboardPitchPx: 12,
      founderReference: { file: 'lm393p.founder-reference.png', status: 'FOUNDER_PASS' },
      physicalContacts: { coordinateSpace: '84x64', pitchPx: 12, count: 8, status: 'CSA_LOCKED' },
    })
    expect(hash(readFileSync(asset('lm393p.founder-reference.png')))).toBe(m.founderReference.sha256)
    expect(hash(readFileSync(asset('lm393p.runtime-master.png')))).toBe(m.runtimeMaster.sha256)
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ reference: 'Texas Instruments LM393P', package: 'P / PDIP-8', status: 'FOUNDER_PASS' })
    // The LM393P pack WAS pixel-probed by the CSA (unlike LM339NE4's normalized geometry).
    expect(m.derivation.pixelProbe).toBe(true)
    expect(m.derivation.maxHorizontalDeltaPx).toBeLessThan(0.531)
    const validation = json('CONTACT-VALIDATION.json')
    expect(validation).toMatchObject({ status: 'PASS', coordinateSpace: '84x64', breadboardPitchPx: 12 })
    expect(validation.probe).toMatchObject({ exactCandidateXGrid: XS, visibleLeadSupportAll8: true, eightLeadsAccountedFor: 'PASS' })
    expect(validation.probe.maxAbsHorizontalErrorPx).toBe(m.derivation.maxHorizontalDeltaPx)
    expect(validation.geometryRules).toMatchObject({ perspectiveCorrection: false, anisotropicScaling: false, redraw: false })
  })

  it('runtime derivatives 84x64 at 1x and 252x192 at 3x', () => {
    for (const [file, format, expected] of [
      ['lm393p.default.1x.png', 'png', [84, 64]], ['lm393p.default.3x.png', 'png', [252, 192]],
      ['lm393p.default.1x.webp', 'webp', [84, 64]], ['lm393p.default.3x.webp', 'webp', [252, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
    expect(manifest().images).toEqual({
      '1x': { png: 'lm393p.default.1x.png', webp: 'lm393p.default.1x.webp' },
      '3x': { png: 'lm393p.default.3x.png', webp: 'lm393p.default.3x.webp' },
    })
  })
})

describe('A11-COMP2 — renderer, assembly and breadboard insertion', () => {
  it('renderer registered (raster) and renders only the frozen picture, no comparator logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: Lm393pPart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<Lm393pPart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['84px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([84, 64])
    const dir = '/assets/components/lm393p/'
    expect(img.getAttribute('src')).toBe(`${dir}lm393p.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}lm393p.default.1x.png 1x, ${dir}lm393p.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}lm393p.default.1x.webp 1x, ${dir}lm393p.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    const source = src('components', 'parts', 'Lm393pPart.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|inputVoltages|contribute|dcVoltage|simulat|useState|useEffect|founder-reference|runtime-master/i)
  })

  it('assembly profile = 8 metallic-wire leads rooted on the CSA LOCKED contacts, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual(DIP8.map(([, pin]) => pin).sort())
    for (const [, pin, x, y] of DIP8) {
      expect(profile.leads[pin]).toEqual({ root: { dx: x, dy: y }, style: 'metallic-wire' })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(8)
    for (const c of g.contacts) expect(c.root).toEqual(c.target)
  })

  it('straddling the trench, the 8 contacts resolve to 8 distinct strips (32 px rows: 2 px vertical residual)', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const def = getComponentDef(TYPE)
    let origin = null
    for (let x = -40; x <= 40 && !origin; x++) {
      for (let y = -10; y <= 120 && !origin; y++) {
        const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
        if (results.length !== 8 || !results.every(r => r.resolved && r.hole.kind === 'STRIP')
          || new Set(results.map(r => r.hole.groupKey)).size !== 8) continue
        const g = resolveAssemblyGeometry(createComponent(TYPE, x, y), bb)
        if (g.contacts.every(c => c.holePosition.x === c.target.x)) origin = { x, y }
      }
    }
    expect(origin).not.toBeNull()
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true })
    const g = resolveAssemblyGeometry(createComponent(TYPE, origin.x, origin.y), bb)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map(c => holeAt(bb, c.holePosition.x, c.holePosition.y).groupKey)).size).toBe(8)
    // Horizontal pitch is exact; the CSA rows (32 px apart) sit within 2 px of the trench holes (36 px apart).
    for (const c of g.contacts) {
      expect(c.holePosition.x).toBe(c.target.x)
      expect(Math.abs(c.holePosition.y - c.target.y)).toBeLessThanOrEqual(2)
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(8)
  })

  it('no LM393-specific branch in generic canvas, renderer, geometry or resolution code', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx'],
      ['simulator', 'resolution.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/LM393|Lm393|lm393/)
    }
  })
})
