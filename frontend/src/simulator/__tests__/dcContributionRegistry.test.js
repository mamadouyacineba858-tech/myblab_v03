import { describe, it, expect } from "vitest"
import { getDcContribution, hasDcContribution, getAllDcContributionTypes, createDiodeDcContribution } from "../dcContributionRegistry.js"
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
  it("expose une fonction de contribution pour les 16 types DC attendus", () => {
    // A6-OUT1 : VIBRATION_MOTOR ajouté (réutilise dcMotorDc, cf. dcContributionRegistry.js).
    // A6-OUT2 : LIGHT_BULB ajouté (réutilise resistorDc, cf. dcContributionRegistry.js).
    // A6-OUT3 : HOBBY_GEARMOTOR ajouté (réutilise dcMotorDc, cf. dcContributionRegistry.js).
    // A7-C1 : TMP36 ajouté (contribution dédiée tmp36Dc, cf. dcContributionRegistry.js).
    // A7-C2 : FORCE_SENSOR + FLEX_SENSOR ajoutés (réutilisent resistorDc, cf. dcContributionRegistry.js).
    // A7-C3 : SOIL_MOISTURE_SENSOR ajouté (contribution dédiée soilMoistureSensorDc, cf. dcContributionRegistry.js).
    const expected = ["RESISTOR", "LDR", "THERMISTOR", "DC_MOTOR", "VIBRATION_MOTOR", "LIGHT_BULB", "HOBBY_GEARMOTOR", "DIODE", "CAPACITOR", "POLARIZED_CAPACITOR", "POTENTIOMETER", "NPN_TRANSISTOR", "TMP36", "FORCE_SENSOR", "FLEX_SENSOR", "SOIL_MOISTURE_SENSOR"]
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

describe("dcContributionRegistry — VIBRATION_MOTOR (A6-OUT1, réutilise dcMotorDc)", () => {
  const contribute = getDcContribution("VIBRATION_MOTOR")
  const params = { resistance: 20 }

  it("est LITTÉRALEMENT la même fonction que DC_MOTOR (aucune copie de la physique)", () => {
    expect(getDcContribution("VIBRATION_MOTOR")).toBe(getDcContribution("DC_MOTOR"))
  })

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

describe("dcContributionRegistry — LIGHT_BULB (A6-OUT2, réutilise resistorDc)", () => {
  const contribute = getDcContribution("LIGHT_BULB")
  const params = { resistance: 20 }

  it("est LITTÉRALEMENT la même fonction que RESISTOR (aucune copie de la physique)", () => {
    expect(getDcContribution("LIGHT_BULB")).toBe(getDcContribution("RESISTOR"))
  })

  it("calcule I = U / R quand alimenté (les deux orientations sont équivalentes — non polarisé)", () => {
    const r1 = contribute({ pins: { A: Signal.HIGH, B: Signal.LOW }, params, supplyVoltage: SUPPLY })
    const r2 = contribute({ pins: { A: Signal.LOW, B: Signal.HIGH }, params, supplyVoltage: SUPPLY })
    expect(r1).toEqual({ voltage: SUPPLY, current: SUPPLY / 20 })
    expect(r2).toEqual({ voltage: SUPPLY, current: SUPPLY / 20 })
  })

  it("ne contribue rien si non alimenté", () => {
    expect(contribute({ pins: { A: Signal.UNKNOWN, B: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
  })
})

describe("dcContributionRegistry — HOBBY_GEARMOTOR (A6-OUT3, réutilise dcMotorDc)", () => {
  const contribute = getDcContribution("HOBBY_GEARMOTOR")
  const params = { resistance: 20 }

  it("est LITTÉRALEMENT la même fonction que DC_MOTOR (aucune copie de la physique, aucun hobbyGearmotorDc)", () => {
    expect(getDcContribution("HOBBY_GEARMOTOR")).toBe(getDcContribution("DC_MOTOR"))
  })

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

describe("dcContributionRegistry — POLARIZED_CAPACITOR (FT-C-COMP-002)", () => {
  const contribute = getDcContribution("POLARIZED_CAPACITOR")
  const params = { capacitance: 0.0001 }

  it("I = 0 en régime DC établi, quelle que soit la polarité, si alimenté (circuit ouvert, identique à CAPACITOR)", () => {
    expect(contribute({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params, supplyVoltage: SUPPLY })).toEqual({ voltage: SUPPLY, current: 0 })
    expect(contribute({ pins: { plus: Signal.LOW, minus: Signal.HIGH }, params, supplyVoltage: SUPPLY })).toEqual({ voltage: SUPPLY, current: 0 })
  })

  it("ne contribue rien si non alimenté (pas de circuit ouvert observable)", () => {
    expect(contribute({ pins: { plus: Signal.UNKNOWN, minus: Signal.UNKNOWN }, params, supplyVoltage: SUPPLY })).toBeNull()
  })

  it("le paramètre capacitance n'influence jamais le courant DC", () => {
    const a = contribute({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params: { capacitance: 1e-12 }, supplyVoltage: SUPPLY })
    const b = contribute({ pins: { plus: Signal.HIGH, minus: Signal.LOW }, params: { capacitance: 1 }, supplyVoltage: SUPPLY })
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

/**
 * A5-D-PREQ — GENERIC REVERSE BREAKDOWN CONTRACT.
 *
 * Qualifie la factory createDiodeDcContribution() par une fixture de test
 * dédiée (§9 du ticket) : AUCUN composant ZENER_DIODE de production n'est
 * introduit ici — reverseBreakdown est activé uniquement sur une instance
 * de test locale à ce fichier.
 */
describe("createDiodeDcContribution — factory générique (A5-D-PREQ)", () => {
  it("T1/T2 — la factory existe et retourne une fonction compatible avec le contrat getDcContribution", () => {
    expect(typeof createDiodeDcContribution).toBe("function")
    const contribute = createDiodeDcContribution({ reverseBreakdown: false })
    expect(typeof contribute).toBe("function")
    expect(
      contribute({ pins: { anode: Signal.HIGH, cathode: Signal.LOW }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: SUPPLY })
    ).toEqual({ voltage: SUPPLY, current: (SUPPLY - 0.7) / 10 })
  })

  it("T5 — aucun second Registry de breakdown n'est exporté par ce module (surface d'export inchangée + factory)", async () => {
    expect(Object.keys(await import("../dcContributionRegistry.js")).sort()).toEqual(
      ["createDiodeDcContribution", "getAllDcContributionTypes", "getDcContribution", "getUnconditionalConductionPinPair", "hasDcContribution"].sort()
    )
  })

  it("T35 — getAllDcContributionTypes() de production ne gagne pas ZENER_DIODE", () => {
    expect(getAllDcContributionTypes()).not.toContain("ZENER_DIODE")
    expect(hasDcContribution("ZENER_DIODE")).toBe(false)
  })
})

describe("A5-D-PREQ — DIODE historique inchangée (T6-T13)", () => {
  const contribute = getDcContribution("DIODE")

  it("T6 — DIODE reste enregistrée", () => {
    expect(hasDcContribution("DIODE")).toBe(true)
  })

  it("T7 — forward : 5V, Vf=0.7V, Ron=10Ω → I = 0.43A", () => {
    const result = contribute({ pins: { anode: Signal.HIGH, cathode: Signal.LOW }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: 5 })
    expect(result.current).toBeCloseTo(0.43, 10)
  })

  it("T8 — reverse : 5V → current = 0", () => {
    const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: 5 })
    expect(result).toEqual({ voltage: 5, current: 0 })
  })

  it("T9 — UNKNOWN/UNKNOWN → null", () => {
    expect(contribute({ pins: { anode: Signal.UNKNOWN, cathode: Signal.UNKNOWN }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: 5 })).toBeNull()
  })

  it("T10 — FLOATING/LOW → null", () => {
    expect(contribute({ pins: { anode: Signal.FLOATING, cathode: Signal.LOW }, params: { forwardVoltage: 0.7, onResistance: 10 }, supplyVoltage: 5 })).toBeNull()
  })

  it("T11/T12 — DIODE ne possède aucun breakdownVoltage/breakdownResistance canonique", async () => {
    const { getCanonicalEntry } = await import("../canonicalRegistry.js")
    const entry = getCanonicalEntry("DIODE")
    const schemaKeys = entry.parameterSchema.map((p) => p.key)
    expect(schemaKeys).not.toContain("breakdownVoltage")
    expect(schemaKeys).not.toContain("breakdownResistance")
    expect(entry.defaultParameters).not.toHaveProperty("breakdownVoltage")
    expect(entry.defaultParameters).not.toHaveProperty("breakdownResistance")
  })
})

describe("A5-D-PREQ — fixture breakdown-enabled (T14-T20)", () => {
  const contribute = createDiodeDcContribution({ reverseBreakdown: true })
  const params = { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 }

  it("T14 — forward reste identique (5V → 0.43A)", () => {
    const result = contribute({ pins: { anode: Signal.HIGH, cathode: Signal.LOW }, params, supplyVoltage: 5 })
    expect(result.current).toBeCloseTo(0.43, 10)
  })

  it("T15 — reverse sous le seuil (5V < 5.1V) → current = 0", () => {
    const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: 5 })
    expect(result).toEqual({ voltage: 5, current: 0 })
  })

  it("T16 — reverse exactement au seuil (5.1V) → current = 0", () => {
    const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: 5.1 })
    expect(result).toEqual({ voltage: 5.1, current: 0 })
  })

  it("T17 — reverse au-dessus du seuil (6.1V) → I = 0.1A", () => {
    const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: 6.1 })
    expect(result.current).toBeCloseTo(0.1, 10)
  })

  it("T18 — tension reverse plus élevée → courant breakdown plus élevé", () => {
    const lower = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: 6.1 })
    const higher = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: 8.1 })
    expect(higher.current).toBeGreaterThan(lower.current)
  })

  it("T19/T20 — courant breakdown toujours fini et >= 0", () => {
    for (const v of [5.1, 6.1, 8.1, 100]) {
      const result = contribute({ pins: { anode: Signal.LOW, cathode: Signal.HIGH }, params, supplyVoltage: v })
      expect(Number.isFinite(result.current)).toBe(true)
      expect(result.current).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("A5-D-PREQ — paramètres breakdown invalides (T21-T26)", () => {
  const contribute = createDiodeDcContribution({ reverseBreakdown: true })
  const reversePins = { anode: Signal.LOW, cathode: Signal.HIGH }

  it("T21 — breakdownResistance = 0 → aucun NaN/Infinity, reste bloquée", () => {
    const result = contribute({ pins: reversePins, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 0 }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
  })

  it("T22 — breakdownResistance < 0 → aucun NaN/Infinity, reste bloquée", () => {
    const result = contribute({ pins: reversePins, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: -10 }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
  })

  it("T23 — breakdownResistance = undefined → aucun NaN/Infinity, reste bloquée", () => {
    const result = contribute({ pins: reversePins, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: undefined }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
  })

  it("T24 — breakdownVoltage = undefined → aucun breakdown artificiel", () => {
    const result = contribute({ pins: reversePins, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: undefined, breakdownResistance: 10 }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
  })

  it("T25 — breakdownVoltage = NaN → aucun breakdown artificiel", () => {
    const result = contribute({ pins: reversePins, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: NaN, breakdownResistance: 10 }, supplyVoltage: 6.1 })
    expect(result).toEqual({ voltage: 6.1, current: 0 })
  })

  it("T26 — configuration breakdown invalide n'altère pas la conduction directe", () => {
    const result = contribute({ pins: { anode: Signal.HIGH, cathode: Signal.LOW }, params: { forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: NaN, breakdownResistance: 0 }, supplyVoltage: 5 })
    expect(result.current).toBeCloseTo(0.43, 10)
  })
})

describe("A5-D-PREQ — non-mutation / architecture (T27-T34)", () => {
  it("T27/T28 — pins et params ne sont jamais mutés par le contributeur breakdown-enabled", () => {
    const contribute = createDiodeDcContribution({ reverseBreakdown: true })
    const pins = Object.freeze({ anode: Signal.LOW, cathode: Signal.HIGH })
    const params = Object.freeze({ forwardVoltage: 0.7, onResistance: 10, breakdownVoltage: 5.1, breakdownResistance: 10 })
    expect(() => contribute({ pins, params, supplyVoltage: 6.1 })).not.toThrow()
  })

  it("T3/T4/T32-T34 — aucune connaissance de ZENER_DIODE dans resolution.js ni les moteurs génériques, aucun asset/renderer Zener créé par ce ticket", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const { fileURLToPath } = await import("node:url")
    const dir = path.dirname(fileURLToPath(import.meta.url))
    const protectedFiles = [
      "../resolution.js",
      "../simulationRuntimeIntegration.js",
      "../electricalAnalysis.js",
      "../engine.js",
      "../scheduler.js",
      "../transientContributionRegistry.js",
      "../canonicalRegistry.js",
    ]
    for (const rel of protectedFiles) {
      const source = fs.readFileSync(path.join(dir, rel), "utf-8")
      expect(source, `${rel} ne devrait pas mentionner ZENER_DIODE`).not.toMatch(/ZENER_DIODE/)
    }
  })
})
