import { describe, it, expect } from "vitest"
import { ArduinoSimulator } from "../arduino/ArduinoSimulator.js"
import { RuntimeOrchestrator, createRuntimeOrchestrator } from "../runtimeOrchestrator.js"
import { Scheduler } from "../scheduler.js"
import { Signal } from "../signals.js"
import { evaluatePwmSignal } from "../pwmSignal.js"
import { runSimulationWithRuntime } from "../simulationRuntimeIntegration.js"
import { getLedState } from "../engine.js"

/**
 * MB-SIM-014 — PWM Runtime (Ticket §20, T1-T14 + multi-runtime + intégration).
 *
 * Ces tests valident le comportement runtime complet :
 *   analogWrite(pin, value) -> PwmSignal -> tick(currentTimeMs) ->
 *   evaluatePwmSignal() -> Signal.HIGH/LOW -> SignalMap -> externalSignals
 *   -> résolution existante (resolution.js non modifié).
 *
 * MB-SIM-014 §7/§23 (décision CSA) : this._pwmSignals est un état interne,
 * volontairement dépourvu d'accesseur public dédié (aucun getPwmSignal()).
 * Les tests qui doivent inspecter un PwmSignal accèdent donc directement à
 * sim._pwmSignals.get(pin), comme prescrit par le ticket.
 */

describe("MB-SIM-014 — T1-T3 : conversion analogWrite -> dutyCycle", () => {
  it("T1 : analogWrite(D3, 0) -> dutyCycle = 0", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 0)
    expect(sim._pwmSignals.get("D3").dutyCycle).toBe(0)
  })

  it("T2 : analogWrite(D3, 255) -> dutyCycle = 1", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 255)
    expect(sim._pwmSignals.get("D3").dutyCycle).toBe(1)
  })

  it("T3 : analogWrite(D3, 128) -> dutyCycle = 128/255", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.get("D3").dutyCycle).toBeCloseTo(128 / 255, 10)
  })
})

describe("MB-SIM-014 — T4-T6 : valeurs analogWrite invalides rejetées", () => {
  it("T4 : value = -1 -> rejet", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(() => sim.analogWrite("D3", -1)).toThrow(RangeError)
  })

  it("T5 : value = 256 -> rejet", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(() => sim.analogWrite("D3", 256)).toThrow(RangeError)
  })

  it("T6 : value non entier -> rejet", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    expect(() => sim.analogWrite("D3", 128.5)).toThrow(RangeError)
  })

  it("un analogWrite rejeté ne modifie ni pinOutputs ni les PwmSignal déjà enregistrés (échec atomique)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 64)
    expect(() => sim.analogWrite("D3", 999)).toThrow(RangeError)
    // Le PwmSignal valide précédent reste inchangé (l'appel invalide n'a
    // rien remplacé, analogValueToDutyCycle lève avant createPwmSignal).
    expect(sim._pwmSignals.get("D3").dutyCycle).toBeCloseTo(64 / 255, 10)
  })
})

describe("MB-SIM-014 — T7 : sans pwmFrequencyHz, analogWrite() échoue explicitement", () => {
  it("aucune fréquence configurée -> RangeError explicite, jamais une fréquence par défaut substituée", () => {
    const sim = new ArduinoSimulator()
    expect(sim.getPwmFrequencyHz()).toBeNull()
    expect(() => sim.analogWrite("D3", 128)).toThrow(RangeError)
  })
})

describe("MB-SIM-014 — T8 : pwmFrequencyHz = 100 -> PwmSignal.frequencyHz = 100", () => {
  it("le PwmSignal créé porte exactement la fréquence configurée sur le runtime, sans transformation", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.get("D3").frequencyHz).toBe(100)
  })

  it("plusieurs fréquences arbitraires sont fidèlement reportées sur le PwmSignal (aucune limitée à 490/500)", () => {
    for (const freq of [60, 100, 1000, 123.456]) {
      const sim = new ArduinoSimulator({ pwmFrequencyHz: freq })
      sim.analogWrite("D3", 128)
      expect(sim._pwmSignals.get("D3").frequencyHz).toBe(freq)
    }
  })
})

describe("MB-SIM-014 — table temporelle (100 Hz, period=10ms, value=127 -> dutyCycle≈0.498, startTime=0)", () => {
  // analogWrite(0-255) ne peut pas produire exactement dutyCycle=0.5 (le
  // ticket illustre le principe avec duty≈0.5 ; 127/255 en est la valeur
  // entière la plus proche atteignable via le contrat réel analogWrite,
  // sans inventer un arrondi ou un cas spécial). period=10ms,
  // dutyBoundary = (127/255)*10 ≈ 4.9804ms — reproduit exactement la forme
  // de la table du ticket (HIGH avant la borne, LOW à/après la borne,
  // HIGH au redémarrage de période).
  it("t=0 -> HIGH, t=4 -> HIGH, t=5 -> LOW, t=9 -> LOW, t=10 -> HIGH (redémarrage de période)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.start()
    sim.tick(0)
    sim.analogWrite("D3", 127)

    expect(sim.tick(0).get("D3")).toBe(Signal.HIGH)
    expect(sim.tick(4).get("D3")).toBe(Signal.HIGH)
    expect(sim.tick(5).get("D3")).toBe(Signal.LOW)
    expect(sim.tick(9).get("D3")).toBe(Signal.LOW)
    expect(sim.tick(10).get("D3")).toBe(Signal.HIGH)
  })

  it("tick() ne réimplémente pas la formule PWM : son résultat est exactement evaluatePwmSignal(pwmSignal, currentTimeMs) (pwmSignal.js, non dupliqué)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.start()
    sim.tick(0)
    sim.analogWrite("D3", 127)
    const pwmSignal = sim._pwmSignals.get("D3")

    for (const t of [0, 1, 4, 5, 6, 9, 10, 23, 100]) {
      expect(sim.tick(t).get("D3")).toBe(evaluatePwmSignal(pwmSignal, t))
    }
  })
})

