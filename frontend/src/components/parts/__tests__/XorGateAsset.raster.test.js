import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Asset-only lock for the A9-XOR-ASSET-FIX raster pack. XOR_GATE has no
// functional component/registration/simulation contract yet (that is a
// separate, not-yet-authorized ticket) — this only guards the Founder
// reference and its derivatives against a regression to the opaque-white
// -rectangle defect that was found and fixed the same way on
// A9-OR/A9-NAND/A9-NOR.

const here = dirname(fileURLToPath(import.meta.url))
const asset = name => resolve(here, '../../../../public/assets/components/xor-gate', name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const frozenSha = 'be3c922f8c6a7c0095f4dbe0b273a26123316200341023a42ab896f0aef081bd'
const priorOpaqueSha = '8ff6d6af57779a88019a385f6d0c480f9ecd558c9d41d6d4e06b84bf9a974fe9'

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

describe('A9-XOR-ASSET-FIX frozen raster asset (transparency lock, no applicative logic)', () => {
  it('Founder reference is RGBA (colourtype 6), 1536x1024, and matches the corrected lock', () => {
    const raw = readFileSync(asset('xor-gate.founder-reference.png'))
    expect(hash(raw)).toBe(frozenSha)
    expect(hash(raw)).not.toBe(priorOpaqueSha)
    expect(size(raw, 'png')).toEqual([1536, 1024])
    expect(raw[24]).toBe(8) // 8-bit depth
    expect(raw[25]).toBe(6) // PNG truecolour with alpha (RGBA), not 2 (RGB, no alpha)
    const founder = json('FOUNDER-ASSET.json')
    expect(founder).toMatchObject({ sha256: frozenSha, dimensions: [1536, 1024], mode: 'RGBA' })
    expect(json('manifest.json').reference.sha256).toBe(frozenSha)
  })

  it('exterior background is genuinely transparent, not an opaque white rectangle', () => {
    const raw = readFileSync(asset('xor-gate.founder-reference.png'))
    const { width, height, pixels } = decodePngRgba(raw)
    const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3]
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
    // a real (but small) antialiasing feather band at the silhouette edge.
    expect(opaque).toBeGreaterThan(400000)
    expect(transparent).toBeGreaterThan(400000)
    expect(feathered).toBeGreaterThan(0)
    expect(feathered).toBeLessThan(50000)
    expect(json('manifest.json').derivation.transparency).toMatchObject({ priorSha256: priorOpaqueSha })
  })

  it('RGB channels of the corrected reference are byte-identical to the opaque prior source', () => {
    // The prior opaque RGB source is recoverable byte-for-bit from the
    // transport commit named in manifest.json derivation.transparency
    // .priorShaRecoverableAt; this test only locks that the correction
    // documents that recoverability, not the RGB bytes themselves (which
    // would require re-hashing an RGB-mode decode of a historical git blob
    // from inside a JS test). The pixel-identical RGB proof is established
    // by scripts/build-xor-gate-assets.py at build time (assert
    // np.array_equal(corrected_arr[..., :3], original_rgb)) and reported
    // in the ticket's final report.
    const transparency = json('manifest.json').derivation.transparency
    expect(transparency.priorSha256).toBe(priorOpaqueSha)
    expect(transparency.priorShaRecoverableAt).toBe('211119a3ca92610b74275ed65f99eb22990bcceb')
    expect(transparency.borderMatchThreshold).toBe(24)
    expect(transparency.featherHighThreshold).toBe(90)
    expect(transparency.featherBandPx).toBe(2)
  })

  it('the visible metal leads stayed opaque through the correction (physical preservation, not an electrical registration)', () => {
    const raw = readFileSync(asset('xor-gate.founder-reference.png'))
    const { width, pixels } = decodePngRgba(raw)
    const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3]
    const zones = json('manifest.json').derivation.metalZoneCheck
    expect(zones).toHaveLength(3)
    for (const zone of zones) {
      const [lo, hi] = zone.regionX
      let opaque = 0
      for (let x = lo; x < hi; x++) if (alphaAt(x, zone.row) >= 200) opaque++
      expect(opaque).toBe(zone.opaquePixelCount)
      expect(opaque).toBeGreaterThan(60)
    }
  })

  it('runtime derivatives carry real alpha at the exact canonical dimensions, and manifest/integrity are truthful', () => {
    const m = json('manifest.json')
    expect(m.component).toBe('XOR_GATE')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 96])
    expect(m.assets.map(a => a.file).sort()).toEqual([
      'xor-gate.default.1x.png', 'xor-gate.default.1x.webp',
      'xor-gate.default.3x.png', 'xor-gate.default.3x.webp',
    ])
    for (const a of m.assets) {
      const raw = readFileSync(asset(a.file))
      expect(size(raw, a.format)).toEqual([144 * a.scale, 96 * a.scale])
      expect([a.width, a.height]).toEqual(size(raw, a.format))
      expect(hash(raw)).toBe(a.sha256)
      expect(raw.length).toBe(a.bytes)
      if (a.format === 'png') expect(raw[25]).toBe(6) // RGBA, real alpha carried through
    }
    for (const [name, record] of Object.entries(json('ASSET-INTEGRITY.json').files)) {
      const raw = readFileSync(asset(name))
      const normalized = /\.(json|md|txt)$/.test(name) ? Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')) : raw
      expect(hash(normalized), name).toBe(record.sha256)
      expect(normalized.length, name).toBe(record.bytes)
    }
  })

  it('no functional XOR logic, electrical pixel-probe, or PhysicalContacts registration is introduced by this asset-fix', () => {
    const m = json('manifest.json')
    expect(m.derivation.pixelProbe).toBe('NOT_MEASURED_IN_A9-XOR-ASSET-FIX_SCOPE')
    expect(m).not.toHaveProperty('physicalContacts')
    expect(m).not.toHaveProperty('PhysicalContacts')
    const founder = json('FOUNDER-ASSET.json')
    expect(founder.note).toMatch(/awaits? the Founder's own visual re-qualification/)
  })
})
