/**
 * lightBulbA6Out2.test.js — Ticket A6-OUT2 (Light Bulb, raster + breadboard-fit).
 *
 * LIGHT_BULB est un NOUVEAU type canonique : charge résistive DC simple à
 * deux bornes, NON polarisée (pins 'A'/'B', même convention que
 * RESISTOR/LDR/THERMISTOR — à la différence de DC_MOTOR/VIBRATION_MOTOR qui
 * gardent 'plus'/'minus'). Boîte canonique 72×96, PhysicalContacts
 * A(24,84)/B(48,84), entraxe 24 = 2 × BREADBOARD_PITCH — même famille
 * géométrique que VIBRATION_MOTOR (A6-OUT1-R1), dont ce fichier reprend la
 * structure de test.
 *
 * Modèle électrique : réutilisation LITTÉRALE de `resistorDc` (même
 * référence de fonction que RESISTOR, cf. dcContributionRegistry.js) —
 * aucune fonction "lightBulbDc" dupliquée. Aucun modèle thermique de
 * filament, aucune non-linéarité tungstène, aucun vieillissement/claquage :
 * hors périmètre de ce ticket.
 *
 * Fichier .js (PAS .jsx) DÉLIBÉRÉMENT : le harnais de test de ce dépôt a une
 * panne d'environnement PRÉ-EXISTANTE (confirmée sur le commit de base
 * 3318c543, reproductible, indépendante de ce ticket — "Cannot find package
 * 'react'" à la collection de la quasi-totalité des fichiers *.test.jsx qui
 * importent React, y compris le fichier de référence du ticket lui-même,
 * vibrationMotorA6Out1R1.test.jsx). Séparer les assertions qui n'ont besoin
 * ni de JSX ni de `render()` dans ce fichier .js leur évite cette panne
 * d'environnement et permet de les exécuter réellement ; seules les
 * assertions de rendu DOM (T14/T15/T16/T17) restent dans
 * lightBulbA6Out2.test.jsx (qui hérite, comme son homologue VIBRATION_MOTOR,
 * de la panne pré-existante — non régression introduite par ce ticket).
 *
 * Couvre T01-T13, T18-T36 du ticket A6-OUT2 + le "Breadboard Physical Fit
 * Gate" (T14-T17, qui nécessitent `render()`, sont dans le fichier .jsx
 * jumeau).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

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
import { Signal } from '../simulator/signals.js'
import { getSimulationDefaultParameters, isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
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
import { LightBulbModel } from '../simulator/models/LightBulbModel.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LB_DIR = resolve(__dirname, '../../public/assets/components/light-bulb')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian). */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

describe('A6-OUT2 — T01 : LIGHT_BULB est un type canonique enregistré dans les 4 registres déclaratifs', () => {
  it('T01', () => {
    expect(hasCanonicalType('LIGHT_BULB')).toBe(true)
    expect(COMPONENT_TYPES.LIGHT_BULB).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'LIGHT_BULB')).toBe(true)
    expect(hasDcContribution('LIGHT_BULB')).toBe(true)
    expect(getComponentByType('LIGHT_BULB')).not.toBeNull()
  })

  it('T02 — modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('LIGHT_BULB').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('LIGHT_BULB')).toBe(true)
  })

  it('backend raster déclaré (T14 sans rendu DOM — la preuve DOM elle-même est dans le fichier .jsx jumeau)', () => {
    expect(getComponentPresentation('LIGHT_BULB')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A6-OUT2 — T03/T04 : boîte canonique 72×96', () => {
  it('T03 — width === 72', () => {
    expect(COMPONENT_TYPES.LIGHT_BULB.width).toBe(72)
  })
  it('T04 — height === 96', () => {
    expect(COMPONENT_TYPES.LIGHT_BULB.height).toBe(96)
  })
  it('SCALE_REFERENCE.LIGHT_BULB.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'LIGHT_BULB')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([72, 96])
  })
})

