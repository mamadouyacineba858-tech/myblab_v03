/**
 * componentInstanceState.test.js — MB-VIS-COMP-002 (Phase 7)
 *
 * Couvre le remplacement, dans componentDefinitions.js/createComponent, des
 * branchements `def.id === "BUTTON"` / `"BUTTON_LATCHING"` par le champ
 * déclaratif générique `def.initialState`.
 *
 * N'ajoute AUCUN nouveau composant réel au catalogue (COMPONENT_TYPES) :
 * le TEST 2bis utilise une entrée jetable, injectée puis retirée dans le
 * même test, pour prouver la généricité du mécanisme sans créer de
 * composant persistant (hors périmètre de MB-VIS-COMP-002).
 *
 * TEST 2 : un composant possédant un état (BUTTON, BUTTON_LATCHING) reçoit
 * son état initial exact via createComponent.
 * TEST 10 : les coordonnées dx/dy des pins existants restent identiques
 * (BUTTON, BUTTON_LATCHING — seuls types dont la définition a été touchée
 * par MB-VIS-COMP-002, en dehors de pins/dx/dy qui ne devaient PAS bouger).
 */
import { describe, expect, it } from "vitest"
import { COMPONENT_TYPES, createComponent, getComponentDef } from "../componentDefinitions.js"

describe("MB-VIS-COMP-002 — instance state initiale générique (TEST 2)", () => {
  it('BUTTON : createComponent produit state="released" via def.initialState', () => {
    const def = getComponentDef("BUTTON")
    expect(def.initialState).toBe("released")
    expect(def.interaction).toEqual({ type: "momentary" })

    const instance = createComponent("BUTTON", 5, 5)
    expect(instance.state).toBe("released")
  })

  it('BUTTON_LATCHING : createComponent produit state="off" via def.initialState', () => {
    const def = getComponentDef("BUTTON_LATCHING")
    expect(def.initialState).toBe("off")
    expect(def.interaction).toEqual({ type: "latching" })

    const instance = createComponent("BUTTON_LATCHING", 5, 5)
    expect(instance.state).toBe("off")
  })

  it("un type sans initialState (ex: RESISTOR) ne reçoit aucune clé state (comportement inchangé)", () => {
    const def = getComponentDef("RESISTOR")
    expect(def.initialState).toBeUndefined()
    expect(def.interaction).toBeUndefined()

    const instance = createComponent("RESISTOR", 0, 0)
    expect(Object.prototype.hasOwnProperty.call(instance, "state")).toBe(false)
  })

  it("TEST 2bis (généricité) — un type jetable déclarant initialState reçoit cet état, sans branchement dédié dans le code", () => {
    const FAKE_TYPE = "MB_TEST_STATIC_INITIAL_STATE"
    COMPONENT_TYPES[FAKE_TYPE] = {
      id: FAKE_TYPE,
      label: "Fake",
      width: 10,
      height: 10,
      pins: [],
      initialState: "custom-initial-value",
    }
    try {
      const instance = createComponent(FAKE_TYPE, 0, 0)
      expect(instance.state).toBe("custom-initial-value")
    } finally {
      delete COMPONENT_TYPES[FAKE_TYPE]
    }
  })
})

describe("MB-VIS-COMP-002 — stabilité des coordonnées dx/dy (TEST 10)", () => {
  it("BUTTON : dx/dy des pins inchangés", () => {
    const pins = getComponentDef("BUTTON").pins
    expect(pins.find((p) => p.id === "pin1")).toMatchObject({ dx: 0, dy: 30 })
    expect(pins.find((p) => p.id === "pin2")).toMatchObject({ dx: 60, dy: 30 })
  })

  it("BUTTON_LATCHING : dx/dy des pins inchangés", () => {
    const pins = getComponentDef("BUTTON_LATCHING").pins
    expect(pins.find((p) => p.id === "pin1")).toMatchObject({ dx: 0, dy: 30 })
    expect(pins.find((p) => p.id === "pin2")).toMatchObject({ dx: 60, dy: 30 })
  })

  it("CAPACITOR : dx/dy des pins inchangés (contrat électrique verrouillé par CAP-004/MB-VIS-COMP-001)", () => {
    const pins = getComponentDef("CAPACITOR").pins
    expect(pins.find((p) => p.id === "pinA")).toMatchObject({ dx: 0, dy: 20 })
    expect(pins.find((p) => p.id === "pinB")).toMatchObject({ dx: 70, dy: 20 })
  })
})
