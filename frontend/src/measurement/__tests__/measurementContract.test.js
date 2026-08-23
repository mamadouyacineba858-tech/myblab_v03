import { describe, it, expect } from "vitest"
import { measure, MeasurementMode, MeasurementStatus } from "../measurementContract.js"
import { getSimulationDefaultParameters } from "../../simulator/simulationRegistry.js"

/**
 * MB-MEASURE-001 — Tests comportementaux de Measurement.
 *
 * Couvre les cinq scénarios E2E exigés par le Ticket (§Q "Acceptance
 * Criteria" / §N "Required Evidence") et le Blueprint (§Q "Tests" / §R
 * "End-to-End Scenario") :
 *
 *   MEASURE-E2E-001 — VOLTAGE VALID          -> AC-03, AC-06
 *   MEASURE-E2E-002 — CURRENT VALID          -> AC-04, AC-06
 *   MEASURE-E2E-003 — UNAVAILABLE            -> AC-07
 *   MEASURE-E2E-004 — INVALID                -> AC-08
 *   MEASURE-E2E-005 — RE-EVALUATION/REGRESSION -> AC-12
 *
 * plus déterminisme (AC-11) et non-duplication de la physique (AC-13,
 * démontrée en comparant chaque valeur à la valeur canonique déjà
 * calculée par le modèle, jamais à une formule réécrite ici).
 *
 * Fixtures reprises à l'identique de `observationContract.test.js` (même
 * circuits, même composants) — aucune nouvelle sémantique de circuit n'est
 * inventée pour ce ticket.
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

describe("MB-MEASURE-001 — MEASURE-E2E-001 : VOLTAGE VALID (AC-03, AC-06)", () => {
  it("mesure VOLTAGE sur une RESISTOR alimentée -> VALID, unit V, valeur = tension POWER, passage par Observation", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.VOLTAGE, target: { kind: "PIN", componentUid: "r1", pinId: "A" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.VALID)
    expect(result.quantity).toBe("VOLTAGE")
    expect(result.value).toBe(getSimulationDefaultParameters("POWER").voltage)
    expect(result.unit).toBe("V")
    expect(result.target).toEqual({ kind: "PIN", componentUid: "r1", pinId: "A" })
    expect(result.time).toBe(0)
  })
})

describe("MB-MEASURE-001 — MEASURE-E2E-002 : CURRENT VALID (AC-04, AC-06)", () => {
  it("mesure CURRENT sur une RESISTOR alimentée -> VALID, unit A, valeur = I = U/R (canonique, non recalculée), convention de signe préservée", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.CURRENT, target: { kind: "PIN", componentUid: "r1", pinId: "B" }, time: 0 },
      components,
      wires
    )
    const expectedCurrent =
      getSimulationDefaultParameters("POWER").voltage / getSimulationDefaultParameters("RESISTOR").resistance
    expect(result.status).toBe(MeasurementStatus.VALID)
    expect(result.quantity).toBe("CURRENT")
    expect(result.value).toBeCloseTo(expectedCurrent, 10)
    expect(result.value).toBeGreaterThanOrEqual(0)
    expect(result.unit).toBe("A")
  })
})

describe("MB-MEASURE-001 — MEASURE-E2E-003 : UNAVAILABLE (AC-07)", () => {
  it("mesure CURRENT sur un composant 3 bornes (NPN_TRANSISTOR) sans courant canonique par-pin -> UNAVAILABLE, reason explicite, jamais VALID ni INVALID", () => {
    const { components, wires } = poweredTransistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.CURRENT, target: { kind: "PIN", componentUid: "t1", pinId: "collector" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.UNAVAILABLE)
    expect(result.value).toBeNull()
    expect(typeof result.reason).toBe("string")
    expect(result.reason.length).toBeGreaterThan(0)
  })
})

describe("MB-MEASURE-001 — MEASURE-E2E-004 : INVALID (AC-08)", () => {
  it("target inconnu (composant inexistant) -> INVALID, distinct de UNAVAILABLE", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.VOLTAGE, target: { kind: "PIN", componentUid: "ghost", pinId: "A" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.INVALID)
    expect(result.status).not.toBe(MeasurementStatus.UNAVAILABLE)
  })

  it("target malformé (pin inexistant sur un composant réel) -> INVALID avec reason explicite", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.VOLTAGE, target: { kind: "PIN", componentUid: "r1", pinId: "Z" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.INVALID)
    expect(typeof result.reason).toBe("string")
  })

  it("target kind explicitement non supporté (COMPONENT) -> INVALID avec reason explicite", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: MeasurementMode.VOLTAGE, target: { kind: "COMPONENT", componentUid: "r1", pinId: "A" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.INVALID)
    expect(result.reason).toMatch(/unsupported target kind/)
  })

  it("mode de mesure non supporté (LOGICAL_STATE, supporté par Observation mais hors périmètre Measurement V1) -> INVALID, aucune nouvelle catégorie de statut", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(
      { instrument: "multimeter-1", mode: "LOGICAL_STATE", target: { kind: "PIN", componentUid: "power1", pinId: "5V" }, time: 0 },
      components,
      wires
    )
    expect(result.status).toBe(MeasurementStatus.INVALID)
    expect(result.reason).toMatch(/unsupported measurement mode/)
  })

  it("requête totalement absente (null) -> INVALID sans lever d'exception", () => {
    const { components, wires } = poweredResistorCircuit()
    const result = measure(null, components, wires)
    expect(result.status).toBe(MeasurementStatus.INVALID)
  })
})

describe("MB-MEASURE-001 — MEASURE-E2E-005 : RE-EVALUATION / REGRESSION (AC-12)", () => {
  it("mesure A sur un circuit alimenté (VALID), modification de la topologie (déconnexion), mesure B sur le même target -> B reflète le nouvel état (UNAVAILABLE), jamais la valeur A mise en cache", () => {
    // Le modèle DC actuel (dcContributionRegistry.js) ne lit pas de
    // paramètre par-instance (resolution.js appelle toujours
    // getSimulationDefaultParameters(comp.type)) : faire varier une valeur
    // numérique par-composant n'est donc pas un levier de réévaluation
    // représentatif de l'état réel du dépôt. La topologie du circuit, elle,
    // est bien réévaluée à chaque appel — c'est le levier utilisé ici,
    // conformément au principe de vérifiabilité (aucune capacité inventée).
    const { components, wires } = poweredResistorCircuit()
    const request = { instrument: "multimeter-1", mode: MeasurementMode.CURRENT, target: { kind: "PIN", componentUid: "r1", pinId: "B" }, time: 0 }

    const resultA = measure(request, components, wires)

    // Modification du circuit : la broche B est déconnectée de GND (fil
    // retiré). resistiveTwoTerminalDc() exige une boucle alimentée
    // (HIGH/LOW) ; la broche B flottante casse cette condition -> plus de
    // contribution DC pour r1 -> UNAVAILABLE. Aucun état n'est conservé par
    // Measurement lui-même : seule la nouvelle résolution change le résultat.
    const modifiedWires = wires.filter((w) => !(w.fromUid === "r1" && w.toUid === "power1"))

    const resultB = measure(request, components, modifiedWires)

    expect(resultA.status).toBe(MeasurementStatus.VALID)
    expect(resultA.value).toBeGreaterThan(0)
    expect(resultB.status).toBe(MeasurementStatus.UNAVAILABLE)
    expect(resultB.value).toBeNull()
    expect(resultB.status).not.toBe(resultA.status)
  })
})

describe("MB-MEASURE-001 — Déterminisme (AC-11, hérité de MB-OBS-001)", () => {
  it("même état, même requête, même temps simulé -> résultats sémantiquement identiques", () => {
    const { components, wires } = poweredResistorCircuit()
    const request = { instrument: "multimeter-1", mode: MeasurementMode.VOLTAGE, target: { kind: "PIN", componentUid: "r1", pinId: "A" }, time: 5 }

    const resultA = measure(request, components, wires)
    const resultB = measure(request, components, wires)

    expect(resultA).toEqual(resultB)
  })
})

describe("MB-MEASURE-001 — AC-10 : le Document (components/wires) n'est jamais muté par une mesure", () => {
  it("measure() ne modifie pas les tableaux components/wires passés en entrée", () => {
    const { components, wires } = poweredResistorCircuit()
    const componentsSnapshot = JSON.parse(JSON.stringify(components))
    const wiresSnapshot = JSON.parse(JSON.stringify(wires))

    measure(
      { instrument: "multimeter-1", mode: MeasurementMode.CURRENT, target: { kind: "PIN", componentUid: "r1", pinId: "B" }, time: 0 },
      components,
      wires
    )

    expect(components).toEqual(componentsSnapshot)
    expect(wires).toEqual(wiresSnapshot)
  })
})
