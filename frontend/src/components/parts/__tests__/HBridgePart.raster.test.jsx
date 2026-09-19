import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HBridgePart } from '../HBridgePart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'
import { RENDER_BUDGET } from '../../../visualization/visualContract.js'

const dir = dirname(fileURLToPath(import.meta.url))
const asset = name => resolve(dir, '../../../../public/assets/components/h-bridge', name)
// SHA-256 of the Founder PASS/FROZEN blobs staged before integration.
// Independent of the editable manifest and integrity metadata.
const lockedImageHashes = {
  'REFERENCE.png': '48bc2cc97e9d65f5f0216eb379eb00c8c5643392295388c244b749bc359b45fb',
  'h-bridge.default.1x.png': 'c569093ef2eff2857ccb7f1be2a078fb116262c653ab1830c69dbc6568a5e290',
  'h-bridge.default.1x.webp': '1ee9026cd693497b0e6f6540807239d83f56689df1e51dadd3b6dcd483c70a6f',
  'h-bridge.default.3x.png': 'd3d36c26020832ce02ae8cde7d19f8eea8f467b70b821bb37a1558c93c6d3508',
  'h-bridge.default.3x.webp': 'ef50b613aaae09095ae032e7f62afd17442bfaa7945cc93d8147ea9e89eff402',
}
const RUNTIME = Object.keys(lockedImageHashes).filter(name => name !== 'REFERENCE.png').sort()
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))

function webpSize(buffer) {
  const kind = buffer.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = buffer.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff]
}
const sizeOf = name => {
  const raw = readFileSync(asset(name))
  return name.endsWith('.png') ? [raw.readUInt32BE(16), raw.readUInt32BE(20)] : webpSize(raw)
}

describe('A8 H_BRIDGE frozen raster pack', () => {
  it('A1/A2/A3 declares a raster manifest the generic gate understands', () => {
    expect(manifest()).toMatchObject({
      component: 'H_BRIDGE', backend: 'raster', assetStatus: 'FOUNDER_PASS_FROZEN', variant: 'default', referenceDevice: 'L293D',
      package: 'DIP-16', runtimeView: 'front', complexity: 'complex', states: ['default'], canonical: { width: 144, height: 288 },
    })
    expect(getComponentPresentation('H_BRIDGE').backend).toBe('raster')
  })
  it('A4/A7/A11 lists exactly the four WebP + PNG runtime images, never REFERENCE.png', () => {
    const assets = manifest().assets
    expect(assets.map(a => a.file).sort()).toEqual(RUNTIME)
    expect(assets.filter(a => a.format === 'png')).toHaveLength(2)
    expect(assets.filter(a => a.format === 'webp')).toHaveLength(2)
    expect(assets.map(a => a.file)).not.toContain('REFERENCE.png')
    expect(RENDER_BUDGET.raster.resolutions).toBe(2)
  })
  it('A5/A6 has real 1x 144x288 and 3x 432x864 dimensions', () => {
    for (const entry of manifest().assets) {
      const expected = [144 * entry.scale, 288 * entry.scale]
      expect([entry.width, entry.height], entry.file).toEqual(expected)
      expect(sizeOf(entry.file), entry.file).toEqual(expected)
    }
    expect(manifest().assets.map(a => a.scale).sort()).toEqual([1, 1, 3, 3])
  })
  it('A8/A12 keeps real bytes and SHA-256 equal to the locked Founder blobs', () => {
    for (const entry of manifest().assets) {
      const raw = readFileSync(asset(entry.file))
      expect(raw.length, entry.file).toBe(entry.bytes)
      expect(createHash('sha256').update(raw).digest('hex'), entry.file).toBe(entry.sha256)
      expect(entry.sha256, entry.file).toBe(lockedImageHashes[entry.file])
    }
    expect(createHash('sha256').update(readFileSync(asset('REFERENCE.png'))).digest('hex')).toBe(lockedImageHashes['REFERENCE.png'])
  })
  it('A9/A10 explicitly requests the bounded 575 KiB budget and the 3x PNG fits', () => {
    expect(manifest().budget).toEqual({ complexity: 'complex', maxWeightKbPerVariant: 575 })
    expect(getRasterWeightLimitKb(manifest())).toBe(575)
    expect(RENDER_BUDGET.raster).toMatchObject({ maxWeightKbPerVariantSimple: 30, maxWeightKbPerVariantComplex: 175 })
    const png3 = manifest().assets.find(a => a.file === 'h-bridge.default.3x.png')
    expect(png3.bytes / 1024).toBeGreaterThan(RENDER_BUDGET.raster.maxWeightKbPerVariantComplex)
    expect(png3.bytes / 1024).toBeLessThanOrEqual(575)
    for (const entry of manifest().assets) expect(entry.bytes / 1024, entry.file).toBeLessThanOrEqual(getRasterWeightLimitKb(manifest()))
  })
  it('keeps the ASSET-INTEGRITY.json inventory truthful (LF blobs) and consistent with the manifest', () => {
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(Object.keys(integrity.files)).toHaveLength(8)
    for (const [name, expected] of Object.entries(integrity.files)) {
      const raw = readFileSync(asset(name))
      // Git on Windows checks out text with CRLF; the recorded hashes describe LF blobs.
      const bytes = /\.(md|json)$/.test(name) ? Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')) : raw
      expect(bytes.length, name).toBe(expected.bytes)
      expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(expected.sha256)
    }
    for (const entry of manifest().assets) expect(integrity.files[entry.file].sha256).toBe(entry.sha256)
  })
})

describe('A8 H_BRIDGE raster renderer', () => {
  it('registers the raster backend and renders only the approved picture at native proportions', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === 'H_BRIDGE')).toEqual([
      { type: 'H_BRIDGE', component: HBridgePart, visual: { backend: 'raster' } },
    ])
    const { container } = render(<HBridgePart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    const base = '/assets/components/h-bridge/h-bridge.default.'
    const source = container.querySelector('source')
    expect(source.type).toBe('image/webp')
    expect(source.getAttribute('srcset')).toBe(`${base}1x.webp 1x, ${base}3x.webp 3x`)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe(`${base}1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${base}1x.png 1x, ${base}3x.png 3x`)
    expect([img.width, img.height]).toEqual([144, 288])
    expect(img.style.objectFit).toBe('contain')
    expect(img.draggable).toBe(false)
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('aria-hidden')).toBe('true')
    expect(container.firstChild.getAttribute('aria-label')).toBe('Pont en H L293D')
    expect(container.textContent).toBe('')
    expect(container.innerHTML).not.toMatch(/<svg|data:|base64|background|transform/)
  })
})
