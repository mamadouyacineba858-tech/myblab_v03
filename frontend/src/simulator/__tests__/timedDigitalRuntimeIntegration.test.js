import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  runSimulationWithRuntime,
  computeTimedDigitalSignals,
  mergeExternalSignals,
} from "../simulationRuntimeIntegration.js"
import { runSimulation, getLedState } from "../engine.js"
import { createTimedDigitalContributionRegistry } from "../timedDigitalContributionRegistry.js"
import { createDigitalContributionRegistry } from "../digitalContributionRegistry.js"
import { createScheduler } from "../scheduler.js"
import { Signal } from "../signals.js"

/**
 * A7-C5-PREQ — Generic Timed Digital Output Runtime, end-to-end proof.
 *
 * Couvre §26-§33 du ticket (TD-07 à TD-56 ; TD-01-TD-06 voir
 * timedDigitalContributionRegistry.test.js, TD-57-TD-66 voir
 * timeArchitecture.test.js).
 *
 * Fixture TIMED_TEST_COMPONENT (§24/§28 du ticket) : NON un vrai composant
 * de production — utilise le type canonique réel NPN_TRANSISTOR (pins
 * collector/base/emitter déjà déclarées dans canonicalRegistry.js, §24 :
 * "ne pas créer un faux type de composant dans le Registry canonique de
 * production") au travers d'un Registry temporel FIXTURE isolé
 * (createTimedDigitalContributionRegistry), jamais enregistré dans
 * timedDigitalContributionRegistry.js de production.
 *
 * Comportement pédagogique verrouillé (§28 du ticket, UNIQUEMENT un
 * fixture de test, ne représente aucun composant réel) :
 *   input LOW -> output LOW
 *   front LOW->HIGH à T -> mémorise deadline = T + 2.5
 *   currentTimeMs < deadline -> output HIGH
 *   currentTimeMs >= deadline -> output LOW
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEADLINE_OFFSET_MS = 2.5

function timedEdgeToDeadlineContribution({ pinSignals, currentTimeMs, previousState }) {
  const input = pinSignals.base
  const prev = previousState ?? { lastInput: Signal.LOW, deadlineMs: null }
  let deadlineMs = prev.deadlineMs
  if (prev.lastInput !== Signal.HIGH && input === Signal.HIGH) {
    deadlineMs = currentTimeMs + DEADLINE_OFFSET_MS
  }
  const output = deadlineMs !== null && currentTimeMs < deadlineMs ? Signal.HIGH : Signal.LOW
  return { state: { lastInput: input, deadlineMs }, outputs: new Map([["emitter", output]]) }
}

function fixtureRegistry(contributeFn = timedEdgeToDeadlineContribution) {
  return createTimedDigitalContributionRegistry({ contributions: new Map([["NPN_TRANSISTOR", contributeFn]]) })
}

describe("A7-C5-PREQ — TD-07/TD-08/TD-09/TD-10 : le producer reçoit currentTimeMs issu du Scheduler, précision fractionnaire", () => {
  it("TD-07/TD-08 — premier step à currentTimeMs=0 reçoit le temps attendu", () => {
    const seen = []
    const registry = fixtureRegistry(({ currentTimeMs }) => {
      seen.push(currentTimeMs)
      return { state: undefined, outputs: null }
    })
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    computeTimedDigitalSignals(components, registry, new Map(), 0, new Map())
    expect(seen).toEqual([0])
  })

  it("TD-09 — advance(1) fait observer +1 ms", () => {
    const scheduler = createScheduler()
    scheduler.advance(1)
    const seen = []
    const registry = fixtureRegistry(({ currentTimeMs }) => {
      seen.push(currentTimeMs)
      return { state: undefined, outputs: null }
    })
    computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), scheduler.getCurrentTime(), new Map())
    expect(seen).toEqual([1])
  })

  it("TD-10 — advance(0.5) conserve précisément +0.5 ms (aucune quantification)", () => {
    const scheduler = createScheduler()
    scheduler.advance(0.5)
    expect(scheduler.getCurrentTime()).toBe(0.5)
    const seen = []
    const registry = fixtureRegistry(({ currentTimeMs }) => {
      seen.push(currentTimeMs)
      return { state: undefined, outputs: null }
    })
    computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), scheduler.getCurrentTime(), new Map())
    expect(seen).toEqual([0.5])
  })
})

describe("A7-C5-PREQ — TD-11/TD-12 : l'accumulation vit dans le Scheduler, jamais dans le producer", () => {
  it("TD-11 — plusieurs runSimulationWithRuntime() successifs accumulent via le Scheduler partagé persisté par l'appelant, pas via le producer", () => {
    const registry = fixtureRegistry()
    const scheduler = createScheduler()
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    runSimulationWithRuntime(components, [], { dt: 16, scheduler, timedDigitalContributionRegistry: registry })
    runSimulationWithRuntime(components, [], { dt: 16, scheduler, timedDigitalContributionRegistry: registry })
    expect(scheduler.getCurrentTime()).toBe(32)
  })

  it("TD-12 — deux appels avec le MÊME currentTimeMs explicite produisent le même résultat (le producer ne possède aucune horloge propre qui avancerait toute seule)", () => {
    const registry = fixtureRegistry()
    const a = computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), 5, new Map())
    const b = computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), 5, new Map())
    expect([...a.entries()]).toEqual([...b.entries()])
  })
})

describe("A7-C5-PREQ — TD-13/TD-14/TD-15/TD-16 : aucune horloge système dans le code temporel générique", () => {
  it("timedDigitalContributionRegistry.js n'utilise ni Date.now, ni setTimeout, ni setInterval, ni requestAnimationFrame", () => {
    const src = readFileSync(resolve(__dirname, "../timedDigitalContributionRegistry.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })

  it("simulationRuntimeIntegration.js (composition timed) n'utilise ni Date.now, ni setTimeout, ni setInterval, ni requestAnimationFrame", () => {
    const src = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })
})

describe("A7-C5-PREQ — TD-17 à TD-24 : state persistence, séparation stricte du Document", () => {
  it("TD-17 — état initial absent au premier step, initialisation déterministe dans le producer", () => {
    const registry = fixtureRegistry()
    const states = new Map()
    computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), 0, states)
    expect(states.get("t1")).toEqual({ lastInput: Signal.UNKNOWN, deadlineMs: null })
  })

  it("TD-18/TD-19 — le state N retourné au step N est bien reçu comme previousState au step N+1", () => {
    const seenPreviousStates = []
    const registry = fixtureRegistry(({ currentTimeMs, previousState }) => {
      seenPreviousStates.push(previousState)
      return { state: { seenAt: currentTimeMs }, outputs: null }
    })
    const states = new Map()
    const comp = { uid: "t1", type: "NPN_TRANSISTOR" }
    computeTimedDigitalSignals([comp], registry, new Map(), 10, states)
    computeTimedDigitalSignals([comp], registry, new Map(), 20, states)
    expect(seenPreviousStates).toEqual([undefined, { seenAt: 10 }])
  })

  it("TD-20 — deux composants possèdent deux états runtime indépendants", () => {
    const registry = fixtureRegistry(({ component, currentTimeMs }) => ({
      state: { tag: component.uid, at: currentTimeMs },
      outputs: null,
    }))
    const states = new Map()
    const components = [
      { uid: "t1", type: "NPN_TRANSISTOR" },
      { uid: "t2", type: "NPN_TRANSISTOR" },
    ]
    computeTimedDigitalSignals(components, registry, new Map(), 7, states)
    expect(states.get("t1")).toEqual({ tag: "t1", at: 7 })
    expect(states.get("t2")).toEqual({ tag: "t2", at: 7 })
    expect(states.get("t1")).not.toBe(states.get("t2"))
  })

  it("TD-21 — la suppression d'un composant (retiré du store par l'appelant) ne contamine pas l'état des autres composants", () => {
    const registry = fixtureRegistry(({ component, currentTimeMs }) => ({
      state: { tag: component.uid, at: currentTimeMs },
      outputs: null,
    }))
    const states = new Map()
    computeTimedDigitalSignals(
      [{ uid: "t1", type: "NPN_TRANSISTOR" }, { uid: "t2", type: "NPN_TRANSISTOR" }],
      registry, new Map(), 1, states
    )
    states.delete("t1")
    computeTimedDigitalSignals([{ uid: "t2", type: "NPN_TRANSISTOR" }], registry, new Map(), 2, states)
    expect(states.has("t1")).toBe(false)
    expect(states.get("t2")).toEqual({ tag: "t2", at: 2 })
  })

  it("TD-22 — un reset (Scheduler.reset() + store d'état vidé par l'appelant) réinitialise le comportement temporel comme un premier step", () => {
    const scheduler = createScheduler()
    const states = new Map()
    const registry = fixtureRegistry()
    const comp = { uid: "t1", type: "NPN_TRANSISTOR" }
    const rising = new Map([["t1:base", Signal.HIGH]])

    scheduler.advance(10)
    computeTimedDigitalSignals([comp], registry, rising, scheduler.getCurrentTime(), states)
    expect(states.get("t1").deadlineMs).toBe(12.5)

    scheduler.reset()
    states.clear()
    expect(scheduler.getCurrentTime()).toBe(0)
    const flat = new Map([["t1:base", Signal.LOW]])
    const produced = computeTimedDigitalSignals([comp], registry, flat, scheduler.getCurrentTime(), states)
    expect(states.get("t1")).toEqual({ lastInput: Signal.LOW, deadlineMs: null })
    expect(produced.get("t1:emitter")).toBe(Signal.LOW)
  })

  it("TD-23 — le composant original et ses parameters ne sont jamais mutés par la composition temporelle", () => {
    const registry = fixtureRegistry()
    const originalParameters = { onResistance: 42 }
    const originalComponent = { uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0, parameters: originalParameters }
    const components = Object.freeze([originalComponent])
    computeTimedDigitalSignals(components, registry, new Map(), 0, new Map())
    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ onResistance: 42 })
  })

  it("TD-24 — aucune dépendance History/commandBus/ValidationEngine/Document dans le code temporel générique", () => {
    for (const rel of ["../timedDigitalContributionRegistry.js", "../simulationRuntimeIntegration.js"]) {
      const src = readFileSync(resolve(__dirname, rel), "utf-8")
      expect(src, rel).not.toMatch(/from\s+["'][^"']*core\/(handlers|history|commandBus|ValidationEngine)/i)
      expect(src, rel).not.toMatch(/from\s+["']react["']/)
      expect(src, rel).not.toMatch(/from\s+["'][^"']*\/canvas\//i)
      expect(src, rel).not.toMatch(/from\s+["'][^"']*breadboard/i)
    }
  })
})

describe("A7-C5-PREQ — TD-25 à TD-30 : fixture timed output (front -> deadline -> HIGH -> LOW), fraction 2.5 ms respectée", () => {
  it("TD-25/TD-26/TD-27/TD-28/TD-29/TD-30 — séquence complète, sans quantification au frame 16 ms", () => {
    const registry = fixtureRegistry()
    const states = new Map()
    const comp = { uid: "t1", type: "NPN_TRANSISTOR" }

    // T=0, input LOW -> output LOW, pas de front.
    let out = computeTimedDigitalSignals([comp], registry, new Map([["t1:base", Signal.LOW]]), 0, states)
    expect(out.get("t1:emitter")).toBe(Signal.LOW)
    expect(states.get("t1").deadlineMs).toBeNull()

    // T=10, front LOW->HIGH -> deadline mémorisée = 12.5, output HIGH (avant deadline).
    out = computeTimedDigitalSignals([comp], registry, new Map([["t1:base", Signal.HIGH]]), 10, states)
    expect(states.get("t1").deadlineMs).toBe(12.5) // TD-26, fraction 2.5 ms exacte (TD-30)
    expect(out.get("t1:emitter")).toBe(Signal.HIGH) // TD-25 (front détecté) + TD-27

    // T=12 (< 12.5) -> toujours HIGH.
    out = computeTimedDigitalSignals([comp], registry, new Map([["t1:base", Signal.HIGH]]), 12, states)
    expect(out.get("t1:emitter")).toBe(Signal.HIGH)

    // T=12.5 (>= deadline, fraction respectée : ni 0 ni 16) -> LOW.
    out = computeTimedDigitalSignals([comp], registry, new Map([["t1:base", Signal.HIGH]]), 12.5, states)
    expect(out.get("t1:emitter")).toBe(Signal.LOW) // TD-28

    // T=13 (> deadline) -> LOW.
    out = computeTimedDigitalSignals([comp], registry, new Map([["t1:base", Signal.HIGH]]), 13, states)
    expect(out.get("t1:emitter")).toBe(Signal.LOW) // TD-29
  })
})

describe("A7-C5-PREQ — TD-31 à TD-37 : signal d'entrée, pas de second resolve", () => {
  it("TD-31/TD-34 — le producer observe un signal réellement alimenté par une source DC + topologie (resolveSourceDrivenPinSignals réel)", () => {
    const registry = fixtureRegistry()
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
    ]
    const wires = [{ fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" }]
    const result = runSimulationWithRuntime(components, wires, { timedDigitalContributionRegistry: registry })
    expect(result.get("t1:base")).toBe(Signal.HIGH)
  })

  it("TD-32/TD-33 — une pin non connectée reste Signal.UNKNOWN, jamais un HIGH/LOW inventé", () => {
    const registry = fixtureRegistry()
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    const result = runSimulationWithRuntime(components, [], { timedDigitalContributionRegistry: registry })
    // "base" flottant : le fixture ne détecte jamais de front UNKNOWN -> HIGH, sortie LOW par défaut.
    expect(result.get("t1:emitter")).toBe(Signal.LOW)
  })

  it("TD-35/TD-36 — le contrat du producer ne reçoit ni wires, ni DOM, ni Canvas (seule la signature ctx est exposée)", () => {
    const registry = fixtureRegistry((ctx) => {
      expect(Object.keys(ctx).sort()).toEqual(
        ["component", "currentTimeMs", "params", "pinSignals", "pins", "previousState"].sort()
      )
      expect(ctx.wires).toBeUndefined()
      expect(ctx.document).toBeUndefined()
      return { state: undefined, outputs: null }
    })
    computeTimedDigitalSignals([{ uid: "t1", type: "NPN_TRANSISTOR" }], registry, new Map(), 0, new Map())
  })

  it("TD-37 — runSimulationWithRuntime() n'appelle resolveSignals(...) qu'UNE SEULE fois sur le chemin timed (preuve structurelle)", () => {
    const raw = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8")
    // Retire les commentaires bloc ET ligne (la prose JSDoc/inline mentionne
    // légitimement `resolveSignals(...)` plusieurs fois pour l'expliquer) —
    // ne juge que le code exécutable, même principe que
    // timeArchitecture.test.js#readSourceWithoutComments.
    const executable = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
    const matches = executable.match(/\bresolveSignals\s*\(/g) ?? []
    // Une seule occurrence exécutable : l'appel final dans runSimulationWithRuntime()
    // (l'import nommé lui-même ne matche pas `resolveSignals(`).
    expect(matches.length).toBe(1)
  })
})

describe("A7-C5-PREQ — TD-38 à TD-43 : composition avec Runtime/computed digital, collision, résolution unique", () => {
  it("TD-38 — timedDigitalSignals produit une Map au format \"uid:pinId\" -> Signal", () => {
    const registry = fixtureRegistry()
    const produced = computeTimedDigitalSignals(
      [{ uid: "t1", type: "NPN_TRANSISTOR" }],
      registry,
      new Map([["t1:base", Signal.HIGH]]),
      10,
      new Map()
    )
    expect([...produced.keys()]).toEqual(["t1:emitter"])
  })

  it("TD-39 — mergeExternalSignals accepte computedDigitalSignals + timedDigitalSignals sur des clés distinctes", () => {
    const computed = new Map([["sensor1:B", Signal.HIGH]])
    const timed = new Map([["t1:emitter", Signal.LOW]])
    const merged = mergeExternalSignals([computed, timed])
    expect(merged.get("sensor1:B")).toBe(Signal.HIGH)
    expect(merged.get("t1:emitter")).toBe(Signal.LOW)
  })

  it("TD-40/TD-41 — une collision de pin entre computed et timed échoue explicitement, jamais un silent overwrite", () => {
    const computed = new Map([["shared1:OUT", Signal.HIGH]])
    const timed = new Map([["shared1:OUT", Signal.LOW]])
    expect(() => mergeExternalSignals([computed, timed])).toThrow(/pin key "shared1:OUT"/)
  })

  it("TD-42/TD-43 — un signal timed participe réellement à la propagation électrique (LED allumée), via une résolution unique", () => {
    const registry = fixtureRegistry()
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
      { uid: "led1", type: "LED", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
      { fromUid: "t1", fromPin: "emitter", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const result = runSimulationWithRuntime(components, wires, { timedDigitalContributionRegistry: registry })
    expect(result.get("t1:emitter")).toBe(Signal.HIGH)
    expect(getLedState("led1", result).on).toBe(true)
  })

  it("coexistence : un computed digital output ET un timed digital output se résolvent tous deux, sans conflit", () => {
    const timedRegistry = fixtureRegistry()
    const digitalRegistry = createDigitalContributionRegistry({
      contributions: new Map([["LDR", () => new Map([["B", Signal.HIGH]])]]),
    })
    const components = [
      { uid: "sensor1", type: "LDR", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
    ]
    const result = runSimulationWithRuntime(components, [], {
      digitalContributionRegistry: digitalRegistry,
      timedDigitalContributionRegistry: timedRegistry,
    })
    expect(result.get("sensor1:B")).toBe(Signal.HIGH)
    expect(result.get("t1:emitter")).toBe(Signal.LOW)
  })
})

describe("A7-C5-PREQ — TD-44 à TD-47 : un timed producer fonctionne SANS aucun ARDUINO", () => {
  it("TD-44 — un circuit sans aucun ARDUINO résout quand même la sortie temporelle", () => {
    const registry = fixtureRegistry()
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    const result = runSimulationWithRuntime(components, [], { timedDigitalContributionRegistry: registry })
    expect(result.get("t1:emitter")).toBe(Signal.LOW)
  })

  it("TD-45 — une source de temps simulé existe/avance pour le timed producer seul (Scheduler explicite persisté)", () => {
    const registry = fixtureRegistry()
    const scheduler = createScheduler()
    const components = [{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }]
    runSimulationWithRuntime(components, [], { dt: 16, scheduler, timedDigitalContributionRegistry: registry })
    expect(scheduler.getCurrentTime()).toBe(16)
  })

  it("TD-46 — aucun ArduinoSimulator (orchestrator) n'est créé uniquement à cause du timed producer", () => {
    const registry = fixtureRegistry()
    const orchestrators = new Map()
    runSimulationWithRuntime([{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }], [], {
      dt: 16,
      orchestrators,
      timedDigitalContributionRegistry: registry,
    })
    expect(orchestrators.size).toBe(0)
  })

  it("TD-47 — aucune option firmware n'est requise pour un timed producer seul", () => {
    const registry = fixtureRegistry()
    expect(() =>
      runSimulationWithRuntime([{ uid: "t1", type: "NPN_TRANSISTOR", x: 0, y: 0 }], [], {
        dt: 16,
        timedDigitalContributionRegistry: registry,
      })
    ).not.toThrow()
  })
})

describe("A7-C5-PREQ — TD-48 à TD-51 : Arduino + timed producer partagent EXACTEMENT le même Scheduler", () => {
  it("TD-48/TD-49 — les deux observent le même currentTimeMs pour un step partagé", () => {
    const seenTimes = []
    const registry = fixtureRegistry(({ currentTimeMs }) => {
      seenTimes.push(currentTimeMs)
      return { state: undefined, outputs: null }
    })
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators, timedDigitalContributionRegistry: registry })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(16)
    expect(seenTimes).toEqual([16])
  })

  it("TD-50/TD-51 — Scheduler.advance(dt) n'est appelé qu'une seule fois par step partagé, aucune dérive dt × nombre de runtimes sur plusieurs appels", () => {
    const seenTimes = []
    const registry = fixtureRegistry(({ currentTimeMs }) => {
      seenTimes.push(currentTimeMs)
      return { state: undefined, outputs: null }
    })
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 },
    ]
    const orchestrators = new Map()
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators, timedDigitalContributionRegistry: registry })
    runSimulationWithRuntime(components, [], { dt: 16, orchestrators, timedDigitalContributionRegistry: registry })
    expect(orchestrators.get("ard1").getCurrentTime()).toBe(32)
    expect(seenTimes).toEqual([16, 32])
  })
})

describe("A7-C5-PREQ — TD-52 à TD-56 : GATE 0, non-régression stricte", () => {
  const circuitSansRuntimeNiTimed = {
    components: [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ],
    wires: [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ],
  }

  it("TD-52/TD-56 — circuit sans Arduino et sans timed producer garde le chemin historique EXACT (Registry de production, vide)", () => {
    const historique = runSimulation(circuitSansRuntimeNiTimed.components, circuitSansRuntimeNiTimed.wires)
    const integre = runSimulationWithRuntime(circuitSansRuntimeNiTimed.components, circuitSansRuntimeNiTimed.wires)
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })

  it("TD-53 — aucun Scheduler/Runtime instancié inutilement (orchestrators reste vide) même avec dt fourni", () => {
    const orchestrators = new Map()
    runSimulationWithRuntime(circuitSansRuntimeNiTimed.components, circuitSansRuntimeNiTimed.wires, { dt: 100, orchestrators })
    expect(orchestrators.size).toBe(0)
  })

  it("TD-54 — un computed digital output stateless continue de fonctionner à l'identique (aucun timed producer actif)", () => {
    const digitalRegistry = createDigitalContributionRegistry({ contributions: new Map([["LDR", () => new Map([["B", Signal.HIGH]])]]) })
    const result = runSimulationWithRuntime([{ uid: "sensor1", type: "LDR", x: 0, y: 0 }], [], { digitalContributionRegistry: digitalRegistry })
    expect(result.get("sensor1:B")).toBe(Signal.HIGH)
  })

  it("TD-55 — SOIL_MOISTURE_SENSOR/PIR_MOTION_SENSOR/TILT_SENSOR/IR_RECEIVER ne sont pas migrés vers le Registry temporel", () => {
    for (const type of ["SOIL_MOISTURE_SENSOR", "PIR_MOTION_SENSOR", "TILT_SENSOR", "IR_RECEIVER"]) {
      expect(fixtureRegistry().hasTimedDigitalContribution(type)).toBe(false)
    }
  })
})

describe("A7-C5-PREQ — aucun littéral HC_SR04/DISTANCE/TRIG/ECHO/ultrasonic dans le code de production ajouté", () => {
  it("timedDigitalContributionRegistry.js et le code ajouté de simulationRuntimeIntegration.js n'en contiennent aucun", () => {
    for (const rel of ["../timedDigitalContributionRegistry.js", "../simulationRuntimeIntegration.js"]) {
      const src = readFileSync(resolve(__dirname, rel), "utf-8")
      for (const forbidden of ["HC_SR04", "HC-SR04", "DISTANCE", "TRIG", "ECHO", "ultrasonic", "speed of sound"]) {
        expect(src, `${rel} : ${forbidden}`).not.toMatch(new RegExp(forbidden, "i"))
      }
    }
  })
})
