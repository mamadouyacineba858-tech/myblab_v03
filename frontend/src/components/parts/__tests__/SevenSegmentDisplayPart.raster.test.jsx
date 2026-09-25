import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SevenSegmentDisplayPart } from '../SevenSegmentDisplayPart.jsx'
import { PartRenderer } from '../PartRenderer.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, getBreadboardHolePosition, holeAt, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { makeBreadboardHoleEndpoint } from '../../../utils/breadboardWireEndpoint.js'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { createSimulationRuntimeSession, runSimulationWithRuntime, SIMULATION_STEP_MS } from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

/**
 * A10-DISP1 — Kingbright SC56-11EWA : asset FROZEN / CSA LOCKED, catalogue, PhysicalContacts
 * normalisés (géométrie PCB constructeur, jamais pixel-probés), renderer raster + émission des
 * segments, insertion breadboard réelle, chaîne Document -> résolution -> Visual State -> renderer.
 */

const TYPE = 'SEVEN_SEGMENT_DISPLAY'
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/seven-segment-sc56-11ewa')
const asset = (name) => resolve(ASSET_DIR, name)
const manifest = () => JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
const hash = (data) => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const FOUNDER_SHA = 'f2b080801d28e38b03a6f9e1d83b973867cd9e0960f751ce07fb63002f056742'
const RUNTIME_1X_PNG_SHA = '35f2a79b353efbef3dc0346eed60438c1446ade7891b9649339d03f0465b3f64'
const PACK = [
  'ASSET-INTEGRITY.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'SHA256SUMS.txt', 'manifest.json',
  'seven-segment-sc56-11ewa.default.1x.png', 'seven-segment-sc56-11ewa.default.1x.webp',
  'seven-segment-sc56-11ewa.default.3x.png', 'seven-segment-sc56-11ewa.default.3x.webp',
  'seven-segment-sc56-11ewa.founder-reference.png',
]
const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP']

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

// Blueprint §3 : broche physique -> [pin électrique, contact physique, x, y] (CSA LOCKED).
const PINS10 = [
  [10, 'g', 'g', 12, 21], [9, 'f', 'f', 24, 21], [8, 'COM', 'COM8', 36, 21], [7, 'a', 'a', 48, 21], [6, 'b', 'b', 60, 21],
  [1, 'e', 'e', 12, 93], [2, 'd', 'd', 24, 93], [3, 'COM', 'COM3', 36, 93], [4, 'c', 'c', 48, 93], [5, 'DP', 'DP', 60, 93],
]

describe('A10-DISP1 — catalogue et PhysicalContacts CSA LOCKED', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap((p) => resolveContacts(p).map((c) => ({ pinId: p.id, ...c })))

  it('boîte 72x114, contrat visuel, une seule entrée palette', () => {
    expect([def.width, def.height]).toEqual([72, 114])
    expect(SCALE_REFERENCE.filter((r) => r.type === TYPE).map((r) => r.box)).toEqual([[72, 114]])
    expect(PALETTE_ITEMS.filter((p) => p.id === TYPE)).toHaveLength(1)
  })

  it('10 PhysicalContacts distincts pour 9 pins électriques ; COM3 et COM8 non fusionnés', () => {
    expect(def.pins).toHaveLength(9)
    expect(contacts).toHaveLength(10)
    expect(new Set(contacts.map((c) => c.id)).size).toBe(10)
    expect(new Set(contacts.map((c) => `${c.dx},${c.dy}`)).size).toBe(10)
    expect(contacts.filter((c) => c.pinId === 'COM').map((c) => c.id)).toEqual(['COM3', 'COM8'])
  })

  it.each(PINS10)('broche %i -> %s (contact %s) exactement en (%i,%i)', (_, pinId, contactId, x, y) => {
    const c = contacts.find((k) => k.id === contactId)
    expect(c).toMatchObject({ pinId, dx: x, dy: y, wireConnectable: true, breadboardInsertable: true })
  })

  it('rangées y=21 / y=93 écartées de 72 = 6 x pitch ; pas horizontal exactement 12', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    for (const y of [21, 93]) {
      const xs = contacts.filter((c) => c.dy === y).map((c) => c.dx).sort((a, b) => a - b)
      expect(xs).toEqual([12, 24, 36, 48, 60])
    }
    expect(93 - 21).toBe(6 * BREADBOARD_PITCH)
    expect(new Set(contacts.map((c) => c.dy))).toEqual(new Set([21, 93]))
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(10)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(10)
  })

  it('le catalogue reproduit exactement les physicalContacts et le pinMap du manifest FROZEN', () => {
    const m = manifest()
    expect(m.runtimeCanvasPx).toEqual({ width: 72, height: 114 })
    expect(m.breadboardPitchPx).toBe(12)
    for (const { pin, dx, dy } of m.physicalContacts) {
      const [, pinId, contactId] = PINS10.find(([n]) => String(n) === pin)
      expect(m.pinMap[pin]).toBe(pinId)
      expect(contacts.find((c) => c.id === contactId)).toMatchObject({ dx, dy })
    }
    expect(m.physicalContacts).toHaveLength(10)
  })
})

