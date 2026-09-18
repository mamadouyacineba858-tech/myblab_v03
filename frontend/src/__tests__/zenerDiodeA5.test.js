/**
 * zenerDiodeA5.test.js — Ticket A5-ZENER_DIODE (Realistic Zener Diode +
 * Reverse Breakdown + Breadboard Physical Fit).
 *
 * ZENER_DIODE est un NOUVEAU type canonique : deux pins POLARISÉES A/K
 * (A=anode/input, K=cathode/output — ids imposés par le pack Founder PASS,
 * PAS `anode`/`cathode` comme DIODE). Réutilise EXCLUSIVEMENT la famille
 * physique diode générique (A5-D-PREQ, createDiodeDcContribution avec
 * reverseBreakdown activé) — aucune physique dupliquée, aucun nouveau
 * Registry, aucune branche `type === "ZENER_DIODE"` dans un moteur
 * générique.
 *
 * Couvre T1-T70 du ticket §17-§23 (asset FOUNDER PASS FROZEN, canonical,
 * architecture, visual, physical-fit breadboard, Instance Properties).
 * Les tests DC unitaires détaillés (T24-T35) vivent dans
 * simulator/__tests__/dcContributionRegistry.test.js (describe
 * "ZENER_DIODE (A5-ZENER_DIODE, production)") ; ce fichier les complète par
 * une preuve d'intégration bout en bout (runSimulationStep réel).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { getCanonicalEntry, hasCanonicalType } from '../simulator/canonicalRegistry.js'
import { getDcContribution, hasDcContribution, createDiodeDcContribution } from '../simulator/dcContributionRegistry.js'
import { hasTransientContribution } from '../simulator/transientContributionRegistry.js'
import { runSimulationStep } from '../simulator/simulationRuntimeIntegration.js'
import { resolveComponentParameters, validateComponentParameters } from '../simulator/resolveComponentParameters.js'
import { getSimulationDefaultParameters, isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
import { ZenerDiodeModel } from '../simulator/models/ZenerDiodeModel.js'
import { DiodeModel } from '../simulator/models/DiodeModel.js'
import { Signal } from '../simulator/signals.js'
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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ZENER_DIR = resolve(__dirname, '../../public/assets/components/zener-diode')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + colorType. */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// T1-T11 : Asset (Founder PASS FROZEN)
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — T1-T11 : assets réellement présents sur disque, dimensions réelles, byte-for-byte (Founder PASS)', () => {
  it('T1 — le répertoire asset existe', () => {
    expect(existsSync(ZENER_DIR)).toBe(true)
  })

  it('T2 — manifest.json parse et est cohérent avec componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(ZENER_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('ZENER_DIODE')
    expect(m.backend).toBe('raster')
    expect(m.state).toBe('default')
    expect([m.canonical.width, m.canonical.height]).toEqual([144, 72])
    expect(m.visiblePinOrder).toEqual(['A', 'K'])
    expect(m.polarity).toEqual({ A: 'anode', K: 'cathode', visualCathodeMark: 'black band' })
  })

  it('T3 — ASSET-INTEGRITY.json parse', () => {
    const raw = JSON.parse(readFileSync(resolve(ZENER_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    expect(raw.component).toBe('ZENER_DIODE')
    expect(Object.keys(raw.files ?? {}).length).toBeGreaterThanOrEqual(4)
  })

  it('T4/T5/T6/T7/T11 — chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré (byte-for-byte)', () => {
    const raw = JSON.parse(readFileSync(resolve(ZENER_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(ZENER_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })

  it('T4/T5/T6/T7 — hashes exacts déclarés par le Founder pack (1x/3x PNG/WebP)', () => {
    const expected = {
      'zener-diode.default.1x.png': '231bbb4ab3e6e8c2991b4abfaf7089a5632f939055458f189e4e3e04a1a0e404',
      'zener-diode.default.1x.webp': 'c39a71ba3378e591beb264060d75db659bb3f82263bf335ccb5b03e599ab2089',
      'zener-diode.default.3x.png': '5816c48428690a19c8b6b30b735c0f52da4387760f4f913d92d931f5b9bc401d',
      'zener-diode.default.3x.webp': '65dfbff47605cabb12df14c51a6c9ef2a1db87f20ff0efeb50b84d27c285f2fe',
    }
    for (const [file, sha256] of Object.entries(expected)) {
      const buf = readFileSync(resolve(ZENER_DIR, file))
      expect(createHash('sha256').update(buf).digest('hex'), file).toBe(sha256)
    }
  })

  it('T8 — dimensions réelles 1x = 144×72, alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(ZENER_DIR, 'zener-diode.default.1x.png')))
    expect([one.w, one.h]).toEqual([144, 72])
    expect(one.colorType).toBe(6)
  })

  it('T9 — dimensions réelles 3x = 432×216 (= 3×1x), alpha réel (colorType RGBA)', () => {
    const three = pngDims(readFileSync(resolve(ZENER_DIR, 'zener-diode.default.3x.png')))
    expect([three.w, three.h]).toEqual([432, 216])
    expect(three.colorType).toBe(6)
  })

  it('T10 — opaqueBounds1x du manifest cohérent avec le pixel-probe réel effectué en implémentation ([0,7,143,63])', () => {
    const m = JSON.parse(readFileSync(resolve(ZENER_DIR, 'manifest.json'), 'utf-8'))
    expect(m.pixelProbe.opaqueBounds1x).toEqual([0, 7, 143, 63])
  })

  it('manifest.json déclare les mêmes variantes que ASSET-INTEGRITY.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(ZENER_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(ZENER_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const manifestFiles = (manifest.assets ?? []).map((e) => e.file).sort()
    const integrityFiles = Object.keys(integrity.files ?? {}).sort()
    expect(manifestFiles).toEqual(integrityFiles)
  })
})

// ---------------------------------------------------------------------------
// T12-T23 : Registres canoniques / Instance Properties
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — T12 : ZENER_DIODE existe dans le Registry canonique', () => {
  it('enregistré dans canonicalRegistry / componentDefinitions / defaultRegistrations / palette', () => {
    expect(hasCanonicalType('ZENER_DIODE')).toBe(true)
    expect(COMPONENT_TYPES.ZENER_DIODE).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'ZENER_DIODE')).toBe(true)
    expect(getComponentByType('ZENER_DIODE')).not.toBeNull()
    expect(PALETTE_ITEMS.some((item) => item.id === 'ZENER_DIODE')).toBe(true)
    expect(PALETTE_ITEMS.filter((item) => item.id === 'ZENER_DIODE')).toHaveLength(1)
  })
})

