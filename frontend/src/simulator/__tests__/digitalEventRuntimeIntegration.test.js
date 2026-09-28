import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { recordDigitalTransition, consumeDigitalTransitions } from "../digitalTransitions.js"
import {
  SIMULATION_STEP_MS,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  runSimulationWithRuntime,
  circuitRequiresContinuousStepping,
  computeDigitalEventContributions,
} from "../simulationRuntimeIntegration.js"
import { runSimulation } from "../engine.js"
import { createDigitalEventContributionRegistry } from "../digitalEventContributionRegistry.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { InvalidDigitalTransitionError } from "../errors/index.js"
import { Signal } from "../signals.js"

/**
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 — Generic Timestamped Digital Event
 * Consumer / Producer Runtime (EC-03 .. EC-35).
 *
 * Fixtures pédagogiques sans aucune signification de protocole, sur des types
 * canoniques existants au travers d'un Registry isolé (jamais la production) :
 * - "délai" (NPN_TRANSISTOR) : chaque transition reçue sur `base` est réémise
 *   sur `emitter` DELAY ms plus tard ; l'état compte les transitions reçues.
 * - un "producteur futur" est simulé en enregistrant directement des
 *   transitions sur la pin d'un composant NON contributeur (PNP_TRANSISTOR
 *   "src"), selon la convention du store : un producteur écrit sur sa pin.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const readSourceWithoutComments = (name) => readFileSync(resolve(__dirname, "..", name), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")

const DELAY = 0.25
const t = (pinId, timeMs, signal) => ({ pinId, timeMs, signal })

function delayLine(log = []) {
  return {
    inputPins: ["base"],
    outputPins: ["emitter"],
    contribute: ({ component, currentTimeMs, previousState, transitions }) => {
      log.push({ uid: component.uid, currentTimeMs, previousState, received: transitions })
      return {
        state: Object.freeze({ received: (previousState?.received ?? 0) + transitions.length }),
        transitions: transitions.map(({ timeMs, signal }) => t("emitter", timeMs + DELAY, signal)),
      }
    },
  }
}

const registryOf = (contribution, type = "NPN_TRANSISTOR") =>
  createDigitalEventContributionRegistry({ contributions: new Map([[type, contribution]]) })

const src = { uid: "src", type: "PNP_TRANSISTOR", x: 0, y: 0 }
const node = (uid) => ({ uid, type: "NPN_TRANSISTOR", x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

function step(components, wires, session, registry, dt = SIMULATION_STEP_MS) {
  return runSimulationWithRuntime(components, wires, { dt, runtimeSession: session, digitalEventContributionRegistry: registry })
}

describe("A12-PREQ-EC — consommation / état / temps", () => {
  it("EC-03/EC-24 — sans contributeur événementiel : historique, rien de créé, aucun Scheduler", () => {
    const components = [{ uid: "p", type: "POWER", x: 0, y: 0 }, { uid: "l", type: "LED", x: 0, y: 0 }]
    const wires = [wire("p", "5V", "l", "anode"), wire("p", "GND", "l", "cathode")]
    const session = createSimulationRuntimeSession()
    const calls = []
    const registry = registryOf(delayLine(calls)) // NPN_TRANSISTOR seul enregistré, absent du circuit
    expect(step(components, wires, session, registry)).toEqual(runSimulation(components, wires))
    expect(runSimulationWithRuntime(components, wires)).toEqual(runSimulation(components, wires))
    expect(calls).toEqual([])
    expect(session.digitalEventStates.size).toBe(0)
    expect(session.digitalTransitions.size).toBe(0)
    expect(session.scheduler).toBeNull()
  })

  it("EC-24 — producteur timed seul (précédent EVENT-TIMING) : ses transitions restent dans le store, non routées", () => {
    const session = createSimulationRuntimeSession()
    const timed = createTimedDigitalContributionRegistry({
      contributions: new Map([["PNP_TRANSISTOR", ({ currentTimeMs }) => {
        recordDigitalTransition(session.digitalTransitions, "src", t("emitter", currentTimeMs - 1, Signal.HIGH))
        return { state: undefined, outputs: null }
      }]]),
    })
    runSimulationWithRuntime([src], [], { dt: 16, runtimeSession: session, timedDigitalContributionRegistry: timed })
    expect(consumeDigitalTransitions(session.digitalTransitions, "src", "emitter")).toEqual([t("emitter", 15, Signal.HIGH)])
    expect(session.digitalEventStates.size).toBe(0)
  })

  it("EC-04/EC-05/EC-06 — ctx complet, currentTimeMs du Scheduler, previousState puis nouvel état", () => {
    const session = createSimulationRuntimeSession()
    const seen = []
    const registry = registryOf({
      inputPins: ["base"], outputPins: ["emitter"],
      contribute: (ctx) => { seen.push(ctx); return { state: { n: (ctx.previousState?.n ?? 0) + 1 }, transitions: [] } },
    })
    const a = node("a")
    step([a], [], session, registry)
    step([a], [], session, registry)
    // A12-NEOPIXEL-FUNC-WS2812B-V6-001 : + `pinSignals` (contexte pré-résolution des sources DC).
    expect(Object.keys(seen[0]).sort()).toEqual(["component", "currentTimeMs", "params", "pinSignals", "pins", "previousState", "transitions"])
    expect(seen[0].pinSignals).toEqual({ collector: Signal.UNKNOWN, base: Signal.UNKNOWN, emitter: Signal.UNKNOWN })
    expect(seen[0].component).toBe(a)
    expect(typeof seen[0].params).toBe("object")
    expect(seen.map((c) => c.currentTimeMs)).toEqual([16, 32])
    expect(session.scheduler.getCurrentTime()).toBe(32)
    expect(seen.map((c) => c.previousState)).toEqual([undefined, { n: 1 }])
    expect(session.digitalEventStates.get("a")).toEqual({ n: 2 })
  })

  it("EC-07 — l'état événementiel est volatile : jamais dans les composants/wires du Document", () => {
    const session = createSimulationRuntimeSession()
    const components = [src, node("a")]
    const wires = [wire("src", "emitter", "a", "base")]
    const before = JSON.stringify({ components, wires })
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1, Signal.HIGH))
    step(components, wires, session, registryOf(delayLine()))
    expect(JSON.stringify({ components, wires })).toBe(before)
    expect(session.digitalEventStates.get("a")).toEqual({ received: 1 })
  })

  it("EC-10/EC-11/EC-19 — plusieurs transitions fractionnaires dans UN step : toutes livrées, dans l'ordre, sans quantification", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    const times = [1.0, 1.0004, 1.0012, 2.5, 7.125]
    times.forEach((timeMs, i) => recordDigitalTransition(session.digitalTransitions, "src", t("emitter", timeMs, i % 2 ? Signal.LOW : Signal.HIGH)))
    step([src, node("a")], [wire("src", "emitter", "a", "base")], session, registryOf(delayLine(log)))
    expect(log).toHaveLength(1)
    expect(log[0].received).toEqual(times.map((timeMs, i) => t("base", timeMs, i % 2 ? Signal.LOW : Signal.HIGH)))
    expect(session.scheduler.getCurrentTime()).toBe(16)
  })

  it("EC-12 — même timestamp : ordre de production conservé", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 3, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 3, Signal.LOW))
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 3, Signal.HIGH))
    step([src, node("a")], [wire("src", "emitter", "a", "base")], session, registryOf(delayLine(log)))
    expect(log[0].received.map((e) => e.signal)).toEqual([Signal.HIGH, Signal.LOW, Signal.HIGH])
  })

  it("EC-13/EC-14 — jamais relivrée ; une transition future reste en attente jusqu'au step qui l'atteint", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    const circuit = [[src, node("a")], [wire("src", "emitter", "a", "base")]]
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 4, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 16.0001, Signal.LOW))
    step(...circuit, session, registryOf(delayLine(log)))
    step(...circuit, session, registryOf(delayLine(log)))
    step(...circuit, session, registryOf(delayLine(log)))
    expect(log.map((c) => [c.currentTimeMs, c.received.map((e) => e.timeMs)])).toEqual([[16, [4]], [32, [16.0001]], [48, []]])
  })

  it("EC-15/EC-16 — zéro, une ou plusieurs sorties ; une sortie future attend son step", () => {
    const session = createSimulationRuntimeSession()
    const received = []
    const registry = createDigitalEventContributionRegistry({
      contributions: new Map([
        ["NPN_TRANSISTOR", {
          inputPins: ["base"], outputPins: ["emitter"],
          contribute: ({ currentTimeMs }) => ({
            state: undefined,
            transitions: currentTimeMs === 16 ? [t("emitter", 2.3, Signal.HIGH), t("emitter", 2.8, Signal.LOW), t("emitter", 20, Signal.HIGH)] : [],
          }),
        }],
        ["PNP_TRANSISTOR", {
          inputPins: ["base"], outputPins: ["emitter"],
          contribute: ({ currentTimeMs, transitions }) => { received.push([currentTimeMs, transitions.map((e) => [e.timeMs, e.signal])]); return { state: undefined, transitions: null } },
        }],
      ]),
    })
    const components = [node("a"), { uid: "b", type: "PNP_TRANSISTOR", x: 0, y: 0 }]
    const wires = [wire("a", "emitter", "b", "base")]
    step(components, wires, session, registry)
    step(components, wires, session, registry)
    expect(received).toEqual([
      [16, []],
      [16, [[2.3, Signal.HIGH], [2.8, Signal.LOW]]],
      [32, [[20, Signal.HIGH]]],
    ])
  })

  it("EC-17/EC-18 — sortie invalide : erreur explicite, store et état non corrompus", () => {
    for (const bad of [
      [t("emitter", 1, Signal.HIGH), t("emitter", 2, "BOGUS")],
      [t("emitter", 5, Signal.HIGH), t("emitter", 4, Signal.LOW)],
      [t("emitter", 1, Signal.HIGH), t("collector", 2, Signal.LOW)],
    ]) {
      const session = createSimulationRuntimeSession()
      session.digitalEventStates.set("a", "before")
      const registry = registryOf({ inputPins: ["base"], outputPins: ["emitter"], contribute: () => ({ state: "after", transitions: bad }) })
      expect(() => step([node("a")], [], session, registry)).toThrow(bad[1].signal === "BOGUS" || bad[1].timeMs === 4 ? InvalidDigitalTransitionError : /outputPins/)
      expect(consumeDigitalTransitions(session.digitalTransitions, "a", "emitter")).toEqual([])
      expect(consumeDigitalTransitions(session.digitalTransitions, "a", "collector")).toEqual([])
      expect(session.digitalEventStates.get("a")).toBe("before")
    }
  })

  it("EC-20 — SIMULATION_STEP_MS reste 16", () => {
    expect(SIMULATION_STEP_MS).toBe(16)
  })
})

describe("A12-PREQ-EC — lifecycle de session", () => {
  it("EC-08/EC-27 — reset : états événementiels, transitions et temps effacés", () => {
    const session = createSimulationRuntimeSession()
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 40, Signal.HIGH))
    step([src, node("a")], [wire("src", "emitter", "a", "base")], session, registryOf(delayLine()))
    expect(session.digitalEventStates.size).toBe(1)
    resetSimulationRuntimeSession(session)
    expect(session.digitalEventStates.size).toBe(0)
    expect(session.digitalTransitions.size).toBe(0)
    expect(session.scheduler).toBeNull()
  })

  it("EC-09/EC-28 — retain : seuls les uid vivants conservent état et transitions", () => {
    const session = createSimulationRuntimeSession()
    const registry = registryOf(delayLine())
    step([node("keep"), node("gone")], [], session, registry)
    recordDigitalTransition(session.digitalTransitions, "gone", t("emitter", 99, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "keep", t("emitter", 99, Signal.HIGH))
    retainSimulationRuntimeSessionUids(session, new Set(["keep"]))
    expect([...session.digitalEventStates.keys()]).toEqual(["keep"])
    expect([...session.digitalTransitions.keys()]).toEqual(["keep"])
  })

  it("continuous stepping : requis dès qu'un contributeur événementiel est présent", () => {
    const registry = registryOf(delayLine())
    const timed = { hasTimedDigitalContribution: () => false }
    expect(circuitRequiresContinuousStepping([node("a")], timed, registry)).toBe(true)
    expect(circuitRequiresContinuousStepping([src], timed, registry)).toBe(false)
    expect(circuitRequiresContinuousStepping([node("a")])).toBe(false) // production vide
  })
})

describe("A12-PREQ-EC — routage topologique, cascade, isolation", () => {
  it("EC-29/EC-30 — deux contributeurs : états indépendants, aucun accès à l'uid voisin", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 2, Signal.LOW))
    // fan-out : un même net livre à a et b
    const components = [src, node("a"), node("b")]
    const wires = [wire("src", "emitter", "a", "base"), wire("src", "emitter", "b", "base")]
    step(components, wires, session, registryOf(delayLine(log)))
    expect(session.digitalEventStates.get("a")).toEqual({ received: 2 })
    expect(session.digitalEventStates.get("b")).toEqual({ received: 2 })
    expect(session.digitalEventStates.get("a")).not.toBe(session.digitalEventStates.get("b"))
    session.digitalEventStates.set("a", Object.freeze({ received: 100 }))
    step(components, wires, session, registryOf(delayLine(log)))
    const lastCall = (uid) => log.filter((c) => c.uid === uid).at(-1)
    expect(lastCall("a").previousState).toEqual({ received: 100 })
    expect(lastCall("b").previousState).toEqual({ received: 2 })
    expect([...session.digitalEventStates.keys()].sort()).toEqual(["a", "b"])
  })

  it("EC-31 — seules les entrées déclarées d'un même net reçoivent ; pas de livraison hors net ni vers une sortie", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1, Signal.HIGH))
    const components = [src, node("onNet"), node("offNet"), node("outOnNet")]
    const wires = [wire("src", "emitter", "onNet", "base"), wire("src", "emitter", "outOnNet", "emitter")]
    step(components, wires, session, registryOf(delayLine(log)))
    const received = Object.fromEntries(log.filter((c) => c.received.length).map((c) => [c.uid, c.received.length]))
    expect(received).toEqual({ onNet: 1 })
  })

  it("EC-32 — chaîne A -> B -> C : consume -> produce propagé dans le MÊME step, sur le même axe", () => {
    const session = createSimulationRuntimeSession()
    const log = []
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1, Signal.HIGH))
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1.4, Signal.LOW))
    // uids choisis pour que l'ordre de traitement (uid) soit l'inverse de la chaîne
    const components = [src, node("c"), node("b"), node("a")]
    const wires = [wire("src", "emitter", "c", "base"), wire("c", "emitter", "b", "base"), wire("b", "emitter", "a", "base")]
    step(components, wires, session, registryOf(delayLine(log)))
    const times = (uid) => log.filter((c) => c.uid === uid).flatMap((c) => c.received.map((e) => e.timeMs))
    expect(times("c")).toEqual([1, 1.4])
    expect(times("b")).toEqual([1 + DELAY, 1.4 + DELAY])
    expect(times("a")).toEqual([1 + DELAY + DELAY, 1.4 + DELAY + DELAY])
    expect(log.every((c) => c.currentTimeMs === 16)).toBe(true)
  })

  it("EC-33 — cycle A <-> B : borné (contributeurs + 1 rounds), déterministe, reliquat livré au step suivant", () => {
    const run = () => {
      const session = createSimulationRuntimeSession()
      const log = []
      recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 0.5, Signal.HIGH))
      const components = [src, node("a"), node("b")]
      const wires = [wire("src", "emitter", "a", "base"), wire("a", "emitter", "b", "base"), wire("b", "emitter", "a", "base")]
      step(components, wires, session, registryOf(delayLine(log)))
      const firstStepCalls = log.length
      step(components, wires, session, registryOf(delayLine(log)))
      return { firstStepCalls, log: log.map((c) => [c.uid, c.currentTimeMs, c.received.map((e) => e.timeMs)]) }
    }
    const first = run()
    expect(first.firstStepCalls).toBeLessThanOrEqual(2 * 3) // 2 contributeurs x (2 + 1) rounds
    expect(run()).toEqual(first)
    const secondStep = first.log.filter(([, time]) => time === 32)
    expect(secondStep.some(([, , received]) => received.length > 0)).toBe(true)
  })

  it("EC-34 — SignalMap inchangé : pinSignals identiques au contrat historique malgré des événements", () => {
    const session = createSimulationRuntimeSession()
    const components = [{ uid: "p", type: "POWER", x: 0, y: 0 }, src, node("a")]
    const wires = [wire("p", "5V", "a", "collector"), wire("src", "emitter", "a", "base")]
    recordDigitalTransition(session.digitalTransitions, "src", t("emitter", 1, Signal.HIGH))
    const withEvents = step(components, wires, session, registryOf(delayLine()))
    expect([...withEvents.entries()]).toEqual([...runSimulation(components, wires).entries()])
    expect(session.digitalEventStates.get("a")).toEqual({ received: 1 })
  })
})

describe("A12-PREQ-EC — gardes d'architecture", () => {
  const integration = readSourceWithoutComments("simulationRuntimeIntegration.js")
  const composition = computeDigitalEventContributions.toString()

  it("EC-21 — aucune horloge système dans l'orchestration événementielle ni dans l'intégration", () => {
    for (const pattern of [/Date\.now\s*\(/, /performance\.now\s*\(/, /\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(/]) {
      expect(integration).not.toMatch(pattern)
    }
  })

  it("EC-23 — aucune branche par type dans la composition événementielle", () => {
    expect(composition).not.toMatch(/\.type\s*===|\.type\s*!==|["'][A-Z][A-Z0-9_]{2,}["']/)
  })

  it("EC-25 — ONE RESOLUTION : un seul appel resolveSignals() dans l'intégration, aucun dans la composition", () => {
    expect(integration.match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
    expect(composition).not.toMatch(/resolveSignals|resolveSourceDrivenPinSignals|prepareCircuit|advance\s*\(/)
  })

  it("EC-26 — un seul store de transitions : la composition n'en crée aucun et passe par les primitives", () => {
    expect(composition).not.toMatch(/createDigitalTransitionStore|new Map\(\)\s*[,)]/)
    expect(composition).toMatch(/recordDigitalTransitions/)
    expect(readSourceWithoutComments("digitalEventContributionRegistry.js")).not.toMatch(/pending|lastTimeMs|digitalTransitions/)
  })

  it("SIMULATION_STEP_MS toujours déclaré à 16 dans l'intégration", () => {
    expect(integration).toMatch(/export const SIMULATION_STEP_MS = 16\b/)
  })
})
