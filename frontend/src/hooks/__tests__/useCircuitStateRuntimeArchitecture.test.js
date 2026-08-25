import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-ARDUINO-BRIDGE-001 — Tests architecturaux (LOCK-01 → LOCK-08, Blueprint
 * §19).
 *
 * Preuves par inspection statique du source (même motif que
 * runtimeArchitecture.test.js / resolutionArchitecture.test.js / cf1DocumentArchitecture.test.js) :
 * aucune de ces preuves n'exécute le code, elles vérifient uniquement les
 * imports/références textuelles des trois fichiers de production autorisés
 * par le Blueprint (§18) et la non-régression des fichiers protégés
 * (CF3, MB-OBS-002).
 */

const dir = path.dirname(fileURLToPath(import.meta.url))

const useCircuitStatePath = path.join(dir, "..", "useCircuitState.js")
const appPath = path.join(dir, "..", "..", "App.jsx")
const circuitContextPath = path.join(dir, "..", "..", "context", "CircuitContext.jsx")

const bridgeFiles = [
  { label: "useCircuitState.js", filePath: useCircuitStatePath },
  { label: "App.jsx", filePath: appPath },
  { label: "CircuitContext.jsx", filePath: circuitContextPath },
]

// LOCK-08 : non-régression du canal CF3 — ces fichiers existaient avant
// MB-ARDUINO-BRIDGE-001 et ne doivent pas avoir gagné de dépendance au
// Runtime à l'occasion de ce ticket.
const cf3Files = [
  { label: "AddComponentHandler.js", filePath: path.join(dir, "..", "..", "core", "handlers", "component", "AddComponentHandler.js") },
  { label: "AddWireHandler.js", filePath: path.join(dir, "..", "..", "core", "handlers", "wire", "AddWireHandler.js") },
  { label: "MoveComponentHandler.js", filePath: path.join(dir, "..", "..", "core", "handlers", "component", "MoveComponentHandler.js") },
  { label: "UpdateWireWaypointsHandler.js", filePath: path.join(dir, "..", "..", "core", "handlers", "wire", "UpdateWireWaypointsHandler.js") },
  { label: "RemoveComponentHandler.js", filePath: path.join(dir, "..", "..", "core", "handlers", "component", "RemoveComponentHandler.js") },
  { label: "CommandBus.js", filePath: path.join(dir, "..", "..", "core", "command", "CommandBus.js") },
  { label: "HistoryService.js", filePath: path.join(dir, "..", "..", "core", "history", "HistoryService.js") },
]

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("MB-ARDUINO-BRIDGE-001 — LOCK-01 : useCircuitState.js n'instancie pas RuntimeOrchestrator directement", () => {
  it("aucun `new RuntimeOrchestrator(` et aucun import de runtimeOrchestrator.js", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/new\s+RuntimeOrchestrator\s*\(/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator\.js["']/)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-02 : useCircuitState.js n'instancie pas ArduinoSimulator directement", () => {
  it("aucun `new ArduinoSimulator(` et aucun import de arduino/ArduinoSimulator.js", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/new\s+ArduinoSimulator\s*\(/)
    expect(source).not.toMatch(/from\s+["'][^"']*arduino\/ArduinoSimulator\.js["']/)
  })

  it("App.jsx et CircuitContext.jsx n'instancient pas non plus RuntimeOrchestrator/ArduinoSimulator (le container reste un Map nu)", () => {
    for (const { label, filePath } of [
      { label: "App.jsx", filePath: appPath },
      { label: "CircuitContext.jsx", filePath: circuitContextPath },
    ]) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${label} ne devrait pas instancier RuntimeOrchestrator`).not.toMatch(/new\s+RuntimeOrchestrator\s*\(/)
      expect(source, `${label} ne devrait pas instancier ArduinoSimulator`).not.toMatch(/new\s+ArduinoSimulator\s*\(/)
    }
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-03 : useCircuitState.js utilise runSimulationWithRuntime", () => {
  it("importe runSimulationWithRuntime depuis simulationRuntimeIntegration.js", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).toMatch(/import\s*\{\s*runSimulationWithRuntime\s*\}\s*from\s+["'][^"']*simulationRuntimeIntegration\.js["']/)
    expect(source).toMatch(/runSimulationWithRuntime\s*\(/)
  })

  it("n'importe plus runSimulation() depuis engine.js (bascule complète, pas un ajout à côté de l'ancien chemin)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/from\s+["'][^"']*simulator\/engine\.js["']/)
    expect(source).not.toMatch(/\brunSimulation\s*\(/)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-04 : aucun timer navigateur comme mécanisme de simulation", () => {
  it("useCircuitState.js, App.jsx et CircuitContext.jsx ne contiennent ni setInterval, ni setTimeout, ni requestAnimationFrame, ni Date.now/performance.now", () => {
    for (const { label, filePath } of bridgeFiles) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${label}: setInterval`).not.toMatch(/setInterval\s*\(/)
      expect(source, `${label}: setTimeout`).not.toMatch(/setTimeout\s*\(/)
      expect(source, `${label}: requestAnimationFrame`).not.toMatch(/requestAnimationFrame\s*\(/)
      expect(source, `${label}: Date.now`).not.toMatch(/Date\.now\s*\(/)
      expect(source, `${label}: performance.now`).not.toMatch(/performance\.now\s*\(/)
    }
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-05 : aucune nouvelle Clock introduite", () => {
  it("useCircuitState.js, App.jsx et CircuitContext.jsx n'importent ni clock.js ni scheduler.js, et n'instancient rien de nouveau à ce sujet", () => {
    for (const { label, filePath } of bridgeFiles) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${label}: import clock.js`).not.toMatch(/from\s+["'][^"']*\/clock\.js["']/)
      expect(source, `${label}: import scheduler.js`).not.toMatch(/from\s+["'][^"']*\/scheduler\.js["']/)
      expect(source, `${label}: new SimulatedClock`).not.toMatch(/new\s+SimulatedClock\s*\(/)
      expect(source, `${label}: new Scheduler`).not.toMatch(/new\s+Scheduler\s*\(/)
      expect(source, `${label}: createScheduler`).not.toMatch(/createScheduler\s*\(/)
      expect(source, `${label}: définition d'une classe Clock`).not.toMatch(/class\s+\w*Clock\w*/)
    }
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-06 : simulationRuntimeIntegration.js reste l'unique point de composition Runtime → Simulation", () => {
  it("useCircuitState.js ne référence ni engine.js ni runtimeOrchestrator.js directement — seul simulationRuntimeIntegration.js est importé pour la simulation", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/engine\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/runtimeOrchestrator\.js["']/)
    expect(source).toMatch(/from\s+["'][^"']*\/simulationRuntimeIntegration\.js["']/)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-07 : MB-OBS-002 n'est pas importé par le bridge", () => {
  it("useCircuitState.js, App.jsx et CircuitContext.jsx ne référencent ni temporalObservationContract.js ni TemporalObservationPanel ni le dossier observation/", () => {
    for (const { label, filePath } of bridgeFiles) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${label}: temporalObservationContract`).not.toMatch(/temporalObservationContract/)
      expect(source, `${label}: TemporalObservationPanel`).not.toMatch(/TemporalObservationPanel/)
      expect(source, `${label}: import depuis observation/`).not.toMatch(/from\s+["'][^"']*\/observation\//)
    }
  })
})

describe("MB-ARDUINO-BRIDGE-001 — LOCK-08 : CF3 ne dépend pas du Runtime (non-régression)", () => {
  it("les handlers CF3, CommandBus.js et HistoryService.js ne référencent ni RuntimeOrchestrator, ni ArduinoSimulator, ni Scheduler, ni simulationRuntimeIntegration/runSimulationWithRuntime", () => {
    for (const { label, filePath } of cf3Files) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${label}: RuntimeOrchestrator`).not.toMatch(/RuntimeOrchestrator/)
      expect(source, `${label}: ArduinoSimulator`).not.toMatch(/ArduinoSimulator/)
      expect(source, `${label}: Scheduler`).not.toMatch(/Scheduler/)
      expect(source, `${label}: simulationRuntimeIntegration`).not.toMatch(/simulationRuntimeIntegration/)
      expect(source, `${label}: runSimulationWithRuntime`).not.toMatch(/runSimulationWithRuntime/)
    }
  })
})