describe('A5-ZENER_DIODE — T13/T14/T15/T16/T17 : exactement deux pins A/K, ordre et polarité', () => {
  it('T13 — exactement deux pins canoniques', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    expect(entry.pins).toHaveLength(2)
  })

  it('T14/T15 — A et K existent, rôles input/output (même vocabulaire que DIODE)', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    expect(entry.pins.map((p) => p.id)).toEqual(['A', 'K'])
    expect(entry.pins.map((p) => p.role)).toEqual(['input', 'output'])
  })

  it('T16 — visiblePinOrder (componentDefinitions) === [A, K]', () => {
    const def = getComponentDef('ZENER_DIODE')
    expect(def.pins.map((p) => p.id)).toEqual(['A', 'K'])
  })

  it('T17 — métadonnées de polarité cohérentes avec le manifest Founder (A=anode, K=cathode)', () => {
    const m = JSON.parse(readFileSync(resolve(ZENER_DIR, 'manifest.json'), 'utf-8'))
    expect(m.polarity.A).toBe('anode')
    expect(m.polarity.K).toBe('cathode')
    // aucun id "anode"/"cathode" côté canonique (à la différence de DIODE) :
    // l'orientation reste portée par l'ORDRE + le manifest Founder, jamais
    // par un id littéral dupliqué.
    const entry = getCanonicalEntry('ZENER_DIODE')
    expect(entry.pins.map((p) => p.id)).not.toContain('anode')
    expect(entry.pins.map((p) => p.id)).not.toContain('cathode')
  })
})

