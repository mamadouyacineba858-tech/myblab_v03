import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { Signal } from "../signals.js"
import { getSimulationDefaultParameters } from "../simulationRegistry.js"

/**
 * MB-SIM-007 — Tests du solveur DC.
 *
 * Passent exclusivement par resolveSignals(), l'unique API publique de la
 * phase Résolution (aucun import d'une fonction interne, conformément à
 * l'arbitrage : resolveDc/computeDcAnalysis reste privée). Aucun passage
 * par React, par le Bridge, ou par le Document Core : appel direct des
 * fonctions du moteur (preparation.js / resolution.js).
 */

function simplePoweredResistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }

  const components = [power, resistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
    { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]

  return { components, wires, power, resistor }
}

describe("MB-SIM-007 - resolveSignals (analyse DC)", () => {
  it("calcule I = U / R pour POWER -> RESISTOR (U=5V, R=220Ω → I≈22,7mA)", () => {
    const { components, wires, resistor } = simplePoweredResistorCircuit()
    const prepared = prepareCircuit(components, wires)

    const { dcAnalysis } = resolveSignals(components, prepared)

    expect(dcAnalysis.has(resistor.uid)).toBe(true)

    const result = dcAnalysis.get(resistor.uid)
    expect(result.voltage).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.current).toBeCloseTo(0.0227272727, 6)
  })

  it("utilise exclusivement PowerModel/ResistorModel.defaultParameters, pas de constante codée en dur (A3)", () => {
    const { components, wires, resistor } = simplePoweredResistorCircuit()
    const prepared = prepareCircuit(components, wires)

    const { dcAnalysis } = resolveSignals(components, prepared)
    const result = dcAnalysis.get(resistor.uid)

    const expectedCurrent = getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("RESISTOR").resistance
    expect(result.current).toBe(expectedCurrent)
  })

  it("n'inclut pas une résistance non alimentée (pins non HIGH/LOW)", () => {
    const resistor = { uid: "r_isolated", type: "RESISTOR", x: 0, y: 0 }
    const components = [resistor]
    const wires = []

    const prepared = prepareCircuit(components, wires)
    const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)

    expect(pinSignals.get("r_isolated:A")).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("r_isolated:B")).toBe(Signal.UNKNOWN)
    expect(dcAnalysis.has("r_isolated")).toBe(false)
  })

  it("n'inclut aucune entrée dcAnalysis en l'absence de RESISTOR", () => {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const led = { uid: "led1", type: "LED", x: 10, y: 0 }
    const components = [power, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "led1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)

    expect(dcAnalysis.size).toBe(0)
  })

  it("gère un circuit totalement vide (components=[], wires=[])", () => {
    const prepared = prepareCircuit([], [])
    const { pinSignals, dcAnalysis } = resolveSignals([], prepared)

    expect(pinSignals.size).toBe(0)
    expect(dcAnalysis.size).toBe(0)
  })

  it("ne modifie pas les valeurs de pinSignals par rapport à la propagation logique existante (A1)", () => {
    const { components, wires } = simplePoweredResistorCircuit()
    const prepared = prepareCircuit(components, wires)

    const { pinSignals } = resolveSignals(components, prepared)

    // La propagation logique standard doit rester intacte : POWER -> RESISTOR
    // ne crée aucune continuité interne (limite connue du moteur, non modifiée).
    expect(pinSignals.get("power1:5V")).toBe(Signal.HIGH)
    expect(pinSignals.get("power1:GND")).toBe(Signal.LOW)
    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.LOW)
  })
})
