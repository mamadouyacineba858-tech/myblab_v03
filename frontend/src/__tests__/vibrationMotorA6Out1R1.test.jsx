/**
 * vibrationMotorA6Out1R1.test.jsx — Ticket A6-OUT1-R1 (Vibration Motor,
 * rasterization + breadboard-fit).
 *
 * A6-OUT1 avait ajouté VIBRATION_MOTOR au catalogue (réutilisation électrique
 * DC_MOTOR, présentation CSS/DOM provisoire, non enfichable — couvert par
 * vibrationMotorA6Out1.test.js, INCHANGÉ pour tout ce qui touche au modèle
 * électrique). Ce ticket (A6-OUT1-R1) est scopé STRICTEMENT à la présentation
 * : paquet raster réaliste Founder-approved, boîte canonique 72×96 (était
 * 50×70), PhysicalContacts plus(24,84)/minus(48,84) (étaient (18,68)/(32,68)),
 * entraxe 24 = 2 × BREADBOARD_PITCH, breadboardInsertable désormais true avec
 * PREUVE géométrique via le vrai pipeline de résolution de trous
 * (breadboardGeometry.js) — jamais un mock parallèle.
 *
 * AUCUN changement électrique : dcContributionRegistry.js réutilise
 * toujours LITTÉRALEMENT dcMotorDc (pas de "vibrationMotorDc"), aucune
 * branche `type === "VIBRATION_MOTOR"` n'est ajoutée au moteur générique de
 * simulation ni au moteur générique d'insertion breadboard.
 *
 * Couvre T1-T24 du ticket §7 + le "Breadboard Physical Fit Gate" (T10/T11).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
// eslint-disable-next-line no-unused-vars -- requis à l'exécution pour le JSX de ce fichier (transform classique vitest, même convention que les autres *.raster.test.jsx du dépôt qui portent le même import + la même règle désactivée)
import React from 'react'
import { render } from '@testing-library/react'

import {
  getCanonicalEntry,
  hasCanonicalType,
} from '../simulator/canonicalRegistry.js'
import {
  getDcContribution,
  hasDcContribution,
} from '../simulator/dcContributionRegistry.js'
import { resolveSignals } from '../simulator/resolution.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'
import { COMPONENT_TYPES, getComponentDef } from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import {
  BREADBOARD_PITCH,
  holeAt,
  resolveComponentContactHoles,
  getBreadboardHolePosition,
} from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'
import { VibrationMotorPart } from '../components/parts/VibrationMotorPart.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VM_DIR = resolve(__dirname, '../../public/assets/components/vibration-motor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian). */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function srcsetList(el, attr) {
  return (el.getAttribute(attr) || '').split(',').map((s) => s.trim()).filter(Boolean)
}

describe('A6-OUT1-R1 — T1 : VIBRATION_MOTOR reste un type canonique unique et inchangé électriquement', () => {
  it('T1 — toujours enregistré dans les 4 registres déclaratifs', () => {
    expect(hasCanonicalType('VIBRATION_MOTOR')).toBe(true)
    expect(COMPONENT_TYPES.VIBRATION_MOTOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'VIBRATION_MOTOR')).toBe(true)
    expect(hasDcContribution('VIBRATION_MOTOR')).toBe(true)
    expect(getComponentByType('VIBRATION_MOTOR')).not.toBeNull()
  })
})

describe('A6-OUT1-R1 — T2/T3 : nouvelle boîte canonique 72×96', () => {
  it('T2 — width === 72', () => {
    expect(COMPONENT_TYPES.VIBRATION_MOTOR.width).toBe(72)
  })
  it('T3 — height === 96', () => {
    expect(COMPONENT_TYPES.VIBRATION_MOTOR.height).toBe(96)
  })
  it('SCALE_REFERENCE.VIBRATION_MOTOR.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'VIBRATION_MOTOR')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([72, 96])
  })
})

