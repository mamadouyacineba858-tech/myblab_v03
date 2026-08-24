import { describe, it, expect } from "vitest"
import { observeTemporal, TemporalObservationStatus } from "../temporalObservationContract.js"
import { ArduinoSimulator } from "../../simulator/arduino/ArduinoSimulator.js"
import { createRuntimeOrchestrator } from "../../simulator/runtimeOrchestrator.js"
import { Scheduler } from "../../simulator/scheduler.js"
import { Signal } from "../../simulator/signals.js"

/**
 * MB-OBS-002 — Tests comportementaux de l'extension temporelle.
 *
 * Couvre la matrice de tests exigée par le Blueprint §13 : validation,
 * grille d'échantillonnage, sémantique de endTime, ordonnancement,
 * déterminisme, intégration runtime, scénario PWM de référence,
 * disponibilité explicite, non-mutation du Document.
 *
 * Fixtures PWM reprises à l'identique de pwmRuntime.test.js
 * (circuitArduinoVersLed, table temporelle 100Hz/value=127) pour permettre
 * une validation croisée directe avec la preuve déjà établie MB-SIM-014.
 */

function poweredResistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
  const components = [power, resistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
    { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires }
}

function poweredTransistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 }
  const components = [power, transistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" },
    { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
  ]
  return { components, wires }
}

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

// Même configuration exacte que pwmRuntime.test.js — "table temporelle" :
// 100Hz, period=10ms, value=127 -> dutyCycle≈0.498, dutyBoundary≈4.9804ms.
function pwmOrchestratorD2Value127() {
  const runtime = new ArduinoSimulator({ pwmFrequencyHz: 100 })
  const orchestrator = createRuntimeOrchestrator({ runtime })
  runtime.start()
  runtime.tick(0)
  runtime.analogWrite("D2", 127)
  return orchestrator
}