describe("MB-SIM-014 — startTime capturé depuis le dernier currentTimeMs connu", () => {
  it("currentTimeMs=500 puis analogWrite(D3,128) -> PwmSignal.startTime = 500", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.tick(500) // mémorise _currentTimeMs=500 (running=false n'empêche pas le snapshot)
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.get("D3").startTime).toBe(500)
  })

  it("un nouvel analogWrite() sur le même pin, à un instant ultérieur, reçoit un nouveau startTime (le PWM recommence sa phase)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.start()
    sim.tick(0)
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.get("D3").startTime).toBe(0)

    sim.tick(200)
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.get("D3").startTime).toBe(200)
  })
})

describe("MB-SIM-014 — remplacement d'un PWM déjà actif (§10)", () => {
  it("analogWrite(D3,64) puis analogWrite(D3,192) -> un seul PwmSignal actif, celui du second appel", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.analogWrite("D3", 64)
    sim.analogWrite("D3", 192)
    expect(sim._pwmSignals.size).toBe(1)
    expect(sim._pwmSignals.get("D3").dutyCycle).toBeCloseTo(192 / 255, 10)
  })
})

describe("MB-SIM-014 — mutuelle exclusivité digitalWrite/analogWrite (§14)", () => {
  it("analogWrite(D3,128) puis digitalWrite(D3, LOW) -> PwmSignal D3 supprimé, D3 = LOW", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.start()
    sim.tick(0)
    sim.analogWrite("D3", 128)
    expect(sim._pwmSignals.has("D3")).toBe(true)

    sim.digitalWrite("D3", Signal.LOW)
    expect(sim._pwmSignals.has("D3")).toBe(false)
    expect(sim.tick(0).get("D3")).toBe(Signal.LOW)
  })

  it("digitalWrite(D3, LOW) puis analogWrite(D3,128) -> le PWM devient l'état actif du pin (écrase la valeur digitale figée)", () => {
    const sim = new ArduinoSimulator({ pwmFrequencyHz: 100 })
    sim.start()
    sim.tick(0)
    sim.digitalWrite("D3", Signal.LOW)
    sim.analogWrite("D3", 255) // dutyCycle=1 -> toujours HIGH, sans ambiguïté de bord

    // pinOutputs garde encore la trace du digitalWrite (non effacée), mais
    // le tick() suivant doit refléter le PWM (HIGH), pas le LOW figé.
    expect(sim.tick(1).get("D3")).toBe(Signal.HIGH)
  })
})

describe("MB-SIM-014 — Scheduler -> tick(currentTimeMs), jamais tick(dt)", () => {
  class TickArgProbeRuntime extends ArduinoSimulator {
    constructor(options) {
      super(options)
      this.lastTickArg = null
    }
    tick(arg) {
      this.lastTickArg = arg
      return super.tick(arg)
    }
  }

  it("RuntimeOrchestrator.advance(dt) transmet le currentTimeMs absolu du Scheduler à tick(), pas dt", () => {
    const scheduler = new Scheduler()
    const runtime = new TickArgProbeRuntime()
    const orchestrator = new RuntimeOrchestrator({ scheduler, runtime })

    orchestrator.advance(25)
    expect(runtime.lastTickArg).toBe(25)

    // Second appel avec le même dt=25 : si tick(dt) était encore utilisé,
    // lastTickArg resterait 25 (même delta) ; avec tick(currentTimeMs), il
    // doit refléter le temps ABSOLU cumulé (50), preuve déterminante.
    orchestrator.advance(25)
    expect(runtime.lastTickArg).toBe(50)
  })
})

