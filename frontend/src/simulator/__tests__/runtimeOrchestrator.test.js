import { describe, it, expect } from "vitest"
import {
  RuntimeOrchestrator,
  createRuntimeOrchestrator,
  mergeRuntimeSignalsIntoPinSignals,
} from "../runtimeOrchestrator.js"
import { Scheduler } from "../scheduler.js"
import { ArduinoSimulator } from "../arduino/ArduinoSimulator.js"
import { Signal } from "../signals.js"
import { InvalidTimeDeltaError } from "../errors/index.js"

/**
 * MB-SIM-010 v2 — Tests unitaires de RuntimeOrchestrator (Ticket, Phase 5).
 */

describe("RuntimeOrchestrator — état initial", () => {
  it("démarre à 0 ms sans options, avec un Scheduler et un Runtime propres", () => {
    const orchestrator = new RuntimeOrchestrator()
    expect(orchestrator.getCurrentTime()).toBe(0)
    expect(orchestrator.getScheduler()).toBeInstanceOf(Scheduler)
    expect(orchestrator.getRuntime()).toBeInstanceOf(ArduinoSimulator)
  })

  it("createRuntimeOrchestrator() produit un orchestrateur initialisé à 0 ms", () => {
    const orchestrator = createRuntimeOrchestrator()
    expect(orchestrator.getCurrentTime()).toBe(0)
    expect(orchestrator).toBeInstanceOf(RuntimeOrchestrator)
  })

  it("accepte un Scheduler et un Runtime injectés explicitement", () => {
    const scheduler = new Scheduler()
    scheduler.advance(50)
    const runtime = new ArduinoSimulator()
    const orchestrator = new RuntimeOrchestrator({ scheduler, runtime })
    expect(orchestrator.getCurrentTime()).toBe(50)
    expect(orchestrator.getScheduler()).toBe(scheduler)
    expect(orchestrator.getRuntime()).toBe(runtime)
  })
})

describe("RuntimeOrchestrator — advance(dt) fait progresser le Scheduler", () => {
  it("advance(dt) délègue au Scheduler et retourne le temps courant", () => {
    const orchestrator = new RuntimeOrchestrator()
    const result = orchestrator.advance(16)
    expect(result.time).toBe(16)
    expect(orchestrator.getCurrentTime()).toBe(16)
  })

  it("plusieurs advance() successifs accumulent le temps : 0 -> 16 -> 32 -> 48", () => {
    const orchestrator = new RuntimeOrchestrator()
    expect(orchestrator.advance(16).time).toBe(16)
    expect(orchestrator.advance(16).time).toBe(32)
    expect(orchestrator.advance(16).time).toBe(48)
  })

  it("propage InvalidTimeDeltaError depuis le Scheduler pour un delta invalide, état inchangé", () => {
    const orchestrator = new RuntimeOrchestrator()
    orchestrator.advance(10)
    expect(() => orchestrator.advance(-1)).toThrow(InvalidTimeDeltaError)
    expect(orchestrator.getCurrentTime()).toBe(10)
  })

  it("reset() ramène le temps du Scheduler orchestré à 0 ms", () => {
    const orchestrator = new RuntimeOrchestrator()
    orchestrator.advance(100)
    expect(orchestrator.reset()).toBe(0)
    expect(orchestrator.getCurrentTime()).toBe(0)
  })
})

describe("RuntimeOrchestrator — SignalMap issu du Runtime (Phase 3/4)", () => {
  it("le SignalMap est vide si le Runtime n'est pas démarré", () => {
    const orchestrator = new RuntimeOrchestrator()
    const { signalMap } = orchestrator.advance(16)
    expect(signalMap).toBeInstanceOf(Map)
    expect(signalMap.size).toBe(0)
  })

  it("le SignalMap reflète l'état des pins du Runtime une fois démarré et écrit explicitement", () => {
    const runtime = new ArduinoSimulator()
    runtime.start()
    runtime.digitalWrite("D2", Signal.HIGH)
    const orchestrator = new RuntimeOrchestrator({ runtime })

    const { signalMap } = orchestrator.advance(16)
    expect(signalMap.get("D2")).toBe(Signal.HIGH)
  })

  it("le Scheduler et le Runtime restent deux responsabilités séparées (D2) : reset() ne touche pas le Runtime", () => {
    const runtime = new ArduinoSimulator()
    runtime.start()
    runtime.digitalWrite("D3", Signal.HIGH)
    const orchestrator = new RuntimeOrchestrator({ runtime })
    orchestrator.advance(16)
    orchestrator.reset()

    expect(orchestrator.getCurrentTime()).toBe(0)
    const { signalMap } = orchestrator.advance(0)
    expect(signalMap.get("D3")).toBe(Signal.HIGH)
  })

  it("l'orchestrateur n'expose ni running, ni start(), ni stop(), ni isRunning() sur lui-même (ces éléments appartiennent au Runtime, pas à l'orchestrateur ni au Scheduler)", () => {
    const orchestrator = new RuntimeOrchestrator()
    expect(orchestrator.running).toBeUndefined()
    expect(orchestrator.start).toBeUndefined()
    expect(orchestrator.stop).toBeUndefined()
    expect(orchestrator.isRunning).toBeUndefined()
  })
})

