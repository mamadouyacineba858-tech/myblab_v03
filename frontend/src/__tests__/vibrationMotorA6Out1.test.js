import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  getCanonicalEntry, hasCanonicalType, getAllCanonicalTypes,
} from '../simulator/canonicalRegistry.js'
import { resolveComponentParameters } from '../simulator/resolveComponentParameters.js'
import {
  getDcContribution, hasDcContribution,
} from '../simulator/dcContributionRegistry.js'
import { getSimulationModel, isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { resolveSignals } from '../simulator/resolution.js'
import { COMPONENT_TYPES, PALETTE_ITEMS, getComponentDef, createComponent } from '../config/componentDefinitions.js'
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from '../visualization/defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../visualization/factory.js'
import {
  resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts,
} from '../utils/contactModel.js'
import { SCALE_REFERENCE } from '../visualization/visualContract.js'
import { ReactDocumentMapper } from '../bridge/ReactDocumentMapper.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * vibrationMotorA6Out1.test.js — Ticket A6-OUT1 (Vibration Motor).
 *
 * Couvre T1-T25 du ticket. VIBRATION_MOTOR est ajouté au catalogue par
 * RÉUTILISATION DE LA FAMILLE DC_MOTOR (roadmap A6 : "aucune duplication du
 * moteur DC") : même contrat électrique (resistiveTwoTerminalDc, I = U / R),
 * même fonction de contribution DC (dcMotorDc, référence PARTAGÉE — jamais
 * une fonction "vibrationMotorDc" copiée), présentation CSS/DOM distincte
 * (VibrationMotorPart.jsx, aucun asset raster Founder-approved encore
 * disponible).
 */

function poweredCircuit(type, pinFrom, pinTo) {
  const power = { uid: 'power1', type: 'POWER', x: 0, y: 0 }
  const comp = { uid: 'c1', type, x: 10, y: 0 }
  const components = [power, comp]
  const wires = [
    { fromUid: 'power1', fromPin: '5V', toUid: 'c1', toPin: pinFrom },
    { fromUid: 'c1', fromPin: pinTo, toUid: 'power1', toPin: 'GND' },
  ]
  return { components, wires, comp }
}

describe('A6-OUT1 — T1-T6 : contrat canonique', () => {
  it('T1 : VIBRATION_MOTOR existe dans le Registry canonique', () => {
    expect(hasCanonicalType('VIBRATION_MOTOR')).toBe(true)
    expect(getAllCanonicalTypes()).toContain('VIBRATION_MOTOR')
    expect(getCanonicalEntry('VIBRATION_MOTOR')).not.toBeNull()
  })

  it('T2 : pins exactement plus/minus', () => {
    const entry = getCanonicalEntry('VIBRATION_MOTOR')
    expect(entry.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
  })

  it('T3 : parameterSchema resistance valide', () => {
    const entry = getCanonicalEntry('VIBRATION_MOTOR')
    expect(entry.parameterSchema).toHaveLength(1)
    const [schema] = entry.parameterSchema
    expect(schema.key).toBe('resistance')
    expect(schema.parameterType).toBe('resistance')
    expect(schema.unit).toBe('Ω')
    expect(schema.minimum).toBeLessThanOrEqual(schema.defaultValue)
    expect(schema.maximum).toBeGreaterThanOrEqual(schema.defaultValue)
  })

  it('T4 : defaultParameters normalisés (résolution générique via resolveComponentParameters)', () => {
    expect(getCanonicalEntry('VIBRATION_MOTOR').defaultParameters).toEqual({ resistance: 20 })
    expect(resolveComponentParameters('VIBRATION_MOTOR', undefined)).toEqual({ resistance: 20 })
    expect(resolveComponentParameters('VIBRATION_MOTOR', { resistance: 500 })).toEqual({ resistance: 500 })
    // Valeur invalide (hors bornes) -> repli silencieux sur le default canonique.
    expect(resolveComponentParameters('VIBRATION_MOTOR', { resistance: -1 })).toEqual({ resistance: 20 })
  })

  it('T5 : capabilities inclut "dc"', () => {
    expect(getCanonicalEntry('VIBRATION_MOTOR').capabilities).toEqual(['digital', 'dc'])
  })

  it('T6 : modelAvailable === true', () => {
    expect(getCanonicalEntry('VIBRATION_MOTOR').modelAvailable).toBe(true)
  })

  it('même schéma/valeur par défaut que DC_MOTOR (réutilisation documentée, §6 du ticket)', () => {
    const motor = getCanonicalEntry('DC_MOTOR')
    const vibration = getCanonicalEntry('VIBRATION_MOTOR')
    expect(vibration.parameterSchema[0].defaultValue).toBe(motor.parameterSchema[0].defaultValue)
    expect(vibration.parameterSchema[0].minimum).toBe(motor.parameterSchema[0].minimum)
    expect(vibration.parameterSchema[0].maximum).toBe(motor.parameterSchema[0].maximum)
    expect(vibration.capabilities).toEqual(motor.capabilities)
  })
})

describe('A6-OUT1 — T7-T9 : contrat catalogue (composition)', () => {
  it('T7 : présent dans COMPONENT_TYPES', () => {
    expect(COMPONENT_TYPES.VIBRATION_MOTOR).toBeDefined()
    expect(COMPONENT_TYPES.VIBRATION_MOTOR.id).toBe('VIBRATION_MOTOR')
    expect(getComponentDef('VIBRATION_MOTOR')).toBe(COMPONENT_TYPES.VIBRATION_MOTOR)
  })

  it('T8 : présent dans PALETTE_ITEMS exactement une fois', () => {
    const occurrences = PALETTE_ITEMS.filter((item) => item.id === 'VIBRATION_MOTOR')
    expect(occurrences).toHaveLength(1)
  })

  it('T9 : createComponent("VIBRATION_MOTOR", x, y) fonctionne', () => {
    const comp = createComponent('VIBRATION_MOTOR', 12, 34)
    expect(comp).not.toBeNull()
    expect(comp.type).toBe('VIBRATION_MOTOR')
    expect(comp.x).toBe(12)
    expect(comp.y).toBe(34)
    expect(comp.pins.map((p) => p.id)).toEqual(['plus', 'minus'])
    expect(typeof comp.uid).toBe('string')
    expect(comp.uid.length).toBeGreaterThan(0)
  })
})

describe('A6-OUT1 — T10-T11 : contacts physiques', () => {
  it('T10 : deux contacts physiques, câblables (wireConnectable)', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    expect(def.pins).toHaveLength(2)
    for (const pin of def.pins) {
      const contacts = resolveContacts(pin)
      expect(contacts).toHaveLength(1)
      expect(contacts[0].wireConnectable).toBe(true)
      expect(resolveWireConnectableContacts(pin)).toHaveLength(1)
    }
  })

  it('T11 : breadboardInsertable reste false (aucune géométrie enfichable démontrée)', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    for (const pin of def.pins) {
      expect(resolveBreadboardInsertableContacts(pin)).toHaveLength(0)
      expect(resolveContacts(pin)[0].breadboardInsertable).toBe(false)
    }
  })
})

describe('A6-OUT1 — T12-T13 : présentation (VisualizationManager, PartRenderer)', () => {
  it('T12 : renderer enregistré via VisualizationManager / DEFAULT_REGISTRATIONS', () => {
    expect(getComponentByType('VIBRATION_MOTOR')).not.toBeNull()
    expect(DEFAULT_REGISTRATIONS.some((entry) => entry.type === 'VIBRATION_MOTOR')).toBe(true)
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    const element = manager.render('VIBRATION_MOTOR', {})
    expect(element).not.toBeNull()
  })

  it('présentation : CSS/DOM (backend svg par défaut, bareBody + markerless), pas raster', () => {
    const presentation = getComponentPresentation('VIBRATION_MOTOR')
    expect(presentation.backend).toBe('svg')
    expect(presentation.bareBody).toBe(true)
    expect(presentation.markerless).toBe(true)
  })

  it('T13 : PartRenderer.jsx ne contient AUCUNE référence littérale à VIBRATION_MOTOR (aucune modification nécessaire, délégation générique)', () => {
    const src = readFileSync(resolve(__dirname, '../components/parts/PartRenderer.jsx'), 'utf-8')
    expect(src).not.toMatch(/VIBRATION_MOTOR/)
  })
})

describe('A6-OUT1 — T14-T16 : contribution DC via le contrat générique', () => {
  it('T14 : VIBRATION_MOTOR reçoit une contribution DC via resolveSignals (pipeline réel, pas un appel direct)', () => {
    const { components, wires, comp } = poweredCircuit('VIBRATION_MOTOR', 'plus', 'minus')
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
  })

  it('T15 : même U/R -> même loi I = U/R que DC_MOTOR (contrat électrique identique)', () => {
    const vibration = poweredCircuit('VIBRATION_MOTOR', 'plus', 'minus')
    const motor = poweredCircuit('DC_MOTOR', 'plus', 'minus')

    const vibrationAnalysis = resolveSignals(vibration.components, prepareCircuit(vibration.components, vibration.wires)).dcAnalysis
    const motorAnalysis = resolveSignals(motor.components, prepareCircuit(motor.components, motor.wires)).dcAnalysis

    const vibrationResult = vibrationAnalysis.get(vibration.comp.uid)
    const motorResult = motorAnalysis.get(motor.comp.uid)

    expect(vibrationResult).toEqual(motorResult)
    expect(vibrationResult.current).toBe(getSimulationDefaultParameters('POWER').voltage / getSimulationDefaultParameters('VIBRATION_MOTOR').resistance)
    expect(vibrationResult.current).toBe(getSimulationDefaultParameters('POWER').voltage / getSimulationDefaultParameters('DC_MOTOR').resistance)
  })

  it('T16 : circuit non alimenté -> aucune contribution artificielle', () => {
    const isolated = { uid: 'v_isolated', type: 'VIBRATION_MOTOR', x: 0, y: 0 }
    const prepared = prepareCircuit([isolated], [])
    const { dcAnalysis } = resolveSignals([isolated], prepared)
    expect(dcAnalysis.has('v_isolated')).toBe(false)
  })
})

describe('A6-OUT1 — T17 : DC_MOTOR conserve son comportement historique EXACT (non-régression)', () => {
  it('DC_MOTOR alimenté : I = U/R inchangé (defaultValue 20 Ω, même pipeline qu\'avant ce ticket)', () => {
    const { components, wires, comp } = poweredCircuit('DC_MOTOR', 'plus', 'minus')
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
    const result = dcAnalysis.get(comp.uid)
    expect(result).toEqual({ voltage: 5, current: 5 / 20 })
    expect(getSimulationDefaultParameters('DC_MOTOR')).toEqual({ resistance: 20 })
  })

  it('DC_MOTOR non alimenté : aucune entrée dcAnalysis (comportement inchangé)', () => {
    const motor = { uid: 'm_isolated', type: 'DC_MOTOR', x: 0, y: 0 }
    const prepared = prepareCircuit([motor], [])
    const { dcAnalysis } = resolveSignals([motor], prepared)
    expect(dcAnalysis.has('m_isolated')).toBe(false)
  })

  it('DC_MOTOR : présentation, pins et contacts physiques strictement inchangés', () => {
    const def = getComponentDef('DC_MOTOR')
    expect([def.width, def.height]).toEqual([84, 50])
    const plus = def.pins.find((p) => p.id === 'plus')
    const minus = def.pins.find((p) => p.id === 'minus')
    expect([plus.dx, plus.dy]).toEqual([0, 25])
    expect([minus.dx, minus.dy]).toEqual([84, 25])
    expect(getComponentByType('DC_MOTOR')).not.toBeNull()
    expect(getComponentPresentation('DC_MOTOR').backend).toBe('raster')
  })
})

describe('A6-OUT1 — T18-T19 : preuve anti-duplication', () => {
  it('T18 : aucune branche VIBRATION_MOTOR dans resolution.js (résolution générique, ADR-006)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/resolution.js'), 'utf-8')
    expect(src).not.toMatch(/VIBRATION_MOTOR/)
    expect(src).not.toMatch(/\.type\s*===\s*["']VIBRATION_MOTOR["']/)
  })

  it('T19a : aucune fonction "vibrationMotorDc" dans dcContributionRegistry.js (pas de copie de dcMotorDc)', () => {
    const src = readFileSync(resolve(__dirname, '../simulator/dcContributionRegistry.js'), 'utf-8')
    expect(src).not.toMatch(/function\s+vibrationMotorDc/)
  })

  it('T19b : VIBRATION_MOTOR et DC_MOTOR pointent vers LA MÊME référence de fonction de contribution (réutilisation réelle, pas une coïncidence de comportement)', () => {
    expect(hasDcContribution('VIBRATION_MOTOR')).toBe(true)
    expect(getDcContribution('VIBRATION_MOTOR')).toBe(getDcContribution('DC_MOTOR'))
  })
})

