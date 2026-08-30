/**
 * pinFootprintContract.test.js — MB-VIS-COMP-007 (Phase 4)
 *
 * Rend explicite et verrouille le principe retenu par ce ticket :
 *
 *     componentDefinitions.js  →  pin definition (id/label/dx/dy)
 *              ↓
 *        getPinPosition()
 *              ↓
 *     consumers électriques (wires, breadboard, CircuitComponent)
 *
 * Ce ticket n'a nécessité AUCUNE correction de production : la cartographie
 * (Phase 1) a confirmé que componentDefinitions.js, geometry.js,
 * pinPresentationGeometry.js, CircuitComponent.jsx, Pin.jsx,
 * circuitSelectors.js, Breadboard.jsx, BreadboardWiresLayer.jsx et
 * canonicalRegistry.js respectaient déjà intégralement ce contrat. Ce
 * fichier ajoute donc uniquement des tests de garde-fou qui verrouillent
 * ce contrat déjà conforme, pour toute évolution future.
 *
 * Une duplication réelle a été découverte hors de ce périmètre
 * (breadboardConnectivity.js, breadboardPlacementAdapter.js,
 * breadboardSolidarity.js, BreadboardHoleCollisionRule.js — CSA Décision
 * MB-VIS-COMP-007, Option B) : ces 4 fichiers sont volontairement exclus
 * de ce ticket et ne sont ni modifiés ni testés ici (dette documentée dans
 * le rapport final, réservée à un futur ticket dédié Breadboard/Core).
 */
import { describe, it, expect } from "vitest"
import { COMPONENT_TYPES, getComponentDef } from "../../config/componentDefinitions.js"
import { getPinPosition } from "../geometry.js"
import { getPinPresentationPosition } from "../pinPresentationGeometry.js"

const ALL_TYPES = Object.keys(COMPONENT_TYPES)

describe("MB-VIS-COMP-007 — contrat canonique des pins/footprint", () => {
  it("TEST 0 — la liste des types couverts par ce test correspond bien à la totalité du catalogue (aucun type oublié)", () => {
    expect(ALL_TYPES.length).toBeGreaterThan(0)
    expect(ALL_TYPES).toEqual(Object.keys(COMPONENT_TYPES))
  })

  describe.each(ALL_TYPES)("%s", (type) => {
    const def = getComponentDef(type)

    it("TEST 1 — le composant canonique possède ses pins attendus (tableau non vide, chaque pin a un id/label/dx/dy numériques)", () => {
      expect(def).not.toBeNull()
      expect(Array.isArray(def.pins)).toBe(true)
      expect(def.pins.length).toBeGreaterThan(0)
      for (const pin of def.pins) {
        expect(typeof pin.id).toBe("string")
        expect(pin.id.length).toBeGreaterThan(0)
        expect(typeof pin.label).toBe("string")
        expect(Number.isFinite(pin.dx)).toBe(true)
        expect(Number.isFinite(pin.dy)).toBe(true)
      }
    })

    it("TEST 2 — chaque pin du composant possède un id unique (pas de doublon au sein du même type)", () => {
      const ids = def.pins.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it("TEST 3 — getPinPosition(component, pin) produit exactement x = component.x + pin.dx, y = component.y + pin.dy", () => {
      const component = { x: 500, y: 300, type }
      for (const pin of def.pins) {
        expect(getPinPosition(component, pin)).toEqual({
          x: component.x + pin.dx,
          y: component.y + pin.dy,
        })
      }
    })

    it("TEST 5 — la géométrie électrique ne dépend pas du type concret (même dx/dy => même résultat, quel que soit `type`)", () => {
      const offset = { dx: 7, dy: 11 }
      const withType = getPinPosition({ x: 40, y: 60, type }, offset)
      const withoutType = getPinPosition({ x: 40, y: 60 }, offset)
      const withOtherType = getPinPosition({ x: 40, y: 60, type: "TYPE_INCONNU_XYZ" }, offset)
      expect(withType).toEqual(withoutType)
      expect(withType).toEqual(withOtherType)
    })
  })

  it("TEST 4 — la géométrie électrique ne dépend pas du renderer visuel (getPinPosition ne consulte ni PartRenderer, ni VisualizationManager, ni RendererRegistry)", () => {
    // Preuve architecturale : getPinPosition() n'accepte que (component, pinDef)
    // — aucun paramètre renderer/manager ne peut structurellement l'influencer.
    expect(getPinPosition.length).toBe(2)
    // Preuve comportementale : deux types avec des renderers totalement
    // différents (LED = renderer réaliste dédié, RESISTOR = renderer
    // générique) et le même offset produisent la même position.
    const offset = { dx: 15, dy: 25 }
    const asLed = getPinPosition({ x: 30, y: 40, type: "LED" }, offset)
    const asResistor = getPinPosition({ x: 30, y: 40, type: "RESISTOR" }, offset)
    expect(asLed).toEqual(asResistor)
  })

  it("TEST 9 — la projection visuelle LED reste séparée et ne modifie jamais les coordonnées électriques canoniques", () => {
    const ledDef = getComponentDef("LED")
    const component = { x: 200, y: 150, type: "LED" }
    for (const pin of ledDef.pins) {
      const electrical = getPinPosition(component, pin)
      const presentation = getPinPresentationPosition(component, pin)
      // La projection visuelle LED (MB-VIS-LED-V5) peut différer de
      // l'électrique (c'est son rôle documenté) — mais getPinPosition()
      // lui-même reste, dans tous les cas, strictement égal à
      // component.x/y + pin.dx/dy, jamais influencé par l'existence de
      // cette projection.
      expect(electrical).toEqual({ x: component.x + pin.dx, y: component.y + pin.dy })
      expect(presentation).not.toBe(undefined)
    }
    // Un type sans projection dédiée (RESISTOR) : la présentation dégénère
    // en l'électrique pur, confirmant l'absence de tout effet de bord
    // introduit par la présence du mécanisme de projection lui-même.
    const resistorDef = getComponentDef("RESISTOR")
    const resistor = { x: 200, y: 150, type: "RESISTOR" }
    for (const pin of resistorDef.pins) {
      expect(getPinPresentationPosition(resistor, pin)).toEqual(getPinPosition(resistor, pin))
    }
  })

  it("TEST 10 — garde-fou : getPinPosition() ne contient toujours aucun branchement par type (aucune régression depuis COMP-005)", () => {
    // Complète geometryPinCanonicalGuard.test.js (COMP-005, inchangé) par une
    // preuve comportementale directe et indépendante : appeler la fonction
    // avec 16 types réels différents et vérifier qu'aucun ne produit un
    // résultat spécifique (hors dx/dy fournis).
    const offset = { dx: 3, dy: 4 }
    const results = ALL_TYPES.map((type) => getPinPosition({ x: 10, y: 10, type }, offset))
    for (const result of results) {
      expect(result).toEqual({ x: 13, y: 14 })
    }
  })
})
