import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  runSimulationWithRuntime,
  computeTransientElectricalContributions,
} from "../simulationRuntimeIntegration.js"
import { runSimulation, getLedState } from "../engine.js"
import { createTransientContributionRegistry } from "../transientContributionRegistry.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { getDcContribution } from "../dcContributionRegistry.js"
import { createScheduler } from "../scheduler.js"
import { Signal } from "../signals.js"

/**
 * A4-D-PREQ1 — Generic Transient Electrical Simulation, end-to-end proof
 * (T9 à T12, T14). T1-T8/T13/T15 : voir transientContributionRegistry.test.js.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

const CAPACITOR_CIRCUIT = {
  components: [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "cap1", type: "CAPACITOR", x: 10, y: 0 },
  ],
  wires: [
    { fromUid: "power1", fromPin: "5V", toUid: "cap1", toPin: "pinA" },
    { fromUid: "power1", fromPin: "GND", toUid: "cap1", toPin: "pinB" },
  ],
}

describe("T9 — plusieurs composants transitoires => Scheduler avancé une seule fois", () => {
  it("deux CAPACITOR dans le même circuit ne font avancer le Scheduler partagé que d'un seul dt", () => {
    const scheduler = createScheduler()
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 10, y: 0 },
      { uid: "cap2", type: "CAPACITOR", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "cap1", toPin: "pinA" },
      { fromUid: "power1", fromPin: "GND", toUid: "cap1", toPin: "pinB" },
      { fromUid: "power1", fromPin: "5V", toUid: "cap2", toPin: "pinA" },
      { fromUid: "power1", fromPin: "GND", toUid: "cap2", toPin: "pinB" },
    ]
    runSimulationWithRuntime(components, wires, { dt: 16, scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
  })
})

describe("T10 — circuit transitoire sans Arduino fonctionne", () => {
  it("un CAPACITOR seul (sans ARDUINO) résout sans erreur et fait progresser son état électrique", () => {
    const electricalTransientStates = new Map()
    expect(() =>
      runSimulationWithRuntime(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10, electricalTransientStates })
    ).not.toThrow()
    expect(electricalTransientStates.get("cap1").voltage).toBeGreaterThan(0)
  })

  it("aucun ArduinoSimulator (orchestrator) n'est créé uniquement à cause du composant transitoire", () => {
    const orchestrators = new Map()
    runSimulationWithRuntime(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10, orchestrators })
    expect(orchestrators.size).toBe(0)
  })
})

describe("T11 — coexistence timed digital + transient electrical : même Scheduler / même currentTimeMs", () => {
  it("un producer temporel digital et un composant transitoire électrique observent exactement le même currentTimeMs", () => {
    const seenTimedAt = []
    const seenTransientAt = []
    const timedDigitalRegistry = createTimedDigitalContributionRegistry({
      contributions: new Map([["NPN_TRANSISTOR", ({ currentTimeMs }) => {
        seenTimedAt.push(currentTimeMs)
        return { state: undefined, outputs: null }
      }]]),
    })
    const transientRegistry = createTransientContributionRegistry({
      contributions: new Map([["CAPACITOR", ({ currentTimeMs, previousState }) => {
        seenTransientAt.push(currentTimeMs)
        return { state: previousState, contribution: null }
      }]]),
    })
    const components = [
      { uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 10, y: 0 },
    ]
    runSimulationWithRuntime(components, [], { dt: 16, timedDigitalContributionRegistry: timedDigitalRegistry, transientContributionRegistry: transientRegistry })
    expect(seenTimedAt).toEqual([16])
    expect(seenTransientAt).toEqual([16])
  })
})

describe("T12 — aucune mutation de components / parameters / Document", () => {
  it("le composant original et ses parameters ne sont jamais mutés par la composition transitoire", () => {
    const originalParameters = { capacitance: 1e-4 }
    const originalComponent = { uid: "cap1", type: "CAPACITOR", x: 10, y: 0, parameters: originalParameters }
    const components = Object.freeze([
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      originalComponent,
    ])
    runSimulationWithRuntime(components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ capacitance: 1e-4 })
  })

  it("computeTransientElectricalContributions ne mute jamais le tableau de composants transmis", () => {
    const components = Object.freeze([{ uid: "cap1", type: "CAPACITOR", x: 0, y: 0 }])
    const registry = createTransientContributionRegistry({
      contributions: new Map([["CAPACITOR", () => ({ state: { voltage: 1 }, contribution: { voltage: 1, current: 0 } })]]),
    })
    expect(() => computeTransientElectricalContributions(components, registry, new Map(), 5, 10, 10, new Map())).not.toThrow()
  })
})

describe("T14 — comportement historique DC non concerné inchangé", () => {
  it("dcContributionRegistry CAPACITOR reste un circuit ouvert (current 0) en régime DC établi, indépendamment du Registry transitoire", () => {
    const capacitorDc = getDcContribution("CAPACITOR")
    const contribution = capacitorDc({ pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, supplyVoltage: 5 })
    expect(contribution).toEqual({ voltage: 5, current: 0 })
  })

  it("un circuit RESISTOR/LED/POWER (aucun composant transitoire) garde le chemin historique EXACT", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "r1", type: "RESISTOR", x: 10, y: 0 },
      { uid: "led1", type: "LED", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "r1", fromPin: "B", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const historique = runSimulation(components, wires)
    const integre = runSimulationWithRuntime(components, wires)
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })

  it("un circuit avec CAPACITOR (Registry transitoire de production actif) produit le même pinSignals que runSimulation() historique", () => {
    const historique = runSimulation(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires)
    const integre = runSimulationWithRuntime(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })

  it("un composant TIMED_TEST/CAPACITOR seul continue de propager électriquement les LED comme avant (GATE 0 des chemins non transitoires)", () => {
    const digitalRegistry = createTimedDigitalContributionRegistry()
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const result = runSimulationWithRuntime(components, wires, { timedDigitalContributionRegistry: digitalRegistry })
    expect(getLedState("led1", result).on).toBe(true)
  })
})

describe("I-A4-02 — absence de wall-clock APIs dans le chemin transitoire de simulationRuntimeIntegration.js", () => {
  it("simulationRuntimeIntegration.js n'utilise ni Date.now, ni performance.now, ni setTimeout, ni setInterval, ni requestAnimationFrame", () => {
    const src = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/performance\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })
})
