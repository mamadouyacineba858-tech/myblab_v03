import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NandGatePart } from '../NandGatePart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'
import { getComponentDef, createComponent } from '../../../config/componentDefinitions.js'
import { resolveContacts } from '../../../utils/contactModel.js'
import { getPinPresentationPosition } from '../../../utils/pinPresentationGeometry.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { AssemblyLeadsLayer } from '../../assembly/AssemblyLeadsLayer.jsx'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { BREADBOARD_PITCH } from '../../../utils/breadboardGeometry.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { runSimulationStep } from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

const here = dirname(fileURLToPath(import.meta.url))
const asset = name => resolve(here, '../../../../public/assets/components/nand-gate', name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const frozenSha = 'fc35f979ec5faf2b062ecef55df9a20e34e7d55e31812514cc7bbb3b1238fbb9'
function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}
// Minimal PNG RGBA8 decoder: concatenate IDAT chunks, zlib-inflate, then
// un-filter each scanline (None/Sub/Up/Average/Paeth) per the PNG spec.
// Only what's needed to read real per-pixel alpha out of the frozen
// reference, same method as OrGatePart.raster.test.jsx.
function decodePngRgba(raw) {
  const w = raw.readUInt32BE(16)
  const h = raw.readUInt32BE(20)
  if (raw[24] !== 8 || raw[25] !== 6) throw new Error('expected 8-bit RGBA PNG')
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
  return { width: w, height: h, pixels: out }
}

describe('A9-NAND raster and frozen source', () => {
  it('registered raster renderer uses only the approved picture', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === 'NAND_GATE')).toEqual([
      { type: 'NAND_GATE', component: NandGatePart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation('NAND_GATE')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<NandGatePart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([144, 96])
    expect(img.getAttribute('src')).toBe('/assets/components/nand-gate/nand-gate.default.1x.png')
    expect(img.getAttribute('srcset')).toContain('nand-gate.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toContain('nand-gate.default.3x.webp 3x')
    expect(img.style.objectFit).toBe('contain')
  })
  it('original Founder bytes and actual dimensions match an independent lock', () => {
    const raw = readFileSync(asset('nand-gate.founder-reference.png'))
    expect(hash(raw)).toBe(frozenSha)
    expect(size(raw, 'png')).toEqual([1536, 1024])
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ sha256: frozenSha, dimensions: [1536, 1024], mode: 'RGBA' })
    expect(raw[25]).toBe(6) // PNG truecolour with alpha.
    expect(json('manifest.json').reference.sha256).toBe(frozenSha)
  })
  it('exterior background is genuinely transparent, not an opaque white rectangle', () => {
    const raw = readFileSync(asset('nand-gate.founder-reference.png'))
    const { width, height, pixels } = decodePngRgba(raw)
    const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3]
    // All four canvas corners must be fully transparent.
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      expect(alphaAt(x, y)).toBe(0)
    }
    // The component silhouette must remain substantially opaque, and the
    // measured lower-foot metal at the pixel-probe row (890) must be fully
    // opaque, matching manifest.json derivation.pixelProbe.
    let opaque = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++
    expect(opaque).toBeGreaterThan(460000)
    for (const x of [493, 765, 1030]) expect(alphaAt(x, 890)).toBe(255)
    expect(json('manifest.json').derivation.transparency).toMatchObject({
      priorSha256: '676a9f047f9bbcb4a353cf612806530876b91e672371a3880e343620e4bdf96d',
    })
  })
  it('runtime inventory, dimensions, hashes and normal complex budget are truthful', () => {
    const m = json('manifest.json')
    expect(m).toMatchObject({ component: 'NAND_GATE', backend: 'raster', states: ['default'], canonical: { width: 144, height: 96 }, budget: { complexity: 'complex' } })
    expect(m.assets.map(a => a.file).sort()).toEqual(['nand-gate.default.1x.png', 'nand-gate.default.1x.webp', 'nand-gate.default.3x.png', 'nand-gate.default.3x.webp'])
    for (const a of m.assets) {
      const raw = readFileSync(asset(a.file))
      expect(size(raw, a.format)).toEqual([144 * a.scale, 96 * a.scale])
      expect([a.width, a.height]).toEqual(size(raw, a.format))
      expect(hash(raw)).toBe(a.sha256)
      expect(raw.length).toBe(a.bytes)
      expect(raw.length / 1024).toBeLessThanOrEqual(getRasterWeightLimitKb(m))
    }
    for (const [name, record] of Object.entries(json('ASSET-INTEGRITY.json').files)) {
      const raw = readFileSync(asset(name))
      const normalized = /\.(json|md|txt)$/.test(name) ? Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')) : raw
      expect(hash(normalized), name).toBe(record.sha256)
      expect(normalized.length, name).toBe(record.bytes)
    }
  })
})

