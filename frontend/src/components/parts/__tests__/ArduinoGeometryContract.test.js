import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { getComponentDef } from '../../../config/componentDefinitions.js'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, '../../../../public/assets/components/arduino/manifest.json'), 'utf8'))

describe('A13-ARD-SURF2-REALISM-008 — separate electrical and presentation geometry', () => {
  it('matches every declared PhysicalContact without migrating electrical coordinates', () => {
    const def = getComponentDef('ARDUINO')
    const contract = manifest.geometryContract
    expect(contract.status).toBe('legacy-preserved-pending-founder-canvas-pass')
    expect(def.pins).toHaveLength(16)
    expect(Object.keys(contract.presentationContacts).sort()).toEqual(def.pins.map(p => p.id).sort())
    for (const pin of def.pins) {
      expect(pin.contacts).toHaveLength(1)
      expect(contract.presentationContacts[pin.id]).toEqual([pin.contacts[0].dx, pin.contacts[0].dy])
      if (Object.hasOwn(contract.electricalPins, pin.id)) {
        expect(contract.electricalPins[pin.id]).toEqual([pin.dx, pin.dy])
      } else {
        expect([pin.dx, pin.dy]).toEqual(contract.presentationContacts[pin.id])
      }
    }
  })

  it('preserves legacy dimensions and manifest pin map', () => {
    expect([manifest.canonical.width, manifest.canonical.height]).toEqual([120, 140])
    expect(manifest.canonical.pins.GND).toEqual([0, 110])
    expect(manifest.canonical.pins['5V']).toEqual([120, 50])
    expect(manifest.canonical.pins.D2).toEqual([102, 33])
    expect(manifest.canonical.pins.D3).toEqual([98, 33])
  })
})
