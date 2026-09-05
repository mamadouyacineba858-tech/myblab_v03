/**
 * useCircuitStateArduinoBridge.test.jsx
 * MB-ARDUINO-BRIDGE-001 — Tests comportementaux (Blueprint §20, TEST-01 à
 * TEST-08).
 *
 * Même patron que les tests d'intégration CF3 existants
 * (AddComponentMutationChannel.integration.test.jsx) : renderHook(() =>
 * useCircuit(), { wrapper }) avec CircuitProvider, aucune mutation du
 * Document hors des API déjà exposées par le hook (addComponent/addWire/
 * deleteComponent/clearCircuit/startSimulation/stopSimulation).
 *
 * `orchestrators` est un Map<uid, RuntimeOrchestrator> créé par chaque test,
 * injecté dans CircuitProvider — même mécanisme d'injection que celui retenu
 * par le Blueprint pour App.jsx (§3). Le test possède ainsi une référence
 * directe vers le RuntimeOrchestrator auto-enregistré par
 * runSimulationWithRuntime() pour piloter digitalWrite() « programmatiquement »
 * (Ticket §E.2 : « La commande de D2 peut être programmatiquement injectée
 * dans le test. Aucune interface utilisateur de commande Arduino n'est
 * requise. »).
 */

// Requis par le transform JSX de ce projet, malgré le signalement ESLint
// "'React' is defined but never used" — même catégorie déjà présente et
// acceptée telle quelle dans le dépôt (MeasurementPanel.jsx/
// TemporalObservationPanel.jsx/WiresLayer.jsx et leurs fichiers de test).
import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { useCircuitInteraction } from "../../context/useCircuitInteraction.js"
import { getLedState } from "../../simulator/engine.js"
import { Signal } from "../../simulator/signals.js"

function buildArduinoLedCircuit() {
  const orchestrators = new Map()
  const wrapper = ({ children }) => (
    <CircuitProvider orchestrators={orchestrators}>{children}</CircuitProvider>
  )
  const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

  act(() => {
    result.current.addComponent("ARDUINO", 0, 0)
    result.current.addComponent("LED", 120, 0)
    result.current.addComponent("POWER", 240, 0)
  })

  const ard1 = result.current.components.find((c) => c.type === "ARDUINO")
  const led1 = result.current.components.find((c) => c.type === "LED")
  const power1 = result.current.components.find((c) => c.type === "POWER")

  act(() => {
    result.current.addWire(ard1.uid, "D2", led1.uid, "anode")
    result.current.addWire(power1.uid, "GND", led1.uid, "cathode")
  })

  return { result, orchestrators, ard1Uid: ard1.uid, led1Uid: led1.uid }
}

/**
 * pinSignals (useCircuitState.js) est un useMemo dont les dépendances
 * n'incluent aucun mécanisme d'actualisation continue (§15 du Blueprint —
 * aucune dépendance à un timer/une boucle). Un digitalWrite() effectué hors
 * du cycle de rendu React n'est donc reflété qu'au prochain recalcul
 * effectivement déclenché. Ce recalcul est obtenu ici via un cycle
 * stop/start de la simulation — une action déjà exposée par le hook
 * (startSimulation/stopSimulation), pas une API de test ad hoc.
 */
function recompute(result) {
  act(() => {
    result.current.stopSimulation()
  })
  act(() => {
    result.current.startSimulation()
  })
}