describe('A9-NAND physical fit through existing generic contracts', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const origin = { x: 0, y: -47 }
  const def = getComponentDef('NAND_GATE')
  it('three exact contacts, pitch 12, short measured roots, no clipping', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dx, c.dy, c.breadboardInsertable])).toEqual([
      ['A', 48, 83, true], ['B', 72, 83, true], ['Q', 96, 83, true],
    ])
    const g = resolveAssemblyGeometry(createComponent('NAND_GATE', 0, 0), null)
    expect(g.contacts.map(c => [c.root.x, c.root.y])).toEqual([[46.21875, 83.4375], [71.71875, 83.4375], [96.609375, 83.4375]])
    expect(json('manifest.json').derivation.pixelProbe.map(p => p.runtimeRoot)).toEqual(g.contacts.map(c => [c.root.x, c.root.y]))
    expect(getAssemblyProfile('NAND_GATE').bodyClip).toBeUndefined()
    for (const c of g.contacts) expect(Math.hypot(c.root.x - c.target.x, c.root.y - c.target.y)).toBeLessThan(2)
  })
  it('all three contacts insert exactly onto distinct breadboard nets', () => {
    const placement = computeBreadboardPlacement(bb, 'NAND_GATE', origin, [])
    expect(placement).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: origin })
    const comp = createComponent('NAND_GATE', origin.x, origin.y)
    const g = resolveAssemblyGeometry(comp, bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(3)
    expect(new Set(g.contacts.map(c => c.hole.column)).size).toBe(3)
    for (const c of g.contacts) {
      expect(c.target).toEqual(c.holePosition)
      expect(c.target).toEqual(getPinPresentationPosition(comp, def.pins.find(p => p.id === c.pinId)))
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__metallic-stack')).toHaveLength(3)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(3)
  })
  it.each([true, false])('real Document adapter connects Q through breadboard to another gate (A=%s)', high => {
    const doc = {
      breadboard: bb,
      components: [
        { id: 'p', type: 'POWER', position: { x: -500, y: -500 } },
        { id: 'g1', type: 'NAND_GATE', position: origin },
        // g2.A at (96,48), same column/net as g1.Q at (96,36).
        { id: 'g2', type: 'NAND_GATE', position: { x: 48, y: -35 } },
      ],
      wires: [
        { id: 'a', pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'g1', pinId: 'A' } },
        ...['g1', 'g2'].map(id => ({ id: `b-${id}`, pinA: { componentId: 'p', pinId: '5V' }, pinB: { componentId: id, pinId: 'B' } })),
      ],
    }
    const before = JSON.stringify(doc)
    const input = toEngineInput(doc)
    // g1: A=high?HIGH:LOW, B=HIGH => Q = NAND(A,HIGH) = !A (since B decisive only when both HIGH)
    const g1Q = high ? Signal.LOW : Signal.HIGH
    // g2: A=g1.Q, B=HIGH => Q = NAND(g1Q, HIGH)
    const expected = g1Q === Signal.HIGH ? Signal.LOW : Signal.HIGH
    expect(runSimulationStep(input.components, input.wires).pinSignals.get('g2:Q')).toBe(expected)
    expect(JSON.stringify(doc)).toBe(before)
    const offBoard = toEngineInput({ ...doc, breadboard: null })
    expect(runSimulationStep(offBoard.components, offBoard.wires).pinSignals.get('g2:Q')).toBe(Signal.UNKNOWN)
  })
})
