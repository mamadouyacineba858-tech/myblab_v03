import { describe, it, expect } from "vitest"
import { applyEnvironmentalStimuli, isValidLightStimulus } from "../environmentalStimulus.js"
import { getCanonicalEntry } from "../canonicalRegistry.js"

const LDR_BOUNDS = getCanonicalEntry("LDR").parameterSchema.find((p) => p.key === "resistance")
const R_MIN = LDR_BOUNDS.minimum
const R_MAX = LDR_BOUNDS.maximum

function ldr(uid, parameters) {
  return { uid, type: "LDR", x: 0, y: 0, parameters }
}

describe("MB-L1-ENV-001 — applyEnvironmentalStimuli (GATE E2, T1-T8)", () => {
  it("T1 — LIGHT absent (null/undefined) : no-op, MÊME référence de tableau", () => {
    const components = [ldr("ldr1", { resistance: 5000 })]
    expect(applyEnvironmentalStimuli(components, null)).toBe(components)
    expect(applyEnvironmentalStimuli(components, undefined)).toBe(components)
    expect(applyEnvironmentalStimuli(components, {})).toBe(components)
  })

  it("T2 — LIGHT invalide (NaN/Infinity/-Infinity/hors-borne/non-numérique) est ignoré, aucun paramètre corrompu", () => {
    const components = [ldr("ldr1", { resistance: 5000 })]
    for (const invalid of [NaN, Infinity, -Infinity, -0.0001, 1.0001, "0.5", null, undefined, {}]) {
      const result = applyEnvironmentalStimuli(components, { LIGHT: invalid })
      expect(result).toBe(components)
      expect(result[0].parameters).toEqual({ resistance: 5000 })
    }
  })

  it("T3 — LIGHT = 0 -> résistance effective LDR = Rmax canonique", () => {
    const components = [ldr("ldr1", { resistance: 5000 })]
    const [effective] = applyEnvironmentalStimuli(components, { LIGHT: 0 })
    expect(effective.parameters.resistance).toBe(R_MAX)
  })

  it("T4 — LIGHT = 1 -> résistance effective LDR = Rmin canonique", () => {
    const components = [ldr("ldr1", { resistance: 5000 })]
    const [effective] = applyEnvironmentalStimuli(components, { LIGHT: 1 })
    expect(effective.parameters.resistance).toBe(R_MIN)
  })

  it("T5 — interpolation strictement monotone décroissante et bornée pour 0 < light < 1", () => {
    const components = [ldr("ldr1", { resistance: 5000 })]
    const values = [0, 0.25, 0.5, 0.75, 1].map(
      (light) => applyEnvironmentalStimuli(components, { LIGHT: light })[0].parameters.resistance
    )
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(R_MIN)
      expect(v).toBeLessThanOrEqual(R_MAX)
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1])
    }
  })

  it("T6 — aucune mutation de l'entrée : composant, parameters et tableau original inchangés", () => {
    const originalParameters = { resistance: 5000 }
    const originalComponent = ldr("ldr1", originalParameters)
    const components = Object.freeze([originalComponent])

    const result = applyEnvironmentalStimuli(components, { LIGHT: 0.5 })

    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ resistance: 5000 })
    expect(components[0]).toBe(originalComponent)
    expect(result).not.toBe(components)
    expect(result[0]).not.toBe(originalComponent)
  })

  it("T7 — RESISTOR et THERMISTOR restent strictement inchangés (identité + valeur) sous LIGHT actif", () => {
    const resistor = { uid: "r1", type: "RESISTOR", parameters: { resistance: 220 } }
    const thermistor = { uid: "t1", type: "THERMISTOR", parameters: { resistance: 10000 } }
    const components = [resistor, thermistor]

    const result = applyEnvironmentalStimuli(components, { LIGHT: 0.5 })

    expect(result[0]).toBe(resistor)
    expect(result[1]).toBe(thermistor)
    expect(result[0].parameters.resistance).toBe(220)
    expect(result[1].parameters.resistance).toBe(10000)
  })

  it("T8 — les bornes utilisées sont EXACTEMENT celles du Registry canonique LDR (aucune constante dupliquée)", () => {
    const components = [ldr("ldr1", {})]
    const atZero = applyEnvironmentalStimuli(components, { LIGHT: 0 })[0].parameters.resistance
    const atOne = applyEnvironmentalStimuli(components, { LIGHT: 1 })[0].parameters.resistance
    expect(atZero).toBe(getCanonicalEntry("LDR").parameterSchema.find((p) => p.key === "resistance").maximum)
    expect(atOne).toBe(getCanonicalEntry("LDR").parameterSchema.find((p) => p.key === "resistance").minimum)
  })

  it("un circuit mixte ne clone que le(s) composant(s) réellement concerné(s) par un effet environnemental", () => {
    const resistor = { uid: "r1", type: "RESISTOR", parameters: { resistance: 220 } }
    const ldrComp = ldr("ldr1", { resistance: 5000 })
    const components = [resistor, ldrComp]

    const result = applyEnvironmentalStimuli(components, { LIGHT: 0.5 })

    expect(result).not.toBe(components)
    expect(result[0]).toBe(resistor)
    expect(result[1]).not.toBe(ldrComp)
  })

  it("un tableau de composants non-array est retourné tel quel (garde défensive)", () => {
    expect(applyEnvironmentalStimuli(null, { LIGHT: 0.5 })).toBe(null)
    expect(applyEnvironmentalStimuli(undefined, { LIGHT: 0.5 })).toBe(undefined)
  })

  it("un composant null/non-objet dans le tableau est laissé tel quel, sans exception", () => {
    const components = [null, ldr("ldr1", { resistance: 5000 })]
    const result = applyEnvironmentalStimuli(components, { LIGHT: 0.5 })
    expect(result[0]).toBe(null)
  })
})

describe("MB-L1-ENV-001 — isValidLightStimulus (ENV-20)", () => {
  it("accepte tout nombre fini dans [0,1]", () => {
    expect(isValidLightStimulus(0)).toBe(true)
    expect(isValidLightStimulus(1)).toBe(true)
    expect(isValidLightStimulus(0.5)).toBe(true)
  })

  it("rejette NaN/Infinity/-Infinity/hors-borne/non-numérique", () => {
    expect(isValidLightStimulus(NaN)).toBe(false)
    expect(isValidLightStimulus(Infinity)).toBe(false)
    expect(isValidLightStimulus(-Infinity)).toBe(false)
    expect(isValidLightStimulus(-0.0001)).toBe(false)
    expect(isValidLightStimulus(1.0001)).toBe(false)
    expect(isValidLightStimulus("0.5")).toBe(false)
    expect(isValidLightStimulus(null)).toBe(false)
    expect(isValidLightStimulus(undefined)).toBe(false)
  })
})
