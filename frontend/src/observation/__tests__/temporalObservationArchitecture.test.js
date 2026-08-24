import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-OBS-002 — Tests architecturaux de la frontière Observation temporelle.
 *
 * Même méthode que observationArchitecture.test.js / measurementArchitecture.test.js
 * / cf1DocumentArchitecture.test.js : preuve par inspection statique du
 * source, sans introspection du graphe de modules réel.
 *
 * Preuves exigées par le Ticket §L (« Required Evidence — Architecture »)
 * et le Blueprint §12 (« Architecture Locks ») :
 *
 *   1. Une seule autorité de temps de simulation reste utilisée.
 *   2. L'Observation temporelle ne crée pas un second runtime/solveur.
 *   3. Observation consomme les signaux runtime via une frontière approuvée
 *      (RuntimeOrchestrator/createRuntimeOrchestrator), jamais un accès
 *      direct au solveur (resolution.js/preparation.js/canonicalRegistry.js)
 *      ni au PwmSignal brut.
 *   4. Measurement reste un adaptateur/consommateur, ne devient jamais
 *      propriétaire du sampling.
 *   5. Presentation reste en dehors du moteur temporel (aucune UI).
 *   6. Le sens de dépendance n'est jamais inversé.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const temporalPath = path.join(dir, "..", "temporalObservationContract.js")
const observationContractPath = path.join(dir, "..", "observationContract.js")
const measurementContractPath = path.join(dir, "..", "..", "measurement", "measurementContract.js")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")
const clockPath = path.join(dir, "..", "..", "simulator", "clock.js")
const schedulerPath = path.join(dir, "..", "..", "simulator", "scheduler.js")
const runtimeOrchestratorPath = path.join(dir, "..", "..", "simulator", "runtimeOrchestrator.js")
const pwmSignalPath = path.join(dir, "..", "..", "simulator", "pwmSignal.js")
const arduinoSimulatorPath = path.join(dir, "..", "..", "simulator", "arduino", "ArduinoSimulator.js")
const resolutionPath = path.join(dir, "..", "..", "simulator", "resolution.js")
const preparationPath = path.join(dir, "..", "..", "simulator", "preparation.js")
const canonicalRegistryPath = path.join(dir, "..", "..", "simulator", "canonicalRegistry.js")
const simulationRuntimeIntegrationPath = path.join(dir, "..", "..", "simulator", "simulationRuntimeIntegration.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("MB-OBS-002 — AC-01/AC-03 : temporalObservationContract.js importe exclusivement la frontière approuvée", () => {
  it("importe uniquement observationContract.js, runtimeOrchestrator.js et la fonction pure circuitRequiresRuntime de simulationRuntimeIntegration.js — rien d'autre du dépôt", () => {
    const source = readSourceWithoutComments(temporalPath)
    const importLines = source.match(/^import .*$/gm) ?? []
    const allowedPatterns = [
      /from\s+["']\.\/observationContract\.js["']/,
      /from\s+["']\.\.\/simulator\/runtimeOrchestrator\.js["']/,
      /from\s+["']\.\.\/simulator\/simulationRuntimeIntegration\.js["']/,
    ]
    for (const line of importLines) {
      const matches = allowedPatterns.some((pattern) => pattern.test(line))
      expect(matches, `import inattendu dans temporalObservationContract.js : ${line}`).toBe(true)
    }
    // La seule chose importée de simulationRuntimeIntegration.js doit être
    // circuitRequiresRuntime (prédicat pur), jamais runSimulationWithRuntime
    // (qui bundle prepareCircuit+resolveSignals sans exposer dcAnalysis) —
    // ce module compose RuntimeOrchestrator lui-même, il ne délègue pas à
    // simulationRuntimeIntegration.js.
    const simIntegrationImport = importLines.find((l) => /simulationRuntimeIntegration\.js/.test(l))
    expect(simIntegrationImport).toMatch(/circuitRequiresRuntime/)
    expect(simIntegrationImport).not.toMatch(/runSimulationWithRuntime/)
  })
})

describe("MB-OBS-002 — AC-06 : aucun accès direct au solveur ni au PwmSignal brut", () => {
  it("n'importe ni resolution.js, ni preparation.js, ni canonicalRegistry.js, ni pwmSignal.js, ni ArduinoSimulator.js, ni clock.js, ni scheduler.js directement", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/resolution\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/preparation\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/canonicalRegistry\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/pwmSignal\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/arduino\/ArduinoSimulator\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/scheduler\.js["']/)
  })

  it("ne référence jamais evaluatePwmSignal, PwmSignal, resolveSignals, dcAnalysis, ou pinSignals directement", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/evaluatePwmSignal/)
    expect(source).not.toMatch(/PwmSignal/)
    expect(source).not.toMatch(/resolveSignals/)
    expect(source).not.toMatch(/dcAnalysis/)
    expect(source).not.toMatch(/\bpinSignals\b/)
  })

  it("n'accède jamais à un état interne _pwmSignals (aucune introspection PWM, décision CSA MB-SIM-014 §7/§23 préservée)", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/_pwmSignals/)
    expect(source).not.toMatch(/getPwmSignal/)
  })
})

