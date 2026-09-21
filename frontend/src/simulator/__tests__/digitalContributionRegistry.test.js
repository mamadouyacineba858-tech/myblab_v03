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
 * plutôt qu'analogiques. A7-C3-PREQ a construit UNIQUEMENT le mécanisme
 * (table de production vide). A7-C3 a enregistré SOIL_MOISTURE_SENSOR (la
 * première entrée réelle de production, voir soilMoistureSensorA7C3.test.js
 * pour la preuve DO complète), A7-C4-PIR ajoute PIR_MOTION_SENSOR (voir
 * pirMotionSensorA7C4.test.js pour la preuve OUT complète), A7-C4-TILT ajoute
 * TILT_SENSOR (voir tiltSensorA7C4.test.js pour la preuve DO complète),
 * A7-C4-IR ajoute IR_RECEIVER (voir irReceiverA7C4.test.js pour la preuve
 * SIGNAL active-low complète).
 */

describe("A7-C3-PREQ — T01 : Registry inconnu -> null/absent", () => {
  it("getDigitalContribution(type inconnu) retourne null", () => {
    expect(getDigitalContribution("UNKNOWN_TYPE")).toBeNull()
  })
  it("hasDigitalContribution(type inconnu) retourne false", () => {
    expect(hasDigitalContribution("UNKNOWN_TYPE")).toBe(false)
  })
  it("registre de production : SOIL_MOISTURE_SENSOR (A7-C3) + PIR_MOTION_SENSOR (A7-C4-PIR) + TILT_SENSOR (A7-C4-TILT) + IR_RECEIVER (A7-C4-IR) + AND_GATE (A9-AND), aucun autre type", () => {
    expect(getAllDigitalContributionTypes()).toEqual(["SOIL_MOISTURE_SENSOR", "PIR_MOTION_SENSOR", "TILT_SENSOR", "IR_RECEIVER", "AND_GATE"])
  })
})

describe("A7-C3-PREQ — createDigitalContributionRegistry : Registry isolé, injectable pour test (§13)", () => {
  it("un Registry fixture ne pollue jamais le Registry de production", () => {
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([["LDR", () => new Map([["B", Signal.HIGH]])]]),
    })
    expect(fixture.hasDigitalContribution("LDR")).toBe(true)
    expect(hasDigitalContribution("LDR")).toBe(false)
    expect(getAllDigitalContributionTypes()).toEqual(["SOIL_MOISTURE_SENSOR", "PIR_MOTION_SENSOR", "TILT_SENSOR", "IR_RECEIVER", "AND_GATE"])
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