describe('A5-ZENER_DIODE — T18/T19/T20/T21/T22 : les quatre paramètres canoniques', () => {
  it('T18 — forwardVoltage default 0.7 V', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    const fv = entry.parameterSchema.find((p) => p.key === 'forwardVoltage')
    expect(fv.defaultValue).toBe(0.7)
    expect(fv.unit).toBe('V')
  })

  it('T19 — onResistance suit la convention DIODE (10 Ω)', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    const on = entry.parameterSchema.find((p) => p.key === 'onResistance')
    const diodeOn = getCanonicalEntry('DIODE').parameterSchema.find((p) => p.key === 'onResistance')
    expect(on.defaultValue).toBe(diodeOn.defaultValue)
    expect(on.minimum).toBe(diodeOn.minimum)
    expect(on.maximum).toBe(diodeOn.maximum)
  })

  it('T20 — breakdownVoltage default = 5.1 V (marquage raster "5V1")', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    const bv = entry.parameterSchema.find((p) => p.key === 'breakdownVoltage')
    expect(bv.defaultValue).toBe(5.1)
    expect(bv.unit).toBe('V')
  })

  it('T21 — breakdownResistance positive et finie', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    const br = entry.parameterSchema.find((p) => p.key === 'breakdownResistance')
    expect(Number.isFinite(br.defaultValue)).toBe(true)
    expect(br.defaultValue).toBeGreaterThan(0)
    expect(br.minimum).toBeGreaterThan(0)
  })

  it('T22 — les quatre paramètres ont un schema valide (key/parameterType/unit/minimum/maximum/defaultValue/description)', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    expect(entry.parameterSchema.map((p) => p.key).sort()).toEqual(
      ['breakdownResistance', 'breakdownVoltage', 'forwardVoltage', 'onResistance'].sort()
    )
    for (const p of entry.parameterSchema) {
      expect(typeof p.key).toBe('string')
      expect(typeof p.parameterType).toBe('string')
      expect(typeof p.unit).toBe('string')
      expect(typeof p.minimum).toBe('number')
      expect(typeof p.maximum).toBe('number')
      expect(p.minimum).toBeLessThanOrEqual(p.maximum)
      expect(p.defaultValue).toBeGreaterThanOrEqual(p.minimum)
      expect(p.defaultValue).toBeLessThanOrEqual(p.maximum)
      expect(typeof p.description).toBe('string')
      expect(p.description.length).toBeGreaterThan(0)
    }
  })

  it('modelAvailable: true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('ZENER_DIODE').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('ZENER_DIODE')).toBe(true)
  })
})

