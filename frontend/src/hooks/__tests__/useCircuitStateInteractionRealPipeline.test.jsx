/**
 * useCircuitStateInteractionRealPipeline.test.jsx — MB-VIS-COMP-004 (Phase 6)
 *
 * Preuve de généricité de bout en bout, à travers le pipeline RÉEL et SANS
 * AUCUN MOCK : addComponent() -> CommandBus -> AddComponentHandler ->
 * documentApi.applyDocument() -> ReactDocumentMapper.toReact() ->
 * normalizeComponent() -> componentsForRender.
 *
 * Ceci était IMPOSSIBLE avant MB-VIS-COMP-004 (voir
 * useCircuitStateInteractionCapabilityIsolated.test.jsx, MB-VIS-COMP-003,
 * qui documentait pourquoi un mock local était nécessaire : normalizeComponent()
 * ignorait interaction.type et cassait le state d'un composant à capacité
 * échangée). MB-VIS-COMP-004 a corrigé circuitModel.js pour dériver `state`
 * de interaction.type/initialState (componentDefinitions.js) : ce test le
 * démontre en répétant exactement le même scénario, cette fois sans aucun
 * mock — la preuve la plus directe que le blocage documenté au rapport
 * MB-VIS-COMP-003 §13 est résolu.
 *
 * Même technique d'isolation qu'en COMP-003 (échange temporaire de capacité
 * sur un type RÉEL déjà canoniquement enregistré, jamais de type fictif —
 * Phase 6 du Blueprint : "Ne pas créer de nouveau type dans
 * canonicalRegistry.js").
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { COMPONENT_TYPES } from "../../config/componentDefinitions.js"

function renderCircuit() {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  return renderHook(() => useCircuit(), { wrapper })
}

function withSwappedCapability(type, { interaction, initialState }, callback) {
  const original = {
    interaction: COMPONENT_TYPES[type].interaction,
    initialState: COMPONENT_TYPES[type].initialState,
  }
  COMPONENT_TYPES[type] = { ...COMPONENT_TYPES[type], interaction, initialState }
  try {
    return callback()
  } finally {
    COMPONENT_TYPES[type] = { ...COMPONENT_TYPES[type], ...original }
  }
}

describe("MB-VIS-COMP-004 — pipeline réel (sans mock) : normalizeComponent() suit interaction.type/initialState", () => {
  it('BUTTON_LATCHING échangé vers "momentary" : setButtonState fonctionne dès l\'ajout réel, sans mock', () => {
    withSwappedCapability("BUTTON_LATCHING", { interaction: { type: "momentary" }, initialState: "released" }, () => {
      const { result } = renderCircuit()
      act(() => { result.current.addComponent("BUTTON_LATCHING", 0, 0) })
      const uid = result.current.components[0].uid

      // État initial réel post-addComponent (pipeline complet, aucun mock) :
      // dérivé de initialState="released" via normalizeComponent().
      expect(result.current.components[0].state).toBe("released")

      act(() => { result.current.setButtonState(uid, "pressed") })
      expect(result.current.components[0].state).toBe("pressed")

      act(() => { result.current.setButtonState(uid, "released") })
      expect(result.current.components[0].state).toBe("released")
    })
  })

  it('BUTTON échangé vers "latching" : toggleLatchingButton fonctionne dès l\'ajout réel, sans mock (Undo/Redo inclus)', () => {
    withSwappedCapability("BUTTON", { interaction: { type: "latching" }, initialState: "off" }, () => {
      const { result } = renderCircuit()
      act(() => { result.current.addComponent("BUTTON", 0, 0) })
      const uid = result.current.components[0].uid

      // État initial réel post-addComponent (pipeline complet, aucun mock) :
      // dérivé de initialState="off" via normalizeComponent().
      expect(result.current.components[0].state).toBe("off")

      act(() => { result.current.toggleLatchingButton(uid) })
      expect(result.current.components[0].state).toBe("on")

      act(() => { result.current.undo() })
      expect(result.current.components.find((c) => c.uid === uid).state).toBe("off")

      act(() => { result.current.redo() })
      expect(result.current.components.find((c) => c.uid === uid).state).toBe("on")
    })
  })

  it("TEST 10 — BUTTON/BUTTON_LATCHING réels (non échangés) : comportement exact préservé via useCircuitState après COMP-004", () => {
    const { result } = renderCircuit()
    act(() => {
      result.current.addComponent("BUTTON", 0, 0)
      result.current.addComponent("BUTTON_LATCHING", 100, 0)
      result.current.addComponent("RESISTOR", 200, 0)
    })
    const button = result.current.components.find((c) => c.type === "BUTTON")
    const latch = result.current.components.find((c) => c.type === "BUTTON_LATCHING")
    const resistor = result.current.components.find((c) => c.type === "RESISTOR")

    expect(button.state).toBe("released")
    expect(latch.state).toBe("off")
    expect(resistor.state).toBeUndefined()

    const undoCountAfterAdds = result.current.getUndoCount()

    act(() => { result.current.setButtonState(button.uid, "pressed") })
    expect(result.current.components.find((c) => c.uid === button.uid).state).toBe("pressed")
    act(() => { result.current.setButtonState(button.uid, "released") })
    // A1.6 : mutation transitoire hors historique, comportement inchangé après COMP-004.
    expect(result.current.getUndoCount()).toBe(undoCountAfterAdds)

    act(() => { result.current.toggleLatchingButton(latch.uid) })
    expect(result.current.components.find((c) => c.uid === latch.uid).state).toBe("on")
    expect(result.current.getUndoCount()).toBe(undoCountAfterAdds + 1)
    act(() => { result.current.undo() })
    expect(result.current.components.find((c) => c.uid === latch.uid).state).toBe("off")
  })
})
