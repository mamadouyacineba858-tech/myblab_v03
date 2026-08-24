import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-OBS-003 — Tests architecturaux de la frontière Présentation /
 * Observation temporelle (même motif que `measurementArchitecture.test.js`,
 * `temporalObservationArchitecture.test.js`, `observationArchitecture.test.js` :
 * preuve par inspection statique du source, pas d'introspection du graphe
 * de modules réel).
 *
 * Preuves exigées par le Blueprint MB-OBS-003 §13 "Architecture" et les
 * verrous LOCK-OBS003-01 à 08 :
 *
 *   1. TemporalObservationPanel.jsx consomme exclusivement
 *      temporalObservationContract.js (et React) — rien d'autre du dépôt.
 *   2. Absence de toute référence à Clock/Scheduler/RuntimeOrchestrator/
 *      ArduinoSimulator/PwmSignal/résolution physique (resolution.js,
 *      preparation.js, canonicalRegistry.js).
 *   3. Absence de toute seconde horloge (Date.now/performance.now/timers).
 *   4. Aucun import de core/ (CommandBus, HistoryManager, HistoryService,
 *      Document) : aucune mutation possible du circuit.
 *   5. Le sens de dépendance n'est jamais inversé : ni
 *      temporalObservationContract.js, ni observationContract.js, ni le
 *      Runtime/solveur, ni measurementContract.js, ni useCircuitState.js
 *      n'importent TemporalObservationPanel.jsx (non câblé dans
 *      l'application live — décision CSA Phase 3).
 *   6. Un unique point d'entrée public exporté : TemporalObservationPanel.
 *
 * Le sens de dépendance attendu (Blueprint §9 "Architecture obligatoire") est :
 *
 *   TemporalObservationPanel.jsx  -->  temporalObservationContract.js
 *
 * et rien d'autre.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const panelPath = path.join(dir, "..", "TemporalObservationPanel.jsx")
const temporalContractPath = path.join(dir, "..", "temporalObservationContract.js")
const observationContractPath = path.join(dir, "..", "observationContract.js")
const measurementContractPath = path.join(dir, "..", "..", "measurement", "measurementContract.js")
const preparationPath = path.join(dir, "..", "..", "simulator", "preparation.js")
const resolutionPath = path.join(dir, "..", "..", "simulator", "resolution.js")
const canonicalRegistryPath = path.join(dir, "..", "..", "simulator", "canonicalRegistry.js")
const clockPath = path.join(dir, "..", "..", "simulator", "clock.js")
const schedulerPath = path.join(dir, "..", "..", "simulator", "scheduler.js")
const runtimeOrchestratorPath = path.join(dir, "..", "..", "simulator", "runtimeOrchestrator.js")
const arduinoSimulatorPath = path.join(dir, "..", "..", "simulator", "arduino", "ArduinoSimulator.js")
const pwmSignalPath = path.join(dir, "..", "..", "simulator", "pwmSignal.js")
const integrationPath = path.join(dir, "..", "..", "simulator", "simulationRuntimeIntegration.js")
const useCircuitStatePath = path.join(dir, "..", "..", "hooks", "useCircuitState.js")
const appPath = path.join(dir, "..", "..", "App.jsx")
const sidebarPath = path.join(dir, "..", "..", "components", "Sidebar.jsx")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-OBS-003 — AC-01/AC-09 : TemporalObservationPanel.jsx consomme exclusivement temporalObservationContract.js", () => {
  it("importe uniquement react et ./temporalObservationContract.js — rien d'autre du dépôt", () => {
    const source = readSourceWithoutComments(panelPath)
    const importLines = source.match(/^import .*$/gm) ?? []
    expect(importLines.length).toBeGreaterThan(0)
    for (const line of importLines) {
      expect(line, `import inattendu dans TemporalObservationPanel.jsx : ${line}`).toMatch(
        /from\s+["'](react|\.\/temporalObservationContract\.js)["']/
      )
    }
    expect(source).toMatch(/from\s+["']\.\/temporalObservationContract\.js["']/)
    expect(source).toMatch(/observeTemporal/)
  })

  it("n'importe pas resolution.js, preparation.js, ni canonicalRegistry.js, et ne référence jamais resolveSignals/dcAnalysis/pinSignals directement", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/preparation\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/resolution\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/simulator\/canonicalRegistry\.js["']/)
    expect(source).not.toMatch(/resolveSignals/)
    expect(source).not.toMatch(/dcAnalysis/)
    expect(source).not.toMatch(/pinSignals/)
  })

  it("n'importe ni clock.js, ni scheduler.js, ni runtimeOrchestrator.js, ni simulationRuntimeIntegration.js, ni ArduinoSimulator.js, ni pwmSignal.js", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*simulationRuntimeIntegration[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*ArduinoSimulator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*pwmSignal[^"']*["']/)
  })

  it("ne référence jamais evaluatePwmSignal, PwmSignal, SimulatedClock ou Scheduler comme identifiants de code (préservation du verrou anti-introspection MB-SIM-014 §7/§23, étendu ici à la présentation)", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/evaluatePwmSignal/)
    expect(source).not.toMatch(/\bPwmSignal\b/)
    expect(source).not.toMatch(/\bSimulatedClock\b/)
    expect(source).not.toMatch(/\bScheduler\b/)
    expect(source).not.toMatch(/\bRuntimeOrchestrator\b/)
    expect(source).not.toMatch(/createRuntimeOrchestrator/)
  })
})