describe('A6-OUT1-R1 — T4-T7 : PhysicalContacts plus(24,84) / minus(48,84)', () => {
  const def = getComponentDef('VIBRATION_MOTOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T4 — plus PhysicalContact = (24, 84)', () => {
    expect(resolveContacts(byPin.plus)[0]).toMatchObject({ id: 'plus', dx: 24, dy: 84 })
  })
  it('T5 — minus PhysicalContact = (48, 84)', () => {
    expect(resolveContacts(byPin.minus)[0]).toMatchObject({ id: 'minus', dx: 48, dy: 84 })
  })
  it('T6 — les deux contacts sont wireConnectable', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T7 — les deux contacts sont désormais breadboardInsertable', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })
})

describe('A6-OUT1-R1 — T8/T9 : pitch géométrique', () => {
  it('T8 — entraxe horizontal plus/minus === 24', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    const plus = resolveContacts(def.pins.find((p) => p.id === 'plus'))[0]
    const minus = resolveContacts(def.pins.find((p) => p.id === 'minus'))[0]
    expect(Math.abs(minus.dx - plus.dx)).toBe(24)
  })
  it('T9 — BREADBOARD_PITCH réel = 12 ; 24 % 12 === 0 (2 × BREADBOARD_PITCH exact)', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(24 % BREADBOARD_PITCH).toBe(0)
  })
})

describe('A6-OUT1-R1 — Breadboard Physical Fit Gate (T10/T11) : chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('VIBRATION_MOTOR')

  it('T10 — à une origine alignée sur la grille, plus ET minus résolvent 2 trous DISTINCTS simultanément (resolveComponentContactHoles réel)', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 0 })
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [plusResult, minusResult] = results
    expect(plusResult.hole).not.toBeNull()
    expect(minusResult.hole).not.toBeNull()
    // hole A != hole B : colonnes distinctes, même rangée (strip haut)
    expect(plusResult.hole.column).not.toBe(minusResult.hole.column)
    expect(plusResult.hole.row).toBe(minusResult.hole.row)
    expect(plusResult.hole.groupKey).not.toBe(minusResult.hole.groupKey)
    // valeurs numériques exactes, dérivées indépendamment via holeAt() (même oracle)
    expect(plusResult.hole).toEqual(holeAt(breadboard, 24, 84))
    expect(minusResult.hole).toEqual(holeAt(breadboard, 48, 84))
    expect(plusResult.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col2:top', column: 2, row: 7 })
    expect(minusResult.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col4:top', column: 4, row: 7 })
  })

  it('T11 — les centres de contact coïncident EXACTEMENT avec les centres de trou résolus (getBreadboardHolePosition, même primitive que la Presentation)', () => {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 0 })
    for (const r of results) {
      const holeCenter = getBreadboardHolePosition(breadboard, r.hole.column, r.hole.row)
      const contact = resolveContacts(def.pins.find((p) => p.id === r.pinId))[0]
      const worldContact = { x: 0 + contact.dx, y: 0 + contact.dy }
      expect(holeCenter).toEqual(worldContact)
    }
  })

  it('computeBreadboardPlacement (adapter réel) : composant compatible, 2 trous distincts, placement valide', () => {
    const result = computeBreadboardPlacement(breadboard, 'VIBRATION_MOTOR', { x: 0, y: 0 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(2)
    expect(result.valid).toBe(true)
  })

  it('une origine décalée hors tolérance (>2px) fait échouer la résolution des deux contacts (holeAt reste le seul arbitre)', () => {
    const { anyResolved } = resolveComponentContactHoles(breadboard, def.pins, { x: 5, y: 0 })
    expect(anyResolved).toBe(false)
  })

  it('resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, avec 2 pattes', () => {
    const g = resolveAssemblyGeometry({ uid: 'v', type: 'VIBRATION_MOTOR', x: 0, y: 0 }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['plus', 'minus']))
  })
})

