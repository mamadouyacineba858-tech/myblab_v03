import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  createTransientContributionRegistry,
  getTransientContribution,
  hasTransientContribution,
  getAllTransientContributionTypes,
} from "../transientContributionRegistry.js"
import { Signal } from "../signals.js"

/**
 * A4-D-PREQ1 — transientContributionRegistry.js (T1 à T8, T13, T15).
 *
 * Registre déclaratif générique, même patron Open/Closed que
 * `dcContributionRegistry.js`/`timedDigitalContributionRegistry.js`, pour
 * des contributeurs ÉLECTRIQUES dépendants du temps simulé et de leur propre
 * état précédent. Qualifié avec CAPACITOR/POLARIZED_CAPACITOR (A4-D-PREQ1,
 * §5 du ticket), puis INDUCTOR (A4-INDUCTOR, §2 du ticket) : aucun autre
 * type de production (aucun ZENER).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

describe("T1 — Registry transitoire Open/Closed", () => {
  it("expose getTransientContribution/hasTransientContribution/getAllTransientContributionTypes, table de production non vide", () => {
    expect(getAllTransientContributionTypes()).toEqual(["CAPACITOR", "POLARIZED_CAPACITOR", "INDUCTOR"])
  })

  it("createTransientContributionRegistry produit un Registry isolé injectable pour test, sans muter la production", () => {
    const contributeFn = () => ({ state: undefined, contribution: null })
    const fixture = createTransientContributionRegistry({ contributions: new Map([["TRANSIENT_TEST_COMPONENT", contributeFn]]) })
    expect(fixture.hasTransientContribution("TRANSIENT_TEST_COMPONENT")).toBe(true)
    expect(fixture.getTransientContribution("TRANSIENT_TEST_COMPONENT")).toBe(contributeFn)
    expect(hasTransientContribution("TRANSIENT_TEST_COMPONENT")).toBe(false)
    expect(getAllTransientContributionTypes()).toEqual(["CAPACITOR", "POLARIZED_CAPACITOR", "INDUCTOR"])
  })
})

describe("T2 — type inconnu => aucune contribution transitoire", () => {
  it("hasTransientContribution(type inconnu) retourne false", () => {
    expect(hasTransientContribution("UNKNOWN_TYPE")).toBe(false)
  })
  it("getTransientContribution(type inconnu) retourne null", () => {
    expect(getTransientContribution("UNKNOWN_TYPE")).toBeNull()
  })
})

describe("T3 — CAPACITOR est enregistré sans branche type-specific dans le moteur générique", () => {
  it("transientContributionRegistry.js est le SEUL endroit qui connaît CAPACITOR/POLARIZED_CAPACITOR pour ce contrat", () => {
    expect(hasTransientContribution("CAPACITOR")).toBe(true)
    expect(hasTransientContribution("POLARIZED_CAPACITOR")).toBe(true)
  })

  it("simulationRuntimeIntegration.js (compositeur générique) ne contient aucun littéral CAPACITOR/POLARIZED_CAPACITOR", () => {
    const src = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8")
    expect(src).not.toMatch(/["']CAPACITOR["']/)
    expect(src).not.toMatch(/["']POLARIZED_CAPACITOR["']/)
  })
})

function powered(voltage = 5) {
  return { pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, supplyVoltage: voltage }
}

describe("T4 — état initial déterministe", () => {
  it("premier step (previousState undefined) démarre à 0V, quelle que soit la tension appliquée", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const { contribution } = contribute({ ...powered(), params: { capacitance: 1e-4 }, dt: 0, currentTimeMs: 0, previousState: undefined })
    expect(contribution.voltage).toBe(0)
  })
})

describe("T5 — deux steps avec le même store conservent l'état", () => {
  it("le state retourné au step N est bien reçu comme previousState au step N+1, la tension progresse", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const ctx = { ...powered(), params: { capacitance: 1e-3 }, dt: 1, currentTimeMs: 1 }
    const step1 = contribute({ ...ctx, previousState: undefined })
    expect(step1.state.voltage).toBeGreaterThan(0)
    expect(step1.state.voltage).toBeLessThan(5)
    const step2 = contribute({ ...ctx, previousState: step1.state, currentTimeMs: 2 })
    expect(step2.state.voltage).toBeGreaterThan(step1.state.voltage)
    expect(step2.state.voltage).toBeLessThan(5)
  })
})

describe("T6 — nouveau store => reset déterministe", () => {
  it("un previousState undefined (nouveau store) redémarre exactement comme au premier step", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const ctx = { ...powered(), params: { capacitance: 1e-4 }, dt: 10, currentTimeMs: 10 }
    const first = contribute({ ...ctx, previousState: undefined })
    const afterReset = contribute({ ...ctx, previousState: undefined })
    expect(afterReset.state).toEqual(first.state)
    expect(afterReset.contribution).toEqual(first.contribution)
  })
})

describe("T7 — capacitance différente => réponse dynamique différente", () => {
  it("une capacitance plus grande charge plus lentement (tension atteinte plus faible pour le même dt)", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const small = contribute({ ...powered(), params: { capacitance: 1e-6 }, dt: 5, currentTimeMs: 5, previousState: undefined })
    const large = contribute({ ...powered(), params: { capacitance: 1e-2 }, dt: 5, currentTimeMs: 5, previousState: undefined })
    expect(small.contribution.voltage).toBeGreaterThan(large.contribution.voltage)
  })
})

describe("T8 — dt différent => évolution différente", () => {
  it("un dt plus grand rapproche davantage la tension de la cible, pour la même capacitance", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const shortDt = contribute({ ...powered(), params: { capacitance: 1e-4 }, dt: 1, currentTimeMs: 1, previousState: undefined })
    const longDt = contribute({ ...powered(), params: { capacitance: 1e-4 }, dt: 50, currentTimeMs: 50, previousState: undefined })
    expect(longDt.contribution.voltage).toBeGreaterThan(shortDt.contribution.voltage)
  })
})

describe("T13 — absence de wall-clock APIs dans le nouveau chemin", () => {
  it("transientContributionRegistry.js n'utilise ni Date.now, ni performance.now, ni setTimeout, ni setInterval, ni requestAnimationFrame", () => {
    const src = readFileSync(resolve(__dirname, "../transientContributionRegistry.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/performance\.now\s*\(/)
    expect(src).not.toMatch(/\bsetTimeout\s*\(/)
    expect(src).not.toMatch(/\bsetInterval\s*\(/)
    expect(src).not.toMatch(/\brequestAnimationFrame\s*\(/)
  })
})

describe("T15 — CAPACITOR et POLARIZED_CAPACITOR réutilisent la fondation générique sans duplication du solveur", () => {
  it("les deux contributions produisent la même tension pour les mêmes params/dt/supplyVoltage (même moteur de charge)", () => {
    const capacitor = getTransientContribution("CAPACITOR")
    const polarized = getTransientContribution("POLARIZED_CAPACITOR")
    const capResult = capacitor({
      pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params: { capacitance: 1e-4 }, supplyVoltage: 5, dt: 10, currentTimeMs: 10, previousState: undefined,
    })
    const polResult = polarized({
      pins: { plus: Signal.HIGH, minus: Signal.LOW }, params: { capacitance: 1e-4 }, supplyVoltage: 5, dt: 10, currentTimeMs: 10, previousState: undefined,
    })
    expect(polResult.contribution.voltage).toBe(capResult.contribution.voltage)
  })

  it("composant non alimenté (boucle non simple) => état préservé, aucune contribution", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const previousState = { voltage: 2.5 }
    const result = contribute({
      pins: { pinA: Signal.UNKNOWN, pinB: Signal.UNKNOWN }, params: { capacitance: 1e-4 }, supplyVoltage: 5, dt: 10, currentTimeMs: 10, previousState,
    })
    expect(result.contribution).toBeNull()
    expect(result.state).toBe(previousState)
  })

  it("supplyVoltage absent (plusieurs sources DC) => traité comme non alimenté", () => {
    const contribute = getTransientContribution("CAPACITOR")
    const result = contribute({
      pins: { pinA: Signal.HIGH, pinB: Signal.LOW }, params: { capacitance: 1e-4 }, supplyVoltage: null, dt: 10, currentTimeMs: 10, previousState: undefined,
    })
    expect(result.contribution).toBeNull()
    expect(result.state).toBeUndefined()
  })
})
