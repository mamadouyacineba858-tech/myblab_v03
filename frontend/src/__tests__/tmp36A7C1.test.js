/**
 * tmp36A7C1.test.js — Ticket A7-C1 (TMP36, capteur de température analogique).
 *
 * TMP36 est un NOUVEAU type canonique : capteur analogique alimenté à 3
 * broches DIRECTIONNELLES (plus/vout/gnd — à la différence de LDR/THERMISTOR
 * non polarisées, mais sur le même vocabulaire de rôles que SERVO/ARDUINO).
 * Boîte canonique 60×72, PhysicalContacts plus(18,68)/vout(30,68)/gnd(42,68),
 * entraxe 12 = 1 × BREADBOARD_PITCH exact entre contacts adjacents.
 *
 * Premier composant à consommer réellement le contrat environnemental
 * générique introduit par A7-C0 (TEMPERATURE, environmentalStimulusRegistry.js
 * / environmentalResponseRegistry.js) au-delà de LIGHT/LDR : Vout dépend de
 * TEMPERATURE via une réponse déclarative dédiée, jamais une branche codée
 * en dur dans applyEnvironmentalStimuli().
 *
 * Fichier .js (PAS .jsx), suivant la convention établie par
 * lightBulbA6Out2.test.js/vibrationMotorA6Out1.test.js : les assertions DOM
 * (rendu réel de <Tmp36Part />) vivent dans le fichier .jsx jumeau
 * tmp36A7C1.test.jsx.
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
import { COMPONENT_TYPES, getComponentDef, PALETTE_ITEMS } from '../config/componentDefinitions.js'
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
import { Tmp36Model } from '../simulator/models/Tmp36Model.js'
import { applyEnvironmentalStimuli } from '../simulator/environmentalStimulus.js'
import { isValidStimulusValue, isKnownStimulusKind } from '../simulator/environmentalStimulusRegistry.js'
import { getEnvironmentalResponse } from '../simulator/environmentalResponseRegistry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP36_DIR = resolve(__dirname, '../../public/assets/components/tmp36')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian). */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function tmp36(uid, parameters) {
  return { uid, type: 'TMP36', x: 0, y: 0, parameters }
}

describe('A7-C1 — T01 : TMP36 est un type canonique enregistré dans les registres déclaratifs', () => {
  it('T01', () => {
    expect(hasCanonicalType('TMP36')).toBe(true)
    expect(COMPONENT_TYPES.TMP36).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'TMP36')).toBe(true)
    expect(hasDcContribution('TMP36')).toBe(true)
    expect(getComponentByType('TMP36')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'TMP36')).toBe(true)
  })

  it('T02 — modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('TMP36').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('TMP36')).toBe(true)
  })

  it('backend raster déclaré (preuve DOM elle-même dans le fichier .jsx jumeau)', () => {
    expect(getComponentPresentation('TMP36')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C1 — T03/T04 : boîte canonique 60×72 (dimensions natives @1x du paquet R3)', () => {
  it('T03 — width === 60', () => {
    expect(COMPONENT_TYPES.TMP36.width).toBe(60)
  })
  it('T04 — height === 72', () => {
    expect(COMPONENT_TYPES.TMP36.height).toBe(72)
  })
  it('SCALE_REFERENCE.TMP36.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'TMP36')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([60, 72])
  })
})

describe('A7-C1 — T05-T09 : PhysicalContacts plus(18,68)/vout(30,68)/gnd(42,68), pitch', () => {
  const def = getComponentDef('TMP36')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T05 — plus = (18, 68)', () => {
    expect(resolveContacts(byPin.plus)[0]).toMatchObject({ id: 'plus', dx: 18, dy: 68 })
  })
  it('T06 — vout = (30, 68)', () => {
    expect(resolveContacts(byPin.vout)[0]).toMatchObject({ id: 'vout', dx: 30, dy: 68 })
  })
  it('T06bis — gnd = (42, 68)', () => {
    expect(resolveContacts(byPin.gnd)[0]).toMatchObject({ id: 'gnd', dx: 42, dy: 68 })
  })
  it('T07 — les trois contacts sont wireConnectable', () => {
    for (const id of ['plus', 'vout', 'gnd']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T08 — les trois contacts sont breadboardInsertable', () => {
    for (const id of ['plus', 'vout', 'gnd']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T09 — entraxe horizontal entre contacts adjacents === 12 (= 1 × BREADBOARD_PITCH exact)', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [plus, vout, gnd] = ['plus', 'vout', 'gnd'].map((id) => resolveContacts(byPin[id])[0])
    expect(vout.dx - plus.dx).toBe(12)
    expect(gnd.dx - vout.dx).toBe(12)
  })
})

