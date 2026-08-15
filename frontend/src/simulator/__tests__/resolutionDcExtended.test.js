import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { Signal } from "../signals.js"
import { getSimulationDefaultParameters } from "../simulationRegistry.js"

/**
 * MB-SIM-008 v2 — Tests d'intégration du solveur DC pour les cinq
 * composants restants : DIODE, DC_MOTOR, CAPACITOR, POTENTIOMETER,
 * NPN_TRANSISTOR.
 *
 * Passent exclusivement par resolveSignals(), l'unique API publique de la
 * phase Résolution — aucun import d'une fonction interne. Fichier dédié,
 * distinct de resolutionDc.test.js (MB-SIM-007) et resolutionDcAnalog.test.js
 * (MB-SIM-008 initial, LDR/THERMISTOR), qui restent tous deux inchangés.
 */

function poweredCircuit(type, pinFrom, pinTo) {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const comp = { uid: "c1", type, x: 10, y: 0 }
  const components = [power, comp]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "c1", toPin: pinFrom },
    { fromUid: "c1", fromPin: pinTo, toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, comp }
}

describe("MB-SIM-008 v2 - resolveSignals (DIODE)", () => {
  it("diode polarisée en direct (anode→5V, cathode→GND) : conduit", () => {
    const { components, wires, comp } = poweredCircuit("DIODE", "anode", "cathode")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
    const result = dcAnalysis.get(comp.uid)
    const { forwardVoltage, onResistance } = getSimulationDefaultParameters("DIODE")
    const voltage = getSimulationDefaultParameters("POWER").voltage
    expect(result.current).toBeCloseTo((voltage - forwardVoltage) / onResistance, 10)
  })

  it("diode polarisée en inverse (cathode→5V, anode→GND) : bloquée, courant nul", () => {
    const { components, wires, comp } = poweredCircuit("DIODE", "cathode", "anode")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
    expect(dcAnalysis.get(comp.uid).current).toBe(0)
  })

  it("diode non alimentée : aucune entrée dcAnalysis", () => {
    const diode = { uid: "d_isolated", type: "DIODE", x: 0, y: 0 }
    const prepared = prepareCircuit([diode], [])
    const { dcAnalysis } = resolveSignals([diode], prepared)
    expect(dcAnalysis.has("d_isolated")).toBe(false)
  })
})

describe("MB-SIM-008 v2 - resolveSignals (DC_MOTOR)", () => {
  it("moteur alimenté : calcule I = U / R (modèle électrique simplifié)", () => {
    const { components, wires, comp } = poweredCircuit("DC_MOTOR", "plus", "minus")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
    const result = dcAnalysis.get(comp.uid)
    expect(result.current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("DC_MOTOR").resistance)
  })

  it("moteur non alimenté : aucune entrée dcAnalysis", () => {
    const motor = { uid: "m_isolated", type: "DC_MOTOR", x: 0, y: 0 }
    const prepared = prepareCircuit([motor], [])
    const { dcAnalysis } = resolveSignals([motor], prepared)
    expect(dcAnalysis.has("m_isolated")).toBe(false)
  })

  it("aucune trace de comportement mécanique (vitesse, couple, PWM) dans le résultat", () => {
    const { components, wires, comp } = poweredCircuit("DC_MOTOR", "plus", "minus")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    const result = dcAnalysis.get(comp.uid)
    expect(Object.keys(result).sort()).toEqual(["current", "voltage"])
  })
})

describe("MB-SIM-008 v2 - resolveSignals (CAPACITOR)", () => {
  it("condensateur alimenté : I = 0 en régime DC établi", () => {
    const { components, wires, comp } = poweredCircuit("CAPACITOR", "pinA", "pinB")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(comp.uid)).toBe(true)
    expect(dcAnalysis.get(comp.uid).current).toBe(0)
  })

  it("condensateur non alimenté : aucune entrée dcAnalysis", () => {
    const capacitor = { uid: "cap_isolated", type: "CAPACITOR", x: 0, y: 0 }
    const prepared = prepareCircuit([capacitor], [])
    const { dcAnalysis } = resolveSignals([capacitor], prepared)
    expect(dcAnalysis.has("cap_isolated")).toBe(false)
  })
})

describe("MB-SIM-008 v2 - resolveSignals (POTENTIOMETER)", () => {
  function potentiometerCircuit(pinFrom, pinTo) {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const pot = { uid: "p1", type: "POTENTIOMETER", x: 10, y: 0 }
    const components = [power, pot]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "p1", toPin: pinFrom },
      { fromUid: "p1", fromPin: pinTo, toUid: "power1", toPin: "GND" },
    ]
    return { components, wires, pot }
  }

  it("LEFT↔RIGHT alimentés : traité comme la résistance totale de la piste", () => {
    const { components, wires, pot } = potentiometerCircuit("left", "right")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    const { resistance } = getSimulationDefaultParameters("POTENTIOMETER")
    expect(dcAnalysis.get(pot.uid).current).toBe(getSimulationDefaultParameters("POWER").voltage / resistance)
  })

  it("LEFT↔WIPER alimentés : utilise la résistance équivalente resistance × position", () => {
    const { components, wires, pot } = potentiometerCircuit("left", "wiper")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    const { resistance, position } = getSimulationDefaultParameters("POTENTIOMETER")
    expect(dcAnalysis.get(pot.uid).current).toBeCloseTo(getSimulationDefaultParameters("POWER").voltage / (resistance * position), 10)
  })

  it("WIPER↔RIGHT alimentés : utilise la résistance équivalente resistance × (1 - position)", () => {
    const { components, wires, pot } = potentiometerCircuit("wiper", "right")
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    const { resistance, position } = getSimulationDefaultParameters("POTENTIOMETER")
    expect(dcAnalysis.get(pot.uid).current).toBeCloseTo(getSimulationDefaultParameters("POWER").voltage / (resistance * (1 - position)), 10)
  })

  it("potentiomètre non alimenté : aucune entrée dcAnalysis", () => {
    const pot = { uid: "pot_isolated", type: "POTENTIOMETER", x: 0, y: 0 }
    const prepared = prepareCircuit([pot], [])
    const { dcAnalysis } = resolveSignals([pot], prepared)
    expect(dcAnalysis.has("pot_isolated")).toBe(false)
  })
})

