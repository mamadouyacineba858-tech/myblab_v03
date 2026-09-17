import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { resolveSourceDrivenPinSignals } from "../resolution.js"
import { prepareCircuit } from "../preparation.js"
import {
  runSimulationWithRuntime,
  computeComponentDigitalSignals,
  mergeExternalSignals,
} from "../simulationRuntimeIntegration.js"
import { runSimulation, getLedState } from "../engine.js"
import { createDigitalContributionRegistry } from "../digitalContributionRegistry.js"
import { createRuntimeOrchestrator } from "../runtimeOrchestrator.js"
import { Signal } from "../signals.js"

/**
 * A7-C3-PREQ2 — Generic pre-resolution powered-state context, end-to-end
 * proof (ticket §9, P01-P22).
 *
 * Reuses a real, already-canonical 3-pin powered type (TMP36 : plus/vout/
 * gnd — power/output/ground, canonicalRegistry.js) as the generic "powered
 * sensor" shape for these tests, exactly like computedDigitalOutputs.test.js
 * reused LDR/THERMISTOR/NPN_TRANSISTOR — never a fake production type, never
 * SOIL_MOISTURE_SENSOR/PIR/TILT/IR_RECEIVER (§10/§13 du ticket). All
 * contributions are registered on isolated fixture Registries
 * (createDigitalContributionRegistry), never on the production Registry
 * (table vide, digitalContributionRegistry.test.js).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

/** A contribution that only produces once its OWN component is correctly powered (VCC=HIGH, GND=LOW). */
function requirePoweredThenHigh({ pinSignals }) {
  if (pinSignals.plus !== Signal.HIGH || pinSignals.gnd !== Signal.LOW) return null
  return new Map([["vout", Signal.HIGH]])
}
function requirePoweredThenLow({ pinSignals }) {
  if (pinSignals.plus !== Signal.HIGH || pinSignals.gnd !== Signal.LOW) return null
  return new Map([["vout", Signal.LOW]])
}

describe("A7-C3-PREQ2 — P01/P02 : une pin de source résout HIGH/LOW en pré-résolution", () => {
  it("P01 — la borne positive d'une source (POWER 5V) résout HIGH avant toute propagation", () => {
    const components = [{ uid: "power1", type: "POWER", x: 0, y: 0 }]
    const prepared = prepareCircuit(components, [])
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("power1:5V")).toBe(Signal.HIGH)
  })
  it("P02 — la borne négative d'une source (POWER GND) résout LOW avant toute propagation", () => {
    const components = [{ uid: "power1", type: "POWER", x: 0, y: 0 }]
    const prepared = prepareCircuit(components, [])
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("power1:GND")).toBe(Signal.LOW)
  })
})

describe("A7-C3-PREQ2 — P03/P04 : une pin câblée hérite de l'état de la source via le net physique", () => {
  const components = [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
  ]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
    { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
  ]
  it("P03 — VCC câblé (TMP36.plus) voit HIGH", () => {
    const prepared = prepareCircuit(components, wires)
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("sensor1:plus")).toBe(Signal.HIGH)
  })
  it("P04 — GND câblé (TMP36.gnd) voit LOW", () => {
    const prepared = prepareCircuit(components, wires)
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("sensor1:gnd")).toBe(Signal.LOW)
  })
})

describe("A7-C3-PREQ2 — P05/P06 : une pin non câblée reste UNKNOWN", () => {
  const components = [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
  ]
  it("P05 — VCC non câblé reste UNKNOWN", () => {
    const prepared = prepareCircuit(components, [])
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("sensor1:plus")).toBe(Signal.UNKNOWN)
  })
  it("P06 — GND non câblé reste UNKNOWN", () => {
    const prepared = prepareCircuit(components, [])
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("sensor1:gnd")).toBe(Signal.UNKNOWN)
  })
})

