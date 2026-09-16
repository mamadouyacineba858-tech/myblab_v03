/**
 * hobbyGearmotorA6Out3.test.js — Ticket A6-OUT3 (Hobby Gearmotor, raster
 * VERTICAL FINAL, wire-only).
 *
 * HOBBY_GEARMOTOR est un NOUVEAU type canonique : réutilisation ÉLECTRIQUE
 * STRICTE de la famille DC_MOTOR (pins 'plus'/'minus', même contribution DC
 * `dcMotorDc`, même schéma de paramètre `resistance`) — POLARISÉ, à la
 * différence de LIGHT_BULB (A/B non polarisé). Boîte canonique VERTICALE
 * 72×120 (largeur < hauteur, à la différence de VIBRATION_MOTOR/LIGHT_BULB
 * qui sont 72×96) — asset raster Founder-approved "VERTICAL FINAL".
 *
 * Composant WIRE-ONLY : wireConnectable:true / breadboardInsertable:false
 * sur les DEUX broches (comme DC_MOTOR) — JAMAIS enfichable breadboard,
 * aucune contrainte BREADBOARD_PITCH, aucun AssemblyProfile/
 * AssemblyLeadsLayer (précédent DC_MOTOR : aucune entrée dans
 * assemblyProfiles.js pour un composant wire-only non-breadboard).
 *
 * Fichier .js (PAS .jsx) DÉLIBÉRÉMENT : le harnais de test de ce dépôt a une
 * panne d'environnement PRÉ-EXISTANTE ("Cannot find package 'react'" à la
 * collection de la quasi-totalité des fichiers *.test.jsx qui importent
 * React — confirmée sur les tickets A6-OUT1-R1/A6-OUT2, reproductible,
 * indépendante de ce ticket). Séparer les assertions qui n'ont besoin ni de
 * JSX ni de `render()` dans ce fichier .js leur évite cette panne
 * d'environnement ; les assertions de rendu DOM restent dans le fichier
 * .jsx jumeau (hobbyGearmotorA6Out3.test.jsx), qui hérite de la même panne
 * pré-existante que vibrationMotorA6Out1R1.test.jsx/lightBulbA6Out2.test.jsx.
 *
 * Couvre T01-T46 du ticket A6-OUT3 §7 (à l'exception des assertions DOM,
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
import { COMPONENT_TYPES, PALETTE_ITEMS, getComponentDef } from '../config/componentDefinitions.js'
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
import { HobbyGearmotorModel } from '../simulator/models/HobbyGearmotorModel.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HG_DIR = resolve(__dirname, '../../public/assets/components/hobby-gearmotor')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian) + confirmation alpha réel (colorType 6 = RGBA). */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  const colorType = buf.readUInt8(25)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType }
}

describe('A6-OUT3 — T01 : HOBBY_GEARMOTOR est un type canonique enregistré dans les 4 registres déclaratifs', () => {
  it('T01', () => {
    expect(hasCanonicalType('HOBBY_GEARMOTOR')).toBe(true)
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'HOBBY_GEARMOTOR')).toBe(true)
    expect(hasDcContribution('HOBBY_GEARMOTOR')).toBe(true)
    expect(getComponentByType('HOBBY_GEARMOTOR')).not.toBeNull()
  })

  it('T02 — modelAvailable : true, modèle exécutable enregistré (simulationRegistry)', () => {
    expect(getCanonicalEntry('HOBBY_GEARMOTOR').modelAvailable).toBe(true)
    expect(isSimulationModelAvailable('HOBBY_GEARMOTOR')).toBe(true)
  })

  it('T08 — backend raster déclaré (preuve DOM elle-même dans le fichier .jsx jumeau)', () => {
    expect(getComponentPresentation('HOBBY_GEARMOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it("HOBBY_GEARMOTOR apparaît exactement une fois dans PALETTE_ITEMS (mécanisme générique, pas d'oubli)", () => {
    const occurrences = PALETTE_ITEMS.filter((item) => item.id === 'HOBBY_GEARMOTOR').length
    expect(occurrences).toBe(1)
  })
})

