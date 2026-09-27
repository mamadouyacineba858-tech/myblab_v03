import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  createDigitalTransitionStore,
  recordDigitalTransition,
  consumeDigitalTransitions,
  clearDigitalTransitions,
  retainDigitalTransitionUids,
} from "../digitalTransitions.js"
import {
  SIMULATION_STEP_MS,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  runSimulationWithRuntime,
} from "../simulationRuntimeIntegration.js"
import { runSimulation } from "../engine.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { InvalidDigitalTransitionError } from "../errors/index.js"
import { Signal } from "../signals.js"

/**
 * A12-NEOPIXEL-PREQ-EVENT-TIMING-001 — transitions numériques horodatées
 * (ET-01 à ET-20). Aucun WS2812/NeoPixel : le producteur de transitions
 * utilisé ici est un fixture timed (type canonique NPN_TRANSISTOR au travers
 * d'un Registry temporel isolé), jamais enregistré en production.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

function readSourceWithoutComments(name) {
  return readFileSync(resolve(__dirname, "..", name), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
}

function t(pinId, timeMs, signal) {
  return { pinId, timeMs, signal }
}

const circuitSansEvenement = {
  components: [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
  ],
  wires: [
    { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ],
}

// Fixture : producteur timed qui, pendant UN step, émet trois transitions
// fractionnaires dans l'intervalle ]t - dt, t] et expose via SignalMap
// uniquement le niveau final.
function pulseProducerFixture(session, calls) {
  return createTimedDigitalContributionRegistry({
    contributions: new Map([["NPN_TRANSISTOR", ({ currentTimeMs }) => {
      calls.push(currentTimeMs)
      const start = currentTimeMs - SIMULATION_STEP_MS
      recordDigitalTransition(session.digitalTransitions, "px", t("emitter", start, Signal.LOW))
      recordDigitalTransition(session.digitalTransitions, "px", t("emitter", start + 0.0004, Signal.HIGH))
      recordDigitalTransition(session.digitalTransitions, "px", t("emitter", start + 0.0012, Signal.LOW))
      return { state: { lastMs: currentTimeMs }, outputs: new Map([["emitter", Signal.LOW]]) }
    }]]),
  })
}

describe("A12-PREQ — validation des transitions", () => {
  it("ET-01 — timestamp fractionnaire accepté", () => {
    const store = createDigitalTransitionStore()
    const recorded = recordDigitalTransition(store, "u", t("p", 10.0008, Signal.HIGH))
    expect(recorded).toEqual({ pinId: "p", timeMs: 10.0008, signal: Signal.HIGH })
    expect(Object.isFrozen(recorded)).toBe(true)
    expect(consumeDigitalTransitions(store, "u", "p")).toEqual([recorded])
  })

  it("ET-04 — timestamp NaN rejeté, store inchangé", () => {
    const store = createDigitalTransitionStore()
    expect(() => recordDigitalTransition(store, "u", t("p", NaN, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(store.size).toBe(0)
  })

  it("ET-05 — timestamp ±Infinity rejeté", () => {
    const store = createDigitalTransitionStore()
    expect(() => recordDigitalTransition(store, "u", t("p", Infinity, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(() => recordDigitalTransition(store, "u", t("p", -Infinity, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(store.size).toBe(0)
  })

  it("ET-06 — timestamp négatif (ou non numérique) rejeté, jamais corrigé", () => {
    const store = createDigitalTransitionStore()
    expect(() => recordDigitalTransition(store, "u", t("p", -0.0001, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(() => recordDigitalTransition(store, "u", t("p", "1", Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(store.size).toBe(0)
  })

  it("ET-07 — ordre temporel rétrograde rejeté ; égalité acceptée ; monotonie conservée après consommation", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 5, Signal.HIGH))
    recordDigitalTransition(store, "u", t("p", 5, Signal.LOW))
    expect(() => recordDigitalTransition(store, "u", t("p", 4.9999, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(consumeDigitalTransitions(store, "u", "p").map((e) => e.signal)).toEqual([Signal.HIGH, Signal.LOW])
    expect(() => recordDigitalTransition(store, "u", t("p", 4, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(consumeDigitalTransitions(store, "u", "p")).toEqual([])
  })

  it("ET-08 — Signal hors vocabulaire canonique rejeté", () => {
    const store = createDigitalTransitionStore()
    for (const bad of [0, 1, true, false, "H", "L", "high", undefined, null]) {
      expect(() => recordDigitalTransition(store, "u", t("p", 1, bad))).toThrow(InvalidDigitalTransitionError)
    }
    expect(store.size).toBe(0)
  })

  it("clés et objet invalides rejetés", () => {
    const store = createDigitalTransitionStore()
    expect(() => recordDigitalTransition(store, "", t("p", 1, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(() => recordDigitalTransition(store, "u", t("", 1, Signal.HIGH))).toThrow(InvalidDigitalTransitionError)
    expect(() => recordDigitalTransition(store, "u", null)).toThrow(InvalidDigitalTransitionError)
    expect(() => consumeDigitalTransitions(store, "u", "p", { untilMs: NaN })).toThrow(InvalidDigitalTransitionError)
    expect(store.size).toBe(0)
  })
})

describe("A12-PREQ — ordre et consommation", () => {
  it("ET-02/ET-03 — plusieurs transitions dans un seul intervalle de 16 ms, ordre de production conservé", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 0, Signal.LOW))
    recordDigitalTransition(store, "u", t("p", 0.0004, Signal.HIGH))
    recordDigitalTransition(store, "u", t("p", 0.0012, Signal.LOW))
    expect(consumeDigitalTransitions(store, "u", "p", { untilMs: SIMULATION_STEP_MS })).toEqual([
      t("p", 0, Signal.LOW), t("p", 0.0004, Signal.HIGH), t("p", 0.0012, Signal.LOW),
    ])
  })

  it("ET-09 — une consommation ne duplique jamais les événements", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 1, Signal.HIGH))
    expect(consumeDigitalTransitions(store, "u", "p")).toHaveLength(1)
    expect(consumeDigitalTransitions(store, "u", "p")).toEqual([])
  })

  it("ET-10 — les événements postérieurs à la borne restent disponibles ; aucune perte entre deux consommations", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 15.9996, Signal.HIGH))
    recordDigitalTransition(store, "u", t("p", 16, Signal.LOW))
    recordDigitalTransition(store, "u", t("p", 16.0004, Signal.HIGH))
    expect(consumeDigitalTransitions(store, "u", "p", { untilMs: 16 }).map((e) => e.timeMs)).toEqual([15.9996, 16])
    recordDigitalTransition(store, "u", t("p", 20, Signal.LOW))
    expect(consumeDigitalTransitions(store, "u", "p", { untilMs: 32 }).map((e) => e.timeMs)).toEqual([16.0004, 20])
    expect(consumeDigitalTransitions(store, "u", "p", { untilMs: 32 })).toEqual([])
  })

  it("ET-13 — deux composants ont des flux indépendants (ordre et consommation)", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "a", t("p", 10, Signal.HIGH))
    recordDigitalTransition(store, "b", t("p", 1, Signal.LOW))
    expect(consumeDigitalTransitions(store, "a", "p")).toEqual([t("p", 10, Signal.HIGH)])
    expect(consumeDigitalTransitions(store, "b", "p")).toEqual([t("p", 1, Signal.LOW)])
  })

  it("ET-14 — deux pins d'un même composant ne se contaminent pas", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p1", 10, Signal.HIGH))
    recordDigitalTransition(store, "u", t("p2", 2, Signal.LOW))
    expect(consumeDigitalTransitions(store, "u", "p2")).toEqual([t("p2", 2, Signal.LOW)])
    expect(consumeDigitalTransitions(store, "u", "p1")).toEqual([t("p1", 10, Signal.HIGH)])
  })
})

describe("A12-PREQ — lifecycle de la session runtime", () => {
  it("la session crée un store vide, volatile, hors Document", () => {
    const session = createSimulationRuntimeSession()
    expect(session.digitalTransitions).toBeInstanceOf(Map)
    expect(session.digitalTransitions.size).toBe(0)
  })

  it("ET-11 — reset vide complètement le store (transitions ET bornes d'ordre)", () => {
    const session = createSimulationRuntimeSession()
    recordDigitalTransition(session.digitalTransitions, "u", t("p", 12, Signal.HIGH))
    resetSimulationRuntimeSession(session)
    expect(session.digitalTransitions.size).toBe(0)
    expect(consumeDigitalTransitions(session.digitalTransitions, "u", "p")).toEqual([])
    expect(() => recordDigitalTransition(session.digitalTransitions, "u", t("p", 0, Signal.LOW))).not.toThrow()

    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 1, Signal.HIGH))
    clearDigitalTransitions(store)
    expect(store.size).toBe(0)
  })

  it("ET-12 — retain live UIDs purge les composants supprimés, conserve les autres", () => {
    const session = createSimulationRuntimeSession()
    recordDigitalTransition(session.digitalTransitions, "keep", t("p", 1, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "gone", t("p", 1, Signal.HIGH))
    retainSimulationRuntimeSessionUids(session, new Set(["keep"]))
    expect([...session.digitalTransitions.keys()]).toEqual(["keep"])
    expect(consumeDigitalTransitions(session.digitalTransitions, "gone", "p")).toEqual([])
    expect(consumeDigitalTransitions(session.digitalTransitions, "keep", "p")).toEqual([t("p", 1, Signal.HIGH)])

    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "x", t("p", 1, Signal.HIGH))
    retainDigitalTransitionUids(store, new Set())
    expect(store.size).toBe(0)
  })
})

describe("A12-PREQ — intégration runtime : un seul Scheduler, un seul step", () => {
  it("ET-02/ET-15 — trois transitions sub-µs dans un step de 16 ms : une seule avance du Scheduler unique, SignalMap = niveau final", () => {
    const session = createSimulationRuntimeSession()
    const calls = []
    const registry = pulseProducerFixture(session, calls)
    const components = [{ uid: "px", type: "NPN_TRANSISTOR", x: 0, y: 0 }]

    const pinSignals = runSimulationWithRuntime(components, [], {
      dt: SIMULATION_STEP_MS, runtimeSession: session, timedDigitalContributionRegistry: registry,
    })
    const scheduler = session.scheduler
    expect(calls).toEqual([SIMULATION_STEP_MS])
    expect(scheduler.getCurrentTime()).toBe(SIMULATION_STEP_MS)
    expect(pinSignals.get("px:emitter")).toBe(Signal.LOW)
    expect(consumeDigitalTransitions(session.digitalTransitions, "px", "emitter", { untilMs: scheduler.getCurrentTime() }))
      .toEqual([t("emitter", 0, Signal.LOW), t("emitter", 0.0004, Signal.HIGH), t("emitter", 0.0012, Signal.LOW)])

    runSimulationWithRuntime(components, [], {
      dt: SIMULATION_STEP_MS, runtimeSession: session, timedDigitalContributionRegistry: registry,
    })
    expect(session.scheduler).toBe(scheduler)
    expect(scheduler.getCurrentTime()).toBe(2 * SIMULATION_STEP_MS)
    expect(consumeDigitalTransitions(session.digitalTransitions, "px", "emitter").map((e) => e.timeMs))
      .toEqual([16, 16.0004, 16.0012])
  })

  it("ET-15 — digitalTransitions.js ne crée ni Scheduler ni Clock", () => {
    const source = readSourceWithoutComments("digitalTransitions.js")
    expect(source).not.toMatch(/scheduler|clock|Scheduler|Clock/)
    expect(source).not.toMatch(/resolution|engine/)
  })

  it("ET-16 — scheduler.js ne connaît toujours ni Signal, ni composant, ni transition, et n'est pas importé par le module", () => {
    const source = readSourceWithoutComments("scheduler.js")
    expect(source).not.toMatch(/\bSignal\b|signals\.js|DigitalTransition|digitalTransitions|pinId|\buid\b/)
  })

  it("ET-17/ET-18 — circuit sans capacité événementielle : contrat historique et pinSignals identiques, store vide, aucun Scheduler", () => {
    const { components, wires } = circuitSansEvenement
    const historique = runSimulation(components, wires)
    const sansSession = runSimulationWithRuntime(components, wires)
    const session = createSimulationRuntimeSession()
    const avecSession = runSimulationWithRuntime(components, wires, { dt: SIMULATION_STEP_MS, runtimeSession: session })
    expect(sansSession).toBeInstanceOf(Map)
    expect(sansSession).toEqual(historique)
    expect(avecSession).toEqual(historique)
    expect(session.digitalTransitions.size).toBe(0)
    expect(session.scheduler).toBeNull()
  })

  it("ET-18 — producteur timed sans transitions : pinSignals identique avec ou sans session, store vide", () => {
    const registry = createTimedDigitalContributionRegistry({
      contributions: new Map([["NPN_TRANSISTOR", ({ currentTimeMs }) => ({
        state: undefined, outputs: new Map([["emitter", currentTimeMs >= 16 ? Signal.HIGH : Signal.LOW]]),
      })]]),
    })
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    const session = createSimulationRuntimeSession()
    const avec = runSimulationWithRuntime(components, [], { dt: 16, runtimeSession: session, timedDigitalContributionRegistry: registry })
    const sans = runSimulationWithRuntime(components, [], { dt: 16, timedDigitalContributionRegistry: registry })
    expect(avec).toEqual(sans)
    expect(session.digitalTransitions.size).toBe(0)
  })

  it("ET-19 — SIMULATION_STEP_MS reste 16 ms", () => {
    expect(SIMULATION_STEP_MS).toBe(16)
  })

  it("ET-20 — aucune horloge système dans le nouveau mécanisme", () => {
    const source = readSourceWithoutComments("digitalTransitions.js")
    for (const pattern of [/Date\.now\s*\(/, /performance\.now\s*\(/, /\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(/]) {
      expect(source).not.toMatch(pattern)
    }
  })
})
