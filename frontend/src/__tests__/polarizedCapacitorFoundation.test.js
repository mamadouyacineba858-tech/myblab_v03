/**
 * polarizedCapacitorFoundation.test.js — FT-C-COMP-002
 *
 * Contrat de fondation du NOUVEAU composant POLARIZED_CAPACITOR (condensateur
 * électrolytique radial polarisé). Vérifie la cohérence des identités
 * canoniques `plus` / `minus` de bout en bout — Registry ↔ Presentation ↔
 * PhysicalContacts ↔ AssemblyProfile — et la non-régression du CAPACITOR
 * céramique (non polarisé, pinA/pinB).
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
  createComponent,
} from '../config/componentDefinitions.js'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'
import { getSimulationModel, getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'

describe('FT-C-COMP-002 — POLARIZED_CAPACITOR : type canonique', () => {
  it('T1 — est un type canonique valide et distinct', () => {
    expect(hasCanonicalType('POLARIZED_CAPACITOR')).toBe(true)
    expect(getAllCanonicalTypes()).toContain('POLARIZED_CAPACITOR')
    expect(getCanonicalEntry('POLARIZED_CAPACITOR').type).toBe('POLARIZED_CAPACITOR')
  })

  it('T2 — pins canoniques exactement [plus, minus]', () => {
    expect(getCanonicalEntry('POLARIZED_CAPACITOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(getComponentDef('POLARIZED_CAPACITOR').pins.map((p) => p.id)).toEqual(['plus', 'minus'])
  })

  it('T3 — capacitance par défaut = 0.0001 F (mécanisme déclaratif existant)', () => {
    expect(getCanonicalEntry('POLARIZED_CAPACITOR').defaultParameters).toEqual({ capacitance: 0.0001 })
    expect(getSimulationDefaultParameters('POLARIZED_CAPACITOR')).toEqual({ capacitance: 0.0001 })
    expect(createComponent('POLARIZED_CAPACITOR', 0, 0).type).toBe('POLARIZED_CAPACITOR')
  })

  it('T4 — présent dans la palette avec un libellé distinct de « Condensateur »', () => {
    const item = PALETTE_ITEMS.find((i) => i.id === 'POLARIZED_CAPACITOR')
    expect(item).toBeTruthy()
    expect(item.label).toBe('Condensateur polarisé')
    expect(item.label).not.toBe(COMPONENT_TYPES.CAPACITOR.label)
    expect(COMPONENT_TYPES.CAPACITOR.label).toBe('Condensateur')
  })
})

describe('FT-C-COMP-002 — PhysicalContacts plus/minus', () => {
  const def = getComponentDef('POLARIZED_CAPACITOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('T6 — exactement un PhysicalContact par pin (deux au total)', () => {
    expect(resolveContacts(byPin.plus)).toHaveLength(1)
    expect(resolveContacts(byPin.minus)).toHaveLength(1)
  })

  it('T7 — plus/minus sont wireConnectable', () => {
    expect(resolveWireConnectableContacts(byPin.plus)).toHaveLength(1)
    expect(resolveWireConnectableContacts(byPin.minus)).toHaveLength(1)
  })

  it('T8 — plus/minus sont breadboardInsertable', () => {
    expect(resolveBreadboardInsertableContacts(byPin.plus)).toHaveLength(1)
    expect(resolveBreadboardInsertableContacts(byPin.minus)).toHaveLength(1)
  })

  it('T9 — les contact.id coïncident avec les identités électriques canoniques plus/minus', () => {
    expect(resolveContacts(byPin.plus)[0].id).toBe('plus')
    expect(resolveContacts(byPin.minus)[0].id).toBe('minus')
  })

  it('les deux contacts partagent le même dy et sont espacés d\'un multiple exact de BREADBOARD_PITCH (enfichable proprement)', () => {
    const plus = resolveContacts(byPin.plus)[0]
    const minus = resolveContacts(byPin.minus)[0]
    expect(plus.dy).toBe(minus.dy)
    const spacing = Math.abs(plus.dx - minus.dx)
    expect(spacing % BREADBOARD_PITCH).toBe(0)
    expect(spacing).toBeGreaterThan(0)
  })
})

describe('FT-C-COMP-002 — AssemblyProfile', () => {
  it('T10 — profil through-hole avec EXACTEMENT les leads plus/minus', () => {
    const profile = getAssemblyProfile('POLARIZED_CAPACITOR')
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('through-hole')
    expect(Object.keys(profile.leads).sort()).toEqual(['minus', 'plus'])
    for (const id of ['plus', 'minus']) {
      expect(Number.isFinite(profile.leads[id].root.dx)).toBe(true)
      expect(Number.isFinite(profile.leads[id].root.dy)).toBe(true)
    }
  })

  it('bodyClip.bottom est déclaré (le raster porte des pattes cuites à masquer)', () => {
    expect(getAssemblyProfile('POLARIZED_CAPACITOR').bodyClip.bottom).toBeGreaterThan(0)
  })
})

describe('FT-C-COMP-002 — modèle de simulation DC', () => {
  it('T11 — un modèle DC est réellement raccordé (modelAvailable ne ment pas)', () => {
    expect(getCanonicalEntry('POLARIZED_CAPACITOR').modelAvailable).toBe(true)
    const model = getSimulationModel('POLARIZED_CAPACITOR')
    expect(model.type).toBe('POLARIZED_CAPACITOR')
    expect(model.validate({ capacitance: 0.0001 })).toBe(true)
    expect(model.validate({ capacitance: -1 })).toBe(false)
    expect(model.validate({})).toBe(false)
  })
})

describe('FT-C-COMP-002 — non-régression', () => {
  it('T12 — CAPACITOR historique : pinA/pinB, aucune borne + / −, non polarisé', () => {
    const pins = getComponentDef('CAPACITOR').pins.map((p) => p.id)
    expect(pins).toEqual(['pinA', 'pinB'])
    expect(pins).not.toContain('plus')
    expect(pins).not.toContain('minus')
    expect(getCanonicalEntry('CAPACITOR').pins.map((p) => p.id)).toEqual(['pinA', 'pinB'])
    // dimensions et modèle inchangés
    expect([getComponentDef('CAPACITOR').width, getComponentDef('CAPACITOR').height]).toEqual([70, 40])
    expect(getCanonicalEntry('CAPACITOR').defaultParameters).toEqual({ capacitance: 0.0001 })
  })

  it('T13 — les composants déjà validés conservent leurs pins canoniques', () => {
    const EXPECTED = {
      LED: ['anode', 'cathode'],
      RESISTOR: ['A', 'B'],
      DIODE: ['anode', 'cathode'],
      THERMISTOR: ['A', 'B'],
      LDR: ['A', 'B'],
      RGB_LED: ['R', 'common', 'G', 'B'],
      NPN_TRANSISTOR: ['collector', 'base', 'emitter'],
      POTENTIOMETER: ['left', 'wiper', 'right'],
    }
    for (const [type, ids] of Object.entries(EXPECTED)) {
      expect(getComponentDef(type).pins.map((p) => p.id), type).toEqual(ids)
    }
  })

  it('POLARIZED_CAPACITOR est bien un AJOUT (20 types) sans retrait', () => {
    expect(getAllCanonicalTypes()).toHaveLength(20)
    for (const t of ['LED', 'RESISTOR', 'CAPACITOR', 'DIODE', 'RGB_LED', 'NPN_TRANSISTOR', 'POWER', 'BATTERY_9V']) {
      expect(hasCanonicalType(t), t).toBe(true)
    }
  })
})