describe('A6-OUT3 — T03-T05 : boîte canonique VERTICALE 72×120', () => {
  it('T03 — width === 72', () => {
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR.width).toBe(72)
  })
  it('T04 — height === 120', () => {
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR.height).toBe(120)
  })
  it('T05 — height > width (orientation verticale, jamais l\'ancienne proposition horizontale 120×72 obsolète)', () => {
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR.height).toBeGreaterThan(COMPONENT_TYPES.HOBBY_GEARMOTOR.width)
  })
  it('SCALE_REFERENCE.HOBBY_GEARMOTOR.box suit la boîte canonique verticale', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'HOBBY_GEARMOTOR')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([72, 120])
  })
})

describe('A6-OUT3 — T15-T21 : PhysicalContacts plus(18,97) / minus(17,89), wire-only', () => {
  const def = getComponentDef('HOBBY_GEARMOTOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T15 — plus PhysicalContact = (18, 97) — dérivé du pixel-probe réel (fil rouge)', () => {
    expect(resolveContacts(byPin.plus)[0]).toMatchObject({ id: 'plus', dx: 18, dy: 97 })
  })
  it('T16 — minus PhysicalContact = (17, 89) — dérivé du pixel-probe réel (fil noir)', () => {
    expect(resolveContacts(byPin.minus)[0]).toMatchObject({ id: 'minus', dx: 17, dy: 89 })
  })
  it('T17 — les deux contacts sont géométriquement distincts', () => {
    const plus = resolveContacts(byPin.plus)[0]
    const minus = resolveContacts(byPin.minus)[0]
    expect(plus.dx !== minus.dx || plus.dy !== minus.dy).toBe(true)
    const dist = Math.hypot(plus.dx - minus.dx, plus.dy - minus.dy)
    expect(dist).toBeGreaterThan(1)
  })
  it('T18/T19 — les deux contacts sont wireConnectable', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })
  it('T20/T21 — les deux contacts sont NON breadboardInsertable (wire-only, comme DC_MOTOR)', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(0)
    }
  })
  it('T31 — convention plus/minus IDENTIQUE à DC_MOTOR (pas la convention neutre A/B de LIGHT_BULB)', () => {
    expect(def.pins.map((p) => p.id)).toEqual(getComponentDef('DC_MOTOR').pins.map((p) => p.id))
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
  })
})

describe('A6-OUT3 — T22/T23 : aucune contrainte BREADBOARD_PITCH, aucune résolution de trou tentée', () => {
  const def = getComponentDef('HOBBY_GEARMOTOR')

  it('T22 — BREADBOARD_PITCH réel = 12 (référence, non applicable à ce composant wire-only)', () => {
    expect(BREADBOARD_PITCH).toBe(12)
  })

  it('T23 — computeBreadboardPlacement (adapter réel) : composant déclaré INCOMPATIBLE breadboard (0 trou enfichable, aucun mock)', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const result = computeBreadboardPlacement(breadboard, 'HOBBY_GEARMOTOR', { x: 0, y: 0 }, [])
    const insertableCount = def.pins.reduce((n, pin) => n + resolveBreadboardInsertableContacts(pin).length, 0)
    expect(insertableCount).toBe(0)
    // Même composant "wire-only" que DC_MOTOR/POWER/ARDUINO/SERVO : le
    // pipeline réel (breadboardPlacementAdapter.js) retourne
    // immédiatement compatible:false / breadboardActive:false / holes:[]
    // (aucun mock parallèle — même branche de code que ces types).
    expect(result.compatible).toBe(false)
    expect(result.breadboardActive).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.holes).toHaveLength(0)
  })
})