describe("MB-OBS-002 — AC-03 : aucune seconde horloge, aucun temps réel", () => {
  it("n'utilise ni Date.now(), ni performance.now(), ni setTimeout/setInterval/requestAnimationFrame", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/new Date\(/)
    expect(source).not.toMatch(/setTimeout/)
    expect(source).not.toMatch(/setInterval/)
    expect(source).not.toMatch(/requestAnimationFrame/)
  })

  it("n'importe rien de core/ (aucune mutation du Document possible) ni React (module logique pur)", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\/[^"']*["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
  })
})

describe("MB-OBS-002 — observationContract.js : extension additive vérifiée, MB-OBS-001 non affaibli", () => {
  it("observe() reste importable et appelable à 3 arguments (aucun paramètre requis ajouté)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).toMatch(/export function observe\(request, components, wires, externalSignals\s*=\s*null\)/)
  })

  it("observationContract.js n'importe toujours ni clock.js, ni scheduler.js, ni runtimeOrchestrator.js, ni simulationRuntimeIntegration.js (AC-08 : aucune nouvelle horloge introduite dans MB-OBS-001)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*simulationRuntimeIntegration\.js["']/)
  })

  it("observationContract.js n'importe pas temporalObservationContract.js (sens de dépendance non inversé)", () => {
    const source = readSourceWithoutComments(observationContractPath)
    expect(source).not.toMatch(/temporalObservationContract/)
  })
})

describe("MB-OBS-002 — AC-09 : Measurement reste en dehors du sampling temporel", () => {
  it("measurementContract.js n'importe pas temporalObservationContract.js et ne référence aucun mécanisme de sampling/série", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/temporalObservationContract/)
    expect(source).not.toMatch(/observeTemporal/)
    expect(source).not.toMatch(/samplePeriod/)
    expect(source).not.toMatch(/RuntimeOrchestrator/)
  })
})

describe("MB-OBS-002 — AC-10 : aucune UI/Presentation temporelle", () => {
  it("temporalObservationContract.js n'importe pas React et ne définit aucun composant (aucun export commençant par une majuscule de type composant)", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/\.jsx/)
  })

  it("useCircuitState.js (chemin UI live) n'importe pas temporalObservationContract.js : MB-OBS-002 n'est câblé nulle part dans l'application live", () => {
    const source = readSourceWithoutComments(useCircuitStatePath)
    expect(source).not.toMatch(/temporalObservationContract/)
    expect(source).not.toMatch(/observeTemporal/)
  })
})

describe("MB-OBS-002 — sens de dépendance unique, jamais inversé", () => {
  it("clock.js, scheduler.js, runtimeOrchestrator.js, pwmSignal.js, ArduinoSimulator.js, resolution.js, preparation.js, canonicalRegistry.js, simulationRuntimeIntegration.js n'importent pas temporalObservationContract.js", () => {
    for (const sourcePath of [
      clockPath,
      schedulerPath,
      runtimeOrchestratorPath,
      pwmSignalPath,
      arduinoSimulatorPath,
      resolutionPath,
      preparationPath,
      canonicalRegistryPath,
      simulationRuntimeIntegrationPath,
    ]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer temporalObservationContract`).not.toMatch(
        /temporalObservationContract/
      )
    }
  })
})

describe("MB-OBS-002 — fichiers protégés (Blueprint §14) réellement non modifiés dans ce ticket", () => {
  it("clock.js, scheduler.js, runtimeOrchestrator.js, pwmSignal.js, ArduinoSimulator.js, resolution.js, measurementContract.js n'importent pas et ne référencent nulle part temporalObservationContract.js ni observeTemporal (confirmation croisée de la non-modification fonctionnelle)", () => {
    for (const sourcePath of [clockPath, schedulerPath, runtimeOrchestratorPath, pwmSignalPath, arduinoSimulatorPath, resolutionPath, measurementContractPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/observeTemporal/)
    }
  })
})

describe("MB-OBS-002 — un unique point d'entrée public", () => {
  it("temporalObservationContract.js expose exactement observeTemporal comme fonction publique, et les alias de statut/quantité réutilisés de MB-OBS-001", () => {
    const source = readSourceWithoutComments(temporalPath)
    const exportedFunctionMatches = source.match(/^export function \w+/gm) ?? []
    expect(exportedFunctionMatches).toEqual(["export function observeTemporal"])
  })

  it("TemporalObservationStatus et TemporalObservationQuantity sont des alias directs de ObservationStatus/ObservationQuantity (aucune nouvelle catégorie de statut ou de grandeur)", () => {
    const source = readSourceWithoutComments(temporalPath)
    expect(source).toMatch(/export const TemporalObservationStatus = ObservationStatus/)
    expect(source).toMatch(/export const TemporalObservationQuantity = ObservationQuantity/)
  })
})
