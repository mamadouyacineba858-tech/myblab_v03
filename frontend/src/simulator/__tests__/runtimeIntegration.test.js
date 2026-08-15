import { describe, it, expect } from "vitest"
import { createRuntimeOrchestrator, mergeRuntimeSignalsIntoPinSignals } from "../runtimeOrchestrator.js"
import { runSimulation } from "../engine.js"
import { Signal } from "../signals.js"

/**
 * MB-SIM-010 v2 — Tests d'intégration (Ticket, Phase 6).
 *
 * Démontre la frontière opérationnelle complète :
 *   Scheduler → Embedded Runtime → SignalMap → (Simulation, en consultation)
 * sans jamais appeler runSimulation() depuis l'orchestrateur, et sans que
 * runSimulation() ne soit affecté par l'existence de l'orchestrateur
 * (contrainte absolue #20 : pas de modification par défaut).
 */

describe("MB-SIM-010 — frontière Scheduler → Embedded Runtime → SignalMap", () => {
  it("un cycle complet advance() produit un SignalMap consultable et fusionnable dans un pinSignals de Simulation", () => {
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()

    // Un futur EMB1 (interpréteur réel) ou, ici, un appel direct de test,
    // écrit l'état des pins du Runtime — MB-SIM-010 n'implémente aucun
    // interpréteur (contrainte #16).
    runtime.start()
    runtime.digitalWrite("D2", Signal.HIGH)

    const { time, signalMap } = orchestrator.advance(16)
    expect(time).toBe(16)
    expect(signalMap.get("D2")).toBe(Signal.HIGH)

    // Circuit Simulation existant, sans aucun rapport avec le Runtime :
    // pinSignals produit par le pipeline Préparation/Résolution/Production
    // habituel, totalement indépendant de l'orchestrateur.
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const pinSignals = runSimulation(components, wires)

    const merged = mergeRuntimeSignalsIntoPinSignals(pinSignals, "ard1", signalMap)

    // Le pinSignals produit par runSimulation() reste intact dans la fusion...
    expect(merged.get("led1:anode")).toBe(Signal.HIGH)
    expect(merged.get("led1:cathode")).toBe(Signal.LOW)
    // ...et le SignalMap du Runtime y est ajouté, sans collision de clés.
    expect(merged.get("ard1:D2")).toBe(Signal.HIGH)

    // pinSignals original, lui, reste inchangé (fonction pure).
    expect(pinSignals.has("ard1:D2")).toBe(false)
  })

  it("runSimulation() produit un résultat identique, que l'orchestrateur existe ou non (contrainte #20 : pas de modification par défaut)", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]

    const before = runSimulation(components, wires)

    // Créer et faire avancer un orchestrateur n'a aucun effet de bord sur
    // engine.js / runSimulation().
    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    orchestrator.advance(16)

    const after = runSimulation(components, wires)

    expect([...after.entries()]).toEqual([...before.entries()])
  })

  it("le Scheduler orchestré ne connaît ni Signal, ni composant, ni resolution.js — seul le Runtime (Embedded Runtime) est source de signaux", () => {
    const orchestrator = createRuntimeOrchestrator()
    const scheduler = orchestrator.getScheduler()

    expect(scheduler.resolveSignals).toBeUndefined()
    expect(scheduler.runSimulation).toBeUndefined()
    expect(scheduler.getDcContribution).toBeUndefined()
    expect(Object.keys(scheduler)).not.toContain("running")
  })
})
