import React from 'react' // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LcdWh1602bPart } from '../LcdWh1602bPart.jsx'
import { PartRenderer } from '../PartRenderer.jsx'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../../../visualization/defaultRegistrations.js'
import { getVisualState, hasVisualStateResolver } from '../../../visualization/visualStateRegistry.js'
import '../../../visualization/defaultVisualStateRegistrations.js'
import { projectSt7066uDisplay } from '../../../visualization/st7066uDisplayProjection.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { SCALE_REFERENCE } from '../../../visualization/visualContract.js'
import { getComponentDef, createComponent, PALETTE_ITEMS } from '../../../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../../../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../../../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH, getBreadboardHolePosition, resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { toEngineInput } from '../../../simulator/engineAdapter.js'
import { getTimedDigitalContribution } from '../../../simulator/timedDigitalContributionRegistry.js'
import {
  createSimulationRuntimeSession,
  runSimulationWithRuntime,
  snapshotTimedDigitalStates,
  SIMULATION_STEP_MS,
} from '../../../simulator/simulationRuntimeIntegration.js'
import { Signal } from '../../../simulator/signals.js'

/**
 * A10-DISP2 — Winstar WH1602B : pack CSA RUNTIME-V2 FROZEN, catalogue, 16 PhysicalContacts FINAL
 * LOCK (normalisés du plan constructeur, jamais pixel-probés), projection lecture seule de l'état
 * runtime ST7066U, renderer raster + caractères 5x8, insertion breadboard, chaîne Document ->
 * runtime -> snapshot -> PartRenderer (LCD-03, LCD-37 .. LCD-42, LCD-44).
 */

const TYPE = 'LCD_16X2_WH1602B'
const { HIGH, LOW } = Signal
const here = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(here, '../../../../public/assets/components/lcd-wh1602b')
const asset = (name) => resolve(ASSET_DIR, name)
const json = (name) => JSON.parse(readFileSync(asset(name), 'utf8'))
const hash = (data) => createHash('sha256').update(data).digest('hex')
const src = (...p) => readFileSync(resolve(here, '../../..', ...p), 'utf8')
const TEXT_FILE = /\.(json|md|txt)$/
// Fichiers texte : hachés tels que committés (LF) — une copie de travail Windows (core.autocrlf)
// les matérialise en CRLF sans modifier le contenu versionné.
const packBytes = (name) => (TEXT_FILE.test(name) ? Buffer.from(readFileSync(asset(name), 'utf8').replace(/\r\n/g, '\n'), 'utf8') : readFileSync(asset(name)))
const FOUNDER_SHA = 'fae5f5b9e149f5fb81c85a2fbe85547edc2fcc7b3f40038214201f604ead1949'
const RUNTIME_SHA = {
  'lcd-wh1602b.default.1x.png': '6371638b57735fbefd82e2b70b9e11e1322b56e6b8d0a4019aa800b8edbc8764',
  'lcd-wh1602b.default.1x.webp': 'd7b33f509bef0a3fcae31efd2a028258b7de5983c5d55c70c9a563824da125d7',
  'lcd-wh1602b.default.3x.png': '94b915dd2c0abed14850e4eb9c43a96316053edabdc2871b4eba0a560f9d9ee5',
  'lcd-wh1602b.default.3x.webp': '7b251a5fbcffe9d766494733b4228d899f20790754ef2b08fe50e41bb39dd450',
}
const PACK = [
  'ASSET-INTEGRITY.json', 'CONTACT-VALIDATION.json', 'FOUNDER-ASSET.json', 'README.md', 'README.txt', 'RUNTIME-V2.json',
  'SHA256SUMS.txt', 'manifest.json', ...Object.keys(RUNTIME_SHA), 'lcd-wh1602b.founder-reference.png',
]
// Hardware lock : broche physique -> [pin électrique, x, y] (FINAL LOCK, pas 12, portée 180).
const PINS16 = [
  [1, 'VSS', 12], [2, 'VDD', 24], [3, 'VO', 36], [4, 'RS', 48], [5, 'RW', 60], [6, 'E', 72], [7, 'DB0', 84], [8, 'DB1', 96],
  [9, 'DB2', 108], [10, 'DB3', 120], [11, 'DB4', 132], [12, 'DB5', 144], [13, 'DB6', 156], [14, 'DB7', 168], [15, 'A', 180], [16, 'K', 192],
]
const BLANK_LINE = ' '.repeat(16)

