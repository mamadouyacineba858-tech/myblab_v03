import { describe, it, expect } from "vitest"
import { prepareCircuit } from "../preparation.js"
import { resolveSignals } from "../resolution.js"
import { Signal } from "../signals.js"

/**
 * MB-SIM-012 — Tests de resolveSignals(components, prepared, externalSignals).
 *
 * Démontrent que externalSignals participe réellement à la résolution
 * (nets, propagate()) AVANT que pinSignals ne soit calculé — et pas
 * seulement au résultat final (TEST 6, essentiel).
 */

function circuitArduinoSeul() {
  const components = [{ uid: "ard1", type: "ARDUINO", x: 0, y: 0 }]
  const wires = []
  return { components, wires, prepared: prepareCircuit(components, wires) }
}

function circuitArduinoVersLed() {
  // ard1.D2 -> led1.anode ; power1.GND -> led1.cathode
  const components = [
    { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
    { uid: "power1", type: "POWER", x: 20, y: 0 },
  ]
  const wires = [
    { fromUid: "ard1", fromPin: "D2", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ]
  return { components, wires, prepared: prepareCircuit(components, wires) }
}

function circuitPowerLed() {
  const components = [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
  ]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ]
  return { components, wires, prepared: prepareCircuit(components, wires) }
}

describe("MB-SIM-012 — TEST 1 : signal externe absent (non-régression)", () => {
  it("resolveSignals(components, prepared) [2 arguments] produit un résultat identique avec/sans 3e argument omis, null, ou Map vide", () => {
    const { components, prepared } = circuitPowerLed()
    const sansArgument = resolveSignals(components, prepared)
    const avecNull = resolveSignals(components, prepared, null)
    const avecMapVide = resolveSignals(components, prepared, new Map())

    expect([...avecNull.pinSignals.entries()]).toEqual([...sansArgument.pinSignals.entries()])
    expect([...avecMapVide.pinSignals.entries()]).toEqual([...sansArgument.pinSignals.entries()])
  })

  it("un circuit ARDUINO seul, sans externalSignals, garde le comportement historique (D2/D3 -> FLOATING)", () => {
    const { components, prepared } = circuitArduinoSeul()
    const { pinSignals } = resolveSignals(components, prepared)
    expect(pinSignals.get("ard1:D2")).toBe(Signal.FLOATING)
    expect(pinSignals.get("ard1:D3")).toBe(Signal.FLOATING)
  })
})

describe("MB-SIM-012 — TEST 2 : injection HIGH consommée par la résolution", () => {
  it("un externalSignals ard1:D2 -> HIGH remplace le fallback FLOATING (pas seulement ajouté après coup)", () => {
    const { components, prepared } = circuitArduinoSeul()
    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])
    const { pinSignals } = resolveSignals(components, prepared, externalSignals)
    expect(pinSignals.get("ard1:D2")).toBe(Signal.HIGH)
  })
})

describe("MB-SIM-012 — TEST 3 : injection LOW consommée par la résolution", () => {
  it("un externalSignals ard1:D2 -> LOW remplace le fallback FLOATING", () => {
    const { components, prepared } = circuitArduinoSeul()
    const externalSignals = new Map([["ard1:D2", Signal.LOW]])
    const { pinSignals } = resolveSignals(components, prepared, externalSignals)
    expect(pinSignals.get("ard1:D2")).toBe(Signal.LOW)
  })
})

describe("MB-SIM-012 — TEST 4 : fallback ARDUINO préservé sans signal externe", () => {
  it("sans externalSignals pour D3 (même si D2 est fourni), D3 reste FLOATING", () => {
    const { components, prepared } = circuitArduinoSeul()
    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])
    const { pinSignals } = resolveSignals(components, prepared, externalSignals)
    expect(pinSignals.get("ard1:D2")).toBe(Signal.HIGH)
    expect(pinSignals.get("ard1:D3")).toBe(Signal.FLOATING)
  })

  it("une clé externalSignals ne correspondant à aucune pin réelle du circuit est ignorée silencieusement (aucune clé fantôme créée)", () => {
    const { components, prepared } = circuitArduinoSeul()
    const externalSignals = new Map([["ard1:D4", Signal.HIGH]]) // D4 n'existe pas dans canonicalRegistry pour ARDUINO
    const { pinSignals } = resolveSignals(components, prepared, externalSignals)
    expect(pinSignals.has("ard1:D4")).toBe(false)
  })
})

