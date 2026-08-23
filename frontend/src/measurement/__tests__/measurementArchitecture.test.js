import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-MEASURE-001 — Tests architecturaux de la frontière Measurement /
 * Observation (même motif que `observationArchitecture.test.js`,
 * `resolutionArchitecture.test.js`, `runtimeArchitecture.test.js` : preuve
 * par inspection statique du source, pas d'introspection du graphe de
 * modules réel).
 *
 * Preuves exigées par le Ticket (§N "Required Evidence — Architecture") et
 * le Blueprint (§V "Evidence Requirements — P1") et par la mission
 * d'implémentation (§3 "Contrat architectural non négociable", §21
 * "Test 7 — Architecture") :
 *
 *   1. Measurement consomme exclusivement le contrat Observation.
 *   2. Measurement n'accède jamais directement aux internes de Simulation
 *      (resolveSignals, dcAnalysis, pinSignals, dcContributionRegistry,
 *      canonicalRegistry) ni au solveur/runtime (engine.js, clock.js,
 *      scheduler.js, runtimeOrchestrator.js, simulationRuntimeIntegration.js).
 *   3. Measurement n'introduit aucune seconde horloge.
 *   4. Measurement ne mute jamais le Document (aucun import de core/,
 *      HistoryManager, HistoryService).
 *   5. Le sens de dépendance n'est jamais inversé : ni Observation, ni
 *      Simulation, ni le Runtime n'importent measurementContract.js.
 *
 * Le sens de dépendance attendu (Blueprint §M "Architecture Boundaries") est :
 *
 *   measurementContract.js  -->  observationContract.js
 *
 * et rien d'autre.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const measurementContractPath = path.join(dir, "..", "measurementContract.js")
const observationContractPath = path.join(dir, "..", "..", "observation", "observationContract.js")
const preparationPath = path.join(dir, "..", "..", "simulator", "preparation.js")
const resolutionPath = path.join(dir, "..", "..", "simulator", "resolution.js")
const enginePath = path.join(dir, "..", "..", "simulator", "engine.js")
const canonicalRegistryPath = path.join(dir, "..", "..", "simulator", "canonicalRegistry.js")
const dcContributionRegistryPath = path.join(dir, "..", "..", "simulator", "dcContributionRegistry.js")
const clockPath = path.join(dir, "..", "..", "simulator", "clock.js")
const schedulerPath = path.join(dir, "..", "..", "simulator", "scheduler.js")
const runtimeOrchestratorPath = path.join(dir, "..", "..", "simulator", "runtimeOrchestrator.js")
const integrationPath = path.join(dir, "..", "..", "simulator", "simulationRuntimeIntegration.js")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-MEASURE-001 — AC-01 : Measurement consomme exclusivement le contrat Observation", () => {
  it("measurementContract.js importe observe/ObservationStatus/ObservationQuantity depuis observationContract.js, et rien d'autre du dépôt", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).toMatch(/from\s+["']\.\.\/observation\/observationContract\.js["']/)
    expect(source).toMatch(/observe/)
    expect(source).toMatch(/ObservationStatus/)
    expect(source).toMatch(/ObservationQuantity/)

    const importLines = source.match(/^import .*$/gm) ?? []
    for (const line of importLines) {
      expect(line, `import inattendu dans measurementContract.js : ${line}`).toMatch(
        /from\s+["']\.\.\/observation\/observationContract\.js["']/
      )
    }
  })
})

describe("MB-MEASURE-001 — AC-02 : aucun accès direct aux internes de Simulation ni au solveur/runtime", () => {
  it("n'importe ni preparation.js, ni resolution.js, ni canonicalRegistry.js, ni dcContributionRegistry.js, ni engine.js", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/preparation\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/resolution\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/canonicalRegistry\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/dcContributionRegistry\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/engine\.js["']/)
    expect(source).not.toMatch(/resolveSignals/)
    expect(source).not.toMatch(/dcAnalysis/)
    expect(source).not.toMatch(/pinSignals/)
  })

  it("n'importe ni clock.js, ni scheduler.js, ni runtimeOrchestrator.js, ni simulationRuntimeIntegration.js, et ne source jamais le temps lui-même (aucune seconde horloge)", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*simulationRuntimeIntegration[^"']*["']/)
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/new Date\(/)
    expect(source).not.toMatch(/setTimeout/)
    expect(source).not.toMatch(/setInterval/)
  })

  it("n'importe rien de core/ (CommandBus, HistoryService, HistoryManager, Document) : aucune mutation possible (AC-10)", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\/[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*CommandBus[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*HistoryManager[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*HistoryService[^"']*["']/)
  })

  it("n'importe pas useCircuitState.js ni React directement (measurementContract.js est un module logique pur, pas un composant)", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
  })
})

describe("MB-MEASURE-001 — sens de dépendance unique, jamais inversé", () => {
  it("observationContract.js n'importe pas measurementContract.js (Observation reste ignorant de Measurement)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/measurementContract/)
  })

  it("preparation.js, resolution.js, canonicalRegistry.js, dcContributionRegistry.js et engine.js n'importent pas measurementContract.js", () => {
    for (const sourcePath of [preparationPath, resolutionPath, canonicalRegistryPath, dcContributionRegistryPath, enginePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer measurementContract`).not.toMatch(
        /measurementContract/
      )
    }
  })

  it("clock.js, scheduler.js, runtimeOrchestrator.js et simulationRuntimeIntegration.js n'importent pas measurementContract.js", () => {
    for (const sourcePath of [clockPath, schedulerPath, runtimeOrchestratorPath, integrationPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer measurementContract`).not.toMatch(
        /measurementContract/
      )
    }
  })

  it("useCircuitState.js (chemin UI live) n'importe pas measurementContract.js : MB-MEASURE-001 n'est câblé nulle part dans l'application live", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/measurementContract/)
  })
})

describe("MB-MEASURE-001 — AC-01/AC-13 : un unique point d'entrée public, aucune physique dupliquée", () => {
  it("measurementContract.js expose un unique point d'entrée public measure(), et exactement les deux modes VOLTAGE/CURRENT (jamais LOGICAL_STATE)", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    const exportedFunctionMatches = source.match(/^export function \w+/gm) ?? []
    expect(exportedFunctionMatches).toEqual(["export function measure"])
    expect(source).not.toMatch(/LOGICAL_STATE:/)
  })

  it("measurementContract.js ne définit aucune fonction de calcul propre : mis à part le point d'entrée measure() et le garde isSupportedMode(), toute résolution de valeur passe par observe()", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    const functionNames = [...source.matchAll(/function\s+(\w+)\s*\(/g)].map((m) => m[1])
    expect(functionNames.sort()).toEqual(["isSupportedMode", "measure"])
  })
})
