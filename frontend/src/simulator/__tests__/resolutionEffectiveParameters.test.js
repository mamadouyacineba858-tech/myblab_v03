import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { getSimulationDefaultParameters } from "../simulationRegistry.js"

/**
 * MB-L1-CVE-001 (§13/§14, TEST T16-T19) — preuve que computeDcAnalysis()
 * consomme désormais les paramètres EFFECTIFS de l'instance
 * (component.parameters), et non plus uniquement les defaults canoniques.
 * Passe exclusivement par resolveSignals(), l'unique API publique de la
 * phase Résolution — même patron que resolutionDcExtended.test.js.
 */
function poweredCircuit(compType, pinFrom, pinTo, parameters, powerParameters) {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0, ...(powerParameters ? { parameters: powerParameters } : {}) }
  const comp = { uid: "c1", type: compType, x: 10, y: 0, ...(parameters ? { parameters } : {}) }
  const components = [power, comp]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "c1", toPin: pinFrom },
    { fromUid: "c1", fromPin: pinTo, toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, comp }
}

describe("MB-L1-CVE-001 — TEST T16 : RESISTOR consomme la résistance d'instance (I = U / R)", () => {
  it("R=220 (défaut, aucun override) et R=1000 (override d'instance) produisent des courants différents, tous deux = U/R", () => {
    const voltage = getSimulationDefaultParameters("POWER").voltage

    const withDefault = poweredCircuit("RESISTOR", "A", "B")
    const { dcAnalysis: dcDefault } = resolveSignals(withDefault.components, prepareCircuit(withDefault.components, withDefault.wires))
    expect(dcDefault.get("c1").current).toBeCloseTo(voltage / 220, 10)

    const withOverride = poweredCircuit("RESISTOR", "A", "B", { resistance: 1000 })
    const { dcAnalysis: dcOverride } = resolveSignals(withOverride.components, prepareCircuit(withOverride.components, withOverride.wires))
    expect(dcOverride.get("c1").current).toBeCloseTo(voltage / 1000, 10)

    expect(dcOverride.get("c1").current).not.toBeCloseTo(dcDefault.get("c1").current, 10)
  })

  it("une valeur d'instance invalide (hors range) retombe silencieusement sur le default canonique, jamais sur NaN/Infinity", () => {
    const { components, wires } = poweredCircuit("RESISTOR", "A", "B", { resistance: -5 })
    const { dcAnalysis } = resolveSignals(components, prepareCircuit(components, wires))
    const voltage = getSimulationDefaultParameters("POWER").voltage
    expect(dcAnalysis.get("c1").current).toBeCloseTo(voltage / 220, 10)
  })
})

describe("MB-L1-CVE-001 — TEST T17 : POWER consomme la tension d'instance (déjà correct avant ce ticket, reconfirmé)", () => {
  it("POWER { voltage: 12 } → RESISTOR (défaut 220) : courant = 12/220, pas 5/220", () => {
    const { components, wires } = poweredCircuit("RESISTOR", "A", "B", undefined, { voltage: 12 })
    const { dcAnalysis } = resolveSignals(components, prepareCircuit(components, wires))
    expect(dcAnalysis.get("c1").current).toBeCloseTo(12 / 220, 10)
  })
})

describe("MB-L1-CVE-001 — TEST T18 : POTENTIOMETER consomme sa position d'instance", () => {
  it("position 0.5 (défaut) et position 0.75 (override) produisent des contributions DC différentes sur LEFT↔WIPER", () => {
    const voltage = getSimulationDefaultParameters("POWER").voltage
    const resistance = getSimulationDefaultParameters("POTENTIOMETER").resistance

    const atDefault = poweredCircuit("POTENTIOMETER", "left", "wiper")
    const { dcAnalysis: dcDefault } = resolveSignals(atDefault.components, prepareCircuit(atDefault.components, atDefault.wires))
    expect(dcDefault.get("c1").current).toBeCloseTo(voltage / (resistance * 0.5), 10)

    const at075 = poweredCircuit("POTENTIOMETER", "left", "wiper", { position: 0.75 })
    const { dcAnalysis: dc075 } = resolveSignals(at075.components, prepareCircuit(at075.components, at075.wires))
    expect(dc075.get("c1").current).toBeCloseTo(voltage / (resistance * 0.75), 10)

    expect(dc075.get("c1").current).not.toBeCloseTo(dcDefault.get("c1").current, 10)
  })

  it("Undo/Redo simulés par ré-résolution successive : 0.5 -> 0.75 -> 0.5 -> 0.75 restent physiquement cohérents à chaque étape", () => {
    const voltage = getSimulationDefaultParameters("POWER").voltage
    const resistance = getSimulationDefaultParameters("POTENTIOMETER").resistance
    const currentFor = (position) => {
      const { components, wires } = poweredCircuit("POTENTIOMETER", "left", "wiper", position ? { position } : undefined)
      return resolveSignals(components, prepareCircuit(components, wires)).dcAnalysis.get("c1").current
    }
    expect(currentFor(undefined)).toBeCloseTo(voltage / (resistance * 0.5), 10) // 0.5 (défaut)
    expect(currentFor(0.75)).toBeCloseTo(voltage / (resistance * 0.75), 10)     // -> 0.75
    expect(currentFor(undefined)).toBeCloseTo(voltage / (resistance * 0.5), 10) // Undo -> 0.5
    expect(currentFor(0.75)).toBeCloseTo(voltage / (resistance * 0.75), 10)     // Redo -> 0.75
  })
})

describe("MB-L1-CVE-001 — TEST T19 : CAPACITOR reste circuit ouvert en régime DC établi, quelle que soit capacitance", () => {
  it("capacitance modifiée (défaut 0.0001F -> 0.01F) : current reste 0 (aucune physique transitoire inventée, CV-17)", () => {
    const atDefault = poweredCircuit("CAPACITOR", "pinA", "pinB")
    const { dcAnalysis: dcDefault } = resolveSignals(atDefault.components, prepareCircuit(atDefault.components, atDefault.wires))
    expect(dcDefault.get("c1").current).toBe(0)

    const atOverride = poweredCircuit("CAPACITOR", "pinA", "pinB", { capacitance: 0.01 })
    const { dcAnalysis: dcOverride } = resolveSignals(atOverride.components, prepareCircuit(atOverride.components, atOverride.wires))
    expect(dcOverride.get("c1").current).toBe(0)
  })
})