describe("MB-SIM-012 — TEST 5 : POWER reste prioritaire, non-régression", () => {
  it("les signaux POWER existants (5V=HIGH, GND=LOW) fonctionnent exactement comme avant, avec ou sans externalSignals", () => {
    const { components, prepared } = circuitPowerLed()
    const { pinSignals: sans } = resolveSignals(components, prepared)
    const { pinSignals: avec } = resolveSignals(components, prepared, new Map([["led1:anode", Signal.LOW]]))
    expect(sans.get("power1:5V")).toBe(Signal.HIGH)
    expect(sans.get("power1:GND")).toBe(Signal.LOW)
    // externalSignals ne change rien à POWER lui-même (POWER est seedé
    // avant externalSignals et n'est jamais UNKNOWN à ce stade).
    expect(avec.get("power1:5V")).toBe(Signal.HIGH)
    expect(avec.get("power1:GND")).toBe(Signal.LOW)
  })

  it("un externalSignals qui tente de cibler directement une pin POWER (5V) déjà seedée est sans effet : POWER n'est jamais réécrit (priorité POWER > externalSignals, §8 du ticket)", () => {
    const { components, prepared } = circuitPowerLed()
    const externalSignals = new Map([["power1:5V", Signal.LOW]]) // conflit délibéré
    const { pinSignals } = resolveSignals(components, prepared, externalSignals)
    expect(pinSignals.get("power1:5V")).toBe(Signal.HIGH) // POWER l'emporte, inchangé
  })
})

describe("MB-SIM-012 — TEST 6 (essentiel) : propagation réelle, pas une fusion post-résolution", () => {
  it("un signal externe HIGH sur ard1:D2, câblé à led1.anode, allume réellement la LED (propagation, pas simple présence dans le Map final)", () => {
    const { components, prepared } = circuitArduinoVersLed()

    const sansSignal = resolveSignals(components, prepared)
    // Sans signal externe : D2 -> FLOATING (fallback appliqué uniquement à
    // la clé ard1:D2 elle-même, pas propagé au reste du net puisque D2
    // était encore UNKNOWN au moment de propagate()) ; led1:anode, dans le
    // même net, reste donc UNKNOWN (ni HIGH ni LOW n'a jamais été propagé
    // dans ce net) — comportement réel du code, pas supposé.
    expect(sansSignal.pinSignals.get("ard1:D2")).toBe(Signal.FLOATING)
    expect(sansSignal.pinSignals.get("led1:anode")).toBe(Signal.UNKNOWN)
    // Dans les deux cas, la LED n'est pas allumée (anode non HIGH).
    expect(sansSignal.pinSignals.get("led1:anode")).not.toBe(Signal.HIGH)

    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])
    const avecSignal = resolveSignals(components, prepared, externalSignals)

    // La pin ard1:D2 elle-même porte bien HIGH...
    expect(avecSignal.pinSignals.get("ard1:D2")).toBe(Signal.HIGH)
    // ...ET, preuve de la propagation réelle (pas une fusion isolée), la
    // pin d'un AUTRE composant (led1.anode), câblée au même net, hérite
    // de ce HIGH via propagate() — jamais touchée directement par
    // externalSignals (qui ne contient aucune clé "led1:...").
    expect(avecSignal.pinSignals.get("led1:anode")).toBe(Signal.HIGH)
    expect(avecSignal.pinSignals.get("led1:cathode")).toBe(Signal.LOW) // POWER.GND, inchangé

    // Non-invention : la clé injectée est strictement "ard1:D2", jamais
    // "led1:anode" — la valeur qu'on y observe est un effet de la
    // résolution, pas une valeur qu'on y aurait mise nous-mêmes.
    expect(externalSignals.has("led1:anode")).toBe(false)
  })
})

describe("MB-SIM-012 — TEST 8 : déterminisme", () => {
  it("mêmes components + wires + externalSignals => même résultat, à chaque appel", () => {
    const { components, wires } = circuitArduinoVersLed()
    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])

    const a = resolveSignals(components, prepareCircuit(components, wires), new Map(externalSignals))
    const b = resolveSignals(components, prepareCircuit(components, wires), new Map(externalSignals))

    expect([...a.pinSignals.entries()]).toEqual([...b.pinSignals.entries()])
  })

  it("externalSignals n'est jamais muté par resolveSignals (fonction pure vis-à-vis de son entrée)", () => {
    const { components, prepared } = circuitArduinoSeul()
    const externalSignals = new Map([["ard1:D2", Signal.HIGH]])
    const snapshot = new Map(externalSignals)
    resolveSignals(components, prepared, externalSignals)
    expect([...externalSignals.entries()]).toEqual([...snapshot.entries()])
  })
})
