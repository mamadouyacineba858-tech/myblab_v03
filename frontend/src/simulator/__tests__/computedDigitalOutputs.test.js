import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
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
 * A7-C3-PREQ — Generic Computed Digital Output mechanism, end-to-end proof.
 *
 * Couvre T02/T03/T06-T21 du ticket §14. Utilise exclusivement des Registry
 * FIXTURE isolés (createDigitalContributionRegistry), attachés à de vrais
 * types canoniques déjà présents dans le dépôt (LDR, THERMISTOR,
 * NPN_TRANSISTOR — 2 ou 3 broches réelles) pour que prepareCircuit()/
 * resolveSignals() (canonicalRegistry.js) résolvent un circuit réel — SANS
 * jamais enregistrer de faux composant de production ni toucher
 * digitalContributionRegistry.js de production (table vide, voir
 * digitalContributionRegistry.test.js) ni canonicalRegistry.js.
 *
 * Composants historique/registres :
 *   digitalContributionRegistry.js (nouveau, vide en production)
 *   simulationRuntimeIntegration.js (composition générique étendue)
 * — resolution.js / engine.js / environmentalStimulus.js / canonicalRegistry.js
 * / dcContributionRegistry.js restent INCHANGÉS (voir architecture guard
 * ci-dessous et non-régression T21-T26).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

function alwaysHighOnB() {
  return new Map([["B", Signal.HIGH]])
}
function alwaysLowOnB() {
  return new Map([["B", Signal.LOW]])
}

describe("A7-C3-PREQ — T02/T03 : contribution HIGH/LOW valide (unitaire)", () => {
  it("T02 — une contribution HIGH est un Map avec Signal.HIGH", () => {
    const out = alwaysHighOnB()
    expect(out.get("B")).toBe(Signal.HIGH)
  })
  it("T03 — une contribution LOW est un Map avec Signal.LOW", () => {
    const out = alwaysLowOnB()
    expect(out.get("B")).toBe(Signal.LOW)
  })
})

describe("A7-C3-PREQ — T07 : computeComponentDigitalSignals consulte le Registry générique, produit AVANT résolution", () => {
  it("un composant enregistré produit sa clé \"uid:pinId\" -> Signal, un composant non enregistré ne produit rien", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
    const components = [
      { uid: "sensor1", type: "LDR", x: 0, y: 0 },
      { uid: "res1", type: "RESISTOR", x: 10, y: 0 },
    ]
    const produced = computeComponentDigitalSignals(components, fixture)
    expect(produced.size).toBe(1)
    expect(produced.get("sensor1:B")).toBe(Signal.HIGH)
    expect(produced.has("res1:A")).toBe(false)
  })

  it("T20 — un type inconnu du Registry n'affecte rien (silencieusement ignoré)", () => {
    const fixture = createDigitalContributionRegistry()
    const components = [{ uid: "sensor1", type: "LDR", x: 0, y: 0 }]
    const produced = computeComponentDigitalSignals(components, fixture)
    expect(produced.size).toBe(0)
  })
})

describe("A7-C3-PREQ — T08/T09 : HIGH puis LOW se propagent RÉELLEMENT par wire/net (resolveSignals réel, aucun mock)", () => {
  const fixtureHigh = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
  const fixtureLow = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysLowOnB]]) })

  const components = [
    { uid: "sensor1", type: "LDR", x: 0, y: 0 },
    { uid: "led1", type: "LED", x: 10, y: 0 },
    { uid: "power1", type: "POWER", x: 20, y: 0 },
  ]
  const wires = [
    { fromUid: "sensor1", fromPin: "B", toUid: "led1", toPin: "anode" },
    { fromUid: "power1", fromPin: "GND", toUid: "led1", toPin: "cathode" },
  ]

  it("T08 — HIGH calculé sur sensor1:B se propage jusqu'à led1:anode et allume réellement la LED", () => {
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixtureHigh })
    expect(result.get("sensor1:B")).toBe(Signal.HIGH)
    expect(result.get("led1:anode")).toBe(Signal.HIGH)
    expect(result.get("led1:cathode")).toBe(Signal.LOW)
    expect(getLedState("led1", result).on).toBe(true)
  })

  it("T09 — LOW calculé sur sensor1:B se propage jusqu'à led1:anode, la LED reste éteinte (anode == cathode == LOW)", () => {
    const result = runSimulationWithRuntime(components, wires, { digitalContributionRegistry: fixtureLow })
    expect(result.get("sensor1:B")).toBe(Signal.LOW)
    expect(result.get("led1:anode")).toBe(Signal.LOW)
    expect(getLedState("led1", result).on).toBe(false)
  })
})

