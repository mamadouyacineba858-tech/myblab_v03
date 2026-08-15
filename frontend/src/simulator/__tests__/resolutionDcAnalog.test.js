import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { Signal } from "../signals.js"
import { getSimulationDefaultParameters } from "../simulationRegistry.js"

/**
 * MB-SIM-008 — Tests d'intégration du solveur DC pour LDR et THERMISTOR.
 *
 * Modèle DC SIMPLIFIÉ à résistance fixe (aucune dépendance à la lumière ou
 * à la température). Passent exclusivement par resolveSignals(), l'unique
 * API publique de la phase Résolution — aucun import d'une fonction interne
 * (computeDcAnalysis reste privée). Fichier dédié, distinct de
 * resolutionDc.test.js (MB-SIM-007), qui reste inchangé.
 */

function poweredLdrCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const ldr = { uid: "ldr1", type: "LDR", x: 10, y: 0 }
  const components = [power, ldr]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "ldr1", toPin: "A" },
    { fromUid: "ldr1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, ldr }
}

function poweredThermistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const thermistor = { uid: "th1", type: "THERMISTOR", x: 10, y: 0 }
  const components = [power, thermistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "th1", toPin: "A" },
    { fromUid: "th1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, thermistor }
}

describe("MB-SIM-008 - resolveSignals (analyse DC, LDR et THERMISTOR)", () => {
  it("LDR alimenté : calcule I = U / R avec la résistance fixe de LdrModel", () => {
    const { components, wires, ldr } = poweredLdrCircuit()
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(ldr.uid)).toBe(true)
    const result = dcAnalysis.get(ldr.uid)
    expect(result.voltage).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("LDR").resistance)
  })

  it("THERMISTOR alimenté : calcule I = U / R avec la résistance fixe de ThermistorModel", () => {
    const { components, wires, thermistor } = poweredThermistorCircuit()
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(thermistor.uid)).toBe(true)
    const result = dcAnalysis.get(thermistor.uid)
    expect(result.voltage).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("THERMISTOR").resistance)
  })

  it("n'inclut pas une LDR non alimentée (pins non résolues en HIGH/LOW)", () => {
    const ldr = { uid: "ldr_isolated", type: "LDR", x: 0, y: 0 }
    const prepared = prepareCircuit([ldr], [])
    const { pinSignals, dcAnalysis } = resolveSignals([ldr], prepared)
    expect(pinSignals.get("ldr_isolated:A")).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("ldr_isolated:B")).toBe(Signal.UNKNOWN)
    expect(dcAnalysis.has("ldr_isolated")).toBe(false)
  })

  it("n'inclut pas une THERMISTOR non alimentée (pins non résolues en HIGH/LOW)", () => {
    const thermistor = { uid: "th_isolated", type: "THERMISTOR", x: 0, y: 0 }
    const prepared = prepareCircuit([thermistor], [])
    const { pinSignals, dcAnalysis } = resolveSignals([thermistor], prepared)
    expect(pinSignals.get("th_isolated:A")).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("th_isolated:B")).toBe(Signal.UNKNOWN)
    expect(dcAnalysis.has("th_isolated")).toBe(false)
  })

  it("circuit mixte RESISTOR + LDR + THERMISTOR : trois entrées indépendantes, sans interference", () => {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const ldr = { uid: "ldr1", type: "LDR", x: 20, y: 0 }
    const thermistor = { uid: "th1", type: "THERMISTOR", x: 30, y: 0 }
    const components = [power, resistor, ldr, thermistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "ldr1", toPin: "A" },
      { fromUid: "ldr1", fromPin: "B", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "th1", toPin: "A" },
      { fromUid: "th1", fromPin: "B", toUid: "power1", toPin: "GND" },
    ]
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.size).toBe(3)
    const rResult = dcAnalysis.get(resistor.uid)
    expect(rResult.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("RESISTOR").resistance)
    const ldrResult = dcAnalysis.get(ldr.uid)
    expect(ldrResult.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("LDR").resistance)
    const thResult = dcAnalysis.get(thermistor.uid)
    expect(thResult.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("THERMISTOR").resistance)
  })

  it("gère un circuit totalement vide (components=[], wires=[])", () => {
    const prepared = prepareCircuit([], [])
    const { pinSignals, dcAnalysis } = resolveSignals([], prepared)
    expect(pinSignals.size).toBe(0)
    expect(dcAnalysis.size).toBe(0)
  })

  it("ne modifie pas les valeurs de pinSignals par rapport à la propagation logique existante (A1)", () => {
    const { components, wires } = poweredLdrCircuit()
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get("power1:5V")).toBe(Signal.HIGH)
    expect(pinSignals.get("power1:GND")).toBe(Signal.LOW)
    expect(pinSignals.get("ldr1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("ldr1:B")).toBe(Signal.LOW)
  })
})