describe("A7-C3-PREQ2 — P07/P08/P14 : un composant mal alimenté (polarité inversée) expose l'état réel, un contributeur peut le refuser", () => {
  const components = [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
  ]
  const reversedWires = [
    { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "gnd" },
    { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "plus" },
  ]
  it("P07 — câblage inversé : plus=LOW, gnd=HIGH (mauvaise polarité, aucun conflit)", () => {
    const prepared = prepareCircuit(components, reversedWires)
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("sensor1:plus")).toBe(Signal.LOW)
    expect(result.get("sensor1:gnd")).toBe(Signal.HIGH)
  })
  it("P08/P14 — un contributeur consultant pinSignals refuse (null) un composant mal alimenté", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const result = runSimulationWithRuntime(components, reversedWires, { digitalContributionRegistry: fixture })
    expect(result.get("sensor1:vout")).toBe(Signal.UNKNOWN)
  })
})

describe("A7-C3-PREQ2 — P09 : un conflit HIGH/LOW sur un même net n'expose jamais un état alimenté", () => {
  it("deux sources opposées pontées sur le même net résolvent TOUTES les pins à UNKNOWN, y compris celles du capteur", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "power2", type: "POWER", x: 10, y: 0 },
      { uid: "sensor1", type: "TMP36", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "power2", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
    ]
    const prepared = prepareCircuit(components, wires)
    const result = resolveSourceDrivenPinSignals(components, prepared)
    expect(result.get("power1:5V")).toBe(Signal.UNKNOWN)
    expect(result.get("power2:GND")).toBe(Signal.UNKNOWN)
    expect(result.get("sensor1:plus")).toBe(Signal.UNKNOWN)
  })
})

describe("A7-C3-PREQ2 — P10 : un contributeur calculé reçoit son PROPRE pinSignals pré-résolu", () => {
  it("le pinSignals transmis correspond exactement à l'état source-driven des pins plus/vout/gnd de CE composant", () => {
    const seen = []
    const capture = (ctx) => { seen.push(ctx.pinSignals); return null }
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", capture]]) })
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
      { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
    ]
    const prepared = prepareCircuit(components, wires)
    const sourceDrivenSignals = resolveSourceDrivenPinSignals(components, prepared)
    computeComponentDigitalSignals(components, fixture, sourceDrivenSignals)
    expect(seen[0]).toEqual({ plus: Signal.HIGH, vout: Signal.UNKNOWN, gnd: Signal.LOW })
  })
})

describe("A7-C3-PREQ2 — P11/P12 : un contributeur correctement alimenté peut émettre DO=HIGH ou DO=LOW", () => {
  const components = [
    { uid: "power1", type: "POWER", x: 0, y: 0 },
    { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
  ]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
    { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
  ]
  it("P11 — DO=HIGH", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixture })
    expect(result.get("sensor1:vout")).toBe(Signal.HIGH)
  })
  it("P12 — DO=LOW", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenLow]]) })
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixture })
    expect(result.get("sensor1:vout")).toBe(Signal.LOW)
  })
})

describe("A7-C3-PREQ2 — P13 : un contributeur non alimenté retourne null (aucune sortie produite)", () => {
  it("un TMP36 flottant (aucun fil) ne produit jamais vout", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const components = [{ uid: "sensor1", type: "TMP36", x: 0, y: 0 }]
    const result = runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })
    expect(result.get("sensor1:vout")).toBe(Signal.UNKNOWN)
  })
})

describe("A7-C3-PREQ2 — P15 : une DO produite participe RÉELLEMENT à la propagation de resolveSignals (jamais injectée après coup)", () => {
  it("sensor1:vout=HIGH se propage par fil jusqu'à led1:anode et allume réellement la LED", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
      { uid: "led1", type: "LED", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
      { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
      { fromUid: "sensor1", fromPin: "vout", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixture })
    expect(result.get("led1:anode")).toBe(Signal.HIGH)
    expect(result.get("led1:cathode")).toBe(Signal.LOW)
    expect(getLedState("led1", result).on).toBe(true)
  })
})

describe("A7-C3-PREQ2 — P16/P17 : aucun ARDUINO requis, aucun Scheduler instancié pour un circuit computed-output-only", () => {
  it("résout la sortie numérique alimentée avec zéro ARDUINO et zéro orchestrator créé", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "sensor1", type: "TMP36", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
      { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
    ]
    const orchestrators = new Map()
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixture, orchestrators, dt: 100 })
    expect(result.get("sensor1:vout")).toBe(Signal.HIGH)
    expect(orchestrators.size).toBe(0)
  })
})