describe("MB-SIM-014 — multi-runtime : même currentTimeMs pour tous les Runtime d'un même appel (§6)", () => {
  class TickArgProbeRuntime extends ArduinoSimulator {
    constructor(options) {
      super(options)
      this.lastTickArg = null
    }
    tick(arg) {
      this.lastTickArg = arg
      return super.tick(arg)
    }
  }

  it("deux Arduino partageant un Scheduler reçoivent exactement le même currentTimeMs lors d'un même appel à runSimulationWithRuntime()", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "ard2", type: "ARDUINO", x: 10, y: 0 },
    ]
    const sharedScheduler = new Scheduler()
    const runtimeA = new TickArgProbeRuntime()
    const runtimeB = new TickArgProbeRuntime()
    const orchestrators = new Map([
      ["ard1", createRuntimeOrchestrator({ scheduler: sharedScheduler, runtime: runtimeA })],
      ["ard2", createRuntimeOrchestrator({ scheduler: sharedScheduler, runtime: runtimeB })],
    ])

    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })

    expect(runtimeA.lastTickArg).toBe(16)
    expect(runtimeB.lastTickArg).toBe(16)
    expect(runtimeA.lastTickArg).toBe(runtimeB.lastTickArg)
  })

  it("un second appel fait progresser le même currentTimeMs partagé pour les deux Runtime (pas dt x nombre de composants)", () => {
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "ard2", type: "ARDUINO", x: 10, y: 0 },
    ]
    const sharedScheduler = new Scheduler()
    const runtimeA = new TickArgProbeRuntime()
    const runtimeB = new TickArgProbeRuntime()
    const orchestrators = new Map([
      ["ard1", createRuntimeOrchestrator({ scheduler: sharedScheduler, runtime: runtimeA })],
      ["ard2", createRuntimeOrchestrator({ scheduler: sharedScheduler, runtime: runtimeB })],
    ])

    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators })

    expect(runtimeA.lastTickArg).toBe(32)
    expect(runtimeB.lastTickArg).toBe(32)
  })
})

describe("MB-SIM-014 — intégration bout-en-bout : analogWrite -> SignalMap -> externalSignals -> résolution existante", () => {
  function circuitArduinoVersLed() {
    return {
      components: [
        { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
        { uid: "led1", type: "LED", x: 10, y: 0 },
        { uid: "power1", type: "POWER", x: 20, y: 0 },
      ],
      wires: [
        { fromUid: "ard1", fromPin: "D2", toUid: "led1", toPin: "anode" },
        { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
      ],
    }
  }

  it("un PWM D2 à dutyCycle=1 (toujours HIGH), câblé à une LED, l'allume via le pipeline complet, sans modification de resolution.js", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = createRuntimeOrchestrator({
      runtime: new ArduinoSimulator({ pwmFrequencyHz: 100 }),
    })
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().analogWrite("D2", 255) // dutyCycle=1 -> HIGH à tout instant
    const orchestrators = new Map([["ard1", orchestrator]])

    const result = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })

    expect(getLedState("led1", result).on).toBe(true)
    expect(result.get("ard1:D2")).toBe(Signal.HIGH)
  })

  it("un PWM D2 à dutyCycle=0 (toujours LOW) n'allume pas la LED", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = createRuntimeOrchestrator({
      runtime: new ArduinoSimulator({ pwmFrequencyHz: 100 }),
    })
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().analogWrite("D2", 0) // dutyCycle=0 -> LOW à tout instant
    const orchestrators = new Map([["ard1", orchestrator]])

    const result = runSimulationWithRuntime(components, wires, { dt: 16, orchestrators })

    expect(getLedState("led1", result).on).toBe(false)
    expect(result.get("ard1:D2")).toBe(Signal.LOW)
  })

  it("le SignalMap produit par tick() ne contient jamais de PwmSignal brut, uniquement Signal.HIGH/Signal.LOW (§15)", () => {
    const orchestrator = createRuntimeOrchestrator({
      runtime: new ArduinoSimulator({ pwmFrequencyHz: 100 }),
    })
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().analogWrite("D2", 128)
    const { signalMap } = orchestrator.advance(16)
    expect(signalMap.size).toBeGreaterThan(0)
    for (const value of signalMap.values()) {
      expect([Signal.HIGH, Signal.LOW]).toContain(value)
    }
  })
})

describe("MB-SIM-014 — déterminisme", () => {
  it("même circuit + même séquence d'appels -> résultat identique", () => {
    function run() {
      const orchestrator = createRuntimeOrchestrator({
        runtime: new ArduinoSimulator({ pwmFrequencyHz: 100 }),
      })
      orchestrator.getRuntime().start()
      orchestrator.getRuntime().analogWrite("D2", 128)
      return orchestrator.advance(16).signalMap.get("D2")
    }
    const a = run()
    const b = run()
    expect(a).toBe(b)
  })
})

describe("MB-SIM-014 — non-régression : aucun Signal.PWM introduit, signals.js inchangé", () => {
  it("Signal expose toujours exactement UNKNOWN/LOW/HIGH/FLOATING", () => {
    expect(Object.keys(Signal).sort()).toEqual(["FLOATING", "HIGH", "LOW", "UNKNOWN"].sort())
  })
})

describe("MB-SIM-014 — aucune nouvelle API publique d'introspection (décision CSA §7/§23)", () => {
  it("ArduinoSimulator.prototype n'expose pas getPwmSignal", () => {
    expect(ArduinoSimulator.prototype.getPwmSignal).toBeUndefined()
    const sim = new ArduinoSimulator()
    expect(sim.getPwmSignal).toBeUndefined()
  })
})
