import { describe, it, expect } from "vitest"
import { resolveComponentParameters, validateComponentParameters, isFixedParameter } from "../resolveComponentParameters.js"

describe("MB-L1-CVE-001 — resolveComponentParameters (§6, TEST T1-T3)", () => {
  it("T1 — RESISTOR sans override retourne les defaults canoniques (resistance 220)", () => {
    expect(resolveComponentParameters("RESISTOR", {})).toEqual({ resistance: 220 })
    expect(resolveComponentParameters("RESISTOR", undefined)).toEqual({ resistance: 220 })
    expect(resolveComponentParameters("RESISTOR", null)).toEqual({ resistance: 220 })
  })

  it("T2 — RESISTOR avec override valide retourne la valeur d'instance", () => {
    expect(resolveComponentParameters("RESISTOR", { resistance: 1000 })).toEqual({ resistance: 1000 })
  })

  it("T3 — POTENTIOMETER avec override partiel conserve le default pour la clé non fournie", () => {
    expect(resolveComponentParameters("POTENTIOMETER", { position: 0.75 })).toEqual({
      resistance: 10000,
      position: 0.75,
    })
  })

  it("type inconnu ou sans modèle de simulation (LED, ARDUINO) retourne un objet vide, jamais une exception", () => {
    expect(resolveComponentParameters("LED", { anything: 1 })).toEqual({})
    expect(resolveComponentParameters("ARDUINO", {})).toEqual({})
    expect(resolveComponentParameters("NOT_A_REAL_TYPE", { resistance: 1000 })).toEqual({})
  })

  it("une clé inconnue dans instanceParameters est ignorée (repli sur le default), jamais adoptée", () => {
    expect(resolveComponentParameters("RESISTOR", { resistance: 1000, bogusKey: 42 })).toEqual({ resistance: 1000 })
  })

  it("une valeur hors range dans instanceParameters est ignorée (repli sur le default)", () => {
    expect(resolveComponentParameters("RESISTOR", { resistance: -5 })).toEqual({ resistance: 220 })
    expect(resolveComponentParameters("RESISTOR", { resistance: 1e12 })).toEqual({ resistance: 220 })
  })

  it("NaN/Infinity dans instanceParameters sont ignorés (repli sur le default)", () => {
    expect(resolveComponentParameters("RESISTOR", { resistance: NaN })).toEqual({ resistance: 220 })
    expect(resolveComponentParameters("RESISTOR", { resistance: Infinity })).toEqual({ resistance: 220 })
    expect(resolveComponentParameters("RESISTOR", { resistance: -Infinity })).toEqual({ resistance: 220 })
  })
})

describe("MB-L1-CVE-001 — validateComponentParameters (§6.1, TEST T4-T6)", () => {
  it("T4 — clé inconnue rejetée (aucune mutation persistante)", () => {
    const result = validateComponentParameters("RESISTOR", { bogusKey: 42 })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.sanitized).toEqual({})
  })

  it("T5 — valeur hors minimum/maximum rejetée", () => {
    const belowMin = validateComponentParameters("RESISTOR", { resistance: -1 })
    expect(belowMin.valid).toBe(false)
    const aboveMax = validateComponentParameters("RESISTOR", { resistance: 1e12 })
    expect(aboveMax.valid).toBe(false)
  })

  it("T6 — NaN / Infinity rejetés", () => {
    expect(validateComponentParameters("RESISTOR", { resistance: NaN }).valid).toBe(false)
    expect(validateComponentParameters("RESISTOR", { resistance: Infinity }).valid).toBe(false)
    expect(validateComponentParameters("RESISTOR", { resistance: -Infinity }).valid).toBe(false)
  })

  it("une candidate valide retourne valid:true avec le sanitized correspondant", () => {
    const result = validateComponentParameters("RESISTOR", { resistance: 1000 })
    expect(result).toEqual({ valid: true, errors: [], sanitized: { resistance: 1000 } })
  })

  it("un paramètre figé (minimum === maximum, ex. pile 1.5V) est rejeté à l'édition", () => {
    const result = validateComponentParameters("BATTERY_AA", { voltage: 3 })
    expect(result.valid).toBe(false)
  })

  it("un type sans modèle de simulation (LED) est rejeté par le validateur", () => {
    expect(validateComponentParameters("LED", { anything: 1 }).valid).toBe(false)
  })
})

describe("MB-L1-CVE-001 — isFixedParameter (§15)", () => {
  it("BATTERY_AA.voltage est figé (minimum === maximum === 1.5)", () => {
    expect(isFixedParameter("BATTERY_AA", "voltage")).toBe(true)
  })

  it("RESISTOR.resistance n'est pas figé", () => {
    expect(isFixedParameter("RESISTOR", "resistance")).toBe(false)
  })

  it("clé/type inconnu retourne false, jamais une exception", () => {
    expect(isFixedParameter("RESISTOR", "bogus")).toBe(false)
    expect(isFixedParameter("NOT_A_TYPE", "resistance")).toBe(false)
  })
})