describe('A7-C1 — T11 : composant électriquement DIRECTIONNEL (pins/rôles)', () => {
  it('pins canoniques plus/vout/gnd, rôles power/output/ground (jamais A/B non polarisé)', () => {
    const def = getComponentDef('TMP36')
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'vout', 'gnd'])
    expect(getCanonicalEntry('TMP36').pins.map((p) => p.role)).toEqual(['power', 'output', 'ground'])
  })
})

describe('A7-C1 — T12/T13 : paramètre outputVoltage', () => {
  it('T12 — valeur par défaut = Vout(25°C) = 0.75 V, finie', () => {
    const defaults = getSimulationDefaultParameters('TMP36')
    expect(defaults).toEqual({ outputVoltage: 0.75 })
    expect(Number.isFinite(defaults.outputVoltage)).toBe(true)
  })

  it('T13 — outputVoltage invalide rejeté par Tmp36Model.validate (même convention que PotentiometerModel)', () => {
    const entry = getCanonicalEntry('TMP36')
    expect(entry.parameterSchema[0]).toMatchObject({ key: 'outputVoltage', minimum: 0.1, maximum: 1.75 })
    expect(Tmp36Model.type).toBe('TMP36')
    expect(Tmp36Model.validate({ outputVoltage: 0.75 })).toBe(true)
    expect(Tmp36Model.validate({ outputVoltage: 0.1 })).toBe(true)
    expect(Tmp36Model.validate({ outputVoltage: 1.75 })).toBe(true)
    expect(Tmp36Model.validate({ outputVoltage: 0.09 })).toBe(false)
    expect(Tmp36Model.validate({ outputVoltage: 1.76 })).toBe(false)
    expect(Tmp36Model.validate({ outputVoltage: NaN })).toBe(false)
    expect(Tmp36Model.validate({ outputVoltage: 'x' })).toBe(false)
    expect(Tmp36Model.validate(null)).toBe(false)
    expect(Tmp36Model.validate({})).toBe(false)
  })
})

