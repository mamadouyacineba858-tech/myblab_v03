import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
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
 * A11-COMP4 — TI NE555P P / PDIP-8 : asset CSA V3 (runtime normalisé sur la géométrie DIP-8
 * canonique, pixel-probé ; Founder reference V2 préservée), catalogue, PhysicalContacts CSA LOCKED,
 * renderer raster purement visuel, assembly, insertion breadboard, round-trip document.
 * A11-COMP4-NE555P-ASSET-V3-INTEGRATION-001 : V2 (intègre, mais pas visible ≈ 15.9 px et corps opaque
 * sur les rangées y=16 / y=48) reste une provenance historique, SUPERSEDED pour la géométrie runtime.
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
// V3-INTEGRATION-001 §5 : locked hashes of the V3 pack (Founder reference byte-identical to V2).
const LOCKED = {
  'ne555p.founder-reference.png': '4251427db916bdc72363b17faa924ed84f6ca7b9d79b39a7c1b772055356b53f',
  'ne555p.default.1x.png': '87c7c7bd7c4b61cf2b402e8a99bed472afca9027045b90b9ce30c5da3ae5408b',
  'ne555p.default.3x.png': '57e4076835dfdb838dbf208d692665b0d81281e547c7415347844dfe4a2d0c15',
}
// V2 runtime rasters, superseded: the installed runtime must no longer be V2.
const V2_RUNTIME = {
  'ne555p.default.1x.png': 'bbfe631efee71e91f11581e360c0b914ca952862059862c81d9317b0a95fb7cc',
  'ne555p.default.3x.png': 'efa89bb13c2bb77ce595aca8f16a720f29a7de5940c722d1431d1858c09f72af',
}
const V2_ZIP_SHA256 = 'bcabcdf2ea69ea27927c6cffca7ea051477f4069888afee722bdb96d5801f15d'

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Minimal PNG RGBA8 decoder: concatenate IDAT chunks, zlib-inflate, then
// un-filter each scanline (None/Sub/Up/Average/Paeth) per the PNG spec.
function decodePngRgba(raw) {
  const w = raw.readUInt32BE(16)
  const h = raw.readUInt32BE(20)
  if (raw[24] !== 8 || raw[25] !== 6 || raw[28] !== 0) throw new Error('expected 8-bit non-interlaced RGBA PNG')
  const idat = []
  let off = 8
  while (off < raw.length) {
    const len = raw.readUInt32BE(off)
    const type = raw.toString('ascii', off + 4, off + 8)
    if (type === 'IDAT') idat.push(raw.subarray(off + 8, off + 8 + len))
    off += 12 + len
  }
  const raw2 = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = w * bpp
  const out = Buffer.alloc(h * stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < h; y++) {
    const filter = raw2[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const cur = raw2[src + x]
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let value
      if (filter === 0) value = cur
      else if (filter === 1) value = cur + a
      else if (filter === 2) value = cur + b
      else if (filter === 3) value = cur + Math.floor((a + b) / 2)
      else if (filter === 4) value = cur + paeth(a, b, c)
      else throw new Error(`unsupported PNG filter ${filter}`)
      out[y * stride + x] = value & 0xff
    }
  }
  return { width: w, height: h, rgba: (x, y) => [...out.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)] }
}