describe("MB-OBS-003 — LOCK-OBS003-04 : aucune seconde horloge, aucun temps réel", () => {
  it("n'utilise ni Date.now(), ni performance.now(), ni new Date(), ni setTimeout/setInterval/requestAnimationFrame", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/new Date\(/)
    expect(source).not.toMatch(/setTimeout/)
    expect(source).not.toMatch(/setInterval/)
    expect(source).not.toMatch(/requestAnimationFrame/)
  })
})

describe("MB-OBS-003 — LOCK-OBS003-06 : aucune mutation possible du circuit/Document", () => {
  it("n'importe rien de core/ (CommandBus, HistoryManager, HistoryService, Document)", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\/[^"']*["']/)
    expect(source).not.toMatch(/CommandBus/)
    expect(source).not.toMatch(/HistoryManager/)
    expect(source).not.toMatch(/HistoryService/)
  })

  it("n'importe pas useCircuitState.js ni useCircuit (le circuit est reçu en props, jamais découvert par le composant lui-même)", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuit[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*CircuitContext[^"']*["']/)
  })
})

describe("MB-OBS-003 — LOCK-OBS003-02/03 : aucune génération locale de samples, aucune grille temporelle, aucune interpolation de données", () => {
  it("ne définit aucune fonction de construction de grille temporelle (pas de startTime + i*samplePeriod, pas de buildSampleTimes local)", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/buildSampleTimes/)
    expect(source).not.toMatch(/startTime\s*\+\s*\w*\s*\*\s*samplePeriod/)
  })

  it("ne calcule aucune valeur interpolée entre deux samples (aucune moyenne, aucune interpolation linéaire de value)", () => {
    const source = readSourceWithoutComments(panelPath)
    expect(source).not.toMatch(/interpolat/i)
    expect(source).not.toMatch(/lerp/i)
  })
})

describe("MB-OBS-003 — sens de dépendance unique, jamais inversé", () => {
  it("temporalObservationContract.js et observationContract.js n'importent pas TemporalObservationPanel.jsx (Observation reste ignorante de la Présentation)", () => {
    for (const sourcePath of [temporalContractPath, observationContractPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer TemporalObservationPanel`).not.toMatch(
        /TemporalObservationPanel/
      )
    }
  })

  it("measurementContract.js reste indépendant : n'importe pas TemporalObservationPanel.jsx et ne référence aucun mécanisme de présentation temporelle (Ticket §11)", () => {
    const source = readSourceWithoutComments(measurementContractPath)
    expect(source).not.toMatch(/TemporalObservationPanel/)
    expect(source).not.toMatch(/observeTemporal/)
  })

  it("clock.js, scheduler.js, runtimeOrchestrator.js, ArduinoSimulator.js, pwmSignal.js, resolution.js, preparation.js, canonicalRegistry.js n'importent pas TemporalObservationPanel.jsx", () => {
    for (const sourcePath of [
      clockPath,
      schedulerPath,
      runtimeOrchestratorPath,
      arduinoSimulatorPath,
      pwmSignalPath,
      resolutionPath,
      preparationPath,
      canonicalRegistryPath,
      integrationPath,
    ]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer TemporalObservationPanel`).not.toMatch(
        /TemporalObservationPanel/
      )
    }
  })

  it("useCircuitState.js, App.jsx et Sidebar.jsx (chemin UI live) n'importent pas TemporalObservationPanel.jsx : MB-OBS-003 n'est câblé nulle part dans l'application live (décision CSA Phase 3)", () => {
    for (const sourcePath of [useCircuitStatePath, appPath, sidebarPath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas référencer TemporalObservationPanel`).not.toMatch(
        /TemporalObservationPanel/
      )
    }
  })
})

describe("MB-OBS-003 — un unique point d'entrée public", () => {
  it("TemporalObservationPanel.jsx expose exactement un composant exporté, TemporalObservationPanel", () => {
    const source = readSourceWithoutComments(panelPath)
    const exportedMatches = source.match(/^export function \w+/gm) ?? []
    expect(exportedMatches).toEqual(["export function TemporalObservationPanel"])
  })
})
