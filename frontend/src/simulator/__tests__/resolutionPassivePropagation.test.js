import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { getLedState } from "../production.js"
import { Signal } from "../signals.js"
import { getSimulationDefaultParameters } from "../simulationRegistry.js"

/**
 * MB-SIM-015 (ruling CSA, GATE 1 PASS / GATE 2 AUTHORIZED, 2026-08-20).
 *
 * Reproduction du bug historique (POWER → RESISTOR → LED → GND, LED
 * restait OFF) et couverture des 7 cas obligatoires du ruling (§9), plus
 * la garde de sûreté "jamais d'écrasement HIGH/LOW" (§5) et l'idempotence
 * (§4). Passe exclusivement par resolveSignals(), l'unique API publique
 * de la phase Résolution — même convention que resolutionDc.test.js.
 */

function power() {
  return { uid: "power1", type: "POWER", x: 0, y: 0 }
}

describe("MB-SIM-015 — cas 1 : POWER -> RESISTOR -> LED -> GND (bug historique corrigé)", () => {
  it("LED = ON (anode HIGH, cathode LOW)", () => {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const led = { uid: "l1", type: "LED", x: 20, y: 0 }
    const components = [p, resistor, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)

    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.HIGH)
    expect(pinSignals.get("l1:anode")).toBe(Signal.HIGH)
    expect(pinSignals.get("l1:cathode")).toBe(Signal.LOW)
    expect(getLedState(led.uid, pinSignals)).toEqual({ on: true, anode: Signal.HIGH, cathode: Signal.LOW })
  })
})

describe("MB-SIM-015 — cas 2 : POWER -> RESISTOR -> SWITCH -> LED -> GND", () => {
  function circuitWithSwitch(switchClosed) {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const sw = { uid: "s1", type: "BUTTON", x: 15, y: 0, state: switchClosed ? "pressed" : "released" }
    const led = { uid: "l1", type: "LED", x: 20, y: 0 }
    const components = [p, resistor, sw, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "s1", toPin: "pin1" },
      { fromUid: "s1", fromPin: "pin2", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]
    return { components, wires, led }
  }

  it("SWITCH fermé : LED = ON (la résistance ne bloque pas, le switch ne casse pas la contribution)", () => {
    const { components, wires, led } = circuitWithSwitch(true)
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(getLedState(led.uid, pinSignals).on).toBe(true)
  })

  it("SWITCH ouvert : LED = OFF (le pont ne doit jamais court-circuiter un switch ouvert)", () => {
    const { components, wires, led } = circuitWithSwitch(false)
    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(getLedState(led.uid, pinSignals).on).toBe(false)
  })
})

describe("MB-SIM-015 — cas 3 : POWER -> RESISTOR -> GND (comportement historique conservé)", () => {
  it("dcAnalysis inchangé : I = U / R (5V, 220Ω -> ~22,7mA)", () => {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const components = [p, resistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)

    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.LOW)
    expect(dcAnalysis.has(resistor.uid)).toBe(true)
    const result = dcAnalysis.get(resistor.uid)
    expect(result.voltage).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.current).toBeCloseTo(0.0227272727, 6)
  })
})

describe("MB-SIM-015 — cas 4 : RESISTOR isolée (aucune propagation artificielle)", () => {
  it("les deux bornes restent UNKNOWN, aucune contribution DC", () => {
    const resistor = { uid: "r_isolated", type: "RESISTOR", x: 0, y: 0 }
    const components = [resistor]
    const wires = []

    const prepared = prepareCircuit(components, wires)
    const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)

    expect(pinSignals.get("r_isolated:A")).toBe(Signal.UNKNOWN)
    expect(pinSignals.get("r_isolated:B")).toBe(Signal.UNKNOWN)
    expect(dcAnalysis.has(resistor.uid)).toBe(false)
  })
})