describe("MB-OBS-002 — Validation de la requête temporelle", () => {
  const { components, wires } = poweredResistorCircuit()
  const baseTarget = { kind: "PIN", componentUid: "r1", pinId: "A" }

  it("endTime < startTime -> INVALID, aucun échantillon", () => {
    const result = observeTemporal(
      { target: baseTarget, quantity: "VOLTAGE", startTime: 10, endTime: 5, samplePeriod: 1 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
    expect(result.samples).toEqual([])
  })

  it("samplePeriod = 0 -> INVALID", () => {
    const result = observeTemporal(
      { target: baseTarget, quantity: "VOLTAGE", startTime: 0, endTime: 10, samplePeriod: 0 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
  })

  it("samplePeriod négatif -> INVALID", () => {
    const result = observeTemporal(
      { target: baseTarget, quantity: "VOLTAGE", startTime: 0, endTime: 10, samplePeriod: -1 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
  })

  it("startTime négatif -> INVALID", () => {
    const result = observeTemporal(
      { target: baseTarget, quantity: "VOLTAGE", startTime: -5, endTime: 10, samplePeriod: 1 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
  })

  it("startTime/endTime/samplePeriod non finis (NaN, Infinity) -> INVALID", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const result = observeTemporal(
        { target: baseTarget, quantity: "VOLTAGE", startTime: 0, endTime: bad, samplePeriod: 1 },
        components,
        wires
      )
      expect(result.status).toBe(TemporalObservationStatus.INVALID)
    }
  })

  it("requête totalement absente (null) -> INVALID sans lever d'exception", () => {
    const result = observeTemporal(null, components, wires)
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
  })

  it("target inconnu (composant inexistant) -> INVALID unique, aucune série partielle (pas N échantillons INVALID identiques)", () => {
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "ghost", pinId: "A" }, quantity: "VOLTAGE", startTime: 0, endTime: 100, samplePeriod: 1 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.INVALID)
    expect(result.samples).toEqual([])
    expect(typeof result.reason).toBe("string")
  })
})

describe("MB-OBS-002 — Grille d'échantillonnage déterministe (Blueprint §5)", () => {
  const { components, wires } = poweredResistorCircuit()
  const target = { kind: "PIN", componentUid: "r1", pinId: "A" }

  it("startTime=0, endTime=30, samplePeriod=10 -> [0, 10, 20, 30] (endTime sur la grille, inclus)", () => {
    const result = observeTemporal({ target, quantity: "VOLTAGE", startTime: 0, endTime: 30, samplePeriod: 10 }, components, wires)
    expect(result.samples.map((s) => s.time)).toEqual([0, 10, 20, 30])
  })

  it("startTime=0, endTime=25, samplePeriod=10 -> [0, 10, 20] (endTime hors grille, exclu, aucun point inventé)", () => {
    const result = observeTemporal({ target, quantity: "VOLTAGE", startTime: 0, endTime: 25, samplePeriod: 10 }, components, wires)
    expect(result.samples.map((s) => s.time)).toEqual([0, 10, 20])
  })

  it("startTime=5, endTime=5, samplePeriod=1 -> [5] (fenêtre ponctuelle, un seul échantillon)", () => {
    const result = observeTemporal({ target, quantity: "VOLTAGE", startTime: 5, endTime: 5, samplePeriod: 1 }, components, wires)
    expect(result.samples.map((s) => s.time)).toEqual([5])
  })

  it("échantillons strictement ordonnés par ordre croissant", () => {
    const result = observeTemporal({ target, quantity: "VOLTAGE", startTime: 0, endTime: 100, samplePeriod: 7 }, components, wires)
    const times = result.samples.map((s) => s.time)
    const sorted = [...times].sort((a, b) => a - b)
    expect(times).toEqual(sorted)
    expect(new Set(times).size).toBe(times.length)
  })

  it("tolérance flottante : endTime=1, samplePeriod=0.25 -> endTime inclus malgré l'arithmétique IEEE 754", () => {
    const result = observeTemporal({ target, quantity: "VOLTAGE", startTime: 0, endTime: 1, samplePeriod: 0.25 }, components, wires)
    expect(result.samples.map((s) => s.time)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe("MB-OBS-002 — Déterminisme (AC-02)", () => {
  it("même requête, même circuit (DC, sans runtime) -> série identique", () => {
    const { components, wires } = poweredResistorCircuit()
    const request = { target: { kind: "PIN", componentUid: "r1", pinId: "B" }, quantity: "CURRENT", startTime: 0, endTime: 50, samplePeriod: 5 }
    const a = observeTemporal(request, components, wires)
    const b = observeTemporal(request, components, wires)
    expect(a).toEqual(b)
  })

  it("même requête, même configuration runtime (PWM) -> série identique", () => {
    const { components, wires } = circuitArduinoVersLed()
    const request = { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 1 }
    const a = observeTemporal(request, components, wires, { orchestrators: new Map([["ard1", pwmOrchestratorD2Value127()]]) })
    const b = observeTemporal(request, components, wires, { orchestrators: new Map([["ard1", pwmOrchestratorD2Value127()]]) })
    expect(a).toEqual(b)
  })
})

describe("MB-OBS-002 — Scénario PWM de référence (Ticket §J, Blueprint §9, AC-05)", () => {
  it("observe le pin D2 (100Hz, dutyCycle≈0.498) toutes les 1ms de t=0 à t=10 -> transitions identiques à la table déjà établie par MB-SIM-014 (t=0 HIGH, t=4 HIGH, t=5 LOW, t=9 LOW, t=10 HIGH)", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = pwmOrchestratorD2Value127()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 1 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )

    expect(result.status).toBe(TemporalObservationStatus.VALID)
    expect(result.samples).toHaveLength(11)
    expect(result.samples.every((s) => s.status === TemporalObservationStatus.VALID)).toBe(true)

    const byTime = new Map(result.samples.map((s) => [s.time, s.value]))
    expect(byTime.get(0)).toBe(Signal.HIGH)
    expect(byTime.get(4)).toBe(Signal.HIGH)
    expect(byTime.get(5)).toBe(Signal.LOW)
    expect(byTime.get(9)).toBe(Signal.LOW)
    expect(byTime.get(10)).toBe(Signal.HIGH)
  })

  it("sample.time correspond exactement au temps simulé utilisé pour évaluer le signal (aucune dérive)", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = pwmOrchestratorD2Value127()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 1 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )
    expect(result.samples.map((s) => s.time)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it("la LED câblée (led1:anode) reflète les mêmes transitions que le pin PWM source, à travers le pipeline de résolution existant, non modifié", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = pwmOrchestratorD2Value127()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "led1", pinId: "anode" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 5 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )
    const byTime = new Map(result.samples.map((s) => [s.time, s.value]))
    expect(byTime.get(0)).toBe(Signal.HIGH)
    expect(byTime.get(5)).toBe(Signal.LOW)
    expect(byTime.get(10)).toBe(Signal.HIGH)
  })

  it("fenêtre débutant après t=0 (startTime=6) : le Scheduler local avance directement à 6ms sans passer par les instants intermédiaires observés", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = pwmOrchestratorD2Value127()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 6, endTime: 10, samplePeriod: 4 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )
    expect(result.samples.map((s) => s.time)).toEqual([6, 10])
    const byTime = new Map(result.samples.map((s) => [s.time, s.value]))
    expect(byTime.get(6)).toBe(Signal.LOW)
    expect(byTime.get(10)).toBe(Signal.HIGH)
  })
})

describe("MB-OBS-002 — Requête sans composant Runtime : aucun Scheduler nécessaire (DC pur)", () => {
  it("tous les échantillons d'une observation DC pure portent la même valeur (aucune dépendance temporelle réelle du modèle statique)", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", startTime: 0, endTime: 40, samplePeriod: 10 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.VALID)
    const values = result.samples.map((s) => s.value)
    expect(new Set(values).size).toBe(1)
    expect(result.samples.every((s) => s.status === TemporalObservationStatus.VALID)).toBe(true)
  })
})

describe("MB-OBS-002 — Disponibilité explicite par échantillon (Blueprint §7)", () => {
  it("cible dont le courant n'est pas canoniquement disponible (composant 3 bornes) -> chaque échantillon UNAVAILABLE avec reason explicite, jamais silencieusement omis", () => {
    const { components, wires } = poweredTransistorCircuit()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "t1", pinId: "collector" }, quantity: "CURRENT", startTime: 0, endTime: 20, samplePeriod: 10 },
      components,
      wires
    )
    expect(result.status).toBe(TemporalObservationStatus.VALID)
    expect(result.samples).toHaveLength(3)
    for (const sample of result.samples) {
      expect(sample.status).toBe(TemporalObservationStatus.UNAVAILABLE)
      expect(sample.value).toBeNull()
      expect(typeof sample.reason).toBe("string")
    }
  })
})