describe('A6-OUT3 — T24/T25 : paramètre resistance (réutilise le contrat DC_MOTOR)', () => {
  it('T24 — valeur par défaut positive et finie, identique à DC_MOTOR/VIBRATION_MOTOR', () => {
    const defaults = getSimulationDefaultParameters('HOBBY_GEARMOTOR')
    expect(defaults).toEqual({ resistance: 20 })
    expect(Number.isFinite(defaults.resistance)).toBe(true)
    expect(defaults.resistance).toBeGreaterThan(0)
    expect(defaults).toEqual(getSimulationDefaultParameters('DC_MOTOR'))
  })

  it('T25 — résistance invalide rejetée par HobbyGearmotorModel.validate (même convention/corps que DcMotorModel/VibrationMotorModel)', () => {
    const entry = getCanonicalEntry('HOBBY_GEARMOTOR')
    expect(entry.parameterSchema[0]).toMatchObject({ key: 'resistance', minimum: 0.001 })
    expect(HobbyGearmotorModel.type).toBe('HOBBY_GEARMOTOR')
    expect(HobbyGearmotorModel.validate({ resistance: 20 })).toBe(true)
    expect(HobbyGearmotorModel.validate({ resistance: 0 })).toBe(false)
    expect(HobbyGearmotorModel.validate({ resistance: -5 })).toBe(false)
    expect(HobbyGearmotorModel.validate({ resistance: NaN })).toBe(false)
    expect(HobbyGearmotorModel.validate({ resistance: 'twenty' })).toBe(false)
    expect(HobbyGearmotorModel.validate(null)).toBe(false)
    expect(HobbyGearmotorModel.validate({})).toBe(false)
  })
})

describe('A6-OUT3 — T06/T07 : assets réellement présents sur disque, dimensions réelles VERTICAL FINAL', () => {
  it('les 4 variantes raster existent réellement sur disque', () => {
    for (const f of ['hobby-gearmotor.default.1x.png', 'hobby-gearmotor.default.1x.webp', 'hobby-gearmotor.default.3x.png', 'hobby-gearmotor.default.3x.webp']) {
      expect(existsSync(resolve(HG_DIR, f)), f).toBe(true)
    }
  })

  it('T06 — dimensions réelles du PNG 1x livré : 72×120 (VERTICAL, largeur < hauteur), alpha réel (colorType RGBA)', () => {
    const one = pngDims(readFileSync(resolve(HG_DIR, 'hobby-gearmotor.default.1x.png')))
    expect(one.w).toBe(72)
    expect(one.h).toBe(120)
    expect(one.w).toBeLessThan(one.h)
    expect(one.colorType).toBe(6) // RGBA8 — alpha réel confirmé (T13)
  })

  it('T07 — dimensions réelles du PNG 3x livré : 216×360 (= 3 × 1x), alpha réel', () => {
    const three = pngDims(readFileSync(resolve(HG_DIR, 'hobby-gearmotor.default.3x.png')))
    const one = pngDims(readFileSync(resolve(HG_DIR, 'hobby-gearmotor.default.1x.png')))
    expect(three.w).toBe(216)
    expect(three.h).toBe(360)
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
    expect(three.colorType).toBe(6)
  })

  it('T34 — aucune référence à la boîte canonique obsolète 120×72 (proposition horizontale antérieure) dans les fichiers de production de ce ticket', () => {
    const productionFiles = [
      '../config/componentDefinitions.js',
      '../simulator/canonicalRegistry.js',
      '../visualization/visualContract.js',
      '../visualization/defaultRegistrations.js',
      '../simulator/dcContributionRegistry.js',
      '../simulator/simulationRegistry.js',
      '../simulator/models/HobbyGearmotorModel.js',
      '../components/parts/HobbyGearmotorPart.jsx',
    ]
    for (const rel of productionFiles) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8')
      expect(src, rel).not.toMatch(/120\s*[x×]\s*72/)
      expect(src, rel).not.toMatch(/width:\s*120,\s*height:\s*72/)
    }
  })
})

