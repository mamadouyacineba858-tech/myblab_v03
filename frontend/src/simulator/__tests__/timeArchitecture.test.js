import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * MB-SIM-009 v1 — Tests architecturaux (Ticket §15 "Architecture" / §17
 * Phase 6). Preuves par inspection statique du source, sur le même motif
 * déjà en place pour resolution.js (resolutionArchitecture.test.js).
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const clockSourcePath = path.join(dir, "..", "clock.js")
const schedulerSourcePath = path.join(dir, "..", "scheduler.js")
const resolutionSourcePath = path.join(dir, "..", "resolution.js")
const canonicalRegistrySourcePath = path.join(dir, "..", "canonicalRegistry.js")

/**
 * Les invariants architecturaux portent sur le CODE (imports, appels,
 * comparaisons), pas sur la prose des commentaires JSDoc — qui doit au
 * contraire pouvoir nommer explicitement Date.now()/ArduinoSimulator/
 * runSimulation() pour documenter pourquoi ils ne sont pas utilisés (voir
 * clock.js et scheduler.js). On retire donc les commentaires bloc avant
 * d'appliquer les motifs interdits, pour ne juger que le code exécutable.
 */
function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

const FORBIDDEN_REAL_TIME_PATTERNS = [
  { label: "Date.now", pattern: /Date\.now\s*\(/ },
  { label: "performance.now", pattern: /performance\.now\s*\(/ },
  { label: "setTimeout", pattern: /\bsetTimeout\s*\(/ },
  { label: "setInterval", pattern: /\bsetInterval\s*\(/ },
  { label: "requestAnimationFrame", pattern: /\brequestAnimationFrame\s*\(/ },
]

describe("MB-SIM-009 — indépendance du temps réel (INV-SIM009-001, AC-007)", () => {
  it("clock.js n'utilise aucune horloge système", () => {
    const source = readSourceWithoutComments(clockSourcePath)
    for (const { label, pattern } of FORBIDDEN_REAL_TIME_PATTERNS) {
      expect(source, `clock.js ne devrait pas utiliser ${label}`).not.toMatch(pattern)
    }
  })

  it("scheduler.js n'utilise aucune horloge système", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    for (const { label, pattern } of FORBIDDEN_REAL_TIME_PATTERNS) {
      expect(source, `scheduler.js ne devrait pas utiliser ${label}`).not.toMatch(pattern)
    }
  })
})

describe("MB-SIM-009 — absence de couplage Arduino (INV-SIM009-N06, AC-008)", () => {
  it("clock.js et scheduler.js n'importent pas et ne référencent pas ArduinoSimulator", () => {
    for (const sourcePath of [clockSourcePath, schedulerSourcePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/ArduinoSimulator/)
      expect(source).not.toMatch(/from\s+["'][^"']*arduino[^"']*["']/i)
    }
  })
})

describe("MB-SIM-009 — absence de dépendance au Registry canonique (INV-SIM009-010, AC-009)", () => {
  it("clock.js et scheduler.js n'importent pas canonicalRegistry.js", () => {
    for (const sourcePath of [clockSourcePath, schedulerSourcePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/canonicalRegistry/)
    }
  })
})

describe("MB-SIM-009 — Scheduler sans logique de composant ni de solveur (INV-SIM009-N01, INV-SIM009-N02)", () => {
  it("scheduler.js ne compare aucun type de composant électronique", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    const COMPONENT_TYPES = [
      "CAPACITOR", "SERVO", "ARDUINO", "RESISTOR", "DIODE", "DC_MOTOR",
      "POTENTIOMETER", "NPN_TRANSISTOR", "LDR", "THERMISTOR", "POWER", "LED",
    ]
    for (const type of COMPONENT_TYPES) {
      const strictEquality = new RegExp(`type\\s*(===|!==)\\s*["']${type}["']`)
      expect(source, `scheduler.js ne devrait pas comparer un type à "${type}"`).not.toMatch(strictEquality)
    }
  })

  it("scheduler.js et clock.js ne contiennent aucune référence au solveur DC", () => {
    for (const sourcePath of [clockSourcePath, schedulerSourcePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/getDcContribution/)
      expect(source).not.toMatch(/computeDcAnalysis/)
      expect(source).not.toMatch(/resolveSignals/)
      expect(source).not.toMatch(/prepareCircuit/)
      expect(source).not.toMatch(/runSimulation/)
    }
  })
})

describe("MB-SIM-009 — Clock/Scheduler strictement séparés (INV-SIM009-008, INV-SIM009-N03)", () => {
  it("clock.js n'importe pas scheduler.js (la Clock ne dépend pas du Scheduler)", () => {
    const source = readSourceWithoutComments(clockSourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/\bScheduler\b/)
  })

  it("scheduler.js importe clock.js (le Scheduler consomme la Clock, jamais l'inverse)", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    expect(source).toMatch(/from\s+["']\.\/clock\.js["']/)
  })
})

describe("MB-SIM-009 — resolution.js reste sans état temporel (INV-SIM009-009, AC-010)", () => {
  it("resolution.js n'importe ni clock.js ni scheduler.js, et ne référence ni SimulatedClock ni Scheduler", () => {
    const source = readSourceWithoutComments(resolutionSourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/clock\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/SimulatedClock/)
    expect(source).not.toMatch(/\bScheduler\b/)
  })
})

describe("MB-SIM-009 — canonicalRegistry.js reste purement déclaratif (INV-SIM009-010, AC-009)", () => {
  it("canonicalRegistry.js n'importe ni clock.js ni scheduler.js, et ne référence ni SimulatedClock ni Scheduler", () => {
    const source = readSourceWithoutComments(canonicalRegistrySourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/clock\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/SimulatedClock/)
    expect(source).not.toMatch(/\bScheduler\b/)
  })
})

/**
 * A7-C5-PREQ — Tests architecturaux (§34 du ticket, TD-57 à TD-66).
 *
 * Mêmes preuves par inspection statique que MB-SIM-009 ci-dessus, étendues
 * au Generic Timed Digital Output Runtime : scheduler.js/clock.js/
 * resolution.js/canonicalRegistry.js restent strictement ignorants du
 * Timed Runtime, et le compositeur générique (simulationRuntimeIntegration.js)
 * ne contient aucun littéral de composant réel interdit par ce PREQ.
 */

const timedDigitalContributionRegistrySourcePath = path.join(dir, "..", "timedDigitalContributionRegistry.js")
const simulationRuntimeIntegrationSourcePath = path.join(dir, "..", "simulationRuntimeIntegration.js")

describe("A7-C5-PREQ — scheduler.js reste générique, ignorant de tout composant (TD-57/TD-58)", () => {
  it("TD-57 — scheduler.js ne contient aucun nom de composant électronique", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    const COMPONENT_TYPES = [
      "CAPACITOR", "SERVO", "ARDUINO", "RESISTOR", "DIODE", "DC_MOTOR",
      "POTENTIOMETER", "NPN_TRANSISTOR", "LDR", "THERMISTOR", "POWER", "LED",
    ]
    for (const type of COMPONENT_TYPES) {
      const strictEquality = new RegExp(`type\\s*(===|!==)\\s*["']${type}["']`)
      expect(source, `scheduler.js ne devrait pas comparer un type à "${type}"`).not.toMatch(strictEquality)
    }
  })

  it("TD-58 — scheduler.js ne connaît aucun Signal", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    expect(source).not.toMatch(/\bSignal\b/)
  })

  it("TD-59 — scheduler.js ne connaît pas canonicalRegistry", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    expect(source).not.toMatch(/canonicalRegistry/)
  })

  it("TD-60 — scheduler.js ne connaît pas resolution.js", () => {
    const source = readSourceWithoutComments(schedulerSourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/resolution\.js["']/)
    expect(source).not.toMatch(/resolveSignals/)
    expect(source).not.toMatch(/resolveSourceDrivenPinSignals/)
  })

  it("scheduler.js et clock.js n'importent pas timedDigitalContributionRegistry.js ni simulationRuntimeIntegration.js", () => {
    for (const sourcePath of [schedulerSourcePath, clockSourcePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source).not.toMatch(/timedDigitalContributionRegistry/)
      expect(source).not.toMatch(/simulationRuntimeIntegration/)
    }
  })
})

describe("A7-C5-PREQ — resolution.js reste sans connaissance du Timed Runtime (TD-61/TD-62)", () => {
  it("TD-61 — resolution.js ne connaît pas le Timed Runtime (aucun import/référence timedDigitalContributionRegistry)", () => {
    const source = readSourceWithoutComments(resolutionSourcePath)
    expect(source).not.toMatch(/timedDigitalContributionRegistry/)
    expect(source).not.toMatch(/TimedDigital/)
  })

  it("TD-62 — resolution.js ne connaît pas Scheduler (déjà vérifié pour Clock/Scheduler ci-dessus, reconfirmé pour ce PREQ)", () => {
    const source = readSourceWithoutComments(resolutionSourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/\bScheduler\b/)
  })
})

describe("A7-C5-PREQ — clock.js reste sans connaissance du Timed Runtime (TD-63)", () => {
  it("TD-63 — clock.js n'importe pas et ne référence pas timedDigitalContributionRegistry.js", () => {
    const source = readSourceWithoutComments(clockSourcePath)
    expect(source).not.toMatch(/timedDigitalContributionRegistry/)
    expect(source).not.toMatch(/TimedDigital/)
  })
})

describe("A7-C5-PREQ — canonicalRegistry.js reste sans connaissance du Scheduler (TD-64)", () => {
  it("TD-64 — canonicalRegistry.js n'importe pas et ne référence pas scheduler.js/Scheduler", () => {
    const source = readSourceWithoutComments(canonicalRegistrySourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/\bScheduler\b/)
    expect(source).not.toMatch(/timedDigitalContributionRegistry/)
  })
})

describe("A7-C5-PREQ — aucun littéral interdit dans le code de production du PREQ (TD-65)", () => {
  it("TD-65 — timedDigitalContributionRegistry.js et simulationRuntimeIntegration.js ne contiennent aucun littéral HC_SR04/DISTANCE/TRIG/ECHO/ultrasonic/vitesse du son", () => {
    for (const sourcePath of [timedDigitalContributionRegistrySourcePath, simulationRuntimeIntegrationSourcePath]) {
      const source = fs.readFileSync(sourcePath, "utf-8")
      for (const forbidden of ["HC_SR04", "HC-SR04", "DISTANCE", "TRIG", "ECHO", "ultrasonic"]) {
        expect(source, `${sourcePath} : ${forbidden}`).not.toMatch(new RegExp(forbidden, "i"))
      }
      expect(source, `${sourcePath} : speed of sound`).not.toMatch(/speed of sound/i)
    }
  })
})

describe("A7-C5-PREQ — simulationRuntimeIntegration.js reste un compositeur générique pour le Timed Runtime (TD-66)", () => {
  it("TD-66 — aucune branche de type spécifique pour un timed producer (seule comparaison de type littérale : RUNTIME_COMPONENT_TYPE/\"ARDUINO\", déjà verrouillée avant ce PREQ)", () => {
    const source = readSourceWithoutComments(simulationRuntimeIntegrationSourcePath)
    const typeComparisons = source.match(/\.type\s*(===|!==)\s*["'][A-Z_]+["']/g) ?? []
    for (const comparison of typeComparisons) {
      expect(comparison, "seule ARDUINO peut être comparée directement dans ce fichier").toMatch(/["']ARDUINO["']/)
    }
  })

  it("simulationRuntimeIntegration.js importe timedDigitalContributionRegistry.js (composition, pas duplication de son contrat)", () => {
    const source = readSourceWithoutComments(simulationRuntimeIntegrationSourcePath)
    expect(source).toMatch(/from\s+["']\.\/timedDigitalContributionRegistry\.js["']/)
  })
})
