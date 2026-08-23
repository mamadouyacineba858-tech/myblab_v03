import { describe, it, expect } from "vitest"
import { observe, ObservationStatus } from "../observationContract.js"
import { Signal } from "../../simulator/signals.js"
import { getSimulationDefaultParameters } from "../../simulator/simulationRegistry.js"

/**
 * MB-OBS-001 — Tests comportementaux de l'Observation Contract.
 *
 * Couvre au minimum les 10 scénarios exigés par le ticket (§L "Behaviour")
 * et son blueprint (§15 "Behaviour"), plus les cas limites documentés dans
 * observationContract.js (uniformité de net, courant par-pin ambigu pour
 * les composants à 3 bornes) :
 *
 *   1. observation logique valide (PIN)                         -> décrite ci-dessous
 *   2. observation de tension valide sur un PIN supporté         -> décrite ci-dessous
 *   3. observation de courant valide quand le modèle la fournit  -> décrite ci-dessous
 *   4. grandeur non supportée                                    -> décrite ci-dessous
 *   5. cible non supportée                                       -> décrite ci-dessous
 *   6. résultat physique indisponible                            -> décrite ci-dessous
 *   7. cible malformée/inconnue                                  -> décrite ci-dessous
 *   8. unit/status/reason explicites                             -> décrite ci-dessous
 *   9. observation répétée déterministe au même temps simulation -> décrite ci-dessous
 *  10. préservation de la convention de signe du courant existant -> décrite ci-dessous
 *
 * Aucun passage par React, par le Bridge, ou par le Document Core : appel
 * direct de `observe()` avec des tableaux `components`/`wires` bruts,
 * exactement comme les tests de resolution.js (précédent établi).
 */

function poweredResistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
  const components = [power, resistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
    { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, resistor }
}

function poweredLedCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const led = { uid: "led1", type: "LED", x: 10, y: 0 }
  const components = [power, led]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "led1", toPin: "anode" },
    { fromUid: "led1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, led }
}

function poweredTransistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 }
  const components = [power, transistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" },
    { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
    { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
  ]
  return { components, wires, power, transistor }
}

function reverseBiasedDiodeCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const diode = { uid: "d1", type: "DIODE", x: 10, y: 0 }
  const components = [power, diode]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "d1", toPin: "cathode" },
    { fromUid: "d1", fromPin: "anode", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, diode }
}

function forwardBiasedDiodeCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const diode = { uid: "d1", type: "DIODE", x: 10, y: 0 }
  const components = [power, diode]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "d1", toPin: "anode" },
    { fromUid: "d1", fromPin: "cathode", toUid: "power1", toPin: "GND" },
  ]
  return { components, wires, power, diode }
}

// Circuit produisant un net non uniforme : ARDUINO:D2 est câblé à LED:anode,
// ni l'un ni l'autre n'est alimenté par POWER. Le repli ARDUINO -> FLOATING
// (resolution.js) n'écrit que le pin ARDUINO:D2 lui-même, sans repropager au
// reste du net (voir observationContract.js, observeNetLogicalState) :
// arduino1:D2 devient FLOATING tandis que led1:anode reste UNKNOWN, alors
// que les deux pins appartiennent au même net.
function divergentNetCircuit() {
  const arduino = { uid: "arduino1", type: "ARDUINO", x: 0, y: 0 }
  const led = { uid: "led1", type: "LED", x: 10, y: 0 }
  const components = [arduino, led]
  const wires = [{ fromUid: "arduino1", fromPin: "D2", toUid: "led1", toPin: "anode" }]
  return { components, wires, arduino, led }
}

describe("MB-OBS-001 - observe() : LOGICAL_STATE (PIN)", () => {
  it("1. observation logique valide sur un PIN connu (POWER:5V) -> VALID, HIGH", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "power1", pinId: "5V" }, quantity: "LOGICAL_STATE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBe(Signal.HIGH)
    expect(result.unit).toBe("LOGIC")
    expect(result.time).toBe(0)
    expect(result.reason).toBeUndefined()
  })

  it("un PIN non connecté (UNKNOWN) reste VALID : UNKNOWN est une valeur logique légitime, pas une absence de résultat", () => {
    const led = { uid: "led_isolated", type: "LED", x: 0, y: 0 }
    const result = observe(
      { target: { kind: "PIN", componentUid: "led_isolated", pinId: "anode" }, quantity: "LOGICAL_STATE", time: 0 },
      [led],
      []
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBe(Signal.UNKNOWN)
  })
})

