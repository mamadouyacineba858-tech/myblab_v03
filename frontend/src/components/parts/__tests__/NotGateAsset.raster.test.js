import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Asset-only lock for the A9-NOT-ASSET-FIX raster pack. NOT_GATE has no
// functional component/registration/simulation contract yet (that is the
// separate, not-yet-authorized A9-NOT ticket) — this only guards the Founder
// reference and its derivatives against a regression to the opaque-white
// -rectangle defect that was found and fixed the same way on
// A9-OR/A9-NAND/A9-NOR/A9-XOR.

const here = dirname(fileURLToPath(import.meta.url))
const asset = name => resolve(here, '../../../../public/assets/components/not-gate', name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const correctedSha = '43f13e75f460575406a6c1c9df93813157073403f15ccf96a05ce7b6165011cd'
const originalFounderSha = '58271344adea31d04b59d2a4c97f21eef674b70b0967d9708d30e10afbb8a827'
const originalRgbChannelsSha = '34ee4a3ea7348c6fba0065ac5133958db542fb3c9373c1778dcefb8930463d84'
const transportCommit = 'e29d1aeaf9d6f454f06875b3b4897d08e0ad20fb'

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

describe('A9-NOT-ASSET-FIX raster asset (transparency lock, no applicative logic)', () => {
  const decoded = decodePngRgba(readFileSync(asset('not-gate.founder-reference.png')))
  const alphaAt = (x, y) => decoded.pixels[(y * decoded.width + x) * 4 + 3]

  it('corrected Founder reference is RGBA (colourtype 6, 8-bit), 1536x1024, and matches the lock', () => {
    const raw = readFileSync(asset('not-gate.founder-reference.png'))
    expect(hash(raw)).toBe(correctedSha)
    expect(hash(raw)).not.toBe(originalFounderSha)
    expect(size(raw, 'png')).toEqual([1536, 1024])
    expect(raw[24]).toBe(8) // 8-bit depth
    expect(raw[25]).toBe(6) // PNG truecolour with alpha (RGBA), not 2 (RGB, no alpha)
    expect(json('FOUNDER-ASSET.json')).toMatchObject({
      componentType: 'NOT_GATE', sha256: correctedSha, originalFounderSourceSha256: originalFounderSha,
      dimensions: [1536, 1024], mode: 'RGBA', logic: 'Q = NOT(A)',
    })
    expect(json('manifest.json').reference).toMatchObject({
      sha256: correctedSha, width: 1536, height: 1024, mode: 'RGBA', pngColorType: 6, bitDepth: 8,
    })
  })

  it('original Founder source provenance is preserved, distinct from the corrected reference', () => {
    const m = json('manifest.json')
    expect(m.originalFounderSource).toMatchObject({
      sha256: originalFounderSha, width: 1536, height: 1024, mode: 'RGB', pngColorType: 2, bitDepth: 8,
      recoverableAt: transportCommit,
    })
    expect(m.derivation.transparency).toMatchObject({
      priorSha256: originalFounderSha, priorShaRecoverableAt: transportCommit,
      borderMatchThreshold: 24, featherHighThreshold: 90, featherBandPx: 2,
    })
    for (const readme of ['README.md', 'README.txt']) {
      const text = readFileSync(asset(readme), 'utf8')
      expect(text).toMatch(new RegExp(`ORIGINAL FOUNDER SOURCE[\\s\\S]*${originalFounderSha}`))
      expect(text).toMatch(new RegExp(`CORRECTED FOUNDER REFERENCE[\\s\\S]*${correctedSha}`))
    }
  })

  it('exterior background is genuinely transparent, not an opaque white rectangle', () => {
    const { width, height, pixels } = decoded
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      expect(alphaAt(x, y)).toBe(0)
    }
    let opaque = 0, transparent = 0, feathered = 0
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 255) opaque++
      else if (pixels[i] === 0) transparent++
      else feathered++
    }
    // The image must not be uniformly opaque (the pre-fix defect) nor
    // uniformly transparent; both real states must be present in bulk, plus
    // a real (but small) antialiasing feather band at the silhouette edge,
    // exactly as measured and recorded by the build script.
    expect(opaque).toBeGreaterThan(250000)
    expect(transparent).toBeGreaterThan(1000000)
    expect(feathered).toBeGreaterThan(0)
    expect(feathered).toBeLessThan(50000)
    expect(json('manifest.json').derivation.transparency.alphaStats).toEqual({
      totalPixels: width * height, alpha0: transparent, alpha255: opaque, alphaPartial: feathered,
      cornerAlpha: [0, 0, 0, 0],
    })
  })

  it('RGB channels of the corrected reference are pixel-identical to the original Founder source', () => {
    // originalRgbChannelsSha is the sha256 of the raw RGB sample stream
    // (row-major, 3 bytes/pixel) decoded from the original opaque source
    // (recoverable at transportCommit). Stripping alpha from the corrected
    // PNG must reproduce exactly that stream: only alpha was changed.
    const { pixels } = decoded
    const rgb = Buffer.alloc((pixels.length / 4) * 3)
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
      rgb[j] = pixels[i]
      rgb[j + 1] = pixels[i + 1]
      rgb[j + 2] = pixels[i + 2]
    }
    expect(hash(rgb)).toBe(originalRgbChannelsSha)
    expect(json('manifest.json').derivation.transparency).toMatchObject({
      rgbChannelsSha256: originalRgbChannelsSha, rgbChannelsIdenticalToOriginal: true,
    })
  })

  it('the visible A/Q metal leads stayed opaque through the correction (physical preservation, not an electrical registration)', () => {
    const zones = json('manifest.json').derivation.metalZoneCheck
    expect(zones.map(z => z.zone)).toEqual(['a-lead-metal', 'q-lead-metal'])
    for (const zone of zones) {
      const [lo, hi] = zone.regionX
      let opaque = 0
      for (let x = lo; x < hi; x++) if (alphaAt(x, zone.row) >= 200) opaque++
      expect(opaque).toBe(zone.opaquePixelCount)
      expect(opaque).toBeGreaterThan(80)
    }
  })

  it('runtime derivatives carry real alpha at the exact canonical dimensions, and manifest/integrity are truthful', () => {
    const m = json('manifest.json')
    expect(m.component).toBe('NOT_GATE')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 96])
    expect(m.assets.map(a => a.file).sort()).toEqual([
      'not-gate.default.1x.png', 'not-gate.default.1x.webp',
      'not-gate.default.3x.png', 'not-gate.default.3x.webp',
    ])
    for (const a of m.assets) {
      const raw = readFileSync(asset(a.file))
      expect(size(raw, a.format)).toEqual([144 * a.scale, 96 * a.scale])
      expect([a.width, a.height]).toEqual(size(raw, a.format))
      expect(hash(raw)).toBe(a.sha256)
      expect(raw.length).toBe(a.bytes)
      if (a.format === 'png') {
        expect(raw[25]).toBe(6) // RGBA, real alpha carried through
        expect(decodePngRgba(raw).pixels[3]).toBe(0) // corner transparent at runtime scale too
      } else {
        expect(raw.toString('ascii', 12, 16)).toBe('VP8X')
        expect(raw[20] & 0x10).toBe(0x10) // VP8X alpha flag
      }
    }
    const integrity = json('ASSET-INTEGRITY.json')
    expect(integrity.component).toBe('NOT_GATE')
    expect(Object.keys(integrity.files).sort()).toEqual([
      'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'manifest.json',
      'not-gate.default.1x.png', 'not-gate.default.1x.webp',
      'not-gate.default.3x.png', 'not-gate.default.3x.webp',
      'not-gate.founder-reference.png',
    ])
    for (const [name, record] of Object.entries(integrity.files)) {
      const raw = readFileSync(asset(name))
      const normalized = /\.(json|md|txt)$/.test(name) ? Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')) : raw
      expect(hash(normalized), name).toBe(record.sha256)
      expect(normalized.length, name).toBe(record.bytes)
    }
  })

  it('A9-NOT (functional ticket) filled the real two-pin A/Q pixel-probe; Founder Asset Gate PASS recorded', () => {
    // A9-NOT-ASSET-FIX deliberately left pixelProbe as
    // 'NOT_MEASURED_IN_A9-NOT-ASSET-FIX_SCOPE'. A9-NOT is the functional
    // ticket: it measured A/Q once on this same FROZEN raster; this asset
    // test now locks that measurement (exactly two pins, vertical leads)
    // without any PhysicalContacts registry key on the manifest itself.
    const m = json('manifest.json')
    expect(json('FOUNDER-ASSET.json').pins).toEqual(['A', 'Q'])
    expect(m.derivation.pixelProbe.map(p => p.pin)).toEqual(['A', 'Q'])
    for (const p of m.derivation.pixelProbe) {
      expect(p.runtimeRoot).toEqual(p.sourceRoot.map(v => v * 3 / 32))
      expect(Math.hypot(p.runtimeRoot[0] - p.physicalContact[0], p.runtimeRoot[1] - p.physicalContact[1])).toBeLessThan(0.75)
      // The measured root sits on opaque lead metal of the FROZEN raster.
      expect(alphaAt(Math.round(p.sourceRoot[0]), Math.round(p.sourceRoot[1]))).toBe(255)
    }
    expect(m.derivation.pixelProbe.map(p => p.physicalContact)).toEqual([[72, 21], [72, 81]])
    expect(m).not.toHaveProperty('physicalContacts')
    expect(m).not.toHaveProperty('PhysicalContacts')
    expect(m.derivation).not.toHaveProperty('physicalContacts')
    expect(m.correctedReferenceStatus).toBe('FOUNDER_PASS_FROZEN')
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ status: 'FOUNDER_PASS_FROZEN', correctedReferenceStatus: 'FOUNDER_PASS_FROZEN' })
  })
})
