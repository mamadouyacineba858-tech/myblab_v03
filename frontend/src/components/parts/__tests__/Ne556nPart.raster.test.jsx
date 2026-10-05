import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ne556nPart } from '../Ne556nPart.jsx'
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
 * A11-COMP5 — TI NE556N N / PDIP-14 : pack CSA QUALIFIED CANDIDATE (Founder Canvas PENDING),
 * catalogue, PhysicalContacts CSA LOCKED, renderer raster purement visuel, assembly, insertion
 * breadboard (A01..A24). La géométrie est RE-MESURÉE sur le PNG livré (décodage réel), jamais
 * seulement lue dans manifest.json.
 */

const TYPE = 'NE556N'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/ne556n')
const asset = name => resolve(ASSET_DIR, name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const manifest = () => json('manifest.json')
const hash = data => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
// Text payloads are LF in the candidate pack; a Windows checkout may present CRLF.
const canonical = name => /\.(json|md|txt)$/.test(name)
  ? Buffer.from(readFileSync(asset(name), 'utf8').replace(/\r\n/g, '\n'), 'utf8') : readFileSync(asset(name))
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt', 'manifest.json',
  'ne556n.default.1x.png', 'ne556n.default.1x.webp', 'ne556n.default.3x.png', 'ne556n.default.3x.webp',
  'ne556n.founder-reference.png', 'ne556n.runtime-master.png',
]
// Ticket A11-COMP5 §6 : locked hashes of the CSA candidate pack.
const LOCKED = {
  'ne556n.default.1x.png': 'e550fbe2df221f5ea09cfc807b714a0f74495c7638d0f5855adcd3a5e10dfa37',
  'ne556n.default.3x.png': '3df8eeb157499f20fd0cd315c9b43edc5f9f0aa0168ddafa6af83d16a1896458',
  'ne556n.founder-reference.png': 'c88396b75466c7fdb06abde18d1a47f6a57e1f126fa45376d3ef13b305e69eed',
}
const CANDIDATE_STATUS = 'CSA_QUALIFIED_CANDIDATE_PENDING_CANVAS'

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

// Same probe criterion as the NE555P V3 raster test : lead metal = alpha>=128, max(RGB)>=100,
// min(RGB)>=60, rows contactY*3 ± 3, columns target ± 18 (3x = ± half a pitch).
const isLeadMetal = ([r, g, b, a]) => a >= 128 && Math.max(r, g, b) >= 100 && Math.min(r, g, b) >= 60
const isDarkBody = ([r, g, b, a]) => a >= 200 && Math.max(r, g, b) < 90
/** Centre of the lead metal in continuous image coordinates (pixel i covers [i, i + 1)). */
function probeLeadCentre3x(img, x1, y1) {
  const xs = []
  for (let y = y1 * 3 - 3; y <= y1 * 3 + 3; y++) {
    for (let x = x1 * 3 - 18; x <= x1 * 3 + 18; x++) if (isLeadMetal(img.rgba(x, y))) xs.push(x + 0.5)
  }
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN
}

// Ticket §4/§5 : broche physique -> [pin canonique, x, y] (PhysicalContacts CSA LOCKED).
const DIP14 = [
  [1, '1DISCH', 18, 48], [2, '1THRES', 30, 48], [3, '1CONT', 42, 48], [4, '1RESET', 54, 48],
  [5, '1OUT', 66, 48], [6, '1TRIG', 78, 48], [7, 'GND', 90, 48],
  [8, '2TRIG', 90, 16], [9, '2OUT', 78, 16], [10, '2RESET', 66, 16], [11, '2CONT', 54, 16],
  [12, '2THRES', 42, 16], [13, '2DISCH', 30, 16], [14, 'VCC', 18, 16],
]
const XS = [18, 30, 42, 54, 66, 78, 90]
const PINS = DIP14.map(([, pin]) => pin)