describe("MB-SIM-008 v2 - resolveSignals (NPN_TRANSISTOR)", () => {
  function transistorCircuit({ baseWire }) {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 }
    const components = [power, transistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" },
      { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
    ]
    if (baseWire === "HIGH") wires.push({ fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" })
    if (baseWire === "LOW") wires.push({ fromUid: "power1", fromPin: "GND", toUid: "t1", toPin: "base" })
    return { components, wires, transistor }
  }

  it("BASE HIGH : conduit, I = U / onResistance", () => {
    const { components, wires, transistor } = transistorCircuit({ baseWire: "HIGH" })
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    const { onResistance } = getSimulationDefaultParameters("NPN_TRANSISTOR")
    expect(dcAnalysis.get(transistor.uid).current).toBe(getSimulationDefaultParameters("POWER").voltage / onResistance)
  })

  it("BASE LOW : bloqué, courant nul mais entrée présente", () => {
    const { components, wires, transistor } = transistorCircuit({ baseWire: "LOW" })
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.has(transistor.uid)).toBe(true)
    expect(dcAnalysis.get(transistor.uid).current).toBe(0)
  })

  it("BASE flottante (non câblée) : traitée comme bloquée", () => {
    const { components, wires, transistor } = transistorCircuit({ baseWire: null })
    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)
    expect(dcAnalysis.get(transistor.uid).current).toBe(0)
  })

  it("collector/emitter non alimentés : aucune entrée dcAnalysis (circuit incomplet)", () => {
    const transistor = { uid: "t_isolated", type: "NPN_TRANSISTOR", x: 0, y: 0 }
    const prepared = prepareCircuit([transistor], [])
    const { dcAnalysis } = resolveSignals([transistor], prepared)
    expect(dcAnalysis.has("t_isolated")).toBe(false)
  })
})

describe("MB-SIM-008 v2 - circuit mixte : les huit types DC coexistent sans interférence", () => {
  it("RESISTOR + LDR + THERMISTOR + DIODE + DC_MOTOR + CAPACITOR + POTENTIOMETER + NPN_TRANSISTOR", () => {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const ldr = { uid: "ldr1", type: "LDR", x: 20, y: 0 }
    const thermistor = { uid: "th1", type: "THERMISTOR", x: 30, y: 0 }
    const diode = { uid: "d1", type: "DIODE", x: 40, y: 0 }
    const motor = { uid: "m1", type: "DC_MOTOR", x: 50, y: 0 }
    const capacitor = { uid: "cap1", type: "CAPACITOR", x: 60, y: 0 }
    const pot = { uid: "pot1", type: "POTENTIOMETER", x: 70, y: 0 }
    const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 80, y: 0 }

    const components = [power, resistor, ldr, thermistor, diode, motor, capacitor, pot, transistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" }, { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "ldr1", toPin: "A" }, { fromUid: "ldr1", fromPin: "B", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "th1", toPin: "A" }, { fromUid: "th1", fromPin: "B", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "d1", toPin: "anode" }, { fromUid: "d1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "m1", toPin: "plus" }, { fromUid: "m1", fromPin: "minus", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "cap1", toPin: "pinA" }, { fromUid: "cap1", fromPin: "pinB", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "pot1", toPin: "left" }, { fromUid: "pot1", fromPin: "right", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" }, { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { dcAnalysis } = resolveSignals(components, prepared)

    expect(dcAnalysis.size).toBe(8)
    expect(dcAnalysis.get(resistor.uid).current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("RESISTOR").resistance)
    expect(dcAnalysis.get(motor.uid).current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("DC_MOTOR").resistance)
    expect(dcAnalysis.get(capacitor.uid).current).toBe(0)
    expect(dcAnalysis.get(transistor.uid).current).toBe(getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("NPN_TRANSISTOR").onResistance)
  })
})

describe("MB-SIM-008 v2 - non-mutation des entrées (A1/A5)", () => {
  it("ne modifie pas les valeurs de pinSignals par rapport à la propagation logique existante", () => {
    const { components, wires } = poweredCircuit("DIODE", "anode", "cathode")
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get("power1:5V")).toBe(Signal.HIGH)
    expect(pinSignals.get("power1:GND")).toBe(Signal.LOW)
    expect(pinSignals.get("c1:anode")).toBe(Signal.HIGH)
    expect(pinSignals.get("c1:cathode")).toBe(Signal.LOW)
  })

  it("ne mute pas le tableau components ni le tableau wires passés en entrée", () => {
    const { components, wires } = poweredCircuit("NPN_TRANSISTOR", "collector", "emitter")
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))
    const prepared = prepareCircuit(components, wires)
    resolveSignals(components, prepared)
    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })
})
