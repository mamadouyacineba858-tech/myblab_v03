import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RelayPart } from '../RelayPart.jsx'
import { getComponentDef, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { getComponentByType, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { resolveContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'

const dir = dirname(fileURLToPath(import.meta.url))
const asset = (name) => resolve(dir, '../../../../public/assets/components/relay', name)
const hashes = {
  'relay.default.1x.png': ['81ad8a6c94f2e58851e0928f53c34d8edf79560f08a2749ad235869a05323aa3', 119899],
  'relay.default.1x.webp': ['68c4f650308331c84c1fc48528443e5547cfd86b898a64d9afdb91248b4198ed', 86320],
  'relay.default.3x.png': ['1e6818b54ab8c086239b1464431b6463e6d19888d847c6e0864c0a811b361cd4', 133014],
  'relay.default.3x.webp': ['779c84b5339b073efde8fb2343dd663617668cea48533452a83fabcc437394df', 162768],
}
const def = getComponentDef('RELAY')
describe('A8-RELAY frozen raster and renderer', () => {
  it('registers the raster, palette and 288x288 renderer with both formats and densities', () => {
    expect(getComponentByType('RELAY')).toBe(RelayPart)
    expect(getComponentPresentation('RELAY')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(PALETTE_ITEMS.find((p) => p.id === 'RELAY')).toBe(def)
    const { container } = render(<RelayPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('source').getAttribute('srcset')).toBe('/assets/components/relay/relay.default.1x.webp 1x, /assets/components/relay/relay.default.3x.webp 3x')
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('/assets/components/relay/relay.default.1x.png')
    expect(img.getAttribute('srcset')).toBe('/assets/components/relay/relay.default.1x.png 1x, /assets/components/relay/relay.default.3x.png 3x')
    expect([img.width, img.height]).toEqual([288, 288])
    expect(img.style.objectFit).toBe('contain')
  })
  it('preserves every mandatory hash, byte length, dimension and per-file budget', () => {
    const manifest = JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
    const integrity = JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))
    expect(manifest).toMatchObject({ component: 'RELAY', backend: 'raster', state: 'default', complexity: 'complex', founderStatus: 'FOUNDER PASS / FROZEN', canonical: { width: 288, height: 288 } })
    expect(manifest.assets).toHaveLength(4)
    expect(integrity).toMatchObject({ component: 'RELAY', algorithm: 'SHA-256' })
    expect(Object.keys(integrity.files).sort()).toEqual(Object.keys(hashes).sort())
    for (const entry of manifest.assets) {
      const bytes = readFileSync(asset(entry.file))
      const [sha256, length] = hashes[entry.file]
      expect(bytes.length).toBe(length)
      expect(bytes.length).toBeLessThanOrEqual(175 * 1024)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256)
      expect(integrity.files[entry.file]).toEqual({ sha256, bytes: length })
      const size = entry.scale === '1x' ? 288 : 864
      if (entry.format === 'png') expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([size, size])
      else {
        const chunk = bytes.toString('ascii', 12, 16)
        if (chunk === 'VP8X') expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]).toEqual([size, size])
        else {
          expect(chunk).toBe('VP8L')
          const bits = bytes.readUInt32LE(21)
          expect([(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]).toEqual([size, size])
        }
      }
      expect([entry.width, entry.height]).toEqual([size, size])
    }
    const reference = readFileSync(asset('REFERENCE.png'))
    expect([reference.readUInt32BE(16), reference.readUInt32BE(20)]).toEqual([1536, 1024])
    expect(createHash('sha256').update(reference).digest('hex')).toBe('e1ac7d17db443c7ec10854197a23d56b3eb796b706acf4bd4842fefeeed2c9f0')
  })
})
describe('A8-RELAY physical footprint', () => {
  it('uses five distinct insertable contacts in two rows with common pitch residues', () => {
    const contacts = def.pins.flatMap(resolveContacts)
    expect(contacts).toHaveLength(5)
    for (const contact of contacts) {
      expect(contact).toMatchObject({ wireConnectable: true, breadboardInsertable: true })
      expect((contact.dx - contacts[0].dx) % BREADBOARD_PITCH).toBe(0)
      expect((contact.dy - contacts[0].dy) % BREADBOARD_PITCH).toBe(0)
    }
    expect(new Set(contacts.map((c) => `${c.dx}:${c.dy}`)).size).toBe(5)
    expect([...new Set(contacts.map((c) => c.dy))]).toEqual([288, 312])
  })
  it('resolves all five holes across the groove, with no shared strip groups or invented fifth root', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const component = { uid: 'relay', type: 'RELAY', x: 36 - 60, y: 84 - 288 }
    const { results } = resolveComponentContactHoles(bb, def.pins, component)
    expect(results).toHaveLength(5)
    expect(results.every((r) => r.resolved)).toBe(true)
    expect(new Set(results.map((r) => `${r.hole.column}:${r.hole.row}`)).size).toBe(5)
    expect(new Set(results.map((r) => r.hole.groupKey)).size).toBe(5)
    expect(computeBreadboardPlacement(bb, 'RELAY', component, [])).toMatchObject({ compatible: true, valid: true })
    const geometry = resolveAssemblyGeometry(component, bb)
    expect(geometry.inserted).toBe(true)
    expect(geometry.contacts).toHaveLength(5)
    for (const contact of geometry.contacts) expect(contact.target).toEqual(contact.holePosition)
    expect(getAssemblyProfile('RELAY').leads).toEqual({})
    expect(getAssemblyProfile('RELAY').bodyClip).toBeUndefined()
    for (const contact of geometry.contacts) {
      expect(contact.root).toEqual(contact.target)
    }
  })
})