describe('A11-COMP5 NE556N — asset pack CSA candidate (A01..A07, A18..A20, A24)', () => {
  it('A01 asset directory contains exactly the 13 candidate files', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    expect(PACK).toHaveLength(13)
  })

  it('A02/A03/A04 manifest identity NE556N, Texas Instruments, N / PDIP-14', () => {
    expect(manifest()).toMatchObject({ id: TYPE, manufacturer: 'Texas Instruments', reference: 'NE556N', package: 'N / PDIP-14' })
  })

  it('A05/A06 runtime derivatives 120x64 at 1x and 360x192 at 3x (PNG and WebP), master = 3x', () => {
    expect(manifest().runtime).toEqual({ width: 120, height: 64, width3x: 360, height3x: 192 })
    for (const [file, format, expected] of [
      ['ne556n.default.1x.png', 'png', [120, 64]], ['ne556n.default.3x.png', 'png', [360, 192]],
      ['ne556n.default.1x.webp', 'webp', [120, 64]], ['ne556n.default.3x.webp', 'webp', [360, 192]],
      ['ne556n.runtime-master.png', 'png', [360, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })

  it('A07 RGBA PNG with a transparent background (decoded corners alpha 0)', () => {
    for (const file of ['ne556n.default.1x.png', 'ne556n.default.3x.png', 'ne556n.founder-reference.png']) {
      expect(readFileSync(asset(file))[25], file).toBe(6)
    }
    for (const [file, w, h] of [['ne556n.default.1x.png', 120, 64], ['ne556n.default.3x.png', 360, 192]]) {
      const img = decodePngRgba(readFileSync(asset(file)))
      expect([img.width, img.height], file).toEqual([w, h])
      for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) expect(img.rgba(x, y)[3], `${file} corner`).toBe(0)
    }
  })

  it('A18/A19/A20 locked hashes (1x, 3x, Founder reference) ; SHA256SUMS and ASSET-INTEGRITY match every payload', () => {
    for (const [name, sha] of Object.entries(LOCKED)) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    expect(hash(readFileSync(asset('ne556n.runtime-master.png')))).toBe(LOCKED['ne556n.default.3x.png'])
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split(/\r?\n/).map(line => line.trim().split(/\s+/))
    // SHA256SUMS covers every payload except itself and ASSET-INTEGRITY.json (which covers SHA256SUMS).
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter(f => f !== 'SHA256SUMS.txt' && f !== 'ASSET-INTEGRITY.json').sort())
    for (const [sha, name] of listed) expect(hash(canonical(name)), name).toBe(sha)
    const integrity = json('ASSET-INTEGRITY.json')
    expect(Object.keys(integrity.files).sort()).toEqual(PACK.filter(f => f !== 'ASSET-INTEGRITY.json').sort())
    for (const [name, sha] of Object.entries(integrity.files)) expect(hash(canonical(name)), name).toBe(sha)
  })

  it('A24 governance status stays CSA QUALIFIED CANDIDATE, Founder Canvas PENDING (never FROZEN / PASS)', () => {
    expect(manifest().status).toBe(CANDIDATE_STATUS)
    expect(json('ASSET-INTEGRITY.json').status).toBe(CANDIDATE_STATUS)
    expect(json('CONTACT-VALIDATION.json')).toMatchObject({ status: 'PASS_PRE_CANVAS', finalCanvasGate: 'PENDING' })
    expect(json('FOUNDER-ASSET.json')).toEqual({ status: 'FOUNDER_VISUAL_DIRECTION_PASS', orientation: 'horizontal', finalCanvasGate: 'PENDING' })
    for (const name of ['manifest.json', 'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json']) {
      expect(readFileSync(asset(name), 'utf8'), name).not.toMatch(/FROZEN|CANVAS_PASS|"finalCanvasGate":\s*"PASS"/)
    }
  })
})

describe('A11-COMP5 NE556N — catalogue and PhysicalContacts (A08..A13)', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)
  const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)

  it('canonical box 120x64, label, manufacturer, single palette entry', () => {
    expect([def.width, def.height]).toEqual([120, 64])
    expect(def.label).toBe('NE556 Dual Precision Timer')
    expect(def.manufacturer).toBe('Texas Instruments')
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
  })

  it('A08 14 electrical pins, 14 PhysicalContacts, all wire-connectable and breadboard-insertable, no duplicate', () => {
    expect(def.pins).toHaveLength(14)
    expect(contacts).toHaveLength(14)
    expect(new Set(contacts.map(c => c.id)).size).toBe(14)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(14)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(14)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(14)
  })

  it('A09 exact pin identities in physical order 1..14 (catalogue, canonical, created component)', () => {
    expect(def.pins.map(p => p.id)).toEqual(PINS)
    expect(getCanonicalEntry(TYPE).pins.map(p => p.id)).toEqual(PINS)
    expect(createComponent(TYPE, 0, 0).pins.map(p => p.id)).toEqual(PINS)
  })

  it.each(DIP14)('A10 pin %i %s is exactly at its CSA LOCKED coordinate (catalogue == pack manifest)', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts.filter(c => c.id === pin)).toEqual([{ id: pin, dx: x, dy: y }])
  })

  it('A10 the pack declares exactly the 14 locked contacts, nothing else', () => {
    const key = c => c.id
    expect([...manifest().physicalContacts].sort((a, b) => key(a).localeCompare(key(b))))
      .toEqual(DIP14.map(([, id, dx, dy]) => ({ id, dx, dy })).sort((a, b) => key(a).localeCompare(key(b))))
  })

  it('A11/A12/A13 bottom row y=48 (1..7), top row y=16 (14..8), left -> right x=18..90, exact 12 px pitch', () => {
    expect(byX(48).map(c => c.id)).toEqual(PINS.slice(0, 7))
    expect(byX(16).map(c => c.id)).toEqual(PINS.slice(7).reverse())
    for (const y of [16, 48]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(BREADBOARD_PITCH).toBe(12)
    expect(manifest().geometryBasis).toMatchObject({ pixelProbed: true, breadboardPitchPx1x: 12, targetsPx3x: XS.map(x => x * 3) })
  })

  it('document round-trip keeps type and pins, never a runtime latch', () => {
    const component = { ...createComponent(TYPE, 36, 60), uid: 'ne556-1', parameters: {} }
    const restored = normalizeComponent(JSON.parse(JSON.stringify(component)))
    expect(restored).toMatchObject({ uid: 'ne556-1', type: TYPE, x: 36, y: 60 })
    expect(restored.pins.map(p => p.id)).toEqual(PINS)
    expect(normalizeComponent(JSON.parse(JSON.stringify(restored)))).toEqual(restored)
    expect(restored).not.toHaveProperty('state')
    expect(JSON.stringify(restored)).not.toMatch(/latch|timer1|timer2/i)
  })
})