describe("mergeRuntimeSignalsIntoPinSignals — fusion pure vers le format Simulation", () => {
  it("préfixe chaque clé du SignalMap par 'uid:' et les ajoute à une copie de pinSignals", () => {
    const pinSignals = new Map([["power1:5V", Signal.HIGH]])
    const runtimeSignalMap = new Map([["D2", Signal.HIGH], ["D3", Signal.LOW]])

    const merged = mergeRuntimeSignalsIntoPinSignals(pinSignals, "ard1", runtimeSignalMap)

    expect(merged.get("power1:5V")).toBe(Signal.HIGH)
    expect(merged.get("ard1:D2")).toBe(Signal.HIGH)
    expect(merged.get("ard1:D3")).toBe(Signal.LOW)
  })

  it("ne modifie ni pinSignals ni runtimeSignalMap en place (fonction pure)", () => {
    const pinSignals = new Map([["power1:5V", Signal.HIGH]])
    const runtimeSignalMap = new Map([["D2", Signal.HIGH]])

    const merged = mergeRuntimeSignalsIntoPinSignals(pinSignals, "ard1", runtimeSignalMap)

    expect(merged).not.toBe(pinSignals)
    expect(pinSignals.size).toBe(1)
    expect(pinSignals.has("ard1:D2")).toBe(false)
    expect(runtimeSignalMap.size).toBe(1)
  })

  it("fonctionne avec un pinSignals vide et un runtimeSignalMap vide", () => {
    const merged = mergeRuntimeSignalsIntoPinSignals(new Map(), "ard1", new Map())
    expect(merged.size).toBe(0)
  })

  it("[MB-SIM-011] en cas de conflit de clé, le signal du Runtime écrase le signal Simulation existant (comportement réel de Map.set, non inventé)", () => {
    const pinSignals = new Map([["ard1:D2", Signal.LOW]])
    const runtimeSignalMap = new Map([["D2", Signal.HIGH]])

    const merged = mergeRuntimeSignalsIntoPinSignals(pinSignals, "ard1", runtimeSignalMap)

    expect(merged.get("ard1:D2")).toBe(Signal.HIGH)
    // pinSignals original inchangé (fonction pure) : la valeur LOW d'origine
    // y reste, seule la copie fusionnée reflète l'écrasement par le Runtime.
    expect(pinSignals.get("ard1:D2")).toBe(Signal.LOW)
  })

  it("[MB-SIM-011] absence de signal Runtime pour un pin donné : la clé Simulation existante n'est pas touchée", () => {
    const pinSignals = new Map([["power1:5V", Signal.HIGH], ["led1:anode", Signal.HIGH]])
    const runtimeSignalMap = new Map() // aucun digitalWrite() pour ce composant

    const merged = mergeRuntimeSignalsIntoPinSignals(pinSignals, "ard1", runtimeSignalMap)

    expect(merged.get("power1:5V")).toBe(Signal.HIGH)
    expect(merged.get("led1:anode")).toBe(Signal.HIGH)
    expect(merged.size).toBe(2)
  })
})

describe("[MB-SIM-011] RuntimeOrchestrator.advance(dt) — ordre démontré : Scheduler avant Runtime (TEST 2)", () => {
  it("le Scheduler a déjà progressé lorsque Runtime.tick(dt) est invoqué", () => {
    class OrderProbeRuntime extends ArduinoSimulator {
      constructor(scheduler) {
        super()
        this.scheduler = scheduler
        this.timeSeenDuringTick = null
        this.start()
      }
      tick(deltaMs) {
        // Si le Scheduler n'avait pas encore avancé, cette valeur serait 0.
        this.timeSeenDuringTick = this.scheduler.getCurrentTime()
        return super.tick(deltaMs)
      }
    }

    const scheduler = new Scheduler()
    const runtime = new OrderProbeRuntime(scheduler)
    const orchestrator = new RuntimeOrchestrator({ scheduler, runtime })

    orchestrator.advance(25)

    expect(runtime.timeSeenDuringTick).toBe(25)
  })

  it("une erreur du Scheduler (dt invalide) empêche complètement l'appel à Runtime.tick()", () => {
    let tickCalled = false
    class TrackingRuntime extends ArduinoSimulator {
      tick(deltaMs) {
        tickCalled = true
        return super.tick(deltaMs)
      }
    }

    const orchestrator = new RuntimeOrchestrator({ runtime: new TrackingRuntime() })
    expect(() => orchestrator.advance(-1)).toThrow(InvalidTimeDeltaError)
    expect(tickCalled).toBe(false)
  })
})
