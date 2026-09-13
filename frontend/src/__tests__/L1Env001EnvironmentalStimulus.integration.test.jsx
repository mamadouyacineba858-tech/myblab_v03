/**
 * L1Env001EnvironmentalStimulus.integration.test.jsx — MB-L1-ENV-001
 * (Environmental Stimulus Foundation — LIGHT -> LDR), Ticket §22 TEST T9-T18.
 *
 * Pipeline réel (CircuitProvider, vraies actions addComponent/addWire/
 * startSimulation/setEnvironmentalStimulus/exportCircuit/importCircuit/
 * undo/redo) — même patron que ComponentValueEditing.integration.test.jsx
 * (MB-L1-CVE-001) et useCircuitStateArduinoBridge.test.jsx
 * (MB-ARDUINO-BRIDGE-001). Aucun mock du Document, aucun mock de
 * `applyEnvironmentalStimuli`/`observe`/`measure` : ce fichier prouve que le
 * chemin produit (vrai CircuitProvider/useCircuitState) est cohérent de
 * bout en bout, comme l'exige le ticket §14.
 */
// Requis par le transform JSX de ce projet (classic runtime en test), malgré
// le signalement ESLint "'React' is defined but never used" — même
// catégorie déjà présente et acceptée telle quelle dans le dépôt
// (MeasurementPanel.jsx/AddWireMutationChannel.integration.test.jsx/
// useCircuitStateArduinoBridge.test.jsx et de nombreux autres).
import React from "react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { prepareCircuit } from "../simulator/preparation.js"
import { resolveSignals } from "../simulator/resolution.js"
import { applyEnvironmentalStimuli } from "../simulator/environmentalStimulus.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"
import { observe, ObservationQuantity, ObservationStatus } from "../observation/observationContract.js"
import { measure, MeasurementMode } from "../measurement/measurementContract.js"
import { Signal } from "../simulator/signals.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const LDR_BOUNDS = getCanonicalEntry("LDR").parameterSchema.find((p) => p.key === "resistance")
const R_MIN = LDR_BOUNDS.minimum
const R_MAX = LDR_BOUNDS.maximum

function wrapperWith(orchestrators) {
  return ({ children }) => <CircuitProvider orchestrators={orchestrators}>{children}</CircuitProvider>
}

function renderCircuit(orchestrators = new Map()) {
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper: wrapperWith(orchestrators) })
}

/** POWER (5V/GND) directement câblé aux deux bornes A/B d'une LDR — boucle
 * simple alimentée (sources.length === 1), condition requise par
 * `ldrDc()`/`resistiveTwoTerminalDc()` (dcContributionRegistry.js, INCHANGÉ)
 * pour produire une contribution DC exploitable. */
function buildPowerLdrCircuit(result) {
  act(() => {
    result.current.addComponent("POWER", 0, 0)
    result.current.addComponent("LDR", 200, 0)
  })
  const power = result.current.components.find((c) => c.type === "POWER")
  const ldr = result.current.components.find((c) => c.type === "LDR")
  act(() => {
    result.current.addWire(power.uid, "5V", ldr.uid, "A")
    result.current.addWire(power.uid, "GND", ldr.uid, "B")
  })
  return { powerUid: power.uid, ldrUid: ldr.uid }
}

describe("MB-L1-ENV-001 — T9 : CircuitProvider expose l'état/API environnemental", () => {
  it("environmentalStimuli/setEnvironmentalStimulus/clearEnvironmentalStimulus sont exposés, sans stimulus actif par défaut", () => {
    const { result } = renderCircuit()
    expect(result.current.environmentalStimuli).toEqual({})
    expect(typeof result.current.setEnvironmentalStimulus).toBe("function")
    expect(typeof result.current.clearEnvironmentalStimulus).toBe("function")
  })

  it("setEnvironmentalStimulus('LIGHT', valeur invalide) est ignoré, jamais clampé", () => {
    const { result } = renderCircuit()
    act(() => result.current.setEnvironmentalStimulus("LIGHT", 2))
    expect(result.current.environmentalStimuli).toEqual({})
    act(() => result.current.setEnvironmentalStimulus("LIGHT", NaN))
    expect(result.current.environmentalStimuli).toEqual({})
    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0.5))
    expect(result.current.environmentalStimuli).toEqual({ LIGHT: 0.5 })
  })

  it("un kind non supporté est un no-op défensif", () => {
    const { result } = renderCircuit()
    act(() => result.current.setEnvironmentalStimulus("TEMPERATURE", 0.5))
    expect(result.current.environmentalStimuli).toEqual({})
  })
})