describe("MB-SIM-015 — cas 5 : POWER -> R1 -> R2 -> LED -> GND (propagation en chaîne, point fixe multi-rounds)", () => {
  it("LED = ON après plusieurs rounds de propagation passive", () => {
    const p = power()
    const r1 = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const r2 = { uid: "r2", type: "RESISTOR", x: 20, y: 0 }
    const led = { uid: "l1", type: "LED", x: 30, y: 0 }
    const components = [p, r1, r2, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "r2", toPin: "A" },
      { fromUid: "r2", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)

    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.HIGH)
    expect(pinSignals.get("r2:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r2:B")).toBe(Signal.HIGH)
    expect(pinSignals.get("l1:anode")).toBe(Signal.HIGH)
    expect(getLedState(led.uid, pinSignals).on).toBe(true)
    // Limitation explicitement acceptée par le ruling (§6) : dcAnalysis ne
    // produit pas de contribution série pour R1/R2 dans cette topologie
    // mixte (nécessiterait un solveur de réseau, hors périmètre).
    expect(dcAnalysis.has(r1.uid)).toBe(false)
    expect(dcAnalysis.has(r2.uid)).toBe(false)
  })
})

describe("MB-SIM-015 — cas 6 : POWER -> LED -> GND (comportement historique conservé, sans résistance)", () => {
  it("LED = ON, comportement inchangé", () => {
    const p = power()
    const led = { uid: "l1", type: "LED", x: 10, y: 0 }
    const components = [p, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(getLedState(led.uid, pinSignals).on).toBe(true)
  })
})

describe("MB-SIM-015 — cas 7 : RESISTOR reliée directement HIGH/LOW (comportement existant conservé)", () => {
  it("le pont ne se déclenche jamais si les deux bornes sont déjà résolues par câblage direct", () => {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const components = [p, resistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.LOW)
  })
})

describe("MB-SIM-015 — garde de sûreté (§5) : jamais d'écrasement HIGH/LOW, jamais de court-circuit logique créé", () => {
  it("un net déjà résolu (via un second chemin déjà câblé) n'est jamais réécrit par la propagation passive", () => {
    // r1.B est câblé à la fois vers un second POWER (résolu LOW directement)
    // ET, via r1.A, éligible à recevoir HIGH depuis power1. La garde
    // "net cible entièrement UNKNOWN" doit empêcher toute réécriture :
    // r1.B doit rester LOW (sa valeur câblée), jamais devenir HIGH.
    const power1 = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const power2 = { uid: "power2", type: "POWER", x: 0, y: 50 }
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const components = [power1, power2, resistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "power2", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    const { pinSignals } = resolveSignals(components, prepared)

    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(pinSignals.get("r1:B")).toBe(Signal.LOW) // jamais écrasé en HIGH
    expect(pinSignals.get("power2:GND")).toBe(Signal.LOW) // jamais écrasé
  })

  it("idempotence : appeler resolveSignals une seule fois produit un résultat stable (aucune double écriture incohérente)", () => {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const led = { uid: "l1", type: "LED", x: 20, y: 0 }
    const components = [p, resistor, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared1 = prepareCircuit(components, wires)
    const first = resolveSignals(components, prepared1)
    const prepared2 = prepareCircuit(components, wires)
    const second = resolveSignals(components, prepared2)

    expect(second.pinSignals.get("l1:anode")).toBe(first.pinSignals.get("l1:anode"))
    expect(second.pinSignals.get("r1:B")).toBe(first.pinSignals.get("r1:B"))
  })
})

describe("MB-SIM-015 — prepareCircuit() reste inchangé (aucune mutation de la topologie canonique)", () => {
  it("prepared.nets ne contient aucune union artificielle entre les deux bornes d'une résistance", () => {
    const p = power()
    const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
    const led = { uid: "l1", type: "LED", x: 20, y: 0 }
    const components = [p, resistor, led]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "l1", toPin: "anode" },
      { fromUid: "l1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
    ]

    const prepared = prepareCircuit(components, wires)
    // Avant toute résolution : r1:A et r1:B doivent être dans des nets
    // distincts (prepareCircuit() ne connaît pas la conduction passive).
    expect(prepared.uf.find(prepared.uf.key("r1", "A"))).not.toBe(prepared.uf.find(prepared.uf.key("r1", "B")))

    // Après résolution : la topologie canonique elle-même doit rester
    // inchangée (aucune mutation de prepared.uf/prepared.nets).
    resolveSignals(components, prepared)
    expect(prepared.uf.find(prepared.uf.key("r1", "A"))).not.toBe(prepared.uf.find(prepared.uf.key("r1", "B")))
  })
})
