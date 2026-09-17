import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { composeElectricalAnalysis } from "../electricalAnalysis.js"

/**
 * A4-D-PREQ2 — composeElectricalAnalysis() (electricalAnalysis.js), T1 à T6.
 *
 * Primitive générique pure : compose l'analyse DC steady-state historique
 * avec la contribution électrique transitoire du step courant, sans jamais
 * connaître le moindre type de composant (I-A4-15).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

describe("T1 — DC seul => résultat DC identique", () => {
  it("aucune contribution transitoire : le résultat composé égale dcAnalysis, entrée par entrée", () => {
    const dcAnalysis = new Map([
      ["r1", { voltage: 5, current: 0.025 }],
      ["cap1", { voltage: 5, current: 0 }],
    ])
    const composed = composeElectricalAnalysis(dcAnalysis)
    expect([...composed.entries()]).toEqual([...dcAnalysis.entries()])
  })

  it("transientAnalysis explicitement vide produit le même résultat", () => {
    const dcAnalysis = new Map([["r1", { voltage: 5, current: 0.025 }]])
    const composed = composeElectricalAnalysis(dcAnalysis, new Map())
    expect([...composed.entries()]).toEqual([...dcAnalysis.entries()])
  })
})

describe("T2 — transient seul => présent dans le résultat", () => {
  it("dcAnalysis vide, transientAnalysis non vide : le résultat contient l'entrée transitoire", () => {
    const transientAnalysis = new Map([["cap1", { voltage: 2.1, current: 0.003 }]])
    const composed = composeElectricalAnalysis(new Map(), transientAnalysis)
    expect(composed.get("cap1")).toEqual({ voltage: 2.1, current: 0.003 })
    expect(composed.size).toBe(1)
  })
})

describe("T3 — même uid DC + transient => transient remplace DC", () => {
  it("l'entrée transitoire du step courant écrase l'entrée DC steady-state du même uid", () => {
    const dcAnalysis = new Map([["cap1", { voltage: 5, current: 0 }]])
    const transientAnalysis = new Map([["cap1", { voltage: 1.8, current: 0.0004 }]])
    const composed = composeElectricalAnalysis(dcAnalysis, transientAnalysis)
    expect(composed.get("cap1")).toEqual({ voltage: 1.8, current: 0.0004 })
    expect(composed.size).toBe(1)
  })
})

describe("T4 — uids différents => les deux contributions sont conservées", () => {
  it("un composant DC-only et un composant transitoire coexistent dans le résultat composé", () => {
    const dcAnalysis = new Map([["r1", { voltage: 5, current: 0.025 }]])
    const transientAnalysis = new Map([["cap1", { voltage: 1.2, current: 0.0002 }]])
    const composed = composeElectricalAnalysis(dcAnalysis, transientAnalysis)
    expect(composed.get("r1")).toEqual({ voltage: 5, current: 0.025 })
    expect(composed.get("cap1")).toEqual({ voltage: 1.2, current: 0.0002 })
    expect(composed.size).toBe(2)
  })
})

describe("T5 — composition ne mute aucune Map d'entrée", () => {
  it("dcAnalysis et transientAnalysis restent inchangées après composition", () => {
    const dcAnalysis = new Map([["r1", { voltage: 5, current: 0.025 }], ["cap1", { voltage: 5, current: 0 }]])
    const transientAnalysis = new Map([["cap1", { voltage: 1.2, current: 0.0002 }]])
    const dcSnapshot = new Map(dcAnalysis)
    const transientSnapshot = new Map(transientAnalysis)

    const composed = composeElectricalAnalysis(dcAnalysis, transientAnalysis)

    expect([...dcAnalysis.entries()]).toEqual([...dcSnapshot.entries()])
    expect([...transientAnalysis.entries()]).toEqual([...transientSnapshot.entries()])
    expect(composed).not.toBe(dcAnalysis)
    expect(composed).not.toBe(transientAnalysis)
  })
})

describe("T6 — aucune connaissance CAPACITOR dans le compositeur générique", () => {
  it("electricalAnalysis.js ne contient aucun littéral CAPACITOR/POLARIZED_CAPACITOR/type de composant", () => {
    const src = readFileSync(resolve(__dirname, "../electricalAnalysis.js"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
    expect(src).not.toMatch(/["']CAPACITOR["']/)
    expect(src).not.toMatch(/["']POLARIZED_CAPACITOR["']/)
    expect(src).not.toMatch(/\.type\s*===/)
  })
})
