import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FourN35Part } from '../FourN35Part.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation, getComponentByType } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS, COMPONENT_TYPES } from '../../../config/componentDefinitions.js'
import { normalizeComponent } from '../../../utils/circuitModel.js'
import { getCanonicalEntry } from '../../../simulator/canonicalRegistry.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'

/**
 * A11-COMP6 — 4N35 optocoupler DIP-6 : pack V3 CSA FROZEN (Founder Canvas PASS), catalogue,
 * PhysicalContacts CSA LOCKED, renderer raster purement visuel, assembly, insertion breadboard.
 * Les octets raster gelés sont vérifiés sur les fichiers livrés, jamais seulement lus dans manifest.json.
 */

const TYPE = '4N35'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/4n35')
const asset = name => resolve(ASSET_DIR, name)
// The frozen pack metadata is UTF-8 with BOM.
const json = name => JSON.parse(readFileSync(asset(name), 'utf8').replace(/^\uFEFF/, ''))
const manifest = () => json('manifest.json')
const hash = data => createHash('sha256').update(data).digest('hex').toUpperCase()
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt', 'manifest.json',
  '4n35.default.1x.png', '4n35.default.1x.webp', '4n35.default.3x.png', '4n35.default.3x.webp',
  '4n35.runtime-master.png', '4n35.founder-reference.png',
]
// Ticket A11-COMP6 §2 : CSA frozen raster hashes (A11-COMP6-4N35-ASSET-FREEZE-001).
const LOCKED = {
  '4n35.default.1x.png': '8BA963E89672A47170D168FD8FEBF82C21244F02651AF759097C3B702C6F1CF9',
  '4n35.default.3x.png': 'AC6F1674817D8D2599359837645FC55421AD9FE4DB832757C32228CED667106C',
  '4n35.founder-reference.png': '0796A2869E45159B1460E2D67B75C7A7B44B64812AA05D94A1C9DF7E3921402B',
}
const RASTERS = PACK.filter(name => /\.(png|webp)$/.test(name))

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

// Ticket §4/§9 : broche physique -> [pin canonique, x, y] (PhysicalContacts CSA LOCKED).
const DIP6 = [[1, 'A', 24, 48], [2, 'K', 36, 48], [3, 'NC', 48, 48], [4, 'E', 48, 16], [5, 'C', 36, 16], [6, 'B', 24, 16]]
const XS = [24, 36, 48]
const PINS = DIP6.map(([, pin]) => pin)

describe('A11-COMP6 4N35 — asset pack V3 CSA FROZEN', () => {
  it('asset directory contains exactly the 13 frozen pack files, no unexpected raster', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
    expect(readdirSync(ASSET_DIR).filter(name => /\.(png|webp|jpe?g|gif|svg|avif)$/i.test(name)).sort()).toEqual([...RASTERS].sort())
  })

  it('runtime derivatives 72x64 at 1x and 216x192 at 3x (PNG and WebP), master = 3x', () => {
    expect(manifest().runtime).toMatchObject({ size1x: [72, 64], size3x: [216, 192], redrawnLeads: false })
    for (const [file, format, expected] of [
      ['4n35.default.1x.png', 'png', [72, 64]], ['4n35.default.3x.png', 'png', [216, 192]],
      ['4n35.default.1x.webp', 'webp', [72, 64]], ['4n35.default.3x.webp', 'webp', [216, 192]],
      ['4n35.runtime-master.png', 'png', [216, 192]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })

  it('RGBA runtime PNG with a transparent background (decoded corners alpha 0)', () => {
    for (const [file, w, h] of [['4n35.default.1x.png', 72, 64], ['4n35.default.3x.png', 216, 192]]) {
      const img = decodePngRgba(readFileSync(asset(file)))
      expect([img.width, img.height], file).toEqual([w, h])
      for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) expect(img.rgba(x, y)[3], `${file} corner`).toBe(0)
    }
  })

  it('frozen raster bytes: locked hashes, master == 3x, every raster matches ASSET-INTEGRITY', () => {
    for (const [name, sha] of Object.entries(LOCKED)) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    expect(hash(readFileSync(asset('4n35.runtime-master.png')))).toBe(LOCKED['4n35.default.3x.png'])
    const integrity = json('ASSET-INTEGRITY.json')
    expect(integrity).toMatchObject({ ticket: 'A11-COMP6-4N35-ASSET-FREEZE-001', status: 'CSA_FROZEN_FOUNDER_CANVAS_PASS', component: TYPE })
    const files = integrity.immutableRasterFiles
    expect(files.map(f => f.file).sort()).toEqual([...RASTERS].sort())
    for (const { file, sha256 } of files) expect(hash(readFileSync(asset(file))), file).toBe(sha256)
  })

  it('governance: CSA_FROZEN_FOUNDER_CANVAS_PASS, Founder Canvas PASS, freeze gate and Founder hash exact', () => {
    expect(manifest()).toMatchObject({
      component: TYPE, package: 'DIP-6', status: 'CSA_FROZEN_FOUNDER_CANVAS_PASS', founderCanvas: 'PASS',
      freezeGate: 'A11-COMP6-4N35-ASSET-FREEZE-001', founderVisualSha256: LOCKED['4n35.founder-reference.png'],
    })
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ status: 'FOUNDER_VISUAL_AND_CANVAS_PASS', sha256: LOCKED['4n35.founder-reference.png'], canvasGate: 'PASS' })
  })
})