describe('A6-OUT1 — T20 : cohérence des registres déclaratifs (couvert génériquement par componentLibraryRolloutGate.test.js, vérifié ici explicitement pour VIBRATION_MOTOR)', () => {
  it('VIBRATION_MOTOR : présent et cohérent dans les 4 registres déclaratifs (canonique / composition / visualisation / contribution DC)', () => {
    expect(hasCanonicalType('VIBRATION_MOTOR')).toBe(true)
    expect(COMPONENT_TYPES.VIBRATION_MOTOR).toBeDefined()
    expect(DEFAULT_REGISTRATIONS.some((e) => e.type === 'VIBRATION_MOTOR')).toBe(true)
    expect(hasDcContribution('VIBRATION_MOTOR')).toBe(true)
  })

  it('VIBRATION_MOTOR : modèle exécutable (5e registre, simulationRegistry.js) résolu sans throw, identité cohérente', () => {
    expect(isSimulationModelAvailable('VIBRATION_MOTOR')).toBe(true)
    expect(() => getSimulationModel('VIBRATION_MOTOR')).not.toThrow()
    expect(getSimulationModel('VIBRATION_MOTOR').type).toBe('VIBRATION_MOTOR')
  })
})

describe('A6-OUT1 — T21 : round-trip Document (Core <-> React) préserve le composant', () => {
  it('toReact(toCore(reactDoc)) préserve type, position et paramètres de VIBRATION_MOTOR', () => {
    const reactDoc = {
      components: [{ uid: 'vm1', type: 'VIBRATION_MOTOR', x: 5, y: 9, parameters: { resistance: 30 }, pins: [] }],
      wires: [],
    }
    const coreDoc = ReactDocumentMapper.toCore(reactDoc)
    const roundTripped = ReactDocumentMapper.toReact(coreDoc)
    expect(roundTripped.components).toHaveLength(1)
    expect(roundTripped.components[0]).toMatchObject({ uid: 'vm1', type: 'VIBRATION_MOTOR', x: 5, y: 9 })
    expect(roundTripped.components[0].parameters).toEqual({ resistance: 30 })
  })
})

