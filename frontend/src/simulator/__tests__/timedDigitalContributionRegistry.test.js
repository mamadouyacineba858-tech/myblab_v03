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
 * DÉPENDANTS DU TEMPS SIMULÉ. Le PREQ a construit UNIQUEMENT le mécanisme
 * (table de production intentionnellement vide, §16/§24 du ticket PREQ).
 * A7-C5 enregistre la PREMIÈRE entrée réelle : HC_SR04 (voir
 * hcSr04A7C5.test.js pour la preuve ECHO/TRIG complète).
 */

describe("A7-C5-PREQ/A7-C5 — TD-01/TD-02/TD-03 : Registry de production", () => {
  it("TD-01 — HC_SR04 (A7-C5), JK_FLIP_FLOP_74HC73 (A9-JK1), D_FLIP_FLOP_74HC74 (A9-DFF1) et D_LATCH_74HC75 (A9-LATCH1) sont les seuls types réels enregistrés à ce jour", () => {
    expect(getAllTimedDigitalContributionTypes()).toEqual(["HC_SR04", "JK_FLIP_FLOP_74HC73", "D_FLIP_FLOP_74HC74", "D_LATCH_74HC75"])
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
    expect(getAllTimedDigitalContributionTypes()).toEqual(["HC_SR04", "JK_FLIP_FLOP_74HC73", "D_FLIP_FLOP_74HC74", "D_LATCH_74HC75"])
  })

  it("un Registry fixture sans contributions déclarées reste vide, indépendant du Registry de production (HC_SR04)", () => {
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