describe('A11-COMP5 NE556N — geometry measured on the delivered 3x raster (A14..A17)', () => {
  const img = decodePngRgba(readFileSync(asset('ne556n.default.3x.png')))
  const basis = manifest().geometryBasis

  it.each([['A14 top', 16, 'topCentersPx3x'], ['A15 bottom', 48, 'bottomCentersPx3x']])(
    '%s row (y=%i): the 7 visible leads are centred on the 12 px contacts (measured, max error 0.5 px @3x)', (_, y, key) => {
      const measured = XS.map(x => probeLeadCentre3x(img, x, y))
      measured.forEach((c, i) => {
        expect(Number.isFinite(c)).toBe(true)
        expect(Math.abs(c - XS[i] * 3)).toBeLessThanOrEqual(0.5)
        // The pack claim is checked against the measurement, never the other way round.
        expect(Math.abs(c - basis[key][i])).toBeLessThanOrEqual(0.5)
      })
      // left -> right, one lead per 12 px column : visible pitch == electrical pitch.
      measured.slice(1).forEach((c, i) => expect(Math.abs((c - measured[i]) / 3 - BREADBOARD_PITCH)).toBeLessThanOrEqual(0.5))
    })

  it.each(DIP14)('A16/A17 pin %i %s : insertion point shows lead metal, not the opaque body', (_, pin, x, y) => {
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

  it('A17 the dark body lies strictly between the contact rows y=16 and y=48', () => {
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

describe('A11-COMP5 NE556N — renderer, assembly, visual contract, breadboard (A21..A23)', () => {
  it('A21 renderer registered (raster) and renders only the candidate picture from /assets/components/ne556n/', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: Ne556nPart, visual: { backend: 'raster' } },
    ])
    expect(getComponentByType(TYPE)).toBe(Ne556nPart)
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<Ne556nPart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect(root.getAttribute('aria-label')).toBe('NE556 Dual Precision Timer')
    expect([root.style.width, root.style.height]).toEqual(['120px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([120, 64])
    expect(img.style.objectFit).toBe('contain')
    const dir = '/assets/components/ne556n/'
    expect(img.getAttribute('src')).toBe(`${dir}ne556n.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}ne556n.default.1x.png 1x, ${dir}ne556n.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}ne556n.default.1x.webp 1x, ${dir}ne556n.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
    const source = src('components', 'parts', 'Ne556nPart.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|pinVoltages|latch|timer1|timer2|contribute|mixedSignal|simulat|useState|useEffect|founder-reference|runtime-master/i)
  })

  it('A22 assembly profile = 14 metallic-wire leads rooted exactly on the PhysicalContacts, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual([...PINS].sort())
    const contacts = getComponentDef(TYPE).pins.flatMap(resolveContacts)
    for (const [, pin, x, y] of DIP14) {
      expect(profile.leads[pin]).toEqual({ root: { dx: x, dy: y }, style: 'metallic-wire' })
      const contact = contacts.find(c => c.id === pin)
      expect(profile.leads[pin].root).toEqual({ dx: contact.dx, dy: contact.dy })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(14)
    for (const c of g.contacts) expect(c.root).toEqual(c.target)
  })

  it('A23 visual contract : box 120x64, physical scale uncalibrated, candidate raster, Founder Canvas pending', () => {
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE)).toEqual([expect.objectContaining({ box: [120, 64], physicalMm: null, impliedUnitsPerMm: null })])
    const ref = SCALE_REFERENCE.find(r => r.type === TYPE).ref
    expect(ref).toMatch(/Texas Instruments NE556N.*N \/ PDIP-14.*CSA candidate raster.*Founder Canvas pending.*pixel-probed/)
    expect(ref).not.toMatch(/Canvas PASS|FROZEN|frozen/)
  })

  it('straddling the trench, the 14 contacts resolve to 14 distinct strips (32 px rows: 2 px vertical residual)', () => {
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
    for (const c of g.contacts) {
      expect(c.holePosition.x).toBe(c.target.x)
      expect(Math.abs(c.holePosition.y - c.target.y)).toBeLessThanOrEqual(2)
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(14)
  })

  it('no NE556N-specific branch in generic canvas, renderer, geometry or resolution code', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['utils', 'circuitModel.js'],
      ['components', 'assembly', 'AssemblyLeadsLayer.jsx'], ['simulator', 'resolution.js'], ['simulator', 'simulationRuntimeIntegration.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/NE556|Ne556|ne556/)
    }
  })
})