describe('A6-OUT1 — T22 : connectivité fil (wire) accepte plus/minus', () => {
  it('les deux contacts physiques plus/minus sont wireConnectable (pré-requis AddWireHandler / useCircuitState)', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    for (const pinId of ['plus', 'minus']) {
      const pin = def.pins.find((p) => p.id === pinId)
      expect(pin).toBeDefined()
      expect(pin.wireConnectable).toBe(true)
    }
  })

  it('un fil POWER -> VIBRATION_MOTOR.plus / VIBRATION_MOTOR.minus -> POWER se résout (pipeline réel)', () => {
    const { components, wires } = poweredCircuit('VIBRATION_MOTOR', 'plus', 'minus')
    const prepared = prepareCircuit(components, wires)
    expect(() => resolveSignals(components, prepared)).not.toThrow()
  })
})

describe('A6-OUT1 — T23 : dimensions cohérentes', () => {
  it('componentDefinitions.js width/height > 0 et cohérentes avec SCALE_REFERENCE (visualContract.js)', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    expect(def.width).toBeGreaterThan(0)
    expect(def.height).toBeGreaterThan(0)
    const row = SCALE_REFERENCE.find((e) => e.type === 'VIBRATION_MOTOR')
    expect(row).toBeDefined()
    expect(row.box).toEqual([def.width, def.height])
  })

  it('les deux contacts électriques restent DANS la boîte canonique (aucune coordonnée hors-cadre)', () => {
    const def = getComponentDef('VIBRATION_MOTOR')
    for (const pin of def.pins) {
      expect(pin.dx).toBeGreaterThanOrEqual(0)
      expect(pin.dx).toBeLessThanOrEqual(def.width)
      expect(pin.dy).toBeGreaterThanOrEqual(0)
      expect(pin.dy).toBeLessThanOrEqual(def.height)
    }
  })
})

// T24 (production build passe) et T25 (git diff --check propre) ne sont pas
// des tests unitaires exécutables ici : ils sont vérifiés séparément par
// `npm run build` et `git diff --check` (cf. rapport de livraison du ticket).