// V3 qualification probe (manifest geometryBasis.probe.criterion), re-run on the installed 3x raster:
// lead metal = alpha>=128, max(RGB)>=100, min(RGB)>=60, rows contactY*3 ± 3, columns target ± 18 (3x).
const isLeadMetal = ([r, g, b, a]) => a >= 128 && Math.max(r, g, b) >= 100 && Math.min(r, g, b) >= 60
const isDarkBody = ([r, g, b, a]) => a >= 200 && Math.max(r, g, b) < 90
function probeLeadCentre3x(img, x1, y1) {
  const xs = []
  for (let y = y1 * 3 - 3; y <= y1 * 3 + 3; y++) {
    for (let x = x1 * 3 - 18; x <= x1 * 3 + 18; x++) if (isLeadMetal(img.rgba(x, y))) xs.push(x)
  }
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN
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
    const ref = SCALE_REFERENCE.find(r => r.type === TYPE).ref
    expect(ref).toMatch(/Texas Instruments NE555P.*P \/ PDIP-8.*CSA raster V3 \(Founder Canvas PASS\).*CSA qualified electrical geometry \(pixel-probed, max 0\.144 px\)/)
    expect(ref).not.toMatch(/V2|not pixel-probed/)
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
    expect(json('CONTACT-VALIDATION.json')).toMatchObject({ pitch1x: BREADBOARD_PITCH, rows1x: { top: 16, bottom: 48 } })
  })

  it.each(DIP8)('pin %i %s is exactly at its CSA LOCKED coordinate from the pack', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.filter(c => c.pin === pin)).toEqual([{ pin, x, y }])
    expect(json('CONTACT-VALIDATION.json').contacts.filter(c => c.pin === pin)).toEqual([{ pin, x, y }])
  })

  it('the pack declares exactly the 8 locked contacts, nothing else', () => {
    const expected = DIP8.map(([, pin, x, y]) => ({ pin, x, y })).sort((a, b) => a.pin.localeCompare(b.pin))
    const sorted = list => [...list].sort((a, b) => a.pin.localeCompare(b.pin))
    expect(sorted(manifest().physicalContacts)).toEqual(expected)
    expect(sorted(json('CONTACT-VALIDATION.json').contacts)).toEqual(expected)
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

describe('A11-COMP4 — asset pack CSA V3 (T05)', () => {
  it('asset directory contains exactly the 13 V3 files', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    expect(PACK).toHaveLength(13)
  })

  it('SHA256SUMS cover every payload except itself and match the files ; locked hashes unchanged', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n').map(line => line.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(canonical(name)), name).toBe(sha)
    for (const [name, sha] of Object.entries(LOCKED)) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    for (const [name, sha] of Object.entries(V2_RUNTIME)) expect(hash(readFileSync(asset(name))), name).not.toBe(sha)
    expect(hash(readFileSync(asset('ne555p.runtime-master.png')))).toBe(LOCKED['ne555p.default.3x.png'])
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ status: 'FOUNDER_VISUAL_DIRECTION_PASS', referenceFile: 'ne555p.founder-reference.png' })
  })

  it('manifest identity TI NE555P PDIP-8, pixel-probed V3 geometry, V2 kept as superseded provenance', () => {
    const m = manifest()
    expect(m).toMatchObject({
      id: TYPE, reference: 'Texas Instruments NE555P', package: 'P / PDIP-8',
      runtime: { width: 84, height: 64, width3x: 252, height3x: 192 },
    })
    expect(m.geometryBasis.pixelProbed).toBe(true)
    expect(m.geometryBasis.probe.targetsPx3x).toEqual(XS.map(x => x * 3))
    expect(m.geometryBasis.probe.maxAbsErrorPx1x).toBeLessThanOrEqual(0.5)
    expect(m.provenance).toEqual({
      founderReference: 'preserved byte-for-byte from V2', v2ZipSha256: V2_ZIP_SHA256,
      v2Status: 'SUPERSEDED_FOR_RUNTIME_GEOMETRY', v3Status: 'CSA_FROZEN_CANDIDATE',
    })
    expect(json('CONTACT-VALIDATION.json')).toMatchObject({
      status: 'PASS', canvas1x: [84, 64], canvas3x: [252, 192], contactPixelsAreMetalNotBody: true, frozenV2WasNotOverwritten: true,
    })
    expect(json('CONTACT-VALIDATION.json').probe3x).toEqual(m.geometryBasis.probe)
    expect(json('ASSET-INTEGRITY.json')).toMatchObject({
      v2CanonicalZipSha256: V2_ZIP_SHA256, v2Disposition: 'PRESERVED_HISTORICAL_EVIDENCE_SUPERSEDED_FOR_RUNTIME_GEOMETRY',
    })
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
    for (const [file, w, h] of [['ne555p.default.1x.png', 84, 64], ['ne555p.default.3x.png', 252, 192]]) {
      const img = decodePngRgba(readFileSync(asset(file)))
      expect([img.width, img.height], file).toEqual([w, h])
      for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) expect(img.rgba(x, y)[3], `${file} corner`).toBe(0)
    }
  })
})

describe('A11-COMP4 — V3 breadboard geometry, measured on the installed 3x raster', () => {
  const img = decodePngRgba(readFileSync(asset('ne555p.default.3x.png')))
  const probe = manifest().geometryBasis.probe

  it.each([['top', 16, 'topCentersPx3x'], ['bottom', 48, 'bottomCentersPx3x']])(
    '%s row (y=%i): the 4 visible leads sit on the 12 px contacts, max error <= 0.50 px @1x', (_, y, key) => {
      const measured = XS.map(x => probeLeadCentre3x(img, x, y))
      measured.forEach((c, i) => {
        expect(Number.isFinite(c)).toBe(true)
        expect(Math.abs(c - XS[i] * 3) / 3).toBeLessThanOrEqual(0.5)
        expect(c).toBeCloseTo(probe[key][i], 2)
      })
      // left -> right, one lead per 12 px column: no permutation, visible pitch == electrical pitch
      measured.slice(1).forEach((c, i) => expect(Math.abs((c - measured[i]) / 3 - BREADBOARD_PITCH)).toBeLessThanOrEqual(1))
    })

  it.each(DIP8)('pin %i %s : insertion point shows lead metal, not the opaque body', (_, pin, x, y) => {
    let metal = 0, body = 0
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const px = img.rgba(x * 3 + dx, y * 3 + dy)
        if (isLeadMetal(px)) metal += 1
        if (isDarkBody(px)) body += 1
      }
    }
    expect(body, pin).toBe(0)
    expect(metal, pin).toBe(49)
  })

  it('the dark body lies strictly between the contact rows y=16 and y=48', () => {
    const rows = []
    for (let y = 0; y < img.height; y++) {
      let dark = 0
      for (let x = 0; x < img.width; x++) if (isDarkBody(img.rgba(x, y))) dark += 1
      if (dark > img.width / 2) rows.push(y)
    }
    expect(rows.length).toBeGreaterThan(0)
    expect(Math.min(...rows) / 3).toBeGreaterThan(16)
    expect(Math.max(...rows) / 3).toBeLessThan(48)
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