function size(raw, format) {
  if (format === 'png') return [raw.readUInt32BE(16), raw.readUInt32BE(20)]
  const kind = raw.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + raw.readUIntLE(24, 3), 1 + raw.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const v = raw.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  return [raw.readUInt16LE(26) & 0x3fff, raw.readUInt16LE(28) & 0x3fff]
}

/** Décodeur PNG minimal (RGBA 8 bits, non entrelacé) — lecture seule du raster FROZEN. */
function decodeRgbaPng(raw) {
  const width = raw.readUInt32BE(16)
  const height = raw.readUInt32BE(20)
  expect([raw[24], raw[25], raw[28]]).toEqual([8, 6, 0])
  const idat = []
  for (let offset = 8; offset < raw.length;) {
    const length = raw.readUInt32BE(offset)
    const kind = raw.toString('ascii', offset + 4, offset + 8)
    if (kind === 'IDAT') idat.push(raw.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
  }
  const data = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const value = data[y * (stride + 1) + 1 + x]
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0
      const p = a + b - c
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter]
      pixels[y * stride + x] = (value + predictor) & 0xff
    }
  }
  return { width, height, at: (x, y) => [...pixels.subarray(y * stride + x * 4, y * stride + x * 4 + 4)] }
}

/** État runtime ST7066U réel, produit par la contribution de production (jamais un objet fabriqué). */
function runtimeStateAfter(transactions) {
  const contribute = getTimedDigitalContribution(TYPE)
  let state
  let t = 0
  const apply = (levels) => {
    t += 1
    state = contribute({ component: { uid: 'lcd', type: TYPE }, pins: [], params: {}, currentTimeMs: t, previousState: state, pinSignals: { VSS: LOW, VDD: HIGH, RW: LOW, ...levels } }).state
  }
  for (const [rs, byte] of transactions) {
    const bus = Object.fromEntries(['DB0', 'DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'DB6', 'DB7'].map((pin, i) => [pin, (byte >> i) & 1 ? HIGH : LOW]))
    apply({ RS: rs, ...bus, E: HIGH })
    apply({ RS: rs, ...bus, E: LOW })
  }
  return state
}
const command = (byte) => [LOW, byte]
const chars = (s) => [...s].map((c) => [HIGH, c.charCodeAt(0)])

describe('A10-DISP2 — LCD-03 catalogue et PhysicalContacts FINAL LOCK', () => {
  const def = getComponentDef(TYPE)
  const contacts = def.pins.flatMap((p) => resolveContacts(p).map((c) => ({ pinId: p.id, ...c })))

  it('boîte 378x170 = raster runtime V2, contrat visuel 80 x 36 mm, une seule entrée palette', () => {
    expect([def.width, def.height]).toEqual([378, 170])
    expect(SCALE_REFERENCE.filter((r) => r.type === TYPE).map((r) => [r.box, r.physicalMm])).toEqual([[[378, 170], [80, 36]]])
    expect(PALETTE_ITEMS.filter((p) => p.id === TYPE)).toHaveLength(1)
    expect(def.pins.find((p) => p.id === 'RW').label).toBe('R/W')
  })

  it('LCD-03: exactement 16 PhysicalContacts, un par pin, wireConnectable et breadboardInsertable', () => {
    expect(def.pins).toHaveLength(16)
    expect(contacts).toHaveLength(16)
    expect(def.pins.flatMap(resolveWireConnectableContacts)).toHaveLength(16)
    expect(def.pins.flatMap(resolveBreadboardInsertableContacts)).toHaveLength(16)
  })

  it.each(PINS16)('LCD-03: broche %i -> %s exactement en (%i,12)', (_, pinId, x) => {
    expect(contacts.find((c) => c.pinId === pinId)).toMatchObject({ id: pinId, dx: x, dy: 12, wireConnectable: true, breadboardInsertable: true })
    expect(def.pins.find((p) => p.id === pinId)).toMatchObject({ dx: x, dy: 12 })
  })

  it('LCD-03: une rangée y=12, pas 12, portée 180, largeur électrique 204', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const xs = contacts.map((c) => c.dx)
    expect(xs).toEqual(PINS16.map(([, , x]) => x))
    expect(xs.slice(1).map((x, i) => x - xs[i])).toEqual(new Array(15).fill(12))
    expect(xs.at(-1) - xs[0]).toBe(180)
    expect(xs.at(-1) + 12).toBe(204)
    expect(new Set(contacts.map((c) => c.dy))).toEqual(new Set([12]))
  })

  it('LCD-03: le catalogue reproduit exactement manifest.json et RUNTIME-V2.json (FINAL LOCK, pixel_probed false)', () => {
    const m = json('manifest.json')
    expect(m.physicalContactsStatus).toBe('FINAL_LOCK')
    expect(m.geometryBasis).toMatchObject({ pitchPx: 12, spanPx: 180, electricalWidthPx: 204, pixelProbed: false })
    expect(m.physicalContacts).toHaveLength(16)
    for (const { pin, dx, dy } of m.physicalContacts) {
      const [, pinId] = PINS16.find(([n]) => String(n) === pin)
      expect(m.pinMap[pin]).toBe(pinId === 'RW' ? 'R/W' : pinId)
      expect(contacts.find((c) => c.pinId === pinId)).toMatchObject({ dx, dy })
    }
    const v2 = json('RUNTIME-V2.json')
    expect(v2.physicalContacts).toMatchObject({ pixel_probed: false, pitch_px: 12, span_px: 180 })
    for (const { pin, name, x, y } of v2.physicalContacts.contacts) {
      const [, pinId] = PINS16.find(([n]) => n === pin)
      expect(name).toBe(pinId === 'RW' ? 'R/W' : pinId)
      expect(contacts.find((c) => c.pinId === pinId)).toMatchObject({ dx: x, dy: y })
    }
  })

  it('insertion breadboard : les 16 contacts tombent exactement sur 16 trous d\'une même rangée', () => {
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const origin = { x: 12, y: 24 }
    expect(computeBreadboardPlacement(bb, TYPE, origin, [])).toMatchObject({ compatible: true, valid: true, position: origin })
    const { results } = resolveComponentContactHoles(bb, def.pins, origin)
    expect(results).toHaveLength(16)
    expect(new Set(results.map((r) => r.hole.row)).size).toBe(1)
    for (const r of results) {
      const contact = contacts.find((c) => c.id === r.contactId)
      expect({ x: origin.x + contact.dx, y: origin.y + contact.dy }, r.contactId).toEqual(getBreadboardHolePosition(bb, r.hole.column, r.hole.row))
    }
  })

  it('aucun profil d\'assemblage : pas de pattes ni diagonales artificielles (pastilles du header = contacts)', () => {
    expect(getAssemblyProfile(TYPE)).toBeNull()
    expect(resolveAssemblyGeometry(createComponent(TYPE, 0, 12), { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }).contacts).toEqual([])
  })
})

describe('A10-DISP2 — LCD-44 pack CSA RUNTIME-V2 FROZEN (lecture seule)', () => {
  it('LCD-44: le dossier contient exactement les 13 fichiers du pack', () => {
    expect(existsSync(ASSET_DIR)).toBe(true)
    expect(readdirSync(ASSET_DIR).sort()).toEqual([...PACK].sort())
  })

  it('LCD-44: SHA256SUMS couvre tout le pack sauf lui-même et correspond ; Founder et runtime figés', () => {
    const listed = readFileSync(asset('SHA256SUMS.txt'), 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/))
    expect(listed.map(([, name]) => name).sort()).toEqual(PACK.filter((f) => f !== 'SHA256SUMS.txt').sort())
    for (const [sha, name] of listed) expect(hash(packBytes(name)), name).toBe(sha)
    expect(hash(readFileSync(asset('lcd-wh1602b.founder-reference.png')))).toBe(FOUNDER_SHA)
    for (const [name, sha] of Object.entries(RUNTIME_SHA)) expect(hash(readFileSync(asset(name))), name).toBe(sha)
  })

  it('identité : Winstar WH1602B-TFH-JT#, ST7066U, 16x2 5x8 ; V2 est l\'autorité runtime, V1 rejeté', () => {
    const m = json('manifest.json')
    expect(m).toMatchObject({ id: 'lcd-wh1602b', manufacturer: 'Winstar Display', manufacturerReference: 'WH1602B-TFH-JT#', controller: 'ST7066U', display: { characters: 16, lines: 2, dotMatrix: '5x8' } })
    expect(m.runtime).toMatchObject({ source: 'CSA RUNTIME-V2', headerPads: 16, headerPadsAlignedToPhysicalContacts: true })
    expect(m.runtime.files).toEqual({ '1x': ['lcd-wh1602b.default.1x.png', 'lcd-wh1602b.default.1x.webp'], '3x': ['lcd-wh1602b.default.3x.png', 'lcd-wh1602b.default.3x.webp'] })
    expect(json('FOUNDER-ASSET.json')).toMatchObject({ ticket: 'A10-DISP2', status: 'FOUNDER_PASS', frozen: true })
    expect(json('ASSET-INTEGRITY.json')).toMatchObject({ ticket: 'A10-DISP2', physicalContactsLocked: true, pixelProbeClaim: false })
    expect(readdirSync(ASSET_DIR).filter((f) => /V1|DERIVATIVE/i.test(f))).toEqual([])
  })

  it('dérivés runtime 378x170 (1x) et 1134x510 (3x), PNG et WebP', () => {
    for (const [file, format, expected] of [
      ['lcd-wh1602b.default.1x.png', 'png', [378, 170]], ['lcd-wh1602b.default.3x.png', 'png', [1134, 510]],
      ['lcd-wh1602b.default.1x.webp', 'webp', [378, 170]], ['lcd-wh1602b.default.3x.webp', 'webp', [1134, 510]],
    ]) {
      expect(size(readFileSync(asset(file)), format), file).toEqual(expected)
    }
  })

  it('LCD-42: aucun texte fonctionnel dans le raster — déclaré par le pack et vérifié sur les pixels de la zone active', () => {
    expect(json('manifest.json').runtime.charactersBakedIntoRaster).toBe(false)
    expect(json('RUNTIME-V2.json').runtimeRules.charactersBakedIntoRaster).toBe(false)
    const png = decodeRgbaPng(readFileSync(asset('lcd-wh1602b.default.1x.png')))
    expect([png.width, png.height]).toEqual([378, 170])
    // Zone des 16x2 cellules (repère 1x) : seulement le fond clair de la fenêtre et les grilles 5x8
    // vides (points semi-transparents). Composé sur blanc, aucun pixel n'approche l'encre d'un caractère.
    let darkest = 255
    for (let y = 70; y < 120; y++) for (let x = 55; x < 312; x++) {
      const [r, g, b, a] = png.at(x, y)
      darkest = Math.min(darkest, ((r + g + b) / 3) * (a / 255) + 255 * (1 - a / 255))
    }
    expect(darkest).toBeGreaterThan(120)
    // Les pastilles du header sont bien sous chaque PhysicalContact (pixels opaques).
    for (const [, , x] of PINS16) expect(png.at(x, 12)[3], `pad x=${x}`).toBe(255)
  })
})