describe("MB-OBS-002 — AC-07 : le Document n'est jamais muté par une observation temporelle", () => {
  it("observeTemporal() ne modifie pas les tableaux components/wires (cas DC)", () => {
    const { components, wires } = poweredResistorCircuit()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))

    observeTemporal({ target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", startTime: 0, endTime: 30, samplePeriod: 10 }, components, wires)

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })

  it("observeTemporal() ne modifie pas components/wires (cas runtime/PWM)", () => {
    const { components, wires } = circuitArduinoVersLed()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))
    const orchestrator = pwmOrchestratorD2Value127()

    observeTemporal(
      { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 2 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })
})

describe("MB-OBS-002 — Le Scheduler partagé n'est jamais rembobiné", () => {
  it("un orchestrators fourni dont le Scheduler est déjà au-delà de startTime -> INVALID explicite, aucune exception levée, aucune série partielle", () => {
    const { components, wires } = circuitArduinoVersLed()
    const sharedScheduler = new Scheduler()
    sharedScheduler.advance(500) // déjà à 500ms
    const orchestrator = createRuntimeOrchestrator({ scheduler: sharedScheduler, runtime: new ArduinoSimulator({ pwmFrequencyHz: 100 }) })

    let result
    expect(() => {
      result = observeTemporal(
        { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 10, samplePeriod: 1 },
        components,
        wires,
        { orchestrators: new Map([["ard1", orchestrator]]) }
      )
    }).not.toThrow()

    expect(result.status).toBe(TemporalObservationStatus.INVALID)
    expect(result.samples).toEqual([])
    expect(result.reason).toMatch(/never rewinds/)
  })
})

describe("MB-OBS-002 — Unité restituée correctement (héritée de MB-OBS-001, aucune table dupliquée)", () => {
  it("CURRENT -> unit 'A'", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observeTemporal({ target: { kind: "PIN", componentUid: "r1", pinId: "B" }, quantity: "CURRENT", startTime: 0, endTime: 10, samplePeriod: 5 }, components, wires)
    expect(result.unit).toBe("A")
  })

  it("LOGICAL_STATE -> unit 'LOGIC'", () => {
    const { components, wires } = circuitArduinoVersLed()
    const orchestrator = pwmOrchestratorD2Value127()
    const result = observeTemporal(
      { target: { kind: "PIN", componentUid: "ard1", pinId: "D2" }, quantity: "LOGICAL_STATE", startTime: 0, endTime: 5, samplePeriod: 5 },
      components,
      wires,
      { orchestrators: new Map([["ard1", orchestrator]]) }
    )
    expect(result.unit).toBe("LOGIC")
  })
})

describe("MB-OBS-002 — AC-08 : MB-OBS-001 (observe() à 3 arguments) reste inchangé", () => {
  it("observe() sans 4e argument continue de fonctionner à l'identique (import direct, non via observeTemporal)", async () => {
    const { observe, ObservationStatus } = await import("../observationContract.js")
    const { components, wires } = poweredResistorCircuit()
    const result = observe({ target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", time: 0 }, components, wires)
    expect(result.status).toBe(ObservationStatus.VALID)
  })
})
