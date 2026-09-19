import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VoltageRegulatorPart } from '../VoltageRegulatorPart.jsx'
import { DEFAULT_REGISTRATIONS } from '../../../visualization/defaultRegistrations.js'
import { createComponent } from '../../../config/componentDefinitions.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'

const dir = dirname(fileURLToPath(import.meta.url))
const asset = name => resolve(dir, '../../../../public/assets/components/voltage-regulator', name)
// SHA-256 of the image blobs in locked base 0a25f24e63ff8a54b22244b29323cd72f5d1fb98.
// Independent of the editable manifest and integrity metadata.
const lockedImageHashes = {
  'REFERENCE.png': 'ff3304c49fc2fa1ece72c101d07a0b03d7ff229b748257f9ae61826aa60fde8c',
  'voltage-regulator.default.1x.png': 'f6d7f7c9bb78aee6b8050201accd590a4064c2eec04975522ddcd4725e492ccf',
  'voltage-regulator.default.1x.webp': '1aff0d2402b87821d8f9dcf98c9c0c13441d360887420c1128350722d00cc326',
  'voltage-regulator.default.3x.png': 'ee7bc9e2f50febd9afebd87901b744b98cd9acbe865e7cf933a0362e5f7713da',
  'voltage-regulator.default.3x.webp': '2db5122c7f8d1f6d230ee2c17a148fde204b053df9141b67ec9282e02e0ad454',
}

describe('A8 regulator frozen raster', () => {
  it('preserves the five image hashes from the locked base', () => {
    for (const [name, hash] of Object.entries(lockedImageHashes)) {
      expect(createHash('sha256').update(readFileSync(asset(name))).digest('hex'), name).toBe(hash)
    }
  })
  it('uses the normalized runtime manifest and bounded declarative budget', () => {
    const manifest = JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
    expect(manifest).toMatchObject({ backend: 'raster', complexity: 'complex', assetStatus: 'FOUNDER_PASS_FROZEN' })
    expect(getRasterWeightLimitKb(manifest)).toBe(425)
    expect(manifest.assets).toHaveLength(4)
    expect(manifest.assets.map(a => a.file).sort()).toEqual(Object.keys(lockedImageHashes).filter(name => name !== 'REFERENCE.png').sort())
    for (const entry of manifest.assets) {
      const legacy = manifest.files[`${entry.scale}x`]
      expect(entry.file).toBe(legacy[entry.format])
      expect([entry.width, entry.height]).toEqual([legacy.width, legacy.height])
      expect(entry.sha256).toBe(lockedImageHashes[entry.file])
      expect(readFileSync(asset(entry.file)).length).toBe(entry.bytes)
      expect(entry.bytes / 1024).toBeLessThanOrEqual(getRasterWeightLimitKb(manifest))
    }
  })
  it('registers and renders only the approved picture at native proportions', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === 'VOLTAGE_REGULATOR')).toEqual([
      { type: 'VOLTAGE_REGULATOR', component: VoltageRegulatorPart, visual: { backend: 'raster' } },
    ])
    const { container } = render(<VoltageRegulatorPart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    const dir = '/assets/components/voltage-regulator/voltage-regulator.default.'
    const source = container.querySelector('source')
    expect(source.type).toBe('image/webp')
    expect(source.getAttribute('srcset')).toBe(`${dir}1x.webp 1x, ${dir}3x.webp 3x`)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe(`${dir}1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}1x.png 1x, ${dir}3x.png 3x`)
    expect([img.width, img.height]).toEqual([144, 288])
    expect(img.style.objectFit).toBe('contain')
    expect(img.draggable).toBe(false)
    expect(container.textContent).toBe('')
    expect(container.innerHTML).not.toMatch(/data:|base64|background|transform/)
  })
  it('preserves frozen file integrity and native 1x/3x PNG dimensions', () => {
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(Object.keys(integrity.files)).toHaveLength(8)
    for (const [name, expected] of Object.entries(integrity.files)) {
      const raw = readFileSync(asset(name))
      // Git on Windows checks out text with CRLF; the frozen hashes describe LF blobs.
      const bytes = /\.(md|json)$/.test(name) ? Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')) : raw
      expect(bytes.length, name).toBe(expected.bytes)
      expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(expected.sha256)
    }
    for (const scale of [1, 3]) {
      const png = readFileSync(asset(`voltage-regulator.default.${scale}x.png`))
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([144 * scale, 288 * scale])
    }
  })
  it('uses the generic body clip to hide baked leads below y170', () => {
    const component = createComponent('VOLTAGE_REGULATOR', 20, 40)
    const { container } = render(<CircuitProvider><CircuitComponent component={component} /></CircuitProvider>)
    expect(container.querySelector('.circuit-component__body').style.clipPath).toBe('inset(0 0 118px 0)')
  })
})
