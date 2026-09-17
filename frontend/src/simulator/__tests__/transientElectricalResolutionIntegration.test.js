import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  runSimulationWithRuntime,
  runSimulationStep,
} from "../simulationRuntimeIntegration.js"
import { runSimulation } from "../engine.js"
import { createTransientContributionRegistry, getAllTransientContributionTypes } from "../transientContributionRegistry.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { createScheduler } from "../scheduler.js"
import { Signal } from "../signals.js"

/**
 * A4-D-PREQ2 — Transient Electrical Resolution Integration, end-to-end proof
 * (T7 à T20). T1-T6 (composeElectricalAnalysis) : voir electricalAnalysis.test.js.
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

describe("T7 — runSimulation() retourne toujours exactement son ancien type Map de pinSignals", () => {
  it("runSimulation() reste une fonction à 2 paramètres retournant une Map<string,string>", () => {
    const components = [{ uid: "power1", type: "POWER", x: 0, y: 0 }]
    const result = runSimulation(components, [])
    expect(result).toBeInstanceOf(Map)
  })

  it("engine.js n'a pas été modifié pour ce ticket (runSimulation()/getLedState/getRgbLedState, signature inchangée)", () => {
    const src = readFileSync(resolve(__dirname, "../engine.js"), "utf-8")
    expect(src).toMatch(/export function runSimulation\(components, wires\)/)
    expect(src).not.toMatch(/electricalAnalysis/)
    expect(src).not.toMatch(/composeElectricalAnalysis/)
  })

  it("runSimulationWithRuntime() retourne toujours une Map<string,string> (pinSignals seul, jamais {pinSignals, electricalAnalysis})", () => {
    const result = runSimulationWithRuntime(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    expect(result).toBeInstanceOf(Map)
    expect(result.get("cap1:pinA")).toBe(Signal.HIGH)
  })
})

describe("T8 — circuit DC sans transitoire => résultat historique inchangé", () => {
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

  it("runSimulationWithRuntime() reste égal à runSimulation() (GATE 0)", () => {
    const historique = runSimulation(components, wires)
    const integre = runSimulationWithRuntime(components, wires)
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })

  it("runSimulationStep().electricalAnalysis reflète le dcAnalysis steady-state, aucune entrée transitoire", () => {
    // RESISTOR directement entre POWER/GND (et non en série vers une LED) :
    // ses deux bornes portent des potentiels OPPOSÉS (HIGH/LOW), condition
    // requise par resistorDc() (dcContributionRegistry.js, inchangé) pour
    // produire une contribution — même patron que CAPACITOR_CIRCUIT.
    const dcOnlyComponents = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "r1", type: "RESISTOR", x: 10, y: 0 },
    ]
    const dcOnlyWires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "power1", fromPin: "GND", toUid: "r1", toPin: "B" },
    ]
    const { pinSignals, electricalAnalysis } = runSimulationStep(dcOnlyComponents, dcOnlyWires)
    expect(pinSignals.get("r1:A")).toBe(Signal.HIGH)
    expect(electricalAnalysis.get("r1")).toEqual({ voltage: 5, current: 5 / 220 })
  })
})

describe("T9 — CAPACITOR avec état transitoire => analyse observable courant/tension du step courant", () => {
  it("electricalAnalysis expose une tension/courant transitoires non nuls pour cap1", () => {
    const { electricalAnalysis } = runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    const contribution = electricalAnalysis.get("cap1")
    expect(contribution).toBeDefined()
    expect(contribution.voltage).toBeGreaterThan(0)
    expect(contribution.voltage).toBeLessThanOrEqual(5)
  })
})

describe("T10 — deux steps avec le même electricalTransientStates => l'analyse observable évolue avec l'état", () => {
  it("la tension observée progresse d'un step au suivant, store partagé", () => {
    // Capacitance surchargée (défaut CAPACITOR 1e-7F sature en un seul step à
    // dt=1ms avec la constante pédagogique 1000Ω, PREQ1) : 1e-3F garde la
    // charge observable sur plusieurs steps, sans changer le moteur RC lui-même.
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 10, y: 0, parameters: { capacitance: 1e-3 } },
    ]
    const electricalTransientStates = new Map()
    const step1 = runSimulationStep(components, CAPACITOR_CIRCUIT.wires, { dt: 1, electricalTransientStates })
    const step2 = runSimulationStep(components, CAPACITOR_CIRCUIT.wires, { dt: 1, electricalTransientStates })
    expect(step1.electricalAnalysis.get("cap1").voltage).toBeGreaterThan(0)
    expect(step1.electricalAnalysis.get("cap1").voltage).toBeLessThan(5)
    expect(step2.electricalAnalysis.get("cap1").voltage).toBeGreaterThan(step1.electricalAnalysis.get("cap1").voltage)
  })
})

describe("T11 — nouveau electricalTransientStates => reset déterministe", () => {
  it("deux appels indépendants avec un store frais produisent la même analyse observable", () => {
    const first = runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 5, electricalTransientStates: new Map() })
    const second = runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 5, electricalTransientStates: new Map() })
    expect(second.electricalAnalysis.get("cap1")).toEqual(first.electricalAnalysis.get("cap1"))
  })
})

describe("T12 — composant transitoire sans contribution valide => fallback DC correctement défini", () => {
  it("un contributeur transitoire fixture qui refuse de produire laisse la valeur DC steady-state observable inchangée", () => {
    const unpoweredTransientRegistry = createTransientContributionRegistry({
      contributions: new Map([["CAPACITOR", ({ previousState }) => ({ state: previousState, contribution: null })]]),
    })
    const { electricalAnalysis } = runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, {
      dt: 10,
      transientContributionRegistry: unpoweredTransientRegistry,
    })
    // CAPACITOR reste en circuit ouvert DC (dcContributionRegistry.js, inchangé) : current 0, voltage = supplyVoltage.
    expect(electricalAnalysis.get("cap1")).toEqual({ voltage: 5, current: 0 })
  })
})

describe("T13 — plusieurs composants : DC-only + transient => l'analyse électrique unique contient les deux", () => {
  it("un RESISTOR (DC-only) et un CAPACITOR (transitoire) coexistent dans le même electricalAnalysis", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "r1", type: "RESISTOR", x: 10, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
      { fromUid: "power1", fromPin: "GND", toUid: "r1", toPin: "B" },
      { fromUid: "power1", fromPin: "5V", toUid: "cap1", toPin: "pinA" },
      { fromUid: "power1", fromPin: "GND", toUid: "cap1", toPin: "pinB" },
    ]
    const { electricalAnalysis } = runSimulationStep(components, wires, { dt: 10 })
    expect(electricalAnalysis.get("r1")).toEqual({ voltage: 5, current: 5 / 220 })
    expect(electricalAnalysis.get("cap1").voltage).toBeGreaterThan(0)
  })
})

describe("T14 — pinSignals reste Signal-only : aucune valeur voltage/current numérique injectée", () => {
  it("toute valeur de pinSignals appartient au vocabulaire Signal.*, jamais un nombre", () => {
    const validSignals = new Set(Object.values(Signal))
    const { pinSignals } = runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    for (const value of pinSignals.values()) {
      expect(typeof value).toBe("string")
      expect(validSignals.has(value)).toBe(true)
    }
  })
})

describe("T15 — un seul resolveSignals par step runtime (preuve structurelle)", () => {
  it("simulationRuntimeIntegration.js appelle resolveSignals(...) exactement une fois (hors commentaires/JSDoc)", () => {
    const raw = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8")
    const executable = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
    const matches = executable.match(/\bresolveSignals\s*\(/g) ?? []
    expect(matches.length).toBe(1)
  })
})

describe("T16 — un seul Scheduler.advance(dt) par step", () => {
  it("un CAPACITOR seul ne fait avancer un Scheduler explicite que d'un seul dt par appel à runSimulationStep", () => {
    const scheduler = createScheduler()
    runSimulationStep(CAPACITOR_CIRCUIT.components, CAPACITOR_CIRCUIT.wires, { dt: 16, scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
  })

  it("deux CAPACITOR dans le même circuit ne font avancer le Scheduler que d'un seul dt", () => {
    const scheduler = createScheduler()
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 10, y: 0 },
      { uid: "cap2", type: "CAPACITOR", x: 20, y: 0 },
    ]
    const wires = [
      ...CAPACITOR_CIRCUIT.wires,
      { fromUid: "power1", fromPin: "5V", toUid: "cap2", toPin: "pinA" },
      { fromUid: "power1", fromPin: "GND", toUid: "cap2", toPin: "pinB" },
    ]
    runSimulationStep(components, wires, { dt: 16, scheduler })
    expect(scheduler.getCurrentTime()).toBe(16)
  })
})

describe("T17 — aucun Document/component.parameters muté", () => {
  it("le composant CAPACITOR original et ses parameters ne sont jamais mutés par runSimulationStep()", () => {
    const originalParameters = { capacitance: 1e-4 }
    const originalComponent = { uid: "cap1", type: "CAPACITOR", x: 10, y: 0, parameters: originalParameters }
    const components = Object.freeze([
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      originalComponent,
    ])
    runSimulationStep(components, CAPACITOR_CIRCUIT.wires, { dt: 10 })
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ capacitance: 1e-4 })
  })
})

describe("T18 — aucun wall-clock API ajouté (electricalAnalysis.js)", () => {
  it("electricalAnalysis.js n'utilise ni Date.now, ni performance.now, ni setTimeout, ni setInterval, ni requestAnimationFrame", () => {
    const src = readFileSync(resolve(__dirname, "../electricalAnalysis.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/performance\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })
})

describe("T19 — coexistence Arduino + Timed Digital + Transient Electrical, sans duplication de temps/résolution", () => {
  it("les trois observent exactement le même currentTimeMs, un seul Scheduler, une seule résolution", () => {
    const seenTimedAt = []
    const timedDigitalRegistry = createTimedDigitalContributionRegistry({
      contributions: new Map([["NPN_TRANSISTOR", ({ currentTimeMs }) => {
        seenTimedAt.push(currentTimeMs)
        return { state: undefined, outputs: null }
      }]]),
    })
    const seenTransientAt = []
    const transientRegistry = createTransientContributionRegistry({
      contributions: new Map([["CAPACITOR", ({ currentTimeMs, previousState }) => {
        seenTransientAt.push(currentTimeMs)
        return { state: previousState, contribution: null }
      }]]),
    })
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
      { uid: "cap1", type: "CAPACITOR", x: 20, y: 0 },
    ]
    const orchestrators = new Map()
    const { electricalAnalysis } = runSimulationStep(components, [], {
      dt: 16,
      orchestrators,
      timedDigitalContributionRegistry: timedDigitalRegistry,
      transientContributionRegistry: transientRegistry,
    })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(16)
    expect(seenTimedAt).toEqual([16])
    expect(seenTransientAt).toEqual([16])
    expect(electricalAnalysis).toBeInstanceOf(Map)
  })
})

describe("T20 — aucun ZENER/nouveau type au-delà de CAPACITOR/POLARIZED_CAPACITOR/INDUCTOR", () => {
  // A4-INDUCTOR (CSA GO explicite, "AUCUN A4-D-PREQ3, INDUCTOR doit être le
  // prochain consommateur réel du contrat transitoire générique existant")
  // a depuis ajouté INDUCTOR au Registry transitoire de production — cette
  // garde PREQ2 est mise à jour pour refléter cet ajout légitime, tout en
  // continuant à verrouiller l'absence de toute branche INDUCTOR dans les
  // fichiers génériques (simulationRuntimeIntegration.js/electricalAnalysis.js,
  // I-A4-15) et l'absence de ZENER (§21 A4-INDUCTOR).
  it("simulationRuntimeIntegration.js et electricalAnalysis.js ne contiennent aucun littéral INDUCTOR/ZENER (code exécutable, hors commentaires)", () => {
    for (const rel of ["../simulationRuntimeIntegration.js", "../electricalAnalysis.js"]) {
      const src = readFileSync(resolve(__dirname, rel), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
      expect(src, rel).not.toMatch(/INDUCTOR/)
      expect(src, rel).not.toMatch(/ZENER/)
    }
  })

  it("le Registry transitoire de production n'enregistre que CAPACITOR/POLARIZED_CAPACITOR/INDUCTOR — aucun ZENER", () => {
    const types = getAllTransientContributionTypes()
    expect(types).toEqual(["CAPACITOR", "POLARIZED_CAPACITOR", "INDUCTOR"])
    expect(types).not.toContain("ZENER")
  })
})
