import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  createDigitalEventContributionRegistry,
  getDigitalEventContribution,
  hasDigitalEventContribution,
  getAllDigitalEventContributionTypes,
} from "../digitalEventContributionRegistry.js"
import { createDigitalTransitionStore, recordDigitalTransition, recordDigitalTransitions, consumeDigitalTransitions } from "../digitalTransitions.js"
import { InvalidDigitalTransitionError } from "../errors/index.js"
import { Signal } from "../signals.js"

/**
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 — Registry générique des contributeurs
 * événementiels + primitive d'enregistrement atomique. Fixtures sur un type
 * canonique existant (NPN_TRANSISTOR) au travers d'un Registry isolé ; aucun
 * type n'est enregistré en production.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

function readSourceWithoutComments(name) {
  return readFileSync(resolve(__dirname, "..", name), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
}

const t = (pinId, timeMs, signal) => ({ pinId, timeMs, signal })
const fixture = { inputPins: ["base"], outputPins: ["emitter"], contribute: () => ({ state: undefined, transitions: [] }) }

describe("A12-PREQ-EC — Registry événementiel", () => {
  it("EC-01 — la table de production est vide", () => {
    expect(getAllDigitalEventContributionTypes()).toEqual([])
    expect(hasDigitalEventContribution("NPN_TRANSISTOR")).toBe(false)
    expect(hasDigitalEventContribution("WS2812B_V6")).toBe(false)
    expect(getDigitalEventContribution("WS2812B_V6")).toBeNull()
    expect(createDigitalEventContributionRegistry().getAllDigitalEventContributionTypes()).toEqual([])
  })

  it("EC-02 — has/get d'un Registry fixture (Map ou objet), entrée figée", () => {
    for (const contributions of [new Map([["NPN_TRANSISTOR", fixture]]), { NPN_TRANSISTOR: fixture }]) {
      const registry = createDigitalEventContributionRegistry({ contributions })
      expect(registry.hasDigitalEventContribution("NPN_TRANSISTOR")).toBe(true)
      const entry = registry.getDigitalEventContribution("NPN_TRANSISTOR")
      expect(entry.inputPins).toEqual(["base"])
      expect(entry.outputPins).toEqual(["emitter"])
      expect(entry.contribute).toBe(fixture.contribute)
      expect(Object.isFrozen(entry)).toBe(true)
      expect(Object.isFrozen(entry.inputPins)).toBe(true)
      expect(registry.getAllDigitalEventContributionTypes()).toEqual(["NPN_TRANSISTOR"])
    }
    // le Registry fixture ne pollue pas la production
    expect(hasDigitalEventContribution("NPN_TRANSISTOR")).toBe(false)
  })

  it("EC-03 — type non enregistré : has false, get null", () => {
    const registry = createDigitalEventContributionRegistry({ contributions: new Map([["NPN_TRANSISTOR", fixture]]) })
    expect(registry.hasDigitalEventContribution("LED")).toBe(false)
    expect(registry.getDigitalEventContribution("LED")).toBeNull()
  })

  it("déclaration invalide refusée explicitement (contribute / inputPins / outputPins)", () => {
    for (const bad of [
      {},
      { ...fixture, contribute: null },
      { ...fixture, inputPins: "base" },
      { ...fixture, outputPins: [""] },
    ]) {
      expect(() => createDigitalEventContributionRegistry({ contributions: new Map([["NPN_TRANSISTOR", bad]]) })).toThrow(/invalid contribution/)
    }
  })
})

describe("A12-PREQ-EC — recordDigitalTransitions (lot atomique, contrat DigitalTransition inchangé)", () => {
  it("enregistre un lot dans l'ordre, gelé, fractionnaire intact", () => {
    const store = createDigitalTransitionStore()
    const recorded = recordDigitalTransitions(store, "u", [t("p", 1, Signal.HIGH), t("p", 1.0004, Signal.LOW), t("q", 0.5, Signal.HIGH)])
    expect(recorded.every(Object.isFrozen)).toBe(true)
    expect(consumeDigitalTransitions(store, "u", "p")).toEqual([t("p", 1, Signal.HIGH), t("p", 1.0004, Signal.LOW)])
    expect(consumeDigitalTransitions(store, "u", "q")).toEqual([t("q", 0.5, Signal.HIGH)])
  })

  it("EC-18 — une seule transition invalide : aucune n'est enregistrée (store inchangé)", () => {
    for (const bad of [
      [t("p", 5, Signal.HIGH), t("p", 6, "BOGUS")],
      [t("p", 5, Signal.HIGH), t("p", 4, Signal.LOW)],
      [t("p", 5, Signal.HIGH), t("p", -1, Signal.LOW)],
      [t("p", 5, Signal.HIGH), t("", 6, Signal.LOW)],
      [t("p", 5, Signal.HIGH), null],
    ]) {
      const store = createDigitalTransitionStore()
      recordDigitalTransition(store, "u", t("p", 2, Signal.LOW))
      expect(() => recordDigitalTransitions(store, "u", bad)).toThrow(InvalidDigitalTransitionError)
      expect(consumeDigitalTransitions(store, "u", "p")).toEqual([t("p", 2, Signal.LOW)])
      // la borne de monotonie n'a pas avancé : 3 ms reste acceptable
      expect(() => recordDigitalTransition(store, "u", t("p", 3, Signal.HIGH))).not.toThrow()
    }
  })

  it("monotonie vérifiée contre le store existant et à l'intérieur du lot", () => {
    const store = createDigitalTransitionStore()
    recordDigitalTransition(store, "u", t("p", 10, Signal.HIGH))
    expect(() => recordDigitalTransitions(store, "u", [t("p", 9, Signal.LOW)])).toThrow(/non-decreasing/)
    expect(() => recordDigitalTransitions(store, "u", [t("p", 10, Signal.LOW), t("p", 10, Signal.HIGH)])).not.toThrow()
    expect(() => recordDigitalTransitions(store, "", [])).toThrow(InvalidDigitalTransitionError)
    expect(() => recordDigitalTransitions(store, "u", "nope")).toThrow(InvalidDigitalTransitionError)
    expect(recordDigitalTransitions(store, "u", [])).toEqual([])
  })
})

describe("A12-PREQ-EC — gardes structurelles du Registry", () => {
  const source = readSourceWithoutComments("digitalEventContributionRegistry.js")

  it("EC-21 — aucune horloge système", () => {
    for (const pattern of [/Date\.now\s*\(/, /performance\.now\s*\(/, /\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(/]) {
      expect(source).not.toMatch(pattern)
    }
  })

  it("EC-22/EC-23 — aucune connaissance de protocole ni de type dans le code générique", () => {
    for (const name of ["digitalEventContributionRegistry.js", "digitalTransitions.js", "simulationRuntimeIntegration.js", "engine.js", "resolution.js", "preparation.js", "scheduler.js", "clock.js"]) {
      const code = readSourceWithoutComments(name)
      expect(code, name).not.toMatch(/WS2812|NEOPIXEL|NeoPixel|\bGRB\b|T0H|T1H|T0L|T1L/i)
    }
    expect(source).not.toMatch(/\.type\s*===|["'][A-Z][A-Z0-9_]{2,}["']/)
    expect(source).not.toMatch(/import\s/)
  })
})