describe('A11-COMP6 4N35 — catalogue and PhysicalContacts', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap(resolveContacts)
  const byX = y => contacts.filter(c => c.dy === y).sort((a, b) => a.dx - b.dx)

  it('type and palette entry present exactly once; box 72x64, label', () => {
    expect(Object.keys(COMPONENT_TYPES).filter(t => t === TYPE)).toHaveLength(1)
    expect(PALETTE_ITEMS.filter(p => p.id === TYPE)).toHaveLength(1)
    expect([def.width, def.height]).toEqual([72, 64])
    expect(def.label).toBe('4N35 Optocoupler')
  })

  it('6 electrical pins, 6 PhysicalContacts, all wire-connectable and breadboard-insertable, no duplicate', () => {
    expect(def.pins).toHaveLength(6)
    expect(contacts).toHaveLength(6)
    expect(new Set(contacts.map(c => c.id)).size).toBe(6)
    expect(new Set(contacts.map(c => `${c.dx},${c.dy}`)).size).toBe(6)
    for (const pin of def.pins) expect(resolveContacts(pin).map(c => c.id)).toEqual([pin.id])
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(6)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(6)
  })

  it('exact pin identities in physical order 1..6 A,K,NC,E,C,B (catalogue, canonical, created component)', () => {
    expect(PINS).toEqual(['A', 'K', 'NC', 'E', 'C', 'B'])
    expect(def.pins.map(p => p.id)).toEqual(PINS)
    expect(getCanonicalEntry(TYPE).pins.map(p => p.id)).toEqual(PINS)
    expect(createComponent(TYPE, 0, 0).pins.map(p => p.id)).toEqual(PINS)
  })

  it.each(DIP6)('pin %i %s is exactly at its CSA LOCKED coordinate (catalogue == pack manifest)', (number, pin, x, y) => {
    const contact = contacts.find(c => c.id === pin)
    expect([contact.dx, contact.dy]).toEqual([x, y])
    expect(def.pins.findIndex(p => p.id === pin)).toBe(number - 1)
    expect(manifest().physicalContacts1x[pin]).toEqual([x, y])
    expect(json('CONTACT-VALIDATION.json').lockedPhysicalContacts1x[pin]).toEqual([x, y])
  })

  it('the pack declares exactly the 6 locked contacts, nothing else', () => {
    expect(Object.keys(manifest().physicalContacts1x).sort()).toEqual([...PINS].sort())
  })

  it('bottom row y=48 (1..3 A,K,NC), top row y=16 (6..4 B,C,E), left -> right x=24..48, 12 px pitch, rows 32 apart', () => {
    expect(byX(48).map(c => c.id)).toEqual(['A', 'K', 'NC'])
    expect(byX(16).map(c => c.id)).toEqual(['B', 'C', 'E'])
    for (const y of [16, 48]) {
      const xs = byX(y).map(c => c.dx)
      expect(xs).toEqual(XS)
      xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(BREADBOARD_PITCH))
    }
    expect(BREADBOARD_PITCH).toBe(12)
    expect(48 - 16).toBe(32)
  })

  it('document round-trip keeps type, pins and parameters, never a runtime optical state', () => {
    const component = { ...createComponent(TYPE, 36, 60), uid: 'opto-1', parameters: { forwardVoltage: 0.7, onResistance: 10 } }
    const restored = normalizeComponent(JSON.parse(JSON.stringify(component)))
    expect(restored).toMatchObject({ uid: 'opto-1', type: TYPE, x: 36, y: 60 })
    expect(restored.pins.map(p => p.id)).toEqual(PINS)
    expect(normalizeComponent(JSON.parse(JSON.stringify(restored)))).toEqual(restored)
    expect(restored).not.toHaveProperty('state')
    expect(JSON.stringify(restored)).not.toMatch(/optical|active|ctr|conduct/i)
  })
})