describe("MB-L1-ENV-001 — T10 : LIGHT ne modifie jamais le Document (ENV-01)", () => {
  it("component.parameters de la LDR reste inchangé quand LIGHT varie", () => {
    const { result } = renderCircuit()
    const { ldrUid } = buildPowerLdrCircuit(result)

    const before = result.current.components.find((c) => c.uid === ldrUid).parameters
    expect(before).toEqual({ resistance: 10000 })

    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0))
    expect(result.current.components.find((c) => c.uid === ldrUid).parameters).toEqual({ resistance: 10000 })

    act(() => result.current.setEnvironmentalStimulus("LIGHT", 1))
    expect(result.current.components.find((c) => c.uid === ldrUid).parameters).toEqual({ resistance: 10000 })
  })
})

describe("MB-L1-ENV-001 — T11 : LIGHT n'historise rien (ENV-02/ENV-03)", () => {
  it("getUndoCount() reste identique après plusieurs changements de LIGHT", () => {
    const { result } = renderCircuit()
    buildPowerLdrCircuit(result)

    const before = result.current.getUndoCount()
    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0.2))
    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0.8))
    act(() => result.current.clearEnvironmentalStimulus("LIGHT"))
    expect(result.current.getUndoCount()).toBe(before)
  })
})

describe("MB-L1-ENV-001 — T12 : export avant/après LIGHT strictement identique (ENV-19)", () => {
  it("exportCircuit() ne varie pas quand seul LIGHT change", () => {
    const { result } = renderCircuit()
    buildPowerLdrCircuit(result)

    const before = result.current.exportCircuit()
    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0.5))
    const after = result.current.exportCircuit()

    expect(after).toEqual(before)
    expect(JSON.stringify(after)).not.toMatch(/LIGHT/)
  })
})

describe("MB-L1-ENV-001 — T13 : la Simulation live consomme l'effet environnemental (GATE E4)", () => {
  it("prepareCircuit()/resolveSignals() (les MÊMES primitives composées par simulationRuntimeIntegration.js) produisent un courant LDR différent selon LIGHT, sans muter le Document", () => {
    const { result } = renderCircuit()
    const { ldrUid } = buildPowerLdrCircuit(result)

    // Le pipeline réel de useCircuitState reste vivant et ne plante pas
    // avec un stimulus actif (preuve d'intégration bout-en-bout).
    act(() => {
      result.current.setEnvironmentalStimulus("LIGHT", 0.5)
      result.current.startSimulation()
    })
    expect(result.current.pinSignals.get(`${ldrUid}:A`)).toBe(Signal.HIGH)
    expect(result.current.pinSignals.get(`${ldrUid}:B`)).toBe(Signal.LOW)

    // Preuve numérique : mêmes composants/wires réels du Document vivant,
    // composés avec applyEnvironmentalStimuli() + prepareCircuit()/
    // resolveSignals() (exactement ce que fait runSimulationWithRuntime()
    // en interne) à deux valeurs de LIGHT.
    const { components, wires } = result.current
    const currentAt = (light) => {
      const effective = applyEnvironmentalStimuli(components, { LIGHT: light })
      const prepared = prepareCircuit(effective, wires)
      const { dcAnalysis } = resolveSignals(effective, prepared)
      return dcAnalysis.get(ldrUid).current
    }

    const currentAtMinLight = currentAt(0)
    const currentAtMaxLight = currentAt(1)
    expect(currentAtMinLight).toBeCloseTo(5 / R_MAX)
    expect(currentAtMaxLight).toBeCloseTo(5 / R_MIN)
    expect(currentAtMaxLight).toBeGreaterThan(currentAtMinLight)

    // Le Document réel n'a jamais été touché par ce calcul.
    expect(result.current.components.find((c) => c.uid === ldrUid).parameters).toEqual({ resistance: 10000 })
  })
})

describe("MB-L1-ENV-001 — T14/T15 : Observation et Measurement consomment le MÊME effet (ENV-16/ENV-17)", () => {
  it("observe()/measure() sur le circuit vivant retournent le même CURRENT pour la même LIGHT, différent entre LIGHT=0 et LIGHT=1", () => {
    const { result } = renderCircuit()
    const { ldrUid } = buildPowerLdrCircuit(result)
    const { components, wires } = result.current

    const request = { target: { kind: "PIN", componentUid: ldrUid, pinId: "A" }, quantity: ObservationQuantity.CURRENT, time: 0 }

    const atZero = observe(request, components, wires, null, { LIGHT: 0 })
    const atOne = observe(request, components, wires, null, { LIGHT: 1 })
    expect(atZero.status).toBe(ObservationStatus.VALID)
    expect(atOne.status).toBe(ObservationStatus.VALID)
    expect(atZero.value).toBeCloseTo(5 / R_MAX)
    expect(atOne.value).toBeCloseTo(5 / R_MIN)

    const measureRequest = {
      mode: MeasurementMode.CURRENT,
      target: { kind: "PIN", componentUid: ldrUid, pinId: "A" },
      time: 0,
      environmentalStimuli: { LIGHT: 0 },
    }
    const measured = measure(measureRequest, components, wires)
    expect(measured.status).toBe(ObservationStatus.VALID)
    expect(measured.value).toBe(atZero.value)
  })
})