describe("MB-OBS-001 - observe() : VOLTAGE (PIN)", () => {
  it("2. observation de tension valide sur une RESISTOR alimentée -> VALID, unit V, valeur = tension POWER", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.unit).toBe("V")
  })

  it("6. résultat physique indisponible : LED (type non couvert par dcContributionRegistry) -> UNAVAILABLE, jamais approximé", () => {
    const { components, wires } = poweredLedCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "led1", pinId: "anode" }, quantity: "VOLTAGE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
    expect(result.value).toBeNull()
    expect(typeof result.reason).toBe("string")
    expect(result.reason.length).toBeGreaterThan(0)
  })
})

describe("MB-OBS-001 - observe() : CURRENT (PIN)", () => {
  it("3. observation de courant valide quand le modèle la fournit (RESISTOR, 2 bornes) -> VALID, I = U/R", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "B" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    const expectedCurrent =
      getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("RESISTOR").resistance
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBeCloseTo(expectedCurrent, 10)
    expect(result.unit).toBe("A")
  })

  it("10a. préservation de la convention de courant existante : diode polarisée en inverse -> courant nul, jamais négatif", () => {
    const { components, wires } = reverseBiasedDiodeCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "d1", pinId: "anode" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBe(0)
    expect(result.value).toBeGreaterThanOrEqual(0)
  })

  it("10b. préservation de la convention de courant existante : diode polarisée en direct -> même magnitude non signée que dcAnalysis, sans transformation", () => {
    const { components, wires } = forwardBiasedDiodeCircuit()
    const { forwardVoltage, onResistance } = getSimulationDefaultParameters("DIODE")
    const voltage = getSimulationDefaultParameters("POWER").voltage
    const expectedCurrent = (voltage - forwardVoltage) / onResistance

    const result = observe(
      { target: { kind: "PIN", componentUid: "d1", pinId: "cathode" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBeCloseTo(expectedCurrent, 10)
    expect(result.value).toBeGreaterThanOrEqual(0)
  })

  it("courant PIN pour un composant à 3 bornes (NPN_TRANSISTOR) -> UNAVAILABLE : aucun courant par-pin non ambigu en V1", () => {
    const { components, wires } = poweredTransistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "t1", pinId: "collector" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
    expect(result.value).toBeNull()
    expect(result.reason).toMatch(/multi-terminal/)
  })
})

describe("MB-OBS-001 - observe() : NET", () => {
  it("net uniforme (POWER:5V -- RESISTOR:A) LOGICAL_STATE -> VALID, HIGH", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "NET", componentUid: "r1", pinId: "A" }, quantity: "LOGICAL_STATE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.VALID)
    expect(result.value).toBe(Signal.HIGH)
  })

  it("net non uniforme (repli ARDUINO -> FLOATING localisé à un seul pin du net) LOGICAL_STATE -> UNAVAILABLE, jamais une valeur choisie arbitrairement", () => {
    const { components, wires } = divergentNetCircuit()
    const result = observe(
      { target: { kind: "NET", componentUid: "arduino1", pinId: "D2" }, quantity: "LOGICAL_STATE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
    expect(result.value).toBeNull()
    expect(typeof result.reason).toBe("string")
  })

  it("NET + VOLTAGE -> UNAVAILABLE : granularité non supportée en V1 (dcAnalysis est indexée par composant, jamais par net)", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "NET", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
  })

  it("NET + CURRENT -> UNAVAILABLE : granularité non supportée en V1", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "NET", componentUid: "r1", pinId: "A" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
  })
})

