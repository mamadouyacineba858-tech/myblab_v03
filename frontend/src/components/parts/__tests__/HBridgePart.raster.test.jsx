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
// SHA-256 of the Founder PASS/FROZEN reference (byte-identical to the approved source) and of the
// isotropic runtime derivatives integrated by A8-H-BRIDGE.
// Independent of the editable manifest and integrity metadata.
const lockedImageHashes = {
  'REFERENCE.png': '7b88f0c71c27a3cb9ed244e92bc9cec8772a07aa4e4bd966880906fd2b16596d',
  'h-bridge.default.1x.png': '4d90b072b8d9df01c64e53dabd34d046251e1021ca8de4adb9bb91761e0891e3',
  'h-bridge.default.1x.webp': '36c0f1157fab48510c48142cb41f8b3a996aa8cf69002e7b377bafab84e612ee',
  'h-bridge.default.3x.png': '6affd5fab8a913594384efcd1b3f43a28de7a5db9ba19d70eddf9a0073d472b5',
  'h-bridge.default.3x.webp': 'e258070671948b5832d716cf39dc76c4a30206bbab07809ba69063b26406c38e',
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
      package: 'DIP-16', runtimeView: 'front', complexity: 'complex', states: ['default'], canonical: { width: 132, height: 88 },
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
  it('A5/A6 has real 1x 132x88 and 3x 396x264 dimensions', () => {
    for (const entry of manifest().assets) {
      const expected = [132 * entry.scale, 88 * entry.scale]
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
  it('A9/A10 needs no exceptional budget: the 3x PNG fits the normal complex cap', () => {
    expect(manifest().budget).toEqual({ complexity: 'complex' })
    expect(getRasterWeightLimitKb(manifest())).toBe(RENDER_BUDGET.raster.maxWeightKbPerVariantComplex)
    expect(RENDER_BUDGET.raster).toMatchObject({ maxWeightKbPerVariantSimple: 30, maxWeightKbPerVariantComplex: 175 })
    const png3 = manifest().assets.find(a => a.file === 'h-bridge.default.3x.png')
    expect(png3.bytes / 1024).toBeGreaterThan(RENDER_BUDGET.raster.maxWeightKbPerVariantSimple)
    expect(png3.bytes / 1024).toBeLessThanOrEqual(RENDER_BUDGET.raster.maxWeightKbPerVariantComplex)
    for (const entry of manifest().assets) expect(entry.bytes / 1024, entry.file).toBeLessThanOrEqual(getRasterWeightLimitKb(manifest()))
  })
  it('keeps the ASSET-INTEGRITY.json inventory truthful (LF blobs) and consistent with the manifest', () => {
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(Object.keys(integrity.files)).toHaveLength(8) // README, REFERENCE.png, SHA256SUMS, 4 runtime images, manifest
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
    expect([img.width, img.height]).toEqual([132, 88])
    expect(img.style.objectFit).toBe('contain')
    expect(img.draggable).toBe(false)
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('aria-hidden')).toBe('true')
    expect(container.firstChild.getAttribute('aria-label')).toBe('Pont en H L293D')
    expect(container.textContent).toBe('')
    expect(container.innerHTML).not.toMatch(/<svg|data:|base64|background|transform/)
  })
})
