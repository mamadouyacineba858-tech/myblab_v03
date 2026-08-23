import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-OBS-001 — Tests architecturaux de la frontière Simulation / Observation
 * (même motif que resolutionArchitecture.test.js / runtimeArchitecture.test.js :
 * preuve par inspection statique du source, pas d'introspection du graphe de
 * modules réel).
 *
 * Preuves exigées par le ticket (§L "Architecture") et le blueprint (§15
 * "Architecture") :
 *
 *   1. Presentation n'accède pas aux internes du solveur via l'API d'Observation.
 *   2. Une seule frontière d'observation canonique existe pour V1.
 *   3. Le temps de simulation existant reste seul autoritaire.
 *   4. Aucun second solveur ni horloge n'existe.
 *   5. Le support V1 des cibles/grandeurs est explicite.
 *
 * Le sens de dépendance attendu (§12 du blueprint) est :
 *
 *   observationContract.js  -->  preparation.js, resolution.js, canonicalRegistry.js
 *
 * et jamais l'inverse : aucun fichier du solveur ni du Runtime n'importe
 * observationContract.js.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const observationContractPath = path.join(dir, "..", "observationContract.js")
const preparationPath = path.join(dir, "..", "..", "simulator", "preparation.js")
const resolutionPath = path.join(dir, "..", "..", "simulator", "resolution.js")
const enginePath = path.join(dir, "..", "..", "simulator", "engine.js")
const canonicalRegistryPath = path.join(dir, "..", "..", "simulator", "canonicalRegistry.js")
const clockPath = path.join(dir, "..", "..", "simulator", "clock.js")
const schedulerPath = path.join(dir, "..", "..", "simulator", "scheduler.js")
const runtimeOrchestratorPath = path.join(dir, "..", "..", "simulator", "runtimeOrchestrator.js")
const integrationPath = path.join(dir, "..", "..", "simulator", "simulationRuntimeIntegration.js")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-OBS-001 — AC-02 : observationContract.js compose le solveur par ses exports publics (composition, pas duplication)", () => {
  it("observationContract.js importe prepareCircuit depuis preparation.js et resolveSignals depuis resolution.js", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).toMatch(/from\s+["']\.\.\/simulator\/preparation\.js["']/)
    expect(source).toMatch(/prepareCircuit/)
    expect(source).toMatch(/from\s+["']\.\.\/simulator\/resolution\.js["']/)
    expect(source).toMatch(/resolveSignals/)
  })

  it("observationContract.js importe getCanonicalEntry depuis canonicalRegistry.js (nombre de bornes, pour la désambiguïsation du courant par-pin)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).toMatch(/from\s+["']\.\.\/simulator\/canonicalRegistry\.js["']/)
    expect(source).toMatch(/getCanonicalEntry/)
  })
})

describe("MB-OBS-001 — AC-01/AC-02 : observationContract.js n'accède à aucun interne du solveur ni du Runtime au-delà de ses exports publics", () => {
  it("n'importe pas engine.js (runSimulation n'est pas la voie utilisée : dcAnalysis lui est nécessaire et engine.js la rejette)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*engine\.js["']/)
    expect(source).not.toMatch(/runSimulation/)
  })

  it("n'importe ni clock.js, ni scheduler.js, ni runtimeOrchestrator.js, ni simulationRuntimeIntegration.js (AC-08 : aucune nouvelle horloge, aucun second solveur)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*simulationRuntimeIntegration[^"']*["']/)
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/new Date\(/)
  })

  it("n'importe pas useCircuitState.js ni aucun module React (AC-09 : Observation reste indépendante de la Présentation et du Document)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
  })

  it("n'importe rien de core/ (CommandBus, HistoryService, Document, Registry) : aucune mutation possible du Document (AC-09)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\/[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*CommandBus[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*HistoryManager[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*HistoryService[^"']*["']/)
  })
})

describe("MB-OBS-001 — AC-01 : sens de dépendance unique, jamais inversé", () => {
  it("preparation.js, resolution.js et engine.js n'importent pas observationContract.js (le solveur reste ignorant de l'Observation)", () => {
    for (const sourcePath of [preparationPath, resolutionPath, enginePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer observationContract`).not.toMatch(
        /observationContract/
      )
    }
  })

  it("canonicalRegistry.js n'importe pas observationContract.js", () => {
    const source = readSourceWithoutComments(canonicalRegistryPath)
    expect(source).not.toMatch(/observationContract/)
  })

  it("clock.js, scheduler.js, runtimeOrchestrator.js et simulationRuntimeIntegration.js n'importent pas observationContract.js (aucun couplage Runtime -> Observation)", () => {
    for (const sourcePath of [clockPath, schedulerPath, runtimeOrchestratorPath, integrationPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer observationContract`).not.toMatch(
        /observationContract/
      )
    }
  })

  it("useCircuitState.js (chemin UI live) n'importe pas observationContract.js : MB-OBS-001 n'est câblé nulle part dans l'UI (§A du ticket)", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/observationContract/)
  })
})

describe("MB-OBS-001 — AC-01/AC-05 : une seule frontière canonique, support V1 explicite", () => {
  it("observationContract.js expose un unique point d'entrée public observe(), et les ensembles PIN/NET et LOGICAL_STATE/VOLTAGE/CURRENT explicitement", () => {
    const source = readSourceWithoutComments(observationContractPath)
    const exportedFunctionMatches = source.match(/^export function \w+/gm) ?? []
    expect(exportedFunctionMatches).toEqual(["export function observe"])
    expect(source).toMatch(/PIN:\s*"PIN"/)
    expect(source).toMatch(/NET:\s*"NET"/)
    expect(source).toMatch(/LOGICAL_STATE:\s*"LOGICAL_STATE"/)
    expect(source).toMatch(/VOLTAGE:\s*"VOLTAGE"/)
    expect(source).toMatch(/CURRENT:\s*"CURRENT"/)
    expect(source).not.toMatch(/COMPONENT:\s*"COMPONENT"/)
    expect(source).not.toMatch(/BRANCH:\s*"BRANCH"/)
  })
})
