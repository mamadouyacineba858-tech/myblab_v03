import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ArduinoSimulator } from "../arduino/ArduinoSimulator.js"
import { createPwmSignal, analogValueToDutyCycle, validatePwmSignal } from "../pwmSignal.js"

/**
 * MB-SIM-014A — PWM Frequency Configuration (Ticket §18, T1-T14).
 *
 * Ces tests valident UNIQUEMENT la disponibilité d'une source explicite de
 * fréquence PWM sur le runtime (ArduinoSimulator). Aucun comportement PWM
 * runtime n'est testé ici (pas d'appel à evaluatePwmSignal() depuis
 * tick(), pas d'implémentation d'analogWrite()) : ces responsabilités
 * appartiennent à MB-SIM-014.
 */

const dir = path.dirname(fileURLToPath(import.meta.url))
const arduinoSimulatorSourcePath = path.join(dir, "..", "arduino", "ArduinoSimulator.js")
const pwmSignalSourcePath = path.join(dir, "..", "pwmSignal.js")

function readSourceWithoutComments(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf-8")
  return raw.replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("MB-SIM-014A — T1 : configuration valide acceptée", () => {
  it("une fréquence positive et finie est acceptée et conservée", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(sim.getPwmFrequencyHz()).toBe(100)
  })

  it("sans configuration, getPwmFrequencyHz() retourne null (pas une valeur par défaut cachée)", () => {
    const sim = new ArduinoSimulator()
    expect(sim.getPwmFrequencyHz()).toBeNull()
  })

  it("une configuration vide {} équivaut à l'absence de configuration", () => {
    const sim = new ArduinoSimulator({})
    expect(sim.getPwmFrequencyHz()).toBeNull()
  })
})

describe("MB-SIM-014A — T2 : fréquence zéro rejetée", () => {
  it("0 Hz -> rejet (RangeError à la construction)", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: 0 })).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T3 : fréquence négative rejetée", () => {
  it("-1 Hz -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: -1 })).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T4 : NaN rejeté", () => {
  it("NaN -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: NaN })).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T5 : Infinity rejeté", () => {
  it("Infinity -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: Infinity })).toThrow(RangeError)
  })

  it("-Infinity -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: -Infinity })).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T6 : type invalide rejeté", () => {
  it('"500" (chaîne) -> rejet', () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: "500" })).toThrow(RangeError)
  })

  it("null -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: null })).toThrow(RangeError)
  })

  it("undefined explicitement fourni (clé présente) -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: undefined })).toThrow(RangeError)
  })

  it("{} (objet) comme valeur de fréquence -> rejet", () => {
    expect(() => new ArduinoSimulator({ pwmFrequencyHz: {} })).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T7 : fréquence explicitement conservée, sans transformation silencieuse", () => {
  it("{ pwmFrequencyHz: 100 } conserve exactement 100, pas une valeur arrondie/transformée", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(sim.getPwmFrequencyHz()).toBe(100)
  })

  it("une fréquence non entière est conservée telle quelle (aucune règle d'entier imposée)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 123.456 })
    expect(sim.getPwmFrequencyHz()).toBe(123.456)
  })
})

describe("MB-SIM-014A — T8 : plusieurs fréquences possibles, aucune limitée à 490/500", () => {
  it("accepte librement des fréquences variées (60, 100, 1000, 123.456, 1_000_000)", () => {
    for (const freq of [60, 100, 1000, 123.456, 1_000_000]) {
      const sim = new ArduinoSimulator({ pwmFrequencyHz: freq })
      expect(sim.getPwmFrequencyHz()).toBe(freq)
    }
  })
})

describe("MB-SIM-014A — T9 : contrat analogWrite(pin, value) — signature inchangée", () => {
  it("analogWrite conserve sa signature à deux arguments et n'écrit jamais directement dans pinOutputs (MB-SIM-014 §12)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(sim.analogWrite.length).toBe(2)
    sim.start()
    sim.analogWrite("D5", 128)
    expect(sim.pinOutputs.has("D5")).toBe(false)
  })

  it("MB-SIM-014 §9 : sans pwmFrequencyHz configurée, analogWrite() échoue désormais explicitement (mise à jour de l'assertion MB-SIM-014A, dont le stub acceptait tout appel sans effet)", () => {
    const withFreq = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    const withoutFreq = new ArduinoSimulator()
    expect(() => withFreq.analogWrite("D5", 128)).not.toThrow()
    expect(() => withoutFreq.analogWrite("D5", 128)).toThrow(RangeError)
  })
})

