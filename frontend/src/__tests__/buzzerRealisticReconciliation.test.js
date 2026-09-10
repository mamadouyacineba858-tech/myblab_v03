/**
 * buzzerRealisticReconciliation.test.js — FT-C-COMP-004
 *
 * Réconciliation visuelle / physique du composant EXISTANT BUZZER (buzzer
 * piézo TRAVERSANT réaliste, asset 120×120). NE crée PAS de nouveau type.
 * Vérifie : identité canonique BUZZER unique + pins plus/minus inchangés de
 * bout en bout (Registry ↔ Presentation ↔ PhysicalContacts ↔ AssemblyProfile),
 * paquet d'assets 120×120 conforme, géométrie compatible breadboard, pattes
 * fonctionnelles harmonisées, et non-régression du modèle électrique et des
 * autres composants.
 *
 * Correspond aux points T1–T28 du ticket FT-C-COMP-004 §17.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  getCanonicalEntry,
  getAllCanonicalTypes,
  hasCanonicalType,
} from '../simulator/canonicalRegistry.js'
import {
  COMPONENT_TYPES,
  PALETTE_ITEMS,
  getComponentDef,
} from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { getPinPresentationPosition } from '../utils/pinPresentationGeometry.js'
import { BREADBOARD_PITCH, STANDARD_V1_LAYOUT } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { isSimulationModelAvailable } from '../simulator/simulationRegistry.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUZZER_DIR = resolve(__dirname, '../../public/assets/components/buzzer')

/** Dimensions réelles d'un PNG via l'en-tête IHDR (big-endian). */
function pngDims(buf) {
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

describe('FT-C-COMP-004 — BUZZER reste un type canonique unique et inchangé', () => {
  it('T1 — BUZZER est le seul type de buzzer ; aucun BUZZER_REALISTIC / variante créé', () => {
    expect(hasCanonicalType('BUZZER')).toBe(true)
    const buzzers = getAllCanonicalTypes().filter((t) => /BUZZER|BUZZ|PIEZO/i.test(t))
    expect(buzzers).toEqual(['BUZZER'])
    expect(hasCanonicalType('BUZZER_REALISTIC')).toBe(false)
  })

  it('T2 — pins canoniques exactement [plus, minus], ordre logique préservé', () => {
    expect(getCanonicalEntry('BUZZER').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(getComponentDef('BUZZER').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
  })

  it('T2 (rôles) — les deux pins gardent role "input", aucune nouvelle responsabilité électrique', () => {
    expect(getCanonicalEntry('BUZZER').pins.map((p) => p.role)).toEqual(['input', 'input'])
  })

  it('la palette garde une entrée unique « Buzzer »', () => {
    const items = PALETTE_ITEMS.filter((i) => i.id === 'BUZZER')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('Buzzer')
  })
})

describe('FT-C-COMP-004 — renderer & dimensions', () => {
  it('T3 — renderer toujours backend raster déclaratif (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('BUZZER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('T4 — nouvelle boîte dimensionnelle 120×120, cohérente avec le paquet d\'asset', () => {
    expect([COMPONENT_TYPES.BUZZER.width, COMPONENT_TYPES.BUZZER.height]).toEqual([120, 120])
  })

  it('T4 (contrat visuel) — SCALE_REFERENCE.BUZZER.box suit la boîte canonique', () => {
    const row = SCALE_REFERENCE.find((e) => e.type === 'BUZZER')
    expect(row).toBeTruthy()
    expect(row.box).toEqual([COMPONENT_TYPES.BUZZER.width, COMPONENT_TYPES.BUZZER.height])
  })
})

describe('FT-C-COMP-004 — paquet d\'assets 120×120', () => {
  const F = {
    png1: 'buzzer.default.1x.png',
    webp1: 'buzzer.default.1x.webp',
    png3: 'buzzer.default.3x.png',
    webp3: 'buzzer.default.3x.webp',
  }

  it('T8 — PNG + WebP présents en 1x et 3x ; aucun asset "on" réintroduit', () => {
    for (const f of Object.values(F)) {
      expect(existsSync(resolve(BUZZER_DIR, f)), f).toBe(true)
    }
    for (const f of ['buzzer.on.1x.png', 'buzzer.on.3x.png', 'buzzer.on.1x.webp', 'buzzer.on.3x.webp']) {
      expect(existsSync(resolve(BUZZER_DIR, f)), `${f} ne doit plus exister`).toBe(false)
    }
  })

  it('T5 — 1x PNG = 120×120', () => {
    expect(pngDims(readFileSync(resolve(BUZZER_DIR, F.png1)))).toEqual({ w: 120, h: 120 })
  })

  it('T6 — 3x PNG = 360×360', () => {
    expect(pngDims(readFileSync(resolve(BUZZER_DIR, F.png3)))).toEqual({ w: 360, h: 360 })
  })

  it('T7 — 3x = exactement 3 × 1x', () => {
    const one = pngDims(readFileSync(resolve(BUZZER_DIR, F.png1)))
    const three = pngDims(readFileSync(resolve(BUZZER_DIR, F.png3)))
    expect(three.w).toBe(one.w * 3)
    expect(three.h).toBe(one.h * 3)
  })

  it('T9 — manifest conforme (component / backend / canonical 120×120 / states default / 4 variantes)', () => {
    const m = JSON.parse(readFileSync(resolve(BUZZER_DIR, 'manifest.json'), 'utf-8'))
    expect(m.component).toBe('BUZZER')
    expect(m.backend).toBe('raster')
    expect([m.canonical.width, m.canonical.height]).toEqual([120, 120])
    expect(m.states).toEqual(['default'])
    const imgs = (m.assets ?? m.variants ?? []).filter((e) => /\.(png|webp)$/.test(e.file))
    expect(imgs).toHaveLength(4)
    // pins du manifeste alignés sur les PhysicalContacts réconciliés
    expect(m.canonical.pins.plus).toEqual([42, 108])
    expect(m.canonical.pins.minus).toEqual([78, 108])
  })

  it('T10 — ASSET-INTEGRITY conforme : chaque fichier listé existe, octets = taille réelle', () => {
    const raw = JSON.parse(readFileSync(resolve(BUZZER_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.files) ? raw.files : []
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const entry of list) {
      const p = resolve(BUZZER_DIR, entry.file)
      expect(existsSync(p), entry.file).toBe(true)
      expect(readFileSync(p).length).toBe(entry.bytes)
    }
  })

  it('T22 — ratio de l\'asset conservé : 1x carré == boîte canonique carrée', () => {
    const one = pngDims(readFileSync(resolve(BUZZER_DIR, F.png1)))
    const assetRatio = one.w / one.h
    const boxRatio = COMPONENT_TYPES.BUZZER.width / COMPONENT_TYPES.BUZZER.height
    expect(assetRatio).toBe(1)
    expect(boxRatio).toBe(assetRatio)
  })
})

describe('FT-C-COMP-004 — PhysicalContacts plus / minus', () => {
  const def = getComponentDef('BUZZER')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T11 / T12 — plus ET minus possèdent chacun exactement un PhysicalContact (id == identité électrique)', () => {
    for (const id of ['plus', 'minus']) {
      const cs = resolveContacts(byPin[id])
      expect(cs).toHaveLength(1)
      expect(cs[0].id).toBe(id)
    }
  })

  it('T13 / T14 — plus ET minus sont wireConnectable', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T15 — plus ET minus sont breadboardInsertable (contrat FT-B : buzzer traversant)', () => {
    for (const id of ['plus', 'minus']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T15 (géométrie) — même dy, entraxe = multiple exact de BREADBOARD_PITCH', () => {
    const cs = ['plus', 'minus'].map((id) => resolveContacts(byPin[id])[0])
    expect(new Set(cs.map((c) => c.dy)).size).toBe(1)
    const dx = Math.abs(cs[0].dx - cs[1].dx)
    expect(dx).toBeGreaterThan(0)
    expect(dx % BREADBOARD_PITCH).toBe(0)
  })

  it('T15 (valeurs) — PhysicalContacts plus(42,108) / minus(78,108)', () => {
    expect(resolveContacts(byPin.plus)[0]).toMatchObject({ id: 'plus', dx: 42, dy: 108 })
    expect(resolveContacts(byPin.minus)[0]).toMatchObject({ id: 'minus', dx: 78, dy: 108 })
  })
})

describe('FT-C-COMP-004 — AssemblyProfile', () => {
  it('T16 / T17 — profil through-hole avec EXACTEMENT les leads plus / minus, style wire', () => {
    const profile = getAssemblyProfile('BUZZER')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['minus', 'plus'])
    for (const id of ['plus', 'minus']) {
      expect(profile.leads[id].style).toBe('wire')
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('T18 — racines alignées sur les deux pieds visibles du raster (x≈42 / 77), au-dessus des contacts', () => {
    const { leads } = getAssemblyProfile('BUZZER')
    expect(leads.plus.root.dx).toBeGreaterThanOrEqual(38)
    expect(leads.plus.root.dx).toBeLessThanOrEqual(48)
    expect(leads.minus.root.dx).toBeGreaterThanOrEqual(72)
    expect(leads.minus.root.dx).toBeLessThanOrEqual(82)
    const def = getComponentDef('BUZZER')
    const contactDy = def.pins[0].contacts[0].dy
    for (const id of ['plus', 'minus']) {
      expect(leads[id].root.dy).toBeLessThan(contactDy)
    }
  })

  it('T19 — longueur de patte fonctionnelle (root→contact) ~30–34 px, harmonisée LED/LDR/THERMISTOR', () => {
    const { leads } = getAssemblyProfile('BUZZER')
    const def = getComponentDef('BUZZER')
    for (const pin of def.pins) {
      const len = pin.contacts[0].dy - leads[pin.id].root.dy
      expect(len).toBeGreaterThanOrEqual(28)
      expect(len).toBeLessThanOrEqual(36)
    }
  })

  it('T20 — bodyClip déclaré (les pattes cuites du raster sont masquées, aucune double patte)', () => {
    expect(getAssemblyProfile('BUZZER').bodyClip.bottom).toBeGreaterThan(0)
  })

  it('T20 (rendu) — resolveAssemblyGeometry produit exactement 2 pattes wire, une par pin, aucune troisième', () => {
    const g = resolveAssemblyGeometry({ uid: 'b', type: 'BUZZER', x: 0, y: 0 }, null)
    expect(g.contacts).toHaveLength(2)
    expect(g.contacts.map((c) => c.pinId).sort()).toEqual(['minus', 'plus'])
    for (const c of g.contacts) expect(c.style).toBe('wire')
  })

  it('T21 — aucun écrasement du corps : boîte carrée (ratio 1), bodyClip ne masque que le bas', () => {
    const def = getComponentDef('BUZZER')
    expect(def.width).toBe(def.height)
    // le clip laisse au moins les 2/3 supérieurs du corps visibles
    expect(getAssemblyProfile('BUZZER').bodyClip.bottom).toBeLessThan(def.height / 2)
  })
})

describe('FT-C-COMP-004 — compatibilité breadboard', () => {
  const breadboard = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

  it('T15 (insertion) — à une origine alignée sur la grille, les 2 pattes résolvent 2 trous distincts simultanément', () => {
    // entraxe 36 = 3 × BREADBOARD_PITCH : il suffit d'aligner `plus` (dx 42) sur
    // un trou (origine x = 6 → 48) pour que `minus` (dx 78 → 84) tombe aussi
    // sur un trou, 3 colonnes plus loin. dy 108 = 9 × pitch (origine y = 0).
    const g = resolveAssemblyGeometry({ uid: 'b', type: 'BUZZER', x: 6, y: 0 }, breadboard)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['plus', 'minus']))
    expect(new Set(g.contacts.map((c) => `${c.hole.column}:${c.hole.row}`)).size).toBe(2)
  })

  it('computeBreadboardPlacement : composant compatible, 2 trous, placement valide', () => {
    const withinX = Math.min(60, (STANDARD_V1_LAYOUT.columns - 6) * BREADBOARD_PITCH)
    const result = computeBreadboardPlacement(breadboard, 'BUZZER', { x: withinX, y: 0 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(result.valid).toBe(true)
  })
})

describe('FT-C-COMP-004 — wire endpoints convergent avec les PhysicalContacts (T23–T25)', () => {
  const def = getComponentDef('BUZZER')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T23 / T24 — l\'endpoint de présentation de plus / minus == origine composant + offset du PhysicalContact', () => {
    const comp = { uid: 'b', type: 'BUZZER', x: 137, y: 89 }
    for (const id of ['plus', 'minus']) {
      const contact = resolveContacts(byPin[id])[0]
      expect(getPinPresentationPosition(comp, byPin[id])).toEqual({
        x: comp.x + contact.dx,
        y: comp.y + contact.dy,
      })
    }
  })

  it('T25 — après déplacement, les endpoints suivent l\'origine (convergence conservée)', () => {
    const a = { uid: 'b', type: 'BUZZER', x: 0, y: 0 }
    const b = { uid: 'b', type: 'BUZZER', x: -53, y: 211 }
    for (const id of ['plus', 'minus']) {
      const contact = resolveContacts(byPin[id])[0]
      const pa = getPinPresentationPosition(a, byPin[id])
      const pb = getPinPresentationPosition(b, byPin[id])
      expect(pb.x - pa.x).toBe(b.x - a.x)
      expect(pb.y - pa.y).toBe(b.y - a.y)
      expect(pa).toEqual({ x: a.x + contact.dx, y: a.y + contact.dy })
    }
  })

  it('T23/T24 (assembly) — la cible de patte d\'AssemblyLeadsLayer == le PhysicalContact naturel', () => {
    const comp = { uid: 'b', type: 'BUZZER', x: 10, y: 20 }
    const g = resolveAssemblyGeometry(comp, null)
    for (const c of g.contacts) {
      const contact = resolveContacts(byPin[c.pinId])[0]
      expect(c.target).toEqual({ x: comp.x + contact.dx, y: comp.y + contact.dy })
    }
  })
})

describe('FT-C-COMP-004 — non-régression du modèle électrique et des autres composants', () => {
  it('aucune nouvelle simulation — BUZZER n\'a toujours aucun modèle exécutable', () => {
    expect(isSimulationModelAvailable('BUZZER')).toBe(false)
  })

  it('T26 — POTENTIOMETER inchangé (pins, boîte, contacts)', () => {
    expect(getComponentDef('POTENTIOMETER').pins.map((p) => p.id)).toEqual(['left', 'wiper', 'right'])
    expect([COMPONENT_TYPES.POTENTIOMETER.width, COMPONENT_TYPES.POTENTIOMETER.height]).toEqual([120, 120])
    expect(getAssemblyProfile('POTENTIOMETER').bodyClip.bottom).toBe(20)
  })

  it('T27 — POLARIZED_CAPACITOR inchangé (pins, boîte, contacts, profil)', () => {
    expect(getComponentDef('POLARIZED_CAPACITOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect([COMPONENT_TYPES.POLARIZED_CAPACITOR.width, COMPONENT_TYPES.POLARIZED_CAPACITOR.height]).toEqual([33, 120])
    const prof = getAssemblyProfile('POLARIZED_CAPACITOR')
    expect(Object.keys(prof.leads).sort()).toEqual(['minus', 'plus'])
    expect(prof.bodyClip.bottom).toBe(68)
  })

  it('T28 — LED / LDR / THERMISTOR / CAPACITOR / RGB_LED conservent pins et dimensions', () => {
    const EXPECTED_PINS = {
      LED: ['anode', 'cathode'],
      LDR: ['A', 'B'],
      THERMISTOR: ['A', 'B'],
      CAPACITOR: ['pinA', 'pinB'],
      RGB_LED: ['R', 'common', 'G', 'B'],
    }
    for (const [type, ids] of Object.entries(EXPECTED_PINS)) {
      expect(getComponentDef(type).pins.map((p) => p.id), type).toEqual(ids)
    }
    expect([COMPONENT_TYPES.LED.width, COMPONENT_TYPES.LED.height]).toEqual([80, 64])
    expect([COMPONENT_TYPES.LDR.width, COMPONENT_TYPES.LDR.height]).toEqual([84, 36])
    expect([COMPONENT_TYPES.THERMISTOR.width, COMPONENT_TYPES.THERMISTOR.height]).toEqual([84, 36])
    expect([COMPONENT_TYPES.CAPACITOR.width, COMPONENT_TYPES.CAPACITOR.height]).toEqual([70, 40])
    expect([COMPONENT_TYPES.RGB_LED.width, COMPONENT_TYPES.RGB_LED.height]).toEqual([90, 56])
  })

  it('T28 (catalogue) — toujours 20 types canoniques, BUZZER inclus une seule fois', () => {
    const types = getAllCanonicalTypes()
    expect(types.length).toBe(20)
    expect(types.filter((t) => t === 'BUZZER')).toHaveLength(1)
  })
})
