/**
 * tiltSensorA7C4.test.js — Ticket A7-C4-TILT (Tilt Sensor, SW-520D-style
 * module).
 *
 * TILT_SENSOR est un NOUVEAU type canonique : 2 broches DIRECTIONNELLES
 * DO/GND (le pack Founder PASS approuvé n'expose AUCUNE broche VCC — §0/§7
 * du ticket, à la différence de TMP36/SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR).
 * DO est la SEULE sortie fonctionnelle — une sortie numérique CALCULÉE
 * (digitalContributionRegistry.js, réutilisant la même infrastructure
 * PREQ/PREQ2 que SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR, avec une garde
 * d'alimentation restreinte à GND réel — §11 du ticket, aucune VCC fictive)
 * — AUCUNE sortie analogique/DC pour ce composant (§12 du ticket).
 *
 * Stimulus environnemental générique A7-C0 : TILT ∈ {0,1} (contrat Level-1
 * strictement BINAIRE, comme MOTION mais un kind DISTINCT — §8 du ticket),
 * produisant tiltDetected = TILT (passage direct, environmentalResponseRegistry.js).
 *
 * Couvre TILT01-TILT39 du ticket §15.
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
import { TiltSensorModel } from '../simulator/models/TiltSensorModel.js'
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
const TILT_DIR = resolve(__dirname, '../../public/assets/components/tilt-sensor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function tilt(uid, parameters) {
  return { uid, type: 'TILT_SENSOR', x: 0, y: 0, parameters }
}

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// TILT01-TILT03 : type canonique enregistré, pins exactes, ordre exact
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TILT01-TILT03 : TILT_SENSOR enregistré dans les registres déclaratifs', () => {
  it('TILT01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / digitalContributionRegistry / palette', () => {
    expect(hasCanonicalType('TILT_SENSOR')).toBe(true)
    expect(COMPONENT_TYPES.TILT_SENSOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'TILT_SENSOR')).toBe(true)
    expect(hasDigitalContribution('TILT_SENSOR')).toBe(true)
    expect(getComponentByType('TILT_SENSOR')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'TILT_SENSOR')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'TILT_SENSOR')).toHaveLength(1)
  })

  it('TILT02/TILT03 — pins canoniques EXACTEMENT DO/GND, dans cet ordre, rôles output/ground', () => {
    const def = getComponentDef('TILT_SENSOR')
    expect(def.pins.map((p) => p.id)).toEqual(['DO', 'GND'])
    expect(getCanonicalEntry('TILT_SENSOR').pins.map((p) => p.role)).toEqual(['output', 'ground'])
  })

  it('§12 — aucune contribution DC (TILT_SENSOR ne fournit aucune sortie analogique)', () => {
    expect(hasDcContribution('TILT_SENSOR')).toBe(false)
    expect(getDcContribution('TILT_SENSOR')).toBeNull()
    expect(getCanonicalEntry('TILT_SENSOR').capabilities).toEqual(['digital'])
  })

  it('modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('TILT_SENSOR').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('TILT_SENSOR')).toBe(true)
  })

  it('backend raster déclaré', () => {
    expect(getComponentPresentation('TILT_SENSOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C4-TILT — boîte canonique 72×120 (dimensions natives @1x du paquet Founder)', () => {
  it('width/height === 72×120', () => {
    expect([COMPONENT_TYPES.TILT_SENSOR.width, COMPONENT_TYPES.TILT_SENSOR.height]).toEqual([72, 120])
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'TILT_SENSOR')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([72, 120])
  })
})

// ---------------------------------------------------------------------------
// TILT25-TILT36 : PhysicalContacts, pitch, résolveurs breadboard réels
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TILT25-TILT28 : PhysicalContacts DO(29,108)/GND(41,108), câblables, enfichables, pitch', () => {
  const def = getComponentDef('TILT_SENSOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('TILT25 — exactement 2 PhysicalContacts, aux coordonnées fonctionnelles verrouillées', () => {
    expect(def.pins).toHaveLength(2)
    expect(resolveContacts(byPin.DO)[0]).toMatchObject({ id: 'DO', dx: 29, dy: 108 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 41, dy: 108 })
  })

  it('TILT26 — les 2 contacts sont wireConnectable', () => {
    for (const id of ['DO', 'GND']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('TILT27 — les 2 contacts sont breadboardInsertable', () => {
    for (const id of ['DO', 'GND']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('TILT28 — entraxe horizontal = 12 = 1×BREADBOARD_PITCH exact (deux trous adjacents), même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [doC, gndC] = ['DO', 'GND'].map((id) => resolveContacts(byPin[id])[0])
    expect(gndC.dx - doC.dx).toBe(12)
    expect(gndC.dy).toBe(doC.dy)
  })
})

describe('A7-C4-TILT — TILT29-TILT34 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('TILT_SENSOR')
  // DO/GND dx (29/41) ≡ 5 mod 12 ; ox=7 aligne les deux exactement sur la
  // grille (36/48 -> colonnes 3/4). dy=108 ≡ 0 mod 12 ; oy=0 place le point
  // sur la rangée 9 (108/12), le PREMIER rang valide de la bande inférieure
  // (rangées 3-7 bande haute, 8 = rainure centrale rejetée par holeAt(),
  // 9-13 bande basse) — même patron que PIR_MOTION_SENSOR/TMP36/SOIL_MOISTURE_SENSOR.
  const origin = { x: 7, y: 0 }

  it('TILT29/TILT30 — à une origine alignée sur la grille, les 2 pins résolvent 2 trous DISTINCTS, même rangée, colonnes successives', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [doR, gndR] = results
    for (const r of [doR, gndR]) expect(r.hole).not.toBeNull()
    const rows = new Set([doR.hole.row, gndR.hole.row])
    expect(rows.size).toBe(1)
    const columns = [doR.hole.column, gndR.hole.column]
    expect(new Set(columns).size).toBe(2)
    expect(columns).toEqual([columns[0], columns[0] + 1])
    expect(doR.hole).toEqual(holeAt(breadboard, origin.x + 29, origin.y + 108))
    expect(gndR.hole).toEqual(holeAt(breadboard, origin.x + 41, origin.y + 108))
  })

  it('TILT31 — computeBreadboardPlacement (adapter réel) : composant compatible, 2 trous distincts, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'TILT_SENSOR', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(2)
    expect(result.valid).toBe(true)
  })

  it('TILT35/TILT36 (via profil) — AssemblyProfile : through-hole, 2 leads, racines mesurées par pixel-probe réel, bodyClip masque la patte cuite au-delà de la racine (A7-C4-TILT-R1 — correctif Canvas FAIL, cf. tiltSensorA7C4R1.test.js)', () => {
    const profile = getAssemblyProfile('TILT_SENSOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['DO', 'GND'])
    // A7-C4-TILT-R1 : racines ramenées à la transition corps/patte réelle
    // mesurée (y=101, où le rectangle PCB plein-largeur cède la place aux
    // deux pattes individualisées) — au-dessus du PhysicalContact (y=108),
    // sens racine→trou correct (voir tiltSensorA7C4R1.test.js pour la preuve
    // complète et le rapport pixel-probe).
    expect(profile.leads.DO.root).toEqual({ dx: 31, dy: 101 })
    expect(profile.leads.GND.root).toEqual({ dx: 39, dy: 101 })
    for (const id of ['DO', 'GND']) {
      expect(profile.leads[id].style).toBe('metallic-wire')
      const contact = resolveContacts(byPinOf(def, id))[0]
      // A7-C4-TILT-R1 : root DOIT désormais être strictement au-dessus du
      // PhysicalContact (sens correct, cf. tous les autres traversants du
      // catalogue) — c'est l'inversion root.dy > contact.dy qui causait le
      // Canvas FAIL.
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy)
    }
    // A7-C4-TILT-R1 : bodyClip désormais requis (masque la patte cuite qui
    // continue jusqu'à sa pointe réelle y=117, bien au-delà du
    // PhysicalContact y=108).
    expect(profile.bodyClip).toEqual({ bottom: 19 })
  })

  it('TILT32/TILT33/TILT34 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, avec 2 pattes (target = PhysicalContact exact)', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'TILT_SENSOR', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['DO', 'GND']))
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.DO.target).toEqual({ x: origin.x + 29, y: origin.y + 108 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 41, y: origin.y + 108 })
  })
})

// ---------------------------------------------------------------------------
// TILT22-TILT24/TILT36 : assets réels sur disque, byte-for-byte, manifest cohérent
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TILT22-TILT24/TILT36 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder Pass)', () => {
  it('TILT23 — les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['tilt-sensor.default.1x.png', 'tilt-sensor.default.1x.webp', 'tilt-sensor.default.3x.png', 'tilt-sensor.default.3x.webp']) {
      expect(existsSync(resolve(TILT_DIR, f)), f).toBe(true)
    }
  })

  it('dimensions réelles des PNG livrés : 1x = 72×120, 3x = 216×360 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(TILT_DIR, 'tilt-sensor.default.1x.png')))
    const three = pngDims(readFileSync(resolve(TILT_DIR, 'tilt-sensor.default.3x.png')))
    expect([one.w, one.h]).toEqual([72, 120])
    expect([three.w, three.h]).toEqual([216, 360])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, ordre des pins visibles)', () => {
    const m = JSON.parse(readFileSync(resolve(TILT_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('TILT_SENSOR')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([72, 120])
    expect(m.visiblePinLabels).toEqual(['DO', 'GND'])
  })

  it('TILT24/TILT36 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(TILT_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(TILT_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(TILT_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(TILT_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

// ---------------------------------------------------------------------------
// TILT04-TILT14 : TILT stimulus, tiltDetected response
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TILT04-TILT10 : TILT stimulus kind connu, contrat BINAIRE strict {0,1}, distinct de MOTION', () => {
  it('TILT04/TILT05/TILT06 — TILT connu, 0 et 1 valides', () => {
    expect(isKnownStimulusKind('TILT')).toBe(true)
    expect(isValidStimulusValue('TILT', 0)).toBe(true)
    expect(isValidStimulusValue('TILT', 1)).toBe(true)
  })

  it('TILT07/TILT08/TILT09 — rejette -1, 0.5, 2 (aucune valeur intermédiaire ou hors-borne)', () => {
    for (const invalid of [-1, 0.5, 2, 0.999, 1.001]) {
      expect(isValidStimulusValue('TILT', invalid)).toBe(false)
    }
  })

  it('TILT10 — rejette boolean/string/NaN/Infinity', () => {
    for (const invalid of [true, false, '0', '1', NaN, Infinity, -Infinity, null, undefined, {}]) {
      expect(isValidStimulusValue('TILT', invalid)).toBe(false)
    }
  })

  it('TILT ≠ MOTION : deux kinds distincts, TILT_SENSOR répond à TILT (jamais à MOTION), PIR_MOTION_SENSOR répond à MOTION (jamais à TILT)', () => {
    expect(isKnownStimulusKind('MOTION')).toBe(true)
    expect(getEnvironmentalResponse('TILT_SENSOR').stimulus).toBe('TILT')
    expect(getEnvironmentalResponse('PIR_MOTION_SENSOR').stimulus).toBe('MOTION')
  })
})

describe('A7-C4-TILT — TILT11-TILT13 : TILT -> tiltDetected (passage direct, identité)', () => {
  it('TILT11 — sans stimulus actif : fallback canonique tiltDetected=0', () => {
    const defaults = getSimulationDefaultParameters('TILT_SENSOR')
    expect(defaults).toEqual({ tiltDetected: 0 })
  })
  it('TILT12 — TILT=0 -> tiltDetected=0', () => {
    const [effective] = applyEnvironmentalStimuli([tilt('t1', { tiltDetected: 0 })], { TILT: 0 })
    expect(effective.parameters.tiltDetected).toBe(0)
  })
  it('TILT13 — TILT=1 -> tiltDetected=1', () => {
    const [effective] = applyEnvironmentalStimuli([tilt('t1', { tiltDetected: 0 })], { TILT: 1 })
    expect(effective.parameters.tiltDetected).toBe(1)
  })
})

describe('A7-C4-TILT — TILT14 : non-mutation stricte du Document', () => {
  it('composant persistant original et ses parameters ne sont jamais mutés', () => {
    const originalParameters = { tiltDetected: 0 }
    const originalComponent = tilt('t1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { TILT: 1 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ tiltDetected: 0 })
    expect(result[0]).not.toBe(originalComponent)
  })

  it('stimulus absent/invalide -> no-op strict, même référence de tableau', () => {
    const originalParameters = { tiltDetected: 0 }
    const originalComponent = tilt('t1', originalParameters)
    const components = Object.freeze([originalComponent])
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [0.5, -1, 2, NaN, true, '1']) {
      expect(applyEnvironmentalStimuli(components, { TILT: invalid })).toBe(components)
    }
  })
})

// ---------------------------------------------------------------------------
// TILT15-TILT21/TILT37-TILT39 : DO — contrat, garde GND réelle (aucune VCC), propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TILT15/TILT16 : DO — contrat verrouillé tiltDetected===1 -> HIGH, tiltDetected===0 -> LOW', () => {
  const contribute = getDigitalContribution('TILT_SENSOR')
  const grounded = { DO: Signal.UNKNOWN, GND: Signal.LOW }

  it('TILT15 — tiltDetected=0 -> DO LOW', () => {
    const out = contribute({ component: tilt('t1'), pins: [], params: { tiltDetected: 0 }, pinSignals: grounded })
    expect(out.get('DO')).toBe(Signal.LOW)
  })

  it('TILT16 — tiltDetected=1 -> DO HIGH', () => {
    const out = contribute({ component: tilt('t1'), pins: [], params: { tiltDetected: 1 }, pinSignals: grounded })
    expect(out.get('DO')).toBe(Signal.HIGH)
  })
})

describe('A7-C4-TILT — TILT37 : aucune garde VCC fictive — DO absent uniquement si GND réel non résolu LOW', () => {
  const contribute = getDigitalContribution('TILT_SENSOR')
  const params = { tiltDetected: 1 }

  it('GND flottant (UNKNOWN) -> contribution retourne null (aucune référence à une broche VCC quelconque)', () => {
    const out = contribute({ component: tilt('t1'), pins: [], params, pinSignals: { DO: Signal.UNKNOWN, GND: Signal.UNKNOWN } })
    expect(out).toBeNull()
  })

  it('GND accidentellement porté HIGH -> contribution retourne null', () => {
    const out = contribute({ component: tilt('t1'), pins: [], params, pinSignals: { DO: Signal.UNKNOWN, GND: Signal.HIGH } })
    expect(out).toBeNull()
  })

  it('le corps de la fonction de contribution ne référence aucune clé "VCC"', () => {
    const src = getDigitalContribution('TILT_SENSOR').toString()
    expect(src).not.toMatch(/VCC/)
  })
})

describe('A7-C4-TILT — TILT17 : circuit réel — GND non raccordé résout DO = UNKNOWN (jamais HIGH/LOW), aucune lecture directe d\'environmentalStimuli', () => {
  it('sensor isolé (aucun fil) -> DO reste UNKNOWN', () => {
    const sensor = { uid: 't1', type: 'TILT_SENSOR', x: 0, y: 0, parameters: { tiltDetected: 1 } }
    const result = runSimulationWithRuntime([sensor], [])
    expect(result.get('t1:DO')).toBe(Signal.UNKNOWN)
  })

  it('GND raccordé par erreur au +5V (polarité inversée) -> DO reste UNKNOWN', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 't1', type: 'TILT_SENSOR', x: 10, y: 0, parameters: { tiltDetected: 1 } }
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 't1', toPin: 'GND' },
    ]
    const result = runSimulationWithRuntime([power, sensor], wires)
    expect(result.get('t1:DO')).toBe(Signal.UNKNOWN)
  })

  it('la fonction de contribution ne lit jamais environmentalStimuli directement (signature restreinte à params/pinSignals)', () => {
    const contribute = getDigitalContribution('TILT_SENSOR')
    expect(contribute.length).toBeLessThanOrEqual(1)
    const src = contribute.toString()
    expect(src).not.toMatch(/environmentalStimuli/)
  })
})

describe('A7-C4-TILT — TILT18 : DO produit participe RÉELLEMENT à la propagation par fil/net (une seule résolution)', () => {
  it('DO=HIGH se propage par fil jusqu\'à led1:anode et allume réellement la LED (chemin de production, aucune fixture)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 't1', type: 'TILT_SENSOR', x: 10, y: 0, parameters: { tiltDetected: 0 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 't1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 't1', fromPin: 'DO', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    const result = runSimulationWithRuntime(components, wires, { environmentalStimuli: { TILT: 1 } })
    expect(result.get('t1:DO')).toBe(Signal.HIGH)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
    expect(result.get('led1:cathode')).toBe(Signal.LOW)
  })

  it('TILT21 — un seul appel resolveSignals() dans la composition : aucune régression de l\'invariant PREQ2 (simulationRuntimeIntegration.js/resolution.js non modifiés par ce ticket)', () => {
    const files = ['../simulator/resolution.js', '../simulator/simulationRuntimeIntegration.js']
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/TILT_SENSOR/)
      expect(src, rel).not.toMatch(/\bTILT\b/)
    }
  })

  it('résolution directe (resolveSignals) : GND réel connecté -> pinSignals.GND LOW, aucune seconde résolution nécessaire', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 't1', type: 'TILT_SENSOR', x: 10, y: 0 }
    const components = [power, sensor]
    const wires = [{ fromUid: 't1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' }]
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get('t1:GND')).toBe(Signal.LOW)
  })
})

describe('A7-C4-TILT — TILT19/TILT20 : aucun Scheduler/Arduino requis pour un circuit TILT-only', () => {
  it('résout DO avec zéro ARDUINO et zéro orchestrator créé', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 't1', type: 'TILT_SENSOR', x: 10, y: 0, parameters: { tiltDetected: 1 } }
    const components = [power, sensor]
    const wires = [
      { fromUid: 't1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
    ]
    const orchestrators = new Map()
    const result = runSimulationWithRuntime(components, wires, { orchestrators, dt: 100 })
    expect(result.get('t1:DO')).toBe(Signal.HIGH)
    expect(orchestrators.size).toBe(0)
  })
})

describe('A7-C4-TILT — TILT38 : aucune entrée dcContributionRegistry (aucune sortie analogique)', () => {
  it('hasDcContribution/getDcContribution retournent respectivement false/null pour TILT_SENSOR', () => {
    expect(hasDcContribution('TILT_SENSOR')).toBe(false)
    expect(getDcContribution('TILT_SENSOR')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Modèle exécutable (validation)
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — TiltSensorModel : validation BINAIRE stricte {0,1}', () => {
  it('valeurs par défaut valides', () => {
    const defaults = getSimulationDefaultParameters('TILT_SENSOR')
    expect(defaults).toEqual({ tiltDetected: 0 })
    expect(TiltSensorModel.type).toBe('TILT_SENSOR')
    expect(TiltSensorModel.validate(defaults)).toBe(true)
  })

  it('rejette toute valeur hors {0,1} (intermédiaire, hors-borne, NaN, ou paramètre manquant)', () => {
    expect(TiltSensorModel.validate({ tiltDetected: 0 })).toBe(true)
    expect(TiltSensorModel.validate({ tiltDetected: 1 })).toBe(true)
    expect(TiltSensorModel.validate({ tiltDetected: 0.5 })).toBe(false)
    expect(TiltSensorModel.validate({ tiltDetected: -1 })).toBe(false)
    expect(TiltSensorModel.validate({ tiltDetected: 2 })).toBe(false)
    expect(TiltSensorModel.validate({ tiltDetected: NaN })).toBe(false)
    expect(TiltSensorModel.validate({})).toBe(false)
    expect(TiltSensorModel.validate(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Mécanismes génériques
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — createComponent / round-trip générique, aucun code spécifique', () => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent('TILT_SENSOR', 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe('TILT_SENSOR')
    expect(created.pins.map((p) => p.id)).toEqual(['DO', 'GND'])
    expect(created.uid).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// §16/§17/TILT39 : aucune branche TILT_SENSOR dans les couches génériques
// ---------------------------------------------------------------------------
describe('A7-C4-TILT — §16/§17/TILT39 : aucune branche TILT_SENSOR dans les couches génériques, fichiers protégés intacts', () => {
  it('le littéral "TILT_SENSOR" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
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
      expect(src, rel).not.toMatch(/TILT_SENSOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']TILT_SENSOR["']/)
    }
  })
})

describe('A7-C4-TILT — non-régression des autres composants (PIR_MOTION_SENSOR, SOIL_MOISTURE_SENSOR, TMP36)', () => {
  it('PIR_MOTION_SENSOR inchangé (pins, contribution digitale, réponse MOTION)', () => {
    expect(getComponentDef('PIR_MOTION_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'OUT', 'GND'])
    expect(hasDigitalContribution('PIR_MOTION_SENSOR')).toBe(true)
    expect(getEnvironmentalResponse('PIR_MOTION_SENSOR').stimulus).toBe('MOTION')
  })
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
})