describe('A10-DISP2 — LCD-37 .. LCD-40 projection lecture seule (Visual State Registry)', () => {
  it('le resolver est enregistré pour le type et ne dépend que de runtimeState (pas des pinSignals)', () => {
    expect(hasVisualStateResolver(TYPE)).toBe(true)
    const state = runtimeStateAfter([command(0x0c), ...chars('Hi')])
    const withSignals = getVisualState(TYPE, { uid: 'lcd', pinSignals: new Map([['lcd:E', HIGH]]), runtimeState: state })
    const withoutSignals = getVisualState(TYPE, { uid: 'other', pinSignals: new Map(), runtimeState: state })
    expect(withSignals).toEqual(withoutSignals)
    expect(Object.keys(withSignals)).toEqual(['lcd'])
  })

  it('LCD-37: projection pure et read-only — état runtime gelé, jamais modifié, résultat gelé et déterministe', () => {
    const state = runtimeStateAfter([command(0x0e), ...chars('ABC')])
    const before = JSON.stringify(state)
    expect(Object.isFrozen(state)).toBe(true)
    const a = projectSt7066uDisplay(state)
    const b = projectSt7066uDisplay(state)
    expect(a).toEqual(b)
    expect(JSON.stringify(state)).toBe(before)
    expect(Object.isFrozen(a)).toBe(true)
    expect(Object.isFrozen(a.lines)).toBe(true)
    expect(Object.isFrozen(a.codes[0])).toBe(true)
    expect(a).toMatchObject({ displayOn: true, cursorOn: true, blinkOn: false, cursor: { line: 0, column: 3 } })
    const source = src('visualization', 'st7066uDisplayProjection.js')
    expect(source).not.toMatch(/Signal|pinSignals|useState|setTimeout|setInterval|requestAnimationFrame|Date\.now|\.set\(|\.push\(/)
  })

  it.each([
    ['no runtime state', undefined],
    ['initial state', runtimeStateAfter([])],
    ['full lines', runtimeStateAfter([command(0x0c), ...chars('0123456789ABCDEF'), command(0xc0), ...chars('fedcba9876543210')])],
    ['overflow beyond column 16', runtimeStateAfter([command(0x0c), ...chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ')])],
    ['codes without a modelled glyph (CGRAM 0x00, katakana 0xB1)', runtimeStateAfter([command(0x0c), [HIGH, 0x00], [HIGH, 0xb1], [HIGH, 0x5c], [HIGH, 0x7e]])],
  ])('LCD-38 / LCD-39: line 1 and line 2 are exactly 16 characters (%s)', (_label, state) => {
    const { lines, codes } = projectSt7066uDisplay(state)
    expect(lines).toHaveLength(2)
    expect([...lines[0]]).toHaveLength(16)
    expect([...lines[1]]).toHaveLength(16)
    expect(codes.map((row) => row.length)).toEqual([16, 16])
  })

  it('LCD-38 / LCD-39: mapping 0x00..0x0F -> ligne 1, 0x40..0x4F -> ligne 2 ; glyphes ROM ¥ → ; codes non modélisés = espace', () => {
    const state = runtimeStateAfter([command(0x0c), ...chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), command(0xc0), [HIGH, 0x00], [HIGH, 0xb1], [HIGH, 0x5c], [HIGH, 0x7e], ...chars('ok')])
    expect(projectSt7066uDisplay(state).lines).toEqual(['ABCDEFGHIJKLMNOP', '  ¥→ok'.padEnd(16)])
    expect(projectSt7066uDisplay(state).codes[1].slice(0, 4)).toEqual([0x00, 0xb1, 0x5c, 0x7e])
  })

  it('LCD-40: displayOn=false (initial, Display OFF, no runtime) hides everything; DDRAM content kept for Display ON', () => {
    const on = runtimeStateAfter([command(0x0c), ...chars('Hi')])
    const off = runtimeStateAfter([command(0x0c), ...chars('Hi'), command(0x08)])
    expect(projectSt7066uDisplay(off)).toMatchObject({ displayOn: false, lines: ['Hi'.padEnd(16), BLANK_LINE] })
    expect(projectSt7066uDisplay(undefined)).toMatchObject({ displayOn: false, cursor: null, lines: [BLANK_LINE, BLANK_LINE] })
    const shown = render(<LcdWh1602bPart lcd={projectSt7066uDisplay(on)} />).container
    expect(shown.querySelector('.part-lcd-wh1602b__glyphs')).not.toBeNull()
    expect(shown.firstChild.getAttribute('data-line-1')).toBe('Hi'.padEnd(16))
    for (const lcd of [projectSt7066uDisplay(off), projectSt7066uDisplay(undefined), undefined]) {
      const { container } = render(<LcdWh1602bPart lcd={lcd} />)
      expect(container.querySelector('.part-lcd-wh1602b__glyphs')).toBeNull()
      expect(container.querySelector('.part-lcd-wh1602b__cursor')).toBeNull()
      expect(container.firstChild.getAttribute('data-display-on')).toBe('false')
      expect(container.firstChild.getAttribute('data-line-1')).toBe('')
    }
  })
})

describe('A10-DISP2 — LCD-41 / LCD-42 renderer raster V2 + caractères projetés', () => {
  const dotsIn = (container) => (container.querySelector('.part-lcd-wh1602b__glyphs')?.getAttribute('data-dots').match(/M/g) ?? []).length

  it('enregistré en backend raster (bareBody + markerless dérivés) par le mécanisme ouvert existant', () => {
    expect(DEFAULT_REGISTRATIONS.filter((r) => r.type === TYPE)).toEqual([
      { type: TYPE, component: LcdWh1602bPart, visual: { backend: 'raster' } },
    ])
    expect(getComponentPresentation(TYPE)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('LCD-41: le renderer affiche exactement le raster CSA RUNTIME-V2 (1x/3x PNG + WebP), jamais le Founder ni V1', () => {
    const { container } = render(<LcdWh1602bPart />)
    const root = container.firstChild
    expect([root.style.width, root.style.height]).toEqual(['378px', '170px'])
    const img = container.querySelector('img')
    expect([img.width, img.height]).toEqual([378, 170])
    const dir = '/assets/components/lcd-wh1602b/'
    expect(img.getAttribute('src')).toBe(`${dir}lcd-wh1602b.default.1x.png`)
    expect(img.getAttribute('srcset')).toBe(`${dir}lcd-wh1602b.default.1x.png 1x, ${dir}lcd-wh1602b.default.3x.png 3x`)
    expect(container.querySelector('source').getAttribute('srcset')).toBe(`${dir}lcd-wh1602b.default.1x.webp 1x, ${dir}lcd-wh1602b.default.3x.webp 3x`)
    expect(img.style.pointerEvents).toBe('none')
    expect(container.innerHTML).not.toMatch(/founder-reference|DERIVATIVE|V1|base64/)
    for (const name of Object.keys(RUNTIME_SHA)) expect(existsSync(asset(name)), name).toBe(true)
  })

  it('LCD-42: au repos aucun caractère n\'est dessiné (le texte ne vient que de l\'état runtime)', () => {
    const { container } = render(<LcdWh1602bPart />)
    expect(dotsIn(container)).toBe(0)
    expect(container.querySelector('.part-lcd-wh1602b__characters').style.pointerEvents).toBe('none')
    expect(container.querySelector('.part-lcd-wh1602b__characters').getAttribute('aria-hidden')).toBe('true')
  })

  it('les caractères sont des points 5x8 dans les cellules mesurées de la fenêtre (ligne 1 y 71, ligne 2 y 105)', () => {
    const lcd = projectSt7066uDisplay(runtimeStateAfter([command(0x0c), ...chars('I'), command(0xc0 | 0x0f), ...chars('I')]))
    const { container } = render(<LcdWh1602bPart lcd={lcd} />)
    const d = container.querySelector('.part-lcd-wh1602b__glyphs').getAttribute('data-dots')
    const points = [...d.matchAll(/M([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
    // 'I' = colonnes 0x00 0x41 0x7f 0x41 0x00 -> 2 + 7 + 2 = 11 points par cellule.
    expect(points).toHaveLength(22)
    const first = points.filter(([, y]) => y < 90)
    const second = points.filter(([, y]) => y > 90)
    expect(Math.min(...first.map(([x]) => x))).toBeGreaterThanOrEqual(56)
    expect(Math.max(...first.map(([x]) => x))).toBeLessThan(56 + 9)
    expect(Math.min(...first.map(([, y]) => y))).toBe(71)
    expect(Math.min(...second.map(([, y]) => y))).toBe(105)
    // Colonne 15 : dernière cellule de la fenêtre mesurée (3x : 900..926).
    expect(Math.min(...second.map(([x]) => x))).toBeGreaterThanOrEqual(300)
    expect(Math.max(...second.map(([x]) => x))).toBeLessThan(310)
  })

  it('curseur souligné (rangée 8) seulement si cursorOn ; le bit blink est conservé sans horloge visuelle', () => {
    const withCursor = render(<LcdWh1602bPart lcd={projectSt7066uDisplay(runtimeStateAfter([command(0x0f), ...chars('A')]))} />).container
    const cursor = withCursor.querySelector('.part-lcd-wh1602b__cursor').getAttribute('data-dots')
    expect(cursor.match(/M/g)).toHaveLength(5)
    expect(withCursor.firstChild.getAttribute('data-blink')).toBe('true')
    const noCursor = render(<LcdWh1602bPart lcd={projectSt7066uDisplay(runtimeStateAfter([command(0x0c), ...chars('A')]))} />).container
    expect(noCursor.querySelector('.part-lcd-wh1602b__cursor')).toBeNull()
    expect(noCursor.firstChild.getAttribute('data-blink')).toBe('false')
  })

  it('le renderer ne contient ni logique électrique, ni DDRAM, ni état React, ni horloge', () => {
    const source = src('components', 'parts', 'LcdWh1602bPart.jsx')
    expect(source).not.toMatch(/Signal|pinSignals|ddram|addressCounter|useState|useEffect|useRef|setTimeout|setInterval|requestAnimationFrame|Date\.now|performance\.now|founder-reference/)
  })
})

describe('A10-DISP2 — chaîne réelle Document -> runtime -> snapshot -> PartRenderer', () => {
  const DB = ['DB0', 'DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'DB6', 'DB7']
  const doc = (levels) => ({
    components: [{ id: 'p', type: 'POWER', position: { x: 0, y: 0 } }, { id: 'lcd', type: TYPE, position: { x: 200, y: 0 } }],
    wires: Object.entries({ VSS: LOW, VDD: HIGH, RW: LOW, ...levels })
      .map(([pin, level], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: level === HIGH ? '5V' : 'GND' }, pinB: { componentId: 'lcd', pinId: pin } })),
  })

  it('LCD-37 / LCD-41: « Hi » écrit par impulsions E sur le pipeline réel apparaît dans le renderer via runtimeState', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const step = (levels) => {
      const input = toEngineInput(doc(levels))
      return runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
    }
    const pulse = (rs, byte) => {
      const bus = Object.fromEntries(DB.map((pin, i) => [pin, (byte >> i) & 1 ? HIGH : LOW]))
      step({ RS: rs, ...bus, E: HIGH })
      return step({ RS: rs, ...bus, E: LOW })
    }
    pulse(LOW, 0x0c)
    pulse(HIGH, 0x48)
    const pinSignals = pulse(HIGH, 0x69)
    const runtimeStates = snapshotTimedDigitalStates(runtimeSession)
    const { container } = render(<PartRenderer type={TYPE} uid="lcd" pinSignals={pinSignals} runtimeState={runtimeStates.get('lcd')} />)
    const root = container.querySelector('.part-lcd-wh1602b')
    expect(root.getAttribute('data-display-on')).toBe('true')
    expect(root.getAttribute('data-line-1')).toBe('Hi'.padEnd(16))
    expect(root.getAttribute('data-line-2')).toBe(BLANK_LINE)
    // Sans runtimeState (simulation arrêtée), le même renderer n'affiche rien.
    const stopped = render(<PartRenderer type={TYPE} uid="lcd" pinSignals={pinSignals} />).container
    expect(stopped.querySelector('.part-lcd-wh1602b').getAttribute('data-display-on')).toBe('false')
    // runtimeState n'est jamais transmis tel quel au renderer (seule la projection `lcd` l'est).
    expect(stopped.innerHTML).not.toMatch(/runtimestate|ddram/i)
  })
})