describe('A6-OUT1-R1 — T12 : renderer utilise réellement le backend raster', () => {
  it('getComponentPresentation("VIBRATION_MOTOR") === raster (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('VIBRATION_MOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('le DOM rendu contient un <img> réel (aucun <svg>), dimensionné sur la boîte canonique', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    const { container } = render(<VibrationMotorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
  })
})

describe("A6-OUT1-R1 — T13/T14 : résolution d'asset (défaut 1x + haute densité 3x)", () => {
  const ASSET_RE = /^\/assets\/components\/vibration-motor\/vibration-motor\.default\.(1x|3x)\.(webp|png)( \dx)?$/

  it('T13 — le fallback PNG @1x-capable (src) résout vers un fichier réellement présent sur disque', () => {
    const { container } = render(<VibrationMotorPart />)
    const img = container.querySelector('img')
    for (const cand of srcsetList(img, 'srcset')) {
      expect(cand).toMatch(ASSET_RE)
    }
    expect(existsSync(resolve(VM_DIR, 'vibration-motor.default.1x.png'))).toBe(true)
  })

  it('T14 — la variante haute densité 3x est référencée dans le srcSet (système de résolution par densité existant, <picture>/srcSet natif)', () => {
    const { container } = render(<VibrationMotorPart />)
    const img = container.querySelector('img')
    const source = container.querySelector('picture > source')
    expect(source.getAttribute('type')).toBe('image/webp')
    const all = container.innerHTML
    for (const f of ['default.1x.webp', 'default.3x.webp', 'default.1x.png', 'default.3x.png']) {
      expect(all).toMatch(new RegExp(f.replace('.', '\\.')))
    }
    expect(img.getAttribute('src')).toMatch(/vibration-motor\.default\.3x\.png$/)
    expect(existsSync(resolve(VM_DIR, 'vibration-motor.default.3x.png'))).toBe(true)
  })

  it("dimensions réelles des PNG livrés : 1x = 72×96, 3x = 216×288 (= 3 × 1x)", () => {
    const one = pngDims(readFileSync(resolve(VM_DIR, 'vibration-motor.default.1x.png')))
    const three = pngDims(readFileSync(resolve(VM_DIR, 'vibration-motor.default.3x.png')))
    expect(one).toEqual({ w: 72, h: 96 })
    expect(three).toEqual({ w: 216, h: 288 })
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
  })
})

describe('A6-OUT1-R1 — T15/T16 : manifest cohérent avec la géométrie canonique', () => {
  it('T15 — manifest.canonical (dimensions) === componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(VM_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('VIBRATION_MOTOR')
    expect(m.backend).toBe('raster')
    expect([m.canonical.width, m.canonical.height]).toEqual([72, 96])
    expect(m.states).toEqual(['default'])
  })

  it('T16 — manifest.canonical.pins === PhysicalContacts plus(24,84)/minus(48,84)', () => {
    const m = JSON.parse(readFileSync(resolve(VM_DIR, 'manifest.json'), 'utf-8'))
    expect(m.canonical.pins.plus).toEqual([24, 84])
    expect(m.canonical.pins.minus).toEqual([48, 84])
  })
})

