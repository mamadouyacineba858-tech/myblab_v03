import { describe, it, expect } from "vitest"
import {
  createDigitalContributionRegistry,
  getDigitalContribution,
  hasDigitalContribution,
  getAllDigitalContributionTypes,
} from "../digitalContributionRegistry.js"
import { Signal } from "../signals.js"

/**
 * A7-C3-PREQ — digitalContributionRegistry.js (T01, T04, T05).
 *
 * Registre déclaratif générique, même patron Open/Closed que
 * dcContributionRegistry.js, mais pour des sorties HIGH/LOW calculées
 * plutôt qu'analogiques. Ce ticket construit UNIQUEMENT le mécanisme : la
 * table de production reste vide (aucun MOISTURE/SOIL/PIR/TILT/IR — voir
 * digitalContributionRegistryEmpty.test.js pour la preuve).
 */

describe("A7-C3-PREQ — T01 : Registry inconnu -> null/absent", () => {
  it("getDigitalContribution(type inconnu) retourne null", () => {
    expect(getDigitalContribution("UNKNOWN_TYPE")).toBeNull()
  })
  it("hasDigitalContribution(type inconnu) retourne false", () => {
    expect(hasDigitalContribution("UNKNOWN_TYPE")).toBe(false)
  })
  it("registre de production : aucun type enregistré dans ce ticket (table vide)", () => {
    expect(getAllDigitalContributionTypes()).toEqual([])
  })
})

describe("A7-C3-PREQ — createDigitalContributionRegistry : Registry isolé, injectable pour test (§13)", () => {
  it("un Registry fixture ne pollue jamais le Registry de production", () => {
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([["LDR", () => new Map([["B", Signal.HIGH]])]]),
    })
    expect(fixture.hasDigitalContribution("LDR")).toBe(true)
    expect(hasDigitalContribution("LDR")).toBe(false)
    expect(getAllDigitalContributionTypes()).toEqual([])
  })

  it("getDigitalContribution du Registry fixture retourne la fonction enregistrée, exécutable", () => {
    const contributeFn = () => new Map([["B", Signal.HIGH]])
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", contributeFn]]) })
    expect(fixture.getDigitalContribution("LDR")).toBe(contributeFn)
    expect([...fixture.getDigitalContribution("LDR")({})]).toEqual([["B", Signal.HIGH]])
  })

  it("T04 — une contribution peut retourner zéro sortie (Map vide ou null), sans erreur", () => {
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([
        ["LDR", () => new Map()],
        ["THERMISTOR", () => null],
      ]),
    })
    expect(fixture.getDigitalContribution("LDR")({}).size).toBe(0)
    expect(fixture.getDigitalContribution("THERMISTOR")({})).toBeNull()
  })

  it("T05 — une contribution peut produire plusieurs pins de sortie simultanément", () => {
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([
        ["NPN_TRANSISTOR", () => new Map([["collector", Signal.HIGH], ["emitter", Signal.LOW]])],
      ]),
    })
    const out = fixture.getDigitalContribution("NPN_TRANSISTOR")({})
    expect(out.size).toBe(2)
    expect(out.get("collector")).toBe(Signal.HIGH)
    expect(out.get("emitter")).toBe(Signal.LOW)
  })

  it("un Registry fixture sans contributions déclarées se comporte comme le Registry de production (vide)", () => {
    const fixture = createDigitalContributionRegistry()
    expect(fixture.getAllDigitalContributionTypes()).toEqual([])
    expect(fixture.hasDigitalContribution("ANYTHING")).toBe(false)
  })
})

describe("A7-C3-PREQ — aucune connaissance de type spécifique dans le Registry lui-même", () => {
  it("digitalContributionRegistry.js ne contient aucun littéral SOIL_MOISTURE_SENSOR/PIR/TILT/IR_RECEIVER/MOISTURE", async () => {
    const { readFileSync } = await import("node:fs")
    const { fileURLToPath } = await import("node:url")
    const { dirname, resolve } = await import("node:path")
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(resolve(__dirname, "../digitalContributionRegistry.js"), "utf-8")
    for (const forbidden of ["SOIL_MOISTURE_SENSOR", "PIR", "TILT", "IR_RECEIVER", "MOISTURE"]) {
      expect(src, forbidden).not.toMatch(new RegExp(forbidden))
    }
  })
})
