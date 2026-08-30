/**
 * circuitModelInteractionState.test.js — MB-VIS-COMP-004 (Phase 5)
 *
 * Teste directement normalizeComponent() (circuitModel.js) — fonction pure,
 * testable sans monter le hook complet ni le CommandBus. Couvre les TEST 1,
 * 2, 3, 4, 5, 7, 8, 9 du Blueprint MB-VIS-COMP-004.
 *
 * TEST 6 (garde-fou statique, absence de littéraux BUTTON/BUTTON_LATCHING
 * comme mécanisme de dispatch) est dans circuitModelInteractionGuard.test.js.
 * TEST 10 (comportement réel BUTTON/BUTTON_LATCHING via useCircuitState) est
 * couvert par la ré-exécution, sans modification, des suites MB-VIS-COMP-002/
 * COMP-003 déjà existantes (useCircuitStateInteraction.test.jsx,
 * useCircuitStateInteractionCapabilityIsolated.test.jsx, componentInstanceState.
 * test.js, PartRenderer.visualState.test.jsx, CircuitComponent.interaction.
 * test.jsx) — voir §7/§9 du rapport MB-VIS-COMP-004. Un test end-to-end
 * SANS mock (devenu possible maintenant que circuitModel.js est corrigé) est
 * ajouté séparément dans useCircuitStateInteractionRealPipeline.test.jsx pour
 * la preuve de généricité de la Phase 6.
 */
import { describe, it, expect } from "vitest"
import { normalizeComponent } from "../circuitModel.js"
import { COMPONENT_TYPES } from "../../config/componentDefinitions.js"

describe("MB-VIS-COMP-004 — normalizeComponent() : state dérivé de interaction/initialState", () => {
  it("TEST 1 — un composant sans interaction (RESISTOR) n'obtient aucun état interactif artificiel", () => {
    const raw = { uid: "u1", type: "RESISTOR", x: 10, y: 20, pins: [] }
    const normalized = normalizeComponent(raw)
    expect(normalized.state).toBeUndefined()
    expect("state" in normalized).toBe(false)
  })

  it("TEST 2 — BUTTON reçoit son état initial déclaré (initialState=\"released\") quand aucun state n'est fourni", () => {
    const raw = { uid: "u2", type: "BUTTON", x: 0, y: 0 }
    const normalized = normalizeComponent(raw)
    expect(normalized.state).toBe("released")
    expect(normalized.state).toBe(COMPONENT_TYPES.BUTTON.initialState)
  })

  it("TEST 3 — BUTTON_LATCHING reçoit son état initial déclaré (initialState=\"off\") quand aucun state n'est fourni", () => {
    const raw = { uid: "u3", type: "BUTTON_LATCHING", x: 0, y: 0 }
    const normalized = normalizeComponent(raw)
    expect(normalized.state).toBe("off")
    expect(normalized.state).toBe(COMPONENT_TYPES.BUTTON_LATCHING.initialState)
  })

  /** Échange temporairement `interaction`/`initialState` d'un type RÉEL déjà
   * canoniquement enregistré, pour la durée du callback, puis restaure — ne
   * touche à aucun fichier, ne crée aucun nouveau type (Phase 6 : "ne pas
   * créer de nouveau type dans canonicalRegistry.js"). */
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

  it('TEST 4 — un composant avec interaction "momentary" mais un type différent de BUTTON est correctement normalisé', () => {
    withSwappedCapability("BUTTON_LATCHING", { interaction: { type: "momentary" }, initialState: "released" }, () => {
      // BUTTON_LATCHING porte maintenant la capacité "momentary" : bien que
      // sa chaîne de type littérale reste "BUTTON_LATCHING", normalizeComponent
      // doit appliquer le vocabulaire momentané (preuve que le dispatch lit
      // interaction.type, pas component.type).
      expect(normalizeComponent({ uid: "u4a", type: "BUTTON_LATCHING", x: 0, y: 0 }).state).toBe("released")
      expect(normalizeComponent({ uid: "u4b", type: "BUTTON_LATCHING", x: 0, y: 0, state: "pressed" }).state).toBe("pressed")
      expect(normalizeComponent({ uid: "u4c", type: "BUTTON_LATCHING", x: 0, y: 0, state: "on" }).state).toBe("released")
    })
  })

  it('TEST 5 — un composant avec interaction "latching" mais un type différent de BUTTON_LATCHING est correctement normalisé', () => {
    withSwappedCapability("BUTTON", { interaction: { type: "latching" }, initialState: "off" }, () => {
      // BUTTON porte maintenant la capacité "latching" : bien que sa chaîne
      // de type littérale reste "BUTTON", normalizeComponent doit appliquer
      // le vocabulaire à bascule (preuve que le dispatch lit interaction.type,
      // pas component.type).
      expect(normalizeComponent({ uid: "u5a", type: "BUTTON", x: 0, y: 0 }).state).toBe("off")
      expect(normalizeComponent({ uid: "u5b", type: "BUTTON", x: 0, y: 0, state: "on" }).state).toBe("on")
      expect(normalizeComponent({ uid: "u5c", type: "BUTTON", x: 0, y: 0, state: "pressed" }).state).toBe("off")
    })
  })

  it('TEST 7 — un état d\'instance explicitement fourni et valide n\'est pas écrasé par initialState', () => {
    expect(normalizeComponent({ uid: "u7a", type: "BUTTON", x: 0, y: 0, state: "pressed" }).state).toBe("pressed")
    expect(normalizeComponent({ uid: "u7b", type: "BUTTON_LATCHING", x: 0, y: 0, state: "on" }).state).toBe("on")
  })

  it("TEST 8 — la normalisation est idempotente : normalizeComponent(normalizeComponent(x)) === normalizeComponent(x)", () => {
    const cases = [
      { uid: "u8a", type: "RESISTOR", x: 5, y: 5 },
      { uid: "u8b", type: "BUTTON", x: 0, y: 0 },
      { uid: "u8c", type: "BUTTON", x: 0, y: 0, state: "pressed" },
      { uid: "u8d", type: "BUTTON_LATCHING", x: 0, y: 0 },
      { uid: "u8e", type: "BUTTON_LATCHING", x: 0, y: 0, state: "on" },
    ]
    for (const raw of cases) {
      const once = normalizeComponent(raw)
      const twice = normalizeComponent(once)
      expect(twice).toEqual(once)
    }
  })

  it("TEST 9 — RESISTOR/LED/CAPACITOR ne sont pas contaminés par le mécanisme d'interaction", () => {
    for (const type of ["RESISTOR", "LED", "CAPACITOR"]) {
      const raw = { uid: `u9-${type}`, type, x: 1, y: 2, pins: [{ id: "a" }] }
      const normalized = normalizeComponent(raw)
      expect("state" in normalized).toBe(false)
      expect(normalized.x).toBe(1)
      expect(normalized.y).toBe(2)
      expect(normalized.pins).toEqual([{ id: "a" }])
    }
  })
})