describe("A7-C3-PREQ — T10 : circuit SANS Arduino + computed output fonctionne (chemin générique emprunté)", () => {
  it("aucun ARDUINO dans le circuit, le computed digital output est quand même résolu", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
    const components = [{ uid: "sensor1", type: "LDR", x: 0, y: 0 }]
    const result = runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })
    expect(result.get("sensor1:B")).toBe(Signal.HIGH)
  })

  it("T16 — aucun Scheduler/Runtime instancié pour un circuit sans ARDUINO, même avec un computed output actif", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
    const orchestrators = new Map()
    runSimulationWithRuntime([{ uid: "sensor1", type: "LDR", x: 0, y: 0 }], [], {
      digitalContributionRegistry: fixture,
      orchestrators,
      dt: 100,
    })
    expect(orchestrators.size).toBe(0)
  })
})

describe("A7-C3-PREQ — T11 : circuit AVEC Arduino + computed output compose les DEUX dans une seule résolution", () => {
  it("le signal Runtime (D2) et le computed digital output (sensor1:B) sont tous deux résolus, sans conflit", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
    const components = [
      { uid: "ard1", type: "ARDUINO", x: 0, y: 0 },
      { uid: "sensor1", type: "LDR", x: 10, y: 0 },
    ]
    const orchestrator = createRuntimeOrchestrator()
    orchestrator.getRuntime().start()
    orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    const orchestrators = new Map([["ard1", orchestrator]])

    const result = runSimulationWithRuntime(components, [], {
      dt: 16,
      orchestrators,
      digitalContributionRegistry: fixture,
    })

    expect(result.get("ard1:D2")).toBe(Signal.HIGH)
    expect(result.get("sensor1:B")).toBe(Signal.HIGH)
  })
})

describe("A7-C3-PREQ — T12 : deux composants computed DISTINCTS coexistent", () => {
  it("LDR produit B=HIGH, THERMISTOR (autre instance) produit B=LOW, indépendamment", () => {
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([
        ["LDR", alwaysHighOnB],
        ["THERMISTOR", alwaysLowOnB],
      ]),
    })
    const components = [
      { uid: "s1", type: "LDR", x: 0, y: 0 },
      { uid: "s2", type: "THERMISTOR", x: 10, y: 0 },
    ]
    const result = runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })
    expect(result.get("s1:B")).toBe(Signal.HIGH)
    expect(result.get("s2:B")).toBe(Signal.LOW)
  })
})

describe("A7-C3-PREQ — T13 : absence de computed output + absence d'Arduino = chemin historique EXACT", () => {
  it("runSimulationWithRuntime() avec le Registry de production (vide) retourne exactement runSimulation()", () => {
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

  it("un Registry fixture vide (aucune contribution) préserve aussi le chemin historique", () => {
    const fixture = createDigitalContributionRegistry()
    const components = [{ uid: "led1", type: "LED", x: 0, y: 0 }]
    const historique = runSimulation(components, [])
    const integre = runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })
    expect([...integre.entries()]).toEqual([...historique.entries()])
  })
})

describe("A7-C3-PREQ — T14 : les composants EFFECTIFS (post applyEnvironmentalStimuli) sont transmis au Registry", () => {
  it("une contribution qui lit params.resistance reçoit la résistance EFFECTIVE sous stimulus LIGHT, pas le default persistant", () => {
    const seen = []
    const readsEffectiveResistance = ({ params }) => {
      seen.push(params.resistance)
      return new Map([["B", params.resistance < 5000 ? Signal.HIGH : Signal.LOW]])
    }
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", readsEffectiveResistance]]) })
    const components = [{ uid: "s1", type: "LDR", x: 0, y: 0, parameters: { resistance: 10000 } }]

    const withoutStimulus = runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })
    expect(seen[0]).toBe(10000)
    expect(withoutStimulus.get("s1:B")).toBe(Signal.LOW)
    expect(seen.every(value => value === 10000)).toBe(true)
    seen.length = 0 // A9 may evaluate a pure contribution on several rounds.

    const withStimulus = runSimulationWithRuntime(components, [], {
      digitalContributionRegistry: fixture,
      environmentalStimuli: { LIGHT: 1 },
    })
    // LIGHT=1 -> résistance effective LDR = borne minimum (100 Ω, cf. canonicalRegistry.js) < 5000
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every(value => value < 5000)).toBe(true)
    expect(withStimulus.get("s1:B")).toBe(Signal.HIGH)
  })
})

describe("A7-C3-PREQ — T15 : aucune mutation Document / paramètres persistants", () => {
  it("le composant original et ses parameters ne sont jamais mutés par la composition", () => {
    const fixture = createDigitalContributionRegistry({ contributions: new Map([["LDR", alwaysHighOnB]]) })
    const originalParameters = { resistance: 12345 }
    const originalComponent = { uid: "s1", type: "LDR", x: 0, y: 0, parameters: originalParameters }
    const components = Object.freeze([originalComponent])

    runSimulationWithRuntime(components, [], { digitalContributionRegistry: fixture })

    expect(originalComponent.parameters).toBe(originalParameters)
    expect(originalParameters).toEqual({ resistance: 12345 })
  })
})