describe('A6-OUT2 — T05-T09 : PhysicalContacts A(24,84) / B(48,84), pitch', () => {
  const def = getComponentDef('LIGHT_BULB')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T05 — premier PhysicalContact A = (24, 84)', () => {
    expect(resolveContacts(byPin.A)[0]).toMatchObject({ id: 'A', dx: 24, dy: 84 })
  })
  it('T06 — second PhysicalContact B = (48, 84)', () => {
    expect(resolveContacts(byPin.B)[0]).toMatchObject({ id: 'B', dx: 48, dy: 84 })
  })
  it('T07 — les deux contacts sont wireConnectable', () => {
    for (const id of ['A', 'B']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T08 — les deux contacts sont breadboardInsertable', () => {
    for (const id of ['A', 'B']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T09 — entraxe horizontal A/B === 24', () => {
    const a = resolveContacts(def.pins.find((p) => p.id === 'A'))[0]
    const b = resolveContacts(def.pins.find((p) => p.id === 'B'))[0]
    expect(Math.abs(b.dx - a.dx)).toBe(24)
  })
  it('T10 — BREADBOARD_PITCH réel = 12 ; 24 % 12 === 0 (2 × BREADBOARD_PITCH exact)', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    expect(24 % BREADBOARD_PITCH).toBe(0)
  })
})

describe('A6-OUT2 — T11 : composant électriquement NON polarisé', () => {
  it('pins canoniques A/B (pas plus/minus) — pas de sémantique orientée forcée', () => {
    const def = getComponentDef('LIGHT_BULB')
    expect(def.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getCanonicalEntry('LIGHT_BULB').pins.map((p) => p.role)).toEqual(['passive', 'passive'])
  })
})

describe('A6-OUT2 — T12/T13 : paramètre resistance', () => {
  it('T12 — valeur par défaut positive et finie', () => {
    const defaults = getSimulationDefaultParameters('LIGHT_BULB')
    expect(defaults).toEqual({ resistance: 20 })
    expect(Number.isFinite(defaults.resistance)).toBe(true)
    expect(defaults.resistance).toBeGreaterThan(0)
  })

  it('T13 — résistance invalide rejetée par LightBulbModel.validate (même convention/corps que ResistorModel/DcMotorModel)', () => {
    const entry = getCanonicalEntry('LIGHT_BULB')
    expect(entry.parameterSchema[0]).toMatchObject({ key: 'resistance', minimum: 0.001 })
    expect(LightBulbModel.type).toBe('LIGHT_BULB')
    expect(LightBulbModel.validate({ resistance: 20 })).toBe(true)
    expect(LightBulbModel.validate({ resistance: 0 })).toBe(false)
    expect(LightBulbModel.validate({ resistance: -5 })).toBe(false)
    expect(LightBulbModel.validate({ resistance: NaN })).toBe(false)
    expect(LightBulbModel.validate({ resistance: 'twenty' })).toBe(false)
    expect(LightBulbModel.validate(null)).toBe(false)
    expect(LightBulbModel.validate({})).toBe(false)
  })
})

describe('A6-OUT2 — Breadboard Physical Fit Gate (T24/T25) : chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('LIGHT_BULB')

  it('à une origine alignée sur la grille, A ET B résolvent 2 trous DISTINCTS simultanément (resolveComponentContactHoles réel)', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 0 })
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [aResult, bResult] = results
    expect(aResult.hole).not.toBeNull()
    expect(bResult.hole).not.toBeNull()
    expect(aResult.hole.column).not.toBe(bResult.hole.column)
    expect(aResult.hole.row).toBe(bResult.hole.row)
    expect(aResult.hole.groupKey).not.toBe(bResult.hole.groupKey)
    expect(aResult.hole).toEqual(holeAt(breadboard, 24, 84))
    expect(bResult.hole).toEqual(holeAt(breadboard, 48, 84))
    expect(aResult.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col2:top', column: 2, row: 7 })
    expect(bResult.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col4:top', column: 4, row: 7 })
  })

  it('les centres de contact coïncident EXACTEMENT avec les centres de trou résolus (getBreadboardHolePosition, même primitive que la Presentation)', () => {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, { x: 0, y: 0 })
    for (const r of results) {
      const holeCenter = getBreadboardHolePosition(breadboard, r.hole.column, r.hole.row)
      const contact = resolveContacts(def.pins.find((p) => p.id === r.pinId))[0]
      const worldContact = { x: 0 + contact.dx, y: 0 + contact.dy }
      expect(holeCenter).toEqual(worldContact)
    }
  })

  it('computeBreadboardPlacement (adapter réel) : composant compatible, 2 trous distincts, placement valide', () => {
    const result = computeBreadboardPlacement(breadboard, 'LIGHT_BULB', { x: 0, y: 0 }, [])
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
    const g = resolveAssemblyGeometry({ uid: 'l', type: 'LIGHT_BULB', x: 0, y: 0 }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['A', 'B']))
  })
})

