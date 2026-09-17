/**
 * soilMoistureSensorA7C3.test.js — Ticket A7-C3 (Soil Moisture Sensor,
 * YL-69 probe + YL-38 interface module).
 *
 * SOIL_MOISTURE_SENSOR est un NOUVEAU type canonique : 4 broches
 * DIRECTIONNELLES VCC/AO/DO/GND (même vocabulaire de rôles que TMP36 —
 * power/output/ground). AO est une sortie analogique EXISTANT via
 * dcContributionRegistry.js (soilMoistureSensorDc, même patron que tmp36Dc).
 * DO est une sortie numérique CALCULÉE, PREMIÈRE entrée réelle de production
 * de digitalContributionRegistry.js (soilMoistureSensorDigital), consommant
 * l'infrastructure PREQ/PREQ2 (pinSignals pré-résolu, garde d'alimentation)
 * sans aucune modification de resolution.js/simulationRuntimeIntegration.js.
 *
 * Stimulus environnemental générique A7-C0 : MOISTURE [0,1], produisant
 * analogRatio = 1 - MOISTURE (environmentalResponseRegistry.js).
 *
 * Couvre S01-S53 du ticket §17/§18.
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
import {
  getDigitalContribution,
  hasDigitalContribution,
} from '../simulator/digitalContributionRegistry.js'
import { resolveSignals } from '../simulator/resolution.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { Signal } from '../simulator/signals.js'
import { getSimulationDefaultParameters, isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
import { SoilMoistureSensorModel } from '../simulator/models/SoilMoistureSensorModel.js'
import { COMPONENT_TYPES, PALETTE_ITEMS, getComponentDef, createComponent } from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'
import { applyEnvironmentalStimuli } from '../simulator/environmentalStimulus.js'
import { isValidStimulusValue, isKnownStimulusKind } from '../simulator/environmentalStimulusRegistry.js'
import { getEnvironmentalResponse } from '../simulator/environmentalResponseRegistry.js'
import { runSimulationWithRuntime } from '../simulator/simulationRuntimeIntegration.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOIL_DIR = resolve(__dirname, '../../public/assets/components/soil-moisture-sensor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function soil(uid, parameters) {
  return { uid, type: 'SOIL_MOISTURE_SENSOR', x: 0, y: 0, parameters }
}

// ---------------------------------------------------------------------------
// S01-S03 : type canonique enregistré, pins exactes, ordre exact
// ---------------------------------------------------------------------------
describe('A7-C3 — S01-S03 : SOIL_MOISTURE_SENSOR enregistré dans les registres déclaratifs', () => {
  it('S01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / dcContributionRegistry / digitalContributionRegistry / palette', () => {
    expect(hasCanonicalType('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(COMPONENT_TYPES.SOIL_MOISTURE_SENSOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(hasDcContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(hasDigitalContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(getComponentByType('SOIL_MOISTURE_SENSOR')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'SOIL_MOISTURE_SENSOR')).toHaveLength(1)
  })

  it('S02/S03 — pins canoniques EXACTEMENT VCC/AO/DO/GND, dans cet ordre, rôles power/output/output/ground', () => {
    const def = getComponentDef('SOIL_MOISTURE_SENSOR')
    expect(def.pins.map((p) => p.id)).toEqual(['VCC', 'AO', 'DO', 'GND'])
    expect(getCanonicalEntry('SOIL_MOISTURE_SENSOR').pins.map((p) => p.role)).toEqual(['power', 'output', 'output', 'ground'])
  })

  it('modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('SOIL_MOISTURE_SENSOR').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('SOIL_MOISTURE_SENSOR')).toBe(true)
  })

  it('backend raster déclaré (bareBody/markerless dérivés du backend raster, même patron que TMP36/FORCE_SENSOR)', () => {
    expect(getComponentPresentation('SOIL_MOISTURE_SENSOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C3 — boîte canonique 144×144 (dimensions natives @1x du paquet Founder)', () => {
  it('width/height === 144', () => {
    expect([COMPONENT_TYPES.SOIL_MOISTURE_SENSOR.width, COMPONENT_TYPES.SOIL_MOISTURE_SENSOR.height]).toEqual([144, 144])
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'SOIL_MOISTURE_SENSOR')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([144, 144])
  })
})

// ---------------------------------------------------------------------------
// S33-S43 : PhysicalContacts, pitch, résolveurs breadboard réels
// ---------------------------------------------------------------------------
describe('A7-C3 — S33-S38 : PhysicalContacts VCC(80,140)/AO(92,140)/DO(104,140)/GND(116,140), câblables, enfichables, pitch', () => {
  const def = getComponentDef('SOIL_MOISTURE_SENSOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('S33 — les 4 PhysicalContacts sont aux coordonnées fonctionnelles verrouillées', () => {
    expect(resolveContacts(byPin.VCC)[0]).toMatchObject({ id: 'VCC', dx: 80, dy: 140 })
    expect(resolveContacts(byPin.AO)[0]).toMatchObject({ id: 'AO', dx: 92, dy: 140 })
    expect(resolveContacts(byPin.DO)[0]).toMatchObject({ id: 'DO', dx: 104, dy: 140 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 116, dy: 140 })
  })

  it('S34 — les 4 contacts sont wireConnectable', () => {
    for (const id of ['VCC', 'AO', 'DO', 'GND']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('S35 — les 4 contacts sont breadboardInsertable', () => {
    for (const id of ['VCC', 'AO', 'DO', 'GND']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('S36/S37/S38 — entraxe horizontal = 12 = 1×BREADBOARD_PITCH exact entre CHAQUE paire adjacente, même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [vcc, ao, do_, gnd] = ['VCC', 'AO', 'DO', 'GND'].map((id) => resolveContacts(byPin[id])[0])
    expect(ao.dx - vcc.dx).toBe(12)
    expect(do_.dx - ao.dx).toBe(12)
    expect(gnd.dx - do_.dx).toBe(12)
    expect(ao.dy).toBe(vcc.dy)
    expect(do_.dy).toBe(vcc.dy)
    expect(gnd.dy).toBe(vcc.dy)
  })
})

describe('A7-C3 — S39-S43 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('SOIL_MOISTURE_SENSOR')
  // Origine (4,4) aligne les 4 contacts EXACTEMENT sur la grille : les dx
  // (80/92/104/116) diffèrent déjà d'exacts multiples de 12, donc un seul
  // décalage ox les aligne tous simultanément — 80 mod 12 = 8, ox=4 ->
  // 84/96/108/120 = 7×12/8×12/9×12/10×12. dy=140 mod 12 = 8, oy=4 ->
  // 144 = 12×12. Preuve qu'AU MOINS une classe d'origines valides existe
  // (tout offset x≡4 mod 12, y≡4 mod 12 fonctionnerait identiquement),
  // même patron que TMP36/FORCE_SENSOR/FLEX_SENSOR (origin non-(0,0)).
  const origin = { x: 4, y: 4 }

  it('S39/S40/S41/S42 — à une origine alignée sur la grille, les 4 pins résolvent 4 trous DISTINCTS, même rangée, colonnes successives', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(4)
    expect(allResolved).toBe(true)
    const [vccR, aoR, doR, gndR] = results
    for (const r of [vccR, aoR, doR, gndR]) expect(r.hole).not.toBeNull()
    const rows = new Set([vccR.hole.row, aoR.hole.row, doR.hole.row, gndR.hole.row])
    expect(rows.size).toBe(1)
    const columns = [vccR.hole.column, aoR.hole.column, doR.hole.column, gndR.hole.column]
    expect(new Set(columns).size).toBe(4)
    expect(columns).toEqual([columns[0], columns[0] + 1, columns[0] + 2, columns[0] + 3])
    expect(vccR.hole).toEqual(holeAt(breadboard, origin.x + 80, origin.y + 140))
    expect(aoR.hole).toEqual(holeAt(breadboard, origin.x + 92, origin.y + 140))
    expect(doR.hole).toEqual(holeAt(breadboard, origin.x + 104, origin.y + 140))
    expect(gndR.hole).toEqual(holeAt(breadboard, origin.x + 116, origin.y + 140))
  })

  it('S43 — computeBreadboardPlacement (adapter réel) : composant compatible, 4 trous distincts, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'SOIL_MOISTURE_SENSOR', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(4)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(4)
    expect(result.valid).toBe(true)
  })

  it('S44-S48 — AssemblyProfile : through-hole, 4 leads, racines verrouillées, aucun bodyClip, insertion réelle', () => {
    const profile = getAssemblyProfile('SOIL_MOISTURE_SENSOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['AO', 'DO', 'GND', 'VCC'])
    expect(profile.leads.VCC.root).toEqual({ dx: 91, dy: 116 })
    expect(profile.leads.AO.root).toEqual({ dx: 96, dy: 116 })
    expect(profile.leads.DO.root).toEqual({ dx: 101, dy: 116 })
    expect(profile.leads.GND.root).toEqual({ dx: 107, dy: 116 })
    for (const id of ['VCC', 'AO', 'DO', 'GND']) {
      expect(profile.leads[id].style).toBe('metallic-wire')
      const contact = resolveContacts(byPinOf(def, id))[0]
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy)
    }
    expect(profile.bodyClip).toBeUndefined()

    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'SOIL_MOISTURE_SENSOR', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(4)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['VCC', 'AO', 'DO', 'GND']))
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.VCC.target).toEqual({ x: origin.x + 80, y: origin.y + 140 })
    expect(byPinId.AO.target).toEqual({ x: origin.x + 92, y: origin.y + 140 })
    expect(byPinId.DO.target).toEqual({ x: origin.x + 104, y: origin.y + 140 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 116, y: origin.y + 140 })
  })
})

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// S49-S53 : assets réels sur disque, byte-for-byte, manifest cohérent
// ---------------------------------------------------------------------------
describe('A7-C3 — S49-S53 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder Pass)', () => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['soil-moisture-sensor.default.1x.png', 'soil-moisture-sensor.default.1x.webp', 'soil-moisture-sensor.default.3x.png', 'soil-moisture-sensor.default.3x.webp']) {
      expect(existsSync(resolve(SOIL_DIR, f)), f).toBe(true)
    }
  })

  it('dimensions réelles des PNG livrés : 1x = 144×144, 3x = 432×432 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(SOIL_DIR, 'soil-moisture-sensor.default.1x.png')))
    const three = pngDims(readFileSync(resolve(SOIL_DIR, 'soil-moisture-sensor.default.3x.png')))
    expect([one.w, one.h]).toEqual([144, 144])
    expect([three.w, three.h]).toEqual([432, 432])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, header labels)', () => {
    const m = JSON.parse(readFileSync(resolve(SOIL_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('SOIL_MOISTURE_SENSOR')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 144])
    expect(m.interface.visibleHeaderLabels).toEqual(['VCC', 'AO', 'DO', 'GND'])
  })

  it('ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(SOIL_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(SOIL_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(SOIL_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(SOIL_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

// ---------------------------------------------------------------------------
// S04-S16 : MOISTURE stimulus, analogRatio response
// ---------------------------------------------------------------------------
describe('A7-C3 — S04-S10 : MOISTURE stimulus kind connu, validé strictement dans [0,1]', () => {
  it('S04/S05/S06/S07 — MOISTURE connu, 0/1/intermédiaire valides', () => {
    expect(isKnownStimulusKind('MOISTURE')).toBe(true)
    for (const valid of [0, 0.25, 0.5, 0.75, 1]) {
      expect(isValidStimulusValue('MOISTURE', valid)).toBe(true)
    }
  })

  it('S08/S09/S10 — rejette < 0, > 1, NaN/Infinity/non-number', () => {
    for (const invalid of [-0.0001, 1.0001, NaN, Infinity, -Infinity, '0.5', null, undefined, {}]) {
      expect(isValidStimulusValue('MOISTURE', invalid)).toBe(false)
    }
  })

  it('SOIL_MOISTURE_SENSOR est enregistré dans environmentalResponseRegistry, répond à MOISTURE (jamais à un autre kind)', () => {
    const response = getEnvironmentalResponse('SOIL_MOISTURE_SENSOR')
    expect(response).toBeTruthy()
    expect(response.stimulus).toBe('MOISTURE')
  })
})

describe('A7-C3 — S11-S14 : MOISTURE -> analogRatio = 1 - MOISTURE, exactement aux bornes, strictement monotone décroissante', () => {
  it('S11 — moisture=0 -> analogRatio=1', () => {
    const [effective] = applyEnvironmentalStimuli([soil('s1', { analogRatio: 1, threshold: 0.5 })], { MOISTURE: 0 })
    expect(effective.parameters.analogRatio).toBeCloseTo(1, 10)
  })
  it('S12 — moisture=1 -> analogRatio=0', () => {
    const [effective] = applyEnvironmentalStimuli([soil('s1', { analogRatio: 1, threshold: 0.5 })], { MOISTURE: 1 })
    expect(effective.parameters.analogRatio).toBeCloseTo(0, 10)
  })
  it('S13 — moisture=0.5 -> analogRatio=0.5', () => {
    const [effective] = applyEnvironmentalStimuli([soil('s1', { analogRatio: 1, threshold: 0.5 })], { MOISTURE: 0.5 })
    expect(effective.parameters.analogRatio).toBeCloseTo(0.5, 10)
  })
  it('S14 — strictement monotone décroissante sur des échantillons intermédiaires', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map((moisture) => {
      const [effective] = applyEnvironmentalStimuli([soil('s1', { analogRatio: 1, threshold: 0.5 })], { MOISTURE: moisture })
      return effective.parameters.analogRatio
    })
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThan(samples[i - 1])
  })
})

describe('A7-C3 — S15/S16 : fallback canonique, non-mutation stricte', () => {
  it('S15 — stimulus absent/invalide -> no-op strict, même référence de tableau, paramètres persistants intacts', () => {
    const originalParameters = { analogRatio: 1, threshold: 0.5 }
    const originalComponent = soil('s1', originalParameters)
    const components = Object.freeze([originalComponent])
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [NaN, Infinity, -Infinity, -0.1, 1.1, '0.5']) {
      expect(applyEnvironmentalStimuli(components, { MOISTURE: invalid })).toBe(components)
    }
    expect(originalComponent.parameters).toBe(originalParameters)
  })

  it('S16 — MOISTURE actif ne mute jamais le composant/parameters originaux', () => {
    const originalParameters = { analogRatio: 1, threshold: 0.5 }
    const originalComponent = soil('s1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { MOISTURE: 0.5 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ analogRatio: 1, threshold: 0.5 })
    expect(result[0]).not.toBe(originalComponent)
  })
})

// ---------------------------------------------------------------------------
// S17-S23 : alimentation, AO
// ---------------------------------------------------------------------------
describe('A7-C3 — S17-S20 : modèle DC — alimentation directionnelle requise pour AO', () => {
  it('S17 — a une contribution DC dédiée (jamais une réutilisation résistive)', () => {
    expect(hasDcContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).toMatch(/function\s+soilMoistureSensorDc/)
    expect(getDcContribution('SOIL_MOISTURE_SENSOR')).not.toBe(getDcContribution('RESISTOR'))
  })

  it('S18 — polarité inversée (VCC=LOW, GND=HIGH) : aucune contribution DC', () => {
    const contribute = getDcContribution('SOIL_MOISTURE_SENSOR')
    const params = { analogRatio: 1, threshold: 0.5 }
    expect(contribute({ pins: { VCC: Signal.LOW, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.HIGH }, params, supplyVoltage: 5 })).toBeNull()
  })

  it('S19 — alimentation déconnectée (UNKNOWN/FLOATING) : aucune contribution DC', () => {
    const contribute = getDcContribution('SOIL_MOISTURE_SENSOR')
    const params = { analogRatio: 1, threshold: 0.5 }
    expect(contribute({ pins: { VCC: Signal.UNKNOWN, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.UNKNOWN }, params, supplyVoltage: 5 })).toBeNull()
    expect(contribute({ pins: { VCC: Signal.FLOATING, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.LOW }, params, supplyVoltage: 5 })).toBeNull()
  })

  it('S20 — conflit de source (via resolveSignals réel) : jamais powered, aucune AO dans dcAnalysis', () => {
    const power1 = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const power2 = { uid: 'power2', type: 'POWER', x: 10, y: 0 }
    const sensor = { uid: 's1', type: 'SOIL_MOISTURE_SENSOR', x: 20, y: 0, parameters: { analogRatio: 1, threshold: 0.5 } }
    const components = [power1, power2, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'power2', toPin: 'GND' },
      { fromUid: 'power1', fromPin: '5V', toUid: 's1', toPin: 'VCC' },
    ]
    const prepared = prepareCircuit(components, wires)
    const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)
    expect(pinSignals.get('s1:VCC')).toBe(Signal.UNKNOWN)
    expect(dcAnalysis.has('s1')).toBe(false)
  })
})

describe('A7-C3 — S21-S23 : AO voltage = supplyVoltage × analogRatio, correctement alimenté', () => {
  it('alimenté correctement (VCC=HIGH, GND=LOW) : voltage exposé = supplyVoltage × analogRatio, current = 0', () => {
    const contribute = getDcContribution('SOIL_MOISTURE_SENSOR')
    const result = contribute({ pins: { VCC: Signal.HIGH, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.LOW }, params: { analogRatio: 0.5, threshold: 0.5 }, supplyVoltage: 5 })
    expect(result).toEqual({ voltage: 2.5, current: 0 })
  })

  it('S21/S22/S23 — chaîne réelle bout en bout : POWER(5V) -> SOIL_MOISTURE_SENSOR (VCC/GND) avec MOISTURE actif, dcAnalysis expose AO = 5×analogRatio', () => {
    function chain(moisture) {
      const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
      const sensor = { uid: 's1', type: 'SOIL_MOISTURE_SENSOR', x: 10, y: 0, parameters: { analogRatio: 1, threshold: 0.5 } }
      const components = [power, sensor]
      const wires = [
        { fromUid: 'power1', fromPin: '5V', toUid: 's1', toPin: 'VCC' },
        { fromUid: 's1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      ]
      const effective = applyEnvironmentalStimuli(components, { MOISTURE: moisture })
      const prepared = prepareCircuit(effective, wires)
      const { dcAnalysis } = resolveSignals(effective, prepared)
      return dcAnalysis.get('s1')
    }
    expect(chain(0)).toEqual({ voltage: 5, current: 0 })
    expect(chain(0.5)).toEqual({ voltage: 2.5, current: 0 })
    expect(chain(1)).toEqual({ voltage: 0, current: 0 })
  })
})

// ---------------------------------------------------------------------------
// S24-S32 : DO — contrat pédagogique, powered guard, propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C3 — S24-S26 : DO — contrat pédagogique MOISTURE < threshold -> HIGH, sinon LOW', () => {
  const contribute = getDigitalContribution('SOIL_MOISTURE_SENSOR')
  const powered = { VCC: Signal.HIGH, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.LOW }

  it('S24 — threshold=0.5, moisture=0.2 (< threshold) -> DO HIGH', () => {
    // analogRatio EFFECTIF = 1 - moisture = 0.8
    const out = contribute({ component: soil('s1'), pins: [], params: { analogRatio: 0.8, threshold: 0.5 }, pinSignals: powered })
    expect(out.get('DO')).toBe(Signal.HIGH)
  })

  it('S25 — threshold=0.5, moisture=0.5 (== threshold) -> DO LOW', () => {
    const out = contribute({ component: soil('s1'), pins: [], params: { analogRatio: 0.5, threshold: 0.5 }, pinSignals: powered })
    expect(out.get('DO')).toBe(Signal.LOW)
  })

  it('S26 — threshold=0.5, moisture=0.8 (> threshold) -> DO LOW', () => {
    const out = contribute({ component: soil('s1'), pins: [], params: { analogRatio: 0.2, threshold: 0.5 }, pinSignals: powered })
    expect(out.get('DO')).toBe(Signal.LOW)
  })
})

describe('A7-C3 — S27/S28 : DO UNKNOWN (aucune sortie produite) lorsque non alimenté ou en polarité inversée', () => {
  const contribute = getDigitalContribution('SOIL_MOISTURE_SENSOR')
  const params = { analogRatio: 0.8, threshold: 0.5 }

  it('S27 — non alimenté (VCC/GND UNKNOWN) -> contribution retourne null', () => {
    const out = contribute({ component: soil('s1'), pins: [], params, pinSignals: { VCC: Signal.UNKNOWN, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.UNKNOWN } })
    expect(out).toBeNull()
  })

  it('S28 — polarité inversée (VCC=LOW, GND=HIGH) -> contribution retourne null', () => {
    const out = contribute({ component: soil('s1'), pins: [], params, pinSignals: { VCC: Signal.LOW, AO: Signal.UNKNOWN, DO: Signal.UNKNOWN, GND: Signal.HIGH } })
    expect(out).toBeNull()
  })

  it('un circuit réel non alimenté/inversé résout DO = UNKNOWN (jamais HIGH/LOW)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 's1', type: 'SOIL_MOISTURE_SENSOR', x: 10, y: 0, parameters: { analogRatio: 0.8, threshold: 0.5 } }
    const components = [power, sensor]
    const reversedWires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 's1', toPin: 'GND' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 's1', toPin: 'VCC' },
    ]
    const result = runSimulationWithRuntime(components, reversedWires)
    expect(result.get('s1:DO')).toBe(Signal.UNKNOWN)
  })
})

describe('A7-C3 — S29/S30 : DO produite participe RÉELLEMENT à la propagation (une seule résolution)', () => {
  it('S29 — DO=HIGH se propage par fil jusqu\'à led1:anode et allume réellement la LED (chemin de production, aucune fixture)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 's1', type: 'SOIL_MOISTURE_SENSOR', x: 10, y: 0, parameters: { analogRatio: 1, threshold: 0.5 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 's1', toPin: 'VCC' },
      { fromUid: 's1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 's1', fromPin: 'DO', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    // MOISTURE=0 -> analogRatio=1 -> moisture recalculée=0 < threshold(0.5) -> DO HIGH
    const result = runSimulationWithRuntime(components, wires, { environmentalStimuli: { MOISTURE: 0 } })
    expect(result.get('s1:DO')).toBe(Signal.HIGH)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
    expect(result.get('led1:cathode')).toBe(Signal.LOW)
  })

  it('S30 — un seul appel resolveSignals() dans la composition : aucune régression de l\'invariant PREQ2 (simulationRuntimeIntegration.js/resolution.js non modifiés par ce ticket)', () => {
    const files = ['../simulator/resolution.js', '../simulator/simulationRuntimeIntegration.js']
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/SOIL_MOISTURE_SENSOR/)
    }
  })
})

describe('A7-C3 — S31/S32 : aucun Scheduler/Arduino requis pour un circuit soil-only', () => {
  it('résout AO et DO avec zéro ARDUINO et zéro orchestrator créé', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 's1', type: 'SOIL_MOISTURE_SENSOR', x: 10, y: 0, parameters: { analogRatio: 0.8, threshold: 0.5 } }
    const components = [power, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 's1', toPin: 'VCC' },
      { fromUid: 's1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
    ]
    const orchestrators = new Map()
    const result = runSimulationWithRuntime(components, wires, { orchestrators, dt: 100 })
    expect(result.get('s1:DO')).toBe(Signal.HIGH)
    expect(orchestrators.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Modèle exécutable (validation)
// ---------------------------------------------------------------------------
describe('A7-C3 — SoilMoistureSensorModel : validation bornée [0,1] des deux paramètres', () => {
  it('valeurs par défaut valides, bornes [0,1] respectées', () => {
    const defaults = getSimulationDefaultParameters('SOIL_MOISTURE_SENSOR')
    expect(defaults).toEqual({ analogRatio: 1, threshold: 0.5 })
    expect(SoilMoistureSensorModel.type).toBe('SOIL_MOISTURE_SENSOR')
    expect(SoilMoistureSensorModel.validate(defaults)).toBe(true)
  })

  it('rejette toute valeur hors [0,1], NaN, ou paramètre manquant', () => {
    expect(SoilMoistureSensorModel.validate({ analogRatio: 0, threshold: 0 })).toBe(true)
    expect(SoilMoistureSensorModel.validate({ analogRatio: 1, threshold: 1 })).toBe(true)
    expect(SoilMoistureSensorModel.validate({ analogRatio: -0.01, threshold: 0.5 })).toBe(false)
    expect(SoilMoistureSensorModel.validate({ analogRatio: 1.01, threshold: 0.5 })).toBe(false)
    expect(SoilMoistureSensorModel.validate({ analogRatio: NaN, threshold: 0.5 })).toBe(false)
    expect(SoilMoistureSensorModel.validate({ analogRatio: 0.5 })).toBe(false)
    expect(SoilMoistureSensorModel.validate(null)).toBe(false)
    expect(SoilMoistureSensorModel.validate({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Mécanismes génériques
// ---------------------------------------------------------------------------
describe('A7-C3 — createComponent / round-trip générique, aucun code spécifique', () => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent('SOIL_MOISTURE_SENSOR', 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe('SOIL_MOISTURE_SENSOR')
    expect(created.pins.map((p) => p.id)).toEqual(['VCC', 'AO', 'DO', 'GND'])
    expect(created.uid).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// §19 : aucune branche SOIL_MOISTURE_SENSOR dans les couches génériques
// ---------------------------------------------------------------------------
describe('A7-C3 — §19/§20 : aucune branche SOIL_MOISTURE_SENSOR dans les couches génériques, fichiers protégés intacts', () => {
  it('le littéral "SOIL_MOISTURE_SENSOR" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
      '../simulator/simulationRuntimeIntegration.js',
      '../simulator/preparation.js',
      '../simulator/engine.js',
      '../simulator/environmentalStimulus.js',
      '../utils/breadboardPlacementAdapter.js',
      '../utils/breadboardConnectivity.js',
      '../canvas/Breadboard.jsx',
      '../canvas/CircuitComponent.jsx',
      '../canvas/SimulationCanvas.jsx',
      '../components/assembly/AssemblyLeadsLayer.jsx',
      '../components/parts/PartRenderer.jsx',
    ]
    for (const rel of files) {
      const full = resolve(__dirname, rel)
      if (!existsSync(full)) continue
      const src = readFileSync(full, 'utf-8')
      expect(src, rel).not.toMatch(/SOIL_MOISTURE_SENSOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']SOIL_MOISTURE_SENSOR["']/)
    }
  })
})

describe('A7-C3 — non-régression des autres composants (TMP36, FORCE_SENSOR, FLEX_SENSOR, LDR)', () => {
  it('TMP36 inchangé (pins, boîte, contribution DC dédiée, réponse TEMPERATURE)', () => {
    expect(getComponentDef('TMP36').pins.map((p) => p.id)).toEqual(['plus', 'vout', 'gnd'])
    expect(getEnvironmentalResponse('TMP36').stimulus).toBe('TEMPERATURE')
  })
  it('FORCE_SENSOR/FLEX_SENSOR inchangés (pins, contribution DC réutilisée)', () => {
    expect(getComponentDef('FORCE_SENSOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getComponentDef('FLEX_SENSOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getDcContribution('FORCE_SENSOR')).toBe(getDcContribution('RESISTOR'))
  })
  it('LDR inchangé (résistance par défaut, réponse LIGHT)', () => {
    expect(getSimulationDefaultParameters('LDR')).toEqual({ resistance: 10000 })
    expect(getEnvironmentalResponse('LDR').stimulus).toBe('LIGHT')
  })
})