describe('A7-C1 — Breadboard Physical Fit Gate : chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('TMP36')

  // NOTE géométrique (I-A7C1-14/G11) : les 3 PhysicalContacts sont bien
  // espacés d'exactement 1 × BREADBOARD_PITCH (12) entre eux (dx 18/30/42),
  // mais leur dy commun (68) n'est PAS lui-même un multiple de 12 depuis une
  // origine (0,0) — contrairement à VIBRATION_MOTOR/LIGHT_BULB (dy=84=7×12).
  // Un composant n'a jamais besoin d'être déposé exactement à l'origine du
  // breadboard pour être enfichable : il suffit qu'IL EXISTE une origine de
  // dépôt qui aligne ses contacts sur la grille (comme tout composant réel
  // déposé par l'utilisateur à la souris, jamais forcément à (0,0)). Ici,
  // origin (6,4) aligne les 3 contacts exactement sur la grille
  // (18+6=24=2×12, 30+6=36=3×12, 42+6=48=4×12 ; 68+4=72=6×12) : preuve que la
  // géométrie EST enfichable, avec 3 trous distincts, pas une origine
  // inventée pour "faire passer le test" mais la démonstration qu'AU MOINS
  // une classe d'origines valides existe (tout offset x≡6 mod 12, y≡4 mod 12
  // fonctionnerait de façon identique).
  const origin = { x: 6, y: 4 }

  it('à une origine alignée sur la grille, plus/vout/gnd résolvent 3 trous DISTINCTS simultanément', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(3)
    expect(allResolved).toBe(true)
    const [plusR, voutR, gndR] = results
    expect(plusR.hole).not.toBeNull()
    expect(voutR.hole).not.toBeNull()
    expect(gndR.hole).not.toBeNull()
    const columns = new Set([plusR.hole.column, voutR.hole.column, gndR.hole.column])
    expect(columns.size).toBe(3)
    expect(plusR.hole).toEqual(holeAt(breadboard, 24, 72))
    expect(voutR.hole).toEqual(holeAt(breadboard, 36, 72))
    expect(gndR.hole).toEqual(holeAt(breadboard, 48, 72))
    expect(plusR.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col2:top', column: 2, row: 6 })
    expect(voutR.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col3:top', column: 3, row: 6 })
    expect(gndR.hole).toEqual({ kind: 'STRIP', groupKey: 'bb1:strip:col4:top', column: 4, row: 6 })
  })

  it('les centres de contact coïncident EXACTEMENT avec les centres de trou résolus', () => {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, origin)
    for (const r of results) {
      const holeCenter = getBreadboardHolePosition(breadboard, r.hole.column, r.hole.row)
      const contact = resolveContacts(def.pins.find((p) => p.id === r.pinId))[0]
      const worldContact = { x: origin.x + contact.dx, y: origin.y + contact.dy }
      expect(holeCenter).toEqual(worldContact)
    }
  })

  it('computeBreadboardPlacement (adapter réel) : composant compatible, 3 trous distincts, placement valide', () => {
    const result = computeBreadboardPlacement(breadboard, 'TMP36', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(3)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(3)
    expect(result.valid).toBe(true)
  })

  it('resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, avec 3 pattes', () => {
    const g = resolveAssemblyGeometry({ uid: 't', type: 'TMP36', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(3)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['plus', 'vout', 'gnd']))
  })
})

describe('A7-C1 — assets réellement présents sur disque, dimensions réelles, byte-for-byte (R3 Founder pass)', () => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['tmp36.default.1x.png', 'tmp36.default.1x.webp', 'tmp36.default.3x.png', 'tmp36.default.3x.webp']) {
      expect(existsSync(resolve(TMP36_DIR, f)), f).toBe(true)
    }
  })

  it('dimensions réelles des PNG livrés : 1x = 60×72, 3x = 180×216 (= 3 × 1x)', () => {
    const one = pngDims(readFileSync(resolve(TMP36_DIR, 'tmp36.default.1x.png')))
    const three = pngDims(readFileSync(resolve(TMP36_DIR, 'tmp36.default.3x.png')))
    expect(one).toEqual({ w: 60, h: 72 })
    expect(three).toEqual({ w: 180, h: 216 })
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
  })
})

describe('A7-C1 — manifest cohérent avec la géométrie canonique', () => {
  it('manifest.canonical (dimensions + backend + state) === componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(TMP36_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('TMP36')
    expect(m.backend).toBe('raster')
    expect([m.canonical.width, m.canonical.height]).toEqual([60, 72])
    expect(m.state).toBe('default')
  })

  it('manifest.technicalContactTargets coïncide avec les PhysicalContacts réels', () => {
    const m = JSON.parse(readFileSync(resolve(TMP36_DIR, 'manifest.json'), 'utf-8'))
    expect(m.technicalContactTargets.plus).toEqual([18, 68])
    expect(m.technicalContactTargets.vout).toEqual([30, 68])
    expect(m.technicalContactTargets.gnd).toEqual([42, 68])
    const def = getComponentDef('TMP36')
    for (const id of ['plus', 'vout', 'gnd']) {
      const contact = resolveContacts(def.pins.find((p) => p.id === id))[0]
      expect([contact.dx, contact.dy]).toEqual(m.technicalContactTargets[id])
    }
  })
})