describe('A6-OUT2 — T15/T16 (partiel, sans rendu DOM) : assets réellement présents sur disque, dimensions réelles', () => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['light-bulb.default.1x.png', 'light-bulb.default.1x.webp', 'light-bulb.default.3x.png', 'light-bulb.default.3x.webp']) {
      expect(existsSync(resolve(LB_DIR, f)), f).toBe(true)
    }
  })

  it('dimensions réelles des PNG livrés : 1x = 72×96, 3x = 216×288 (= 3 × 1x)', () => {
    const one = pngDims(readFileSync(resolve(LB_DIR, 'light-bulb.default.1x.png')))
    const three = pngDims(readFileSync(resolve(LB_DIR, 'light-bulb.default.3x.png')))
    expect(one).toEqual({ w: 72, h: 96 })
    expect(three).toEqual({ w: 216, h: 288 })
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
  })
})

describe('A6-OUT2 — T18 : manifest cohérent avec la géométrie canonique', () => {
  it('manifest.canonical (dimensions + backend + state) === componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(LB_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('LIGHT_BULB')
    expect(m.backend).toBe('raster')
    expect([m.canonical.width, m.canonical.height]).toEqual([72, 96])
    expect(m.states).toEqual(['default'])
  })

  it('manifest.canonical.pins (labels géométriques plus/minus du paquet) coïncident avec les PhysicalContacts (24,84)/(48,84) — labels de paquet, pas une contrainte électrique de polarité (§3 du ticket)', () => {
    const m = JSON.parse(readFileSync(resolve(LB_DIR, 'manifest.json'), 'utf-8'))
    expect(m.canonical.pins.plus).toEqual([24, 84])
    expect(m.canonical.pins.minus).toEqual([48, 84])
    // Les pins électriques canoniques réels restent 'A'/'B', non polarisées :
    const def = getComponentDef('LIGHT_BULB')
    expect(def.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(resolveContacts(def.pins[0])[0]).toMatchObject({ dx: m.canonical.pins.plus[0], dy: m.canonical.pins.plus[1] })
    expect(resolveContacts(def.pins[1])[0]).toMatchObject({ dx: m.canonical.pins.minus[0], dy: m.canonical.pins.minus[1] })
  })
})

