import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { getComponentDef } from '../../../config/componentDefinitions.js'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, '../../../../public/assets/components/arduino/manifest.json'), 'utf8'))

describe('A13-ARD-SURF2-REALISM-008 — separate electrical and presentation geometry', () => {
  it('keeps centred Arduino hit targets narrower than the nearest hole pitch, including hover', () => {
    const css = readFileSync(resolve(here, '../ArduinoPart.css'), 'utf8')
    const pinCss = readFileSync(resolve(here, '../../../canvas/Pin.css'), 'utf8')
    const width = Number(css.match(/\bwidth:\s*([\d.]+)px/)[1])
    const height = Number(css.match(/\bheight:\s*([\d.]+)px/)[1])
    const hover = Number(pinCss.match(/transform:\s*scale\(([\d.]+)\)/)[1])
    const points = Object.values(manifest.geometryContract.presentationContacts)
    const distances = points.flatMap((a, i) => points.slice(i + 1).map(b => Math.hypot(a[0] - b[0], a[1] - b[1])))
    expect(width).toBeGreaterThan(0)
    expect(width * hover).toBeLessThan(Math.min(...distances))
    expect(height).toBe(width)
    expect(Number(css.match(/margin-left:\s*(-[\d.]+)px/)[1])).toBe(-width / 2)
    expect(Number(css.match(/margin-top:\s*(-[\d.]+)px/)[1])).toBe(-height / 2)
  })

  it('matches every declared PhysicalContact without migrating electrical coordinates', () => {
    const def = getComponentDef('ARDUINO')
    const contract = manifest.geometryContract
    expect(contract.status).toBe('horizontal-candidate-not-qualified')
    expect(def.pins).toHaveLength(16)
    expect(Object.keys(contract.presentationContacts).sort()).toEqual(def.pins.map(p => p.id).sort())
    for (const pin of def.pins) {
      expect(pin.contacts).toHaveLength(1)
      expect(contract.presentationContacts[pin.id]).toEqual([pin.contacts[0].dx, pin.contacts[0].dy])
      if (Object.hasOwn(contract.electricalPins, pin.id)) {
        expect(contract.electricalPins[pin.id]).toEqual([pin.dx, pin.dy])
      } else {
        expect(Number.isFinite(pin.dx) && Number.isFinite(pin.dy)).toBe(true)
      }
    }
  })

  it('preserves legacy dimensions and manifest pin map', () => {
    expect([manifest.canonical.width, manifest.canonical.height]).toEqual([180, 120])
    expect(manifest.canonical.pins.GND).toEqual([112.15, 107.96])
    expect(manifest.canonical.pins['5V']).toEqual([106.41, 107.96])
    expect(manifest.canonical.pins.D2).toEqual([153.75, 8.35])
    expect(manifest.canonical.pins.D3).toEqual([148.12, 8.35])
  })
})