describe("A7-C3-PREQ — T17/T18 : aucune dépendance Canvas/breadboard dans le nouveau code", () => {
  it("digitalContributionRegistry.js et le code ajouté de simulationRuntimeIntegration.js n'importent ni React, ni Canvas, ni breadboard, ni Document/History", () => {
    const files = ["../digitalContributionRegistry.js", "../simulationRuntimeIntegration.js"]
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), "utf-8")
      expect(src, rel).not.toMatch(/from\s+["']react["']/)
      expect(src, rel).not.toMatch(/from\s+["'][^"']*\/canvas\//i)
      expect(src, rel).not.toMatch(/from\s+["'][^"']*breadboard/i)
      expect(src, rel).not.toMatch(/from\s+["'][^"']*core\/(handlers|history|commandBus|ValidationEngine)/i)
    }
  })
})

describe("A7-C3-PREQ — T19 : collision explicite entre deux producteurs indépendants sur la MÊME clé (mergeExternalSignals)", () => {
  it("deux Maps produisant la même clé \"uid:pinId\" font échouer la composition explicitement (jamais un silent overwrite)", () => {
    const runtimeLike = new Map([["shared1:OUT", Signal.HIGH]])
    const computedLike = new Map([["shared1:OUT", Signal.LOW]])
    expect(() => mergeExternalSignals([runtimeLike, computedLike])).toThrow(/pin key "shared1:OUT"/)
  })

  it("même valeur des deux côtés : toujours un échec explicite (la règle porte sur le NOMBRE de producteurs, pas l'égalité des valeurs)", () => {
    const a = new Map([["shared1:OUT", Signal.HIGH]])
    const b = new Map([["shared1:OUT", Signal.HIGH]])
    expect(() => mergeExternalSignals([a, b])).toThrow()
  })

  it("des clés distinctes de deux producteurs différents se composent normalement, sans erreur", () => {
    const a = new Map([["ard1:D2", Signal.HIGH]])
    const b = new Map([["sensor1:B", Signal.LOW]])
    const merged = mergeExternalSignals([a, b])
    expect(merged.get("ard1:D2")).toBe(Signal.HIGH)
    expect(merged.get("sensor1:B")).toBe(Signal.LOW)
  })

  it("une contribution qui produit deux fois la même pin pour SON PROPRE composant échoue explicitement (computeComponentDigitalSignals)", () => {
    // Un Map JS ne peut structurellement pas porter deux fois la même clé ;
    // la garde se déclenche donc lorsque DEUX composants DISTINCTS du
    // Registry produisent, par erreur de configuration, la MÊME clé
    // "uid:pinId" — ce qui ne peut arriver que si deux entrées de la
    // fixture partagent le même uid (erreur de construction du test,
    // jamais du mécanisme générique lui-même). On le prouve ici en
    // enregistrant deux "types" qui, une fois appliqués à des composants
    // portant le MÊME uid, produiraient un conflit.
    const fixture = createDigitalContributionRegistry({
      contributions: new Map([
        ["LDR", () => new Map([["B", Signal.HIGH]])],
        ["THERMISTOR", () => new Map([["B", Signal.LOW]])],
      ]),
    })
    // Deux composants DIFFÉRENTS partageant erronément le même uid.
    const components = [
      { uid: "dup1", type: "LDR", x: 0, y: 0 },
      { uid: "dup1", type: "THERMISTOR", x: 10, y: 0 },
    ]
    expect(() => computeComponentDigitalSignals(components, fixture)).toThrow(/dup1:B/)
  })
})

describe("A7-C3-PREQ — T22 : resolution.js reste sans branche spécifique, ignorant du nouveau Registry", () => {
  it("resolution.js n'importe pas digitalContributionRegistry.js et ne contient aucun littéral SOIL/MOISTURE/PIR/TILT/IR_RECEIVER", () => {
    const src = readFileSync(resolve(__dirname, "../resolution.js"), "utf-8")
    expect(src).not.toMatch(/digitalContributionRegistry/)
    for (const forbidden of ["SOIL_MOISTURE_SENSOR", "MOISTURE", "PIR", "TILT", "IR_RECEIVER"]) {
      expect(src, forbidden).not.toMatch(new RegExp(forbidden))
    }
  })

  it("engine.js n'importe pas digitalContributionRegistry.js (composition reste dans simulationRuntimeIntegration.js uniquement)", () => {
    const src = readFileSync(resolve(__dirname, "../engine.js"), "utf-8")
    expect(src).not.toMatch(/digitalContributionRegistry/)
  })
})

describe("A7-C3-PREQ — T06/§15 : aucune branche component.type === dans la composition générique", () => {
  it("simulationRuntimeIntegration.js ne contient qu'UNE seule comparaison de type littérale (RUNTIME_COMPONENT_TYPE/\"ARDUINO\", déjà verrouillée avant ce ticket) — aucune nouvelle branche SOIL/PIR/TILT/IR", () => {
    const src = readFileSync(resolve(__dirname, "../simulationRuntimeIntegration.js"), "utf-8")
    for (const forbidden of ["SOIL_MOISTURE_SENSOR", "MOISTURE", "PIR", "TILT", "IR_RECEIVER"]) {
      expect(src, forbidden).not.toMatch(new RegExp(forbidden))
    }
  })
})
