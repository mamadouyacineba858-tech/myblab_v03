import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

/**
 * MB-L1-ARD-003 — §30 : verrou structurel confirmant la séparation
 * temporelle imposée par §3/§4/§21/§22/§23/§24. Même patron que
 * firmwareArchitecture.test.js (ARD-002) : preuve par inspection statique
 * du source, pas d'introspection du graphe de modules réel.
 */
const __dirname = dirname(fileURLToPath(import.meta.url))

function readCodeOnly(relativePath) {
  const raw = readFileSync(resolve(__dirname, relativePath), "utf-8")
  return raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-L1-ARD-003 — scheduler.js reste générique, Arduino-agnostic (§3)", () => {
  it("scheduler.js n'importe rien du domaine Arduino (firmware/, ArduinoSimulator)", () => {
    const source = readCodeOnly("../../../simulator/scheduler.js")
    expect(source).not.toMatch(/arduino/i)
    expect(source).not.toMatch(/firmware/i)
  })
})

describe("MB-L1-ARD-003 — firmwareCompiler.js reste pur, ignore le Scheduler (§21)", () => {
  it("n'importe ni scheduler.js, ni clock.js, ni React, ni Document/History", () => {
    const source = readCodeOnly("../firmwareCompiler.js")
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
  })

  it("n'accède à aucune horloge système (Date.now/performance.now/setTimeout/setInterval)", () => {
    const source = readCodeOnly("../firmwareCompiler.js")
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/setTimeout|setInterval/)
  })
})

describe("MB-L1-ARD-003 — firmwareExecutor.js consomme un temps injecté, jamais une horloge murale (§4/§22)", () => {
  it("n'importe ni scheduler.js, ni clock.js, ni runtimeOrchestrator.js, ni React, ni Document/History", () => {
    const source = readCodeOnly("../firmwareExecutor.js")
    expect(source).not.toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*clock\.js["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
  })

  it("n'accède à aucune horloge système ni timer (Date.now/performance.now/setTimeout/setInterval/requestAnimationFrame)", () => {
    const source = readCodeOnly("../firmwareExecutor.js")
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/)
  })
})

describe("MB-L1-ARD-003 — firmwareRuntimeController.js : Scheduler/Executor/RuntimePort autorisés, Document/History/UI exclus (§23/§30)", () => {
  it("importe scheduler.js (autorisé, seul consommateur légitime du Scheduler pour ce domaine) mais rien de React/Document/History/core/*", () => {
    const source = readCodeOnly("../firmwareRuntimeController.js")
    expect(source).toMatch(/from\s+["'][^"']*scheduler\.js["']/)
    expect(source).not.toMatch(/from\s+["']react["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*\/core\//)
    expect(source).not.toMatch(/from\s+["'][^"']*History[^"']*["']/)
    expect(source).not.toMatch(/from\s+["'][^"']*useCircuitState[^"']*["']/)
  })

  it("n'importe ni runtimeOrchestrator.js, ni simulationRuntimeIntegration.js, ni resolution.js (aucune fusion avec le pont Simulation existant)", () => {
    const source = readCodeOnly("../firmwareRuntimeController.js")
    expect(source).not.toMatch(/runtimeOrchestrator/)
    expect(source).not.toMatch(/simulationRuntimeIntegration/)
    expect(source).not.toMatch(/resolution\.js/)
  })

  it("n'accède à aucune horloge système ni timer", () => {
    const source = readCodeOnly("../firmwareRuntimeController.js")
    expect(source).not.toMatch(/Date\.now\(\)/)
    expect(source).not.toMatch(/performance\.now\(\)/)
    expect(source).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/)
  })

  it("n'instancie jamais un second Scheduler caché sans possibilité d'injection (§16) : new Scheduler()/createScheduler() n'apparaît qu'une fois, dans le repli du constructeur", () => {
    const source = readCodeOnly("../firmwareRuntimeController.js")
    const constructorCalls = [...source.matchAll(/createScheduler\(\)/g)]
    expect(constructorCalls.length).toBe(1)
  })
})

describe("MB-L1-ARD-003 — Document et History non affectés (§23)", () => {
  it("aucun des nouveaux fichiers firmware/ n'importe le Handler ARD-001, CommandBus, ou circuitModel.js", () => {
    for (const file of ["../firmwareCompiler.js", "../firmwareExecutor.js", "../firmwareRuntimeController.js"]) {
      const source = readCodeOnly(file)
      expect(source, `${file} ne devrait pas importer UpdateArduinoFirmwareHandler`).not.toMatch(/UpdateArduinoFirmwareHandler/)
      expect(source, `${file} ne devrait pas importer CommandBus`).not.toMatch(/CommandBus/)
      expect(source, `${file} ne devrait pas importer circuitModel\\.js`).not.toMatch(/circuitModel\.js/)
    }
  })
})
