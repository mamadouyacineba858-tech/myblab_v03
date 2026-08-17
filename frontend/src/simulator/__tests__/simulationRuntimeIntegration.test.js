import { describe, it, expect } from "vitest"
import {
  runSimulationWithRuntime,
  circuitRequiresRuntime,
} from "../simulationRuntimeIntegration.js"
import { runSimulation, getLedState } from "../engine.js"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { createRuntimeOrchestrator } from "../runtimeOrchestrator.js"
import { Signal } from "../signals.js"

/**
 * MB-SIM-011 — Tests d'intégration SIM3.
 *
 * Démontre l'activation réelle du flux :
 *   Scheduler → ArduinoSimulator → SignalMap → fusion → résultat Simulation
 * via simulationRuntimeIntegration.js, sans jamais modifier engine.js ni
 * runtimeOrchestrator.js (voir runtimeArchitecture.test.js pour les preuves
 * d'inspection statique correspondantes).
 */

const circuitSansRuntime = {
  components: [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
  ],
  wires: [
    { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ],
}

function circuitAvecRuntime() {
  return {
    components: [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
      { uid: "ard1", type: "ARDUINO", x: 20, y: 0 },
    ],
    wires: [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ],
  }
}

describe("MB-SIM-011 — circuitRequiresRuntime (Q3 : activation conditionnelle)", () => {
  it("false pour un circuit sans composant ARDUINO", () => {
    expect(circuitRequiresRuntime(circuitSansRuntime.components)).toBe(false)
  })

  it("true dès qu'un composant ARDUINO est présent", () => {
    expect(circuitRequiresRuntime(circuitAvecRuntime().components)).toBe(true)
  })

  it("false pour une liste vide ou absente", () => {
    expect(circuitRequiresRuntime([])).toBe(false)
    expect(circuitRequiresRuntime(undefined)).toBe(false)
  })
})

describe("MB-SIM-011 — TEST 4 : circuit sans Runtime, chemin historique préservé (GATE 0)", () => {
  it("runSimulationWithRuntime() retourne exactement runSimulation() pour un circuit sans ARDUINO", () => {
    const historique = runSimulation(circuitSansRuntime.components, circuitSansRuntime.wires)
    const integre = runSimulationWithRuntime(circuitSansRuntime.components, circuitSansRuntime.wires)
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })

  it("aucun paramètre supplémentaire n'est requis (options omis)", () => {
    expect(() => runSimulationWithRuntime(circuitSansRuntime.components, circuitSansRuntime.wires)).not.toThrow()
  })
})

describe("MB-SIM-011 — TEST 6 : Runtime absent — aucune instanciation inutile", () => {
  it("ne crée aucun Scheduler/Runtime pour un circuit sans ARDUINO (orchestrators reste vide)", () => {
    const orchestrators = new Map()
    runSimulationWithRuntime(circuitSansRuntime.components, circuitSansRuntime.wires, { dt: 16, orchestrators })
    expect(orchestrators.size).toBe(0)
  })

  it("ne modifie pas le résultat par rapport au chemin historique, même avec dt fourni", () => {
    const historique = runSimulation(circuitSansRuntime.components, circuitSansRuntime.wires)
    const integre = runSimulationWithRuntime(circuitSansRuntime.components, circuitSansRuntime.wires, { dt: 100 })
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })
})

describe("MB-SIM-011 — TEST 5 / TEST 3 : Runtime → SignalMap → pinSignals, flux réel bout-en-bout", () => {
  it("les sorties Runtime écrites via digitalWrite() sont visibles dans le résultat de simulation final", () => {
    const { components, wires } = circuitAvecRuntime()
    const orchestrators = new Map()
    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    orchestrators.set("ard1", orchestrator)

    const result = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })

    // Le circuit Simulation « classique » (power1/led1) reste correct...
    expect(result.get("led1:anode")).toBe(Signal.HIGH)
    expect(result.get("led1:cathode")).toBe(Signal.LOW)
    // ...et le signal Runtime (ard1:D2) est bien remonté jusqu'au résultat
    // final de Simulation, prouvant le trajet complet Runtime -> SignalMap
    // -> pinSignals (pas seulement la fusion isolée).
    expect(result.get("ard1:D2")).toBe(Signal.HIGH)

    // Traçabilité : le SignalMap consulté par l'orchestrateur correspond
    // exactement à ce qui a été fusionné dans le résultat final.
    expect(orchestrator.getRuntime().tick(0).get("D2")).toBe(Signal.HIGH)
  })

  it("un composant ARDUINO sans digitalWrite() ni start() : le SignalMap Runtime est vide, les pins ARDUINO gardent la valeur du chemin classique (FLOATING), non écrasée par la fusion", () => {
    const { components, wires } = circuitAvecRuntime()
    const historique = runSimulation(components, wires)
    const result = runSimulationWithRuntime(components, wires, { dt: 16 })
    // ard1:D2/D3 existent déjà via prepareCircuit/resolveSignals (ARDUINO
    // est un composant canonique comme un autre) ; un Runtime non démarré
    // produit un SignalMap vide (ArduinoSimulator.tick() : running===false),
    // donc mergeRuntimeSignalsIntoPinSignals n'écrase rien pour ce composant.
    expect(result.get("ard1:D2")).toBe(historique.get("ard1:D2"))
    expect(result.get("ard1:D3")).toBe(historique.get("ard1:D3"))
  })

  it("Scheduler.advance(dt) est bien invoqué (le temps de l'orchestrateur progresse) lors de l'intégration", () => {
    const { components, wires } = circuitAvecRuntime()
    const orchestrators = new Map()
    runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(16)
  })
})