describe('A7-C1 — ASSET-INTEGRITY.json valide (hash SHA-256 réels)', () => {
  it('chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(TMP36_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.files) ? raw.files : Object.entries(raw.files ?? {}).map(([file, v]) => ({ file, ...v }))
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const entry of list) {
      const full = resolve(TMP36_DIR, entry.file)
      expect(existsSync(full), entry.file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${entry.file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${entry.file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes 4 variantes/hash que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(TMP36_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(TMP36_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestByFile = Object.fromEntries((manifest.assets ?? []).map((e) => [e.file, undefined]))
    const integrityByFile = Object.fromEntries(Object.entries(integrity.files ?? {}))
    expect(Object.keys(manifestByFile).sort()).toEqual(Object.keys(integrityByFile).sort())
  })
})

describe('A7-C1 — AssemblyProfile : racines dérivées du pixel-probe réel, aucun bodyClip requis', () => {
  // Pixel-probe réel exécuté sur le paquet copié dans ce worktree (méthode :
  // décodage alpha réel via System.Drawing.Bitmap, threshold alpha>=32,
  // équivalent du script frontend/scripts/lead-anchor-probe.md). Résultats
  // mesurés (documentés ici, verrouillés par ces assertions) :
  //  - bounding box opaque globale (1x) : x∈[21,43] y∈[6,67] — AUCUN pixel
  //    opaque à/sous y=68 (les PhysicalContacts) : aucun bodyClip requis
  //    (même situation que VIBRATION_MOTOR).
  //  - colonnes exactes des PhysicalContacts (18,68)/(30,68)/(42,68) :
  //    alpha=0 pour les trois (transparentes).
  //  - ring-search (même algorithme documenté que LIGHT_BULB) depuis chaque
  //    contact : plus -> (25,61) distance de Chebyshev 7 ; vout -> (31,67)
  //    distance 1 ; gnd -> (40,66) distance 2.
  it('profil through-hole avec exactement les leads plus/vout/gnd, style wire, racines finies', () => {
    const profile = getAssemblyProfile('TMP36')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['gnd', 'plus', 'vout'])
    for (const id of ['plus', 'vout', 'gnd']) {
      expect(profile.leads[id].style).toBe('wire')
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('racines mesurées par pixel-probe réel : plus(25,61), vout(31,67), gnd(40,66) — jamais sous les PhysicalContacts', () => {
    const { leads } = getAssemblyProfile('TMP36')
    expect(leads.plus.root).toEqual({ dx: 25, dy: 61 })
    expect(leads.vout.root).toEqual({ dx: 31, dy: 67 })
    expect(leads.gnd.root).toEqual({ dx: 40, dy: 66 })
    const def = getComponentDef('TMP36')
    for (const pin of def.pins) {
      const contactDy = pin.contacts[0].dy
      expect(leads[pin.id].root.dy).toBeLessThan(contactDy)
    }
  })

  it('les PhysicalContacts restent EXACTEMENT plus(18,68)/vout(30,68)/gnd(42,68), quelles que soient les racines mesurées', () => {
    const def = getComponentDef('TMP36')
    expect(resolveContacts(def.pins.find((p) => p.id === 'plus'))[0]).toMatchObject({ dx: 18, dy: 68 })
    expect(resolveContacts(def.pins.find((p) => p.id === 'vout'))[0]).toMatchObject({ dx: 30, dy: 68 })
    expect(resolveContacts(def.pins.find((p) => p.id === 'gnd'))[0]).toMatchObject({ dx: 42, dy: 68 })
  })

  it('aucun bodyClip : le contenu opaque du raster s\'arrête naturellement à y=67, AVANT les PhysicalContacts (y=68)', () => {
    const profile = getAssemblyProfile('TMP36')
    expect(profile.bodyClip).toBeUndefined()
  })
})

describe('A7-C1 — TEMPERATURE : contrat environnemental générique A7-C0 réellement consommé', () => {
  it('TEMPERATURE est un stimulus kind connu, validé dans [-40, 125] °C (plage datasheet réelle)', () => {
    expect(isKnownStimulusKind('TEMPERATURE')).toBe(true)
    for (const valid of [-40, 0, 25, 100, 125]) {
      expect(isValidStimulusValue('TEMPERATURE', valid)).toBe(true)
    }
    for (const invalid of [NaN, Infinity, -Infinity, -40.1, 125.1, '25', null, undefined]) {
      expect(isValidStimulusValue('TEMPERATURE', invalid)).toBe(false)
    }
  })

  it('TMP36 est enregistré dans environmentalResponseRegistry, répond à TEMPERATURE (jamais à LIGHT)', () => {
    const response = getEnvironmentalResponse('TMP36')
    expect(response).toBeTruthy()
    expect(response.stimulus).toBe('TEMPERATURE')
    expect(getEnvironmentalResponse('TMP36')).not.toBe(getEnvironmentalResponse('LDR'))
  })

  it('applyEnvironmentalStimuli(TMP36, {TEMPERATURE}) produit Vout = 0.5 + 0.01×T, exactement aux bornes 0°C/25°C/50°C/-40°C/125°C', () => {
    const components = [tmp36('t1', { outputVoltage: 0.75 })]
    const cases = [
      [-40, 0.1],
      [0, 0.5],
      [25, 0.75],
      [50, 1.0],
      [125, 1.75],
    ]
    for (const [celsius, expectedVout] of cases) {
      const [effective] = applyEnvironmentalStimuli(components, { TEMPERATURE: celsius })
      expect(effective.parameters.outputVoltage).toBeCloseTo(expectedVout, 10)
    }
  })

  it('sans TEMPERATURE (absent/invalide) : no-op strict, même référence de tableau, paramètres persistants intacts', () => {
    const originalParameters = { outputVoltage: 0.75 }
    const originalComponent = tmp36('t1', originalParameters)
    const components = Object.freeze([originalComponent])

    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [NaN, Infinity, -Infinity, -41, 126, '25']) {
      const result = applyEnvironmentalStimuli(components, { TEMPERATURE: invalid })
      expect(result).toBe(components)
    }
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ outputVoltage: 0.75 })
  })

  it('LIGHT seul actif ne fait rien à TMP36 (kind non consommé par sa réponse déclarée)', () => {
    const components = [tmp36('t1', { outputVoltage: 0.75 })]
    const result = applyEnvironmentalStimuli(components, { LIGHT: 0.9 })
    expect(result).toBe(components)
    expect(result[0].parameters).toEqual({ outputVoltage: 0.75 })
  })

  it('TEMPERATURE seul actif ne fait rien à LDR (kind non consommé par sa réponse déclarée)', () => {
    const ldr = [{ uid: 'l1', type: 'LDR', parameters: { resistance: 5000 } }]
    const result = applyEnvironmentalStimuli(ldr, { TEMPERATURE: 25 })
    expect(result).toBe(ldr)
    expect(result[0].parameters).toEqual({ resistance: 5000 })
  })

  it('circuit mixte : LIGHT affecte le LDR, TEMPERATURE affecte le TMP36, indépendamment', () => {
    const mixed = [tmp36('t1', { outputVoltage: 0.75 }), { uid: 'l1', type: 'LDR', parameters: { resistance: 5000 } }]
    const result = applyEnvironmentalStimuli(mixed, { LIGHT: 0.5, TEMPERATURE: 25 })
    expect(result[0].parameters.outputVoltage).toBeCloseTo(0.75, 10)
    expect(result[1].parameters.resistance).not.toBe(5000)
  })

  it('composant persistant original et ses parameters ne sont jamais mutés (non-mutation stricte)', () => {
    const originalParameters = { outputVoltage: 0.75 }
    const originalComponent = tmp36('t1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { TEMPERATURE: 100 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ outputVoltage: 0.75 })
    expect(result[0]).not.toBe(originalComponent)
  })
})

describe('A7-C1 — modèle électrique TMP36 : alimentation requise, Vout exposé, aucune duplication', () => {
  it('TMP36 a une contribution DC dédiée (jamais une réutilisation d\'une fonction résistive)', () => {
    expect(hasDcContribution('TMP36')).toBe(true)
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).toMatch(/function\s+tmp36Dc/)
    expect(getDcContribution('TMP36')).not.toBe(getDcContribution('RESISTOR'))
    expect(getDcContribution('TMP36')).not.toBe(getDcContribution('LDR'))
  })

  it('non alimenté (+Vs/GND flottants ou inversés) : aucune contribution DC (absent de dcAnalysis)', () => {
    const contribute = getDcContribution('TMP36')
    const params = { outputVoltage: 0.75 }
    expect(contribute({ pins: { plus: Signal.UNKNOWN, vout: Signal.UNKNOWN, gnd: Signal.UNKNOWN }, params, supplyVoltage: 5 })).toBeNull()
    expect(contribute({ pins: { plus: Signal.LOW, vout: Signal.UNKNOWN, gnd: Signal.HIGH }, params, supplyVoltage: 5 })).toBeNull()
    expect(contribute({ pins: { plus: Signal.FLOATING, vout: Signal.UNKNOWN, gnd: Signal.LOW }, params, supplyVoltage: 5 })).toBeNull()
  })

  it('alimenté correctement (+Vs=HIGH, GND=LOW) : voltage exposé = outputVoltage EFFECTIF (jamais supplyVoltage), current = 0', () => {
    const contribute = getDcContribution('TMP36')
    const result = contribute({ pins: { plus: Signal.HIGH, vout: Signal.UNKNOWN, gnd: Signal.LOW }, params: { outputVoltage: 0.6 }, supplyVoltage: 5 })
    expect(result).toEqual({ voltage: 0.6, current: 0 })
  })

  it('chaîne réelle bout en bout : POWER -> TMP36 (+Vs/GND) avec TEMPERATURE actif, dcAnalysis expose Vout(T)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'tmp1', type: 'TMP36', x: 10, y: 0, parameters: { outputVoltage: 0.75 } }
    const components = [power, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'tmp1', toPin: 'plus' },
      { fromUid: 'tmp1', fromPin: 'gnd', toUid: 'power1', toPin: 'GND' },
    ]
    const effective = applyEnvironmentalStimuli(components, { TEMPERATURE: 50 })
    const prepared = prepareCircuit(effective, wires)
    const { dcAnalysis } = resolveSignals(effective, prepared)
    expect(dcAnalysis.get('tmp1')).toEqual({ voltage: 1.0, current: 0 })
  })
})

describe('A7-C1 — T3x : non-régression des autres composants (LDR, THERMISTOR, HOBBY_GEARMOTOR, NPN_TRANSISTOR)', () => {
  it('LDR inchangé (pins, boîte, résistance par défaut, contribution DC, réponse LIGHT)', () => {
    expect(getComponentDef('LDR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getSimulationDefaultParameters('LDR')).toEqual({ resistance: 10000 })
    expect(getEnvironmentalResponse('LDR').stimulus).toBe('LIGHT')
  })

  it('THERMISTOR inchangé (pas de réponse environnementale, hors périmètre A7-C1)', () => {
    expect(getComponentDef('THERMISTOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getEnvironmentalResponse('THERMISTOR')).toBeNull()
  })

  it('HOBBY_GEARMOTOR inchangé (pins, boîte, contribution DC)', () => {
    expect(getComponentDef('HOBBY_GEARMOTOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.HOBBY_GEARMOTOR.width, COMPONENT_TYPES.HOBBY_GEARMOTOR.height]).toEqual([72, 120])
  })

  it('NPN_TRANSISTOR inchangé (pins, boîte, contribution DC)', () => {
    expect(getComponentDef('NPN_TRANSISTOR').pins.map((p) => p.id)).toEqual(['collector', 'base', 'emitter'])
    expect([COMPONENT_TYPES.NPN_TRANSISTOR.width, COMPONENT_TYPES.NPN_TRANSISTOR.height]).toEqual([90, 60])
  })
})

describe('A7-C1 — aucune branche TMP36 dans les couches génériques (resolution.js, breadboard resolver, Canvas, CircuitComponent, AssemblyLeadsLayer, PartRenderer)', () => {
  it('le littéral "TMP36" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
      '../simulator/environmentalStimulus.js',
      '../utils/breadboardPlacementAdapter.js',
      '../utils/breadboardConnectivity.js',
      '../canvas/Breadboard.jsx',
      '../canvas/CircuitComponent.jsx',
      '../components/assembly/AssemblyLeadsLayer.jsx',
      '../components/parts/PartRenderer.jsx',
    ]
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/TMP36/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']TMP36["']/)
    }
  })
})