describe("MB-ARDUINO-BRIDGE-001 — TEST-01 : circuit sans Arduino (GATE 0)", () => {
  it("POWER → RESISTOR → LED → GND fonctionne sans composant ARDUINO, et n'instancie aucun runtime", () => {
    const orchestrators = new Map()
    const wrapper = ({ children }) => (
      <CircuitProvider orchestrators={orchestrators}>{children}</CircuitProvider>
    )
    const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })

    act(() => {
      result.current.addComponent("POWER", 0, 0)
      result.current.addComponent("RESISTOR", 120, 0)
      result.current.addComponent("LED", 240, 0)
    })

    const power1 = result.current.components.find((c) => c.type === "POWER")
    const resistor1 = result.current.components.find((c) => c.type === "RESISTOR")
    const led1 = result.current.components.find((c) => c.type === "LED")

    act(() => {
      result.current.addWire(power1.uid, "5V", resistor1.uid, "A")
      result.current.addWire(resistor1.uid, "B", led1.uid, "anode")
      result.current.addWire(power1.uid, "GND", led1.uid, "cathode")
    })

    act(() => {
      result.current.startSimulation()
    })

    const led = getLedState(led1.uid, result.current.pinSignals)
    expect(led.on).toBe(true)
    // Aucun composant ARDUINO dans ce circuit : aucun RuntimeOrchestrator ne
    // doit avoir été créé (même invariant que circuitRequiresRuntime()).
    expect(orchestrators.size).toBe(0)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — TEST-02/03/04 : D2 LOW → LED OFF, puis D2 HIGH → LED ON", () => {
  it("un digitalWrite(D2, LOW) explicite maintient la LED éteinte, un digitalWrite(D2, HIGH) l'allume réellement", () => {
    const { result, orchestrators, ard1Uid, led1Uid } = buildArduinoLedCircuit()

    act(() => {
      result.current.startSimulation()
    })

    // AC-03 : l'orchestrator a été injecté/enregistré depuis le container
    // fourni par le niveau application (ici, le wrapper de test) — le hook
    // ne l'a pas créé lui-même (LOCK-01/LOCK-02, prouvés séparément par
    // inspection statique).
    const orchestrator = orchestrators.get(ard1Uid)
    expect(orchestrator).toBeDefined()

    act(() => {
      orchestrator.getRuntime().start()
      orchestrator.getRuntime().digitalWrite("D2", Signal.LOW)
    })
    recompute(result)

    let led = getLedState(led1Uid, result.current.pinSignals)
    expect(led.on).toBe(false)
    expect(result.current.pinSignals.get(`${ard1Uid}:D2`)).toBe(Signal.LOW)

    act(() => {
      orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    })
    recompute(result)

    led = getLedState(led1Uid, result.current.pinSignals)
    expect(led.on).toBe(true)
    expect(result.current.pinSignals.get(`${ard1Uid}:D2`)).toBe(Signal.HIGH)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — TEST-05 : HIGH → LOW (transition inverse)", () => {
  it("une LED allumée par D2 HIGH s'éteint réellement après un digitalWrite(D2, LOW)", () => {
    const { result, orchestrators, ard1Uid, led1Uid } = buildArduinoLedCircuit()

    act(() => {
      result.current.startSimulation()
    })
    const orchestrator = orchestrators.get(ard1Uid)

    act(() => {
      orchestrator.getRuntime().start()
      orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    })
    recompute(result)
    expect(getLedState(led1Uid, result.current.pinSignals).on).toBe(true)

    act(() => {
      orchestrator.getRuntime().digitalWrite("D2", Signal.LOW)
    })
    recompute(result)
    expect(getLedState(led1Uid, result.current.pinSignals).on).toBe(false)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — TEST-06 : persistance de l'orchestrator entre deux recalculs", () => {
  it("une mutation de Document sans rapport avec l'Arduino ne recrée pas l'orchestrator et ne perd pas l'état runtime déjà écrit", () => {
    const { result, orchestrators, ard1Uid, led1Uid } = buildArduinoLedCircuit()

    act(() => {
      result.current.startSimulation()
    })
    const orchestrator1 = orchestrators.get(ard1Uid)
    act(() => {
      orchestrator1.getRuntime().start()
      orchestrator1.getRuntime().digitalWrite("D2", Signal.HIGH)
    })
    recompute(result)
    expect(getLedState(led1Uid, result.current.pinSignals).on).toBe(true)

    // Mutation de Document sans rapport (ajout d'une résistance non câblée) :
    // change safeComponents, donc déclenche naturellement un recalcul de
    // pinSignals (même dépendance que celle déjà utilisée avant ce ticket).
    act(() => {
      result.current.addComponent("RESISTOR", 400, 400)
    })

    const orchestrator2 = orchestrators.get(ard1Uid)
    expect(orchestrator2).toBe(orchestrator1)
    expect(getLedState(led1Uid, result.current.pinSignals).on).toBe(true)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — TEST-07 : suppression de l'Arduino → purge du container runtime", () => {
  it("après deleteComponent(arduinoUid), l'entrée correspondante disparaît du container", () => {
    const { result, orchestrators, ard1Uid } = buildArduinoLedCircuit()

    act(() => {
      result.current.startSimulation()
    })
    expect(orchestrators.has(ard1Uid)).toBe(true)

    act(() => {
      result.current.deleteComponent(ard1Uid)
    })

    expect(orchestrators.has(ard1Uid)).toBe(false)
  })
})

describe("MB-ARDUINO-BRIDGE-001 — TEST-08 : nouveau Document → aucune contamination runtime", () => {
  it("clearCircuit() vide le container runtime ; un nouveau circuit Arduino repart d'un état runtime propre", () => {
    const { result, orchestrators, ard1Uid, led1Uid } = buildArduinoLedCircuit()

    act(() => {
      result.current.startSimulation()
    })
    const orchestrator = orchestrators.get(ard1Uid)
    act(() => {
      orchestrator.getRuntime().start()
      orchestrator.getRuntime().digitalWrite("D2", Signal.HIGH)
    })
    recompute(result)
    expect(getLedState(led1Uid, result.current.pinSignals).on).toBe(true)
    expect(orchestrators.size).toBe(1)

    act(() => {
      result.current.clearCircuit()
    })
    expect(orchestrators.size).toBe(0)

    // Nouveau circuit Arduino → LED, sur le même container : D2 doit
    // repartir de son état par défaut (FLOATING, jamais HIGH hérité).
    act(() => {
      result.current.addComponent("ARDUINO", 0, 0)
      result.current.addComponent("LED", 120, 0)
      result.current.addComponent("POWER", 240, 0)
    })
    const ard2 = result.current.components.find((c) => c.type === "ARDUINO")
    const led2 = result.current.components.find((c) => c.type === "LED")
    const power2 = result.current.components.find((c) => c.type === "POWER")
    act(() => {
      result.current.addWire(ard2.uid, "D2", led2.uid, "anode")
      result.current.addWire(power2.uid, "GND", led2.uid, "cathode")
    })
    act(() => {
      result.current.startSimulation()
    })

    expect(getLedState(led2.uid, result.current.pinSignals).on).toBe(false)
    expect(result.current.pinSignals.get(`${ard2.uid}:D2`)).toBe(Signal.FLOATING)
  })
})