describe('A6-OUT1-R1 — T17 : ASSET-INTEGRITY.json valide (hash SHA-256 réels)', () => {
  it('chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(VM_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.files) ? raw.files : []
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const entry of list) {
      const full = resolve(VM_DIR, entry.file)
      expect(existsSync(full), entry.file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${entry.file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${entry.file} sha256`).toBe(entry.sha256)
    }
  })
})

describe('A6-OUT1-R1 — AssemblyProfile : racines dérivées du pixel-probe réel, aucun bodyClip inventé', () => {
  it('profil through-hole avec exactement les leads plus/minus, style wire', () => {
    const profile = getAssemblyProfile('VIBRATION_MOTOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['minus', 'plus'])
    for (const id of ['plus', 'minus']) {
      expect(profile.leads[id].style).toBe('wire')
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('racines mesurées : plus root (24,83), minus root (48,80) — au-dessus des PhysicalContacts, jamais en dessous', () => {
    const { leads } = getAssemblyProfile('VIBRATION_MOTOR')
    expect(leads.plus.root).toEqual({ dx: 24, dy: 83 })
    expect(leads.minus.root).toEqual({ dx: 48, dy: 80 })
    const def = getComponentDef('VIBRATION_MOTOR')
    for (const pin of def.pins) {
      const contactDy = pin.contacts[0].dy
      expect(leads[pin.id].root.dy).toBeLessThan(contactDy)
    }
  })

  it('aucun bodyClip déclaré (justifié : le contenu opaque du raster ne dépasse jamais les PhysicalContacts)', () => {
    expect(getAssemblyProfile('VIBRATION_MOTOR').bodyClip).toBeUndefined()
  })
})

describe('A6-OUT1-R1 — T18-T21 : non-régression des autres composants raster traversants', () => {
  it('T18 — BUZZER inchangé (pins, boîte, contacts, profil)', () => {
    expect(getComponentDef('BUZZER').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.BUZZER.width, COMPONENT_TYPES.BUZZER.height]).toEqual([120, 120])
    expect(resolveContacts(getComponentDef('BUZZER').pins.find((p) => p.id === 'plus'))[0]).toMatchObject({ dx: 42, dy: 108 })
    expect(getAssemblyProfile('BUZZER').bodyClip.bottom).toBe(42)
  })

  it('T19 — POLARIZED_CAPACITOR inchangé (pins, boîte, contacts, profil)', () => {
    expect(getComponentDef('POLARIZED_CAPACITOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.POLARIZED_CAPACITOR.width, COMPONENT_TYPES.POLARIZED_CAPACITOR.height]).toEqual([33, 120])
    expect(getAssemblyProfile('POLARIZED_CAPACITOR').bodyClip.bottom).toBe(68)
  })

  it('T20 — SLIDE_SWITCH inchangé (pins, boîte, contacts, profil, breadboardInsertable)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    expect(def.pins.map((p) => p.id)).toEqual(['throwA', 'common', 'throwB'])
    expect([COMPONENT_TYPES.SLIDE_SWITCH.width, COMPONENT_TYPES.SLIDE_SWITCH.height]).toEqual([72, 48])
    for (const pin of def.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(1)
    expect(getAssemblyProfile('SLIDE_SWITCH').bodyClip.bottom).toBe(17)
  })

  it('T21 — DIP_SWITCH inchangé (8 pins, boîte, breadboardInsertable, interaction multi-canal)', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect(def.pins).toHaveLength(8)
    expect([COMPONENT_TYPES.DIP_SWITCH.width, COMPONENT_TYPES.DIP_SWITCH.height]).toEqual([112, 56])
    for (const pin of def.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(1)
    expect(def.interaction).toEqual({ type: 'multi-state-toggle', channels: ['1', '2', '3', '4'], states: ['off', 'on'] })
  })
})

describe('A6-OUT1-R1 — T22-T24 : modèle électrique STRICTEMENT inchangé, réutilisation DC_MOTOR prouvée', () => {
  function poweredCircuit(type, pinFrom, pinTo) {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const comp = { uid: 'c1', type, x: 10, y: 0 }
    const components = [power, comp]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'c1', toPin: pinFrom },
      { fromUid: 'c1', fromPin: pinTo, toUid: 'power1', toPin: 'GND' },
    ]
    return { components, wires, comp }
  }

  it('T22 — même contrat/valeurs par défaut que DC_MOTOR, et I = U/R identique (A6-OUT1 inchangé)', () => {
    const entry = getCanonicalEntry('VIBRATION_MOTOR')
    const motorEntry = getCanonicalEntry('DC_MOTOR')
    expect(entry.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(entry.parameterSchema[0].defaultValue).toBe(motorEntry.parameterSchema[0].defaultValue)
    expect(getSimulationDefaultParameters('VIBRATION_MOTOR')).toEqual({ resistance: 20 })

    const vibration = poweredCircuit('VIBRATION_MOTOR', 'plus', 'minus')
    const prepared = prepareCircuit(vibration.components, vibration.wires)
    const { dcAnalysis } = resolveSignals(vibration.components, prepared)
    const result = dcAnalysis.get(vibration.comp.uid)
    expect(result).toEqual({ voltage: 5, current: 5 / 20 })
  })

  it('T23 — dcContributionRegistry : VIBRATION_MOTOR et DC_MOTOR pointent vers LA MÊME référence de fonction (réutilisation réelle)', () => {
    expect(hasDcContribution('VIBRATION_MOTOR')).toBe(true)
    expect(getDcContribution('VIBRATION_MOTOR')).toBe(getDcContribution('DC_MOTOR'))
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).not.toMatch(/function\s+vibrationMotorDc/)
  })

  it('T24 — aucune branche VIBRATION_MOTOR dans le moteur générique de simulation OU de breadboard (resolution.js, breadboardPlacementAdapter.js, breadboardConnectivity.js, Breadboard.jsx, CircuitComponent.jsx, AssemblyLeadsLayer.jsx)', () => {
    const files = [
      '../simulator/resolution.js',
      '../utils/breadboardPlacementAdapter.js',
      '../utils/breadboardConnectivity.js',
      '../canvas/Breadboard.jsx',
      '../canvas/CircuitComponent.jsx',
      '../components/assembly/AssemblyLeadsLayer.jsx',
      '../components/parts/PartRenderer.jsx',
    ]
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/VIBRATION_MOTOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']VIBRATION_MOTOR["']/)
    }
  })
})