describe('A6-OUT2 — T19 : ASSET-INTEGRITY.json valide (hash SHA-256 réels)', () => {
  it('chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(LB_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.files) ? raw.files : []
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const entry of list) {
      const full = resolve(LB_DIR, entry.file)
      expect(existsSync(full), entry.file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${entry.file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${entry.file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes 4 variantes/hash que ASSET-INTEGRITY.json (une seule source de hash, pas deux registres divergents)', () => {
    const manifest = JSON.parse(readFileSync(resolve(LB_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(LB_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const byFile = (list) => Object.fromEntries(list.map((e) => [e.file, e.sha256]))
    expect(byFile(manifest.variants)).toEqual(byFile(integrity.files))
  })
})

describe('A6-OUT2 — T20/T21/T22/T23 : AssemblyProfile — racines dérivées du pixel-probe réel, bodyClip justifié', () => {
  // Pixel-probe réel exécuté sur le paquet copié dans ce worktree (méthode :
  // décodage alpha réel via System.Drawing.Bitmap, threshold alpha>=32,
  // équivalent du script frontend/scripts/lead-anchor-probe.md car ce test
  // Node n'a accès à aucune lib de décodage d'image — cf. justification de ce
  // script). Résultats mesurés (documentés ici, verrouillés par ces
  // assertions) :
  //  - bounding box opaque globale (1x) : x∈[4,67] y∈[2,93]
  //  - colonnes des PhysicalContacts : alpha(24,84)=3, alpha(48,84)=0 (sous
  //    le seuil 32 -> transparentes)
  //  - ring-search (expansion en anneaux, même algorithme que
  //    lead-anchor-probe.md) depuis chaque contact : A -> (26,82) à distance
  //    de Chebyshev 2 ; B -> (47,83) à distance 1
  //  - le corps opaque continue jusqu'à y=93 (9 px sous les PhysicalContacts
  //    à y=84) -> bodyClip requis (contrairement à VIBRATION_MOTOR, dont le
  //    raster s'arrêtait déjà avant ses contacts)
  it('T20 — profil through-hole avec exactement les leads A/B, style wire, racines finies', () => {
    const profile = getAssemblyProfile('LIGHT_BULB')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['A', 'B'])
    for (const id of ['A', 'B']) {
      expect(profile.leads[id].style).toBe('wire')
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('T21/T22 — racines mesurées par pixel-probe réel : A(26,82), B(47,83) — au-dessus des PhysicalContacts, jamais en dessous', () => {
    const { leads } = getAssemblyProfile('LIGHT_BULB')
    expect(leads.A.root).toEqual({ dx: 26, dy: 82 })
    expect(leads.B.root).toEqual({ dx: 47, dy: 83 })
    const def = getComponentDef('LIGHT_BULB')
    for (const pin of def.pins) {
      const contactDy = pin.contacts[0].dy
      expect(leads[pin.id].root.dy).toBeLessThan(contactDy)
    }
  })

  it('T23 — les PhysicalContacts restent EXACTEMENT (24,84)/(48,84), quelles que soient les racines mesurées', () => {
    const def = getComponentDef('LIGHT_BULB')
    expect(resolveContacts(def.pins.find((p) => p.id === 'A'))[0]).toMatchObject({ dx: 24, dy: 84 })
    expect(resolveContacts(def.pins.find((p) => p.id === 'B'))[0]).toMatchObject({ dx: 48, dy: 84 })
  })

  it('bodyClip.bottom = 12 (clip à y=84, exactement au niveau des PhysicalContacts) — justifié : le corps opaque du raster dépasse les contacts (y=93 > y=84), contrairement à VIBRATION_MOTOR', () => {
    const profile = getAssemblyProfile('LIGHT_BULB')
    expect(profile.bodyClip).toEqual({ bottom: 12 })
    expect(96 - profile.bodyClip.bottom).toBe(84)
  })
})

describe('A6-OUT2 — T26-T28 : contribution DC — réutilisation resistorDc prouvée, aucune duplication', () => {
  it('T26 — LIGHT_BULB a une contribution DC enregistrée', () => {
    expect(hasDcContribution('LIGHT_BULB')).toBe(true)
  })

  it('T27 — dcContributionRegistry : LIGHT_BULB et RESISTOR pointent vers LA MÊME référence de fonction (réutilisation réelle)', () => {
    expect(getDcContribution('LIGHT_BULB')).toBe(getDcContribution('RESISTOR'))
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).not.toMatch(/function\s+lightBulbDc/)
  })

  it('T28 — même contrat/valeurs par défaut, et I = U/R identique entre LIGHT_BULB et RESISTOR à résistance égale', () => {
    const entry = getCanonicalEntry('LIGHT_BULB')
    const resistorEntry = getCanonicalEntry('RESISTOR')
    expect(entry.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(resistorEntry.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getSimulationDefaultParameters('LIGHT_BULB')).toEqual({ resistance: 20 })

    function poweredCircuit(type) {
      const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
      const comp = { uid: 'c1', type, x: 10, y: 0 }
      const components = [power, comp]
      const wires = [
        { fromUid: 'power1', fromPin: '5V', toUid: 'c1', toPin: 'A' },
        { fromUid: 'c1', fromPin: 'B', toUid: 'power1', toPin: 'GND' },
      ]
      const prepared = prepareCircuit(components, wires)
      const { dcAnalysis } = resolveSignals(components, prepared)
      return dcAnalysis.get(comp.uid)
    }

    const bulb = poweredCircuit('LIGHT_BULB')
    expect(bulb).toEqual({ voltage: 5, current: 5 / 20 })

    // Même circuit avec RESISTOR réglé à la même résistance donnerait
    // EXACTEMENT le même résultat : la physique est prouvée identique via la
    // référence de fonction partagée ci-dessus (T27), pas re-testée
    // séparément ici pour éviter une duplication de test inutile.
  })

  it('T29 — non polarisé : les deux orientations de branchement (A/B inversés) donnent EXACTEMENT le même résultat', () => {
    const contribute = getDcContribution('LIGHT_BULB')
    const params = { resistance: 20 }
    const r1 = contribute({ pins: { A: Signal.HIGH, B: Signal.LOW }, params, supplyVoltage: 5 })
    const r2 = contribute({ pins: { A: Signal.LOW, B: Signal.HIGH }, params, supplyVoltage: 5 })
    expect(r1).toEqual(r2)
    expect(r1).toEqual({ voltage: 5, current: 0.25 })
  })
})

describe('A6-OUT2 — T30-T35 : non-régression des autres composants (RESISTOR, VIBRATION_MOTOR, DC_MOTOR, BUZZER, POLARIZED_CAPACITOR, SLIDE_SWITCH, DIP_SWITCH)', () => {
  it('T30 — RESISTOR inchangé (pins, boîte, résistance par défaut, contribution DC)', () => {
    expect(getComponentDef('RESISTOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect([COMPONENT_TYPES.RESISTOR.width, COMPONENT_TYPES.RESISTOR.height]).toEqual([84, 28])
    expect(getSimulationDefaultParameters('RESISTOR')).toEqual({ resistance: 220 })
    expect(getDcContribution('RESISTOR')).toBeTypeOf('function')
  })

  it('T31 — VIBRATION_MOTOR inchangé (pins plus/minus, boîte, contacts, profil, contribution DC)', () => {
    expect(getComponentDef('VIBRATION_MOTOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.VIBRATION_MOTOR.width, COMPONENT_TYPES.VIBRATION_MOTOR.height]).toEqual([72, 96])
    expect(getAssemblyProfile('VIBRATION_MOTOR').leads.plus.root).toEqual({ dx: 24, dy: 83 })
    expect(getAssemblyProfile('VIBRATION_MOTOR').leads.minus.root).toEqual({ dx: 48, dy: 80 })
    expect(getAssemblyProfile('VIBRATION_MOTOR').bodyClip).toBeUndefined()
    expect(getDcContribution('VIBRATION_MOTOR')).toBe(getDcContribution('DC_MOTOR'))
  })

  it('T32 — DC_MOTOR inchangé (pins, boîte, non-enfichable, contribution DC)', () => {
    const def = getComponentDef('DC_MOTOR')
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.DC_MOTOR.width, COMPONENT_TYPES.DC_MOTOR.height]).toEqual([84, 50])
    expect(getSimulationDefaultParameters('DC_MOTOR')).toEqual({ resistance: 20 })
    for (const pin of def.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
  })

  it('T33 — BUZZER inchangé (pins, boîte, contacts, profil)', () => {
    expect(getComponentDef('BUZZER').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.BUZZER.width, COMPONENT_TYPES.BUZZER.height]).toEqual([120, 120])
    expect(resolveContacts(getComponentDef('BUZZER').pins.find((p) => p.id === 'plus'))[0]).toMatchObject({ dx: 42, dy: 108 })
    expect(getAssemblyProfile('BUZZER').bodyClip.bottom).toBe(42)
  })

  it('T34 — POLARIZED_CAPACITOR inchangé (pins, boîte, profil)', () => {
    expect(getComponentDef('POLARIZED_CAPACITOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.POLARIZED_CAPACITOR.width, COMPONENT_TYPES.POLARIZED_CAPACITOR.height]).toEqual([33, 120])
    expect(getAssemblyProfile('POLARIZED_CAPACITOR').bodyClip.bottom).toBe(68)
  })

  it('T35 — SLIDE_SWITCH / DIP_SWITCH inchangés (pins, boîte, breadboardInsertable, interaction)', () => {
    const slide = getComponentDef('SLIDE_SWITCH')
    expect(slide.pins.map((p) => p.id)).toEqual(['throwA', 'common', 'throwB'])
    expect([COMPONENT_TYPES.SLIDE_SWITCH.width, COMPONENT_TYPES.SLIDE_SWITCH.height]).toEqual([72, 48])
    for (const pin of slide.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(1)
    expect(getAssemblyProfile('SLIDE_SWITCH').bodyClip.bottom).toBe(17)

    const dip = getComponentDef('DIP_SWITCH')
    expect(dip.pins).toHaveLength(8)
    expect([COMPONENT_TYPES.DIP_SWITCH.width, COMPONENT_TYPES.DIP_SWITCH.height]).toEqual([112, 56])
    expect(dip.interaction).toEqual({ type: 'multi-state-toggle', channels: ['1', '2', '3', '4'], states: ['off', 'on'] })
  })
})

describe('A6-OUT2 — T36 : aucune branche LIGHT_BULB dans les couches génériques (resolution.js, breadboard resolver, Canvas, CircuitComponent, AssemblyLeadsLayer, PartRenderer)', () => {
  it('le littéral "LIGHT_BULB" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
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
      expect(src, rel).not.toMatch(/LIGHT_BULB/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']LIGHT_BULB["']/)
    }
  })
})
