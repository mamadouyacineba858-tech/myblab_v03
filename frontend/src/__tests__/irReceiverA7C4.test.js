/**
 * irReceiverA7C4.test.js — Ticket A7-C4-IR (IR Receiver, TSOP4838-style
 * 38 kHz module).
 *
 * IR_RECEIVER est un NOUVEAU type canonique : 3 broches DIRECTIONNELLES
 * SIGNAL/GND/VCC (ordre verrouillé §5 du ticket — DIFFÉRENT de
 * PIR_MOTION_SENSOR/SOIL_MOISTURE_SENSOR qui placent VCC en tête). SIGNAL
 * est la SEULE sortie fonctionnelle — une sortie numérique CALCULÉE en
 * logique ACTIVE-LOW (digitalContributionRegistry.js, réutilisant la même
 * infrastructure PREQ/PREQ2 que SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR) —
 * AUCUNE sortie analogique/DC pour ce composant (§15 du ticket).
 *
 * Stimulus environnemental générique A7-C0 : INFRARED ∈ {0,1} (contrat
 * Level-1 strictement BINAIRE, comme MOTION/TILT mais un kind DISTINCT —
 * §10 du ticket), produisant infraredDetected = INFRARED (passage direct,
 * environmentalResponseRegistry.js).
 *
 * Couvre IR-01 à IR-49 du ticket §20-27.
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
import { IrReceiverModel } from '../simulator/models/IrReceiverModel.js'
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
const IR_DIR = resolve(__dirname, '../../public/assets/components/ir-receiver')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function ir(uid, parameters) {
  return { uid, type: 'IR_RECEIVER', x: 0, y: 0, parameters }
}

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// IR-01 à IR-07 : type canonique enregistré, pins exactes, ordre exact
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-01 à IR-07 : IR_RECEIVER enregistré dans les registres déclaratifs', () => {
  it('IR-01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / digitalContributionRegistry / palette', () => {
    expect(hasCanonicalType('IR_RECEIVER')).toBe(true)
    expect(COMPONENT_TYPES.IR_RECEIVER).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'IR_RECEIVER')).toBe(true)
    expect(hasDigitalContribution('IR_RECEIVER')).toBe(true)
    expect(getComponentByType('IR_RECEIVER')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'IR_RECEIVER')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'IR_RECEIVER')).toHaveLength(1)
  })

  it('IR-02 — exactement 3 pins', () => {
    const def = getComponentDef('IR_RECEIVER')
    expect(def.pins).toHaveLength(3)
    expect(getCanonicalEntry('IR_RECEIVER').pins).toHaveLength(3)
  })

  it('IR-03 — ordre exact SIGNAL / GND / VCC', () => {
    const def = getComponentDef('IR_RECEIVER')
    expect(def.pins.map((p) => p.id)).toEqual(['SIGNAL', 'GND', 'VCC'])
  })

  it('IR-04 — rôles exacts SIGNAL output / GND ground / VCC power', () => {
    expect(getCanonicalEntry('IR_RECEIVER').pins.map((p) => p.role)).toEqual(['output', 'ground', 'power'])
  })

  it('IR-05 — aucune quatrième pin', () => {
    const def = getComponentDef('IR_RECEIVER')
    expect(def.pins.map((p) => p.id).sort()).toEqual(['GND', 'SIGNAL', 'VCC'])
  })

  it('IR-06/IR-07 — infraredDetected existe, fallback 0', () => {
    const defaults = getSimulationDefaultParameters('IR_RECEIVER')
    expect(defaults).toEqual({ infraredDetected: 0 })
  })

  it('§15 — aucune contribution DC (IR_RECEIVER ne fournit aucune sortie analogique)', () => {
    expect(hasDcContribution('IR_RECEIVER')).toBe(false)
    expect(getDcContribution('IR_RECEIVER')).toBeNull()
    expect(getCanonicalEntry('IR_RECEIVER').capabilities).toEqual(['digital'])
  })

  it('modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('IR_RECEIVER').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('IR_RECEIVER')).toBe(true)
  })

  it('backend raster déclaré', () => {
    expect(getComponentPresentation('IR_RECEIVER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })
})

describe('A7-C4-IR — boîte canonique 72×120 (dimensions natives @1x du paquet Founder)', () => {
  it('width/height === 72×120', () => {
    expect([COMPONENT_TYPES.IR_RECEIVER.width, COMPONENT_TYPES.IR_RECEIVER.height]).toEqual([72, 120])
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'IR_RECEIVER')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([72, 120])
  })
})

// ---------------------------------------------------------------------------
// IR-08 à IR-17 : INFRARED stimulus kind connu, contrat BINAIRE strict {0,1}
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-08 à IR-16 : INFRARED stimulus kind connu, contrat BINAIRE strict {0,1}', () => {
  it('IR-08/IR-09/IR-10 — INFRARED connu, 0 et 1 valides', () => {
    expect(isKnownStimulusKind('INFRARED')).toBe(true)
    expect(isValidStimulusValue('INFRARED', 0)).toBe(true)
    expect(isValidStimulusValue('INFRARED', 1)).toBe(true)
  })

  it('IR-11/IR-12/IR-13 — rejette -1, 0.5, 2 (aucune valeur intermédiaire ou hors-borne)', () => {
    for (const invalid of [-1, 0.5, 2, 0.999, 1.001]) {
      expect(isValidStimulusValue('INFRARED', invalid)).toBe(false)
    }
  })

  it('IR-14 — rejette booléens', () => {
    for (const invalid of [true, false]) {
      expect(isValidStimulusValue('INFRARED', invalid)).toBe(false)
    }
  })

  it('IR-15 — rejette strings', () => {
    for (const invalid of ['0', '1']) {
      expect(isValidStimulusValue('INFRARED', invalid)).toBe(false)
    }
  })

  it('IR-16 — rejette NaN/Infinity/-Infinity/null/undefined', () => {
    for (const invalid of [NaN, Infinity, -Infinity, null, undefined, {}]) {
      expect(isValidStimulusValue('INFRARED', invalid)).toBe(false)
    }
  })

  it('IR-17 — INFRARED reste distinct de LIGHT/MOTION/TILT : IR_RECEIVER répond à INFRARED (jamais à un autre kind)', () => {
    expect(isKnownStimulusKind('LIGHT')).toBe(true)
    expect(isKnownStimulusKind('MOTION')).toBe(true)
    expect(isKnownStimulusKind('TILT')).toBe(true)
    expect(getEnvironmentalResponse('IR_RECEIVER').stimulus).toBe('INFRARED')
    expect(getEnvironmentalResponse('PIR_MOTION_SENSOR').stimulus).toBe('MOTION')
    expect(getEnvironmentalResponse('TILT_SENSOR').stimulus).toBe('TILT')
  })
})

// ---------------------------------------------------------------------------
// IR-18 à IR-22 : INFRARED -> infraredDetected (passage direct, identité)
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-18 à IR-22 : INFRARED -> infraredDetected (passage direct, identité)', () => {
  it('IR-18 — sans stimulus actif : fallback canonique infraredDetected=0', () => {
    const defaults = getSimulationDefaultParameters('IR_RECEIVER')
    expect(defaults).toEqual({ infraredDetected: 0 })
  })
  it('IR-19 — INFRARED=0 -> infraredDetected=0', () => {
    const [effective] = applyEnvironmentalStimuli([ir('i1', { infraredDetected: 0 })], { INFRARED: 0 })
    expect(effective.parameters.infraredDetected).toBe(0)
  })
  it('IR-20 — INFRARED=1 -> infraredDetected=1', () => {
    const [effective] = applyEnvironmentalStimuli([ir('i1', { infraredDetected: 0 })], { INFRARED: 1 })
    expect(effective.parameters.infraredDetected).toBe(1)
  })

  it('IR-21 — Document original non muté', () => {
    const originalParameters = { infraredDetected: 0 }
    const originalComponent = ir('i1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { INFRARED: 1 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ infraredDetected: 0 })
    expect(result[0]).not.toBe(originalComponent)
  })

  it('stimulus absent/invalide -> no-op strict, même référence de tableau', () => {
    const originalParameters = { infraredDetected: 0 }
    const originalComponent = ir('i1', originalParameters)
    const components = Object.freeze([originalComponent])
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [0.5, -1, 2, NaN, true, '1']) {
      expect(applyEnvironmentalStimuli(components, { INFRARED: invalid })).toBe(components)
    }
  })

  it('IR-22 — aucun calcul électrique dans environmentalResponseRegistry (produit uniquement infraredDetected, identité pure)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/environmentalResponseRegistry.js'), 'utf-8')
    const fnMatch = src.match(/function irReceiverInfraredResponse\(stimuli\) \{[\s\S]*?\n\}/)
    expect(fnMatch).toBeTruthy()
    const fnBody = fnMatch[0]
    expect(fnBody).not.toMatch(/Signal\./)
    expect(fnBody).not.toMatch(/HIGH|LOW/)
  })
})

// ---------------------------------------------------------------------------
// IR-23 à IR-31 : SIGNAL — contrat active-low, garde VCC/GND, propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-23/IR-24 : SIGNAL — contrat verrouillé ACTIVE-LOW', () => {
  const contribute = getDigitalContribution('IR_RECEIVER')
  const powered = { SIGNAL: Signal.UNKNOWN, GND: Signal.LOW, VCC: Signal.HIGH }

  it('IR-23 — infraredDetected=0 -> SIGNAL HIGH (aucun signal IR détecté)', () => {
    const out = contribute({ component: ir('i1'), pins: [], params: { infraredDetected: 0 }, pinSignals: powered })
    expect(out.get('SIGNAL')).toBe(Signal.HIGH)
  })

  it('IR-24 — infraredDetected=1 -> SIGNAL LOW (signal IR détecté, active-low)', () => {
    const out = contribute({ component: ir('i1'), pins: [], params: { infraredDetected: 1 }, pinSignals: powered })
    expect(out.get('SIGNAL')).toBe(Signal.LOW)
  })
})

describe('A7-C4-IR — IR-25 à IR-27 : SIGNAL absent (aucune contribution) lorsque non alimenté, inversé ou conflit de source', () => {
  const contribute = getDigitalContribution('IR_RECEIVER')
  const params = { infraredDetected: 1 }

  it('IR-25 — VCC absent/flottant (UNKNOWN) -> contribution retourne null', () => {
    const out = contribute({ component: ir('i1'), pins: [], params, pinSignals: { SIGNAL: Signal.UNKNOWN, GND: Signal.LOW, VCC: Signal.UNKNOWN } })
    expect(out).toBeNull()
  })

  it('IR-26 — GND absent/flottant (UNKNOWN) -> contribution retourne null', () => {
    const out = contribute({ component: ir('i1'), pins: [], params, pinSignals: { SIGNAL: Signal.UNKNOWN, GND: Signal.UNKNOWN, VCC: Signal.HIGH } })
    expect(out).toBeNull()
  })

  it('IR-27 — polarité inversée (VCC=LOW, GND=HIGH) -> contribution retourne null', () => {
    const out = contribute({ component: ir('i1'), pins: [], params, pinSignals: { SIGNAL: Signal.UNKNOWN, GND: Signal.HIGH, VCC: Signal.LOW } })
    expect(out).toBeNull()
  })

  it('circuit réel déconnecté/inversé résout SIGNAL = UNKNOWN (jamais HIGH/LOW)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'i1', type: 'IR_RECEIVER', x: 10, y: 0, parameters: { infraredDetected: 1 } }
    const reversedWires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'i1', toPin: 'GND' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'i1', toPin: 'VCC' },
    ]
    const result = runSimulationWithRuntime([power, sensor], reversedWires)
    expect(result.get('i1:SIGNAL')).toBe(Signal.UNKNOWN)
  })

  it('conflit de source (via resolveSignals réel) : jamais powered, SIGNAL absent du contexte alimenté', () => {
    const power1 = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const power2 = { uid: 'power2', type: 'POWER', x: 10, y: 0 }
    const sensor = { uid: 'i1', type: 'IR_RECEIVER', x: 20, y: 0, parameters: { infraredDetected: 1 } }
    const components = [power1, power2, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'power2', toPin: 'GND' },
      { fromUid: 'power1', fromPin: '5V', toUid: 'i1', toPin: 'VCC' },
    ]
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get('i1:VCC')).toBe(Signal.UNKNOWN)
    const result = runSimulationWithRuntime(components, wires)
    expect(result.get('i1:SIGNAL')).toBe(Signal.UNKNOWN)
  })
})

describe('A7-C4-IR — IR-28/IR-29 : le contributeur ne relit jamais environmentalStimuli, aucune seconde résolution', () => {
  it('IR-28 — la fonction de contribution ne référence jamais environmentalStimuli, ni ne recalcule INFRARED', () => {
    const contribute = getDigitalContribution('IR_RECEIVER')
    expect(contribute.length).toBeLessThanOrEqual(1)
    const src = contribute.toString()
    expect(src).not.toMatch(/environmentalStimuli/)
    expect(src).not.toMatch(/INFRARED/)
  })

  it('IR-29 — un seul appel resolveSignals() dans la composition : aucune régression de l\'invariant PREQ2 (simulationRuntimeIntegration.js/resolution.js non modifiés par ce ticket)', () => {
    const files = ['../simulator/resolution.js', '../simulator/simulationRuntimeIntegration.js']
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/IR_RECEIVER/)
      expect(src, rel).not.toMatch(/\bINFRARED\b/)
    }
  })
})

describe('A7-C4-IR — IR-30/IR-31 : aucune branche IR_RECEIVER dans resolution.js/simulationRuntimeIntegration.js', () => {
  it('IR-30 — resolution.js ne contient pas le littéral "IR_RECEIVER"', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/resolution.js'), 'utf-8')
    expect(src).not.toMatch(/IR_RECEIVER/)
  })
  it('IR-31 — simulationRuntimeIntegration.js ne contient pas le littéral "IR_RECEIVER"', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/simulationRuntimeIntegration.js'), 'utf-8')
    expect(src).not.toMatch(/IR_RECEIVER/)
  })
})

// ---------------------------------------------------------------------------
// IR-24 (test d'intégration réelle, §24 du ticket) : propagation réelle
// ---------------------------------------------------------------------------
describe('A7-C4-IR — §24 : test d\'intégration réelle — pipeline de production, aucun appel direct de fonction Registry uniquement', () => {
  it('INFRARED=0 -> propagation SIGNAL HIGH jusqu\'à une LED réelle (chemin de production, aucune fixture)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'i1', type: 'IR_RECEIVER', x: 10, y: 0, parameters: { infraredDetected: 1 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'i1', toPin: 'VCC' },
      { fromUid: 'i1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 'i1', fromPin: 'SIGNAL', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    const result = runSimulationWithRuntime(components, wires, { environmentalStimuli: { INFRARED: 0 } })
    expect(result.get('i1:SIGNAL')).toBe(Signal.HIGH)
    expect(result.get('led1:anode')).toBe(Signal.HIGH)
    expect(result.get('led1:cathode')).toBe(Signal.LOW)
  })

  it('INFRARED=1 -> propagation SIGNAL LOW (active-low), la LED reste éteinte (chemin de production, aucune fixture)', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'i1', type: 'IR_RECEIVER', x: 10, y: 0, parameters: { infraredDetected: 0 } }
    const led = { uid: 'led1', type: 'LED', x: 20, y: 0 }
    const components = [power, sensor, led]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'i1', toPin: 'VCC' },
      { fromUid: 'i1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
      { fromUid: 'i1', fromPin: 'SIGNAL', toUid: 'led1', toPin: 'anode' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'led1', toPin: 'cathode' },
    ]
    const result = runSimulationWithRuntime(components, wires, { environmentalStimuli: { INFRARED: 1 } })
    expect(result.get('i1:SIGNAL')).toBe(Signal.LOW)
    expect(result.get('led1:anode')).toBe(Signal.LOW)
  })

  it('aucun ARDUINO, aucun orchestrator créé — résout SIGNAL avec zéro Scheduler', () => {
    const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
    const sensor = { uid: 'i1', type: 'IR_RECEIVER', x: 10, y: 0, parameters: { infraredDetected: 0 } }
    const components = [power, sensor]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'i1', toPin: 'VCC' },
      { fromUid: 'i1', fromPin: 'GND', toUid: 'power1', toPin: 'GND' },
    ]
    const orchestrators = new Map()
    const result = runSimulationWithRuntime(components, wires, { orchestrators, dt: 100 })
    expect(result.get('i1:SIGNAL')).toBe(Signal.HIGH)
    expect(orchestrators.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// IR-32 à IR-41 : PhysicalContacts, pitch, résolveurs breadboard réels
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-32 à IR-36 : PhysicalContacts SIGNAL(24,108)/GND(36,108)/VCC(48,108), câblables, enfichables, pitch', () => {
  const def = getComponentDef('IR_RECEIVER')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('IR-32 — exactement 3 PhysicalContacts, aux coordonnées fonctionnelles verrouillées', () => {
    expect(def.pins).toHaveLength(3)
    expect(resolveContacts(byPin.SIGNAL)[0]).toMatchObject({ id: 'SIGNAL', dx: 24, dy: 108 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 36, dy: 108 })
    expect(resolveContacts(byPin.VCC)[0]).toMatchObject({ id: 'VCC', dx: 48, dy: 108 })
  })

  it('IR-33 — les 3 contacts sont wireConnectable', () => {
    for (const id of ['SIGNAL', 'GND', 'VCC']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('IR-34 — les 3 contacts sont breadboardInsertable', () => {
    for (const id of ['SIGNAL', 'GND', 'VCC']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('IR-35/IR-36 — entraxe horizontal = 12 = 1×BREADBOARD_PITCH exact entre CHAQUE paire adjacente, même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [sig, gnd, vcc] = ['SIGNAL', 'GND', 'VCC'].map((id) => resolveContacts(byPin[id])[0])
    expect(gnd.dx - sig.dx).toBe(12)
    expect(vcc.dx - gnd.dx).toBe(12)
    expect(gnd.dy).toBe(sig.dy)
    expect(vcc.dy).toBe(sig.dy)
  })
})

describe('A7-C4-IR — IR-37 à IR-41 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('IR_RECEIVER')
  // dx (24/36/48) sont déjà des multiples exacts de 12 (2×12/3×12/4×12),
  // donc ox=0 suffit. dy=108 ≡ 0 mod 12 ; oy=0 place le point sur la rangée 9
  // (108/12), le PREMIER rang valide de la bande inférieure (rangées 3-7
  // bande haute, 8 = rainure centrale rejetée par holeAt(), 9-13 bande
  // basse) — même patron que PIR_MOTION_SENSOR.
  const origin = { x: 0, y: 0 }

  it('IR-37 — resolveComponentContactHoles retourne toujours 3 trous DISTINCTS', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(3)
    expect(allResolved).toBe(true)
    const [sigR, gndR, vccR] = results
    for (const r of [sigR, gndR, vccR]) expect(r.hole).not.toBeNull()
    const rows = new Set([sigR.hole.row, gndR.hole.row, vccR.hole.row])
    expect(rows.size).toBe(1)
    const columns = [sigR.hole.column, gndR.hole.column, vccR.hole.column]
    expect(new Set(columns).size).toBe(3)
    expect(columns).toEqual([columns[0], columns[0] + 1, columns[0] + 2])
    expect(sigR.hole).toEqual(holeAt(breadboard, origin.x + 24, origin.y + 108))
    expect(gndR.hole).toEqual(holeAt(breadboard, origin.x + 36, origin.y + 108))
    expect(vccR.hole).toEqual(holeAt(breadboard, origin.x + 48, origin.y + 108))
  })

  it('IR-38 — computeBreadboardPlacement (adapter réel) : composant compatible, 3 trous distincts, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'IR_RECEIVER', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(3)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(3)
    expect(result.valid).toBe(true)
  })

  it('IR-41 — AssemblyProfile : through-hole, 3 leads, racines mesurées par pixel-probe réel', () => {
    const profile = getAssemblyProfile('IR_RECEIVER')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['GND', 'SIGNAL', 'VCC'])
    // Racines mesurées : centroïdes alpha-pondérés sur le segment vertical
    // stable de chaque patte (y∈[58,111]), au-dessus de la ligne de
    // transition corps→pattes (y=52, première ligne de scission mesurée) :
    // SIGNAL (23.68,82.83)->(24,52), GND (35.07,82.65)->(35,52), VCC
    // (47.03,82.89)->(47,52).
    expect(profile.leads.SIGNAL.root).toEqual({ dx: 24, dy: 52 })
    expect(profile.leads.GND.root).toEqual({ dx: 35, dy: 52 })
    expect(profile.leads.VCC.root).toEqual({ dx: 47, dy: 52 })
    for (const id of ['SIGNAL', 'GND', 'VCC']) {
      expect(profile.leads[id].style).toBe('metallic-wire')
      const contact = resolveContacts(byPinOf(def, id))[0]
      // Sens racine->trou correct (leçon A7-C4-TILT-R1) : root TOUJOURS
      // strictement au-dessus du PhysicalContact.
      expect(profile.leads[id].root.dy).toBeLessThan(contact.dy)
    }
    expect(profile.bodyClip).toEqual({ bottom: 68 })
  })

  it('IR-39/IR-40 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted" à une origine valide, avec 3 pattes (target = PhysicalContact exact)', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'IR_RECEIVER', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(3)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['SIGNAL', 'GND', 'VCC']))
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.SIGNAL.target).toEqual({ x: origin.x + 24, y: origin.y + 108 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 36, y: origin.y + 108 })
    expect(byPinId.VCC.target).toEqual({ x: origin.x + 48, y: origin.y + 108 })
  })
})

// ---------------------------------------------------------------------------
// IR-42 : test anti-débordement — BLOCKING GATE
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-42 : gate anti-débordement structurel (BLOCKING)', () => {
  const def = getComponentDef('IR_RECEIVER')
  const profile = getAssemblyProfile('IR_RECEIVER')

  it('bodyClip existe (le probe montre que le raster continue sous les racines, nécessite un clip)', () => {
    expect(profile.bodyClip).toBeTruthy()
    expect(typeof profile.bodyClip.bottom).toBe('number')
  })

  it('clip boundary cohérente avec les 3 racines : canonical height 120 - bodyClip.bottom === root.dy pour chaque lead', () => {
    const clipLine = 120 - profile.bodyClip.bottom
    for (const id of ['SIGNAL', 'GND', 'VCC']) {
      expect(clipLine).toBe(profile.leads[id].root.dy)
    }
  })

  it('les AssemblyLeads partent des racines mesurées et terminent aux PhysicalContacts exacts', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'IR_RECEIVER', x: 0, y: 0 }, null)
    expect(g.contacts).toHaveLength(3)
    for (const c of g.contacts) {
      const leadProfile = profile.leads[c.pinId]
      expect(c.root).toEqual({ x: leadProfile.root.dx, y: leadProfile.root.dy })
      const contact = resolveContacts(byPinOf(def, c.pinId))[0]
      expect(c.target).toEqual({ x: contact.dx, y: contact.dy })
    }
  })

  it('aucune target n\'est sous (>) le PhysicalContact — les pattes fonctionnelles ne prolongent pas artificiellement leur extrémité après le trou', () => {
    for (const id of ['SIGNAL', 'GND', 'VCC']) {
      const contact = resolveContacts(byPinOf(def, id))[0]
      // target === PhysicalContact par construction (assemblyGeometry.js) :
      // aucune extension au-delà n'est possible structurellement.
      expect(contact.dy).toBe(108)
    }
  })

  it('la zone clippée (sous la racine) couvre bien l\'extrémité opaque réelle mesurée du raster (y=112/113, cf. pixel-probe) : rien de la patte cuite ne reste visible au-delà du trou', () => {
    const clipLine = 120 - profile.bodyClip.bottom
    const MEASURED_LEG_LAST_FULLY_OPAQUE_Y = 112
    expect(clipLine).toBeLessThan(MEASURED_LEG_LAST_FULLY_OPAQUE_Y)
  })

  it('le corps (dôme du TSOP4838) n\'est pas tronqué par le clip : la ligne de clip (52) tombe APRÈS la fin mesurée du corps plein (y=51)', () => {
    const clipLine = 120 - profile.bodyClip.bottom
    const MEASURED_BODY_LAST_SOLID_ROW = 51
    expect(clipLine).toBeGreaterThan(MEASURED_BODY_LAST_SOLID_ROW)
  })
})

// ---------------------------------------------------------------------------
// IR-43 à IR-49 : assets réels sur disque, byte-for-byte, manifest cohérent
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IR-43 à IR-49 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder Pass)', () => {
  it('IR-43/IR-44/IR-45/IR-46 — les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['ir-receiver.default.1x.png', 'ir-receiver.default.1x.webp', 'ir-receiver.default.3x.png', 'ir-receiver.default.3x.webp']) {
      expect(existsSync(resolve(IR_DIR, f)), f).toBe(true)
    }
  })

  it('IR-47 — dimensions réelles des PNG livrés : 1x = 72×120, 3x = 216×360 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(IR_DIR, 'ir-receiver.default.1x.png')))
    const three = pngDims(readFileSync(resolve(IR_DIR, 'ir-receiver.default.3x.png')))
    expect([one.w, one.h]).toEqual([72, 120])
    expect([three.w, three.h]).toEqual([216, 360])
    expect(one.colorType).toBe(6)
    expect(three.colorType).toBe(6)
  })

  it('manifest.json cohérent avec componentDefinitions.js (dimensions, backend, state, ordre des pins visibles)', () => {
    const m = JSON.parse(readFileSync(resolve(IR_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('IR_RECEIVER')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([72, 120])
    expect(m.canonical.connections).toBe(3)
    expect(m.visiblePinOrder).toEqual(['SIGNAL', 'GND', 'VCC'])
  })

  it('IR-48 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(IR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(IR_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('IR-49 — manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(IR_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(IR_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

// ---------------------------------------------------------------------------
// Modèle exécutable (validation)
// ---------------------------------------------------------------------------
describe('A7-C4-IR — IrReceiverModel : validation BINAIRE stricte {0,1}', () => {
  it('valeurs par défaut valides', () => {
    const defaults = getSimulationDefaultParameters('IR_RECEIVER')
    expect(defaults).toEqual({ infraredDetected: 0 })
    expect(IrReceiverModel.type).toBe('IR_RECEIVER')
    expect(IrReceiverModel.validate(defaults)).toBe(true)
  })

  it('rejette toute valeur hors {0,1} (intermédiaire, hors-borne, NaN, ou paramètre manquant)', () => {
    expect(IrReceiverModel.validate({ infraredDetected: 0 })).toBe(true)
    expect(IrReceiverModel.validate({ infraredDetected: 1 })).toBe(true)
    expect(IrReceiverModel.validate({ infraredDetected: 0.5 })).toBe(false)
    expect(IrReceiverModel.validate({ infraredDetected: -1 })).toBe(false)
    expect(IrReceiverModel.validate({ infraredDetected: 2 })).toBe(false)
    expect(IrReceiverModel.validate({ infraredDetected: NaN })).toBe(false)
    expect(IrReceiverModel.validate({})).toBe(false)
    expect(IrReceiverModel.validate(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Mécanismes génériques
// ---------------------------------------------------------------------------
describe('A7-C4-IR — createComponent / round-trip générique, aucun code spécifique', () => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent('IR_RECEIVER', 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe('IR_RECEIVER')
    expect(created.pins.map((p) => p.id)).toEqual(['SIGNAL', 'GND', 'VCC'])
    expect(created.uid).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// §28/§29 : aucune branche IR_RECEIVER dans les couches génériques, protected files
// ---------------------------------------------------------------------------
describe('A7-C4-IR — §28/§29 : aucune branche IR_RECEIVER dans les couches génériques, fichiers protégés intacts', () => {
  it('le littéral "IR_RECEIVER" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
      '../simulator/simulationRuntimeIntegration.js',
      '../simulator/preparation.js',
      '../simulator/engine.js',
      '../simulator/dcContributionRegistry.js',
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
      expect(src, rel).not.toMatch(/IR_RECEIVER/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']IR_RECEIVER["']/)
    }
  })
})

describe('A7-C4-IR — non-régression des autres composants (PIR_MOTION_SENSOR, TILT_SENSOR, SOIL_MOISTURE_SENSOR)', () => {
  it('PIR_MOTION_SENSOR inchangé (pins, contribution digitale, réponse MOTION)', () => {
    expect(getComponentDef('PIR_MOTION_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'OUT', 'GND'])
    expect(hasDigitalContribution('PIR_MOTION_SENSOR')).toBe(true)
    expect(getEnvironmentalResponse('PIR_MOTION_SENSOR').stimulus).toBe('MOTION')
  })
  it('TILT_SENSOR inchangé (pins, contribution digitale, réponse TILT)', () => {
    expect(getComponentDef('TILT_SENSOR').pins.map((p) => p.id)).toEqual(['DO', 'GND'])
    expect(hasDigitalContribution('TILT_SENSOR')).toBe(true)
    expect(getEnvironmentalResponse('TILT_SENSOR').stimulus).toBe('TILT')
  })
  it('SOIL_MOISTURE_SENSOR inchangé (pins, contribution DC+digitale, réponse MOISTURE)', () => {
    expect(getComponentDef('SOIL_MOISTURE_SENSOR').pins.map((p) => p.id)).toEqual(['VCC', 'AO', 'DO', 'GND'])
    expect(hasDcContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(hasDigitalContribution('SOIL_MOISTURE_SENSOR')).toBe(true)
    expect(getEnvironmentalResponse('SOIL_MOISTURE_SENSOR').stimulus).toBe('MOISTURE')
  })
})
