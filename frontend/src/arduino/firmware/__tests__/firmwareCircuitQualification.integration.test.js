import { describe, it, expect } from "vitest"
import { runSimulationWithRuntime, stopFirmwareSimulation, SIMULATION_STEP_MS } from "../../../simulator/simulationRuntimeIntegration.js"
import { getLedState } from "../../../simulator/production.js"

/**
 * MB-L1-ARD-005 — verrou d'intégration pour la preuve E2E navigateur : le
 * circuit canonique de qualification (ARDUINO.D2 -> RESISTOR -> LED.anode,
 * LED.cathode -> POWER.GND, POWER.5V non connectée) n'était exercé par
 * aucun test existant. ARD-001/002/003/004 s'arrêtent au GPIO
 * (runtime.pinOutputs / D2 Signal) ou utilisent des fixtures ARDUINO seules
 * (firmwareLive.integration.test.js) : ce fichier ferme l'écart en faisant
 * traverser la chaîne complète firmware -> externalSignals -> résolution
 * électrique -> pinSignals -> getLedState (production.js), exactement comme
 * la Présentation (LedPart.jsx via visualStateRegistry) le consomme.
 *
 * Aucun des 210 tests ARD-004 n'est dupliqué : ceux-ci ne portent que sur
 * des composants ARDUINO nus, jamais sur ce circuit RESISTOR/LED/POWER.
 */
const BLINK_SOURCE = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  delay(500);\n  digitalWrite(2, LOW);\n  delay(500);\n}\n"

function canonicalCircuit(firmwareSource) {
  const components = [
    { uid: "arduino1", type: "ARDUINO", x: 0, y: 0, firmware: { source: firmwareSource } },
    { uid: "resistor1", type: "RESISTOR", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 0, y: 0 },
    { uid: "power1", type: "POWER", x: 0, y: 0 },
  ]
  const wires = [
    { fromUid: "arduino1", fromPin: "D2", toUid: "resistor1", toPin: "A" },
    { fromUid: "resistor1", fromPin: "B", toUid: "led1", toPin: "anode" },
    { fromUid: "led1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires }
}

function fixture(firmwareSource = BLINK_SOURCE) {
  const { components, wires } = canonicalCircuit(firmwareSource)
  const orchestrators = new Map()
  const firmwareSessions = new Map()
  const step = (dt = SIMULATION_STEP_MS) => runSimulationWithRuntime(components, wires, { orchestrators, firmwareSessions, dt })
  return { components, wires, orchestrators, firmwareSessions, step }
}

describe("MB-L1-ARD-005 — canonical Arduino -> resistor -> LED -> POWER.GND circuit", () => {
  it("D2 HIGH propagates through the resistor to a lit LED at t=0 (setup + first loop pass)", () => {
    const { step } = fixture()
    const pinSignals = step(0)
    expect(getLedState("led1", pinSignals).on).toBe(true)
  })

  it("Blink progression: HIGH -> LOW -> HIGH reaches the LED exactly as it reaches D2", () => {
    const { step } = fixture()
    step(0)

    let pinSignals
    for (let i = 0; i < 32; i++) pinSignals = step()
    expect(getLedState("led1", pinSignals).on).toBe(false)

    for (let i = 0; i < 32; i++) pinSignals = step()
    expect(getLedState("led1", pinSignals).on).toBe(true)
  })

  it("Stop halts firmware progression: runtime/session state is fully cleared and the LED reads off (as useCircuitState.js renders it, via EMPTY_MAP, once simulationActive is false)", () => {
    const { orchestrators, firmwareSessions, step } = fixture()
    step(0)
    expect(getLedState("led1", step()).on).toBe(true)

    stopFirmwareSimulation(orchestrators, firmwareSessions)

    expect(orchestrators.size).toBe(0)
    expect(firmwareSessions.size).toBe(0)
    expect(getLedState("led1", new Map()).on).toBe(false)
  })

  it("Restart starts a fresh firmware session: setup() runs again and the LED lights up immediately", () => {
    const { orchestrators, firmwareSessions, step } = fixture()
    step(0)
    for (let i = 0; i < 40; i++) step()
    stopFirmwareSimulation(orchestrators, firmwareSessions)

    const pinSignals = step(0)
    expect(getLedState("led1", pinSignals).on).toBe(true)
  })

  it("Invalid firmware never produces stale or fake GPIO on the LED net", () => {
    const { step } = fixture("void setup() { pinMode(2, OUTPUT); } void loop() { analogWrite(2, 128); }")
    const pinSignals = step(0)
    expect(getLedState("led1", pinSignals).on).toBe(false)
  })
})
