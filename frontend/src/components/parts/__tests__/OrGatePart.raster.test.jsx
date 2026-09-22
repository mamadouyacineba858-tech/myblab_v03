import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OrGatePart } from '../OrGatePart.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getRasterWeightLimitKb } from '../../../visualization/rasterBudget.js'
import { getComponentDef, createComponent } from '../../../config/componentDefinitions.js'
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
const asset = name => resolve(here, '../../../../public/assets/components/or-gate', name)
const json = name => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const frozenSha = '56a3c8991d902c337dac73a1ed451df34184a67c2e443a7e051a778ee6d73b67'
function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

describe('A9-OR raster and frozen source', () => {
  it('T21: registered raster renderer uses only the approved picture', () => {
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === 'OR_GATE')).toEqual([
      { type: 'OR_GATE', component: OrGatePart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation('OR_GATE')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    const { container } = render(<OrGatePart />)
    expect([...container.querySelectorAll('*')].map(e => e.tagName)).toEqual(['DIV', 'PICTURE', 'SOURCE', 'IMG'])
    expect(container.innerHTML).not.toMatch(/<svg|background|transform|base64/)
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([144, 96])
    expect(img.getAttribute('src')).toBe('/assets/components/or-gate/or-gate.default.1x.png')
    expect(img.getAttribute('srcset')).toContain('or-gate.default.3x.png 3x')
    expect(container.querySelector('source').getAttribute('srcset')).toContain('or-gate.default.3x.webp 3x')
    expect(img.style.objectFit).toBe('contain')
  })
  it('T22: original Founder bytes and actual dimensions match an independent lock', () => {
    const raw = readFileSync(asset('or-gate.founder-reference.png'))
    expect(hash(raw)).toBe(frozenSha)
    expect(size(raw, 'png')).toEqual([1536, 1024])
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ sha256: frozenSha, dimensions: [1536, 1024], mode: 'RGB' })
    expect(raw[25]).toBe(2) // PNG truecolour RGB, no alpha.
    expect(json('manifest.json').reference.sha256).toBe(frozenSha)
  })
  it('runtime inventory, dimensions, hashes and normal complex budget are truthful', () => {
    const m = json('manifest.json')
    expect(m).toMatchObject({ component: 'OR_GATE', backend: 'raster', states: ['default'], canonical: { width: 144, height: 96 }, budget: { complexity: 'complex' } })
    expect(m.assets.map(a => a.file).sort()).toEqual(['or-gate.default.1x.png', 'or-gate.default.1x.webp', 'or-gate.default.3x.png', 'or-gate.default.3x.webp'])
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

describe('A9-OR physical fit through existing generic contracts', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  // Lower functional feet land on distinct top-strip columns 4/6/8, row 3.
  const origin = { x: 0, y: -48 }
  const def = getComponentDef('OR_GATE')
  it('T24: three exact contacts, pitch 12, short measured roots, no clipping', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(def.pins.flatMap(resolveContacts).map(c => [c.id, c.dx, c.dy, c.breadboardInsertable])).toEqual([
      ['A', 48, 84, true], ['B', 72, 84, true], ['Q', 96, 84, true],
    ])
    const g = resolveAssemblyGeometry(createComponent('OR_GATE', 0, 0), null)
    expect(g.contacts.map(c => [c.root.x, c.root.y])).toEqual([[47.203125, 82.03125], [70.921875, 82.03125], [94.546875, 82.03125]])
    expect(json('manifest.json').derivation.pixelProbe.map(p => p.runtimeRoot)).toEqual(g.contacts.map(c => [c.root.x, c.root.y]))
    expect(getAssemblyProfile('OR_GATE').bodyClip).toBeUndefined()
    for (const c of g.contacts) expect(Math.hypot(c.root.x - c.target.x, c.root.y - c.target.y)).toBeLessThan(2.5)
  })
  it('all three contacts insert exactly onto distinct breadboard nets', () => {
    const placement = computeBreadboardPlacement(bb, 'OR_GATE', origin, [])
    expect(placement).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: origin })
    const comp = createComponent('OR_GATE', origin.x, origin.y)
    const g = resolveAssemblyGeometry(comp, bb)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(3)
    expect(new Set(g.contacts.map(c => c.hole.column)).size).toBe(3)
    for (const c of g.contacts) {
      expect(c.target).toEqual(c.holePosition)
      expect(c.target).toEqual(getPinPresentationPosition(comp, def.pins.find(p => p.id === c.pinId)))
    }
    const { container } = render(<AssemblyLeadsLayer geometry={g} originX={origin.x} originY={origin.y} />)
    expect(container.querySelectorAll('.assembly-leads__metallic-stack')).toHaveLength(3)
    expect(container.querySelectorAll('.assembly-leads__lead')).toHaveLength(3)
  })
  it.each([true, false])('real Document adapter connects Q through breadboard to another gate (A=%s)', high => {
    const doc = {
      breadboard: bb,
      components: [
        { id: 'p', type: 'POWER', position: { x: -500, y: -500 } },
        { id: 'g1', type: 'OR_GATE', position: origin },
        // g2.A at (96,48), same column/net as g1.Q at (96,36).
        { id: 'g2', type: 'OR_GATE', position: { x: 48, y: -36 } },
      ],
      wires: [
        { id: 'a', pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'g1', pinId: 'A' } },
        ...['g1', 'g2'].map(id => ({ id: `b-${id}`, pinA: { componentId: 'p', pinId: 'GND' }, pinB: { componentId: id, pinId: 'B' } })),
      ],
    }
    const before = JSON.stringify(doc)
    const input = toEngineInput(doc)
    expect(runSimulationStep(input.components, input.wires).pinSignals.get('g2:Q')).toBe(high ? Signal.HIGH : Signal.LOW)
    expect(JSON.stringify(doc)).toBe(before)
    const offBoard = toEngineInput({ ...doc, breadboard: null })
    expect(runSimulationStep(offBoard.components, offBoard.wires).pinSignals.get('g2:Q')).toBe(Signal.UNKNOWN)
  })
})