describe('A5-ZENER_DIODE — T23/T64-T70 : round-trip Document / Instance Properties', () => {
  it('T23 — createComponent(ZENER_DIODE) produit un squelette valide (pins clonées) ; parameters explicites survivent un round-trip JSON', () => {
    const comp = createComponent('ZENER_DIODE', 10, 20)
    expect(comp.type).toBe('ZENER_DIODE')
    expect(comp.pins.map((p) => p.id)).toEqual(['A', 'K'])
    const withParameters = { ...comp, parameters: { forwardVoltage: 0.6, onResistance: 8, breakdownVoltage: 4.7, breakdownResistance: 15 } }
    const serialized = JSON.parse(JSON.stringify(withParameters))
    expect(serialized.parameters).toEqual({ forwardVoltage: 0.6, onResistance: 8, breakdownVoltage: 4.7, breakdownResistance: 15 })
  })

  it('T64 — les quatre propriétés sont exposées génériquement (aucun panneau Zener spécifique : même parameterSchema générique que DIODE)', () => {
    const entry = getCanonicalEntry('ZENER_DIODE')
    expect(entry.parameterSchema).toHaveLength(4)
  })

  it('T65/T66/T67/T68 — éditer breakdownVoltage/breakdownResistance change le paramètre EFFECTIF lu par la simulation', () => {
    const edited = resolveComponentParameters('ZENER_DIODE', { breakdownVoltage: 4.3, breakdownResistance: 22 })
    expect(edited.breakdownVoltage).toBe(4.3)
    expect(edited.breakdownResistance).toBe(22)
    // La simulation (dcContributionRegistry) consomme EXACTEMENT ces valeurs effectives.
    const contribute = getDcContribution('ZENER_DIODE')
    const result = contribute({ pins: { A: Signal.LOW, K: Signal.HIGH }, params: edited, supplyVoltage: 5 })
    // 5V > 4.3V (breakdown) => conduction : (5-4.3)/22
    expect(result.current).toBeCloseTo((5 - 4.3) / 22, 10)
  })

  it('T9 (validateComponentParameters) — valeur invalide rejetée par le contrat générique, clampée par resolveComponentParameters (repli default)', () => {
    const validated = validateComponentParameters('ZENER_DIODE', { breakdownResistance: -1 })
    expect(validated.valid).toBe(false)
    expect(validated.errors.length).toBeGreaterThan(0)
    expect(resolveComponentParameters('ZENER_DIODE', { breakdownResistance: -1 })).toEqual(
      getSimulationDefaultParameters('ZENER_DIODE')
    )
  })

  it('T69/T70 — Document serialization + load round-trip préservent les quatre valeurs', () => {
    const comp = createComponent('ZENER_DIODE', 0, 0)
    comp.parameters = { forwardVoltage: 0.65, onResistance: 12, breakdownVoltage: 6.2, breakdownResistance: 18 }
    const roundTripped = JSON.parse(JSON.stringify(comp))
    expect(roundTripped.parameters).toEqual(comp.parameters)
    expect(resolveComponentParameters('ZENER_DIODE', roundTripped.parameters)).toEqual(comp.parameters)
  })

  it('ZenerDiodeModel.validate() rejette les valeurs non conformes', () => {
    expect(ZenerDiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 })).toBe(true)
    expect(ZenerDiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: -1, breakdownResistance: 10 })).toBe(false)
    expect(ZenerDiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 0 })).toBe(false)
    expect(ZenerDiodeModel.validate({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// T36-T43 : Architecture
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — T36/T37/T38 : aucune connaissance de ZENER_DIODE dans les moteurs génériques (code exécutable)', () => {
  function executableSource(relPath) {
    return readFileSync(resolve(__dirname, relPath), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
  }

  it('T36 — resolution.js', () => {
    expect(executableSource('../simulator/resolution.js')).not.toMatch(/ZENER_DIODE/)
  })

  it('T37 — engine.js', () => {
    expect(executableSource('../simulator/engine.js')).not.toMatch(/ZENER_DIODE/)
  })

  it('T38 — simulationRuntimeIntegration.js', () => {
    expect(executableSource('../simulator/simulationRuntimeIntegration.js')).not.toMatch(/ZENER_DIODE/)
  })

  it('scheduler.js / electricalAnalysis.js', () => {
    expect(executableSource('../simulator/scheduler.js')).not.toMatch(/ZENER_DIODE/)
    expect(executableSource('../simulator/electricalAnalysis.js')).not.toMatch(/ZENER_DIODE/)
  })
})

describe('A5-ZENER_DIODE — T39/T40/T41 : aucun second Registry, aucun Scheduler, aucun état transitoire', () => {
  it('T39 — aucune contribution transitoire enregistrée pour ZENER_DIODE (composant purement DC, pas de Scheduler)', () => {
    expect(hasTransientContribution('ZENER_DIODE')).toBe(false)
  })

  it('T40/T41 — ZENER_DIODE seul dans un circuit ne fait avancer aucun Scheduler explicite (chemin purement DC)', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'z1', type: 'ZENER_DIODE', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'z1', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'z1', toPin: 'K' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires, { dt: 16 })
    expect(electricalAnalysis.get('z1')).toBeDefined()
    expect(electricalAnalysis.get('z1').current).toBeCloseTo((5 - 0.7) / 10, 10)
  })
})

