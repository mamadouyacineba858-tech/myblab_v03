import React from "react"
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { MeasurementPanel } from "../MeasurementPanel.jsx"
import { getSimulationDefaultParameters } from "../../simulator/simulationRegistry.js"

// `frontend/vitest.config.js` n'active pas `test.globals`, donc le nettoyage
// automatique de @testing-library/react (qui s'appuie sur un `afterEach`
// global) n'est pas garanti — nettoyage explicite entre chaque test pour
// éviter qu'un composant monté par un test précédent ne fausse les
// requêtes `screen.getByRole()` du test suivant.
afterEach(() => {
  cleanup()
})

/**
 * MB-MEASURE-001 — Test UI / Intégration (mission d'implémentation §22).
 *
 * Démontre le scénario utilisateur minimal (Ticket §C, Blueprint §C) de
 * bout en bout à travers un vrai composant React monté avec
 * @testing-library/react :
 *
 *   sélection mode -> sélection target -> déclenchement -> affichage
 *   value/unit/status/reason
 *
 * sans que le test (et donc l'utilisateur) n'ait besoin de connaître
 * resolveSignals(), dcAnalysis, pinSignals ou dcContributionRegistry — seul
 * MeasurementPanel et measurementContract.js sont utilisés.
 *
 * Ce fichier utilise l'environnement jsdom (`frontend/vitest.config.js`),
 * comme les autres tests de composants du dépôt (RealisticRenderers.test.jsx,
 * WiresLayer.test.jsx) — il n'est pas exécuté par le script `test`/`test:ci`
 * de `frontend/package.json` (limité à `src/**\/*.test.{js,ts}`, environnement
 * node), exactement comme ces fichiers préexistants. Voir le Delivery
 * Report pour la commande exacte utilisée et son résultat.
 */

function poweredResistorCircuit() {
  const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
  const resistor = { uid: "r1", type: "RESISTOR", x: 10, y: 0 }
  const components = [power, resistor]
  const wires = [
    { fromUid: "power1", fromPin: "5V", toUid: "r1", toPin: "A" },
    { fromUid: "r1", fromPin: "B", toUid: "power1", toPin: "GND" },
  ]
  const targets = [
    { kind: "PIN", componentUid: "r1", pinId: "A", label: "R1 · pin A" },
    { kind: "PIN", componentUid: "r1", pinId: "B", label: "R1 · pin B" },
  ]
  return { components, wires, targets }
}

describe("MB-MEASURE-001 — MeasurementPanel : démonstration utilisateur minimale de bout en bout", () => {
  it("VOLTAGE VALID : sélection mode -> sélection target -> déclenchement -> affichage value/unit/status (MEASURE-E2E-001)", () => {
    const { components, wires, targets } = poweredResistorCircuit()
    render(<MeasurementPanel components={components} wires={wires} targets={targets} time={0} />)

    fireEvent.change(screen.getByLabelText("measurement-mode"), { target: { value: "VOLTAGE" } })
    fireEvent.change(screen.getByLabelText("measurement-target"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Measure" }))

    const result = screen.getByLabelText("measurement-result")
    expect(result.textContent).toContain("VALID")
    expect(result.textContent).toContain("V")
    expect(result.textContent).toContain(String(getSimulationDefaultParameters("POWER").voltage))
  })

  it("CURRENT VALID : mode CURRENT sur le pin B -> VALID, unit A (MEASURE-E2E-002)", () => {
    const { components, wires, targets } = poweredResistorCircuit()
    render(<MeasurementPanel components={components} wires={wires} targets={targets} time={0} />)

    fireEvent.change(screen.getByLabelText("measurement-mode"), { target: { value: "CURRENT" } })
    fireEvent.change(screen.getByLabelText("measurement-target"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Measure" }))

    const result = screen.getByLabelText("measurement-result")
    expect(result.textContent).toContain("VALID")
    expect(result.textContent).toContain("A")
  })

  it("UNAVAILABLE : cible sans courant canonique -> statut affiché avec un reason explicite, jamais une valeur inventée (MEASURE-E2E-003)", () => {
    const power = { uid: "power1", type: "POWER", x: 0, y: 0 }
    const transistor = { uid: "t1", type: "NPN_TRANSISTOR", x: 10, y: 0 }
    const components = [power, transistor]
    const wires = [
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "collector" },
      { fromUid: "t1", fromPin: "emitter", toUid: "power1", toPin: "GND" },
      { fromUid: "power1", fromPin: "5V", toUid: "t1", toPin: "base" },
    ]
    const targets = [{ kind: "PIN", componentUid: "t1", pinId: "collector", label: "T1 · collector" }]

    render(<MeasurementPanel components={components} wires={wires} targets={targets} time={0} />)

    fireEvent.change(screen.getByLabelText("measurement-mode"), { target: { value: "CURRENT" } })
    fireEvent.click(screen.getByRole("button", { name: "Measure" }))

    const result = screen.getByLabelText("measurement-result")
    expect(result.textContent).toContain("UNAVAILABLE")
    expect(result.textContent).toContain("Reason")
  })

  it("aucune sélection de target disponible -> le bouton Measure est désactivé, jamais de mesure déclenchée à l'aveugle", () => {
    render(<MeasurementPanel components={[]} wires={[]} targets={[]} time={0} />)
    expect(screen.getByRole("button", { name: "Measure" }).disabled).toBe(true)
  })
})
