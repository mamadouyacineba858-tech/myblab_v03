import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Signal } from "../signals.js"
import {
  validatePwmSignal,
  createPwmSignal,
  analogValueToDutyCycle,
  evaluatePwmSignal,
} from "../pwmSignal.js"

/**
 * MB-SIM-013 — Tests contractuels de pwmSignal.js (Ticket §21, T1-T10).
 *
 * Ces tests valident le CONTRAT défini par l'ADR-013
 * (docs/governance/ADR/ADR-013-pwm-signal-model.md), pas une implémentation
 * PWM complète : pwmSignal.js n'est câblé dans aucun autre module de
 * production dans ce ticket.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const pwmSignalSourcePath = path.join(dir, "..", "pwmSignal.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-SIM-013 — T1 : construction d'un PwmSignal valide", () => {
  it("createPwmSignal retourne un objet gelé avec frequencyHz/dutyCycle/startTime", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    expect(pwm.frequencyHz).toBe(100)
    expect(pwm.dutyCycle).toBe(0.25)
    expect(pwm.startTime).toBe(0)
    expect(Object.isFrozen(pwm)).toBe(true)
  })

  it("startTime est optionnel et vaut 0 par défaut", () => {
    const pwm = createPwmSignal({ frequencyHz: 50, dutyCycle: 0.5 })
    expect(pwm.startTime).toBe(0)
  })

  it("createPwmSignal ne peut pas être muté après construction", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.5 })
    expect(() => {
      pwm.dutyCycle = 0.9
    }).toThrow()
    expect(pwm.dutyCycle).toBe(0.5)
  })
})

describe("MB-SIM-013 — T2 : validation de la fréquence", () => {
  it("rejette frequencyHz = 0 (aucune période définie)", () => {
    expect(validatePwmSignal({ frequencyHz: 0, dutyCycle: 0.5 }).valid).toBe(false)
    expect(() => createPwmSignal({ frequencyHz: 0, dutyCycle: 0.5 })).toThrow(RangeError)
  })

  it("rejette une fréquence négative", () => {
    expect(validatePwmSignal({ frequencyHz: -10, dutyCycle: 0.5 }).valid).toBe(false)
    expect(() => createPwmSignal({ frequencyHz: -10, dutyCycle: 0.5 })).toThrow(RangeError)
  })

  it("rejette NaN et Infinity", () => {
    expect(validatePwmSignal({ frequencyHz: NaN, dutyCycle: 0.5 }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: Infinity, dutyCycle: 0.5 }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: -Infinity, dutyCycle: 0.5 }).valid).toBe(false)
  })

  it("rejette une valeur non numérique", () => {
    expect(validatePwmSignal({ frequencyHz: "100", dutyCycle: 0.5 }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: null, dutyCycle: 0.5 }).valid).toBe(false)
    expect(validatePwmSignal({ dutyCycle: 0.5 }).valid).toBe(false) // omise, aucune valeur par défaut
  })

  it("accepte une fréquence très élevée, sans cas spécial", () => {
    expect(validatePwmSignal({ frequencyHz: 1_000_000, dutyCycle: 0.5 }).valid).toBe(true)
  })

  it("accepte une fréquence normale (ex: 100 Hz, 50 Hz)", () => {
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 0.5 }).valid).toBe(true)
    expect(validatePwmSignal({ frequencyHz: 50, dutyCycle: 0.5 }).valid).toBe(true)
  })
})

describe("MB-SIM-013 — T3 : validation du rapport cyclique", () => {
  it("rejette dutyCycle < 0", () => {
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: -0.1 }).valid).toBe(false)
  })

  it("rejette dutyCycle > 1", () => {
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 1.1 }).valid).toBe(false)
  })

  it("rejette NaN et une valeur non numérique", () => {
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: NaN }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: "0.5" }).valid).toBe(false)
  })

  it("accepte les bornes 0 et 1 (ratio, pas pourcentage)", () => {
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 0 }).valid).toBe(true)
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 1 }).valid).toBe(true)
  })
})

describe("MB-SIM-013 — T4 : conversion analogWrite() (0-255 -> rapport cyclique)", () => {
  it("0 -> 0 et 255 -> 1.0 (linéaire, déterministe)", () => {
    expect(analogValueToDutyCycle(0)).toBe(0)
    expect(analogValueToDutyCycle(255)).toBe(1)
  })

  it("une valeur intermédiaire donne value/255", () => {
    expect(analogValueToDutyCycle(128)).toBeCloseTo(128 / 255, 10)
  })

  it("rejette une valeur hors [0, 255]", () => {
    expect(() => analogValueToDutyCycle(-1)).toThrow(RangeError)
    expect(() => analogValueToDutyCycle(256)).toThrow(RangeError)
  })

  it("rejette une valeur non entière ou non numérique", () => {
    expect(() => analogValueToDutyCycle(1.5)).toThrow(RangeError)
    expect(() => analogValueToDutyCycle("128")).toThrow(RangeError)
    expect(() => analogValueToDutyCycle(NaN)).toThrow(RangeError)
  })
})

describe("MB-SIM-013 — T5 : évaluation temporelle à t0/t1/t2 (100 Hz, 25% duty)", () => {
  // period = 1000/100 = 10ms ; dutyBoundary = 0.25 * 10 = 2.5ms
  const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })

  it("t0 = 0ms -> HIGH (0 < 2.5)", () => {
    expect(evaluatePwmSignal(pwm, 0)).toBe(Signal.HIGH)
  })

  it("t1 = 1ms -> HIGH (1 < 2.5)", () => {
    expect(evaluatePwmSignal(pwm, 1)).toBe(Signal.HIGH)
  })

  it("t2 = 5ms -> LOW (phase = 5, 5 >= 2.5)", () => {
    expect(evaluatePwmSignal(pwm, 5)).toBe(Signal.LOW)
  })
})

describe("MB-SIM-013 — T6 : périodicité", () => {
  it("evaluatePwmSignal(p, t) === evaluatePwmSignal(p, t + n*period) pour plusieurs n", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    const period = 1000 / 100
    for (const t of [0, 1, 2.5, 4.999, 7]) {
      const base = evaluatePwmSignal(pwm, t)
      for (const n of [1, 2, 5, 100]) {
        expect(evaluatePwmSignal(pwm, t + n * period)).toBe(base)
      }
    }
  })

  it("t = period exactement se comporte comme t = 0", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    const period = 1000 / 100
    expect(evaluatePwmSignal(pwm, period)).toBe(evaluatePwmSignal(pwm, 0))
  })

  it("t > period est géré par périodicité (pas d'erreur, pas de cas spécial)", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    expect(() => evaluatePwmSignal(pwm, 999999)).not.toThrow()
  })
})

describe("MB-SIM-013 — T7 : déterminisme", () => {
  it("mêmes entrées => même résultat, à chaque appel", () => {
    const pwm = createPwmSignal({ frequencyHz: 60, dutyCycle: 0.4, startTime: 3 })
    const results = new Set()
    for (let i = 0; i < 20; i++) {
      results.add(evaluatePwmSignal(pwm, 12.5))
    }
    expect(results.size).toBe(1)
  })

  it("évaluer ne mute jamais le PwmSignal", () => {
    const pwm = createPwmSignal({ frequencyHz: 60, dutyCycle: 0.4, startTime: 3 })
    const snapshot = { ...pwm }
    evaluatePwmSignal(pwm, 12.5)
    expect({ ...pwm }).toEqual(snapshot)
  })
})

describe("MB-SIM-013 — T8 : transitions de bord HIGH/LOW", () => {
  it("dutyCycle = 0 -> toujours LOW, à tout instant", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0, startTime: 0 })
    for (const t of [0, 1, 5, 9.999, 100]) {
      expect(evaluatePwmSignal(pwm, t)).toBe(Signal.LOW)
    }
  })

  it("dutyCycle = 1 -> toujours HIGH, à tout instant", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 1, startTime: 0 })
    for (const t of [0, 1, 5, 9.999, 100]) {
      expect(evaluatePwmSignal(pwm, t)).toBe(Signal.HIGH)
    }
  })

  it("phase = dutyBoundary exactement (front descendant) -> LOW, intervalle HIGH semi-ouvert", () => {
    // period = 10ms, dutyCycle = 0.25 -> dutyBoundary = 2.5ms exactement
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    expect(evaluatePwmSignal(pwm, 2.5)).toBe(Signal.LOW)
    expect(evaluatePwmSignal(pwm, 2.4999)).toBe(Signal.HIGH)
  })

  it("t < startTime (elapsed négatif) est géré sans erreur par extension périodique arrière", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 50 })
    expect(() => evaluatePwmSignal(pwm, 0)).not.toThrow()
    expect([Signal.HIGH, Signal.LOW]).toContain(evaluatePwmSignal(pwm, 0))
  })
})

describe("MB-SIM-013 — T9 : dépendance au Scheduler, pas au temps réel", () => {
  it("pwmSignal.js n'utilise aucune horloge système (Date.now/setTimeout/setInterval/performance.now/requestAnimationFrame)", () => {
    const source = readSourceWithoutComments(pwmSignalSourcePath)
    const FORBIDDEN_REAL_TIME_PATTERNS = [
      { label: "Date.now", pattern: /Date\.now\s*\(/ },
      { label: "new Date", pattern: /new\s+Date\s*\(/ },
      { label: "performance.now", pattern: /performance\.now\s*\(/ },
      { label: "setTimeout", pattern: /\bsetTimeout\s*\(/ },
      { label: "setInterval", pattern: /\bsetInterval\s*\(/ },
      { label: "requestAnimationFrame", pattern: /\brequestAnimationFrame\s*\(/ },
    ]
    for (const { label, pattern } of FORBIDDEN_REAL_TIME_PATTERNS) {
      expect(source, `pwmSignal.js ne devrait pas utiliser ${label}`).not.toMatch(pattern)
    }
  })

  it("pwmSignal.js n'importe ni clock.js ni scheduler.js (le temps est toujours reçu en paramètre explicite)", () => {
    const source = readSourceWithoutComments(pwmSignalSourcePath)
    expect(source).not.toMatch(/from\s+["']\.\/clock\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/scheduler\.js["']/)
    expect(source).not.toMatch(/SimulatedClock/)
    expect(source).not.toMatch(/\bScheduler\b/)
  })

  it("pwmSignal.js n'importe que signals.js (module de fonctions pures sur valeur/temps)", () => {
    const source = readSourceWithoutComments(pwmSignalSourcePath)
    const importLines = source.split("\n").filter((l) => /^\s*import\s/.test(l))
    for (const line of importLines) {
      expect(line).toMatch(/from\s+["']\.\/signals\.js["']/)
    }
  })

  it("pwmSignal.js n'est importé par aucun module de production câblé (ArduinoSimulator.js, runtimeOrchestrator.js, resolution.js, canonicalRegistry.js, simulationRuntimeIntegration.js) — contrat non implémenté dans ce ticket", () => {
    const productionFiles = [
      path.join(dir, "..", "arduino", "ArduinoSimulator.js"),
      path.join(dir, "..", "runtimeOrchestrator.js"),
      path.join(dir, "..", "resolution.js"),
      path.join(dir, "..", "canonicalRegistry.js"),
      path.join(dir, "..", "simulationRuntimeIntegration.js"),
    ]
    for (const filePath of productionFiles) {
      const source = readSourceWithoutComments(filePath)
      expect(source, `${path.basename(filePath)} ne devrait pas importer pwmSignal.js dans ce ticket`).not.toMatch(
        /from\s+["'][^"']*pwmSignal[^"']*["']/
      )
    }
  })
})

describe("MB-SIM-013 — compatibilité : Signal (signals.js) reste inchangé", () => {
  it("Signal expose toujours exactement UNKNOWN/LOW/HIGH/FLOATING, aucun membre PWM ajouté", () => {
    expect(Object.keys(Signal).sort()).toEqual(["FLOATING", "HIGH", "LOW", "UNKNOWN"].sort())
  })

  it("evaluatePwmSignal ne retourne jamais autre chose qu'une valeur existante de Signal (HIGH ou LOW)", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.5 })
    for (const t of [0, 1, 5, 9, 100, 12345]) {
      const result = evaluatePwmSignal(pwm, t)
      expect([Signal.HIGH, Signal.LOW]).toContain(result)
    }
  })
})