describe('A11-COMP6 4N35 — renderer, assembly, visual contract, breadboard', () => {
  it('renderer registered once (raster) and renders only the frozen picture from /assets/components/4n35/', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === TYPE)).toEqual([
      { type: TYPE, component: FourN35Part, visual: { backend: 'raster' } },
    ])
    expect(getComponentByType(TYPE)).toBe(FourN35Part)
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<FourN35Part />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const root = container.firstChild
    expect(root.getAttribute('aria-label')).toBe('4N35 Optocoupler')
    expect([root.style.width, root.style.height]).toEqual(['72px', '64px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([72, 64])
    expect(img.style.objectFit).toBe('contain')
    const dir = '/assets/components/4n35/'
    expect(img.getAttribute('src')).toBe(`${dir}4n35.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}4n35.default.1x.png 1x, ${dir}4n35.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}4n35.default.1x.webp 1x, ${dir}4n35.default.3x.webp 3x`)
    expect(container.querySelector('source').getAttribute('type')).toBe('image/webp')
    expect(img.getAttribute('draggable')).toBe('false')
  })

  it('renderer source holds no simulation logic', () => {
    const source = src('components', 'parts', 'FourN35Part.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|pinVoltages|opticalActive|contribute|simulat|registry|useState|useEffect|founder-reference|runtime-master|base64|<svg/i)
  })

  it('assembly profile = 6 metallic-wire leads rooted exactly on the PhysicalContacts, no bodyClip', () => {
    const profile = getAssemblyProfile(TYPE)
    expect(profile.kind).toBe('through-hole')
    expect(profile.bodyClip).toBeUndefined()
    expect(Object.keys(profile.leads).sort()).toEqual([...PINS].sort())
    const contacts = getComponentDef(TYPE).pins.flatMap(resolveContacts)
    for (const [, pin, x, y] of DIP6) {
      expect(profile.leads[pin]).toEqual({ root: { dx: x, dy: y }, style: 'metallic-wire' })
      const contact = contacts.find(c => c.id === pin)
      expect(profile.leads[pin].root).toEqual({ dx: contact.dx, dy: contact.dy })
    }
    const g = resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null)
    expect(g.contacts).toHaveLength(6)
    for (const c of g.contacts) expect(c.root).toEqual(c.target)
  })

  it('visual contract: box 72x64, physical scale uncalibrated, DIP-6 V3 frozen raster, Founder Canvas PASS', () => {
    expect(SCALE_REFERENCE.filter(r => r.type === TYPE)).toEqual([expect.objectContaining({ box: [72, 64], physicalMm: null, impliedUnitsPerMm: null })])
    const ref = SCALE_REFERENCE.find(r => r.type === TYPE).ref
    for (const word of [/4N35/, /DIP-6/, /V3/, /Founder Canvas PASS/, /frozen/i]) expect(ref).toMatch(word)
  })

  it('straddling the trench, the 6 contacts resolve to 6 distinct strips and the part inserts', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const def = getComponentDef(TYPE)
    let origin = null
    for (let x = -40; x <= 40 && !origin; x++) {
      for (let y = -10; y <= 120 && !origin; y++) {
        const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
        if (results.length !== 6 || !results.every(r => r.resolved && r.hole.kind === 'STRIP')
          || new Set(results.map(r => r.hole.groupKey)).size !== 6) continue
        const g = resolveAssemblyGeometry(createComponent(TYPE, x, y), bb)
        if (g.contacts.every(c => c.holePosition.x === c.target.x)) origin = { x, y }
      }
    }
    expect(origin).not.toBeNull()
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true })
    const g = resolveAssemblyGeometry(createComponent(TYPE, origin.x, origin.y), bb)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map(c => holeAt(bb, c.holePosition.x, c.holePosition.y).groupKey)).size).toBe(6)
    for (const c of g.contacts) {
      expect(c.holePosition.x).toBe(c.target.x)
      expect(Math.abs(c.holePosition.y - c.target.y)).toBeLessThanOrEqual(2)
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(6)
  })

  it('no 4N35-specific branch in generic canvas, renderer, geometry or resolution code', () => {
    for (const path of [['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['components', 'parts', 'PartRenderer.jsx'], ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'],
      ['utils', 'contactModel.js'], ['utils', 'assemblyGeometry.js'], ['utils', 'circuitModel.js'],
      ['components', 'assembly', 'AssemblyLeadsLayer.jsx'], ['simulator', 'resolution.js'], ['simulator', 'simulationRuntimeIntegration.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/4N35|4n35|FourN35/)
    }
  })
})