describe("A7-C3-PREQ2 — P18 : Runtime (ARDUINO) et sortie numérique calculée alimentée composent dans UNE seule résolution", () => {
  it("ard1:D2 (Runtime) et sensor1:vout (computed, alimenté) résolvent tous deux, sans conflit", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["TMP36", requirePoweredThenHigh]]) })
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "power1", type: "POWER", x: 10, y: 0 },
      { uid: "sensor1", type: "TMP36", x: 20, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "sensor1", toPin: "plus" },
      { fromUid: "power1", fromPin: "GND", toUid: "sensor1", toPin: "gnd" },
    ]
    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    const orchestrators = new Map([["ard1", orchestrator]])

    const result = runSimulationWithRuntime(components, wires, {
      dt: 16,
      orchestrators,
      digitalContributionRegistry: fixture,
    })

    expect(result.get("ard1:D2")).toBe(Signal.HIGH)
    expect(result.get("sensor1:vout")).toBe(Signal.HIGH)
  })
})

describe("A7-C3-PREQ2 — P19 : la politique de collision entre producteurs indépendants est inchangée", () => {
  it("un signal Runtime et une sortie numérique calculée en collision sur la même clé échouent toujours explicitement", () => {
    const runtimeLike = new Map([["shared1:OUT", Signal.HIGH]])
    const computedLike = new Map([["shared1:OUT", Signal.LOW]])
    expect(() => mergeExternalSignals([runtimeLike, computedLike])).toThrow(/shared1:OUT/)
  })
})

describe("A7-C3-PREQ2 — P20 : UNE SEULE passe fonctionnelle resolveSignals()", () => {
  function stripComments(src) {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "")
  }

  it("simulationRuntimeIntegration.js appelle resolveSignals(...) exactement une fois (hors commentaires/JSDoc)", () => {
    const src = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8")
    const code = stripComments(src)
    const matches = code.match(/\bresolveSignals\(/g) ?? []
    expect(matches.length).toBe(1)
  })

  it("resolveSourceDrivenPinSignals() (resolution.js) n'appelle jamais resolveSignals() elle-même", () => {
    const src = readFileSync(resolve(__dirname, "../resolution.js"), "utf-8")
    const fnBodyMatch = src.match(/export function resolveSourceDrivenPinSignals\([^)]*\)\s*{([\s\S]*?)\n}/)
    expect(fnBodyMatch).not.toBeNull()
    expect(fnBodyMatch[1]).not.toMatch(/resolveSignals\(/)
  })
})

describe("A7-C3-PREQ2 — P21/P22 : chemin historique (sans Runtime, sans contributeur) strictement inchangé", () => {
  it("un circuit sans ARDUINO et sans contributeur enregistré retourne exactement runSimulation()", () => {
    const components = [
      { uid: "power1", type: "POWER", x: 0, y: 0 },
      { uid: "led1", type: "LED", x: 10, y: 0 },
    ]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
      { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
    ]
    const historique = runSimulation(components, wires)
    const integre = runSimulationWithRuntime(components, wires)
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })
})

describe("A7-C3-PREQ2 — §10 : aucune connaissance de capteur environnemental spécifique dans le nouveau code", () => {
  it("resolution.js et simulationRuntimeIntegration.js ne contiennent aucun littéral SOIL_MOISTURE_SENSOR/PIR/TILT/IR_RECEIVER/MOISTURE", () => {
    for (const rel of ["../resolution.js", "../simulationRuntimeIntegration.js"]) {
      const src = readFileSync(resolve(__dirname, rel), "utf-8")
      for (const forbidden of ["SOIL_MOISTURE_SENSOR", "PIR", "TILT", "IR_RECEIVER", "MOISTURE"]) {
        expect(src, `${rel}: ${forbidden}`).not.toMatch(new RegExp(forbidden))
      }
    }
  })
})