describe('A5-ZENER_DIODE — T43 : createDiodeDcContribution réutilisée (aucune copie de physique)', () => {
  it('le contributeur ZENER_DIODE est une INSTANCE de la même factory que DIODE', () => {
    const contribute = getDcContribution('ZENER_DIODE')
    const equivalent = createDiodeDcContribution({ reverseBreakdown: true, anodePinId: 'A', cathodePinId: 'K' })
    const params = { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 }
    const a = contribute({ pins: { A: Signal.HIGH, K: Signal.LOW }, params, supplyVoltage: 5 })
    const b = equivalent({ pins: { A: Signal.HIGH, K: Signal.LOW }, params, supplyVoltage: 5 })
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// T44-T50 : Visual
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — T44-T50 : renderer raster, aucun substitut SVG/CSS', () => {
  it('T44/T50 — renderer raster enregistré (ZenerDiodePart), résolu via getComponentByType (infrastructure visuelle générique)', () => {
    expect(getComponentByType('ZENER_DIODE')).not.toBeNull()
    expect(getComponentByType('ZENER_DIODE').name).toBe('ZenerDiodePart')
  })

  it('T45/T39bis — ZenerDiodePart.jsx ne dessine aucun corps SVG/CSS de substitution (uniquement <picture>/<img> raster)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/ZenerDiodePart.jsx'), 'utf-8')
    expect(src).not.toMatch(/<svg/)
    expect(src).not.toMatch(/<rect|<circle|<line|<path|<ellipse|<polygon/)
    expect(src).toMatch(/<picture/)
    expect(src).toMatch(/<img/)
  })

  it('T46 — backend raster déclaré (même patron que DIODE : bareBody/markerless resolvent à true par défaut pour raster, resolvePresentation() — visualContract.js)', () => {
    expect(getComponentPresentation('ZENER_DIODE')).toEqual(getComponentPresentation('DIODE'))
    expect(getComponentPresentation('ZENER_DIODE')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('T47 — aspect ratio préservé : boîte canonique 144×72 === dimensions natives @1x de l\'asset', () => {
    expect([COMPONENT_TYPES.ZENER_DIODE.width, COMPONENT_TYPES.ZENER_DIODE.height]).toEqual([144, 72])
    const one = pngDims(readFileSync(resolve(ZENER_DIR, 'zener-diode.default.1x.png')))
    expect([COMPONENT_TYPES.ZENER_DIODE.width, COMPONENT_TYPES.ZENER_DIODE.height]).toEqual([one.w, one.h])
  })

  it('T48/T49 — la bande cathode reste du côté K (droite, dx>72) : orientation cohérente entre pixel-probe, manifest et pins canoniques', () => {
    // Bande mesurée x∈[90,100] (voir assemblyProfiles.js) — nettement à
    // droite du centre du corps (144/2=72), du même côté que le pin K
    // (dx=144, extrémité droite), jamais du côté A (dx=0, gauche).
    const def = getComponentDef('ZENER_DIODE')
    const a = byPinOf(def, 'A')
    const k = byPinOf(def, 'K')
    expect(a.dx).toBeLessThan(72)
    expect(k.dx).toBeGreaterThan(72)
    const bandCenterX = (90 + 100) / 2
    expect(Math.abs(bandCenterX - k.dx)).toBeLessThan(Math.abs(bandCenterX - a.dx))
  })

  it('entrée SCALE_REFERENCE (visualContract) enregistrée, box = canonical', () => {
    const entry = SCALE_REFERENCE.find((e) => e.type === 'ZENER_DIODE')
    expect(entry).toBeTruthy()
    expect(entry.box).toEqual([144, 72])
  })
})

// ---------------------------------------------------------------------------
// T51-T63 : Physical Fit
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — T51-T54 : PhysicalContacts A(0,35)/K(144,35), pitch 12×12px exact', () => {
  const def = getComponentDef('ZENER_DIODE')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T51/T52/T53 — exactement deux PhysicalContacts DISTINCTS, câblables et enfichables', () => {
    for (const id of ['A', 'K']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
    const [a, k] = ['A', 'K'].map((id) => resolveContacts(byPin[id])[0])
    expect(a).not.toEqual(k)
  })

  it('positions exactes A(0,35)/K(144,35)', () => {
    expect(resolveContacts(byPin.A)[0]).toMatchObject({ id: 'A', dx: 0, dy: 35 })
    expect(resolveContacts(byPin.K)[0]).toMatchObject({ id: 'K', dx: 144, dy: 35 })
  })

  it('T54 — Δx = 144 px = 12 × BREADBOARD_PITCH exact (±0px, boîte déjà alignée), même rangée', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [a, k] = ['A', 'K'].map((id) => resolveContacts(byPin[id])[0])
    expect(k.dx - a.dx).toBe(144)
    expect(k.dx - a.dx).toBe(12 * BREADBOARD_PITCH)
    expect(k.dy).toBe(a.dy)
  })
})