describe("MB-SIM-014A — T10 : contrat createPwmSignal()/pwmSignal.js inchangé", () => {
  it("createPwmSignal continue de fonctionner exactement comme dans MB-SIM-013", () => {
    const pwm = createPwmSignal({ frequencyHz: 100, dutyCycle: 0.25, startTime: 0 })
    expect(pwm.frequencyHz).toBe(100)
    expect(pwm.dutyCycle).toBe(0.25)
    expect(Object.isFrozen(pwm)).toBe(true)
  })

  it("validatePwmSignal continue de rejeter les mêmes configurations invalides qu'en MB-SIM-013", () => {
    expect(validatePwmSignal({ frequencyHz: 0, dutyCycle: 0.5 }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 1.5 }).valid).toBe(false)
    expect(validatePwmSignal({ frequencyHz: 100, dutyCycle: 0.5 }).valid).toBe(true)
  })

  it("analogValueToDutyCycle continue de fonctionner exactement comme dans MB-SIM-013", () => {
    expect(analogValueToDutyCycle(0)).toBe(0)
    expect(analogValueToDutyCycle(255)).toBe(1)
  })
})

describe("MB-SIM-014A — T11 : déterminisme", () => {
  it("même configuration -> même résultat, à chaque instanciation", () => {
    for (let i = 0; i < 10; i++) {
      const sim = new ArduinoSimulator({ pwmFrequencyHz: 250 })
      expect(sim.getPwmFrequencyHz()).toBe(250)
    }
  })
})

describe("MB-SIM-014A — T12 : absence de fréquence PWM par défaut cachée", () => {
  it("ArduinoSimulator.js et pwmSignal.js ne contiennent aucune constante de fréquence PWM par défaut (500/490/DEFAULT_PWM_FREQUENCY/PWM_FREQUENCY)", () => {
    for (const sourcePath of [arduinoSimulatorSourcePath, pwmSignalSourcePath]) {
      const source = readSourceWithoutComments(sourcePath)
      expect(source, `${path.basename(sourcePath)} ne devrait pas contenir "490"`).not.toMatch(/\b490\b/)
      expect(source, `${path.basename(sourcePath)} ne devrait pas contenir "500"`).not.toMatch(/\b500\b/)
      expect(source, `${path.basename(sourcePath)} ne devrait pas déclarer DEFAULT_PWM_FREQUENCY`).not.toMatch(/DEFAULT_PWM_FREQUENCY/)
      expect(source, `${path.basename(sourcePath)} ne devrait pas déclarer une constante PWM_FREQUENCY`).not.toMatch(/\bPWM_FREQUENCY\b/)
    }
  })
})

describe("MB-SIM-014A — T13 : absence d'horloge réelle", () => {
  it("ArduinoSimulator.js n'utilise aucune horloge système (Date.now/setTimeout/setInterval/performance.now/requestAnimationFrame)", () => {
    const source = readSourceWithoutComments(arduinoSimulatorSourcePath)
    const FORBIDDEN_REAL_TIME_PATTERNS = [
      { label: "Date.now", pattern: /Date\.now\s*\(/ },
      { label: "new Date", pattern: /new\s+Date\s*\(/ },
      { label: "performance.now", pattern: /performance\.now\s*\(/ },
      { label: "setTimeout", pattern: /\bsetTimeout\s*\(/ },
      { label: "setInterval", pattern: /\bsetInterval\s*\(/ },
      { label: "requestAnimationFrame", pattern: /\brequestAnimationFrame\s*\(/ },
    ]
    for (const { label, pattern } of FORBIDDEN_REAL_TIME_PATTERNS) {
      expect(source, `ArduinoSimulator.js ne devrait pas utiliser ${label}`).not.toMatch(pattern)
    }
  })
})

describe("MB-SIM-014A — périmètre à la livraison de ce ticket (rappel historique)", () => {
  it("ArduinoSimulator.js n'importe pas runtimeOrchestrator.js (le sens de dépendance reste inchangé, y compris après MB-SIM-014)", () => {
    const source = readSourceWithoutComments(arduinoSimulatorSourcePath)
    expect(source).not.toMatch(/from\s+["'][^"']*runtimeOrchestrator[^"']*["']/)
  })
})

describe("MB-SIM-014 — mise à jour de la garde de périmètre : le comportement PWM runtime est désormais introduit, exactement comme prévu", () => {
  it("tick() appelle désormais evaluatePwmSignal (comportement PWM runtime, MB-SIM-014 §13) — remplace l'ancienne garde MB-SIM-014A qui l'interdisait explicitement avant ce ticket", () => {
    const source = readSourceWithoutComments(arduinoSimulatorSourcePath)
    expect(source).toMatch(/evaluatePwmSignal/)
  })
})
