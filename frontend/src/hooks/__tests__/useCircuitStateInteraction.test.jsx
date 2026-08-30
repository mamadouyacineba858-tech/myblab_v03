/**
 * useCircuitStateInteraction.test.jsx — MB-VIS-COMP-003 (Phase 7)
 *
 * Couvre le remplacement, dans useCircuitState.js, des tests explicites
 * `c.type !== "BUTTON"` / `c.type === "BUTTON_LATCHING"` (setButtonState /
 * toggleLatchingButton) par la capacité déclarative `interaction.type`
 * ("momentary" / "latching", componentDefinitions.js — MB-VIS-COMP-002).
 *
 * Même patron que useCircuitStateArduinoBridge.test.jsx :
 * renderHook(() => useCircuit(), { wrapper: CircuitProvider }).
 *
 * NOTE DE PÉRIMÈTRE (voir §1 FAITS OBSERVÉS du rapport MB-VIS-COMP-003) :
 * les TEST 2/3/7 ne passent PAS par un type totalement fictif/non enregistré
 * dans canonicalRegistry.js. Un type inconnu de canonicalRegistry ne survit
 * pas au pipeline complet addComponent -> CommandBus -> ValidationEngine/
 * ReactDocumentMapper (hors périmètre de ce ticket) ; l'exercer aurait exigé
 * de modifier canonicalRegistry.js, explicitement interdit. La preuve de
 * généricité est donc apportée en ÉCHANGEANT temporairement la capacité
 * `interaction` de deux types RÉELS déjà canoniquement enregistrés (BUTTON,
 * BUTTON_LATCHING) : si le comportement suit la capacité échangée plutôt que
 * la chaîne de type littérale, la généricité est prouvée sans dépendre d'un
 * type qui n'existe nulle part ailleurs dans le système.
 *
 * TEST 1 : un composant sans interaction ne déclenche aucun comportement.
 * TEST 4 : BUTTON conserve exactement son comportement (dont : hors historique).
 * TEST 5 : BUTTON_LATCHING conserve son comportement (dont Undo/Redo).
 * TEST 8 : l'état initial provient de la définition, au niveau du hook complet.
 *
 * TEST 2/7 et TEST 3/7 (preuve que "momentary"/"latching" suivent
 * interaction.type, pas la chaîne "BUTTON"/"BUTTON_LATCHING") ONT ÉTÉ
 * DÉPLACÉS vers useCircuitStateInteractionCapabilityIsolated.test.jsx.
 *
 * RAISON (voir §1 FAITS OBSERVÉS et §13 du rapport MB-VIS-COMP-003) :
 * exécutés dans CE fichier (donc à travers le pipeline complet
 * safeComponents -> normalizeComponent, circuitModel.js), ces deux tests
 * échouent — non pas à cause d'un défaut de useCircuitState.js, mais parce
 * que normalizeComponent() applique ENCORE un branchement littéral sur
 * "BUTTON"/"BUTTON_LATCHING" (hors périmètre de ce ticket, non modifié) qui
 * réécrit le state selon la chaîne de type, en ignorant interaction.type.
 * C'est un blocage architectural réel et distinct, rapporté au CSA — pas
 * contourné ici. Ces deux preuves ont été reproduites, isolées de ce
 * confound par un mock local au fichier de test (aucun fichier de
 * production modifié), dans useCircuitStateInteractionCapabilityIsolated.test.jsx.
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"

function renderCircuit() {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  return renderHook(() => useCircuit(), { wrapper })
}

describe("MB-VIS-COMP-003 — useCircuitState : interaction dérivée de interaction.type", () => {
  it("TEST 1 — un composant sans interaction (RESISTOR) : setButtonState/toggleLatchingButton sont des no-op", () => {
    const { result } = renderCircuit()

    act(() => { result.current.addComponent("RESISTOR", 0, 0) })
    const uid = result.current.components[0].uid
    expect(result.current.components[0].state).toBeUndefined()

    act(() => { result.current.setButtonState(uid, "pressed") })
    expect(result.current.components[0].state).toBeUndefined()

    act(() => { result.current.toggleLatchingButton(uid) })
    expect(result.current.components[0].state).toBeUndefined()
  })

  it("TEST 4 — BUTTON : comportement exact préservé (press/release via setButtonState, hors historique)", () => {
    const { result } = renderCircuit()
    act(() => { result.current.addComponent("BUTTON", 0, 0) })
    const uid = result.current.components[0].uid
    const undoCountAfterAdd = result.current.getUndoCount()

    expect(result.current.components[0].state).toBe("released")

    act(() => { result.current.setButtonState(uid, "pressed") })
    expect(result.current.components[0].state).toBe("pressed")

    act(() => { result.current.setButtonState(uid, "released") })
    expect(result.current.components[0].state).toBe("released")

    // A1.6 : mutation transitoire hors historique — aucune entrée Undo créée
    // par les deux appels setButtonState (le décompte ne bouge pas par
    // rapport à celui laissé par addComponent lui-même, qui EST undoable).
    expect(result.current.getUndoCount()).toBe(undoCountAfterAdd)
  })

  it("TEST 5 — BUTTON_LATCHING : comportement exact préservé (toggle + Undo/Redo)", () => {
    const { result } = renderCircuit()
    act(() => { result.current.addComponent("BUTTON_LATCHING", 0, 0) })
    const uid = result.current.components[0].uid
    const undoCountAfterAdd = result.current.getUndoCount()

    expect(result.current.components[0].state).toBe("off")

    act(() => { result.current.toggleLatchingButton(uid) })
    expect(result.current.components[0].state).toBe("on")
    expect(result.current.getUndoCount()).toBe(undoCountAfterAdd + 1)

    act(() => { result.current.undo() })
    expect(result.current.components.find((c) => c.uid === uid).state).toBe("off")

    act(() => { result.current.redo() })
    expect(result.current.components.find((c) => c.uid === uid).state).toBe("on")
  })

  it("TEST 8 — l'état initial (BUTTON/BUTTON_LATCHING) provient de la définition, au niveau du hook complet", () => {
    const { result } = renderCircuit()
    act(() => {
      result.current.addComponent("BUTTON", 0, 0)
      result.current.addComponent("BUTTON_LATCHING", 100, 0)
      result.current.addComponent("RESISTOR", 200, 0)
    })
    const byType = (t) => result.current.components.find((c) => c.type === t)
    expect(byType("BUTTON").state).toBe("released")
    expect(byType("BUTTON_LATCHING").state).toBe("off")
    expect(byType("RESISTOR").state).toBeUndefined()
  })
})
