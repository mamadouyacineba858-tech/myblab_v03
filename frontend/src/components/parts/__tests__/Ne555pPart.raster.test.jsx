import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ne555pPart } from '../Ne555pPart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation, getComponentByType } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { normalizeComponent } from '../../../utils/circuitModel.js'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'

/**
 * A11-COMP4 — TI NE555P P / PDIP-8 : asset CSA FROZEN V2 (Founder PASS, Founder Transparency PASS),
 * catalogue, PhysicalContacts CSA LOCKED normalisés (pixelProbed: false), renderer raster purement
 * visuel, assembly, insertion breadboard, round-trip document (T05, T06 of the ticket matrix).
 */

const TYPE = 'NE555P'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/ne555p')
const asset = name => resolve(ASSET_DIR, name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const manifest = () => json('manifest.json')
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
// Text payloads are LF in the frozen pack; a Windows checkout may present CRLF.
const canonical = name => /\.(json|md|txt)$/.test(name)
  ? Buffer.from(readFileSync(asset(name), 'utf8').replace(/\r\n/g, '\n'), 'utf8') : readFileSync(asset(name))
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt', 'manifest.json',
  'ne555p.default.1x.png', 'ne555p.default.1x.webp', 'ne555p.default.3x.png', 'ne555p.default.3x.webp',
  'ne555p.founder-reference.png', 'ne555p.runtime-master.png',
]
// Ticket R2 §4 : locked hashes of the frozen V2 pack.
const LOCKED = {
  'ne555p.founder-reference.png': '4251427db916bdc72363b17faa924ed84f6ca7b9d79b39a7c1b772055356b53f',
  'ne555p.default.1x.png': 'bbfe631efee71e91f11581e360c0b914ca952862059862c81d9317b0a95fb7cc',
  'ne555p.default.3x.png': 'efa89bb13c2bb77ce595aca8f16a720f29a7de5940c722d1431d1858c09f72af',
}
const REVOKED_ZIP_SHA256 = '6c8645cf5946215ce0bb1f61bfe63aa07ddb4e9bbc3bcee33c0647cff9d085e3'

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Ticket R2 §6/§7 : broche physique -> [pin canonique, x, y] (PhysicalContacts CSA LOCKED normalisés).
const DIP8 = [
  [1, 'GND', 24, 48], [2, 'TRIG', 36, 48], [3, 'OUT', 48, 48], [4, 'RESET', 60, 48],
  [5, 'CONT', 60, 16], [6, 'THRES', 48, 16], [7, 'DISCH', 36, 16], [8, 'VCC', 24, 16],
]
const XS = [24, 36, 48, 60]

describe('A11-COMP4 — catalogue, palette, PhysicalContacts and document round-trip (T06)', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)

  it('canonical box 84x64, label, manufacturer, single palette entry, visual contract box', () => {
    expect([def.width, def.height]).toEqual([84, 64])
    expect(def.label).toBe('NE555 Precision Timer')
    expect(def.manufacturer).toBe('Texas Instruments')
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE)).toEqual([expect.objectContaining({ box: [84, 64], physicalMm: null, impliedUnitsPerMm: null })])
    expect(SCALE_REFERENCE.find(r => r.type === TYPE).ref).toMatch(/Texas Instruments NE555P.*P \/ PDIP-8.*CSA frozen raster V2.*CSA normalized electrical geometry \(not pixel-probed\)/)
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 40, 80)
    expect(component).toMatchObject({ type: TYPE, x: 40, y: 80 })
    expect(component.pins.map(p => p.id)).toEqual(DIP8.map(([, pin]) => pin))
    expect(getCanonicalEntry(TYPE).pins.map(p => p.id)).toEqual(DIP8.map(([, pin]) => pin))
  })

  it('8 electrical pins, 8 PhysicalContacts, all wire-connectable and breadboard-insertable, no duplicate', () => {
    expect(def.pins).toHaveLength(8)
    expect(contacts).toHaveLength(8)
    expect(new Set(contacts.map(c => c.id)).size).toBe(8)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(8)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(8)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(8)
  })

  it('bottom row y=48 (1..4), top row y=16 (8..5), left -> right, pitch 12, row spacing 32', () => {
    const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)
    expect(byX(48).map(c => c.id)).toEqual(DIP8.slice(0, 4).map(([, pin]) => pin))
    expect(byX(16).map(c => c.id)).toEqual(DIP8.slice(4).reverse().map(([, pin]) => pin))
    for (const y of [16, 48]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(48 - 16).toBe(manifest().geometryBasis.rowSpacingPx)
  })

  it.each(DIP8)('pin %i %s is exactly at its CSA LOCKED coordinate from the pack', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.filter(c => c.pin === number)).toEqual([{ pin: number, name: pin, x, y }])
    expect(json('CONTACT-VALIDATION.json').contacts.filter(c => c.pin === number)).toEqual([{ pin: number, name: pin, x, y }])
    expect(manifest().pinout[String(number)]).toBe(pin)
  })

  it('document round-trip: createComponent -> JSON -> normalizeComponent keeps type and pins, no runtime latch', () => {
    const component = { ...createComponent(TYPE, 36, 60), uid: 'ne555-1', parameters: {} }
    const restored = normalizeComponent(JSON.parse(JSON.stringify(component)))
    expect(restored).toMatchObject({ uid: 'ne555-1', type: TYPE, x: 36, y: 60 })
    expect(restored.pins.map(p => p.id)).toEqual(DIP8.map(([, pin]) => pin))
    expect(normalizeComponent(JSON.parse(JSON.stringify(restored)))).toEqual(restored)
    expect(restored).not.toHaveProperty('state')
    expect(JSON.stringify(restored)).not.toMatch(/latch/i)
  })
})

