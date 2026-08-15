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
