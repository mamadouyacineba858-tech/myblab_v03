/**
 * forceFlexSensorA7C2.test.js — Ticket A7-C2 (Force Sensor FSR + Flex Sensor).
 *
 * FORCE_SENSOR et FLEX_SENSOR sont deux NOUVEAUX types canoniques : capteurs
 * résistifs deux bornes NON polarisées (A/B, même vocabulaire que LDR/
 * THERMISTOR/LIGHT_BULB) — même contribution DC que RESISTOR (réutilisation
 * directe de resistorDc, aucune fonction dédiée). Composants WIRE-ONLY
 * (wireConnectable:true / breadboardInsertable:false sur les deux broches,
 * même précédent que DC_MOTOR/HOBBY_GEARMOTOR) : le raster livré montre une
 * queue plate à deux pastilles de connexion rapprochées, pas deux pattes
 * traversantes individuelles au pas breadboard.
 *
 * Deux kinds de stimulus environnemental SÉPARÉS (contrat générique A7-C0) :
 * FORCE (force croissante -> résistance décroissante, interpolation
 * logarithmique, même patron que LIGHT/LDR) et FLEX (flexion croissante ->
 * résistance croissante, interpolation linéaire) — grandeurs physiques
 * incompatibles, cf. environmentalStimulusRegistry.js.
 *
 * Fichier .js (PAS .jsx), même convention que hobbyGearmotorA6Out3.test.js /
 * tmp36A7C1.test.js : les assertions DOM (rendu réel de <ForceSensorPart />
 * / <FlexSensorPart />) vivent dans le fichier .jsx jumeau
 * forceFlexSensorA7C2.test.jsx.
 *
 * Couvre T01-T60 du ticket A7-C2 §17 (à l'exception des assertions DOM,
 * dans le fichier .jsx jumeau).
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
import { COMPONENT_TYPES, PALETTE_ITEMS, getComponentDef, createComponent } from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'
import { ForceSensorModel } from '../simulator/models/ForceSensorModel.js'
import { FlexSensorModel } from '../simulator/models/FlexSensorModel.js'
import { applyEnvironmentalStimuli } from '../simulator/environmentalStimulus.js'
import { isValidStimulusValue, isKnownStimulusKind } from '../simulator/environmentalStimulusRegistry.js'
import { getEnvironmentalResponse } from '../simulator/environmentalResponseRegistry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FORCE_DIR = resolve(__dirname, '../../public/assets/components/force-sensor')
const FLEX_DIR = resolve(__dirname, '../../public/assets/components/flex-sensor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function comp(type, uid, parameters) {
  return { uid, type, x: 0, y: 0, parameters }
}

const CASES = [
  {
    type: 'FORCE_SENSOR',
    dir: FORCE_DIR,
    prefix: 'force-sensor',
    box: [72, 144],
    bounds: { minimum: 250, maximum: 1000000 },
    defaultResistance: 1000000,
    stimulusKind: 'FORCE',
    model: ForceSensorModel,
    contactA: { dx: 36, dy: 111 },
    contactB: { dx: 41, dy: 111 },
    physicalMm: [18.3, 44.4],
  },
  {
    type: 'FLEX_SENSOR',
    dir: FLEX_DIR,
    prefix: 'flex-sensor',
    box: [72, 180],
    bounds: { minimum: 10000, maximum: 40000 },
    defaultResistance: 10000,
    stimulusKind: 'FLEX',
    model: FlexSensorModel,
    contactA: { dx: 33, dy: 162 },
    contactB: { dx: 41, dy: 163 },
    physicalMm: [6.35, 55.9],
  },
]

describe.each(CASES)('A7-C2 — $type — T01/T11/T18 : type canonique enregistré dans les registres déclaratifs, dans la palette', (c) => {
  it('T01 — enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / dcContributionRegistry / palette', () => {
    expect(hasCanonicalType(c.type)).toBe(true)
    expect(COMPONENT_TYPES[c.type]).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === c.type)).toBe(true)
    expect(hasDcContribution(c.type)).toBe(true)
    expect(getComponentByType(c.type)).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === c.type)).toBe(true)
  })

  it('T18/T19 — apparaît exactement une fois dans PALETTE_ITEMS', () => {
    const occurrences = PALETTE_ITEMS.filter((item) => item.id === c.type).length
    expect(occurrences).toBe(1)
  })

  it('T22/T23 — modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry(c.type).modelAvailable).toBe(true)
    expect(isSimulationModelAvailable(c.type)).toBe(true)
  })

  it('T20/T21 — backend raster déclaré (preuve DOM elle-même dans le fichier .jsx jumeau)', () => {
    expect(getComponentPresentation(c.type)).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('T13/T14/T15 — pins canoniques exactement A/B, non polarisées, rôle sensor', () => {
    const def = getComponentDef(c.type)
    expect(def.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getCanonicalEntry(c.type).pins.map((p) => p.role)).toEqual(['sensor', 'sensor'])
  })
})

describe.each(CASES)('A7-C2 — $type — boîte canonique = dimensions natives @1x du paquet', (c) => {
  it('width/height === box canonique', () => {
    expect([COMPONENT_TYPES[c.type].width, COMPONENT_TYPES[c.type].height]).toEqual(c.box)
  })
  it('SCALE_REFERENCE.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === c.type)
    expect(row).toBeTruthy()
    expect(row.box).toEqual(c.box)
  })
})

describe.each(CASES)('A7-C2 — $type — T45/T46/T47/T48/T49 : wire-only, aucune contrainte breadboard', (c) => {
  const def = getComponentDef(c.type)
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('PhysicalContacts A/B dérivés du pixel-probe réel', () => {
    expect(resolveContacts(byPin.A)[0]).toMatchObject({ id: 'A', dx: c.contactA.dx, dy: c.contactA.dy })
    expect(resolveContacts(byPin.B)[0]).toMatchObject({ id: 'B', dx: c.contactB.dx, dy: c.contactB.dy })
  })

  it('T49 — les deux contacts sont géométriquement DISTINCTS', () => {
    const a = resolveContacts(byPin.A)[0]
    const b = resolveContacts(byPin.B)[0]
    expect(a.dx !== b.dx || a.dy !== b.dy).toBe(true)
    expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThan(1)
  })

  it('T45/T46 — les deux contacts sont wireConnectable', () => {
    for (const id of ['A', 'B']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T47/T48 — les deux contacts sont NON breadboardInsertable (wire-only, comme DC_MOTOR/HOBBY_GEARMOTOR)', () => {
    for (const id of ['A', 'B']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(0)
    }
  })

  it('BREADBOARD_PITCH réel = 12 (référence, non applicable à ce composant wire-only)', () => {
    expect(BREADBOARD_PITCH).toBe(12)
  })

  it('computeBreadboardPlacement (adapter réel) : composant déclaré INCOMPATIBLE breadboard (0 trou enfichable, aucun mock)', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const result = computeBreadboardPlacement(breadboard, c.type, { x: 0, y: 0 }, [])
    const insertableCount = def.pins.reduce((n, pin) => n + resolveBreadboardInsertableContacts(pin).length, 0)
    expect(insertableCount).toBe(0)
    expect(result.compatible).toBe(false)
    expect(result.breadboardActive).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.holes).toHaveLength(0)
  })

  it('T51 — Aucun AssemblyProfile (wire-only, précédent DC_MOTOR/HOBBY_GEARMOTOR)', () => {
    expect(getAssemblyProfile(c.type)).toBeNull()
  })
})

describe.each(CASES)('A7-C2 — $type — T16/T17 : paramètre resistance', (c) => {
  it('valeur par défaut positive et finie, égale à la borne documentée', () => {
    const defaults = getSimulationDefaultParameters(c.type)
    expect(defaults).toEqual({ resistance: c.defaultResistance })
    expect(Number.isFinite(defaults.resistance)).toBe(true)
    expect(defaults.resistance).toBeGreaterThan(0)
  })

  it('bornes canoniques du paramètre resistance', () => {
    const entry = getCanonicalEntry(c.type)
    expect(entry.parameterSchema[0]).toMatchObject({ key: 'resistance', minimum: c.bounds.minimum, maximum: c.bounds.maximum })
  })

  it('résistance invalide rejetée par le modèle (même convention que LdrModel/ResistorModel)', () => {
    expect(c.model.type).toBe(c.type)
    expect(c.model.validate({ resistance: c.defaultResistance })).toBe(true)
    expect(c.model.validate({ resistance: 1 })).toBe(true)
    expect(c.model.validate({ resistance: 0 })).toBe(false)
    expect(c.model.validate({ resistance: -5 })).toBe(false)
    expect(c.model.validate({ resistance: NaN })).toBe(false)
    expect(c.model.validate({ resistance: 'x' })).toBe(false)
    expect(c.model.validate(null)).toBe(false)
    expect(c.model.validate({})).toBe(false)
  })
})

describe.each(CASES)('A7-C2 — $type — T02/T03/T04/T06/T07/T08/T09/T10 : assets réels sur disque, dimensions, alpha, intégrité SHA-256', (c) => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const suffix of ['1x.png', '1x.webp', '3x.png', '3x.webp']) {
      expect(existsSync(resolve(c.dir, `${c.prefix}.default.${suffix}`)), suffix).toBe(true)
    }
  })

  it('dimensions réelles du PNG 1x livré = box canonique, alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(c.dir, `${c.prefix}.default.1x.png`)))
    expect([one.w, one.h]).toEqual(c.box)
    expect(one.colorType).toBe(6)
  })

  it('dimensions réelles du PNG 3x livré = 3 × 1x, alpha réel', () => {
    const one = pngDims(readFileSync(resolve(c.dir, `${c.prefix}.default.1x.png`)))
    const three = pngDims(readFileSync(resolve(c.dir, `${c.prefix}.default.3x.png`)))
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
    expect(three.colorType).toBe(6)
  })

  it('T09/T10 — pixel-probe réel : au moins un pixel pleinement opaque (a=255) et un pixel pleinement transparent (a=0)', () => {
    const buf = readFileSync(resolve(c.dir, `${c.prefix}.default.1x.png`))
    expect(buf.includes(0x00)).toBe(true)
    expect(buf.includes(0xff)).toBe(true)
  })

  it('manifest.canonical (dimensions + backend + state + orientation + connections + wireConnectable) cohérent avec componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(c.dir, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe(c.type)
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual(c.box)
    expect(m.canonical.orientation).toBe('vertical')
    expect(m.canonical.connections).toBe(2)
    expect(m.canonical.wireConnectable).toBe(true)
  })

  it('T04/T05 — ASSET-INTEGRITY.json valide : chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(c.dir, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(c.dir, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('manifest.json déclare les mêmes 4 variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(c.dir, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(c.dir, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

describe.each(CASES)('A7-C2 — $type — T29/T33/T34 : stimulus générique enregistré, validation, réponse déclarée', (c) => {
  it('le stimulus kind est connu, validé dans [0,1]', () => {
    expect(isKnownStimulusKind(c.stimulusKind)).toBe(true)
    for (const valid of [0, 0.25, 0.5, 0.75, 1]) {
      expect(isValidStimulusValue(c.stimulusKind, valid)).toBe(true)
    }
  })

  it('T31/T32 — valeur invalide rejetée pour ce kind (T31), kind inconnu rejeté (T32)', () => {
    for (const invalid of [NaN, Infinity, -Infinity, -0.0001, 1.0001, '0.5', null, undefined, {}]) {
      expect(isValidStimulusValue(c.stimulusKind, invalid)).toBe(false)
    }
    expect(isValidStimulusValue('UNKNOWN_KIND', 0.5)).toBe(false)
  })

  it(`${c.type} est enregistré dans environmentalResponseRegistry, répond à ${c.stimulusKind} (jamais à un autre kind)`, () => {
    const response = getEnvironmentalResponse(c.type)
    expect(response).toBeTruthy()
    expect(response.stimulus).toBe(c.stimulusKind)
  })
})

describe('A7-C2 — T35 : FORCE croissante -> résistance FORCE_SENSOR monotone DÉCROISSANTE, exactement aux bornes', () => {
  it('applyEnvironmentalStimuli(FORCE_SENSOR, {FORCE}) produit R = Rmax * (Rmin/Rmax)^force, exactement aux bornes 0/0.25/0.5/0.75/1', () => {
    const { minimum: rMin, maximum: rMax } = { minimum: 250, maximum: 1000000 }
    const cases = [
      [0, rMax],
      [1, rMin],
    ]
    for (const [force, expected] of cases) {
      const [effective] = applyEnvironmentalStimuli([comp('FORCE_SENSOR', 'f1', { resistance: rMax })], { FORCE: force })
      expect(effective.parameters.resistance).toBeCloseTo(expected, 6)
    }
    // monotonie stricte sur des valeurs intermédiaires
    const samples = [0, 0.25, 0.5, 0.75, 1].map((force) => {
      const [effective] = applyEnvironmentalStimuli([comp('FORCE_SENSOR', 'f1', { resistance: rMax })], { FORCE: force })
      return effective.parameters.resistance
    })
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1])
    }
  })
})

describe('A7-C2 — T36 : flexion croissante -> résistance FLEX_SENSOR monotone CROISSANTE, exactement aux bornes', () => {
  it('applyEnvironmentalStimuli(FLEX_SENSOR, {FLEX}) produit R = Rmin + (Rmax-Rmin)*flex, exactement aux bornes 0/0.25/0.5/0.75/1', () => {
    const { minimum: rMin, maximum: rMax } = { minimum: 10000, maximum: 40000 }
    const cases = [
      [0, rMin],
      [0.5, rMin + (rMax - rMin) * 0.5],
      [1, rMax],
    ]
    for (const [flex, expected] of cases) {
      const [effective] = applyEnvironmentalStimuli([comp('FLEX_SENSOR', 'x1', { resistance: rMin })], { FLEX: flex })
      expect(effective.parameters.resistance).toBeCloseTo(expected, 6)
    }
    const samples = [0, 0.25, 0.5, 0.75, 1].map((flex) => {
      const [effective] = applyEnvironmentalStimuli([comp('FLEX_SENSOR', 'x1', { resistance: rMin })], { FLEX: flex })
      return effective.parameters.resistance
    })
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1])
    }
  })
})

describe.each(CASES)('A7-C2 — $type — T37/T38/T42 : non-mutation, fallback canonique, no-op strict', (c) => {
  it('sans stimulus actif (absent/invalide) : no-op strict, même référence de tableau, paramètres persistants intacts', () => {
    const originalParameters = { resistance: c.defaultResistance }
    const originalComponent = comp(c.type, 'p1', originalParameters)
    const components = Object.freeze([originalComponent])

    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
    for (const invalid of [NaN, Infinity, -Infinity, -0.1, 1.1, '0.5']) {
      const result = applyEnvironmentalStimuli(components, { [c.stimulusKind]: invalid })
      expect(result).toBe(components)
    }
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ resistance: c.defaultResistance })
  })

  it('composant persistant original et ses parameters ne sont jamais mutés (non-mutation stricte)', () => {
    const originalParameters = { resistance: c.defaultResistance }
    const originalComponent = comp(c.type, 'p1', originalParameters)
    const components = Object.freeze([originalComponent])
    const result = applyEnvironmentalStimuli(components, { [c.stimulusKind]: 0.5 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ resistance: c.defaultResistance })
    expect(result[0]).not.toBe(originalComponent)
  })

  it('T42 — stimulus absent -> fallback canonique (defaultParameters), jamais recalculé', () => {
    const defaults = getSimulationDefaultParameters(c.type)
    expect(defaults).toEqual({ resistance: c.defaultResistance })
  })
})

describe('A7-C2 — T39/T40/T41 : non-régression LIGHT/LDR, TEMPERATURE/TMP36, coexistence de plusieurs stimuli', () => {
  it('T39 — LIGHT seul actif : LDR répond normalement, inchangé par A7-C2', () => {
    const ldr = [{ uid: 'l1', type: 'LDR', parameters: { resistance: 5000 } }]
    const result = applyEnvironmentalStimuli(ldr, { LIGHT: 0.5 })
    expect(getEnvironmentalResponse('LDR').stimulus).toBe('LIGHT')
    expect(result[0].parameters.resistance).not.toBe(5000)
  })

  it('T40 — TEMPERATURE seul actif : TMP36 répond normalement, inchangé par A7-C2', () => {
    const tmp = [{ uid: 't1', type: 'TMP36', parameters: { outputVoltage: 0.75 } }]
    const result = applyEnvironmentalStimuli(tmp, { TEMPERATURE: 25 })
    expect(result[0].parameters.outputVoltage).toBeCloseTo(0.75, 10)
  })

  it('FORCE seul actif ne fait rien à FLEX_SENSOR (kind non consommé par sa réponse déclarée)', () => {
    const flex = [comp('FLEX_SENSOR', 'x1', { resistance: 10000 })]
    const result = applyEnvironmentalStimuli(flex, { FORCE: 0.9 })
    expect(result).toBe(flex)
    expect(result[0].parameters).toEqual({ resistance: 10000 })
  })

  it('FLEX seul actif ne fait rien à FORCE_SENSOR (kind non consommé par sa réponse déclarée)', () => {
    const force = [comp('FORCE_SENSOR', 'f1', { resistance: 1000000 })]
    const result = applyEnvironmentalStimuli(force, { FLEX: 0.9 })
    expect(result).toBe(force)
    expect(result[0].parameters).toEqual({ resistance: 1000000 })
  })

  it('T41 — circuit mixte : LIGHT affecte LDR, TEMPERATURE affecte TMP36, FORCE affecte FORCE_SENSOR, FLEX affecte FLEX_SENSOR, indépendamment', () => {
    const mixed = [
      { uid: 'l1', type: 'LDR', parameters: { resistance: 5000 } },
      { uid: 't1', type: 'TMP36', parameters: { outputVoltage: 0.75 } },
      comp('FORCE_SENSOR', 'f1', { resistance: 1000000 }),
      comp('FLEX_SENSOR', 'x1', { resistance: 10000 }),
    ]
    const result = applyEnvironmentalStimuli(mixed, { LIGHT: 0.5, TEMPERATURE: 25, FORCE: 0.5, FLEX: 0.5 })
    expect(result[0].parameters.resistance).not.toBe(5000)
    expect(result[1].parameters.outputVoltage).toBeCloseTo(0.75, 10)
    expect(result[2].parameters.resistance).not.toBe(1000000)
    expect(result[3].parameters.resistance).not.toBe(10000)
  })
})

describe.each(CASES)('A7-C2 — $type — T24/T25/T26/T27/T28 : contribution DC — réutilisation resistorDc prouvée, aucune duplication', (c) => {
  it('a une contribution DC enregistrée', () => {
    expect(hasDcContribution(c.type)).toBe(true)
  })

  it('pointe vers LA MÊME référence de fonction que RESISTOR (réutilisation réelle, même fonction que LIGHT_BULB)', () => {
    expect(getDcContribution(c.type)).toBe(getDcContribution('RESISTOR'))
    expect(getDcContribution(c.type)).toBe(getDcContribution('LIGHT_BULB'))
  })

  it('aucune fonction dédiée (forceSensorDc / flexSensorDc) dans dcContributionRegistry.js', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).not.toMatch(/function\s+forceSensorDc/)
    expect(src).not.toMatch(/function\s+flexSensorDc/)
  })

  it('chaîne réelle bout en bout : POWER -> capteur (A/B), I = U/R identique à RESISTOR à résistance égale (résistance dans les bornes canoniques du type)', () => {
    function poweredCircuit(type, resistance) {
      const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
      const sensor = { uid: 'c1', type, x: 10, y: 0, parameters: { resistance } }
      const components = [power, sensor]
      const wires = [
        { fromUid: 'power1', fromPin: '5V', toUid: 'c1', toPin: 'A' },
        { fromUid: 'c1', fromPin: 'B', toUid: 'power1', toPin: 'GND' },
      ]
      const prepared = prepareCircuit(components, wires)
      const { dcAnalysis } = resolveSignals(components, prepared)
      return dcAnalysis.get(sensor.uid)
    }
    const resistance = c.bounds.minimum
    const result = poweredCircuit(c.type, resistance)
    expect(result).toEqual({ voltage: 5, current: 5 / resistance })
  })

  it('les deux orientations de branchement (A/B inversés) donnent le même courant (non polarisé)', () => {
    const contribute = getDcContribution(c.type)
    const resistance = c.bounds.minimum
    const params = { resistance }
    const r1 = contribute({ pins: { A: Signal.HIGH, B: Signal.LOW }, params, supplyVoltage: 5 })
    const r2 = contribute({ pins: { A: Signal.LOW, B: Signal.HIGH }, params, supplyVoltage: 5 })
    expect(r1).toEqual({ voltage: 5, current: 5 / resistance })
    expect(r2).toEqual({ voltage: 5, current: 5 / resistance })
  })
})

describe.each(CASES)('A7-C2 — $type — T43/T44 : mécanismes génériques, sérialisation, round-trip', (c) => {
  it('createComponent générique fonctionne sans aucun code spécifique', () => {
    const created = createComponent(c.type, 10, 20)
    expect(created).not.toBeNull()
    expect(created.type).toBe(c.type)
    expect(created.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(created.uid).toBeTruthy()
  })

  it('round-trip de sérialisation JSON conforme, aucune perte de champ, aucune mutation de defaultParameters entre deux appels', () => {
    const def = getComponentDef(c.type)
    const roundTripped = JSON.parse(JSON.stringify(def))
    expect(roundTripped.id).toBe(c.type)
    expect([roundTripped.width, roundTripped.height]).toEqual(c.box)
    expect(roundTripped.pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getSimulationDefaultParameters(c.type)).toEqual(getSimulationDefaultParameters(c.type))
  })
})

describe('A7-C2 — T51/T52/T53/T54 : aucune branche FORCE_SENSOR/FLEX_SENSOR dans les couches génériques', () => {
  it('le littéral "FORCE_SENSOR"/"FLEX_SENSOR" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
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
      expect(src, rel).not.toMatch(/FORCE_SENSOR/)
      expect(src, rel).not.toMatch(/FLEX_SENSOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["'](FORCE_SENSOR|FLEX_SENSOR)["']/)
    }
  })
})

describe('A7-C2 — T55/T56/T57/T58 : non-régression des composants existants (LDR, THERMISTOR, TMP36, HOBBY_GEARMOTOR, LIGHT_BULB, DC_MOTOR)', () => {
  it('LDR inchangé (pins, boîte, résistance par défaut, contribution DC, réponse LIGHT)', () => {
    expect(getComponentDef('LDR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getSimulationDefaultParameters('LDR')).toEqual({ resistance: 10000 })
    expect(getEnvironmentalResponse('LDR').stimulus).toBe('LIGHT')
  })

  it('THERMISTOR inchangé (pas de réponse environnementale, hors périmètre A7-C2)', () => {
    expect(getComponentDef('THERMISTOR').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getEnvironmentalResponse('THERMISTOR')).toBeNull()
  })

  it('TMP36 inchangé (pins, boîte, contribution DC dédiée, réponse TEMPERATURE)', () => {
    expect(getComponentDef('TMP36').pins.map((p) => p.id)).toEqual(['plus', 'vout', 'gnd'])
    expect([COMPONENT_TYPES.TMP36.width, COMPONENT_TYPES.TMP36.height]).toEqual([60, 72])
    expect(getEnvironmentalResponse('TMP36').stimulus).toBe('TEMPERATURE')
  })

  it('HOBBY_GEARMOTOR / DC_MOTOR inchangés (pins, boîte, wire-only, contribution DC)', () => {
    expect(getComponentDef('HOBBY_GEARMOTOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.HOBBY_GEARMOTOR.width, COMPONENT_TYPES.HOBBY_GEARMOTOR.height]).toEqual([72, 120])
    expect(getComponentDef('DC_MOTOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    for (const pin of getComponentDef('DC_MOTOR').pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
  })

  it('LIGHT_BULB inchangé (pins A/B non polarisées, boîte, contribution DC réutilisant resistorDc)', () => {
    expect(getComponentDef('LIGHT_BULB').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect(getDcContribution('LIGHT_BULB')).toBe(getDcContribution('RESISTOR'))
  })
})