describe('A11-COMP4 — asset pack CSA FROZEN V2 (T05)', () => {
  it('asset directory contains exactly the 13 frozen files', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    expect(PACK).toHaveLength(13)
  })

  it('SHA256SUMS cover every payload except itself and match the files ; locked hashes unchanged', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n').map(line => line.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(canonical(name)), name).toBe(sha)
    for (const [name, sha] of Object.entries(LOCKED)) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    expect(json('FOUNDER-ASSET.json').sha256).toBe(LOCKED['ne555p.founder-reference.png'])
  })

  it('manifest identity TI NE555P PDIP-8, CSA normalized (not pixel-probed) geometry, no forbidden derivation', () => {
    const m = manifest()
    expect(m).toMatchObject({
      id: 'ne555p', status: 'CSA_FROZEN', manufacturer: 'Texas Instruments', manufacturerReference: 'NE555P', package: 'P / PDIP-8',
      canvasSize: { width: 84, height: 64 }, canvasSize3x: { width: 252, height: 192 }, breadboardPitchPx: 12,
    })
    expect(m.geometryBasis).toMatchObject({ coordinateSpace: '84x64', pitchPx: 12, rowSpacingPx: 32, pixelProbed: false, authority: 'CSA_NORMALIZED' })
    expect(m.derivation).toMatchObject({ isotropicScaling: true, anisotropicScaling: false, perLeadRelocation: false, syntheticLeadRecomposition: false, pixelProbeClaim: false })
    expect(json('CONTACT-VALIDATION.json')).toMatchObject({ status: 'CSA_LOCKED', coordinateSpace: '84x64', pitchPx: 12, rowSpacingPx: 32, pixelProbed: false })
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ asset: 'ne555p', status: 'FOUNDER_PASS', reference: 'ne555p.founder-reference.png' })
    const integrity = json('ASSET-INTEGRITY.json')
    expect(integrity).toMatchObject({ status: 'CSA_FROZEN', founderTransparencyGate: 'PASS', physicalContactCount: 8, runtimeCanvas: '84x64', revokedZipSha256: REVOKED_ZIP_SHA256 })
    expect([...integrity.requiredFiles].sort()).toEqual([...PACK].sort())
    expect(integrity.transparency).toEqual({ founderHasAlpha: true, runtime1xHasAlpha: true, runtime3xHasAlpha: true })
  })

  it('runtime derivatives 84x64 at 1x and 252x192 at 3x, RGBA PNG (transparent background)', () => {
    for (const [file, format, expected] of [
      ['ne555p.default.1x.png', 'png', [84, 64]], ['ne555p.default.3x.png', 'png', [252, 192]],
      ['ne555p.default.1x.webp', 'webp', [84, 64]], ['ne555p.default.3x.webp', 'webp', [252, 192]],
      ['ne555p.runtime-master.png', 'png', [252, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
    for (const file of ['ne555p.default.1x.png', 'ne555p.default.3x.png', 'ne555p.founder-reference.png']) {
      expect(readFileSync(asset(file))[25], file).toBe(6)
    }
    expect(manifest().images).toEqual({
      founderReference: 'ne555p.founder-reference.png',
      runtimeMaster: 'ne555p.runtime-master.png',
      '1x': { png: 'ne555p.default.1x.png', webp: 'ne555p.default.1x.webp' },
      '3x': { png: 'ne555p.default.3x.png', webp: 'ne555p.default.3x.webp' },
    })
  })
})

describe('A11-COMP4 — renderer, assembly and breadboard insertion', () => {
  it('renderer registered (raster) and renders only the frozen picture, no timer logic', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: Ne555pPart, visual: { backend: 'raster' } },
    ])
    expect(getComponentByType(TYPE)).toBe(Ne555pPart)
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<Ne555pPart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect(root.getAttribute('aria-label')).toBe('NE555 Precision Timer')
    expect([root.style.width, root.style.height]).toEqual(['84px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([84, 64])
    expect(img.style.objectFit).toBe('contain')
    const dir = '/assets/components/ne555p/'
    expect(img.getAttribute('src')).toBe(`${dir}ne555p.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}ne555p.default.1x.png 1x, ${dir}ne555p.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}ne555p.default.1x.webp 1x, ${dir}ne555p.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    const source = src('components', 'parts', 'Ne555pPart.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|pinVoltages|latch|contribute|mixedSignal|simulat|useState|useEffect|founder-reference|runtime-master/i)
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
    for (const c of g.contacts) {
      expect(c.holePosition.x).toBe(c.target.x)
      expect(Math.abs(c.holePosition.y - c.target.y)).toBeLessThanOrEqual(2)
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(8)
  })

  it('no NE555P-specific branch in generic canvas, renderer, geometry or resolution code', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['utils', 'circuitModel.js'],
      ['components', 'assembly', 'AssemblyLeadsLayer.jsx'], ['simulator', 'resolution.js'], ['simulator', 'simulationRuntimeIntegration.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/NE555|Ne555|ne555/)
    }
  })
})
