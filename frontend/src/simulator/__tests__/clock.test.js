import { describe, it, expect } from "vitest"
import { SimulatedClock, createSimulatedClock } from "../clock.js"
import { InvalidTimeDeltaError } from "../errors/index.js"

/**
 * MB-SIM-009 v1 — Tests unitaires de SimulatedClock (Ticket §15 "Clock").
 */

describe("SimulatedClock — état initial", () => {
  it("initialise à 0 ms (INV-SIM009-002, AC-001)", () => {
    const clock = new SimulatedClock()
    expect(clock.getCurrentTime()).toBe(0)
  })

  it("createSimulatedClock() produit une Clock indépendante, initialisée à 0 ms", () => {
    const clock = createSimulatedClock()
    expect(clock.getCurrentTime()).toBe(0)
    expect(clock).toBeInstanceOf(SimulatedClock)
  })
})

describe("SimulatedClock — advance(dt)", () => {
  it("avance le temps de dt ms et retourne le nouveau temps (INV-SIM009-004)", () => {
    const clock = new SimulatedClock()
    expect(clock.advance(10)).toBe(10)
    expect(clock.getCurrentTime()).toBe(10)
  })

  it("plusieurs advance() successifs s'accumulent : 0 -> 10 -> 35 -> 135 (AC-002)", () => {
    const clock = new SimulatedClock()
    expect(clock.advance(10)).toBe(10)
    expect(clock.advance(25)).toBe(35)
    expect(clock.advance(100)).toBe(135)
    expect(clock.getCurrentTime()).toBe(135)
  })

  it("advance(0) est valide et laisse le temps inchangé", () => {
    const clock = new SimulatedClock()
    clock.advance(10)
    expect(clock.advance(0)).toBe(10)
    expect(clock.getCurrentTime()).toBe(10)
  })
})

describe("SimulatedClock — reset()", () => {
  it("ramène le temps à 0 ms depuis un temps non nul (AC-005)", () => {
    const clock = new SimulatedClock()
    clock.advance(50)
    expect(clock.reset()).toBe(0)
    expect(clock.getCurrentTime()).toBe(0)
  })

  it("reset() est idempotent sur une Clock déjà à 0 ms", () => {
    const clock = new SimulatedClock()
    expect(clock.reset()).toBe(0)
  })

  it("permet de reprendre l'avancement après reset()", () => {
    const clock = new SimulatedClock()
    clock.advance(999)
    clock.reset()
    clock.advance(7)
    expect(clock.getCurrentTime()).toBe(7)
  })
})

describe("SimulatedClock — validation des deltas invalides (INV-SIM009-005, AC-004)", () => {
  const invalidValues = [
    ["négatif", -1],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["chaîne numérique", "10"],
    ["null", null],
    ["undefined", undefined],
    ["objet", {}],
    ["tableau", [10]],
    ["booléen", true],
  ]

  for (const [label, value] of invalidValues) {
    it(`rejette un delta ${label} via InvalidTimeDeltaError, sans corrompre l'état`, () => {
      const clock = new SimulatedClock()
      clock.advance(10)
      expect(() => clock.advance(value)).toThrow(InvalidTimeDeltaError)
      expect(clock.getCurrentTime()).toBe(10)
    })
  }

  it("une InvalidTimeDeltaError conserve la valeur rejetée pour diagnostic", () => {
    const clock = new SimulatedClock()
    try {
      clock.advance(NaN)
      throw new Error("advance(NaN) aurait dû lever une InvalidTimeDeltaError")
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTimeDeltaError)
      expect(Number.isNaN(error.value)).toBe(true)
    }
  })

  it("un advance() invalide suivi d'un advance() valide reste cohérent", () => {
    const clock = new SimulatedClock()
    clock.advance(10)
    expect(() => clock.advance(-5)).toThrow(InvalidTimeDeltaError)
    clock.advance(5)
    expect(clock.getCurrentTime()).toBe(15)
  })
})

describe("SimulatedClock — monotonie (INV-SIM009-006, AC-003)", () => {
  it("le temps ne recule jamais sur une séquence d'avancements valides", () => {
    const clock = new SimulatedClock()
    let previous = clock.getCurrentTime()
    for (const dt of [5, 0, 12, 3, 40, 0, 1]) {
      const next = clock.advance(dt)
      expect(next).toBeGreaterThanOrEqual(previous)
      previous = next
    }
  })
})

describe("SimulatedClock — déterminisme (INV-SIM009-007, AC-006)", () => {
  it("deux instances indépendantes recevant la même séquence produisent le même temps final", () => {
    const sequence = [10, 25, 100, 1, 0, 999, 3]
    const clockA = new SimulatedClock()
    const clockB = new SimulatedClock()
    for (const dt of sequence) clockA.advance(dt)
    for (const dt of sequence) clockB.advance(dt)
    expect(clockA.getCurrentTime()).toBe(clockB.getCurrentTime())
    expect(clockA.getCurrentTime()).toBe(sequence.reduce((a, b) => a + b, 0))
  })

  it("deux instances distinctes n'interfèrent pas entre elles", () => {
    const clockA = new SimulatedClock()
    const clockB = new SimulatedClock()
    clockA.advance(100)
    expect(clockA.getCurrentTime()).toBe(100)
    expect(clockB.getCurrentTime()).toBe(0)
  })
})