describe("MB-SIM-011 — TEST 7 : déterminisme", () => {
  it("mêmes circuit + dt + état initial => résultat identique", () => {
    const { components, wires } = circuitAvecRuntime()

    const orchestratorsA = new Map()
    const a = createRuntimeOrchestrator()
    a.getRuntime().start()
    a.getRuntime().digitalWrite("D2", Signal.HIGH)
    orchestratorsA.set("ard1", a)
    const resultA = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators: orchestratorsA })

    const orchestratorsB = new Map()
    const b = createRuntimeOrchestrator()
    b.getRuntime().start()
    b.getRuntime().digitalWrite("D2", Signal.HIGH)
    orchestratorsB.set("ard1", b)
    const resultB = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators: orchestratorsB })

    expect([...resultA.entries()]).toEqual([...resultB.entries()])
  })

  it("des advance() successifs avec les mêmes dt accumulent le même temps de façon déterministe", () => {
    const { components, wires } = circuitAvecRuntime()
    const orchestrators = new Map()
    runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })
    runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(32)
  })
})

describe("MB-SIM-011 — plusieurs composants ARDUINO : une seule source de temps (GATE 1)", () => {
  it("deux composants ARDUINO créés automatiquement partagent le même Scheduler, avancé une seule fois par appel (pas dt x nombre de composants)", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "ard2", type: "ARDUINO", x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })
    expect(orchestrators.get("ard1").getScheduler()).toBe(orchestrators.get("ard2").getScheduler())
    // Un seul Scheduler partagé => une seule progression de 16ms pour cet
    // appel, quel que soit le nombre de composants Runtime (pas 2x16=32).
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(16)
    expect(orchestrators.get("ard2").getCurrentTime()).toBe(16)
  })

  it("un second appel avec les mêmes orchestrateurs avance le Scheduler partagé une seule fois de plus", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "ard2", type: "ARDUINO", x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(32)
    expect(orchestrators.get("ard2").getCurrentTime()).toBe(32)
  })

  it("chaque composant ARDUINO conserve son propre ArduinoSimulator (pinOutputs indépendants)", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "ard2", type: "ARDUINO", x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    // Pré-créer ard1 démarré et écrit, ard2 restera non démarré.
    const a1 = createRuntimeOrchestrator()
    a1.getRuntime().start()
    a1.getRuntime().digitalWrite("D2", Signal.HIGH)
    orchestrators.set("ard1", a1)

    const result = runSimulationWithRuntime(components, [], { dt: 16, orchestrators })

    expect(result.get("ard1:D2")).toBe(Signal.HIGH)
    expect(orchestrators.get("ard2").getRuntime()).not.toBe(a1.getRuntime())
  })
})

describe("MB-SIM-012 — TEST 10 : runSimulation() historique inchangé (aucun Runtime utilisé)", () => {
  it("runSimulation(components, wires) produit un résultat identique à avant MB-SIM-012, quel que soit le circuit", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const direct = resolveSignals(components, prepareCircuit(components, wires)).pinSignals
    const historique = runSimulation(components, wires)
    expect([...historique.entries()]).toEqual([...direct.entries()])
  })
})

describe("MB-SIM-012 — TEST 11 (essentiel) : runSimulationWithRuntime() injecte réellement avant résolution/propagation, sans dupliquer le moteur", () => {
  it("un signal Runtime HIGH sur D2, câblé à une LED, allume réellement la LED via runSimulationWithRuntime() (pas une fusion post-résolution)", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
      { uid: "power1", type: "POWER", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "ard1", fromPin: "D2", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]

    const sansRuntimeDemarre = runSimulationWithRuntime(components, wires, { dt: 16 })
    expect(getLedState("led1", sansRuntimeDemarre).on).toBe(false)

    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    const orchestrators = new Map([["ard1", orchestrator]])

    const avecRuntimeDemarre = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })
    expect(getLedState("led1", avecRuntimeDemarre).on).toBe(true)
  })

  it("obtient les signaux Runtime, les transmet à resolveSignals(components, prepared, externalSignals), et produit un résultat identique à composer manuellement les mêmes briques (aucun second moteur)", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
      { uid: "power1", type: "POWER", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "ard1", fromPin: "D2", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]

    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    const orchestrators = new Map([["ard1", orchestrator]])

    const viaIntegration = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })

    // Composition manuelle des mêmes briques que celles que
    // runSimulationWithRuntime() est censée composer (pas réimplémenter) :
    // prepareCircuit() + resolveSignals(..., externalSignals) avec le même
    // SignalMap Runtime, converti au même format de clé "uid:pinId".
    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])
    const viaCompositionManuelle = resolveSignals(components, prepareCircuit(components, wires), externalSignals).pinSignals

    expect([...viaIntegration.entries()]).toEqual([...viaCompositionManuelle.entries()])
  })
})
