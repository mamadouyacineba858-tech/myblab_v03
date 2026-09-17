import { describe, it, expect } from "vitest"
import {
  createTimedDigitalContributionRegistry,
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
  getAllTimedDigitalContributionTypes,
} from "../timedDigitalContributionRegistry.js"
import { Signal } from "../signals.js"

/**
 * A7-C5-PREQ — timedDigitalContributionRegistry.js (§25 du ticket, TD-01 à TD-06).
 *
 * Registre déclaratif générique, même patron Open/Closed que
 * `digitalContributionRegistry.js`, mais pour des producteurs STATEFUL et
 * DÉPENDANTS DU TEMPS SIMULÉ. Ce PREQ construit UNIQUEMENT le mécanisme
 * (table de production intentionnellement vide, §16/§24 du ticket) — aucun
 * type de production réel n'est enregistré ici.
 */

describe("A7-C5-PREQ — TD-01/TD-02/TD-03 : Registry de production vide par défaut", () => {
  it("TD-01 — aucun type réel enregistré (table de production vide)", () => {
    expect(getAllTimedDigitalContributionTypes()).toEqual([])
  })
  it("TD-02 — hasTimedDigitalContribution(type inconnu) retourne false", () => {
    expect(hasTimedDigitalContribution("UNKNOWN_TYPE")).toBe(false)
  })
  it("TD-03 — getTimedDigitalContribution(type inconnu) retourne null", () => {
    expect(getTimedDigitalContribution("UNKNOWN_TYPE")).toBeNull()
  })
})

describe("A7-C5-PREQ — TD-04/TD-06 : createTimedDigitalContributionRegistry, Registry isolé injectable pour test", () => {
  it("TD-04 — un Registry fixture accepte une contribution déclarée", () => {
    const contributeFn = () => ({ state: undefined, outputs: new Map([["OUT", Signal.HIGH]]) })
    const fixture = createTimedDigitalContributionRegistry({ contributions: new Map([["TIMED_TEST_COMPONENT", contributeFn]]) })
    expect(fixture.hasTimedDigitalContribution("TIMED_TEST_COMPONENT")).toBe(true)
    expect(fixture.getTimedDigitalContribution("TIMED_TEST_COMPONENT")).toBe(contributeFn)
  })

  it("TD-06 — un Registry fixture ne mute jamais le Registry canonique de production", () => {
    const fixture = createTimedDigitalContributionRegistry({
      contributions: new Map([["TIMED_TEST_COMPONENT", () => ({ state: undefined, outputs: null })]]),
    })
    expect(fixture.hasTimedDigitalContribution("TIMED_TEST_COMPONENT")).toBe(true)
    expect(hasTimedDigitalContribution("TIMED_TEST_COMPONENT")).toBe(false)
    expect(getAllTimedDigitalContributionTypes()).toEqual([])
  })

  it("un Registry fixture sans contributions déclarées se comporte comme le Registry de production (vide)", () => {
    const fixture = createTimedDigitalContributionRegistry()
    expect(fixture.getAllTimedDigitalContributionTypes()).toEqual([])
    expect(fixture.hasTimedDigitalContribution("ANYTHING")).toBe(false)
    expect(fixture.getTimedDigitalContribution("ANYTHING")).toBeNull()
  })
})

describe("A7-C5-PREQ — TD-05 : aucun faux type de test enregistré en production", () => {
  it("TIMED_TEST_COMPONENT n'existe pas dans le Registry de production", () => {
    expect(hasTimedDigitalContribution("TIMED_TEST_COMPONENT")).toBe(false)
    expect(getAllTimedDigitalContributionTypes()).not.toContain("TIMED_TEST_COMPONENT")
  })
})