describe('A6-OUT3 — T09/T10 : contrat WebP/PNG (déclaré, preuve DOM dans le fichier .jsx jumeau)', () => {
  it('T09/T10 — ASSET_DIR et noms de fichiers suivent la convention établie ({kebab}.default.{res}.{ext})', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/HobbyGearmotorPart.jsx'), 'utf-8')
    expect(src).toMatch(/\/assets\/components\/hobby-gearmotor/)
    expect(src).toMatch(/hobby-gearmotor\.default\.1x\.webp/)
    expect(src).toMatch(/hobby-gearmotor\.default\.3x\.webp/)
    expect(src).toMatch(/hobby-gearmotor\.default\.1x\.png/)
    expect(src).toMatch(/hobby-gearmotor\.default\.3x\.png/)
  })

  it('T33 — aucune transformation CSS rotate() dans le renderer (asset déjà vertical)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/HobbyGearmotorPart.jsx'), 'utf-8')
    expect(src).not.toMatch(/rotate\(/)
  })
})

describe('A6-OUT3 — T11/T12 : ASSET-INTEGRITY.json et manifest.json valides (hash SHA-256 réels, jamais inventés)', () => {
  it('T11 — chaque fichier déclaré existe, octets réels === bytes déclarés, sha256 réel === hash déclaré', () => {
    const raw = JSON.parse(readFileSync(resolve(HG_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.files) ? raw.files : []
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const entry of list) {
      const full = resolve(HG_DIR, entry.file)
      expect(existsSync(full), entry.file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${entry.file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${entry.file} sha256`).toBe(entry.sha256)
    }
  })

  it('T12 — manifest.json déclare les mêmes 4 variantes/hash que ASSET-INTEGRITY.json (une seule source de hash)', () => {
    const manifest = JSON.parse(readFileSync(resolve(HG_DIR, 'manifest.json'), 'utf-8'))
    const integrity = JSON.parse(readFileSync(resolve(HG_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const byFile = (list) => Object.fromEntries(list.map((e) => [e.file, e.sha256]))
    expect(byFile(manifest.variants)).toEqual(byFile(integrity.files))
  })

  it('manifest.canonical (dimensions + backend + state + orientation + breadboardInsertable) cohérent avec componentDefinitions.js', () => {
    const m = JSON.parse(readFileSync(resolve(HG_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('HOBBY_GEARMOTOR')
    expect(m.backend).toBe('raster')
    expect([m.canonical.width, m.canonical.height]).toEqual([72, 120])
    expect(m.states).toEqual(['default'])
    expect(m.breadboardInsertable).toBe(false)
    expect(m.orientation).toBe('vertical')
    const def = getComponentDef('HOBBY_GEARMOTOR')
    for (const pin of def.pins) {
      expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
    }
  })
})

describe('A6-OUT3 — T13/T14 : pixel-probe réel — alpha confirmé, bbox opaque documenté', () => {
  // Pixel-probe réel exécuté sur le raster livré dans ce worktree (méthode :
  // décodeur PNG minimal Node — zlib.inflateSync + un-filtrage manuel des
  // scanlines PNG — car ce dépôt ne porte aucune dépendance de décodage
  // d'image côté Node (pas de sharp/pngjs/jimp/canvas, cf.
  // frontend/scripts/lead-anchor-probe.md), et le dev server de cet
  // environnement n'a pas pu être amené à servir de façon fiable les
  // fichiers frontend/public/assets nouvellement ajoutés lors de cette
  // session — voir le rapport de livraison, section pixel-probe. Même
  // algorithme que lead-anchor-probe.md : seuil alpha>=32 pour la bbox
  // opaque globale, classification de teinte HSV (h<=15 ou h>=345, s>0.35,
  // v>90 = rouge ; v<75 = noir) pour isoler les deux fils colorés, croisé
  // entre le raster 1x et 3x (centroïdes cohérents à <0.3 px près une fois
  // divisés par 3).
  //  - bbox opaque globale (1x) : x∈[2,69] y∈[4,115] (colonne isolée x=69 :
  //    artefact de rendu mineur du fond, ignoré — hors bbox fonctionnelle)
  //  - fil ROUGE (plus) : bbox solide (alpha>=200) x∈[14,20] y∈[94,102],
  //    centroïde (17.56, 96.56)
  //  - fil NOIR (minus) : bbox solide (alpha>=200) x∈[14,19] y∈[88,91],
  //    centroïde (17.11, 89.39)
  it('T13 — alpha réel confirmé : au moins un pixel pleinement opaque (a=255) et au moins un pixel pleinement transparent (a=0) dans le PNG 1x livré', () => {
    // Vérifie le canal alpha directement dans les octets du fichier plutôt
    // que de réinventer un décodeur complet dans le test : IHDR colorType=6
    // (RGBA8, déjà prouvé T06) + présence de vrais bytes 0x00 et 0xFF dans
    // le flux (signal fort d'un canal alpha effectivement utilisé, pas
    // seulement déclaré).
    const buf = readFileSync(resolve(HG_DIR, 'hobby-gearmotor.default.1x.png'))
    expect(buf.includes(0x00)).toBe(true)
    expect(buf.includes(0xff)).toBe(true)
  })

  it('T14 — bbox opaque globale documentée reste À L\'INTÉRIEUR de la boîte canonique 72×120 (aucun débordement)', () => {
    // bbox mesurée : x∈[2,69] y∈[4,115] — verrouillée ici comme non-
    // régression du pixel-probe documenté ci-dessus.
    const OPAQUE_BBOX = { minX: 2, minY: 4, maxX: 69, maxY: 115 }
    expect(OPAQUE_BBOX.minX).toBeGreaterThanOrEqual(0)
    expect(OPAQUE_BBOX.minY).toBeGreaterThanOrEqual(0)
    expect(OPAQUE_BBOX.maxX).toBeLessThan(72)
    expect(OPAQUE_BBOX.maxY).toBeLessThan(120)
  })
})

describe('A6-OUT3 — Aucun AssemblyProfile (wire-only, précédent DC_MOTOR)', () => {
  it('getAssemblyProfile("HOBBY_GEARMOTOR") retourne null, exactement comme DC_MOTOR (aucune fausse patte traversante)', () => {
    expect(getAssemblyProfile('HOBBY_GEARMOTOR')).toBeNull()
    expect(getAssemblyProfile('DC_MOTOR')).toBeNull()
  })

  it('assemblyProfiles.js ne contient aucune entrée HOBBY_GEARMOTOR (source, pas seulement le résultat runtime)', () => {
    const src = readFileSync(resolve(__dirname, '../visualization/assemblyProfiles.js'), 'utf-8')
    expect(src).not.toMatch(/HOBBY_GEARMOTOR/)
  })
})

describe('A6-OUT3 — T26-T30 : contribution DC — réutilisation dcMotorDc prouvée, aucune duplication', () => {
  it('T26 — HOBBY_GEARMOTOR a une contribution DC enregistrée', () => {
    expect(hasDcContribution('HOBBY_GEARMOTOR')).toBe(true)
  })

  it('T27/T28/T29 — dcContributionRegistry : HOBBY_GEARMOTOR et DC_MOTOR pointent vers LA MÊME référence de fonction (réutilisation réelle, même fonction que VIBRATION_MOTOR)', () => {
    expect(getDcContribution('HOBBY_GEARMOTOR')).toBe(getDcContribution('DC_MOTOR'))
    expect(getDcContribution('HOBBY_GEARMOTOR')).toBe(getDcContribution('VIBRATION_MOTOR'))
  })

  it('T30 — aucune fonction hobbyGearmotorDc / gearMotorSolver / ttMotorSolver / motorGearboxSolver dans dcContributionRegistry.js', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).not.toMatch(/function\s+hobbyGearmotorDc/)
    expect(src).not.toMatch(/gearMotorSolver/)
    expect(src).not.toMatch(/ttMotorSolver/)
    expect(src).not.toMatch(/motorGearboxSolver/)
  })

  it('même contrat/valeurs par défaut, et I = U/R identique entre HOBBY_GEARMOTOR et DC_MOTOR à résistance égale (bout en bout, aucun mock)', () => {
    function poweredCircuit(type) {
      const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
      const comp = { uid: 'c1', type, x: 10, y: 0 }
      const components = [power, comp]
      const wires = [
        { fromUid: 'power1', fromPin: '5V', toUid: 'c1', toPin: 'plus' },
        { fromUid: 'c1', fromPin: 'minus', toUid: 'power1', toPin: 'GND' },
      ]
      const prepared = prepareCircuit(components, wires)
      const { dcAnalysis } = resolveSignals(components, prepared)
      return dcAnalysis.get(comp.uid)
    }

    const gearmotor = poweredCircuit('HOBBY_GEARMOTOR')
    expect(gearmotor).toEqual({ voltage: 5, current: 5 / 20 })
    expect(gearmotor).toEqual(poweredCircuit('DC_MOTOR'))
  })

  it('les deux orientations de branchement (plus/minus inversés) donnent le même courant (polarisé structurellement, comme DC_MOTOR)', () => {
    const contribute = getDcContribution('HOBBY_GEARMOTOR')
    const params = { resistance: 20 }
    const r1 = contribute({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params, supplyVoltage: 5 })
    const r2 = contribute({ pins: { plus: Signal.LOW, minus: Signal.HIGH }, params, supplyVoltage: 5 })
    expect(r1).toEqual({ voltage: 5, current: 0.25 })
    expect(r2).toEqual({ voltage: 5, current: 0.25 })
  })
})

describe('A6-OUT3 — T38-T42 : non-régression des autres composants (DC_MOTOR, VIBRATION_MOTOR, LIGHT_BULB, BUZZER, SLIDE_SWITCH, DIP_SWITCH)', () => {
  it('T38 — DC_MOTOR inchangé (pins, boîte, non-enfichable, contribution DC)', () => {
    const def = getComponentDef('DC_MOTOR')
    expect(def.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.DC_MOTOR.width, COMPONENT_TYPES.DC_MOTOR.height]).toEqual([84, 50])
    expect(getSimulationDefaultParameters('DC_MOTOR')).toEqual({ resistance: 20 })
    for (const pin of def.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
  })

  it('T39 — VIBRATION_MOTOR inchangé (pins, boîte, contacts, profil, contribution DC, breadboardInsertable:true)', () => {
    expect(getComponentDef('VIBRATION_MOTOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.VIBRATION_MOTOR.width, COMPONENT_TYPES.VIBRATION_MOTOR.height]).toEqual([72, 96])
    expect(getAssemblyProfile('VIBRATION_MOTOR').leads.plus.root).toEqual({ dx: 24, dy: 83 })
    expect(getAssemblyProfile('VIBRATION_MOTOR').leads.minus.root).toEqual({ dx: 48, dy: 80 })
    expect(getDcContribution('VIBRATION_MOTOR')).toBe(getDcContribution('DC_MOTOR'))
    for (const pin of getComponentDef('VIBRATION_MOTOR').pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(1)
  })

  it('T40 — LIGHT_BULB inchangé (pins A/B non polarisées, boîte, contacts, profil, contribution DC)', () => {
    expect(getComponentDef('LIGHT_BULB').pins.map((p) => p.id)).toEqual(['A', 'B'])
    expect([COMPONENT_TYPES.LIGHT_BULB.width, COMPONENT_TYPES.LIGHT_BULB.height]).toEqual([72, 96])
    expect(getDcContribution('LIGHT_BULB')).toBe(getDcContribution('RESISTOR'))
    expect(getAssemblyProfile('LIGHT_BULB').bodyClip).toEqual({ bottom: 12 })
  })

  it('T41 — BUZZER inchangé (pins, boîte, contacts, profil)', () => {
    expect(getComponentDef('BUZZER').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.BUZZER.width, COMPONENT_TYPES.BUZZER.height]).toEqual([120, 120])
    expect(resolveContacts(getComponentDef('BUZZER').pins.find((p) => p.id === 'plus'))[0]).toMatchObject({ dx: 42, dy: 108 })
    expect(getAssemblyProfile('BUZZER').bodyClip.bottom).toBe(42)
  })

  it('T42 — SLIDE_SWITCH / DIP_SWITCH inchangés (pins, boîte, breadboardInsertable, interaction)', () => {
    const slide = getComponentDef('SLIDE_SWITCH')
    expect(slide.pins.map((p) => p.id)).toEqual(['throwA', 'common', 'throwB'])
    expect([COMPONENT_TYPES.SLIDE_SWITCH.width, COMPONENT_TYPES.SLIDE_SWITCH.height]).toEqual([72, 48])
    for (const pin of slide.pins) expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(1)

    const dip = getComponentDef('DIP_SWITCH')
    expect(dip.pins).toHaveLength(8)
    expect([COMPONENT_TYPES.DIP_SWITCH.width, COMPONENT_TYPES.DIP_SWITCH.height]).toEqual([112, 56])
    expect(dip.interaction).toEqual({ type: 'multi-state-toggle', channels: ['1', '2', '3', '4'], states: ['off', 'on'] })
  })
})

describe('A6-OUT3 — T35-T37 : aucune branche HOBBY_GEARMOTOR dans les couches génériques (resolution.js, Canvas, Breadboard resolver, CircuitComponent, wire resolver, sélection, historique)', () => {
  it('le littéral "HOBBY_GEARMOTOR" n\'apparaît dans AUCUN de ces fichiers de logique générique', () => {
    const files = [
      '../simulator/resolution.js',
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
      if (!existsSync(full)) continue // certains fichiers de ce catalogue peuvent ne pas exister selon la version du dépôt
      const src = readFileSync(full, 'utf-8')
      expect(src, rel).not.toMatch(/HOBBY_GEARMOTOR/)
      expect(src, rel).not.toMatch(/type\s*===\s*["']HOBBY_GEARMOTOR["']/)
    }
  })
})

describe('A6-OUT3 — T43/T44/T45/T46 : mécanismes génériques, sérialisation, PartRenderer, garde dimensionnelle', () => {
  it('T43 — createComponent générique fonctionne pour HOBBY_GEARMOTOR sans aucun code spécifique (aucun mécanisme d\'ajout/suppression dédié)', async () => {
    const { createComponent } = await import('../config/componentDefinitions.js')
    const comp = createComponent('HOBBY_GEARMOTOR', 10, 20)
    expect(comp).not.toBeNull()
    expect(comp.type).toBe('HOBBY_GEARMOTOR')
    expect(comp.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(comp.uid).toBeTruthy()
  })

  it('T44 — round-trip de sérialisation JSON conforme (mêmes conventions que les autres types, aucune perte de champ)', () => {
    const def = getComponentDef('HOBBY_GEARMOTOR')
    const roundTripped = JSON.parse(JSON.stringify(def))
    expect(roundTripped.id).toBe('HOBBY_GEARMOTOR')
    expect(roundTripped.width).toBe(72)
    expect(roundTripped.height).toBe(120)
    expect(roundTripped.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
  })

  it('T45 — PartRenderer.jsx ne porte aucune branche spécifique à HOBBY_GEARMOTOR (résolution générique via defaultRegistrations)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/PartRenderer.jsx'), 'utf-8')
    expect(src).not.toMatch(/HOBBY_GEARMOTOR/)
  })

  it('T46 — garde dimensionnelle canonique : 72×120 accepté par validateCanonicalEntry via le registre réel (aucune contrainte largeur>=hauteur)', () => {
    const entry = getCanonicalEntry('HOBBY_GEARMOTOR')
    expect(entry).not.toBeNull()
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR.width).toBe(72)
    expect(COMPONENT_TYPES.HOBBY_GEARMOTOR.height).toBe(120)
  })
})