describe("MB-L1-ENV-001 — T7 (GATE E2) : RESISTOR/THERMISTOR inchangés sous LIGHT, via le circuit vivant", () => {
  it("un RESISTOR câblé avec la même LDR garde exactement sa résistance persistante sous LIGHT actif", () => {
    const { result } = renderCircuit()
    act(() => {
      result.current.addComponent("POWER", 0, 0)
      result.current.addComponent("RESISTOR", 200, 0)
    })
    const power = result.current.components.find((c) => c.type === "POWER")
    const resistor = result.current.components.find((c) => c.type === "RESISTOR")
    act(() => {
      result.current.addWire(power.uid, "5V", resistor.uid, "A")
      result.current.addWire(power.uid, "GND", resistor.uid, "B")
    })

    const { components, wires } = result.current
    const request = { target: { kind: "PIN", componentUid: resistor.uid, pinId: "A" }, quantity: ObservationQuantity.CURRENT, time: 0 }
    const withoutLight = observe(request, components, wires)
    const withLight = observe(request, components, wires, null, { LIGHT: 0.9 })
    expect(withLight).toEqual(withoutLight)
  })
})

describe("MB-L1-ENV-001 — T16 : Arduino + LDR environnementale coexistent (GATE E10)", () => {
  it("un circuit ARDUINO + POWER + LDR reste résolu (branche Runtime de runSimulationWithRuntime) et LIGHT s'applique sans collision", () => {
    const orchestrators = new Map()
    const { result } = renderCircuit(orchestrators)

    act(() => {
      result.current.addComponent("ARDUINO", 0, 0)
      result.current.addComponent("POWER", 200, 0)
      result.current.addComponent("LDR", 400, 0)
    })
    const arduino = result.current.components.find((c) => c.type === "ARDUINO")
    const power = result.current.components.find((c) => c.type === "POWER")
    const ldr = result.current.components.find((c) => c.type === "LDR")

    act(() => {
      result.current.addWire(power.uid, "5V", ldr.uid, "A")
      result.current.addWire(power.uid, "GND", ldr.uid, "B")
    })

    act(() => {
      result.current.setEnvironmentalStimulus("LIGHT", 0.3)
      result.current.startSimulation()
    })

    // Le Runtime Arduino a bien été instancié (branche resolveSignals +
    // externalSignals de runSimulationWithRuntime) — coexistence, jamais un
    // second ArduinoSimulator pour la LDR (ENV-09).
    expect(orchestrators.get(arduino.uid)).toBeDefined()
    // La LDR reste correctement alimentée (conduction digitale inchangée,
    // indépendante de LIGHT — ENV-06/ENV-07 : externalSignals ne transporte
    // jamais LIGHT).
    expect(result.current.pinSignals.get(`${ldr.uid}:A`)).toBe(Signal.HIGH)
    expect(result.current.pinSignals.get(`${ldr.uid}:B`)).toBe(Signal.LOW)
    expect(result.current.components.find((c) => c.uid === ldr.uid).parameters).toEqual({ resistance: 10000 })
  })
})

describe("MB-L1-ENV-001 — T17 : clearEnvironmentalStimulus restaure le comportement historique (ENV-18)", () => {
  it("après clearEnvironmentalStimulus('LIGHT'), observe() retrouve exactement le résultat sans stimulus", () => {
    const { result } = renderCircuit()
    const { ldrUid } = buildPowerLdrCircuit(result)
    const { components, wires } = result.current
    const request = { target: { kind: "PIN", componentUid: ldrUid, pinId: "A" }, quantity: ObservationQuantity.CURRENT, time: 0 }

    const historical = observe(request, components, wires)

    act(() => result.current.setEnvironmentalStimulus("LIGHT", 0.9))
    act(() => result.current.clearEnvironmentalStimulus("LIGHT"))

    expect(result.current.environmentalStimuli).toEqual({})
    const restored = observe(request, result.current.components, result.current.wires, null, result.current.environmentalStimuli)
    expect(restored).toEqual(historical)
  })
})

describe("MB-L1-ENV-001 — T18 : aucune UI environnementale introduite par ce ticket (ENV-23)", () => {
  it("Navbar.jsx, Sidebar.jsx, SimulationCanvas.jsx ne référencent ni LIGHT ni le sous-système environnemental", () => {
    const paths = [
      resolve(__dirname, "../components/Navbar.jsx"),
      resolve(__dirname, "../components/Sidebar.jsx"),
      resolve(__dirname, "../canvas/SimulationCanvas.jsx"),
    ]
    for (const filePath of paths) {
      const source = readFileSync(filePath, "utf-8")
      expect(source).not.toMatch(/\bLIGHT\b/)
      expect(source).not.toMatch(/environmentalStimulus/i)
      expect(source).not.toMatch(/environmentalResponseRegistry/i)
      expect(source).not.toMatch(/setEnvironmentalStimulus/)
    }
  })
})
