import { describe, it, expect } from "vitest"
import { getDcContribution, hasDcContribution, getAllDcContributionTypes } from "../dcContributionRegistry.js"
import { Signal } from "../signals.js"

/**
 * MB-SIM-008 v2 — Tests unitaires du Registre de contribution DC (ADR-006).
 *
 * Teste directement les fonctions de contribution, indépendamment de
 * resolveSignals()/prepareCircuit() (couvertes séparément par
 * resolutionDcExtended.test.js pour l'intégration bout en bout).
 */

const SUPPLY = 5

describe("dcContributionRegistry — registre générique", () => {
  it("expose une fonction de contribution pour les 8 types DC attendus", () => {
    const expected = ["RESISTOR", "LDR", "THERMISTOR", "DC_MOTOR", "DIODE", "CAPACITOR", "POTENTIOMETER", "NPN_TRANSISTOR"]
    expect([...getAllDcContributionTypes()].sort()).toEqual([...expected].sort())
    for (const type of expected) {
      expect(hasDcContribution(type)).toBe(true)
      expect(typeof getDcContribution(type)).toBe("function")
    }
  })

  it("retourne null pour un type sans contribution DC (ex: LED, SERVO)", () => {
    expect(getDcContribution("LED")).toBeNull()
    expect(getDcContribution("SERVO")).toBeNull()
    expect(hasDcContribution("LED")).toBe(false)
    expect(hasDcContribution("SERVO")).toBe(false)
  })
})