describe('A5-ZENER_DIODE — T55-T60 : Breadboard Physical Fit Gate — chaîne RÉELLE, aucun mock', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('ZENER_DIODE')
  // A/K (dx=0/144) sont déjà des multiples exacts de 12, mais dy=35 ne
  // l'est pas seul (35 = 2×12 + 11) : une origine y=1 replace les deux
  // contacts exactement sur la grille (1+35=36=3×12=ROW_STRIP_TOP_START,
  // première rangée valide du strip haut — même stratégie que
  // HC_SR04/INDUCTOR).
  const origin = { x: 0, y: 1 }

  it('T55/T56/T57 — resolveComponentContactHoles : allResolved = true, 2 trous DISTINCTS, même rangée', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [aR, kR] = results
    expect(aR.hole).not.toBeNull()
    expect(kR.hole).not.toBeNull()
    expect(aR.hole.row).toBe(kR.hole.row)
    expect(aR.hole.column).not.toBe(kR.hole.column)
    expect(aR.hole).toEqual(holeAt(breadboard, origin.x + 0, origin.y + 35))
    expect(kR.hole).toEqual(holeAt(breadboard, origin.x + 144, origin.y + 35))
  })

  it('T56 — contacts A/K résolus vers deux trous DIFFÉRENTS', () => {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, origin)
    const columns = results.map((r) => r.hole.column)
    expect(new Set(columns).size).toBe(2)
  })

  it('T58 — computeBreadboardPlacement (adapter réel) : composant compatible, placement VALIDE', () => {
    const result = computeBreadboardPlacement(breadboard, 'ZENER_DIODE', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(new Set(result.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(2)
    expect(result.valid).toBe(true)
  })

  it('T59/T60 — resolveAssemblyGeometry (pipeline visuel réel) confirme "inserted", géométrie finie, target = PhysicalContact exact', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'ZENER_DIODE', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.A.target).toEqual({ x: origin.x + 0, y: origin.y + 35 })
    expect(byPinId.K.target).toEqual({ x: origin.x + 144, y: origin.y + 35 })
    for (const pinId of ['A', 'K']) {
      const c = byPinId[pinId]
      expect(Number.isFinite(c.root.x)).toBe(true)
      expect(Number.isFinite(c.root.y)).toBe(true)
      expect(Number.isFinite(c.target.x)).toBe(true)
      expect(Number.isFinite(c.target.y)).toBe(true)
    }
  })

  it('T61/T62/T63 — AssemblyProfile : through-hole, 2 leads, racines mesurées relient corps -> PhysicalContacts, aucune discontinuité introduite', () => {
    const profile = getAssemblyProfile('ZENER_DIODE')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['A', 'K'])
    expect(profile.leads.A.root).toEqual({ dx: 34, dy: 35 })
    expect(profile.leads.K.root).toEqual({ dx: 108, dy: 35 })
    expect(profile.leads.A.style).toBe('metallic-wire')
    expect(profile.leads.K.style).toBe('metallic-wire')

    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'ZENER_DIODE', x: origin.x, y: origin.y }, breadboard)
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    // T61 — lead A relie la racine mécanique (dx=34) au PhysicalContact A (dx=0) : aucun saut, même dy.
    expect(byPinId.A.root).toEqual({ x: origin.x + 34, y: origin.y + 35 })
    expect(byPinId.A.target).toEqual({ x: origin.x + 0, y: origin.y + 35 })
    // T62 — lead K relie la racine mécanique (dx=108) au PhysicalContact K (dx=144) : aucun saut, même dy.
    expect(byPinId.K.root).toEqual({ x: origin.x + 108, y: origin.y + 35 })
    expect(byPinId.K.target).toEqual({ x: origin.x + 144, y: origin.y + 35 })
    // T63 — aucun croisement de pattes (A reste strictement à gauche de K, racines ET targets).
    expect(byPinId.A.root.x).toBeLessThan(byPinId.K.root.x)
    expect(byPinId.A.target.x).toBeLessThan(byPinId.K.target.x)
  })

  it('les racines mesurées tombent dans les bounds opaques du manifest ([0,7,143,63]) — jamais un recadrage/redessin du raster', () => {
    const manifest = JSON.parse(readFileSync(resolve(ZENER_DIR, 'manifest.json'), 'utf-8'))
    const [x0, y0, x1, y1] = manifest.pixelProbe.opaqueBounds1x
    for (const dx of [34, 108]) {
      expect(dx).toBeGreaterThanOrEqual(x0)
      expect(dx).toBeLessThanOrEqual(x1)
    }
    expect(35).toBeGreaterThanOrEqual(y0)
    expect(35).toBeLessThanOrEqual(y1)
  })
})