describe("MB-OBS-001 - observe() : requêtes invalides", () => {
  it("4. grandeur non supportée -> INVALID, avec reason explicite", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "POWER", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
    expect(result.reason).toMatch(/unsupported quantity/)
  })

  it("5. cible non supportée (target.kind hors PIN/NET) -> INVALID, avec reason explicite", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "COMPONENT", componentUid: "r1", pinId: "A" }, quantity: "VOLTAGE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
    expect(result.reason).toMatch(/unsupported target kind/)
  })

  it("7a. cible inconnue (pin inexistant sur un composant réel) -> INVALID", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "Z" }, quantity: "LOGICAL_STATE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
    expect(result.reason).toMatch(/unknown target/)
  })

  it("7b. cible inconnue (composant inexistant) -> INVALID", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "ghost", pinId: "A" }, quantity: "LOGICAL_STATE", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
  })

  it("7c. requête malformée (target manquant) -> INVALID sans lever d'exception", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe({ quantity: "LOGICAL_STATE", time: 0 }, components, wires)
    expect(result.status).toBe(ObservationStatus.INVALID)
    expect(result.reason).toMatch(/malformed observation request/)
  })

  it("7d. requête malformée (time non numérique) -> INVALID sans lever d'exception", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "LOGICAL_STATE", time: "now" },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
  })

  it("7e. requête totalement absente (null) -> INVALID sans lever d'exception", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(null, components, wires)
    expect(result.status).toBe(ObservationStatus.INVALID)
  })

  it("contexte de circuit malformé (components non-array) -> INVALID sans lever d'exception", () => {
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "LOGICAL_STATE", time: 0 },
      null,
      []
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
  })
})

describe("MB-OBS-001 - observe() : forme du résultat (unit/status/reason explicites)", () => {
  it("8a. un résultat VALID porte target/quantity/value/unit/time/status et ne porte jamais reason", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "power1", pinId: "5V" }, quantity: "LOGICAL_STATE", time: 42 },
      components,
      wires
    )
    expect(result).toMatchObject({
      target: { kind: "PIN", componentUid: "power1", pinId: "5V" },
      quantity: "LOGICAL_STATE",
      status: ObservationStatus.VALID,
      time: 42,
    })
    expect(Object.prototype.hasOwnProperty.call(result, "reason")).toBe(false)
  })

  it("8b. un résultat UNAVAILABLE porte toujours une reason non vide", () => {
    const { components, wires } = poweredLedCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "led1", pinId: "anode" }, quantity: "CURRENT", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.UNAVAILABLE)
    expect(typeof result.reason).toBe("string")
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it("8c. un résultat INVALID porte toujours une reason non vide", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "BOGUS", time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(ObservationStatus.INVALID)
    expect(typeof result.reason).toBe("string")
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it("le time de la requête est restitué tel quel dans le résultat, jamais recalculé ni sourcé ailleurs", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = observe(
      { target: { kind: "PIN", componentUid: "power1", pinId: "5V" }, quantity: "LOGICAL_STATE", time: 12345 },
      components,
      wires
    )
    expect(result.time).toBe(12345)
  })
})

describe("MB-OBS-001 - observe() : déterminisme (AC-07)", () => {
  it("9. deux observations identiques (même état, même quantité, même temps) produisent un résultat sémantiquement identique", () => {
    const { components, wires } = poweredResistorCircuit()
    const request = { target: { kind: "PIN", componentUid: "r1", pinId: "A" }, quantity: "CURRENT", time: 7 }
    const first = observe(request, components, wires)
    const second = observe(request, components, wires)
    expect(second).toEqual(first)
  })
})

describe("MB-OBS-001 - observe() : intégrité du Document / non-mutation (AC-09)", () => {
  it("observe() ne mute ni le tableau components ni le tableau wires passés en entrée", () => {
    const { components, wires } = poweredTransistorCircuit()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))

    observe({ target: { kind: "PIN", componentUid: "t1", pinId: "collector" }, quantity: "VOLTAGE", time: 0 }, components, wires)

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })

  it("observe() ne mute jamais l'objet request passé en entrée", () => {
    const { components, wires } = poweredResistorCircuit()
    const request = { target: { kind: "PIN", componentUid: "power1", pinId: "5V" }, quantity: "LOGICAL_STATE", time: 0 }
    const requestSnapshot = JSON.parse(JSON.stringify(request))
    observe(request, components, wires)
    expect(request).toEqual(requestSnapshot)
  })
})
