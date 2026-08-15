import { describe, it, expect } from "vitest"
import { Scheduler, createScheduler } from "../scheduler.js"
import { SimulatedClock, createSimulatedClock } from "../clock.js"
import { InvalidTimeDeltaError } from "../errors/index.js"

/**
 * MB-SIM-009 v1 — Tests unitaires de Scheduler (Ticket §15 "Scheduler").
 */

describe("Scheduler — état initial déterministe", () => {
  it("un Scheduler nouvellement créé démarre à 0 ms, sans Clock fournie", () => {
    const scheduler = new Scheduler()
    expect(scheduler.getCurrentTime()).toBe(0)
  })

  it("createScheduler() produit un Scheduler initialisé à 0 ms", () => {
    const scheduler = createScheduler()
    expect(scheduler.getCurrentTime()).toBe(0)
    expect(scheduler).toBeInstanceOf(Scheduler)
  })

  it("accepte une Clock injectée explicitement, dont il reflète l'état courant", () => {
    const clock = new SimulatedClock()
    clock.advance(42)
    const scheduler = new Scheduler({ clock })
    expect(scheduler.getCurrentTime()).toBe(42)
  })
})

describe("Scheduler — progression temporelle", () => {
  it("advance(dt) fait progresser l'état observable : 0 -> 10 -> 35 -> 135 (AC-002)", () => {
    const scheduler = new Scheduler()
    expect(scheduler.advance(10)).toBe(10)
    expect(scheduler.advance(25)).toBe(35)
    expect(scheduler.advance(100)).toBe(135)
    expect(scheduler.getCurrentTime()).toBe(135)
  })

  it("reset() ramène l'état temporel à 0 ms", () => {
    const scheduler = new Scheduler()
    scheduler.advance(50)
    expect(scheduler.reset()).toBe(0)
    expect(scheduler.getCurrentTime()).toBe(0)
  })

  it("rejette un delta invalide en le déléguant à la Clock sous-jacente, état inchangé", () => {
    const scheduler = new Scheduler()
    scheduler.advance(10)
    expect(() => scheduler.advance(-1)).toThrow(InvalidTimeDeltaError)
    expect(() => scheduler.advance(NaN)).toThrow(InvalidTimeDeltaError)
    expect(scheduler.getCurrentTime()).toBe(10)
  })
})

describe("Scheduler — déterminisme (AC-006)", () => {
  it("deux Scheduler indépendants, même séquence advance() => même résultat final", () => {
    const sequence = [1, 2, 3, 4, 5, 0, 17]
    const schedulerA = new Scheduler()
    const schedulerB = new Scheduler()
    for (const dt of sequence) schedulerA.advance(dt)
    for (const dt of sequence) schedulerB.advance(dt)
    expect(schedulerA.getCurrentTime()).toBe(schedulerB.getCurrentTime())
  })
})

describe("Scheduler — séparation Clock/Scheduler (INV-SIM009-008, INV-SIM009-N03)", () => {
  it("deux Scheduler avec des Clock injectées séparées n'interfèrent pas entre eux", () => {
    const schedulerA = new Scheduler({ clock: createSimulatedClock() })
    const schedulerB = new Scheduler({ clock: createSimulatedClock() })
    schedulerA.advance(100)
    expect(schedulerA.getCurrentTime()).toBe(100)
    expect(schedulerB.getCurrentTime()).toBe(0)
  })

  it("faire avancer directement la Clock injectée se reflète dans le Scheduler qui la consomme (Scheduler lit l'état, ne le duplique pas)", () => {
    const clock = new SimulatedClock()
    const scheduler = new Scheduler({ clock })
    clock.advance(30)
    expect(scheduler.getCurrentTime()).toBe(30)
  })

  it("le Scheduler ne fournit aucune méthode de résolution de circuit ou de composant", () => {
    const scheduler = new Scheduler()
    expect(scheduler.resolveSignals).toBeUndefined()
    expect(scheduler.runSimulation).toBeUndefined()
    expect(scheduler.getDcContribution).toBeUndefined()
  })
})
