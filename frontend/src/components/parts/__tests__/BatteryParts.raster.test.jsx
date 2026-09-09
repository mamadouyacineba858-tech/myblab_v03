import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { getComponentDef, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { getComponentByType, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { resolveContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'

const assetRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/assets/components')
const cases = [
  ['BATTERY_9V','battery-9v',70,90,[50.5,12.5],[20.5,12.5]],
  ['COIN_CELL_CR2032','coin-cell-cr2032',60,60,[30.5,8.5],[30.5,52.5]],
  ['BATTERY_AA','battery-aa',40,100,[28.5,10.5],[12.5,10.5]],
]
describe.each(cases)('FT-C-BAT-001 %s raster', (type,slug,width,height,plus,minus) => {
  it('registered renderer, palette, deterministic picture with both densities and formats', () => {
    expect(PALETTE_ITEMS.some(item => item.id === type)).toBe(true)
    expect(getComponentPresentation(type)).toEqual({ backend:'raster',bareBody:true,markerless:true })
    const Part = getComponentByType(type)
    const { container, unmount } = render(<Part />)
    expect(container.querySelector('svg, [id]')).toBeNull()
    const img = container.querySelector('picture img')
    expect(img.getAttribute('width')).toBe(String(width))
    expect(img.getAttribute('height')).toBe(String(height))
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    for (const scale of ['1x','3x']) {
      expect(img.getAttribute('srcset')).toContain(`${slug}.default.${scale}.png ${scale}`)
      expect(container.querySelector('source').getAttribute('srcset')).toContain(`${slug}.default.${scale}.webp ${scale}`)
    }
    unmount()
  })
  it('physical contacts match manifests and are external wire-only terminals', () => {
    const def = getComponentDef(type)
    const contacts = def.pins.flatMap(p => resolveContacts(p).map(c => ({ ...c, pinId: p.id })))
    expect(contacts.map(c => [c.pinId,c.dx,c.dy])).toEqual([['plus',...plus],['minus',...minus]])
    expect(contacts.every(c => c.wireConnectable && !c.breadboardInsertable)).toBe(true)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toEqual([])
    expect(def.pins.map(p => [p.id,p.dx,p.dy])).toEqual([['plus',...plus],['minus',...minus]])
    const manifest = JSON.parse(readFileSync(resolve(assetRoot,slug,'manifest.json')))
    expect(manifest.canonical.pins).toEqual({plus,minus})
  })
  it('all local variants match integrity hashes and PNG dimensions', () => {
    const root = resolve(assetRoot,slug)
    const integrity = JSON.parse(readFileSync(resolve(root,'ASSET-INTEGRITY.json')))
    expect(integrity.files).toHaveLength(5)
    for (const { file: name, sha256: hash } of integrity.files) {
      const bytes = readFileSync(resolve(root,name))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
      if (name.endsWith('.png')) {
        const scale = name.includes('.3x.') ? 3 : 1
        expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([width*scale,height*scale])
      }
    }
  })
})
