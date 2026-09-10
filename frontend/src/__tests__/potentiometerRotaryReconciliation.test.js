/**
 * potentiometerRotaryReconciliation.test.js — FT-C-COMP-003
 *
 * Réconciliation visuelle / physique du composant EXISTANT POTENTIOMETER
 * (potentiomètre ROTATIF réaliste, asset 120×120). NE crée PAS de nouveau
 * type. Vérifie : identités canoniques left/wiper/right inchangées de bout en
 * bout (Registry ↔ Presentation ↔ PhysicalContacts ↔ AssemblyProfile),
 * géométrie compatible breadboard, et non-régression du modèle électrique
 * (resistance / position) et des autres composants.
 */
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
import { BREADBOARD_PITCH, STANDARD_V1_LAYOUT } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { getSimulationModel, getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'
import { getDcContribution } from '../simulator/dcContributionRegistry.js'
import { Signal } from '../simulator/signals.js'

const SUPPLY = 5

describe('FT-C-COMP-003 — POTENTIOMETER reste un type canonique unique et inchangé', () => {
  it('T1 — POTENTIOMETER est le seul type de potentiomètre ; aucun SLIDER_/ROTARY_ créé', () => {
    expect(hasCanonicalType('POTENTIOMETER')).toBe(true)
    const pots = getAllCanonicalTypes().filter((t) => /POTENTIOMETER|POTENTIOM|SLIDER/i.test(t))
    expect(pots).toEqual(['POTENTIOMETER'])
    expect(hasCanonicalType('SLIDER_POTENTIOMETER')).toBe(false)
    expect(hasCanonicalType('ROTARY_POTENTIOMETER')).toBe(false)
  })

  it('T2 — pins canoniques exactement [left, wiper, right], ordre logique préservé', () => {
    expect(getCanonicalEntry('POTENTIOMETER').pins.map((p) => p.id)).toEqual(['left', 'wiper', 'right'])
    expect(getComponentDef('POTENTIOMETER').pins.map((p) => p.id)).toEqual(['left', 'wiper', 'right'])
  })

  it('T3 — resistance par défaut reste 10000 Ω', () => {
    expect(getCanonicalEntry('POTENTIOMETER').defaultParameters.resistance).toBe(10000)
    expect(getSimulationDefaultParameters('POTENTIOMETER').resistance).toBe(10000)
  })

  it('T4 — position par défaut reste 0.5', () => {
    expect(getCanonicalEntry('POTENTIOMETER').defaultParameters.position).toBe(0.5)
    expect(getSimulationDefaultParameters('POTENTIOMETER').position).toBe(0.5)
  })

  it('la palette garde une entrée unique « Potentiomètre » (aucun nouveau composant palette)', () => {
    const items = PALETTE_ITEMS.filter((i) => i.id === 'POTENTIOMETER')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('Potentiomètre')
  })
})

describe('FT-C-COMP-003 — renderer & dimensions', () => {
  it('T5 — renderer toujours backend raster déclaratif (bareBody + markerless dérivés)', () => {
    expect(getComponentPresentation('POTENTIOMETER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
  })

  it('T6 — nouvelle boîte dimensionnelle 120×120, cohérente avec l\'asset rotatif', () => {
    expect([COMPONENT_TYPES.POTENTIOMETER.width, COMPONENT_TYPES.POTENTIOMETER.height]).toEqual([120, 120])
  })
})

describe('FT-C-COMP-003 — PhysicalContacts left/wiper/right', () => {
  const def = getComponentDef('POTENTIOMETER')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T7 — les 3 PhysicalContacts existent (un par pin)', () => {
    for (const id of ['left', 'wiper', 'right']) {
      expect(resolveContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T8 — les 3 contacts sont wireConnectable', () => {
    for (const id of ['left', 'wiper', 'right']) {
      expect(resolveWireConnectableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T9 — les 3 contacts sont breadboardInsertable', () => {
    for (const id of ['left', 'wiper', 'right']) {
      expect(resolveBreadboardInsertableContacts(byPin[id])).toHaveLength(1)
    }
  })

  it('T10 — contact.id coïncide avec l\'identité électrique canonique (left/wiper/right)', () => {
    for (const id of ['left', 'wiper', 'right']) {
      expect(resolveContacts(byPin[id])[0].id).toBe(id)
    }
  })

  it('T14 (géométrie) — les 3 contacts partagent le même dy et sont espacés d\'un multiple exact de BREADBOARD_PITCH', () => {
    const cs = ['left', 'wiper', 'right'].map((id) => resolveContacts(byPin[id])[0])
    expect(new Set(cs.map((c) => c.dy)).size).toBe(1)
    const xs = cs.map((c) => c.dx).sort((a, z) => a - z)
    expect((xs[1] - xs[0]) % BREADBOARD_PITCH).toBe(0)
    expect((xs[2] - xs[1]) % BREADBOARD_PITCH).toBe(0)
    expect(xs[1] - xs[0]).toBeGreaterThan(0)
  })
})

describe('FT-C-COMP-003 — AssemblyProfile', () => {
  it('T11 — profil through-hole avec EXACTEMENT les leads left/wiper/right, style lug', () => {
    const profile = getAssemblyProfile('POTENTIOMETER')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['left', 'right', 'wiper'])
    for (const id of ['left', 'wiper', 'right']) {
      expect(profile.leads[id].style).toBe('lug')
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('T12 — les 3 racines sont sous le corps, alignées sur les 3 cosses visibles du raster (x≈42/60/78)', () => {
    const { leads } = getAssemblyProfile('POTENTIOMETER')
    expect(leads.left.root.dx).toBeGreaterThanOrEqual(36)
    expect(leads.left.root.dx).toBeLessThanOrEqual(48)
    expect(leads.wiper.root.dx).toBeGreaterThanOrEqual(54)
    expect(leads.wiper.root.dx).toBeLessThanOrEqual(66)
    expect(leads.right.root.dx).toBeGreaterThanOrEqual(72)
    expect(leads.right.root.dx).toBeLessThanOrEqual(84)
    // racines au-dessus des contacts (cosse orientée vers le bas)
    const def = getComponentDef('POTENTIOMETER')
    const contactDy = def.pins[0].contacts[0].dy
    for (const id of ['left', 'wiper', 'right']) {
      expect(leads[id].root.dy).toBeLessThan(contactDy)
    }
  })

  it('T13 — bodyClip déclaré (le raster porte des cosses cuites à masquer, aucune double patte)', () => {
    expect(getAssemblyProfile('POTENTIOMETER').bodyClip.bottom).toBeGreaterThan(0)
  })

  it('T13 (rendu) — resolveAssemblyGeometry produit exactement 3 cosses lug, une par pin, aucune quatrième', () => {
    const g = resolveAssemblyGeometry({ uid: 'p', type: 'POTENTIOMETER', x: 0, y: 0 }, null)
    expect(g.contacts).toHaveLength(3)
    expect(g.contacts.map((c) => c.pinId).sort()).toEqual(['left', 'right', 'wiper'])
    for (const c of g.contacts) expect(c.style).toBe('lug')
  })
})

describe('FT-C-COMP-003 — compatibilité breadboard', () => {
  const breadboard = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

  it('T14 — insertion simultanée cohérente : les 3 cosses résolvent 3 trous distincts', () => {
    const g = resolveAssemblyGeometry({ uid: 'p', type: 'POTENTIOMETER', x: 0, y: 0 }, breadboard)
    expect(g.inserted).toBe(true)
    expect(new Set(g.contacts.map((c) => c.pinId))).toEqual(new Set(['left', 'wiper', 'right']))
    expect(new Set(g.contacts.map((c) => `${c.hole.column}:${c.hole.row}`)).size).toBe(3)
  })

  it('computeBreadboardPlacement : composant compatible, 3 trous, placement valide', () => {
    const withinX = Math.min(60, (STANDARD_V1_LAYOUT.columns - 6) * BREADBOARD_PITCH)
    const result = computeBreadboardPlacement(breadboard, 'POTENTIOMETER', { x: withinX, y: 0 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(3)
    expect(result.valid).toBe(true)
  })
})

describe('FT-C-COMP-003 — non-régression du modèle électrique (T17/T18/T19)', () => {
  const model = getSimulationModel('POTENTIOMETER')
  const contribute = getDcContribution('POTENTIOMETER')

  it('le modèle exécutable reste { type:"POTENTIOMETER", validate }', () => {
    expect(model.type).toBe('POTENTIOMETER')
    expect(model.validate({ resistance: 10000, position: 0.5 })).toBe(true)
  })

  it('T17 — DC à position 0 : LEFT↔WIPER = cas limite non modélisé (inchangé)', () => {
    const r = contribute({ pins: { left: Signal.HIGH, wiper: Signal.LOW, right: Signal.UNKNOWN }, params: { resistance: 10000, position: 0 }, supplyVoltage: SUPPLY })
    expect(r).toBeNull()
  })

  it('T18 — DC à position 0.5 : résistances équivalentes inchangées', () => {
    const full = contribute({ pins: { left: Signal.HIGH, wiper: Signal.UNKNOWN, right: Signal.LOW }, params: { resistance: 10000, position: 0.5 }, supplyVoltage: SUPPLY })
    expect(full).toEqual({ voltage: SUPPLY, current: SUPPLY / 10000 })
    const half = contribute({ pins: { left: Signal.HIGH, wiper: Signal.LOW, right: Signal.UNKNOWN }, params: { resistance: 10000, position: 0.5 }, supplyVoltage: SUPPLY })
    expect(half).toEqual({ voltage: SUPPLY, current: SUPPLY / (10000 * 0.5) })
  })

  it('T19 — DC à position 1 : WIPER↔RIGHT = cas limite non modélisé (inchangé)', () => {
    const r = contribute({ pins: { left: Signal.UNKNOWN, wiper: Signal.HIGH, right: Signal.LOW }, params: { resistance: 10000, position: 1 }, supplyVoltage: SUPPLY })
    expect(r).toBeNull()
  })
})

describe('FT-C-COMP-003 — T21 : non-régression des autres composants', () => {
  it('LED / LDR / THERMISTOR / CAPACITOR / POLARIZED_CAPACITOR / RGB_LED conservent leurs pins canoniques', () => {
    const EXPECTED = {
      LED: ['anode', 'cathode'],
      LDR: ['A', 'B'],
      THERMISTOR: ['A', 'B'],
      CAPACITOR: ['pinA', 'pinB'],
      POLARIZED_CAPACITOR: ['plus', 'minus'],
      RGB_LED: ['R', 'common', 'G', 'B'],
    }
    for (const [type, ids] of Object.entries(EXPECTED)) {
      expect(getComponentDef(type).pins.map((p) => p.id), type).toEqual(ids)
    }
  })

  it('les dimensions des autres composants raster ne changent pas', () => {
    expect([COMPONENT_TYPES.CAPACITOR.width, COMPONENT_TYPES.CAPACITOR.height]).toEqual([70, 40])
    expect([COMPONENT_TYPES.POLARIZED_CAPACITOR.width, COMPONENT_TYPES.POLARIZED_CAPACITOR.height]).toEqual([33, 120])
    expect([COMPONENT_TYPES.RGB_LED.width, COMPONENT_TYPES.RGB_LED.height]).toEqual([90, 56])
    expect([COMPONENT_TYPES.LDR.width, COMPONENT_TYPES.LDR.height]).toEqual([84, 36])
  })
})