describe("dcContributionRegistry — DIODE", () => {
  const contribute = getDcContribution("DIODE")
  const params = { forwardVoltage: 0.7, onResistance: 10 }

  it("conduit en polarisation directe (anode HIGH, cathode LOW)", () => {
    const result = contribute({ pins: { anode: Signal.HIGH, cathode: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).not.toBeNull()
    expect(result.voltage).toBe(SUPPLY)
    expect(result.current).toBeCloseTo((SUPPLY - 0.7) / 10, 10)
  })

  it("bloque en polarisation inverse (courant nul, entrée présente)", () => {
    const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: 0 })
  })

  it("ne contribue rien si le composant n'est pas alimenté", () => {
    expect(contribute({ pins: { anode: Signal.UNKNOWN, cathode: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
    expect(contribute({ pins: { anode: Signal.FLOATING, cathode: Signal.LOW }, params, supplyVoltage: SUPPLY })).toBeNull()
  })
})

describe("dcContributionRegistry — DC_MOTOR", () => {
  const contribute = getDcContribution("DC_MOTOR")
  const params = { resistance: 20 }

  it("calcule I = U / R quand alimenté (les deux orientations sont équivalentes)", () => {
    const r1 = contribute({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params, supplyVoltage: SUPPLY })
    const r2 = contribute({ pins: { plus: Signal.LOW, minus: Signal.HIGH }, params, supplyVoltage: SUPPLY })
    expect(r1).toEqual({ voltage: SUPPLY, current: SUPPLY / 20 })
    expect(r2).toEqual({ voltage: SUPPLY, current: SUPPLY / 20 })
  })

  it("ne contribue rien si non alimenté", () => {
    expect(contribute({ pins: { plus: Signal.UNKNOWN, minus: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
  })
})

describe("dcContributionRegistry — CAPACITOR", () => {
  const contribute = getDcContribution("CAPACITOR")
  const params = { capacitance: 0.0001 }

  it("I = 0 en régime DC établi, quelle que soit la polarité, si alimenté", () => {
    expect(contribute({ pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params, supplyVoltage: SUPPLY })).toEqual({ voltage: SUPPLY, current: 0 })
    expect(contribute({ pins: { pinA: Signal.LOW, pinB: Signal.HIGH }, params, supplyVoltage: SUPPLY })).toEqual({ voltage: SUPPLY, current: 0 })
  })

  it("ne contribue rien si non alimenté (pas de circuit ouvert observable)", () => {
    expect(contribute({ pins: { pinA: Signal.UNKNOWN, pinB: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
  })

  it("le paramètre capacitance n'influence jamais le courant DC", () => {
    const a = contribute({ pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params: { capacitance: 1e-12 }, supplyVoltage: SUPPLY })
    const b = contribute({ pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params: { capacitance: 1 }, supplyVoltage: SUPPLY })
    expect(a.current).toBe(0)
    expect(b.current).toBe(0)
  })
})

describe("dcContributionRegistry — POTENTIOMETER", () => {
  const contribute = getDcContribution("POTENTIOMETER")
  const params = { resistance: 10000, position: 0.5 }

  it("LEFT↔RIGHT alimentés : traite la piste complète comme une résistance simple", () => {
    const result = contribute({ pins: { left: Signal.HIGH, wiper: Signal.UNKNOWN, right: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: SUPPLY / 10000 })
  })

  it("LEFT↔WIPER alimentés : utilise resistance × position", () => {
    const result = contribute({ pins: { left: Signal.HIGH, wiper: Signal.LOW, right: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: SUPPLY / (10000 * 0.5) })
  })

  it("WIPER↔RIGHT alimentés : utilise resistance × (1 - position)", () => {
    const result = contribute({ pins: { left: Signal.UNKNOWN, wiper: Signal.HIGH, right: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: SUPPLY / (10000 * 0.5) })
  })

  it("curseur en butée LEFT (position=0) sur LEFT↔WIPER : cas limite non modélisé, aucune entrée", () => {
    const result = contribute({ pins: { left: Signal.HIGH, wiper: Signal.LOW, right: Signal.UNKNOWN }, params: { resistance: 10000, position: 0 }, supplyVoltage: SUPPLY })
    expect(result).toBeNull()
  })

  it("curseur en butée RIGHT (position=1) sur WIPER↔RIGHT : cas limite non modélisé, aucune entrée", () => {
    const result = contribute({ pins: { left: Signal.UNKNOWN, wiper: Signal.HIGH, right: Signal.LOW }, params: { resistance: 10000, position: 1 }, supplyVoltage: SUPPLY })
    expect(result).toBeNull()
  })

  it("ne contribue rien si aucune paire de broches n'est alimentée", () => {
    expect(contribute({ pins: { left: Signal.UNKNOWN, wiper: Signal.UNKNOWN, right: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
  })
})

describe("dcContributionRegistry — NPN_TRANSISTOR", () => {
  const contribute = getDcContribution("NPN_TRANSISTOR")
  const params = { onResistance: 1 }

  it("BASE HIGH + C/E alimentés : conduit, I = U / onResistance", () => {
    const result = contribute({ pins: { collector: Signal.HIGH, base: Signal.HIGH, emitter: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: SUPPLY / 1 })
  })

  it("BASE LOW + C/E alimentés : bloqué, courant nul mais entrée présente", () => {
    const result = contribute({ pins: { collector: Signal.HIGH, base: Signal.LOW, emitter: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: 0 })
  })

  it("BASE UNKNOWN + C/E alimentés : traité comme bloqué (courant nul)", () => {
    const result = contribute({ pins: { collector: Signal.HIGH, base: Signal.UNKNOWN, emitter: Signal.LOW }, params, supplyVoltage: SUPPLY })
    expect(result).toEqual({ voltage: SUPPLY, current: 0 })
  })

  it("collector/emitter non formés en boucle alimentée : aucune entrée (circuit incomplet)", () => {
    const result = contribute({ pins: { collector: Signal.UNKNOWN, base: Signal.HIGH, emitter: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })
    expect(result).toBeNull()
  })
})

describe("dcContributionRegistry — non-mutation des entrées", () => {
  it("ne mute jamais l'objet pins ni l'objet params passés en entrée", () => {
    const pins = Object.freeze({ anode: Signal.HIGH, cathode: Signal.LOW })
    const params = Object.freeze({ forwardVoltage: 0.7, onResistance: 10 })
    expect(() => getDcContribution("DIODE")({ pins, params, supplyVoltage: SUPPLY })).not.toThrow()
  })
})
