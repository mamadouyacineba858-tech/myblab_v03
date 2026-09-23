import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NotGatePart } from '../NotGatePart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'
import { getComponentDef, createComponent } from '../../../config/componentDefinitions.js'
import { holeAt } from '../../../utils/breadboardGeometry.js'
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
const asset = name => resolve(here, '../../../../public/assets/components/not-gate', name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const frozenSha = '43f13e75f460575406a6c1c9df93813157073403f15ccf96a05ce7b6165011cd'
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
// reference, same method as OrGatePart.raster.test.jsx/NandGatePart.raster.test.jsx/NorGatePart.raster.test.jsx/XorGatePart.raster.test.jsx.
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

describe('A9-NOT raster and frozen source', () => {
  it('registered raster renderer uses only the approved picture', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === 'NOT_GATE')).toEqual([
      { type: 'NOT_GATE', component: NotGatePart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation('NOT_GATE')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<NotGatePart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([144, 96])
    expect([getComponentDef('NOT_GATE').width, getComponentDef('NOT_GATE').height]).toEqual([144, 96])
    expect(img.getAttribute('src')).toBe('/assets/components/not-gate/not-gate.default.1x.png')
    expect(img.getAttribute('srcset')).toContain('not-gate.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toContain('not-gate.default.3x.webp 3x')
    expect(img.style.objectFit).toBe('contain')
  })
  it('Founder FROZEN bytes and actual dimensions match an independent lock (unchanged since A9-NOT-ASSET-FIX)', () => {
    const raw = readFileSync(asset('not-gate.founder-reference.png'))
    expect(hash(raw)).toBe(frozenSha)
    expect(size(raw, 'png')).toEqual([1536, 1024])
    expect(json('FOUNDER-ASSET.json')).toMatchObject({
      sha256: frozenSha, dimensions: [1536, 1024], mode: 'RGBA', status: 'FOUNDER_PASS_FROZEN',
      correctedReferenceStatus: 'FOUNDER_PASS_FROZEN',
      originalFounderSourceSha256: '58271344adea31d04b59d2a4c97f21eef674b70b0967d9708d30e10afbb8a827',
    })
    expect(raw[25]).toBe(6) // PNG truecolour with alpha.
    expect(json('manifest.json').reference.sha256).toBe(frozenSha)
  })
  it('exterior is transparent and both probed lead roots sit on opaque metal', () => {
    const raw = readFileSync(asset('not-gate.founder-reference.png'))
    const { width, height, pixels } = decodePngRgba(raw)
    const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3]
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      expect(alphaAt(x, y)).toBe(0)
    }
    let opaque = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++
    expect(opaque).toBeGreaterThan(250000)
    for (const p of json('manifest.json').derivation.pixelProbe) {
      expect(alphaAt(Math.round(p.sourceRoot[0]), Math.round(p.sourceRoot[1])), p.pin).toBe(255)
    }
  })
  it('runtime inventory, dimensions, hashes, budget and integrity are truthful', () => {
    const m = json('manifest.json')
    expect(m).toMatchObject({ component: 'NOT_GATE', backend: 'raster', canonical: { width: 144, height: 96 } })
    expect(m.assets.map(a => a.file).sort()).toEqual(['not-gate.default.1x.png', 'not-gate.default.1x.webp', 'not-gate.default.3x.png', 'not-gate.default.3x.webp'])
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

describe('A9-NOT physical fit through existing generic contracts', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  // A(72,21) -> (72,60) = column 6 / row 5 (top strip); Q(72,81) -> (72,120) = column 6 / row 10 (bottom strip).
  const origin = { x: 0, y: 39 }
  const def = getComponentDef('NOT_GATE')
  it('exactly two contacts A/Q from the pixel-probe, pitch 12, short measured roots, no clipping', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dx, c.dy, c.breadboardInsertable])).toEqual([
      ['A', 72, 21, true], ['Q', 72, 81, true],
    ])
    const [a, q] = def.pins.flatMap(resolveContacts)
    expect(a.dx).toBe(q.dx)
    expect((q.dy - a.dy) % BREADBOARD_PITCH).toBe(0)
    const g = resolveAssemblyGeometry(createComponent('NOT_GATE', 0, 0), null)
    expect(g.contacts.map(c => c.pinId)).toEqual(['A', 'Q'])
    expect(g.contacts.map(c => [c.root.x, c.root.y])).toEqual([[71.90625, 20.390625], [71.71875, 81.609375]])
    const probe = json('manifest.json').derivation.pixelProbe
    expect(probe.map(p => p.runtimeRoot)).toEqual(g.contacts.map(c => [c.root.x, c.root.y]))
    expect(probe.map(p => p.physicalContact)).toEqual(g.contacts.map(c => [c.target.x, c.target.y]))
    expect(getAssemblyProfile('NOT_GATE').bodyClip).toBeUndefined()
    expect(Object.keys(getAssemblyProfile('NOT_GATE').leads)).toEqual(['A', 'Q'])
    // Own measured max root-to-contact distance for NOT_GATE (~0.67px on Q).
    for (const c of g.contacts) expect(Math.hypot(c.root.x - c.target.x, c.root.y - c.target.y)).toBeLessThan(0.75)
  })
  it('A and Q insert on the same column across the groove, onto two distinct nets', () => {
    const placement = computeBreadboardPlacement(bb, 'NOT_GATE', origin, [])
    expect(placement).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: origin })
    const comp = createComponent('NOT_GATE', origin.x, origin.y)
    const g = resolveAssemblyGeometry(comp, bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    const holes = g.contacts.map(c => holeAt(bb, c.target.x, c.target.y))
    expect(holes.map(h => [h.kind, h.column, h.row])).toEqual([['STRIP', 6, 5], ['STRIP', 6, 10]])
    expect(holes[0].groupKey).not.toBe(holes[1].groupKey)
    for (const c of g.contacts) {
      expect(c.target).toEqual(c.holePosition)
      expect(c.target).toEqual(getPinPresentationPosition(comp, def.pins.find(p => p.id === c.pinId)))
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__metallic-stack')).toHaveLength(2)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(2)
  })
  it.each([true, false])('real Document adapter carries Q through the breadboard strip into an AND gate (A=%s)', high => {
    const doc = {
      breadboard: bb,
      components: [
        { id: 'p', type: 'POWER', position: { x: -500, y: -500 } },
        { id: 'n', type: 'NOT_GATE', position: origin },
        // AND_GATE contacts sit at dy=90: and.A at (72,144) = column 6 / row 12,
        // the same bottom-strip net as n.Q (72,120) = column 6 / row 10.
        { id: 'and', type: 'AND_GATE', position: { x: 24, y: 54 } },
      ],
      wires: [
        { id: 'a', pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'n', pinId: 'A' } },
        { id: 'b', pinA: { componentId: 'p', pinId: '5V' }, pinB: { componentId: 'and', pinId: 'B' } },
      ],
    }
    expect(computeBreadboardPlacement(bb, 'AND_GATE', { x: 24, y: 54 }, [])).toMatchObject({ valid: true, position: { x: 24, y: 54 } })
    const before = JSON.stringify(doc)
    const input = toEngineInput(doc)
    // and.Q = AND(NOT(A), HIGH) = NOT(A).
    expect(runSimulationStep(input.components, input.wires).pinSignals.get('and:Q')).toBe(high ? Signal.LOW : Signal.HIGH)
    expect(JSON.stringify(doc)).toBe(before)
    const offBoard = toEngineInput({ ...doc, breadboard: null })
    expect(runSimulationStep(offBoard.components, offBoard.wires).pinSignals.get('and:Q')).toBe(Signal.UNKNOWN)
  })
})
