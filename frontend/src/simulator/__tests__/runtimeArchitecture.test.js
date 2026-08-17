import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-SIM-010 v2 — Tests architecturaux (Ticket, Phase 7).
 *
 * Preuves par inspection statique du source (même motif que
 * timeArchitecture.test.js / resolutionArchitecture.test.js) que
 * l'invariant INV-SIM010-003 révisé (v2, D1) est respecté : l'interdiction
 * d'import direct de ArduinoSimulator.js s'applique nommément à
 * preparation.js / resolution.js / production.js, et à eux seuls parmi les
 * modules de calcul — le module d'orchestration dédié, lui, est
 * explicitement autorisé à l'importer.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const preparationPath = path.join(dir, "..", "preparation.js")
const resolutionPath = path.join(dir, "..", "resolution.js")
const productionPath = path.join(dir, "..", "production.js")
const enginePath = path.join(dir, "..", "engine.js")
const schedulerPath = path.join(dir, "..", "scheduler.js")
const clockPath = path.join(dir, "..", "clock.js")
const orchestratorPath = path.join(dir, "..", "runtimeOrchestrator.js")
const arduinoSimulatorPath = path.join(dir, "..", "arduino", "ArduinoSimulator.js")
const canonicalRegistryPath = path.join(dir, "..", "canonicalRegistry.js")
const integrationPath = path.join(dir, "..", "simulationRuntimeIntegration.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-SIM-010 v2 — INV-SIM010-003 révisé (D1) : interdiction restreinte aux 3 modules de calcul", () => {
  it("preparation.js, resolution.js et production.js n'importent pas ArduinoSimulator.js", () => {
    for (const sourcePath of [preparationPath, resolutionPath, productionPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer ArduinoSimulator`).not.toMatch(/ArduinoSimulator/)
      expect(source).not.toMatch(/from\s+["'][^"']*arduino[^"']*["']/i)
    }
  })

  it("runtimeOrchestrator.js — le module d'orchestration dédié — importe légitimement ArduinoSimulator.js", () => {
    const source = readSourceWithoutComments(orchestratorPath)
    expect(source).toMatch(/from\s+["']\.\/arduino\/ArduinoSimulator\.js["']/)
    expect(source).toMatch(/ArduinoSimulator/)
  })

  it("runtimeOrchestrator.js est distinct de preparation.js / resolution.js / production.js (fichier séparé, non importé par eux)", () => {
    for (const sourcePath of [preparationPath, resolutionPath, productionPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/runtimeOrchestrator/)
    }
  })
})

describe("MB-SIM-010 v2 — contrainte absolue #20 : runSimulation() non modifié par défaut", () => {
  it("engine.js (point d'entrée de runSimulation) n'importe pas runtimeOrchestrator.js ni ArduinoSimulator.js", () => {
    const source = readSourceWithoutComments(enginePath)
    expect(source).not.toMatch(/runtimeOrchestrator/)
    expect(source).not.toMatch(/ArduinoSimulator/)
  })
})

describe("MB-SIM-010 v2 — contrainte absolue #6/#7 : le Runtime ne calcule rien et ne modifie pas le Document", () => {
  it("runtimeOrchestrator.js ne référence aucune fonction du solveur DC ni du pipeline Simulation", () => {
    const source = readSourceWithoutComments(orchestratorPath)
    expect(source).not.toMatch(/getDcContribution/)
    expect(source).not.toMatch(/computeDcAnalysis/)
    expect(source).not.toMatch(/resolveSignals/)
    expect(source).not.toMatch(/prepareCircuit/)
    expect(source).not.toMatch(/runSimulation/)
  })

  it("ArduinoSimulator.js (Runtime) ne dépend jamais de Simulation (Tome II §4.2) : aucun import de preparation/resolution/production/engine.js", () => {
    const source = readSourceWithoutComments(arduinoSimulatorPath)
    expect(source).not.toMatch(/from\s+["']\.\.\/preparation\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\.\/resolution\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\.\/production\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\.\/engine\.js["']/)
  })
})

describe("MB-SIM-010 v2 — contraintes absolues #1-#5 : le Scheduler reste générique (rappel, cf. timeArchitecture.test.js)", () => {
  it("scheduler.js et clock.js n'importent toujours pas ArduinoSimulator, Signal, ni resolution.js", () => {
    for (const sourcePath of [schedulerPath, clockPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/ArduinoSimulator/)
      expect(source).not.toMatch(/\bSignal\b/)
      expect(source).not.toMatch(/from\s+["']\.\/resolution\.js["']/)
    }
  })
})

describe("MB-SIM-010 v2 — non-régression du Registry canonique (contrainte absolue #17)", () => {
  it("canonicalRegistry.js n'importe pas runtimeOrchestrator.js ni ArduinoSimulator.js", () => {
    const source = readSourceWithoutComments(canonicalRegistryPath)
    expect(source).not.toMatch(/runtimeOrchestrator/)
    expect(source).not.toMatch(/ArduinoSimulator/)
  })
})

describe("MB-SIM-011 — GATE 1 : simulationRuntimeIntegration.js est l'unique point d'intégration, sans dépendance cyclique", () => {
  it("engine.js et runtimeOrchestrator.js restent exactement comme avant MB-SIM-011 : ni l'un ni l'autre n'importe simulationRuntimeIntegration.js, ni l'un ni l'autre ne s'importent mutuellement", () => {
    const engineSource = readSourceWithoutComments(enginePath)
    const orchestratorSource = readSourceWithoutComments(orchestratorPath)
    expect(engineSource).not.toMatch(/simulationRuntimeIntegration/)
    expect(engineSource).not.toMatch(/runtimeOrchestrator/)
    expect(engineSource).not.toMatch(/ArduinoSimulator/)
    expect(orchestratorSource).not.toMatch(/simulationRuntimeIntegration/)
    expect(orchestratorSource).not.toMatch(/from\s+["']\.\/engine\.js["']/)
    expect(orchestratorSource).not.toMatch(/runSimulation/)
  })

  it("simulationRuntimeIntegration.js est le seul fichier à importer à la fois engine.js et runtimeOrchestrator.js", () => {
    const integrationSource = readSourceWithoutComments(integrationPath)
    expect(integrationSource).toMatch(/from\s+["']\.\/engine\.js["']/)
    expect(integrationSource).toMatch(/from\s+["']\.\/runtimeOrchestrator\.js["']/)
  })

  it("preparation.js, resolution.js et production.js n'importent pas simulationRuntimeIntegration.js (le pipeline Simulation reste ignorant du Runtime)", () => {
    for (const sourcePath of [preparationPath, resolutionPath, productionPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/simulationRuntimeIntegration/)
    }
  })

  it("scheduler.js et clock.js n'importent pas simulationRuntimeIntegration.js (le Scheduler reste générique)", () => {
    for (const sourcePath of [schedulerPath, clockPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/simulationRuntimeIntegration/)
    }
  })
})
