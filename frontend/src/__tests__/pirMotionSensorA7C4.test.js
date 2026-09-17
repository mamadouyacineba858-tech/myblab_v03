/**
 * pirMotionSensorA7C4.test.js — Ticket A7-C4-PIR (PIR Motion Sensor,
 * HC-SR501-style module).
 *
 * PIR_MOTION_SENSOR est un NOUVEAU type canonique : 3 broches DIRECTIONNELLES
 * VCC/OUT/GND (même vocabulaire de rôles que TMP36/SOIL_MOISTURE_SENSOR —
 * power/output/ground). OUT est la SEULE sortie fonctionnelle — une sortie
 * numérique CALCULÉE (digitalContributionRegistry.js, réutilisant la même
 * infrastructure PREQ/PREQ2 que SOIL_MOISTURE_SENSOR) — AUCUNE sortie
 * analogique/DC pour ce composant (§12 du ticket).
 *
 * Stimulus environnemental générique A7-C0 : MOTION ∈ {0,1} (contrat
 * Level-1 strictement BINAIRE, à la différence de LIGHT/FORCE/FLEX/MOISTURE
 * qui acceptent tout le continuum [0,1]), produisant motionDetected = MOTION
 * (passage direct, environmentalResponseRegistry.js).
 *
 * Couvre PIR01-PIR36 du ticket §15.
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
import { PirMotionSensorModel } from '../simulator/models/PirMotionSensorModel.js'
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
const PIR_DIR = resolve(__dirname, '../../public/assets/components/pir-motion-sensor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function pir(uid, parameters) {
  return { uid, type: 'PIR_MOTION_SENSOR', x: 0, y: 0, parameters }
}

// ---------------------------------------------------------------------------
// PIR01-PIR03 : type canonique enregistré, pins exactes, ordre exact
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PIR01-PIR03 : PIR_MOTION_SENSOR enregistré dans les registres déclaratifs', () => {
  it('PIR01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / digitalContributionRegistry / palette', () => {
    expect(hasCanonicalType('PIR_MOTION_SENSOR')).toBe(true)
    expect(COMPONENT_TYPES.PIR_MOTION_SENSOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'PIR_MOTION_SENSOR')).toBe(true)
    expect(hasDigitalContribution('PIR_MOTION_SENSOR')).toBe(true)
    expect(getComponentByType('PIR_MOTION_SENSOR')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'PIR_MOTION_SENSOR')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'PIR_MOTION_SENSOR')).toHaveLength(1)
  })

  it('PIR02/PIR03 — pins canoniques EXACTEMENT VCC/OUT/GND, dans cet ordre, rôles power/output/ground', () => {
    const def = getComponentDef('PIR_MOTION_SENSOR')
    expect(def.pins.map((p) => p.id)).toEqual(['VCC', 'OUT', 'GND'])
    expect(getCanonicalEntry('PIR_MOTION_SENSOR').pins.map((p) => p.role)).toEqual(['power', 'output', 'ground'])
  })

  it('§12 — aucune contribution DC (PIR ne fournit aucune sortie analogique)', () => {
    expect(hasDcContribution('PIR_MOTION_SENSOR')).toBe(false)
    expect(getDcContribution('PIR_MOTION_SENSOR')).toBeNull()
    expect(getCanonicalEntry('PIR_MOTION_SENSOR').capabilities).toEqual(['digital'])
  })

  it('modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('PIR_MOTION_SENSOR').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('PIR_MOTION_SENSOR')).toBe(true)
  })

  it('PIR24 — backend raster déclaré', () => {
    expect(getComponentPresentation('PIR_MOTION_SENSOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C4-PIR — boîte canonique 120×96 (dimensions natives @1x du paquet Founder)', () => {
  it('width/height === 120×96', () => {
    expect([COMPONENT_TYPES.PIR_MOTION_SENSOR.width, COMPONENT_TYPES.PIR_MOTION_SENSOR.height]).toEqual([120, 96])
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'PIR_MOTION_SENSOR')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([120, 96])
  })
})

// ---------------------------------------------------------------------------
// PIR27-PIR35 : PhysicalContacts, pitch, résolveurs breadboard réels
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PIR27-PIR29 : PhysicalContacts VCC(48,92)/OUT(60,92)/GND(72,92), câblables, enfichables, pitch', () => {
  const def = getComponentDef('PIR_MOTION_SENSOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('PIR27 — les 3 PhysicalContacts sont aux coordonnées fonctionnelles verrouillées', () => {
    expect(resolveContacts(byPin.VCC)[0]).toMatchObject({ id: 'VCC', dx: 48, dy: 92 })
    expect(resolveContacts(byPin.OUT)[0]).toMatchObject({ id: 'OUT', dx: 60, dy: 92 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 72, dy: 92 })
  })

  it('PIR28 — les 3 contacts sont wireConnectable', () => {
    for (const id of ['VCC', 'OUT', 'GND']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('PIR29 — les 3 contacts sont breadboardInsertable', () => {
    for (const id of ['VCC', 'OUT', 'GND']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('entraxe horizontal = 12 = 1×BREADBOARD_PITCH exact entre CHAQUE paire adjacente, même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [vcc, out, gnd] = ['VCC', 'OUT', 'GND'].map((id) => resolveContacts(byPin[id])[0])
    expect(out.dx - vcc.dx).toBe(12)
    expect(gnd.dx - out.dx).toBe(12)
    expect(out.dy).toBe(vcc.dy)
    expect(gnd.dy).toBe(vcc.dy)
  })
})

describe('A7-C4-PIR — PIR30-PIR35 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('PIR_MOTION_SENSOR')
  // Origine (0,16) aligne les 3 contacts EXACTEMENT sur la grille : dx
  // (48/60/72) sont déjà des multiples exacts de 12 (4×12/5×12/6×12), donc
  // ox=0 suffit (colonnes 4/5/6). dy=92 mod 12 = 8, donc oy doit valoir 4
  // (mod 12) pour un alignement exact — mais oy=4 place le point sur la
  // rangée 8 (96/12), qui tombe dans la RAINURE CENTRALE (holeAt() la
  // rejette : aucun trou entre la bande supérieure, rangées 3-7, et la bande
  // inférieure, rangées 9-13). oy=16 (≡4 mod 12) place le point sur la
  // rangée 9 (108/12), le PREMIER rang valide de la bande inférieure.
  // Preuve qu'AU MOINS une classe d'origines valides existe (tout offset
  // x≡0 mod 12, y≡4 mod 12 ATTERRISSANT sur une rangée réellement enfichable
  // fonctionnerait identiquement), même patron que TMP36/SOIL_MOISTURE_SENSOR.
  const origin = { x: 0, y: 16 }

  it('PIR30/PIR31 — à une origine alignée sur la grille, les 3 pins résolvent 3 trous DISTINCTS, même rangée, colonnes successives', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(3)
    expect(allResolved).toBe(true)
    const [vccR, outR, gndR] = results
    for (const r of [vccR, outR, gndR]) expect(r.hole).not.toBeNull()
    const rows = new Set([vccR.hole.row, outR.hole.row, gndR.hole.row])
    expect(rows.size).toBe(1)
    const columns = [vccR.hole.column, outR.hole.column, gndR.hole.column]
    expect(new Set(columns).size).toBe(3)
    expect(columns).toEqual([columns[0], columns[0] + 1, columns[0] + 2])
    expect(vccR.hole).toEqual(holeAt(breadboard, origin.x + 48, origin.y + 92))
    expect(outR.hole).toEqual(holeAt(breadboard, origin.x + 60, origin.y + 92))
    expect(gndR.hole).toEqual(holeAt(breadboard, origin.x + 72, origin.y + 92))
  })

  it('PIR32 — computeBreadboardPlacement (adapter réel) : composant compatible, 3 trous distincts, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'PIR_MOTION_SENSOR', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(3)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(3)
    expect(result.valid).toBe(true)
  })

  it('PIR33/PIR35 — AssemblyProfile : through-hole, 3 leads, racines mesurées par pixel-probe réel, aucun bodyClip', () => {
    const profile = getAssemblyProfile('PIR_MOTION_SENSOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['GND', 'OUT', 'VCC'])
    // Racines mesurées : centroïdes alpha-pondérés (System.Drawing, seuil
    // alpha>=32) sur le segment vertical stable de chaque patte (y∈[74,88]) :
    // VCC (50.81,80.21)->(51,80), OUT (59.33,80.12)->(59,80),
    // GND (67.99,80.17)->(68,80) — toutes pleinement opaques (alpha=255).
    expect(profile.leads.VCC.root).toEqual({ dx: 51, dy: 80 })
    expect(profile.leads.OUT.root).toEqual({ dx: 59, dy: 80 })
    expect(profile.leads.GND.root).toEqual({ dx: 68, dy: 80 })
    for (const id of ['VCC', 'OUT', 'GND']) {
      expect(profile.leads[id].style).toBe('metallic-wire')
      const contact = resolveContacts(byPinOf(def, id))[0]
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy)
    }
    expect(profile.bodyClip).toBeUndefined()
  })

  it('PIR34 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, avec 3 pattes (target = PhysicalContact exact)', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'PIR_MOTION_SENSOR', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(3)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['VCC', 'OUT', 'GND']))
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.VCC.target).toEqual({ x: origin.x + 48, y: origin.y + 92 })
    expect(byPinId.OUT.target).toEqual({ x: origin.x + 60, y: origin.y + 92 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 72, y: origin.y + 92 })
  })
})

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// PIR25-PIR26/PIR36 : assets réels sur disque, byte-for-byte, manifest cohérent
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PIR25/PIR26/PIR36 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder Pass)', () => {
  it('PIR25 — les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['pir-motion-sensor.default.1x.png', 'pir-motion-sensor.default.1x.webp', 'pir-motion-sensor.default.3x.png', 'pir-motion-sensor.default.3x.webp']) {
      expect(existsSync(resolve(PIR_DIR, f)), f).toBe(true)
    }
  })

  it('dimensions réelles des PNG livrés : 1x = 120×96, 3x = 360×288 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(PIR_DIR, 'pir-motion-sensor.default.1x.png')))
    const three = pngDims(readFileSync(resolve(PIR_DIR, 'pir-motion-sensor.default.3x.png')))
    expect([one.w, one.h]).toEqual([120, 96])
    expect([three.w, three.h]).toEqual([360, 288])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, ordre des pins visibles)', () => {
    const m = JSON.parse(readFileSync(resolve(PIR_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('PIR_MOTION_SENSOR')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([120, 96])
    expect(m.canonical.visiblePinOrder).toEqual(['VCC', 'OUT', 'GND'])
  })

  it('PIR26/PIR36 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(PIR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(PIR_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(PIR_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(PIR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

// ---------------------------------------------------------------------------
// PIR04-PIR14 : MOTION stimulus, motionDetected response
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PIR04-PIR10 : MOTION stimulus kind connu, contrat BINAIRE strict {0,1}', () => {
  it('PIR04/PIR05/PIR06 — MOTION connu, 0 et 1 valides', () => {
    expect(isKnownStimulusKind('MOTION')).toBe(true)
    expect(isValidStimulusValue('MOTION', 0)).toBe(true)
    expect(isValidStimulusValue('MOTION', 1)).toBe(true)
  })

  it('PIR07/PIR08/PIR09 — rejette -1, 0.5, 2 (aucune valeur intermédiaire ou hors-borne)', () => {
    for (const invalid of [-1, 0.5, 2, 0.999, 1.001]) {
      expect(isValidStimulusValue('MOTION', invalid)).toBe(false)
    }
  })

  it('PIR10 — rejette boolean/string/NaN/Infinity', () => {
    for (const invalid of [true, false, '0', '1', NaN, Infinity, -Infinity, null, undefined, {}]) {
      expect(isValidStimulusValue('MOTION', invalid)).toBe(false)
    }
  })

  it('PIR_MOTION_SENSOR est enregistré dans environmentalResponseRegistry, répond à MOTION (jamais à un autre kind)', () => {
    const response = getEnvironmentalResponse('PIR_MOTION_SENSOR')
    expect(response).toBeTruthy()
    expect(response.stimulus).toBe('MOTION')
  })
})

describe('A7-C4-PIR — PIR11-PIR13 : MOTION -> motionDetected (passage direct, identité)', () => {
  it('PIR11 — sans stimulus actif : fallback canonique motionDetected=0', () => {
    const defaults = getSimulationDefaultParameters('PIR_MOTION_SENSOR')
    expect(defaults).toEqual({ motionDetected: 0 })
  })
  it('PIR12 — MOTION=0 -> motionDetected=0', () => {
    const [effective] = applyEnvironmentalStimuli([pir('p1', { motionDetected: 0 })], { MOTION: 0 })
    expect(effective.parameters.motionDetected).toBe(0)
  })
  it('PIR13 — MOTION=1 -> motionDetected=1', () => {
    const [effective] = applyEnvironmentalStimuli([pir('p1', { motionDetected: 0 })], { MOTION: 1 })
    expect(effective.parameters.motionDetected).toBe(1)
  })
})

describe('A7-C4-PIR — PIR14 : non-mutation stricte du Document', () => {
  it('composant persistant original et ses parameters ne sont jamais mutés', () => {
    const originalParameters = { motionDetected: 0 }
    const originalComponent = pir('p1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { MOTION: 1 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ motionDetected: 0 })
    expect(result[0]).not.toBe(originalComponent)
  })

  it('stimulus absent/invalide -> no-op strict, même référence de tableau', () => {
    const originalParameters = { motionDetected: 0 }
    const originalComponent = pir('p1', originalParameters)
    const components = Object.freeze([originalComponent])
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [0.5, -1, 2, NaN, true, '1']) {
      expect(applyEnvironmentalStimuli(components, { MOTION: invalid })).toBe(components)
    }
  })
})

// ---------------------------------------------------------------------------
// PIR15-PIR23 : OUT — contrat, powered guard, propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PIR15/PIR16 : OUT — contrat verrouillé motionDetected===1 -> HIGH, motionDetected===0 -> LOW', () => {
  const contribute = getDigitalContribution('PIR_MOTION_SENSOR')
  const powered = { VCC: Signal.HIGH, OUT: Signal.UNKNOWN, GND: Signal.LOW }

  it('PIR15 — motionDetected=0 -> OUT LOW', () => {
    const out = contribute({ component: pir('p1'), pins: [], params: { motionDetected: 0 }, pinSignals: powered })
    expect(out.get('OUT')).toBe(Signal.LOW)
  })

  it('PIR16 — motionDetected=1 -> OUT HIGH', () => {
    const out = contribute({ component: pir('p1'), pins: [], params: { motionDetected: 1 }, pinSignals: powered })
    expect(out.get('OUT')).toBe(Signal.HIGH)
  })
})

describe('A7-C4-PIR — PIR17-PIR19 : OUT UNKNOWN (aucune sortie produite) lorsque non alimenté, inversé ou conflit de source', () => {
  const contribute = getDigitalContribution('PIR_MOTION_SENSOR')
  const params = { motionDetected: 1 }

  it('PIR17 — déconnecté (VCC/GND UNKNOWN) -> contribution retourne null', () => {
    const out = contribute({ component: pir('p1'), pins: [], params, pinSignals: { VCC: Signal.UNKNOWN, OUT: Signal.UNKNOWN, GND: Signal.UNKNOWN } })
    expect(out).toBeNull()
  })

  it('PIR18 — polarité inversée (VCC=LOW, GND=HIGH) -> contribution retourne null', () => {
    const out = contribute({ component: pir('p1'), pins: [], params, pinSignals: { VCC: Signal.LOW, OUT: Signal.UNKNOWN, GND: Signal.HIGH } })
    expect(out).toBeNull()
  })

  it('PIR17/PIR18 — circuit réel déconnecté/inversé résout OUT = UNKNOWN (jamais HIGH/LOW)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'p1', type: 'PIR_MOTION_SENSOR', x: 10, y: 0, parameters: { motionDetected: 1 } }
    const reversedWires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'p1', toPin: 'GND' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'p1', toPin: 'VCC' },
    ]
    const result = runSimulationWithRuntime([power, sensor], reversedWires)
    expect(result.get('p1:OUT')).toBe(Signal.UNKNOWN)
  })

  it('PIR19 — conflit de source (via resolveSignals réel) : jamais powered, OUT absent du contexte alimenté', () => {
    const power1 = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const power2 = { uid: 'power2', type: 'POWER', x: 10, y: 0 }
    const sensor = { uid: 'p1', type: 'PIR_MOTION_SENSOR', x: 20, y: 0, parameters: { motionDetected: 1 } }
    const components = [power1, power2, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'power2', toPin: 'GND' },
      { fromUid: 'power1', fromPin: '5V', toUid: 'p1', toPin: 'VCC' },
    ]
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get('p1:VCC')).toBe(Signal.UNKNOWN)
    const result = runSimulationWithRuntime(components, wires)
    expect(result.get('p1:OUT')).toBe(Signal.UNKNOWN)
  })
})

describe('A7-C4-PIR — PIR20/PIR23 : OUT produit participe RÉELLEMENT à la propagation (une seule résolution)', () => {
  it('PIR20 — OUT=HIGH se propage par fil jusqu\'à led1:anode et allume réellement la LED (chemin de production, aucune fixture)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'p1', type: 'PIR_MOTION_SENSOR', x: 10, y: 0, parameters: { motionDetected: 0 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'p1', toPin: 'VCC' },
      { fromUid: 'p1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 'p1', fromPin: 'OUT', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    const result = runSimulationWithRuntime(components, wires, { environmentalStimuli: { MOTION: 1 } })
    expect(result.get('p1:OUT')).toBe(Signal.HIGH)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
    expect(result.get('led1:cathode')).toBe(Signal.LOW)
  })

  it('PIR23 — un seul appel resolveSignals() dans la composition : aucune régression de l\'invariant PREQ2 (simulationRuntimeIntegration.js/resolution.js non modifiés par ce ticket)', () => {
    const files = ['../simulator/resolution.js', '../simulator/simulationRuntimeIntegration.js']
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/PIR_MOTION_SENSOR/)
      expect(src, rel).not.toMatch(/\bMOTION\b/)
    }
  })
})

describe('A7-C4-PIR — PIR21/PIR22 : aucun Scheduler/Arduino requis pour un circuit PIR-only', () => {
  it('résout OUT avec zéro ARDUINO et zéro orchestrator créé', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'p1', type: 'PIR_MOTION_SENSOR', x: 10, y: 0, parameters: { motionDetected: 1 } }
    const components = [power, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'p1', toPin: 'VCC' },
      { fromUid: 'p1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
    ]
    const orchestrators = new Map()
    const result = runSimulationWithRuntime(components, wires, { orchestrators, dt: 100 })
    expect(result.get('p1:OUT')).toBe(Signal.HIGH)
    expect(orchestrators.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Modèle exécutable (validation)
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — PirMotionSensorModel : validation BINAIRE stricte {0,1}', () => {
  it('valeurs par défaut valides', () => {
    const defaults = getSimulationDefaultParameters('PIR_MOTION_SENSOR')
    expect(defaults).toEqual({ motionDetected: 0 })
    expect(PirMotionSensorModel.type).toBe('PIR_MOTION_SENSOR')
    expect(PirMotionSensorModel.validate(defaults)).toBe(true)
  })

  it('rejette toute valeur hors {0,1} (intermédiaire, hors-borne, NaN, ou paramètre manquant)', () => {
    expect(PirMotionSensorModel.validate({ motionDetected: 0 })).toBe(true)
    expect(PirMotionSensorModel.validate({ motionDetected: 1 })).toBe(true)
    expect(PirMotionSensorModel.validate({ motionDetected: 0.5 })).toBe(false)
    expect(PirMotionSensorModel.validate({ motionDetected: -1 })).toBe(false)
    expect(PirMotionSensorModel.validate({ motionDetected: 2 })).toBe(false)
    expect(PirMotionSensorModel.validate({ motionDetected: NaN })).toBe(false)
    expect(PirMotionSensorModel.validate({})).toBe(false)
    expect(PirMotionSensorModel.validate(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Mécanismes génériques
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — createComponent / round-trip générique, aucun code spécifique', () => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent('PIR_MOTION_SENSOR', 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe('PIR_MOTION_SENSOR')
    expect(created.pins.map((p) => p.id)).toEqual(['VCC', 'OUT', 'GND'])
    expect(created.uid).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// §16/§17 : aucune branche PIR_MOTION_SENSOR dans les couches génériques
// ---------------------------------------------------------------------------
describe('A7-C4-PIR — §16/§17 : aucune branche PIR_MOTION_SENSOR dans les couches génériques, fichiers protégés intacts', () => {
  it('le littéral "PIR_MOTION_SENSOR" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
      '../simulator/simulationRuntimeIntegration.js',
      '../simulator/preparation.js',
      '../simulator/engine.js',
      '../simulator/environmentalStimulus.js',
      '../utils/breadboardGeometry.js',
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
      expect(src, rel).not.toMatch(/PIR_MOTION_SENSOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']PIR_MOTION_SENSOR["']/)
    }
  })
})

describe('A7-C4-PIR — non-régression des autres composants (SOIL_MOISTURE_SENSOR, TMP36, FORCE_SENSOR, LDR)', () => {
  it('SOIL_MOISTURE_SENSOR inchangé (pins, contribution DC+digitale, réponse MOISTURE)', () => {
    expect(getComponentDef('SOIL_MOISTURE_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'AO', 'DO', 'GND'])
    expect(hasDcContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(hasDigitalContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(getEnvironmentalResponse('SOIL_MOISTURE_SENSOR').stimulus).toBe('MOISTURE')
  })
  it('TMP36 inchangé (pins, boîte, contribution DC dédiée, réponse TEMPERATURE)', () => {
    expect(getComponentDef('TMP36').pins.map((p) => p.id)).toEqual(['plus', 'vout', 'gnd'])
    expect(getEnvironmentalResponse('TMP36').stimulus).toBe('TEMPERATURE')
  })
  it('FORCE_SENSOR inchangé (pins, contribution DC réutilisée)', () => {
    expect(getComponentDef('FORCE_SENSOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getDcContribution('FORCE_SENSOR')).toBe(getDcContribution('RESISTOR'))
  })
  it('LDR inchangé (résistance par défaut, réponse LIGHT)', () => {
    expect(getSimulationDefaultParameters('LDR')).toEqual({ resistance: 10000 })
    expect(getEnvironmentalResponse('LDR').stimulus).toBe('LIGHT')
  })
})