// ---------------------------------------------------------------------------
// GATE 0 : non-régression stricte (§24 du ticket)
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — GATE 0 : non-régression DIODE/INDUCTOR/CAPACITOR/POLARIZED_CAPACITOR/RESISTOR', () => {
  it('DIODE reste strictement bloquée en inverse (T34, non-régression du comportement historique)', () => {
    const diode = getDcContribution('DIODE')
    expect(diode).not.toBe(getDcContribution('ZENER_DIODE'))
    const result = diode({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
    expect(DiodeModel.validate({ forwardVoltage: 0.7, onResistance: 10 })).toBe(true)
  })

  it('T35 (canonicalRegistry) — DIODE ne gagne aucun paramètre breakdown', () => {
    const diode = getCanonicalEntry('DIODE')
    expect(diode.parameterSchema.map((p) => p.key)).not.toContain('breakdownVoltage')
    expect(diode.parameterSchema.map((p) => p.key)).not.toContain('breakdownResistance')
    expect(diode.capabilities).toEqual(['digital', 'dc'])
  })

  it('INDUCTOR/CAPACITOR/POLARIZED_CAPACITOR/RESISTOR restent inchangés (contributions DC identiques)', () => {
    expect(hasDcContribution('INDUCTOR')).toBe(false)
    expect(getDcContribution('RESISTOR')({ pins: { A: Signal.HIGH, B: Signal.LOW }, params: { resistance: 220 }, supplyVoltage: 5 })).toEqual({ voltage: 5, current: 5 / 220 })
    expect(getDcContribution('CAPACITOR')({ pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params: { capacitance: 1e-7 }, supplyVoltage: 5 })).toEqual({ voltage: 5, current: 0 })
    expect(getDcContribution('POLARIZED_CAPACITOR')({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params: { capacitance: 1e-4 }, supplyVoltage: 5 })).toEqual({ voltage: 5, current: 0 })
  })

  it('un circuit sans ZENER_DIODE reste identique au chemin historique (LED/RESISTOR)', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'r1', type: 'RESISTOR', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'r1', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'r1', toPin: 'B' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires)
    expect(electricalAnalysis.get('r1')).toEqual({ voltage: 5, current: 5 / 220 })
  })

  it('T42 — aucune mutation du composant/parameters original par runSimulationStep()', () => {
    const originalParameters = { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 }
    const originalComponent = { uid: 'z1', type: 'ZENER_DIODE', x: 10, y: 0, parameters: originalParameters }
    const components = Object.freeze([
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      originalComponent,
    ])
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'z1', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'z1', toPin: 'K' },
    ]
    runSimulationStep(components, wires, { dt: 100 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 })
  })
})

// ---------------------------------------------------------------------------
// Intégration bout en bout (preuve runSimulationStep réelle, complète T24-T35)
// ---------------------------------------------------------------------------
describe('A5-ZENER_DIODE — intégration électrique bout en bout (runSimulationStep réel, circuit câblé)', () => {
  it('forward : A=HIGH/K=LOW, 5V => I = (5-0.7)/10 = 0.43 A', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'z1', type: 'ZENER_DIODE', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'z1', toPin: 'A' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'z1', toPin: 'K' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires)
    expect(electricalAnalysis.get('z1').current).toBeCloseTo(0.43, 10)
  })

  it('reverse sous le seuil : A=LOW/K=HIGH, 5V < Vz(5.1V) => I = 0 A', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0 },
      { uid: 'z1', type: 'ZENER_DIODE', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'z1', toPin: 'K' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'z1', toPin: 'A' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires)
    expect(electricalAnalysis.get('z1')).toEqual({ voltage: 5, current: 0 })
  })

  it('reverse au-dessus du seuil : POWER 6.1V, A=LOW/K=HIGH => I = (6.1-5.1)/10 = 0.1 A', () => {
    const components = [
      { uid: 'power1', type: 'POWER', x: 0, y: 0, parameters: { voltage: 6.1 } },
      { uid: 'z1', type: 'ZENER_DIODE', x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: 'power1', fromPin: '5V', toUid: 'z1', toPin: 'K' },
      { fromUid: 'power1', fromPin: 'GND', toUid: 'z1', toPin: 'A' },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires)
    expect(electricalAnalysis.get('z1').current).toBeCloseTo(0.1, 10)
  })
})