describe('A10-DISP1 — pack d\'assets FROZEN / CSA LOCKED', () => {
  it('le dossier contient exactement les 11 fichiers du pack', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
  })

  it('SHA256SUMS couvre tout le pack sauf lui-même et correspond ; Founder et runtime 1x figés', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split('\n').map((l) => l.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter((f) => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(readFileSync(asset(name))), name).toBe(sha)
    expect(hash(readFileSync(asset('seven-segment-sc56-11ewa.founder-reference.png')))).toBe(FOUNDER_SHA)
    expect(hash(readFileSync(asset('seven-segment-sc56-11ewa.default.1x.png')))).toBe(RUNTIME_1X_PNG_SHA)
  })

  it('identité FOUNDER / ASSET-INTEGRITY / manifest (Kingbright SC56-11EWA, cathode commune)', () => {
    expect(JSON.parse(readFileSync(asset('FOUNDER-ASSET.json'), 'utf8'))).toMatchObject({ ticket: 'A10-DISP1', manufacturer: 'Kingbright', reference: 'SC56-11EWA', status: 'FOUNDER_PASS' })
    expect(JSON.parse(readFileSync(asset('ASSET-INTEGRITY.json'), 'utf8'))).toMatchObject({ ticket: 'A10-DISP1', physicalContactsLocked: true, pixelProbeClaim: false })
    expect(manifest()).toMatchObject({ id: 'seven-segment-sc56-11ewa', manufacturerReference: 'SC56-11EWA', topology: 'common-cathode', decimal: 'right-hand' })
    expect(readFileSync(asset('README.md'), 'utf8')).toBe(readFileSync(asset('README.txt'), 'utf8'))
  })

  it('dérivés runtime 72x114 (1x) et 216x342 (3x), PNG et WebP', () => {
    for (const [file, format, expected] of [
      ['seven-segment-sc56-11ewa.default.1x.png', 'png', [72, 114]], ['seven-segment-sc56-11ewa.default.3x.png', 'png', [216, 342]],
      ['seven-segment-sc56-11ewa.default.1x.webp', 'webp', [72, 114]], ['seven-segment-sc56-11ewa.default.3x.webp', 'webp', [216, 342]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })
})

describe('A10-DISP1 — renderer raster + émission des segments', () => {
  const litIn = (container) => [...container.querySelectorAll('[data-segment]')].map((e) => e.getAttribute('data-segment'))

  it('enregistré en backend raster (bareBody + markerless dérivés) ; aucun profil d\'assemblage artificiel', () => {
    expect(DEFAULT_REGISTRATIONS.filter((r) => r.type === TYPE)).toEqual([
      { type: TYPE, component: SevenSegmentDisplayPart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(getAssemblyProfile(TYPE)).toBeNull()
    expect(resolveAssemblyGeometry(createComponent(TYPE, 0, 0), null).contacts).toEqual([])
  })

  it('raster de base présent, dimensions logiques 72x114, aucun segment émis au repos', () => {
    const { container } = render(<SevenSegmentDisplayPart />)
    // A10-DISP1-VIS-CORR-001 : racine > [pattes locales (10) , corps (raster + émission)].
    expect([...container.querySelectorAll('*')].map((e) => e.tagName)).toEqual(['DIV', ...Array(11).fill('DIV'), 'DIV', 'PICTURE', 'SOURCE', 'IMG', 'DIV'])
    expect(container.innerHTML).not.toMatch(/<svg|base64/)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['72px', '114px'])
    expect(root.getAttribute('data-lit-segments')).toBe('')
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([72, 114])
    const dir = '/assets/components/seven-segment-sc56-11ewa/'
    expect(img.getAttribute('src')).toBe(`${dir}seven-segment-sc56-11ewa.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}seven-segment-sc56-11ewa.default.1x.png 1x, ${dir}seven-segment-sc56-11ewa.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}seven-segment-sc56-11ewa.default.1x.webp 1x, ${dir}seven-segment-sc56-11ewa.default.3x.webp 3x`)
    expect(img.style.pointerEvents).toBe('none')
    expect(litIn(container)).toEqual([])
  })

  it('segment OFF non illuminé ; segment a seul ; DP seul', () => {
    const offAll = Object.fromEntries(SEGMENTS.map((s) => [s, false]))
    expect(litIn(render(<SevenSegmentDisplayPart segments={offAll} />).container)).toEqual([])
    expect(litIn(render(<SevenSegmentDisplayPart segments={{ ...offAll, a: true }} />).container)).toEqual(['a'])
    const { container } = render(<SevenSegmentDisplayPart segments={{ ...offAll, DP: true }} />)
    expect(litIn(container)).toEqual(['DP'])
    expect(container.firstChild.getAttribute('data-lit-segments')).toBe('DP')
  })

  it('plusieurs segments simultanés, chacun découpé à sa propre forme d\'émission', () => {
    const { container } = render(<SevenSegmentDisplayPart segments={{ a: true, b: true, c: true, d: true, e: true, f: true, g: false, DP: false }} />)
    expect(litIn(container)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    for (const el of container.querySelectorAll('[data-segment]')) {
      expect(el.style.clipPath).toMatch(/^polygon\(/)
      expect([el.style.width, el.style.height]).toEqual(['72px', '114px'])
    }
  })

  it('seul `true` allume un segment (valeurs truthy, props absentes ou invalides -> éteint)', () => {
    for (const segments of [undefined, null, {}, { a: 1, b: 'true', c: 'on' }]) {
      expect(litIn(render(<SevenSegmentDisplayPart segments={segments} />).container)).toEqual([])
    }
  })

  it('formes d\'émission : une forme distincte par segment (DP = disque), dans le cadre 72x114', () => {
    const { container } = render(<SevenSegmentDisplayPart segments={Object.fromEntries(SEGMENTS.map((s) => [s, true]))} />)
    const shapes = Object.fromEntries([...container.querySelectorAll('[data-segment]')].map((el) => [el.getAttribute('data-segment'), el.style.clipPath]))
    expect(Object.keys(shapes)).toEqual(SEGMENTS)
    expect(new Set(Object.values(shapes)).size).toBe(8)
    expect(shapes.DP).toMatch(/^circle\(/)
    for (const [id, shape] of Object.entries(shapes)) {
      const nums = [...shape.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
      expect(nums.length, id).toBeGreaterThan(2)
      expect(nums.every((n) => n >= 0 && n <= 114), id).toBe(true)
    }
  })

  it('le renderer ne contient aucune logique électrique ni chiffre', () => {
    const source = src('components', 'parts', 'SevenSegmentDisplayPart.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|getSegmentedDisplay|digit|useState|useEffect|founder-reference/)
  })
})

describe('A10-DISP1-VIS-CORR-001 — pattes de présentation locales = PhysicalContacts', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap((p) => resolveContacts(p).map((c) => ({ pinId: p.id, ...c })))
  const px = (v) => Number(String(v).replace('px', ''))
  const leadsOf = (container) => [...container.querySelectorAll('.part-seven-segment-display__lead')].map((el) => {
    const left = px(el.style.left)
    const width = px(el.style.width)
    const top = px(el.style.top)
    const height = px(el.style.height)
    return { el, pinId: el.getAttribute('data-pin'), contactId: el.getAttribute('data-contact'), x: left + width / 2, top, bottom: top + height, tip: { x: Number(el.getAttribute('data-tip-x')), y: Number(el.getAttribute('data-tip-y')) } }
  })
  const bodyOf = (container) => container.querySelector('.part-seven-segment-display__body')
  // Transform du corps : translateY(T) scaleY(k), origine 0 0 -> y' = T + k * y.
  const bodyMap = (container) => {
    const m = bodyOf(container).style.transform.match(/translateY\(([-\d.e]+)px\) scaleY\(([-\d.e]+)\)/)
    return (y) => Number(m[1]) + Number(m[2]) * y
  }
  // Géométrie d'émission A10-DISP1 (commit 13384dc) — doit rester inchangée.
  const SHAPES_13384DC = {
    a: 'polygon(24.3px 29.7px, 27px 27.3px, 52.7px 27.3px, 55px 29.7px, 55px 30.7px, 50.3px 34.7px, 28px 34.7px, 24.3px 30.7px)',
    b: 'polygon(51.3px 35.7px, 55.3px 32px, 56.7px 31.7px, 59px 34.7px, 55.7px 54.3px, 55px 55.7px, 51.3px 58.3px, 48px 54.7px)',
    c: 'polygon(47px 64px, 51px 60.7px, 52px 60.7px, 54px 63px, 54px 66.7px, 51px 84.3px, 48.3px 87px, 47.3px 87px, 44px 83.3px)',
    d: 'polygon(16.3px 87.7px, 20.3px 84px, 43px 84px, 46.3px 87.7px, 46.3px 89px, 44px 91px, 18.3px 91px, 16.3px 89px)',
    e: 'polygon(15.7px 63.3px, 18.7px 60.7px, 20px 60.7px, 22.7px 63.7px, 20px 82.7px, 15.7px 86.7px, 14.3px 86.7px, 12.3px 84.3px)',
    f: 'polygon(20px 33.7px, 22.3px 31.7px, 23.3px 31.7px, 27px 35.7px, 24px 54.3px, 19.7px 58.3px, 19px 58.3px, 16.3px 55px)',
    g: 'polygon(21px 58.7px, 24.7px 55.7px, 46.7px 55.7px, 50px 58.7px, 50px 59.7px, 46.3px 63px, 23.7px 63px, 20.7px 59.7px)',
    DP: 'circle(4.2px at 57.5px 87px)',
  }

  it('exactement 10 pattes : 5 en haut (y=21), 5 en bas (y=93), une par PhysicalContact', () => {
    const leads = leadsOf(render(<SevenSegmentDisplayPart />).container)
    expect(leads).toHaveLength(10)
    expect(leads.map((l) => l.contactId).sort()).toEqual(contacts.map((c) => c.id).sort())
    expect(leads.filter((l) => l.tip.y === 21).map((l) => l.tip.x).sort((a, b) => a - b)).toEqual([12, 24, 36, 48, 60])
    expect(leads.filter((l) => l.tip.y === 93).map((l) => l.tip.x).sort((a, b) => a - b)).toEqual([12, 24, 36, 48, 60])
  })

  it.each(PINS10)('broche %i (%s / %s) : visualLead.tip == PhysicalContact (%i,%i), mesuré sur la géométrie rendue', (_, pinId, contactId, x, y) => {
    const lead = leadsOf(render(<SevenSegmentDisplayPart />).container).find((l) => l.contactId === contactId)
    const contact = contacts.find((c) => c.id === contactId)
    expect(lead.pinId).toBe(pinId)
    expect(lead.tip).toEqual({ x: contact.dx, y: contact.dy })
    expect(lead.tip).toEqual({ x, y })
    expect(lead.x).toBeCloseTo(x, 10) // axe de la patte = colonne du contact
    expect(y === 21 ? lead.top : lead.bottom).toBeCloseTo(y, 10) // extrémité rendue = rangée du contact
  })

  it('COM3 et COM8 : deux pattes visuellement distinctes, même pin électrique COM', () => {
    const leads = leadsOf(render(<SevenSegmentDisplayPart />).container).filter((l) => l.pinId === 'COM')
    expect(leads.map((l) => [l.contactId, l.tip.x, l.tip.y])).toEqual([['COM3', 36, 93], ['COM8', 36, 21]])
    expect(leads[0].el).not.toBe(leads[1].el)
    expect(new Set(def.pins.map((p) => p.id)).has('COM3')).toBe(false)
    expect(new Set(def.pins.map((p) => p.id)).has('COM8')).toBe(false)
  })

  it('les pattes sont de la présentation pure : aucun hit target, aucun handler, aucune géométrie redéclarée', () => {
    const { container } = render(<SevenSegmentDisplayPart />)
    const layer = container.querySelector('.part-seven-segment-display__leads')
    expect(layer.style.pointerEvents).toBe('none')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    for (const { el } of leadsOf(container)) {
      expect(el.style.pointerEvents).toBe('none')
      expect(el.getAttributeNames().filter((n) => n.startsWith('on') || n === 'role' || n === 'tabindex')).toEqual([])
    }
    // Pointes lues dans le catalogue (resolveContacts), jamais recopiées en dur dans le renderer.
    const source = src('components', 'parts', 'SevenSegmentDisplayPart.jsx')
    expect(source).toMatch(/resolveContacts\(pin\)/)
    expect(source).not.toMatch(/dy:\s*(21|93)\b|\b(21|93)\s*[,}]\s*\/\/\s*contact/)
  })

  it('anciennes pattes raster masquées : le corps est découpé à sa bande mesurée [16, 99.667]', () => {
    const body = bodyOf(render(<SevenSegmentDisplayPart />).container)
    expect(body.style.clipPath).toBe('inset(16px 0 14.333px 0)')
    expect(body.querySelector('img')).not.toBeNull()
    expect(body.style.pointerEvents).toBe('none')
  })

  it('corps présenté entre les rangées : chaque patte relie le bord du corps à son contact, visible hors du trou', () => {
    const { container } = render(<SevenSegmentDisplayPart />)
    const map = bodyMap(container)
    const bodyTop = map(16)
    const bodyBottom = map(99.667)
    expect(bodyTop).toBeCloseTo(26, 3)
    expect(bodyBottom).toBeCloseTo(88, 3)
    const HOLE_VISUAL_RADIUS = 2.7 + 0.45 // Breadboard.css .breadboard__hole r + demi-trait
    for (const lead of leadsOf(container)) {
      if (lead.tip.y === 21) {
        expect(lead.bottom).toBeGreaterThan(bodyTop) // racine sous le corps
        expect(bodyTop - lead.tip.y).toBeGreaterThan(HOLE_VISUAL_RADIUS) // métal visible au-delà du trou
      } else {
        expect(lead.top).toBeLessThan(bodyBottom)
        expect(lead.tip.y - bodyBottom).toBeGreaterThan(HOLE_VISUAL_RADIUS)
      }
    }
    // Aucune déformation horizontale : largeur conservée, seule l'échelle verticale change.
    expect(bodyOf(container).style.transform).not.toMatch(/scaleX|scale\(|rotate|skew/)
    expect(bodyOf(container).style.width).toBe('72px')
  })

  it('segments et DP inchangés : mêmes formes d\'émission, portées par le même repère que le corps', () => {
    const { container } = render(<SevenSegmentDisplayPart segments={Object.fromEntries(SEGMENTS.map((s) => [s, true]))} />)
    const body = bodyOf(container)
    const shapes = Object.fromEntries([...body.querySelectorAll('[data-segment]')].map((el) => [el.getAttribute('data-segment'), el.style.clipPath]))
    expect(shapes).toEqual(SHAPES_13384DC)
    expect(body.querySelector('.part-seven-segment-display__emission')).not.toBeNull()
  })

  it('insertion exactement alignée : origine + pointe visuelle == PhysicalContact == centre du trou, pour les 10', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const origin = { x: 24, y: 39 }
    const placement = computeBreadboardPlacement(bb, TYPE, origin, [])
    expect(placement).toMatchObject({ compatible: true, valid: true, position: origin })
    const { results } = resolveComponentContactHoles(bb, def.pins, origin)
    expect(results).toHaveLength(10)
    const leads = leadsOf(render(<SevenSegmentDisplayPart />).container)
    for (const r of results) {
      const hole = getBreadboardHolePosition(bb, r.hole.column, r.hole.row)
      const contact = contacts.find((c) => c.id === r.contactId)
      const lead = leads.find((l) => l.contactId === r.contactId)
      expect({ x: origin.x + contact.dx, y: origin.y + contact.dy }, r.contactId).toEqual(hole)
      expect({ x: origin.x + lead.tip.x, y: origin.y + lead.tip.y }, r.contactId).toEqual(hole)
    }
    expect(results.filter((r) => r.pinId === 'COM').map((r) => r.contactId).sort()).toEqual(['COM3', 'COM8'])
  })

  it('présentation locale uniquement : pas de profil d\'assemblage, BREADBOARD_PITCH inchangé', () => {
    expect(getAssemblyProfile(TYPE)).toBeNull()
    expect(resolveAssemblyGeometry(createComponent(TYPE, 24, 39), { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }).contacts).toEqual([])
    expect(BREADBOARD_PITCH).toBe(12)
  })
})

describe('A10-DISP1 — insertion breadboard réelle STANDARD_V1', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef(TYPE)
  const straddling = []
  for (let x = -30; x <= 60; x++) {
    for (let y = 0; y <= 80; y++) {
      if (x % 12 !== 0 || (y + 21) % 12 !== 0) continue
      const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
      if (results.length !== 10 || !results.every((r) => r.resolved && r.hole.kind === 'STRIP')) continue
      const side = (dy) => new Set(results.filter((r) => resolveContacts(def.pins.find((p) => p.id === r.pinId)).find((c) => c.id === r.contactId).dy === dy).map((r) => r.hole.groupKey.split(':').pop()))
      if (side(21).size === 1 && side(93).size === 1 && side(21).has('top') && side(93).has('bottom')) straddling.push({ x, y, results })
    }
  }

  it('les 10 contacts tombent sur 10 trous distincts, une rangée de chaque côté de la rainure', () => {
    expect(straddling.length).toBeGreaterThan(0)
    const { x, y, results } = straddling[0]
    expect(computeBreadboardPlacement(bb, TYPE, { x, y }, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true, position: { x, y } })
    expect(new Set(results.map((r) => `${r.hole.column}:${r.hole.row}`)).size).toBe(10)
    expect(new Set(results.map((r) => r.hole.groupKey)).size).toBe(10)
    const rows = [...new Set(results.map((r) => r.hole.row))].sort((a, b) => a - b)
    expect(rows[1] - rows[0]).toBe(6)
    const com = results.filter((r) => r.pinId === 'COM')
    expect(com.map((r) => r.contactId).sort()).toEqual(['COM3', 'COM8'])
    expect(com[0].hole.groupKey).not.toBe(com[1].hole.groupKey)
  })
})

describe('A10-DISP1 — chaîne Document -> résolution électrique -> Visual State -> renderer', () => {
  const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef(TYPE)
  let origin = null
  for (let x = 0; x <= 60 && !origin; x += 12) {
    for (let y = 3; y <= 80 && !origin; y += 12) {
      const { results } = resolveComponentContactHoles(bb, def.pins, { x, y })
      if (results.length === 10 && results.every((r) => r.resolved && r.hole.kind === 'STRIP') && new Set(results.map((r) => r.hole.groupKey)).size === 10) origin = { x, y, results }
    }
  }
  /** Un AUTRE trou du même strip que le contact donné (jamais le trou occupé par la broche). */
  const freeHoleInStripOf = (contactId) => {
    const { hole } = origin.results.find((r) => r.contactId === contactId)
    for (const row of [hole.row - 1, hole.row + 1, hole.row - 2, hole.row + 2]) {
      const p = getBreadboardHolePosition(bb, hole.column, row)
      const h = p && holeAt(bb, p.x, p.y)
      if (h && h.groupKey === hole.groupKey) return makeBreadboardHoleEndpoint(bb.id, h.column, h.row)
    }
    throw new Error(`no free hole in strip of ${contactId}`)
  }
  const far = { x: -600, y: -600 }
  /** Source -> R -> segments pilotés (fils pin-pin) ; GND -> trou libre du strip de COM3 / COM8, ou rien. */
  const documentFor = (lit, gndVia) => ({
    breadboard: bb,
    components: [
      { id: 'p', type: 'POWER', position: far },
      ...lit.map((s) => ({ id: `r_${s}`, type: 'RESISTOR', position: far })),
      { id: 'disp', type: TYPE, position: { x: origin.x, y: origin.y } },
    ],
    wires: [
      ...lit.flatMap((s, i) => [
        { id: `ws${i}`, pinA: { componentId: 'p', pinId: '5V' }, pinB: { componentId: `r_${s}`, pinId: 'A' } },
        { id: `wr${i}`, pinA: { componentId: `r_${s}`, pinId: 'B' }, pinB: { componentId: 'disp', pinId: s } },
      ]),
      ...(gndVia ? [{ id: 'wg', pinA: { componentId: 'p', pinId: 'GND' }, pinB: (({ uid, pinId }) => ({ componentId: uid, pinId }))(freeHoleInStripOf(gndVia)) }] : []),
    ],
  })
  const simulate = (doc) => {
    const before = JSON.stringify(doc)
    const input = toEngineInput(doc)
    const pinSignals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession: createSimulationRuntimeSession(), dt: SIMULATION_STEP_MS })
    expect(JSON.stringify(doc)).toBe(before) // Document = vérité persistante, jamais muté par le runtime.
    return pinSignals
  }
  const renderedLit = (pinSignals) => {
    const { container } = render(<PartRenderer type={TYPE} uid="disp" pinSignals={pinSignals} />)
    return container.querySelector('.part-seven-segment-display').getAttribute('data-lit-segments')
  }

  it('origine d\'insertion trouvée (10 trous STRIP, 10 strips distincts)', () => {
    expect(origin).not.toBeNull()
  })

  it('source -> R -> segment a, GND -> strip de COM3 => segment a visible ON', () => {
    const pinSignals = simulate(documentFor(['a'], 'COM3'))
    expect(pinSignals.get('disp:a')).toBe(Signal.HIGH)
    expect(pinSignals.get('disp:COM')).toBe(Signal.LOW)
    expect(renderedLit(pinSignals)).toBe('a')
  })

  it('même circuit, GND -> strip de COM8 (l\'autre broche commune) => même résultat', () => {
    const pinSignals = simulate(documentFor(['a'], 'COM8'))
    expect(pinSignals.get('disp:COM')).toBe(Signal.LOW)
    expect(renderedLit(pinSignals)).toBe('a')
  })

  it('commun déconnecté => segment OFF bien que son anode soit HIGH', () => {
    const pinSignals = simulate(documentFor(['a'], null))
    expect(pinSignals.get('disp:a')).toBe(Signal.HIGH)
    expect(pinSignals.get('disp:COM')).not.toBe(Signal.LOW)
    expect(renderedLit(pinSignals)).toBe('')
  })

  it('plusieurs segments : motif "2" (a b d e g), commun par COM8', () => {
    expect(renderedLit(simulate(documentFor(['a', 'b', 'd', 'e', 'g'], 'COM8')))).toBe('a b d e g')
  })

  it('motif arbitraire non numérique et DP : a f g e d + DP, commun par COM3', () => {
    expect(renderedLit(simulate(documentFor(['a', 'f', 'g', 'e', 'd', 'DP'], 'COM3')))).toBe('a d e f g DP')
  })

  it('COM3 et COM8 forment un seul nœud : le strip de COM8 est ramené au GND quand seul celui de COM3 est câblé', () => {
    const doc = documentFor(['a'], 'COM3')
    // Sonde : une résistance dont une patte est dans le strip de COM8 (câblée par trou) voit ce nœud à LOW.
    doc.components.push({ id: 'probe', type: 'RESISTOR', position: far })
    const hole8 = freeHoleInStripOf('COM8')
    doc.wires.push({ id: 'wprobe', pinA: { componentId: hole8.uid, pinId: hole8.pinId }, pinB: { componentId: 'probe', pinId: 'A' } })
    expect(simulate(doc).get('probe:A')).toBe(Signal.LOW)
  })

  it('aucun branchement spécifique A10 dans PartRenderer / Canvas / breadboard / géométrie / moteur générique', () => {
    for (const path of [['components', 'parts', 'PartRenderer.jsx'], ['canvas', 'CircuitComponent.jsx'], ['canvas', 'Pin.jsx'], ['canvas', 'Breadboard.jsx'],
      ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'], ['utils', 'breadboardConnectivity.js'], ['utils', 'contactModel.js'],
      ['utils', 'assemblyGeometry.js'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx'], ['simulator', 'engine.js'], ['simulator', 'resolution.js'],
      ['simulator', 'preparation.js'], ['simulator', 'scheduler.js'], ['simulator', 'clock.js'], ['simulator', 'simulationRuntimeIntegration.js']]) {
      expect(src(...path), path.join('/')).not.toMatch(/SEVEN_SEGMENT|SevenSegment|seven-segment|SC56|segmentedDisplay/)
    }
  })
})
